#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const selfsigned = require('selfsigned');
const localtunnel = require('localtunnel');

const LOG_FILE = path.join(__dirname, 'dev-logs.json');
const PID_FILE = path.join(__dirname, 'pid.txt');
const PORT_FILE = path.join(__dirname, 'port.txt');
const HTTPS_PORT_FILE = path.join(__dirname, 'https-port.txt');
const TUNNEL_URL_FILE = path.join(__dirname, 'tunnel-url.txt');

// Maximum request body size (10MB)
const MAX_BODY_SIZE = 10 * 1024 * 1024;

// Store addresses for output
let addresses = {
  local: null,
  network: null,
  https: null,
  tunnel: null
};

/**
 * Get local network IP address
 * @returns {string|null} Local IP address or null
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

/**
 * Validate log entry structure
 * @param {any} log - Log entry to validate
 * @returns {boolean} True if valid
 */
function isValidLogEntry(log) {
  if (!log || typeof log !== 'object' || Array.isArray(log)) return false;
  return Object.keys(log).length > 0;
}

/**
 * Safely read logs from file
 * @returns {Array} Array of log entries
 */
function readLogs() {
  try {
    const data = fs.readFileSync(LOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * Add CORS headers to response
 * @param {http.ServerResponse} res - Response object
 */
function addCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Handle POST request for logging
 */
function handlePostLogs(req, res) {
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
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

/**
 * Kill old process if pid.txt exists and process is running
 */
function killOldProcess() {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
    if (pid && !isNaN(pid)) {
      try {
        process.kill(pid, 0);
        console.log(`Killing old process with PID ${pid}`);
        process.kill(pid, 'SIGTERM');
      } catch (e) {
        console.log('Old process not running, skipping kill');
      }
    }
    fs.unlinkSync(PID_FILE);
  }
}

/**
 * Self-test the server after startup
 */
function selfTest(port, useHttps = false) {
  return new Promise((resolve) => {
    const lib = useHttps ? https : http;
    const req = lib.request({
      hostname: 'localhost',
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 2000,
      // For HTTPS, allow self-signed certs
      rejectUnauthorized: false
    }, (res) => {
      if (res.statusCode === 200) {
        console.log(`${useHttps ? 'HTTPS' : 'HTTP'} self-test passed`);
        resolve(true);
      } else {
        console.log(`${useHttps ? 'HTTPS' : 'HTTP'} self-test failed: status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (e) => {
      console.log(`${useHttps ? 'HTTPS' : 'HTTP'} self-test failed: ${e.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`${useHttps ? 'HTTPS' : 'HTTP'} self-test failed: timeout`);
      resolve(false);
    });

    req.end();
  });
}

/**
 * Create HTTP server for log collection
 */
function createServer() {
  const server = http.createServer((req, res) => {
    handleRequest(req, res);
  });
  return server;
}

/**
 * Handle incoming request
 */
function handleRequest(req, res) {
  addCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // Health check endpoint
  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // POST to / or /logs
  if (req.method === 'POST' && (url === '/' || url === '/logs')) {
    handlePostLogs(req, res);
    return;
  }

  // GET / - show running status with addresses
  if (req.method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'dev-log',
      status: 'running',
      message: 'Dev-log server is running.',
      addresses: addresses,
      endpoints: {
        'POST /': 'Submit logs',
        'POST /logs': 'Submit logs (alternative)',
        'GET /logs': 'Get all logs',
        'GET /health': 'Health check'
      }
    }));
    return;
  }

  // GET logs
  if (req.method === 'GET' && url === '/logs') {
    const logs = readLogs();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(logs));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}

/**
 * Generate self-signed HTTPS certificate
 */
function generateHttpsCert() {
  console.log('Generating HTTPS certificate...');
  const { private: key, cert } = selfsigned.generate(
    [{ name: 'commonName', value: 'localhost' }],
    { days: 365, keySize: 2048 }
  );
  return { key, cert };
}

/**
 * Start localtunnel for remote access
 */
async function startTunnel(port) {
  try {
    console.log('Starting tunnel...');
    const tunnel = await localtunnel({ port });
    console.log(`Tunnel started: ${tunnel.url}`);

    // Save tunnel URL
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
    console.log(`Failed to start tunnel: ${e.message}`);
    return null;
  }
}

/**
 * Print startup info
 */
function printStartupInfo() {
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
  if (addresses.https) {
    console.log(`  HTTPS:   https://localhost:${addresses.https}`);
  }
  if (addresses.tunnel) {
    console.log(`  Tunnel:  ${addresses.tunnel}`);
  }
  console.log('\nNote: HTTPS uses self-signed certificate.');
  console.log('      First visit will show a security warning - click "Continue" to proceed.');
  console.log('========================================\n');
}

/**
 * Start the servers
 */
async function startServer(options = {}) {
  const { enableHttps = true, enableTunnel = false } = options;

  // Clear log file
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }

  // Clear old port files
  [PORT_FILE, HTTPS_PORT_FILE, TUNNEL_URL_FILE].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  // Get local IP
  const localIP = getLocalIP();

  // Start HTTP server
  const httpServer = createServer();

  await new Promise((resolve) => {
    httpServer.listen(0, async () => {
      const httpPort = httpServer.address().port;
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

  // Start HTTPS server
  if (enableHttps) {
    const { key, cert } = generateHttpsCert();
    const httpsServer = https.createServer({ key, cert }, (req, res) => {
      handleRequest(req, res);
    });

    await new Promise((resolve) => {
      httpsServer.listen(0, async () => {
        const httpsPort = httpsServer.address().port;
        fs.writeFileSync(HTTPS_PORT_FILE, String(httpsPort));
        addresses.https = httpsPort;

        console.log(`HTTPS server on port ${httpsPort}`);

        const httpsHealthy = await selfTest(httpsPort, true);
        if (!httpsHealthy) {
          console.log('HTTPS server self-test failed (continuing anyway)');
        }

        resolve();
      });
    });
  }

  // Start tunnel if requested
  if (enableTunnel) {
    const httpPort = addresses.local;
    await startTunnel(httpPort);
  }

  // Print startup info
  printStartupInfo();

  httpServer.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

// Parse command line args
const args = process.argv.slice(2);
const enableTunnel = args.includes('--tunnel') || args.includes('-t');

// Start server if this file is run directly
if (require.main === module) {
  killOldProcess();
  startServer({ enableHttps: true, enableTunnel });
}

module.exports = {
  killOldProcess,
  createServer,
  startServer,
  selfTest,
  getLocalIP,
  generateHttpsCert,
  startTunnel
};
