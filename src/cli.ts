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
import { runScheduleManager, runScheduledTask, openReportInBrowser, listReports } from './schedule.js';
import enquirer from 'enquirer';
import { hasGlobalRtk } from './token-optimizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgDir = path.resolve(__dirname, '..');

// ─── Logo ───────────────────────────────────────────────────────────
const LOGO = [
  '  ██████╗ ██████╗ ███████╗███╗   ██╗ █████╗ ██████╗ ███████╗',
  '  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔══██╗██╔════╝',
  '  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████║██║  ██║███████╗',
  '  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔══██║██║  ██║╚════██║',
  '  ╚██████╔╝██║     ███████╗██║ ╚████║██║  ██║██████╔╝███████║',
  '   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═════╝ ╚══════╝',
].join('\n');

// Gradient palette: teal → cyan → blue
const openadsGradient = gradient(['#00d2ff', '#3a7bd5', '#00d2ff']);

// ─── Config Helpers ─────────────────────────────────────────────────

const CONFIG_DIR = path.join(os.homedir(), '.openads');
const CONFIG_PATH = path.join(CONFIG_DIR, 'openads.config.json');

const DEPRECATED_MODELS: Record<string, string> = {
  'google/gemini-1.0-pro': 'google/gemini-2.5-flash',
};

