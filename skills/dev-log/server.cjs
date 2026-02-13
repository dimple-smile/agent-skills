#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'dev-logs.json');
const PID_FILE = path.join(__dirname, 'pid.txt');
const PORT_FILE = path.join(__dirname, 'port.txt');

// Maximum request body size (10MB)
const MAX_BODY_SIZE = 10 * 1024 * 1024;

/**
 * Validate log entry structure
 * @param {any} log - Log entry to validate
 * @returns {boolean} True if valid
 */
function isValidLogEntry(log) {
  if (!log || typeof log !== 'object' || Array.isArray(log)) return false;
  // Basic validation: should be a non-empty object
  return Object.keys(log).length > 0;
}

/**
 * Safely read logs from file, avoiding race conditions
 * @returns {Array} Array of log entries
 */
function readLogs() {
  try {
    const data = fs.readFileSync(LOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    // File doesn't exist or is invalid JSON
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

      // Validate log entries
      for (const log of newLogs) {
        if (!isValidLogEntry(log)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid log entry structure' }));
          return;
        }
      }

      // Append to log file (atomic write)
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
function selfTest(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      if (res.statusCode === 200) {
        console.log('Self-test passed: server is healthy');
        resolve(true);
      } else {
        console.log(`Self-test failed: status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (e) => {
      console.log(`Self-test failed: ${e.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('Self-test failed: timeout');
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
    // Add CORS headers to all responses
    addCorsHeaders(res);

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url.split('?')[0]; // Remove query string

    // Health check endpoint
    if (req.method === 'GET' && url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    // POST to / or /logs - both accept logs (root path for convenience)
    if (req.method === 'POST' && (url === '/' || url === '/logs')) {
      handlePostLogs(req, res);
      return;
    }

    // GET / - show running status
    if (req.method === 'GET' && url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'dev-log',
        status: 'running',
        message: 'Dev-log server is running. POST logs to / or /logs',
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
  });
  return server;
}

/**
 * Start the server on a random port
 */
async function startServer() {
  // Clear log file
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }

  const server = createServer();
  server.listen(0, async () => {
    const port = server.address().port;
    const pid = process.pid;

    // Save port and pid separately
    fs.writeFileSync(PID_FILE, String(pid));
    fs.writeFileSync(PORT_FILE, String(port));
    console.log(`Dev-log server running on port ${port}`);
    console.log(`PID: ${pid}`);
    console.log(`Log file: ${LOG_FILE}`);

    // Run self-test
    const healthy = await selfTest(port);
    if (!healthy) {
      console.error('Server self-test failed, exiting...');
      process.exit(1);
    }
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

// Start server if this file is run directly
if (require.main === module) {
  killOldProcess();
  startServer();
}

module.exports = { killOldProcess, createServer, startServer, selfTest };
