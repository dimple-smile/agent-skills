import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import localtunnel from 'localtunnel';

const LOG_FILE = path.join(__dirname, "..", "dev-logs.json");
const PID_FILE = path.join(__dirname, "..", "pid.txt");
const PORT_FILE = path.join(__dirname, "..", "port.txt");
const TUNNEL_URL_FILE = path.join(__dirname, "..", "tunnel-url.txt");
const MAX_BODY_SIZE = 10 * 1024 * 1024;
const addresses = {
  local: null,
  network: null,
  tunnel: null
};
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}
function isValidLogEntry(log) {
  if (!log || typeof log !== "object" || Array.isArray(log)) return false;
  return Object.keys(log).length > 0;
}
function readLogs() {
  try {
    const data = fs.readFileSync(LOG_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}
function addCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function handlePostLogs(req, res) {
  let body = "";
  let bodySize = 0;
  req.on("data", (chunk) => {
    bodySize += chunk.length;
    if (bodySize > MAX_BODY_SIZE) {
      req.destroy();
    }
    body += chunk.toString();
  });
  req.on("error", () => {
    res.writeHead(413, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Request body too large" }));
  });
  req.on("end", () => {
    if (bodySize > MAX_BODY_SIZE) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Request body too large" }));
      return;
    }
    try {
      const logs = JSON.parse(body);
      const newLogs = Array.isArray(logs) ? logs : [logs];
      for (const log of newLogs) {
        if (!isValidLogEntry(log)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid log entry structure" }));
          return;
        }
      }
      const existingLogs = readLogs();
      fs.writeFileSync(LOG_FILE, JSON.stringify([...existingLogs, ...newLogs], null, 2));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}
function killOldProcess() {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
    if (pid && !isNaN(pid)) {
      try {
        process.kill(pid, 0);
        console.log(`Killing old process with PID ${pid}`);
        process.kill(pid, "SIGTERM");
      } catch {
        console.log("Old process not running, skipping kill");
      }
    }
    fs.unlinkSync(PID_FILE);
  }
}
function selfTest(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: "localhost",
      port,
      path: "/health",
      method: "GET",
      timeout: 2e3
    }, (res) => {
      if (res.statusCode === 200) {
        console.log("HTTP self-test passed");
        resolve(true);
      } else {
        console.log(`HTTP self-test failed: status ${res.statusCode}`);
        resolve(false);
      }
    });
    req.on("error", (e) => {
      console.log(`HTTP self-test failed: ${e.message}`);
      resolve(false);
    });
    req.on("timeout", () => {
      req.destroy();
      console.log("HTTP self-test failed: timeout");
      resolve(false);
    });
    req.end();
  });
}
function handleRequest(req, res) {
  addCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  const url = req.url?.split("?")[0] || "/";
  if (req.method === "GET" && url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
    return;
  }
  if (req.method === "POST" && (url === "/" || url === "/logs")) {
    handlePostLogs(req, res);
    return;
  }
  if (req.method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      name: "dev-log",
      status: "running",
      message: "Dev-log server is running.",
      addresses,
      endpoints: {
        "POST /": "Submit logs",
        "POST /logs": "Submit logs (alternative)",
        "GET /logs": "Get all logs",
        "GET /health": "Health check"
      }
    }));
    return;
  }
  if (req.method === "GET" && url === "/logs") {
    const logs = readLogs();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(logs));
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
}
function createServer() {
  return http.createServer(handleRequest);
}
async function startTunnel(port) {
  try {
    console.log("Starting tunnel...");
    const tunnel = await localtunnel({ port });
    console.log(`Tunnel started: ${tunnel.url}`);
    fs.writeFileSync(TUNNEL_URL_FILE, tunnel.url);
    addresses.tunnel = tunnel.url;
    tunnel.on("close", () => {
      console.log("Tunnel closed");
      addresses.tunnel = null;
      if (fs.existsSync(TUNNEL_URL_FILE)) {
        fs.unlinkSync(TUNNEL_URL_FILE);
      }
    });
    return tunnel.url;
  } catch (e) {
    console.log(`Failed to start tunnel: ${e.message}`);
    return null;
  }
}
function printStartupInfo() {
  console.log("\n========================================");
  console.log("Dev-log server is running");
  console.log("========================================");
  console.log("\nAvailable addresses:");
  if (addresses.local) {
    console.log(`  Local:   http://localhost:${addresses.local}`);
  }
  if (addresses.network) {
    console.log(`  Network: http://${addresses.network}`);
  }
  if (addresses.tunnel) {
    console.log(`  Tunnel:  ${addresses.tunnel}`);
  }
  console.log("\nUsage:");
  console.log("  - Local HTTP page: use Local address");
  console.log("  - Mobile (same WiFi): use Network address");
  console.log("  - HTTPS page / Remote: use Tunnel address");
  console.log("========================================\n");
}
async function startServer() {
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }
  [PORT_FILE, TUNNEL_URL_FILE].forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  const localIP = getLocalIP();
  const httpServer = createServer();
  await new Promise((resolve) => {
    httpServer.listen(0, async () => {
      const httpPort2 = httpServer.address().port;
      const pid = process.pid;
      fs.writeFileSync(PID_FILE, String(pid));
      fs.writeFileSync(PORT_FILE, String(httpPort2));
      addresses.local = httpPort2;
      if (localIP) {
        addresses.network = `${localIP}:${httpPort2}`;
      }
      console.log(`HTTP server on port ${httpPort2}`);
      console.log(`PID: ${pid}`);
      const httpHealthy = await selfTest(httpPort2);
      if (!httpHealthy) {
        console.error("HTTP server self-test failed");
        process.exit(1);
      }
      resolve();
    });
  });
  const httpPort = addresses.local;
  if (httpPort) {
    await startTunnel(httpPort);
  }
  printStartupInfo();
  httpServer.on("error", (err) => {
    console.error("Server error:", err);
    process.exit(1);
  });
}

export { addresses, createServer, getLocalIP, handleRequest, killOldProcess, printStartupInfo, readLogs, selfTest, startServer, startTunnel };