function loadConfig(): any {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function resolveModel(provider: string): string {
  return DEPRECATED_MODELS[provider] || provider;
}

// ─── Product Context & Memory ───────────────────────────────────────
// The business context file grows over time. The agent appends learnings
// (audience insights, campaign results, winning creative angles, etc.)
// after each session. We only create the initial file if it doesn't exist
// so accumulated knowledge is never overwritten.

function injectProductContext(config: any): string | null {
  if (!config?.productContext) return null;

  const contextDir = path.join(CONFIG_DIR, 'context');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  const contextPath = path.join(contextDir, 'my-business.md');

  // Only create the initial file — never overwrite accumulated learnings
  if (!fs.existsSync(contextPath)) {
    const content = `---
name: my-business
description: The user's business context — always read this first.
---
# My Business

${config.productContext}

## Learnings

_The AI will automatically add insights here as it learns about your business._
_You can also edit this file manually at: ${contextPath}_
`;
    fs.writeFileSync(contextPath, content);
  }

  return contextDir;
}

// ─── System Prompt ──────────────────────────────────────────────────
// Makes the agent behave as "OpenAds" instead of generic Pi.

function buildSystemPrompt(config: any): string {
  const contextPath = path.join(CONFIG_DIR, 'context', 'my-business.md');
  const isLaunchMode = config.mode === 'launch';

  const parts = [
    'You are OpenAds, an AI marketing assistant built for digital marketers.',
    'You specialize in Google Ads, Meta Ads, copywriting, analytics, CRO, and go-to-market strategy.',
    'Always speak in plain marketing language. Never use developer jargon.',
    'Address the user as a marketing professional.',
    'When writing ad copy or recommendations, always reference the user\'s product context first.',
  ];

  if (isLaunchMode) {
    parts.push(
      'YOU ARE OPERATING IN LAUNCH MODE (READ-WRITE).',
      'You are authorized to execute active write modifications on ad accounts (e.g. pausing campaigns, scaling bids, altering daily budgets, creating ads).',
      'CRITICAL SAFETY RULE: For any write operation, you MUST generate a clear visual preview card outlining the exact changes and ask the user for explicit confirmation (Y/N) before executing. NEVER make active changes without their explicit confirmation.'
    );
  } else {
    parts.push(
      'YOU ARE OPERATING IN AUDIT MODE (SAFE / READ-ONLY).',
      'You are authorized to read campaigns, analyze performance data, find budget waste, and recommend copy or landing page changes.',
      'CRITICAL SAFETY RULE: You are NOT authorized to make any active modifications to campaigns, budgets, or ad creative settings under any circumstances.',
      'If the user asks you to pause a campaign, change a budget, or execute a write operation, explain politely that OpenAds is currently in Audit Mode (Safe/Read-only). Outline the exact steps you would take, and tell them to toggle to Launch Mode in Settings (`openads setup`) to execute them.'
    );
  }
  parts.push(
    '',
    '## Memory',
    '',
    `Your business context file is at: ${contextPath}`,
    'This file contains everything you have learned about the user\'s business across sessions.',
    'At the START of every conversation, read this file to recall past context.',
    'At the END of a conversation (or when you learn something significant), APPEND new insights to the "## Learnings" section of that file.',
    'Things worth remembering: product details, audience segments, campaign performance benchmarks, winning ad angles, competitor insights, budget constraints, seasonal patterns, and any preferences the user expresses.',
    'Format each learning as a bullet point with a date, e.g.: "- (2026-05-24) Best-performing Meta creative uses customer testimonial videos."',
    'Never overwrite existing learnings — only append new ones.',
    'If the learnings section grows beyond 50 items, summarize the oldest 25 into a "## Summary" section at the top and remove the individual bullets.'
  );

  if (config?.productContext) {
    parts.push(`\nThe user's business: ${config.productContext}`);
  }

  if (config?.connectGoogle) {
    parts.push('Google Ads is connected — you can read live campaign data.');
  }

  if (config?.metaToken) {
    parts.push('Meta Ads is connected — you can read live campaign and creative data.');
  }

  return parts.join('\n');
}

// ─── API Key Environment Variable Mapping ───────────────────────────
// Pass API keys via environment variables instead of CLI flags (security).

function getApiKeyEnvVar(provider: string): string {
  if (provider.startsWith('google/')) return 'GOOGLE_API_KEY';
  if (provider.startsWith('openai/')) return 'OPENAI_API_KEY';
  if (provider.startsWith('anthropic/')) return 'ANTHROPIC_API_KEY';
  if (provider.startsWith('groq/')) return 'GROQ_API_KEY';
  // Fallback for OpenRouter, custom providers
  return 'OPENAI_API_KEY';
}

// ─── Skills Browser ─────────────────────────────────────────────────

function showSkills(): void {
  const skillsDir = path.join(pkgDir, 'skills');

  // Recursively find all .md files
  function findMarkdown(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findMarkdown(full));
      } else if (entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
    return results;
  }

  // Extract name and description from frontmatter or first heading
  function parseMeta(filePath: string): { name: string; description: string; category: string } {
    const content = fs.readFileSync(filePath, 'utf8');
    const rel = path.relative(skillsDir, filePath);
    const parts = rel.split(path.sep);
    const category = parts.length > 1 ? parts[0] : 'general';

    // Try YAML frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let name = path.basename(filePath, '.md');
    let description = '';

    if (fmMatch) {
      const nameMatch = fmMatch[1].match(/name:\s*(.+)/);
      const descMatch = fmMatch[1].match(/description:\s*(.+)/);
      if (nameMatch) name = nameMatch[1].trim();
      if (descMatch) description = descMatch[1].trim();
    }

    // Fallback: use first heading as name, first paragraph line as description
    if (!description) {
      const headingMatch = content.match(/^#\s+(.+)/m);
      if (headingMatch) name = headingMatch[1].trim();
      const paraMatch = content.match(/^(?!#|---|\s*$)(.+)/m);
      if (paraMatch) description = paraMatch[1].trim().slice(0, 80);
    }

    return { name, description, category };
  }

  const files = findMarkdown(skillsDir);
  const skills = files.map(parseMeta).sort((a, b) => a.category.localeCompare(b.category));

  console.log('');
  console.log(chalk.bold.cyan('  Installed Skills'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  console.log('');

  // Group by category
  const grouped = new Map<string, typeof skills>();
  for (const skill of skills) {
    const group = grouped.get(skill.category) || [];
    group.push(skill);
    grouped.set(skill.category, group);
  }

  for (const [category, items] of grouped) {
    console.log(chalk.bold.white(`  ${category.toUpperCase()}`));
    for (const item of items) {
      const nameStr = chalk.cyan(item.name.padEnd(22));
      const descStr = chalk.gray(item.description);
      console.log(`    ${nameStr} ${descStr}`);
    }
    console.log('');
  }

  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  console.log(`  ${chalk.bold.white('Want more?')} 30+ community skills available at:`);
  console.log(`  ${chalk.cyan('https://github.com/coreyhaines31/marketingskills')}`);
  console.log('');
  console.log(chalk.gray('  To add a skill, drop a .md file into the skills/ folder.'));
  console.log(chalk.gray('  The agent picks them up automatically — no code needed.'));
  console.log('');
}

// ─── Main ───────────────────────────────────────────────────────────

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

  if (args[0] === 'schedule') {
    await runScheduleManager(args[1]);
    return;
  }

  if (args[0] === 'run-schedule') {
    await runScheduledTask(args[1]);
    return;
  }

  if (args[0] === 'report') {
    if (args[1] === 'list') {
      listReports();
    } else if (args[1]) {
      await openReportInBrowser(args[1]);
    } else {
      listReports();
    }
    return;
  }

  // ─── First-Run Detection ────────────────────────────────────────
  const config = loadConfig();

  if (!config || !config.provider) {
    console.clear();
    console.log(openadsGradient(LOGO));
    console.log(chalk.cyan.bold('\n  Welcome to OpenAds! 🎯'));
    console.log(chalk.gray('  Looks like this is your first time. Let\'s get you set up.\n'));
    await runSetup();
    return;
  }

  // ─── Splash Screen ──────────────────────────────────────────────
  console.clear();
  console.log('');
  console.log(openadsGradient(LOGO));
  console.log('');

  const cleanProvider = resolveModel(config.provider);
  const modelName = chalk.cyan.bold(cleanProvider);
  const googleStatus = config.connectGoogle ? chalk.green('● Connected') : chalk.gray('○ Not connected');
  const metaStatus = config.metaToken ? chalk.green('● Connected') : chalk.gray('○ Not connected');

  const modeName = config.mode === 'launch' ? chalk.red.bold('Launch Mode (Read-Write)') : chalk.green.bold('Audit Mode (Safe / Read-only)');

  // Build compact status panel
  const statusLines = [
    `  ${chalk.bold.white('Model')}       ${modelName}`,
    `  ${chalk.bold.white('Mode')}        ${modeName}`,
    `  ${chalk.bold.white('Google Ads')}  ${googleStatus}`,
    `  ${chalk.bold.white('Meta Ads')}    ${metaStatus}`,
    '',
    `  ${chalk.gray('v0.2.1')}  ${chalk.gray('·')}  ${chalk.gray('AI Command Center for Marketers')}`,
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
        { name: 'chat',         message: `${chalk.cyan('💬')}  Ask anything` },
        { name: 'audit',        message: `${chalk.cyan('🔍')}  Audit my ad campaigns ${chalk.gray('(audit)')}` },
        { name: 'copy',         message: `${chalk.cyan('✍️')}   Write ad copy for any platform ${chalk.gray('(copywriting)')}` },
        { name: 'autoresearch', message: `${chalk.cyan('🔄')}  Test and improve ideas automatically ${chalk.gray('(autoresearch)')}` },
        { name: 'gtm',          message: `${chalk.cyan('📈')}  Build a go-to-market plan ${chalk.gray('(strategy)')}` },
        { name: 'skills',       message: `${chalk.cyan('📚')}  Browse available skills` },
        { name: 'schedule',     message: `${chalk.cyan('⏰')}  Schedule automations` },
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
    if (action === 'skills') {
      showSkills();
      return;
    }
    if (action === 'schedule') {
      await runScheduleManager();
      return;
    }

    const actionMap: Record<string, string[]> = {
      chat:         [],
      audit:        ['audit-google-ads'],
      copy:         ['write-ad-copy'],
      autoresearch: ['autoresearch-plan'],
      gtm:          ['go-to-market'],
    };
    finalArgs = actionMap[action] || [];
  }

  // ─── Loading Spinner ────────────────────────────────────────────
  const spinner = ora({
    text: chalk.cyan('Starting marketing agent...'),
    spinner: 'dots12',
    color: 'cyan',
  }).start();

  await new Promise(r => setTimeout(r, 800));

  // ─── Build Pi Arguments ─────────────────────────────────────────
  const piArgsRaw: string[] = [];

  // Model flag
  piArgsRaw.push('--model', cleanProvider);

  // Skills directories
  const skillsDir = path.join(pkgDir, 'skills');
  const templatesDir = path.join(pkgDir, 'templates');

  // Inject product context as a skill directory
  const contextDir = injectProductContext(config);

  const piArgs = [
    ...piArgsRaw,
    '--skill', skillsDir,
    '--prompt-template', templatesDir,
    ...(contextDir ? ['--skill', contextDir] : []),
    ...finalArgs
  ];

  // ─── Environment Variables ──────────────────────────────────────
  // API key passed via env var (not CLI flag) for security
  const env: any = {
    ...process.env,
    NODE_NO_WARNINGS: '1',
  };

  if (config.apiKey && config.apiKey !== 'dummy-key') {
    const envVarName = getApiKeyEnvVar(cleanProvider);
    env[envVarName] = config.apiKey;
  }

  if (config.localBaseUrl) {
    env.OPENAI_BASE_URL = config.localBaseUrl;
  }

  // ─── White-Label Patch ──────────────────────────────────────────
  const agentDir = path.join(CONFIG_DIR, 'agent');
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }
  const settingsPath = path.join(agentDir, 'settings.json');
  let settings: any = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch (e) {}
  }

  settings.quietStartup = true;

  // System prompt — makes the agent behave as OpenAds
  settings.systemPrompt = buildSystemPrompt(config);

  // Resilient retry settings for free-tier rate limits
  settings.retry = {
    maxAttempts: 10,
    baseDelayMs: 15000,
    provider: { maxRetryDelayMs: 120000 }
  };

  // Setup MCP Servers inside settings.json
  settings.mcpServers = settings.mcpServers || {};
  const useRtk = hasGlobalRtk();

  // Google Ads integration
  if (config.connectGoogle) {
    settings.mcpServers['google-ads'] = {
      command: useRtk ? 'rtk' : 'uvx',
      args: useRtk ? ['uvx', 'adloop'] : ['adloop']
    };
  }

  // Inject Meta MCP server if token is present
  if (config.metaToken) {
    settings.mcpServers['meta-ads'] = {
      command: useRtk ? 'rtk' : 'npx',
      args: useRtk ? ['npx', '-y', '@meta/mcp-server'] : ['-y', '@meta/mcp-server'],
      env: { META_ACCESS_TOKEN: config.metaToken }
    };
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

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
