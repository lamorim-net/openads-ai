#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { runSetup } from './setup.js';
import { runDoctor } from './doctor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgDir = path.resolve(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);

  // Command routing
  if (args[0] === 'setup') {
    await runSetup();
    return;
  }

  if (args[0] === 'doctor') {
    await runDoctor();
    return;
  }

  // Splash Screen
  console.clear();
  const asciiArt = figlet.textSync('OpenAds', { font: 'Standard' });
  const openadsGradient = gradient(['#4facfe', '#00f2fe'])(asciiArt);

  const statusPanel = `
  ${chalk.bold('Model')}     Claude Sonnet 3.5
  ${chalk.bold('Google')}    ✓ Configured
  ${chalk.bold('Meta')}      ✓ Configured
  ${chalk.bold('Skills')}    product · ads · copy · autoresearch
  `;

  const boxContent = `
${openadsGradient}

  ${chalk.cyan('OpenAds v0.1.0')}  ${chalk.gray('AI for marketers')}
${chalk.gray('───────────────────────────────────────────────')}
${statusPanel}`;

  console.log(
    boxen(boxContent, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );

  console.log(`  ${chalk.gray('Type your question or /help for commands')}\n`);

  // Launch Pi with our skills, templates, and config
  const skillsDir = path.join(pkgDir, 'skills');
  const templatesDir = path.join(pkgDir, 'templates');
  const extensionsDir = path.join(pkgDir, 'extensions');

  const piArgs = [
    '--package', pkgDir,
    ...args
  ];

  // We rely on Pi being installed either globally or locally
  // For the wrapper, we spawn the local npx pi or global pi.
  // Using npx ensures we use the project's dependency if available.
  const child = spawn('npx', ['pi', ...piArgs], {
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code: number | null) => {
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});
