#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import ora from 'ora';
import { runSetup } from './setup.js';
import { runDoctor } from './doctor.js';
import enquirer from 'enquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgDir = path.resolve(__dirname, '..');

// ─── Bold ASCII Logo (terminal-safe, monospace-guaranteed) ──────────
const LOGO = `
   ####  #####  ###### #    #    ##   #####   ####
  #    # #    # #      ##   #   #  #  #    # #
  #    # #####  #####  # #  #  #    # #    #  ####
  #    # #      #      #  # #  ###### #    #      #
  #    # #      #      #   ##  #    # #    # #    #
   ####  #      ###### #    #  #    # #####   ####
`;

// Gradient palette: teal → cyan → blue
const openadsGradient = gradient(['#00d2ff', '#3a7bd5', '#00d2ff']);

async function main() {
  const args = process.argv.slice(2);

  // Command routing — setup & doctor skip the splash
  if (args[0] === 'setup') {
    await runSetup();
    return;
  }

  if (args[0] === 'doctor') {
    await runDoctor();
    return;
  }

  // ─── Splash Screen ──────────────────────────────────────────────
  console.clear();
  console.log(openadsGradient(LOGO));

  // Read config for dynamic status
  const configDir = path.join(os.homedir(), '.openads');
  const configPath = path.join(configDir, 'openads.config.json');
  let modelName = chalk.gray('Not configured');
  let googleStatus = chalk.gray('○ Not connected');
  let metaStatus = chalk.gray('○ Not connected');
  let providerArg = '';
  let apiKeyArg = '';

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.provider) {
        let cleanProvider = config.provider;
        // Normalize deprecated model names to current equivalents
        const deprecatedModels: Record<string, string> = {
          'google/gemini-1.5-pro': 'google/gemini-2.5-flash',
          'google/gemini-1.5-pro-latest': 'google/gemini-2.5-flash',
          'google/gemini-3.5-flash': 'google/gemini-2.5-flash',
          'openai/gpt-4o': 'openai/gpt-4.1',
          'openai/gpt-4o-mini': 'openai/gpt-4.1-mini',
          'anthropic/claude-3-5-sonnet-20241022': 'anthropic/claude-sonnet-4',
          'anthropic/claude-3-5-haiku-20241022': 'anthropic/claude-haiku-4',
        };
        if (deprecatedModels[cleanProvider]) {
          cleanProvider = deprecatedModels[cleanProvider];
        }
        modelName = chalk.cyan.bold(cleanProvider);
        providerArg = `--model ${cleanProvider}`;
      }
      if (config.apiKey) {
        apiKeyArg = `--api-key ${config.apiKey}`;
      }
      if (config.connectGoogle) {
        googleStatus = chalk.green('● Connected');
      }
      if (config.metaToken) {
        metaStatus = chalk.green('● Connected');
      }
    } catch (e) {
      // ignore malformed config
    }
  }

  // Build compact status panel
  const statusLines = [
    `  ${chalk.bold.white('Model')}       ${modelName}`,
    `  ${chalk.bold.white('Google Ads')}  ${googleStatus}`,
    `  ${chalk.bold.white('Meta Ads')}    ${metaStatus}`,
    '',
    `  ${chalk.gray('v0.1.0')}  ${chalk.gray('·')}  ${chalk.gray('AI Command Center for Marketers')}`,
  ].join('\n');

  console.log(
    boxen(statusLines, {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      margin: { top: 0, bottom: 1, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: 'cyan',
      dimBorder: true,
    })
  );

  // ─── Interactive Menu (when no args) ────────────────────────────
  let finalArgs = [...args];

  if (args.length === 0) {
    const { action } = await enquirer.prompt<{ action: string }>({
      type: 'select',
      name: 'action',
      message: chalk.bold('What would you like to do?'),
      choices: [
        { name: 'audit',        message: `${chalk.cyan('🔍')}  Audit my Google Ads account` },
        { name: 'copy',         message: `${chalk.cyan('✍️')}   Write conversion ad copy` },
        { name: 'autoresearch', message: `${chalk.cyan('🔄')}  Run autonomous optimization` },
        { name: 'gtm',          message: `${chalk.cyan('📈')}  Build a Go-To-Market strategy` },
        { name: 'chat',         message: `${chalk.cyan('💬')}  Ask anything (free chat)` },
        { name: 'setup',        message: `${chalk.gray('⚙️')}   Settings` },
        { name: 'doctor',       message: `${chalk.gray('🩺')}  Diagnostics` },
        { name: 'exit',         message: `${chalk.gray('❌')}  Exit` }
      ]
    });

    if (action === 'exit') {
      console.log(chalk.cyan('\n  Goodbye! Keep marketing 🎯\n'));
      return;
    }
    if (action === 'setup') {
      await runSetup();
      return;
    }
    if (action === 'doctor') {
      await runDoctor();
      return;
    }

    const actionMap: Record<string, string[]> = {
      audit:        ['audit-google-ads'],
      copy:         ['write-ad-copy'],
      autoresearch: ['autoresearch-plan'],
      gtm:          ['go-to-market'],
      chat:         [],
    };
    finalArgs = actionMap[action] || [];
  }

  // ─── Loading Spinner ────────────────────────────────────────────
  const spinner = ora({
    text: chalk.cyan('Starting marketing agent...'),
    spinner: 'dots12',
    color: 'cyan',
  }).start();

  // Simulate brief init delay so the user sees the spinner
  await new Promise(r => setTimeout(r, 800));

  // ─── Build Pi Arguments ─────────────────────────────────────────
  let piArgsRaw: string[] = [];
  if (providerArg) piArgsRaw.push(...providerArg.split(' '));
  if (apiKeyArg) piArgsRaw.push(...apiKeyArg.split(' '));

  const skillsDir = path.join(pkgDir, 'skills');
  const templatesDir = path.join(pkgDir, 'templates');

  const piArgs = [
    ...piArgsRaw,
    '--skill', skillsDir,
    '--prompt-template', templatesDir,
    ...finalArgs
  ];

  const env: any = {
    ...process.env,
    NODE_NO_WARNINGS: '1'
  };

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.localBaseUrl) {
        env.OPENAI_BASE_URL = config.localBaseUrl;
      }
    } catch (e) {}
  }

  // ─── White-Label Patch ──────────────────────────────────────────
  // Branding and configDir are patched at install-time via postinstall script.

  // Silence Pi's default startup banner
  const agentDir = path.join(os.homedir(), '.openads', 'agent');
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }
  const settingsPath = path.join(agentDir, 'settings.json');
  let settings: any = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch (e) {}
  }
  if (!settings.quietStartup) {
    settings.quietStartup = true;
  }

  // Inject resilient retry settings for strict free-tier rate limits (e.g. Gemini 15 RPM)
  settings.retry = {
    maxAttempts: 10,
    baseDelayMs: 15000,
    provider: { maxRetryDelayMs: 120000 }
  };

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  // Inject Meta MCP server if token is present
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.metaToken) {
        settings.mcpServers = settings.mcpServers || {};
        settings.mcpServers['meta-ads'] = {
          command: 'npx',
          args: ['-y', '@meta/mcp-server'],
          env: {
            META_ACCESS_TOKEN: config.metaToken
          }
        };
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      }
    } catch (e) {}
  }

  // ─── Launch Agent ───────────────────────────────────────────────
  const piCliPath = path.resolve(pkgDir, 'node_modules', '@earendil-works', 'pi-coding-agent', 'dist', 'cli.js');

  spinner.succeed(chalk.green('Agent ready'));
  console.log('');

  if (finalArgs.length === 0) {
    console.log(chalk.gray('  Type your question or /help for commands\n'));
  }

  const child = spawn('node', [piCliPath, ...piArgs], {
    stdio: 'inherit',
    env
  });

  child.on('exit', (code: number | null) => {
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});
