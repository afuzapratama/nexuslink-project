#!/usr/bin/env node

/**
 * Custom start script for NexusLink Dashboard
 * Reads PORT from environment variable or defaults to 3000
 */

const { spawn } = require('child_process');
const { config } = require('dotenv');
const path = require('path');

// Load .env files in order of priority
config({ path: path.join(__dirname, '.env.production') });
config({ path: path.join(__dirname, '.env.local') });
config({ path: path.join(__dirname, '.env') });

const port = process.env.PORT || 3000;

console.log(`[NexusLink] Environment PORT=${process.env.PORT || 'not set'}`);
console.log(`[NexusLink] Starting Next.js on port ${port}...`);

const child = spawn('next', ['start', '-p', port.toString()], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: port.toString() }
});

child.on('error', (error) => {
  console.error(`Error starting Next.js: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});
