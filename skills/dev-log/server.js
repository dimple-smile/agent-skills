#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'dev-logs.json');
const PID_FILE = path.join(__dirname, 'pid.txt');
const PORT_FILE = path.join(__dirname, 'port.txt');

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
        // Process not running, ignore
        console.log('Old process not running, skipping kill');
      }
    }
    fs.unlinkSync(PID_FILE);
  }
}

/**
 * Create HTTP server for log collection
 */
function createServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/logs') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const logs = JSON.parse(body);
          // Append to log file
          const existingLogs = fs.existsSync(LOG_FILE)
            ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'))
            : [];
          const newLogs = Array.isArray(logs) ? logs : [logs];
          fs.writeFileSync(LOG_FILE, JSON.stringify([...existingLogs, ...newLogs], null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else if (req.method === 'GET' && req.url === '/logs') {
      if (fs.existsSync(LOG_FILE)) {
        const logs = fs.readFileSync(LOG_FILE, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(logs);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('[]');
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  return server;
}

/**
 * Start the server on a random port
 */
function startServer() {
  // Clear log file
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }

  const server = createServer();
  server.listen(0, () => {
    const port = server.address().port;
    const pid = process.pid;

    // Save port and pid separately
    fs.writeFileSync(PID_FILE, String(pid));
    fs.writeFileSync(PORT_FILE, String(port));
    console.log(`Dev-log server running on port ${port}`);
    console.log(`PID: ${pid}`);
    console.log(`Log file: ${LOG_FILE}`);
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

module.exports = { killOldProcess, createServer, startServer };
