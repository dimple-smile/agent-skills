import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '.test-data');
const LOG_FILE = path.join(TEST_DIR, 'dev-logs.json');

// Helper to create a test server (mimics actual server behavior)
function createTestServer() {
  const logs = [];
  const MAX_BODY_SIZE = 10 * 1024 * 1024;

  function isValidLogEntry(log) {
    if (!log || typeof log !== 'object' || Array.isArray(log)) return false;
    return Object.keys(log).length > 0;
  }

  const server = createServer((req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    // GET / - show running status
    if (req.method === 'GET' && url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'dev-log',
        status: 'running',
        message: 'Dev-log server is running'
      }));
      return;
    }

    // POST to / or /logs - both accept logs
    if (req.method === 'POST' && (url === '/' || url === '/logs')) {
      let body = '';
      let bodySize = 0;

      req.on('data', chunk => {
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_SIZE) {
          req.destroy();
        }
        body += chunk.toString();
      });

      req.on('end', () => {
        if (bodySize > MAX_BODY_SIZE) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Request body too large' }));
          return;
        }

        try {
          const newLogs = JSON.parse(body);
          const logsArray = Array.isArray(newLogs) ? newLogs : [newLogs];

          for (const log of logsArray) {
            if (!isValidLogEntry(log)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid log entry structure' }));
              return;
            }
            logs.push(log);
            fs.appendFile(LOG_FILE, JSON.stringify(log) + '\n');
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else if (req.method === 'GET' && url === '/logs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(logs));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      resolve({
        port: server.address().port,
        close: () => new Promise(resolve => server.close(resolve))
      });
    });
    server.on('error', reject);
  });
}

describe('Dev Log Server Unit Tests', () => {
  let testServer;
  let port;
  let baseUrl;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.rm(LOG_FILE, { force: true });
    testServer = await createTestServer();
    port = testServer.port;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    if (testServer) {
      await testServer.close();
    }
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('isValidLogEntry', () => {
    it('should validate log entry with sessionId', () => {
      const log = { sessionId: 'abc123', time: '12:00:00.123', type: 'test', data: {} };
      expect(isValidLogEntry(log)).toBe(true);
    });

    it('should reject null or undefined', () => {
      expect(isValidLogEntry(null)).toBe(false);
      expect(isValidLogEntry(undefined)).toBe(false);
    });

    it('should reject non-object types', () => {
      expect(isValidLogEntry('string')).toBe(false);
      expect(isValidLogEntry(123)).toBe(false);
      expect(isValidLogEntry([])).toBe(false);
    });

    it('should reject empty objects', () => {
      expect(isValidLogEntry({})).toBe(false);
    });

    it('should accept objects with any keys', () => {
      expect(isValidLogEntry({ message: 'test' })).toBe(true);
      expect(isValidLogEntry({ level: 'info' })).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('POST / (root path)', () => {
    it('should accept valid log entry at root path', async () => {
      const logEntry = {
        sessionId: 'test123',
        time: '14:23:05.123',
        type: 'state',
        data: { count: 0 }
      };

      const response = await fetch(`${baseUrl}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
    });

    it('should reject empty object', async () => {
      const response = await fetch(`${baseUrl}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /', () => {
    it('should return running status', async () => {
      const response = await fetch(`${baseUrl}/`);
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.name).toBe('dev-log');
      expect(result.status).toBe('running');
    });
  });

  describe('POST /logs', () => {
    it('should accept valid log entry', async () => {
      const logEntry = {
        sessionId: 'test123',
        time: '14:23:05.123',
        type: 'state',
        data: { count: 0 }
      };

      const response = await fetch(`${baseUrl}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
    });

    it('should handle array of logs', async () => {
      const logs = [
        { sessionId: 'test1', time: '12:00:00', type: 'info', data: { msg: 'first' } },
        { sessionId: 'test1', time: '12:00:01', type: 'info', data: { msg: 'second' } }
      ];

      const response = await fetch(`${baseUrl}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logs)
      });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /logs', () => {
    it('should return empty array initially', async () => {
      const response = await fetch(`${baseUrl}/logs`);
      expect(response.status).toBe(200);
      const logs = await response.json();
      expect(logs).toEqual([]);
    });

    it('should return all posted logs', async () => {
      const logs = [
        { sessionId: 'abc', time: '12:00:00', type: 'test', data: { value: 1 } },
        { sessionId: 'def', time: '12:00:01', type: 'test', data: { value: 2 } }
      ];

      for (const log of logs) {
        await fetch(`${baseUrl}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log)
        });
      }

      const response = await fetch(`${baseUrl}/logs`);
      const result = await response.json();
      expect(result).toHaveLength(2);
    });
  });

  describe('OPTIONS (CORS)', () => {
    it('should handle CORS preflight', async () => {
      const response = await fetch(`${baseUrl}/logs`, { method: 'OPTIONS' });
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`${baseUrl}/unknown`);
      expect(response.status).toBe(404);
    });
  });

  describe('Session isolation', () => {
    it('should keep logs from different sessions separate', async () => {
      const logs = [
        { sessionId: 'session-a', time: '12:00:00', type: 'test', data: { from: 'A' } },
        { sessionId: 'session-b', time: '12:00:01', type: 'test', data: { from: 'B' } },
        { sessionId: 'session-a', time: '12:00:02', type: 'test', data: { from: 'A2' } }
      ];

      for (const log of logs) {
        await fetch(`${baseUrl}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log)
        });
      }

      const response = await fetch(`${baseUrl}/logs`);
      const allLogs = await response.json();

      const sessionALogs = allLogs.filter(l => l.sessionId === 'session-a');
      const sessionBLogs = allLogs.filter(l => l.sessionId === 'session-b');

      expect(sessionALogs).toHaveLength(2);
      expect(sessionBLogs).toHaveLength(1);
    });
  });
});

function isValidLogEntry(log) {
  if (!log || typeof log !== 'object' || Array.isArray(log)) return false;
  return Object.keys(log).length > 0;
}
