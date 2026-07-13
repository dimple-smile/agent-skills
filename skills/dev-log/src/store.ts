/**
 * Log persistence. All runtime state lives under a single well-known dir in
 * the OS temp folder, so the installed package directory stays read-only and
 * clean. This removes the old port.txt / pid.txt / tunnel-url.txt sprawl.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface LogEntry {
  sessionId: string;
  time: string;
  type: string;
  data: unknown;
}

const STATE_DIR = path.join(os.tmpdir(), 'dev-log');
const LOG_FILE = path.join(STATE_DIR, 'dev-logs.json');
const PID_FILE = path.join(STATE_DIR, 'dev-log.pid');

/** Fixed port — the whole point is to remove the random-port dance. */
export const PORT = 7331;

export function getStateDir(): string {
  return STATE_DIR;
}

function ensureStateDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

/** Write this process's PID so `stop` can target it precisely by PID file. */
export function writePid(): void {
  ensureStateDir();
  fs.writeFileSync(PID_FILE, String(process.pid));
}

/** Read the PID of the running server, or null if no PID file exists. */
export function readPid(): number | null {
  try {
    const raw = fs.readFileSync(PID_FILE, 'utf-8').trim();
    const pid = parseInt(raw, 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/** Remove the PID file (used on clean shutdown). */
export function removePid(): void {
  try { fs.unlinkSync(PID_FILE); } catch { /* already gone */ }
}

export function readLogs(sessionId?: string): LogEntry[] {
  try {
    const data = fs.readFileSync(LOG_FILE, 'utf-8');
    const logs: LogEntry[] = JSON.parse(data);
    if (sessionId) {
      return logs.filter((log) => log.sessionId === sessionId);
    }
    return logs;
  } catch {
    return [];
  }
}

export function appendLogs(newLogs: LogEntry[]): void {
  ensureStateDir();
  const existing = readLogs();
  fs.writeFileSync(LOG_FILE, JSON.stringify([...existing, ...newLogs], null, 2));
}

export function clearLogs(sessionId?: string): { deleted: number } {
  if (!fs.existsSync(LOG_FILE)) return { deleted: 0 };

  if (!sessionId) {
    fs.unlinkSync(LOG_FILE);
    return { deleted: 0 };
  }

  const all = readLogs();
  const remaining = all.filter((log) => log.sessionId !== sessionId);
  const deleted = all.length - remaining.length;

  if (remaining.length === 0) {
    fs.unlinkSync(LOG_FILE);
  } else {
    fs.writeFileSync(LOG_FILE, JSON.stringify(remaining, null, 2));
  }
  return { deleted };
}

export function resetLogs(): void {
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }
}
