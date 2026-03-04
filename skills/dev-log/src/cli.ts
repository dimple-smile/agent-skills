#!/usr/bin/env node
import { killOldProcess, startServer } from './index.js';

killOldProcess();
startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
