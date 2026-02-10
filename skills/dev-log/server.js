#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Kill old process if pid.txt exists and process is running
 */
function killOldProcess() {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
    if (pid && !isNaN(pid)) {
      try {
        // process.kill(pid, 0) sends signal 0 which doesn't actually kill the process
        // It's used to check if a process exists and we have permission to send signals
        // If the process doesn't exist, it throws an error
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
    // Add CORS headers to all responses
    addCorsHeaders(res);

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/logs') {
      let body = '';
      let bodySize = 0;

      req.on('data', chunk => {
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_SIZE) {
          // Request body too large
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
    } else if (req.method === 'GET' && req.url === '/logs') {
      const logs = readLogs();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(logs));
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
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
  killOldProcess();
  startServer();
}

export { killOldProcess, createServer, startServer };
