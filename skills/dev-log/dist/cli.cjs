#!/usr/bin/env node
'use strict';

var index = require('./index.cjs');
require('http');
require('fs');
require('path');
require('os');
require('localtunnel');

index.killOldProcess();
index.startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
