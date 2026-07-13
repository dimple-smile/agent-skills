#!/usr/bin/env node
/**
 * dev-log — AI debugging collaboration CLI.
 *
 * Subcommands:
 *   start                start the HTTP log server (fixed port 7331)
 *   gen [opts]           generate a paste-ready log statement
 *   logs [opts]          read collected logs
 *   clear [opts]         clear logs
 *   tunnel               start an HTTPS tunnel to the running server
 *   status               show server status
 *   stop                 stop the running server
 */
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import cac from 'cac';
import { createServer, getLocalIP, isRunning, addresses } from './server.js';
import { startTunnel } from './tunnel.js';
import { generate, newSessionId } from './gen.js';
import {
  PORT,
  readLogs,
  clearLogs,
  resetLogs,
  writePid,
  readPid,
  removePid,
} from './store.js';

const cli = cac('@dev-log/cli');

// The canonical way users invoke this CLI. Used in all user-facing tips so
// they can copy-paste directly. (The bin name is "dev-log", but users reach
// it via the package name through npx.)
const CMD = 'npx @dev-log/cli';

// Read version from package.json — single source of truth. Works in both dev
// (tsx runs from src/, package.json is up two levels) and published (bundled
// into dist/, package.json sits next to cli.cjs).
const VERSION: string = (() => {
  try {
    // ESM source (dev): import.meta.url resolves to src/cli.ts
    // Bundled CJS: import.meta.url resolves to dist/cli.cjs
    const dir = typeof __dirname !== 'undefined'
      ? __dirname
      : (() => { const { fileURLToPath } = require('url'); const { dirname } = require('path'); return dirname(fileURLToPath(import.meta.url)); })();
    // Try sibling package.json first (published: dist/package.json),
    // then parent (dev: package.json at repo root).
    for (const candidate of [dir, dir + '/..', dir + '/../..']) {
      try {
        const pkg = require(candidate + '/package.json');
        if (pkg.version) return pkg.version;
      } catch { /* keep looking */ }
    }
  } catch { /* ignore */ }
  return '0.0.0';
})();

// Hidden internal flag: when set, this process IS the daemon and should
// listen directly instead of spawning a child.
const IS_DAEMON = process.env.DEV_LOG_DAEMON === '1';

// Resolve the entry file path robustly. `process.argv[1]` is unreliable under
// tsx (dev mode) and some bundlers — import.meta.url gives us the actual
// module URL in both ESM source and bundled CJS (pkgroll preserves it).
const ENTRY_FILE = (() => {
  try {
    return fileURLToPath(import.meta.url);
  } catch {
    // CJS fallback (bundled output may not expose import.meta.url)
    return process.argv[1];
  }
})();

/** Probe whether the server answers /health, with a short timeout. */
function probeHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/health`, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

/** Wait up to ~5s for the freshly-spawned daemon to become reachable. */
async function waitForDaemon(): Promise<boolean> {
  for (let i = 0; i < 50; i++) {
    if (await probeHealth()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

cli
  .command('start', 'Start the log server (port 7331) as a background daemon')
  .action(async () => {
    // --- Daemon mode: this process is the forked child. Listen + persist. ---
    if (IS_DAEMON) {
      resetLogs();
      writePid();
      const localIP = getLocalIP();
      addresses.local = `http://localhost:${PORT}`;
      if (localIP) addresses.network = `http://${localIP}:${PORT}`;

      const server = createServer();
      server.listen(PORT, () => {
        // Signal readiness to the parent via the chosen wait mechanism.
        // The parent polls /health, so just listening is enough.
      });
      server.on('error', (err: NodeJS.ErrnoException) => {
        console.error(`error: ${err.message}`);
        removePid();
        process.exit(1);
      });
      // Clean shutdown removes the PID file.
      const shutdown = () => { removePid(); process.exit(0); };
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
      return;
    }

    // --- Foreground/parent mode: spawn the daemon and return immediately. ---
    if (await isRunning()) {
      console.log(`dev-log already running on port ${PORT}.`);
      return;
    }

    // Spawn the daemon. If we're running from .ts source (dev mode via tsx),
    // the daemon must also go through tsx. Find the tsx binary robustly — it
    // may be a local pnpm dep (not on $PATH), so resolve it via the module
    // resolution mechanism. If we're a bundled .cjs/.js, node runs it directly.
    const isTsSource = ENTRY_FILE.endsWith('.ts');
    let runner: string;
    let runnerArgs: string[];

    if (isTsSource) {
      // Resolve the local tsx binary path (pnpm hoists it under node_modules/.bin)
      const { existsSync } = await import('fs');
      const path = await import('path');
      const tsxBin = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
      runner = existsSync(tsxBin) ? tsxBin : 'npx';
      runnerArgs = existsSync(tsxBin)
        ? [ENTRY_FILE, 'start']
        : ['tsx', ENTRY_FILE, 'start'];
    } else {
      runner = process.execPath;
      runnerArgs = [ENTRY_FILE, 'start'];
    }

    const child = spawn(runner, runnerArgs, {
      env: { ...process.env, DEV_LOG_DAEMON: '1' },
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    const up = await waitForDaemon();
    if (!up) {
      console.error('error: server failed to start within 5s.');
      process.exit(1);
    }
    const localIP = getLocalIP();
    console.log(`dev-log listening on http://localhost:${PORT}`);
    if (localIP) console.log(`            network:  http://${localIP}:${PORT}`);
    console.log(`            stop with: ${CMD} stop`);
  });

