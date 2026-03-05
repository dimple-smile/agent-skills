import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import localtunnel from 'localtunnel';
import { URL } from 'url';

// 使用 process.cwd() 而非 __dirname，兼容 ES Module 且日志文件存在用户工作目录
const LOG_FILE = path.join(process.cwd(), 'dev-logs.json');
const PID_FILE = path.join(process.cwd(), 'pid.txt');
const PORT_FILE = path.join(process.cwd(), 'port.txt');
const TUNNEL_URL_FILE = path.join(process.cwd(), 'tunnel-url.txt');

const MAX_BODY_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export interface Addresses {
  local: number | null;
  network: string | null;
  tunnel: string | null;
}

export interface LogEntry {
  sessionId: string;
  time: string;
  type: string;
  data: unknown;
}

export const addresses: Addresses = {
  local: null,
  network: null,
  tunnel: null
};

export function getLocalIP(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

function isValidLogEntry(log: unknown): boolean {
  if (!log || typeof log !== 'object' || Array.isArray(log)) return false;
  return Object.keys(log as object).length > 0;
}

export function readLogs(sessionId?: string): LogEntry[] {
  try {
    const data = fs.readFileSync(LOG_FILE, 'utf-8');
    const logs = JSON.parse(data);
    if (sessionId) {
      return logs.filter((log: LogEntry) => log.sessionId === sessionId);
    }
    return logs;
  } catch {
    return [];
  }
}

function addCorsHeaders(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function handlePostLogs(req: http.IncomingMessage, res: http.ServerResponse): void {
  let body = '';
  let bodySize = 0;

  req.on('data', chunk => {
    bodySize += chunk.length;
    if (bodySize > MAX_BODY_SIZE) {
      req.destroy();
    }
    body += chunk.toString();
  });

  req.on('error', () => {
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request body too large' }));
  });

  req.on('end', () => {
    if (bodySize > MAX_BODY_SIZE) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request body too large' }));
      return;
    }

    try {
      const logs = JSON.parse(body);
      const newLogs = Array.isArray(logs) ? logs : [logs];

      for (const log of newLogs) {
        if (!isValidLogEntry(log)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid log entry structure' }));
          return;
        }
      }

      const existingLogs = readLogs();
      fs.writeFileSync(LOG_FILE, JSON.stringify([...existingLogs, ...newLogs], null, 2));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (e as Error).message }));
    }
  });
}

export function killOldProcess(): void {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
    if (pid && !isNaN(pid)) {
      try {
        process.kill(pid, 0);
        console.log(`Killing old process with PID ${pid}`);
        process.kill(pid, 'SIGTERM');
      } catch {
        console.log('Old process not running, skipping kill');
      }
    }
    fs.unlinkSync(PID_FILE);
  }
}

export function selfTest(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      if (res.statusCode === 200) {
        console.log('HTTP self-test passed');
        resolve(true);
      } else {
        console.log(`HTTP self-test failed: status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (e) => {
      console.log(`HTTP self-test failed: ${e.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('HTTP self-test failed: timeout');
      resolve(false);
    });

    req.end();
  });
}

export function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  addCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const fullUrl = req.url || '/';
  const urlObj = new URL(fullUrl, `http://localhost:${addresses.local || 3000}`);
  const pathname = urlObj.pathname;

  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  if (req.method === 'POST' && (pathname === '/' || pathname === '/logs')) {
    handlePostLogs(req, res);
    return;
  }

  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'dev-log',
      status: 'running',
      message: 'Dev-log server is running.',
      addresses: addresses,
      endpoints: {
        'POST /': 'Submit logs',
        'POST /logs': 'Submit logs (alternative)',
        'GET /logs': 'Get all logs (optional ?sessionId=xxx to filter)',
        'GET /health': 'Health check'
      }
    }));
    return;
  }

  if (req.method === 'GET' && pathname === '/logs') {
    const sessionId = urlObj.searchParams.get('sessionId') || undefined;
    const logs = readLogs(sessionId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(logs));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}

export function createServer(): http.Server {
  return http.createServer(handleRequest);
}

export async function startTunnel(port: number): Promise<string | null> {
  try {
    console.log('Starting tunnel...');
    const tunnel = await localtunnel({ port });
    console.log(`Tunnel started: ${tunnel.url}`);

    fs.writeFileSync(TUNNEL_URL_FILE, tunnel.url);
    addresses.tunnel = tunnel.url;

    tunnel.on('close', () => {
      console.log('Tunnel closed');
      addresses.tunnel = null;
      if (fs.existsSync(TUNNEL_URL_FILE)) {
        fs.unlinkSync(TUNNEL_URL_FILE);
      }
    });

    return tunnel.url;
  } catch (e) {
    console.log(`Failed to start tunnel: ${(e as Error).message}`);
    return null;
  }
}

export function printStartupInfo(): void {
  console.log('\n========================================');
  console.log('Dev-log server is running');
  console.log('========================================');
  console.log('\nAvailable addresses:');
  if (addresses.local) {
    console.log(`  Local:   http://localhost:${addresses.local}`);
  }
  if (addresses.network) {
    console.log(`  Network: http://${addresses.network}`);
  }
  if (addresses.tunnel) {
    console.log(`  Tunnel:  ${addresses.tunnel}`);
  }
  console.log('\nUsage:');
  console.log('  - Local HTTP page: use Local address');
  console.log('  - Mobile (same WiFi): use Network address');
  console.log('  - HTTPS page / Remote: use Tunnel address');
  console.log('\nRead logs:');
  console.log('  curl http://localhost:${addresses.local}/logs');
  console.log('  curl "http://localhost:${addresses.local}/logs?sessionId=sess_xxx"');
  console.log('========================================\n');
}

export async function startServer(): Promise<void> {
  // Clear log file
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }

  // Clear old port files
  [PORT_FILE, TUNNEL_URL_FILE].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  // Get local IP
  const localIP = getLocalIP();

  // Start HTTP server
  const httpServer = createServer();

  await new Promise<void>((resolve) => {
    httpServer.listen(0, async () => {
      const httpPort = (httpServer.address() as { port: number }).port;
      const pid = process.pid;

      fs.writeFileSync(PID_FILE, String(pid));
      fs.writeFileSync(PORT_FILE, String(httpPort));

      addresses.local = httpPort;
      if (localIP) {
        addresses.network = `${localIP}:${httpPort}`;
      }

      console.log(`HTTP server on port ${httpPort}`);
      console.log(`PID: ${pid}`);

      const httpHealthy = await selfTest(httpPort);
      if (!httpHealthy) {
        console.error('HTTP server self-test failed');
        process.exit(1);
      }

      resolve();
    });
  });

  // Start tunnel (default)
  const httpPort = addresses.local;
  if (httpPort) {
    await startTunnel(httpPort);
  }

  // Print startup info
  printStartupInfo();

  httpServer.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

// Auto-start when run directly (ESM/CJS compatible)
// 检查是否作为入口文件运行
const runDirectly = () => {
  // CJS 环境
  if (typeof require !== 'undefined' && require.main === module) {
    return true;
  }
  // ESM 环境：检查是否是 node 直接运行的
  // 当被 import 时不会有这个条件
  return false;
};

if (runDirectly()) {
  killOldProcess();
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
