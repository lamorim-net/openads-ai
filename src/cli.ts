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
import readline from 'readline';
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
// Two modes: 'default' (full prompt for chat/audit) and 'autoresearch' (lean prompt for AR loops).

type PromptMode = 'default' | 'autoresearch';

function buildSystemPrompt(config: any, mode: PromptMode = 'default', arContext?: { arAction?: string; triggerMsg?: string }): string {
  const contextPath = path.join(CONFIG_DIR, 'context', 'my-business.md');
  const isLaunchMode = config.mode === 'launch';
  const homeDir = os.homedir();

  // ── Core identity (shared across all modes) ───────────────────
  const identity = [
    'You are OpenAds, an AI marketing assistant built for digital marketers.',
    'You specialize in Google Ads, Meta Ads, copywriting, analytics, CRO, and go-to-market strategy.',
    'Always speak in plain marketing language. Never use developer jargon.',
    'Address the user as a marketing professional.',
    'When writing ad copy or recommendations, always reference the user\'s product context first.',
  ];

  // ── Memory (shared) ───────────────────────────────────────────
  const memory = [
    '',
    '## Memory',
    `Your business context file is at: ${contextPath}`,
    'Read this file at the START of every conversation to recall past context.',
    'At the END of a conversation, APPEND new insights to the "## Learnings" section.',
    'Format each learning as a bullet: "- (YYYY-MM-DD) Insight here."',
    'Never overwrite existing learnings — only append.',
  ];

  // ── Safety (shared — minimal) ─────────────────────────────────
  const safety = [
    '',
    '## Safety Rules',
    `- The user's home directory is: ${homeDir}. Always use literal paths (e.g. "${path.join(homeDir, 'Desktop')}"), never placeholders.`,
    '- NEVER use placeholder strings like "your_account_id" or "act_YOUR_ACCOUNT_ID" in tool calls.',
    '- NEVER run system-wide search commands from root (like `find / ...`).',
  ];

  // ── Business context (shared) ─────────────────────────────────
  const businessContext: string[] = [];
  if (config?.productContext) {
    businessContext.push(`\nThe user's business: ${config.productContext}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // AUTORESEARCH MODE — Lean prompt (~500 words)
  // Gives small local models maximum context budget for tool-calling.
  // ─────────────────────────────────────────────────────────────────
  if (mode === 'autoresearch') {
    const arParts = [
      ...identity,
      ...safety,
      '',
      '## Your Task: Autoresearch Autonomous Loop',
      '- You are running the Autoresearch marketing loop. Your ONLY job is to generate NEW, testable marketing hypotheses.',
      '- Read the relevant skill file for detailed instructions on the loop phases and output format.',
      '- Prior experiment data (CSVs) is FUEL — not the deliverable. Extract patterns quickly, then generate NEW assets.',
      '- Execute at least 3 autonomous cycles: Generate → Score → Keep/Discard → Iterate.',
      '- Log each cycle concisely: "Loop 1: Generated 10. 3 passed, 7 discarded. (Reasons: ...)"',
      '- End with a prioritized table of NEW hypotheses with: Asset/Copy, Rationale, Priority Score.',
      `- Auto-save results to ~/.openads/reports/autoresearch-[timestamp].md.`,
      '- Do NOT query live ad platforms (Meta/Google MCP tools) during Autoresearch unless explicitly asked.',
      ...businessContext,
      ...memory,
    ];
    return arParts.join('\n');
  }

  // ─────────────────────────────────────────────────────────────────
  // DEFAULT MODE — Full prompt for chat, audit, copywriting, GTM
  // ─────────────────────────────────────────────────────────────────
  const parts = [
    ...identity,
    '',
    '## Platform Integrations & Live Data Tools',
    '- You have live access to Google Ads, Meta Ads, and GA4 via MCP server tools.',
    '- When asked to check campaigns or metrics, use MCP tools — never search the local file system for campaign data.',
    '- For Meta: call `get_ad_accounts()` first, then `list_campaigns(account_id)`, then `get_campaign_performance` or `get_insights`. Never guess IDs.',
    '- Be proactive: when fetching campaigns, immediately query performance data too. Deliver a full metrics summary (spend, impressions, CTR, ROAS, conversions) without asking unnecessary questions.',
    '- ANTI-LOOP RULE: Never call the same tool twice in one turn. Always progress forward through the tool chain.',
    ...safety,
    ' - NEVER claim the user "specifically mentioned" a platform unless they literally typed its name.',
  ];

  if (isLaunchMode) {
    parts.push(
      '',
      '## Mode: Launch (Read-Write)',
      'You can execute write operations on ad accounts (pause, scale, create).',
      'ALWAYS show a preview card and get Y/N confirmation before any write operation.'
    );
  } else {
    parts.push(
      '',
      '## Mode: Audit (Read-Only)',
      'You can analyze performance, find waste, and recommend changes.',
      'You CANNOT make active modifications. Tell users to toggle Launch Mode via `openads setup` for write operations.'
    );
  }

  parts.push(
    '',
    '## Skill-Based Roles',
    '- Your behavior for each task is defined by skill files (.md) loaded into your context.',
    '- Read the relevant skill file FIRST before responding to any specialized request.',
    '- For Autoresearch commands: follow the skill file phases exactly. The deliverable is ALWAYS new hypotheses, never a data summary.',
    '- During Autoresearch, do NOT query live ad platforms unless the user explicitly requests it.',
  );

  if (config?.connectGoogle) {
    parts.push('- Google Ads is connected — you can read live campaign data.');
  }
  if (config?.metaToken) {
    parts.push('- Meta Ads is connected — you can read live campaign and creative data.');
  }

  parts.push(...businessContext);
  parts.push(...memory);

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
  console.log(chalk.gray('  To add a skill, drop a .md file into the skills/ folder.'));
  console.log(chalk.gray('  The agent picks them up automatically — no code needed.'));
  console.log('');
}

// ─── Selective Skill Loading ────────────────────────────────────────
// Instead of loading all 24 skill files (~11K tokens), load only the ones
// relevant to the selected action. Critical for small local models.

function getRelevantSkills(action: string, arAction: string, skillsDir: string): string[] {
  const pmSkill = path.join(skillsDir, 'product-marketing.md');

  // Map ar actions to their specific skill files
  const arSkillMap: Record<string, string[]> = {
    'ar-core':     [path.join(skillsDir, 'automation', 'autoresearch.md'), pmSkill],
    'ar-plan':     [path.join(skillsDir, 'automation', 'autoresearch-plan.md'), pmSkill],
    'ar-improve':  [path.join(skillsDir, 'automation', 'autoresearch-improve.md'), pmSkill],
    'ar-learn':    [path.join(skillsDir, 'automation', 'autoresearch-learn.md'), pmSkill],
    'ar-predict':  [path.join(skillsDir, 'automation', 'autoresearch-predict.md'), pmSkill],
    'ar-probe':    [path.join(skillsDir, 'automation', 'autoresearch-probe.md'), pmSkill],
    'ar-reason':   [path.join(skillsDir, 'automation', 'autoresearch-reason.md'), pmSkill],
    'ar-scenario': [path.join(skillsDir, 'automation', 'autoresearch-scenario.md'), pmSkill],
    'ar-evals':    [path.join(skillsDir, 'automation', 'autoresearch-evals.md'), pmSkill],
    'ar-debug':    [path.join(skillsDir, 'automation', 'autoresearch-debug.md'), pmSkill],
    'ar-fix':      [path.join(skillsDir, 'automation', 'autoresearch-fix.md'), pmSkill],
    'ar-security': [path.join(skillsDir, 'automation', 'autoresearch-security.md'), pmSkill],
    'ar-ship':     [path.join(skillsDir, 'automation', 'autoresearch-ship.md'), pmSkill],
  };

  // Autoresearch actions → load only the relevant skill + product context
  if (arAction && arSkillMap[arAction]) {
    return arSkillMap[arAction];
  }

  // Audit → load platform-specific skills
  if (action === 'audit') {
    return [
      path.join(skillsDir, 'ads', 'google-ads.md'),
      path.join(skillsDir, 'ads', 'meta-ads.md'),
      pmSkill,
    ];
  }

  // Copy → load copywriting + product context
  if (action === 'copy') {
    return [
      path.join(skillsDir, 'content', 'copywriting.md'),
      pmSkill,
    ];
  }

  // GTM → load go-to-market + product context
  if (action === 'gtm') {
    return [
      path.join(skillsDir, 'strategy', 'go-to-market.md'),
      pmSkill,
    ];
  }

  // Chat (default) → load everything (full discovery)
  return [skillsDir];
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
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));

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
    `  ${chalk.gray(`v${pkg.version}`)}  ${chalk.gray('·')}  ${chalk.gray('AI Command Center for Marketers')}`,
  ].join('\n');

  // ─── Interactive Menu (when no args) ────────────────────────────
  let finalArgs = [...args];
  let selectedAction = '';   // Track which action was selected for system prompt mode
  let selectedArAction = ''; // Track which AR sub-action for selective skill loading

  if (args.length === 0) {
    while (true) {
      console.clear();
      console.log('');
      console.log(openadsGradient(LOGO));
      console.log('');
      console.log(
        boxen(statusLines, {
          padding: { top: 1, bottom: 1, left: 2, right: 2 },
          margin: { top: 0, bottom: 1, left: 2, right: 2 },
          borderStyle: 'round',
          borderColor: 'cyan',
          dimBorder: true,
        })
      );

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
        console.log(chalk.cyan('\n  Press Enter to go back to the menu...'));
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await new Promise<void>(resolve => {
          rl.question('', () => {
            rl.close();
            resolve();
          });
        });
        continue;
      }
      if (action === 'skills') {
        showSkills();
        console.log(chalk.cyan('\n  Press Enter to go back to the menu...'));
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await new Promise<void>(resolve => {
          rl.question('', () => {
            rl.close();
            resolve();
          });
        });
        continue;
      }
      if (action === 'schedule') {
        await runScheduleManager();
        continue;
      }

      if (action === 'audit') {
        let auditPrompt = 'Perform a comprehensive campaign audit of my Google Ads account.';
        if (config.metaToken && !config.connectGoogle) {
          auditPrompt = 'Perform a comprehensive campaign audit of my Meta Ads account.';
        } else if (config.metaToken && config.connectGoogle) {
          auditPrompt = 'Perform a comprehensive multi-platform campaign audit of my connected ad accounts.';
        }
        finalArgs = [auditPrompt];
      } else if (action === 'autoresearch') {
        let inArMenu = true;
        let arAction = '';

        while (inArMenu) {
          console.clear();
          console.log('');
          console.log(openadsGradient(LOGO));
          console.log('');
          console.log(
            boxen(statusLines, {
              padding: { top: 1, bottom: 1, left: 2, right: 2 },
              margin: { top: 0, bottom: 1, left: 2, right: 2 },
              borderStyle: 'round',
              borderColor: 'cyan',
              dimBorder: true,
            })
          );

          const { arPhase } = await enquirer.prompt<{ arPhase: string }>({
            type: 'select',
            name: 'arPhase',
            message: chalk.bold('🔬 Autoresearch — Select a Phase:'),
            choices: [
              { name: 'discover', message: `${chalk.yellow('📋 Discover')}  - Plan experiments, research ICP, & competitive intel` },
              { name: 'generate', message: `${chalk.green('🎯 Generate')}  - Launch the core autonomous loop to test ideas` },
              { name: 'validate', message: `${chalk.blue('🔮 Validate')}  - Expert predictions, stress-tests, & debates` },
              { name: 'analyze',  message: `${chalk.magenta('📊 Analyze')}   - Inspect past performance & debug drops` },
              { name: 'fix',      message: `${chalk.red('🔨 Fix')}       - Fix issues & run brand safety audits` },
              { name: 'ship',     message: `${chalk.cyan('🚀 Ship')}      - Format final assets & build deployment briefs` },
              { name: 'back',     message: `${chalk.gray('← Back to main menu')}` },
            ]
          });

          if (arPhase === 'back') {
            break;
          }

          if (arPhase === 'discover') {
            const res = await enquirer.prompt<{ opt: string }>({
              type: 'select',
              name: 'opt',
              message: chalk.bold('📋 Discover Options:'),
              choices: [
                { name: 'ar-plan',    message: `${chalk.cyan('📋')} Plan my experiment       - Figure out what to test & how to measure` },
                { name: 'ar-improve', message: `${chalk.cyan('🧠')} Research ICP & growth    - Find growth opportunities from ICP & market` },
                { name: 'ar-learn',   message: `${chalk.cyan('💡')} Learn from the market    - Competitive intel on pages & copy` },
                { name: 'back',       message: `${chalk.gray('← Back to phases')}` },
              ]
            });
            if (res.opt !== 'back') {
              arAction = res.opt;
              inArMenu = false;
            }
          } else if (arPhase === 'generate') {
            const res = await enquirer.prompt<{ opt: string }>({
              type: 'select',
              name: 'opt',
              message: chalk.bold('🎯 Generate Options:'),
              choices: [
                { name: 'ar-core',    message: `${chalk.cyan('🎯')} Generate new hypotheses  - Run core loop to generate & score ideas` },
                { name: 'back',       message: `${chalk.gray('← Back to phases')}` },
              ]
            });
            if (res.opt !== 'back') {
              arAction = res.opt;
              inArMenu = false;
            }
          } else if (arPhase === 'validate') {
            const res = await enquirer.prompt<{ opt: string }>({
              type: 'select',
              name: 'opt',
              message: chalk.bold('🔮 Validate Options:'),
              choices: [
                { name: 'ar-predict',  message: `${chalk.cyan('🔮')} Get expert predictions - 5 expert personas debate your idea` },
                { name: 'ar-probe',    message: `${chalk.cyan('🔍')} Stress-test my brief   - 8 personas stress-test your strategy` },
                { name: 'ar-reason',   message: `${chalk.cyan('⚖️')}  Debate a strategy call - Adversarial debate on key binary calls` },
                { name: 'ar-scenario', message: `${chalk.cyan('🎭')} Run what-if scenarios   - Stress-test plans against disruptions` },
                { name: 'back',        message: `${chalk.gray('← Back to phases')}` },
              ]
            });
            if (res.opt !== 'back') {
              arAction = res.opt;
              inArMenu = false;
            }
          } else if (arPhase === 'analyze') {
            const res = await enquirer.prompt<{ opt: string }>({
              type: 'select',
              name: 'opt',
              message: chalk.bold('📊 Analyze Options:'),
              choices: [
                { name: 'ar-evals',    message: `${chalk.cyan('📊')} Analyze past results    - Find trends & plateaus in experiment data` },
                { name: 'ar-debug',    message: `${chalk.cyan('🐛')} Debug underperformance  - Root cause diagnostic for drops` },
                { name: 'back',        message: `${chalk.gray('← Back to phases')}` },
              ]
            });
            if (res.opt !== 'back') {
              arAction = res.opt;
              inArMenu = false;
            }
          } else if (arPhase === 'fix') {
            const res = await enquirer.prompt<{ opt: string }>({
              type: 'select',
              name: 'opt',
              message: chalk.bold('🔨 Fix Options:'),
              choices: [
                { name: 'ar-fix',      message: `${chalk.cyan('🔨')} Fix issues one-by-one   - Crush character limits, pixel breaks` },
                { name: 'ar-security', message: `${chalk.cyan('🛡️')} Brand safety audit      - Reg (FTC/GDPR), trademark compliance` },
                { name: 'back',        message: `${chalk.gray('← Back to phases')}` },
              ]
            });
            if (res.opt !== 'back') {
              arAction = res.opt;
              inArMenu = false;
            }
          } else if (arPhase === 'ship') {
            const res = await enquirer.prompt<{ opt: string }>({
              type: 'select',
              name: 'opt',
              message: chalk.bold('🚀 Ship Options:'),
              choices: [
                { name: 'ar-ship',     message: `${chalk.cyan('🚀')} Prepare assets to ship  - Format for platforms & build deployment brief` },
                { name: 'back',        message: `${chalk.gray('← Back to phases')}` },
              ]
            });
            if (res.opt !== 'back') {
              arAction = res.opt;
              inArMenu = false;
            }
          }
        }

        if (!arAction) {
          continue;
        }

        let triggerMsg = '';

        selectedArAction = arAction;
        if (arAction === 'ar-core') {
          let goal = '';
          let metric = '';
          let scope = '';
          let csvPath = '';

          const activeConfigPath = path.join(CONFIG_DIR, 'active-experiment.json');
          let useActive = false;

          if (fs.existsSync(activeConfigPath)) {
            try {
              const activeConfig = JSON.parse(fs.readFileSync(activeConfigPath, 'utf8'));
              console.log(chalk.cyan('\n  Found an active experiment plan:'));
              console.log(`  ${chalk.bold('Goal')}:   ${activeConfig.goal}`);
              console.log(`  ${chalk.bold('Metric')}: ${activeConfig.metric}`);
              console.log(`  ${chalk.bold('Scope')}:  ${activeConfig.scope || 'None'}`);
              if (activeConfig.csvPath) {
                console.log(`  ${chalk.bold('Data')}:   ${activeConfig.csvPath}`);
              }
              console.log('');

              const { confirmActive } = await enquirer.prompt<{ confirmActive: boolean }>({
                type: 'confirm',
                name: 'confirmActive',
                message: 'Would you like to run the autonomous loop on this active plan?',
                initial: true
              });

              if (confirmActive) {
                useActive = true;
                goal = activeConfig.goal;
                metric = activeConfig.metric;
                scope = activeConfig.scope || '';
                csvPath = activeConfig.csvPath || '';
              }
            } catch (e) {}
          }

          if (!useActive) {
            console.log(chalk.cyan('\n  Let\'s configure your Autoresearch loop:'));
            
            const answers = await enquirer.prompt<{ goal: string; metric: string; scope: string; csvPath: string }>([
              {
                type: 'input',
                name: 'goal',
                message: 'What is your experiment Goal? (e.g., Optimize landing page conversion rate)',
                validate: (val) => val.trim() ? true : 'Goal cannot be empty.'
              },
              {
                type: 'input',
                name: 'metric',
                message: 'What is your primary Metric? (e.g., CVR, CTR, ROAS)',
                validate: (val) => val.trim() ? true : 'Metric cannot be empty.'
              },
              {
                type: 'input',
                name: 'scope',
                message: 'Any Scope constraints? (e.g., No discounts, premium tone - optional)',
                initial: ''
              },
              {
                type: 'input',
                name: 'csvPath',
                message: 'Path to prior experiment CSV/data file (optional - press Enter to skip)',
                initial: '',
                validate: (val) => {
                  if (!val.trim()) return true;
                  const resolved = val.startsWith('~') ? val.replace('~', os.homedir()) : path.resolve(val);
                  if (fs.existsSync(resolved)) return true;

                  // Smart check standard folders
                  const baseName = path.basename(resolved);
                  const standardDirs = [
                    path.join(os.homedir(), 'Desktop'),
                    path.join(os.homedir(), 'Downloads'),
                    path.join(os.homedir(), 'Documents')
                  ];
                  for (const dir of standardDirs) {
                    if (fs.existsSync(path.join(dir, baseName))) return true;
                  }

                  return `File not found at: ${resolved}. Please check the path.`;
                }
              }
            ]);

            goal = answers.goal;
            metric = answers.metric;
            scope = answers.scope || '';
            
            let rawPath = answers.csvPath ? answers.csvPath.trim() : '';
            if (rawPath) {
              let resolved = rawPath.startsWith('~') ? rawPath.replace('~', os.homedir()) : path.resolve(rawPath);
              if (fs.existsSync(resolved)) {
                csvPath = resolved;
              } else {
                // Resolve from standard directories
                const baseName = path.basename(resolved);
                const standardDirs = [
                  path.join(os.homedir(), 'Desktop'),
                  path.join(os.homedir(), 'Downloads'),
                  path.join(os.homedir(), 'Documents')
                ];
                let found = false;
                for (const dir of standardDirs) {
                  const checkPath = path.join(dir, baseName);
                  if (fs.existsSync(checkPath)) {
                    csvPath = checkPath;
                    console.log(chalk.cyan(`\n  💡 Smart-resolved file name to standard directory:`));
                    console.log(`     ${chalk.green(csvPath)}\n`);
                    found = true;
                    break;
                  }
                }
                if (!found) csvPath = resolved;
              }
            } else {
              csvPath = '';
            }

            // Save the config to disk
            fs.writeFileSync(activeConfigPath, JSON.stringify({ goal, metric, scope, csvPath }, null, 2));
          }

          // Concise trigger — system prompt + skill file have the full instructions.
          // Short user message = more output tokens for the model to use.
          triggerMsg = `Run 3 Autoresearch cycles. Goal: ${goal}. Metric: ${metric}.`;
          if (scope) triggerMsg += ` Scope: ${scope}.`;
          if (csvPath) triggerMsg += ` Read the prior data CSV at ${csvPath} first, extract patterns, then generate new hypotheses.`;
          else triggerMsg += ` No prior data — generate hypotheses from scratch using product context.`;
        } else {
          const arTriggerMap: Record<string, string> = {
            'ar-plan':     'Help me plan a marketing experiment with Autoresearch.',
            'ar-improve':  'Research my ICP and find growth opportunities with Autoresearch.',
            'ar-learn':    'Analyze my competitors and market positioning with Autoresearch.',
            'ar-predict':  'Assemble 5 marketing expert personas to evaluate my hypothesis with Autoresearch.',
            'ar-probe':    'Have 8 marketing personas stress-test my campaign brief with Autoresearch.',
            'ar-reason':   'Run an adversarial debate on this marketing strategy decision with Autoresearch.',
            'ar-scenario': 'Generate what-if scenarios for my marketing plan with Autoresearch.',
            'ar-evals':    'Analyze my past marketing experiment results with Autoresearch.',
            'ar-debug':    'Debug why my marketing campaign is underperforming with Autoresearch.',
            'ar-fix':      'Fix these known marketing asset issues one-by-one with Autoresearch.',
            'ar-security': 'Run a brand safety and compliance audit on my marketing assets with Autoresearch.',
            'ar-ship':     'Prepare my winning marketing assets for deployment with Autoresearch.',
          };
          triggerMsg = arTriggerMap[arAction] || '';
        }

        finalArgs = [triggerMsg];
        selectedAction = 'autoresearch';
      } else {
        const actionMap: Record<string, string[]> = {
          chat:         [],
          copy:         ['Help me generate high-performing ad copy for my campaigns.'],
          gtm:          ['Help me build a comprehensive Go-To-Market strategy for my product.'],
        };
        finalArgs = actionMap[action] || [];
        selectedAction = action;
      }
      break;
    }
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
  const isLocal = !!config.localBaseUrl;
  const modelIdForPi = isLocal && cleanProvider.includes('/') ? cleanProvider.split('/')[1] : cleanProvider;
  piArgsRaw.push('--model', modelIdForPi);

  // System prompt flag
  const systemPromptPath = path.join(CONFIG_DIR, 'agent', 'SYSTEM.md');
  piArgsRaw.push('--system-prompt', systemPromptPath);

  // Skills directories — selective loading based on action
  const skillsDir = path.join(pkgDir, 'skills');
  const templatesDir = path.join(pkgDir, 'templates');

  // Inject product context as a skill directory
  const contextDir = injectProductContext(config);

  // Load only the skills relevant to the selected action (saves ~8K tokens for local models)
  const relevantSkills = getRelevantSkills(selectedAction, selectedArAction, skillsDir);
  const skillArgs: string[] = [];
  for (const skill of relevantSkills) {
    skillArgs.push('--skill', skill);
  }

  const piArgs = [
    ...piArgsRaw,
    ...skillArgs,
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
    env.OPENAI_API_KEY = env.OPENAI_API_KEY || 'sk-local-ai-key-placeholder';
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

  // System prompt — mode-aware: lean for autoresearch, full for everything else
  const promptMode: PromptMode = (selectedAction === 'autoresearch') ? 'autoresearch' : 'default';
  const systemPrompt = buildSystemPrompt(config, promptMode, { arAction: selectedArAction });
  settings.systemPrompt = systemPrompt;
  fs.writeFileSync(systemPromptPath, systemPrompt);

  // Resilient retry settings for free-tier rate limits
  settings.retry = {
    maxAttempts: 10,
    baseDelayMs: 15000,
    provider: { maxRetryDelayMs: 120000 }
  };

  // Load custom MCP Extension to register Google Ads & Meta Ads tools
  const mcpExtensionPath = path.resolve(pkgDir, 'dist', 'mcp-extension.js');
  settings.extensions = settings.extensions || [];
  if (!settings.extensions.includes(mcpExtensionPath)) {
    settings.extensions.push(mcpExtensionPath);
  }

  // Clean up legacy built-in mcpServers block if present to prevent config clutter
  if (settings.mcpServers) {
    delete settings.mcpServers;
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  // ─── Write models.json for Local AI ─────────────────────────────
  const modelsPath = path.join(agentDir, 'models.json');
  if (isLocal) {
    const modelsConfig = {
      providers: {
        "local-ai": {
          baseUrl: config.localBaseUrl,
          api: "openai-completions",
          apiKey: "local-key-placeholder",
          compat: {
            supportsDeveloperRole: false,
            supportsReasoningEffort: false,
            supportsUsageInStreaming: false,
            requiresToolResultName: true,
            maxTokensField: "max_tokens"
          },
          models: [
            {
              id: modelIdForPi,
              name: `${modelIdForPi} (Local)`,
              reasoning: false,
              contextWindow: 128000,
              maxTokens: 8192
            }
          ]
        }
      }
    };
    fs.writeFileSync(modelsPath, JSON.stringify(modelsConfig, null, 2));
  } else {
    // If not local, remove custom models.json to avoid conflicts
    if (fs.existsSync(modelsPath)) {
      try { fs.unlinkSync(modelsPath); } catch (e) {}
    }
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
