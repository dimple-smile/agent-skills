/**
 * HTTP log collection server. Fixed port, CORS-open, JSON in/out.
 *
 * Endpoints
 *   GET    /          status + endpoint map
 *   GET    /health    health check
 *   POST   / | /logs  append one log or an array of logs
 *   GET    /logs      read logs (optional ?sessionId=)
 *   DELETE /logs      clear logs (optional ?sessionId=)
 */
import http from 'http';
import net from 'net';
import os from 'os';
import { PORT, readLogs, appendLogs, clearLogs } from './store.js';

export const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB per request

export interface Addresses {
  local: string | null;
  network: string | null;
  tunnel: string | null;
}

export const addresses: Addresses = {
  local: null,
  network: null,
  tunnel: null,
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

function cors(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Parse the request URL defensively. `new URL` throws on some malformed inputs
 * (e.g. "//", "%00", control chars). We must never let a bad URL crash the
 * server — return null and the caller answers 400.
 */
function safeParseUrl(reqUrl: string | undefined): URL | null {
  try {
    return new URL(reqUrl || '/', `http://localhost:${PORT}`);
  } catch {
    return null;
  }
}

export function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): void {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // The whole handler is wrapped so NO malformed request can crash the
  // server. A bad payload only means "that log wasn't collected".
  try {
    const url = safeParseUrl(req.url);
    if (!url) {
      json(res, 400, { error: 'Invalid URL' });
      return;
    }

    // Health & status
    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/') {
      json(res, 200, {
        name: 'dev-log',
        status: 'running',
        addresses,
        endpoints: {
          'POST /': 'submit log(s)',
          'GET /logs': 'read logs (optional ?sessionId=)',
          'DELETE /logs': 'clear logs (optional ?sessionId=)',
          'GET /health': 'health check',
        },
      });
      return;
    }

    // Read
    if (req.method === 'GET' && url.pathname === '/logs') {
      const sessionId = url.searchParams.get('sessionId') || undefined;
      json(res, 200, readLogs(sessionId));
      return;
    }

    // Clear
    if (req.method === 'DELETE' && url.pathname === '/logs') {
      const sessionId = url.searchParams.get('sessionId') || undefined;
      json(res, 200, clearLogs(sessionId));
      return;
    }

    // Append
    if (req.method === 'POST' && (url.pathname === '/' || url.pathname === '/logs')) {
      let body = '';
      let size = 0;
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_SIZE) req.destroy();
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const incoming: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
          for (const log of incoming) {
            if (!isValidLogEntry(log)) {
              json(res, 400, { error: 'Invalid log entry structure' });
              return;
            }
          }
          appendLogs(incoming as Parameters<typeof appendLogs>[0]);
          json(res, 200, { success: true });
        } catch (e) {
          json(res, 400, { error: (e as Error).message });
        }
      });
      req.on('error', () => json(res, 400, { error: 'Request error' }));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  } catch (e) {
    // Last-resort guard: never let an unexpected error escape and kill the
    // process. Log it (best-effort) and respond 500.
    if (!res.headersSent) {
      json(res, 500, { error: 'Internal server error' });
    }
  }
}

export function createServer(): http.Server {
  const server = http.createServer(handleRequest);
  // Malformed HTTP framing (bad clients, partial requests) must not crash us.
  server.on('clientError', (err, socket) => {
    try {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } catch {
      // socket may already be destroyed — nothing to do
    }
  });
  // Never let an unhandled request error kill the process.
  server.on('error', () => {
    // Swallow per-request errors; the server stays up.
  });
  return server;
}

/** Is a dev-log server already listening on the fixed port? */
export function isRunning(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const probe = net.connect({ port: PORT, host: 'localhost' });
    const done = (result: boolean) => {
      probe.destroy();
      resolve(result);
    };
    probe.on('connect', () => done(true));
    probe.on('error', () => done(false));
    setTimeout(() => done(false), 500);
  });
}