cli
  .command('gen', 'Generate a paste-ready log statement')
  .option('--lang <lang>', 'Target language (js, ts, python, go, swift, kotlin, dart, cpp, rust, java, csharp, php, ruby)', { default: 'js' })
  .option('--type <type>', 'Log type (state, error, validation, click, ...)', { default: 'state' })
  .option('--data <expr>', 'Data payload expression in the target language')
  .option('--ready', 'Emit a __ready__ connectivity probe instead of a business log')
  .option('--session <id>', 'Reuse a sessionId (default: generate a new sess_xxxxxxxx)')
  .option('--url <url>', 'Endpoint URL', { default: `http://localhost:${PORT}` })
  .action((opts) => {
    try {
      const code = generate({
        lang: opts.lang,
        type: opts.type,
        data: opts.data,
        ready: opts.ready === true,
        sessionId: opts.session,
        url: opts.url,
      });
      process.stdout.write(code + '\n');
    } catch (e) {
      console.error(`error: ${(e as Error).message}`);
      process.exit(1);
    }
  });

cli
  .command('logs', 'Read collected logs')
  .option('--session <id>', 'Filter by sessionId')
  .action((opts) => {
    const logs = readLogs(opts.session);
    process.stdout.write(JSON.stringify(logs, null, 2) + '\n');
  });

cli
  .command('clear', 'Clear logs')
  .option('--session <id>', 'Clear only this session (omit for all)')
  .action((opts) => {
    const result = clearLogs(opts.session);
    console.log(
      opts.session
        ? `cleared ${result.deleted} log(s) for session ${opts.session}`
        : 'cleared all logs'
    );
  });

cli
  .command('tunnel', 'Start an HTTPS tunnel to the running server')
  .action(async () => {
    if (!(await isRunning())) {
      console.error(`error: server is not running. Start it first: ${CMD} start`);
      process.exit(1);
    }
    try {
      const url = await startTunnel();
      addresses.tunnel = url;
      console.log(url);
    } catch (e) {
      console.error(`error: failed to start tunnel: ${(e as Error).message}`);
      process.exit(1);
    }
  });

cli
  .command('status', 'Show server status')
  .action(async () => {
    const alive = await probeHealth();
    const pid = readPid();
    if (!alive) {
      console.log(JSON.stringify({ running: false, port: PORT }, null, 2));
      if (pid) {
        // Health says down but a PID file lingers — clean it.
        removePid();
      }
      return;
    }
    const logs = readLogs();
    const sessions = new Set(logs.map((l) => l.sessionId));
    console.log(
      JSON.stringify(
        {
          running: true,
          port: PORT,
          pid,
          local: `http://localhost:${PORT}`,
          network: addresses.network,
          tunnel: addresses.tunnel,
          logCount: logs.length,
          activeSessions: sessions.size,
        },
        null,
        2
      )
    );
  });

cli
  .command('stop', 'Stop the running server')
  .action(async () => {
    // Prefer the recorded PID (precise, cross-platform). Fall back to nothing
    // — we never want to kill a process that isn't ours.
    const pid = readPid();
    if (!pid) {
      // Stale state but something may still be on the port.
      if (await isRunning()) {
        console.log(`server is running but PID file is missing. Port ${PORT} is occupied; kill it manually if needed.`);
      } else {
        console.log('no dev-log server running.');
      }
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch (e) {
      // Process already gone — clean up stale PID file.
      removePid();
      console.log('no dev-log server running (cleaned up stale PID file).');
      return;
    }

    // Wait for it to actually exit (up to ~3s).
    let dead = false;
    for (let i = 0; i < 30; i++) {
      try {
        process.kill(pid, 0); // throws if no such process
      } catch {
        dead = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!dead) {
      // Force kill if SIGTERM was ignored.
      try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    }
    removePid();
    console.log(`stopped dev-log (pid ${pid})`);
  });

cli.help();
cli.version(VERSION);

// cac swallows unknown commands and no-arg invocations silently. Detect those
// cases explicitly so the user gets feedback instead of an empty exit.
const inputArgs = process.argv.slice(2);
const firstArg = inputArgs.find((a) => !a.startsWith('-'));
const hasHelpOrVersion = inputArgs.some((a) => a === '--help' || a === '-h' || a === '--version' || a === '-v');

// --help / --version are cac's built-in flags. A full parse() lets cac print
// them; for everything else we parse without running, validate the command,
// then run it ourselves.
if (hasHelpOrVersion) {
  cli.parse();
} else {
  // Parse without running so we can validate the command first.
  cli.parse(process.argv, { run: false });

  // No command at all → show help and exit.
  if (!firstArg) {
    cli.outputHelp();
    process.exit(0);
  }

  // Unknown command (not in our registered list) → error out.
  const knownCommands = ['start', 'gen', 'logs', 'clear', 'tunnel', 'status', 'stop'];
  if (!knownCommands.includes(firstArg)) {
    console.error(`error: unknown command "${firstArg}". Run "${CMD} --help" for the list.`);
    process.exit(1);
  }

  try {
    cli.runMatchedCommand();
  } catch (e) {
    // cac throws CACError on unknown options / bad usage — surface it cleanly
    // instead of dumping a stack trace.
    console.error(`error: ${(e as Error).message}`);
    console.error(`Run "${CMD} --help" for usage.`);
    process.exit(1);
  }
}

export { generate, newSessionId };
