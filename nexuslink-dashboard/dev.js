#!/usr/bin/env node

/**
 * Custom dev script for NexusLink Dashboard
 * Reads PORT from environment variable or defaults to 3000
 */

const { spawn } = require('child_process');

const port = process.env.PORT || 3000;

console.log(`Starting Next.js dev server on port ${port}...`);

const child = spawn('next', ['dev', '-p', port.toString()], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error(`Error starting Next.js: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});
