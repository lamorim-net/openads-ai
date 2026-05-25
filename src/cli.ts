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

function buildSystemPrompt(config: any): string {
  const contextPath = path.join(CONFIG_DIR, 'context', 'my-business.md');
  const isLaunchMode = config.mode === 'launch';

  const parts = [
    'You are OpenAds, an AI marketing assistant built for digital marketers.',
    'You specialize in Google Ads, Meta Ads, copywriting, analytics, CRO, and go-to-market strategy.',
    'Always speak in plain marketing language. Never use developer jargon.',
    'Address the user as a marketing professional.',
    'When writing ad copy or recommendations, always reference the user\'s product context first.',
    '',
    '## Platform Integrations & Live Data Tools',
    '- You have direct, live access to Google Ads, Meta Ads, and Google Analytics 4 (GA4) via custom Model Context Protocol (MCP) server tools.',
    '- Whenever the user asks to check campaigns, review metrics, fetch performance data, or analyze active ads, you MUST use the corresponding MCP server tools to query the live platforms.',
    '- NEVER search the local file system, run grep/ripgrep, check Git logs, or read codebase files to search for ad campaign data. The active folder is just the application source code — it contains zero campaign metrics. Campaign data comes ONLY from querying your active MCP server tools.',
    '- To fetch Meta campaign data: ALWAYS call `get_ad_accounts()` first (takes no parameters) to retrieve the active account ID. Then call `list_campaigns(account_id)` to list campaigns and retrieve active campaign IDs. Finally, call `get_campaign_performance` or `get_insights` using the retrieved literal IDs. Never guess or omit `object_id` when calling performance tools, and NEVER use generic placeholder tokens like `<your_account_id>` or `act_YOUR_ACCOUNT_ID` under any circumstances.',
    '- You are a highly proactive, self-starting digital marketer. When the user asks to check campaigns, review metrics, or fetch performance reports, DO NOT stop at listing campaign names, and DO NOT ask for permission or prompt the user for campaign IDs. IMMEDIATELY proceed to query performance or insights (`get_campaign_performance` or `get_insights`) for the discovered active campaign IDs. Deliver a beautiful marketing summary with structured key metrics (spend, impressions, CTR, ROAS, conversions) proactively and instantly rather than hesitating or asking redundant confirmation questions.',
    '- ANTI-LOOP SAFETY RULE: Once a tool (like `get_ad_accounts`) successfully returns its data, NEVER call it again in the same turn. Proceed immediately to the next logical step (e.g. calling `list_campaigns` or `get_campaign_performance`). If you repeat the exact same tool call consecutively, your connection will be flagged. Always move forward and progress through the tool chain.',
  ];

  parts.push(
    '',
    '## Safety and Desktop Search Rules',
    '- NEVER claim the user "specifically mentioned" a platform (like Meta or Google) unless they literally wrote the name of the platform in their chat message. If a platform is connected in your setup but they did not name it, state clearly: "I see that you have Meta Ads connected in your setup, so..." instead of claiming they mentioned it.',
    '- NEVER execute system-wide search commands starting from root (like `find / ...` or `grep -r ... /`). Running searches from root is extremely slow and dangerous. If the user mentions a file on their desktop but the folder path is unclear, ALWAYS use `list_dir` to inspect `~/Desktop` first, or ask the user for the exact folder name. Never run root `find` commands under any circumstances.',
    ''
  );

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
    '## Autonomous Marketing Loops (Autoresearch)',
    '- The PURPOSE of Autoresearch is to generate NEW, actionable, testable hypotheses. The deliverable is ALWAYS a prioritized list of what to test NEXT — concrete headlines, landing page variants, creative hooks, ad copy alternatives, layout changes, CTA experiments, or email subject lines. It is NOT a summary or review of past results.',
    '- Prior experiment data (CSVs, campaign logs, past A/B test results) is FUEL for the loop — not the output. When the user provides prior data, ingest it quickly, extract the top 3-5 winning patterns and losing patterns, and immediately use those learnings to generate smarter new hypotheses. Spend at most 2-3 sentences summarizing old results before pivoting to new recommendations.',
    '- CONCISE DATA INGESTION: When analyzing prior data, NEVER list individual experiments one-by-one. Aggregate behind the scenes, extract key patterns (e.g. "Video hero sections drove 3.4% CVR vs 1.9% for static images", "Mega-menu navigation correlated with 3.9% CVR"), and pivot immediately to generating new testable hypotheses informed by those patterns.',
    '- The autonomous loop follows Karpathy\'s autoresearch methodology — Goal + Metric + Iterate: Generate (Create new testable assets — concrete headlines, page layouts, creative hooks, copy variants) ➡️ Score (Evaluate each against prior learnings, marketing frameworks, CRO best practices, and the user\'s product context) ➡️ Keep / Discard (Keep only those scoring above threshold; document why others failed) ➡️ Iterate (Refine survivors, generate new variations inspired by winners, repeat until you have a polished final set of recommendations).',
    '- Keep the user updated on each cycle with a concise progress log (e.g. "Loop 1: Generated 10 headline hypotheses. 3 passed, 7 discarded. (Reason: too generic, no pain point)" and "Loop 2: Generated 8. 5 passed. ...").',
    '- End by presenting a beautifully structured final table of the NEW hypotheses to test, each with: the concrete asset/copy, the rationale (why it should win based on prior data patterns), and a priority score.',
    '- AUTOMATIC FILE EXPORT: At the end of the loop, you MUST automatically save the final prioritized list of new testable hypotheses to `autoresearch-[timestamp].md` inside `~/.openads/reports/`.',
    ''
  );
  parts.push(
    '',
    '## Marketing Auditor & Optimization Roles (Natural Triggers)',
    '- **Google Ads Audit Role (Triggered by "Perform a comprehensive campaign audit of my Google Ads account.")**: You are the Google Ads Auditor. Verify if Google Ads MCP is connected. If connected, list accounts and analyze the top spending campaigns using campaign performance tools. If disconnected, ask the user to provide their campaign stats. Apply `google-ads.md` skill to evaluate keywords, match types, and bidding. Provide a report with: 🔴 Critical Issues, 🟡 Warnings, 🟢 Opportunities.',
    '- **Meta Ads Audit Role (Triggered by "Perform a comprehensive campaign audit of my Meta Ads account.")**: You are the Meta Ads Auditor. Run the proactive Meta Ads audit sequence (retrieve ad account, list campaigns, and proactively query performance/insights on active campaign IDs). Apply `meta-ads.md` skill to evaluate ABO vs CBO, creative hooks, and ad copy. Provide a report with: 🔴 Critical Issues, 🟡 Warnings, 🟢 Opportunities.',
    '- **Multi-Platform Audit Role (Triggered by "Perform a comprehensive multi-platform campaign audit of my connected ad accounts.")**: You are the Lead Growth Marketing Auditor. Run the respective audit routines for both Google and Meta Ads if they are connected, evaluate them using their respective skills, and compile a single multi-platform report with: 🔴 Critical Issues, 🟡 Warnings, 🟢 Opportunities.',
    '- **Ad Copywriter Role (Triggered by "Help me generate high-performing ad copy for my campaigns.")**: You are the Ad Copywriter. Read `product-marketing.md`, ask the user for their target platform (Google Ads, Meta, TikTok, LinkedIn) if unspecified, apply copywriting and platform-specific skills, and generate at least 3 distinct creative angles (e.g. Pain, Curiosity, Social Proof).',
    '- **Go-To-Market Strategist Role (Triggered by "Help me build a comprehensive Go-To-Market strategy for my product.")**: You are the Go-To-Market Strategist. Read `product-marketing.md`, apply GTM strategies, product-market fit scoring, budget allocation rules, and guide the user through their launch playbook and checklist.',
    '',
    '## Autoresearch Command Roles',
    '- **Core Loop (Triggered by "Launch the Autoresearch core loop to generate new testable marketing hypotheses.")**: Read `autoresearch.md` skill. Generate NEW testable hypotheses (headlines, copy, pages, hooks) using Goal + Metric + Loop. Prior data is fuel. Run at least 3 autonomous cycles: Generate ➡️ Score ➡️ Keep/Discard ➡️ Iterate. Output cycle logs, final table, and auto-save to `~/.openads/reports/`.',
    '- **Plan (Triggered by "Help me plan a marketing experiment with Autoresearch.")**: Read `autoresearch-plan.md` skill. Walk the user through Goal → Metric → Scope → Prior Data interactively. Output a validated experiment config ready to run. If the user provides a CSV, ingest it as fuel, extract patterns, and pre-fill the config. End with "Would you like me to start the autonomous loop now? (Y/N)".',
    '- **Improve (Triggered by "Research my ICP and find growth opportunities with Autoresearch.")**: Read `autoresearch-improve.md` skill. Research ICP pain points, competitor gaps, market trends, channel opportunities, and revenue growth angles. Generate prioritized campaign briefs / PRDs. 15 iterations.',
    '- **Learn (Triggered by "Analyze my competitors and market positioning with Autoresearch.")**: Read `autoresearch-learn.md` skill. Competitive intelligence: scout competitor pages/ads/positioning, generate knowledge docs, identify gaps and opportunities. 10 iterations.',
    '- **Predict (Triggered by "Assemble 5 marketing expert personas to evaluate my hypothesis with Autoresearch.")**: Read `autoresearch-predict.md` skill. 5 expert personas (CMO, Performance Marketer, Brand Strategist, CRO Specialist, Data Analyst) debate the user\'s hypothesis. Output consensus score and go/no-go recommendation. One-shot.',
    '- **Probe (Triggered by "Have 8 marketing personas stress-test my campaign brief with Autoresearch.")**: Read `autoresearch-probe.md` skill. 8 personas (Media Buyer, Creative Director, Data Analyst, Brand Manager, UX Designer, Compliance Officer, CFO, Target Customer) interrogate the brief for blind spots. 15 iterations.',
    '- **Reason (Triggered by "Run an adversarial debate on this marketing strategy decision with Autoresearch.")**: Read `autoresearch-reason.md` skill. Two sides argue, blind judges score. For hard calls like broad vs niche, video vs static, discount vs value. 8 iterations.',
    '- **Scenario (Triggered by "Generate what-if scenarios for my marketing plan with Autoresearch.")**: Read `autoresearch-scenario.md` skill. Edge cases across 12 marketing dimensions: competitor moves, algorithm changes, budget cuts, creative fatigue, seasonality, etc. 20 iterations.',
    '- **Evals (Triggered by "Analyze my past marketing experiment results with Autoresearch.")**: Read `autoresearch-evals.md` skill. Find trends, plateaus, winning/losing patterns in prior experiment data. Recommend next experiment. One-shot.',
    '- **Debug (Triggered by "Debug why my marketing campaign is underperforming with Autoresearch.")**: Read `autoresearch-debug.md` skill. Hypothesis-driven root cause analysis: creative fatigue, audience saturation, competitor entry, message-market misfit, tracking issues, etc. 15 iterations.',
    '- **Fix (Triggered by "Fix these known marketing asset issues one-by-one with Autoresearch.")**: Read `autoresearch-fix.md` skill. Systematically crush issues: character limits, compliance, broken tracking, accessibility, branding inconsistencies. 20 iterations.',
    '- **Security (Triggered by "Run a brand safety and compliance audit on my marketing assets with Autoresearch.")**: Read `autoresearch-security.md` skill. Trademark violations, regulatory compliance (FTC, GDPR), misleading claims, accessibility, brand consistency. 15 iterations. Report: 🔴 Critical, 🟡 Warning, 🟢 Opportunity.',
    '- **Ship (Triggered by "Prepare my winning marketing assets for deployment with Autoresearch.")**: Read `autoresearch-ship.md` skill. Format for platform specs, generate deployment brief, QA, recommend UTMs and measurement plan, suggest test duration and sample size. Linear phases. Save to `~/.openads/reports/`.'
  );
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

  parts.push(
    '',
    '## HIGH-PRIORITY INTEGRITY RULE',
    '- Even if Meta Ads or Google Ads are connected above, you must NEVER assume or state that the Autoresearch wizard is specifically for Meta Ads, Google Ads, or any single channel at startup. You must remain 100% general-purpose and platform-agnostic.',
    '- You must NEVER ask for budget, spending limits, daily caps, campaign status, or ad-account settings during Autoresearch setup. Autoresearch generates NEW testable hypotheses and ONLY requires: Goal (what new assets to generate), Metric (how to score them), Scope (constraints), and Prior Data (optional fuel).',
    '- THE DELIVERABLE IS ALWAYS NEW HYPOTHESES TO TEST — never a summary of old data. Prior data is fuel that informs what to generate next. When given a CSV, spend at most 2-3 sentences extracting patterns, then immediately pivot to drafting the plan for generating NEW testable assets. Draft the **Autoresearch Plan** and end with: "Would you like me to start the autonomous loop now? (Y/N)". NEVER stop at a data summary!',
    '- AUTONOMOUS LOOP EXECUTION: Once approved, execute at least 3 cycles autonomously in a SINGLE response. Each cycle: generate NEW concrete testable assets (headlines, page variants, hooks, copy) ➡️ score against the metric ➡️ keep winners, discard losers with reasons ➡️ iterate. Output cycle logs, final table of NEW hypotheses with rationale + priority score, and auto-save to `~/.openads/reports/autoresearch-[timestamp].md`.'
  );

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
        // ── Autoresearch Submenu ─────────────────────────────────
        console.log();
        const { arAction } = await enquirer.prompt<{ arAction: string }>({
          type: 'select',
          name: 'arAction',
          message: chalk.bold('🔬 Autoresearch — What do you want to do?'),
          choices: [
            // DISCOVER
            { name: 'ar-plan',     message: `${chalk.yellow('── DISCOVER ──────────────────────────')}` },
            { name: 'ar-plan',     message: `${chalk.cyan('📋')}  Plan my experiment              ${chalk.gray('Figure out what to test & how to measure')}` },
            { name: 'ar-improve',  message: `${chalk.cyan('🧠')}  Research ICP & growth            ${chalk.gray('Find opportunities from ICP, competitors, market')}` },
            { name: 'ar-learn',    message: `${chalk.cyan('💡')}  Learn from the market            ${chalk.gray('Competitive intel — analyze what others do')}` },
            // GENERATE
            { name: 'ar-core',     message: `${chalk.green('── GENERATE ──────────────────────────')}` },
            { name: 'ar-core',     message: `${chalk.cyan('🎯')}  Generate new hypotheses          ${chalk.gray('Create & iterate on headlines, copy, pages, hooks')}` },
            // VALIDATE
            { name: 'ar-predict',  message: `${chalk.blue('── VALIDATE ──────────────────────────')}` },
            { name: 'ar-predict',  message: `${chalk.cyan('🔮')}  Get expert predictions           ${chalk.gray('5 marketing experts debate your idea')}` },
            { name: 'ar-probe',    message: `${chalk.cyan('🔍')}  Stress-test my brief             ${chalk.gray('8 personas interrogate your campaign plan')}` },
            { name: 'ar-reason',   message: `${chalk.cyan('⚖️')}   Debate a strategy call           ${chalk.gray('Adversarial debate: broad vs niche, video vs static')}` },
            { name: 'ar-scenario', message: `${chalk.cyan('🎭')}  Run what-if scenarios            ${chalk.gray('Competitor copies us? Algorithm changes? Budget cuts?')}` },
            // ANALYZE
            { name: 'ar-evals',    message: `${chalk.magenta('── ANALYZE ───────────────────────────')}` },
            { name: 'ar-evals',    message: `${chalk.cyan('📊')}  Analyze past results             ${chalk.gray('Trends, plateaus, patterns in experiment data')}` },
            { name: 'ar-debug',    message: `${chalk.cyan('🐛')}  Debug underperformance           ${chalk.gray('Why is this campaign/page/funnel failing?')}` },
            // FIX
            { name: 'ar-fix',      message: `${chalk.red('── FIX ───────────────────────────────')}` },
            { name: 'ar-fix',      message: `${chalk.cyan('🔨')}  Fix issues one-by-one            ${chalk.gray('Tracking, compliance, character limits, branding')}` },
            { name: 'ar-security', message: `${chalk.cyan('🛡️')}   Brand safety audit               ${chalk.gray('Trademark, regulatory, misleading claims')}` },
            // SHIP
            { name: 'ar-ship',     message: `${chalk.cyan('── SHIP ──────────────────────────────')}` },
            { name: 'ar-ship',     message: `${chalk.cyan('🚀')}  Prepare assets to ship           ${chalk.gray('Format for platform specs, deployment brief, QA')}` },
            // BACK
            { name: 'ar-back',     message: `${chalk.gray('←')}   Back to main menu` },
          ]
        });

        if (arAction === 'ar-back') {
          continue;
        }

        const arTriggerMap: Record<string, string> = {
          'ar-core':     'Launch the Autoresearch core loop to generate new testable marketing hypotheses.',
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
        finalArgs = [arTriggerMap[arAction] || ''];
      } else {
        const actionMap: Record<string, string[]> = {
          chat:         [],
          copy:         ['Help me generate high-performing ad copy for my campaigns.'],
          gtm:          ['Help me build a comprehensive Go-To-Market strategy for my product.'],
        };
        finalArgs = actionMap[action] || [];
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

  // System prompt — makes the agent behave as OpenAds
  const systemPrompt = buildSystemPrompt(config);
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
            supportsReasoningEffort: false
          },
          models: [
            {
              id: modelIdForPi,
              name: `${modelIdForPi} (Local)`
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
