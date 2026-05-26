import enquirer from 'enquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import gradient from 'gradient-string';
import open from 'open';
import { compileHtmlReport } from './report-template.js';
import { optimizeTokenContext } from './token-optimizer.js';

const openadsGradient = gradient(['#00d2ff', '#3a7bd5', '#00d2ff']);
const CONFIG_DIR = path.join(os.homedir(), '.openads');
const SCHEDULES_DIR = path.join(CONFIG_DIR, 'schedules');
const REPORTS_DIR = path.join(CONFIG_DIR, 'reports');

// ─── Schedule Presets ────────────────────────────────────────────────

interface SchedulePreset {
  name: string;
  label: string;
  prompt: string;
  cron: string;
  description: string;
}

const PRESETS: SchedulePreset[] = [
  {
    name: 'daily-health',
    label: '📊  Daily campaign health check',
    prompt: 'Run a health check on all my connected ad campaigns. Flag any anomalies: budget pacing issues, sudden CPA spikes, quality score drops, disapproved ads, or campaigns that spent more than 20% above/below their daily budget. Give me a concise summary with action items.',
    cron: '0 8 * * *',
    description: 'Every day at 8:00 AM',
  },
  {
    name: 'budget-pacing',
    label: '💸  Budget pacing alert (every 6 hours)',
    prompt: 'Check my ad campaign spend pacing against daily/monthly budgets. Flag any campaign that is on track to overspend by more than 15% or underspend by more than 25%. Include the current spend, projected spend, and budget for each flagged campaign.',
    cron: '0 */6 * * *',
    description: 'Every 6 hours',
  },
  {
    name: 'performance-drop',
    label: '📉  Performance drop alert (twice daily)',
    prompt: 'Compare my ad campaign performance (ROAS, CPA, CTR, conversion rate) for the last 24 hours against the 7-day average. Flag any metric that shifted more than 15% in either direction. For each flag, suggest a possible cause and a recommended action.',
    cron: '0 9,17 * * *',
    description: 'At 9:00 AM and 5:00 PM',
  },
  {
    name: 'weekly-report',
    label: '📋  Weekly performance report (Monday 9am)',
    prompt: 'Generate a comprehensive weekly performance report for all my connected ad campaigns. Include: total spend, ROAS, CPA, impressions, clicks, conversions, top 3 performing campaigns, bottom 3 performing campaigns, and 3 actionable recommendations for next week.',
    cron: '0 9 * * 1',
    description: 'Every Monday at 9:00 AM',
  },
];

// ─── Platform Detection ──────────────────────────────────────────────

function isMacOS(): boolean {
  return os.platform() === 'darwin';
}

// ─── Schedule File Management ────────────────────────────────────────

interface SavedSchedule {
  name: string;
  prompt: string;
  cron: string;
  description: string;
  createdAt: string;
}

function ensureDirs(): void {
  if (!fs.existsSync(SCHEDULES_DIR)) fs.mkdirSync(SCHEDULES_DIR, { recursive: true });
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function loadSchedules(): SavedSchedule[] {
  ensureDirs();
  const indexPath = path.join(SCHEDULES_DIR, 'schedules.json');
  if (!fs.existsSync(indexPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    return [];
  }
}

function saveSchedules(schedules: SavedSchedule[]): void {
  ensureDirs();
  fs.writeFileSync(
    path.join(SCHEDULES_DIR, 'schedules.json'),
    JSON.stringify(schedules, null, 2)
  );
}

// ─── macOS launchd ───────────────────────────────────────────────────

function cronToLaunchdCalendar(cron: string): any {
  const parts = cron.split(' ');
  const [minute, hour, day, _month, weekday] = parts;
  const cal: any = {};

  if (minute !== '*') {
    if (minute.startsWith('*/')) {
      cal.Minute = parseInt(minute.slice(2));
    } else {
      cal.Minute = parseInt(minute);
    }
  }
  if (hour !== '*') {
    if (hour.startsWith('*/')) {
      // launchd doesn't support */N for hours directly, use Interval instead
    } else if (hour.includes(',')) {
      // Multiple hours — return array of calendars
      return hour.split(',').map((h: string) => ({
        ...cal,
        Hour: parseInt(h),
        Minute: cal.Minute ?? 0,
      }));
    } else {
      cal.Hour = parseInt(hour);
    }
  }
  if (day !== '*') cal.Day = parseInt(day);
  if (weekday !== '*') cal.Weekday = parseInt(weekday);

  return cal;
}

function installLaunchd(schedule: SavedSchedule, openadsPath: string): boolean {
  const label = `com.openads.schedule.${schedule.name}`;
  const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`);

  const reportFile = path.join(REPORTS_DIR, `${schedule.name}-latest.md`);

  const calendar = cronToLaunchdCalendar(schedule.cron);
  const calendarEntries = Array.isArray(calendar) ? calendar : [calendar];

  // Check if */N hour pattern — use StartInterval instead
  const parts = schedule.cron.split(' ');
  const hourPart = parts[1];
  let useInterval = false;
  let intervalSeconds = 0;

  if (hourPart.startsWith('*/')) {
    useInterval = true;
    intervalSeconds = parseInt(hourPart.slice(2)) * 3600;
  }

  let schedulingXml: string;
  if (useInterval) {
    schedulingXml = `    <key>StartInterval</key>\n    <integer>${intervalSeconds}</integer>`;
  } else {
    const calXml = calendarEntries.map((cal: any) => {
      let entries = '';
      if (cal.Minute !== undefined) entries += `          <key>Minute</key>\n          <integer>${cal.Minute}</integer>\n`;
      if (cal.Hour !== undefined) entries += `          <key>Hour</key>\n          <integer>${cal.Hour}</integer>\n`;
      if (cal.Day !== undefined) entries += `          <key>Day</key>\n          <integer>${cal.Day}</integer>\n`;
      if (cal.Weekday !== undefined) entries += `          <key>Weekday</key>\n          <integer>${cal.Weekday}</integer>\n`;
      return `        <dict>\n${entries}        </dict>`;
    }).join('\n');
    schedulingXml = `    <key>StartCalendarInterval</key>\n    <array>\n${calXml}\n    </array>`;
  }

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${openadsPath}</string>
        <string>run-schedule</string>
        <string>${schedule.name}</string>
    </array>
${schedulingXml}
    <key>StandardOutPath</key>
    <string>${reportFile}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(REPORTS_DIR, `${schedule.name}-error.log`)}</string>
    <key>RunAtLoad</key>
    <false/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>
</dict>
</plist>`;

  const agentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir, { recursive: true });

  fs.writeFileSync(plistPath, plist);

  // Unload if already loaded, then load
  spawnSync('launchctl', ['bootout', `gui/${process.getuid!()}`, plistPath], { stdio: 'ignore' });
  const result = spawnSync('launchctl', ['bootstrap', `gui/${process.getuid!()}`, plistPath]);

  return result.status === 0;
}

function uninstallLaunchd(name: string): void {
  const label = `com.openads.schedule.${name}`;
  const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`);

  if (fs.existsSync(plistPath)) {
    spawnSync('launchctl', ['bootout', `gui/${process.getuid!()}`, plistPath], { stdio: 'ignore' });
    fs.unlinkSync(plistPath);
  }
}

// ─── Linux/Generic crontab ───────────────────────────────────────────

function installCrontab(schedule: SavedSchedule, openadsPath: string): boolean {
  const marker = `# openads:${schedule.name}`;
  const reportFile = path.join(REPORTS_DIR, `${schedule.name}-latest.md`);
  const cronLine = `${schedule.cron} ${openadsPath} run-schedule ${schedule.name} > ${reportFile} 2>&1 ${marker}`;

  // Read current crontab
  const current = spawnSync('crontab', ['-l'], { encoding: 'utf8' });
  let lines = (current.stdout || '').split('\n').filter((l: string) => !l.includes(marker));

  lines.push(cronLine);

  // Write back
  const result = spawnSync('crontab', ['-'], {
    input: lines.join('\n') + '\n',
    encoding: 'utf8',
  });

  return result.status === 0;
}

function uninstallCrontab(name: string): void {
  const marker = `# openads:${name}`;
  const current = spawnSync('crontab', ['-l'], { encoding: 'utf8' });
  const lines = (current.stdout || '').split('\n').filter((l: string) => !l.includes(marker));

  spawnSync('crontab', ['-'], {
    input: lines.join('\n') + '\n',
    encoding: 'utf8',
  });
}

// ─── Run a Scheduled Task ────────────────────────────────────────────
// Applies the same mode-aware prompt + selective skill loading as the main CLI
// so scheduled tasks work reliably on local models.

export async function runScheduledTask(name: string): Promise<void> {
  const schedules = loadSchedules();
  const schedule = schedules.find(s => s.name === name);
  if (!schedule) {
    console.error(`Schedule "${name}" not found.`);
    process.exit(1);
  }

  // Load config for API key and model
  const configPath = path.join(CONFIG_DIR, 'openads.config.json');
  if (!fs.existsSync(configPath)) {
    console.error('OpenAds is not configured. Run `openads setup` first.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Print header and accumulate markdown
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  let fullMarkdown = '';
  fullMarkdown += `# OpenAds Scheduled Report: ${schedule.name}\n`;
  fullMarkdown += `_Generated: ${now}_\n\n`;
  fullMarkdown += `**Prompt:** ${schedule.prompt}\n\n`;
  fullMarkdown += '---\n\n';

  console.log(fullMarkdown.trim() + '\n');

  // Find the pi CLI
  const pkgDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const piCliPath = path.resolve(pkgDir, 'node_modules', '@earendil-works', 'pi-coding-agent', 'dist', 'cli.js');

  // Build environment
  const env: any = { ...process.env, NODE_NO_WARNINGS: '1' };
  if (config.apiKey && config.apiKey !== 'dummy-key') {
    if (config.provider.startsWith('google/')) env.GOOGLE_API_KEY = config.apiKey;
    else if (config.provider.startsWith('openai/')) env.OPENAI_API_KEY = config.apiKey;
    else if (config.provider.startsWith('anthropic/')) env.ANTHROPIC_API_KEY = config.apiKey;
    else env.OPENAI_API_KEY = config.apiKey;
  }
  if (config.localBaseUrl) {
    env.OPENAI_BASE_URL = config.localBaseUrl;
    env.OPENAI_API_KEY = env.OPENAI_API_KEY || 'sk-local-ai-key-placeholder';
  }

  const isLocal = !!config.localBaseUrl;
  const cleanModel = config.provider;
  const modelIdForPi = isLocal && cleanModel.includes('/') ? cleanModel.split('/')[1] : cleanModel;

  const skillsDir = path.resolve(pkgDir, 'skills');
  const contextDir = path.join(CONFIG_DIR, 'context');

  // ─── Mode-aware system prompt ───────────────────────────────────────
  // Scheduled audit tasks use the 'default' prompt mode (they need MCP tools).
  // Write a temporary system prompt file for this run.
  const agentDir = path.join(CONFIG_DIR, 'agent');
  if (!fs.existsSync(agentDir)) fs.mkdirSync(agentDir, { recursive: true });

  const homeDir = os.homedir();
  const contextPath = path.join(CONFIG_DIR, 'context', 'my-business.md');
  const isLaunchMode = config.mode === 'launch';

  const scheduleSystemPrompt = [
    'You are OpenAds, an AI marketing assistant. You are running a scheduled automated task.',
    'Your job: execute the task concisely and produce a clean, structured markdown report.',
    'Use MCP tools to query live campaign data. Never use placeholder IDs.',
    '',
    '## Platform Tools',
    '- For Meta: call get_ad_accounts() first (no params), then list_campaigns(account_id), then get_campaign_performance or get_insights.',
    '- Anti-loop rule: never call the same tool twice in one turn.',
    '',
    '## Output Rules',
    '- Structure your output as a clean markdown report with headers, tables, and bullet points.',
    '- Flag issues clearly: 🔴 Critical | 🟡 Warning | 🟢 Opportunity.',
    '- End with a numbered list of recommended actions.',
    '',
    `## Safety`,
    `- Home directory: ${homeDir}. Never use placeholder paths.`,
    isLaunchMode
      ? '- Mode: Launch (Read-Write). Show a preview card and get Y/N before any write operation.'
      : '- Mode: Audit (Read-Only). You can only read and analyze — no writes.',
    '',
    `## Business Context`,
    fs.existsSync(contextPath)
      ? `Read your business context file at ${contextPath} before starting.`
      : 'No business context file found. Proceed with the task using available data.',
  ].join('\n');

  const scheduleSysPromptPath = path.join(agentDir, 'SCHEDULE-SYSTEM.md');
  fs.writeFileSync(scheduleSysPromptPath, scheduleSystemPrompt);

  // ─── Selective skill loading ────────────────────────────────────────
  // Scheduled tasks are audit-type by default → load only the 3 ad platform skills.
  // This saves ~7K tokens vs loading all 24 skills.
  const scheduleSkills = [
    path.join(skillsDir, 'ads', 'google-ads.md'),
    path.join(skillsDir, 'ads', 'meta-ads.md'),
    path.join(skillsDir, 'product-marketing.md'),
  ].filter(p => fs.existsSync(p));

  const skillArgs: string[] = [];
  for (const skill of scheduleSkills) {
    skillArgs.push('--skill', skill);
  }

  const args = [
    piCliPath,
    '--model', modelIdForPi,
    '--system-prompt', scheduleSysPromptPath,
    ...skillArgs,
    ...(fs.existsSync(contextDir) ? ['--skill', contextDir] : []),
    '--print',
    schedule.prompt,
  ];

  // Local models may be slow — give them up to 10 minutes
  const timeoutMs = isLocal ? 600000 : 300000;

  const result = spawnSync('node', args, {
    env,
    encoding: 'utf8',
    timeout: timeoutMs,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.stdout) {
    const cleanOutput = optimizeTokenContext(result.stdout);
    console.log(cleanOutput);
    fullMarkdown += cleanOutput;
  }
  if (result.stderr) {
    const cleanError = optimizeTokenContext(result.stderr);
    if (cleanError.trim()) {
      console.error(cleanError);
    }
  }

  // Compile and save the HTML report
  try {
    const reportHtmlFile = path.join(REPORTS_DIR, `${schedule.name}-latest.html`);
    const htmlContent = compileHtmlReport(schedule.name, fullMarkdown);
    fs.writeFileSync(reportHtmlFile, htmlContent, 'utf8');
  } catch (err: any) {
    console.error(`Failed to generate HTML report: ${err.message}`);
  }
}

// ─── Interactive Schedule Setup ──────────────────────────────────────

export async function runScheduleManager(subcommand?: string): Promise<void> {
  // Handle sub-commands
  if (subcommand === 'list') {
    return listSchedules();
  }
  if (subcommand === 'remove') {
    return removeSchedule();
  }

  console.log(openadsGradient('\n  OpenAds Scheduler ⏰\n'));
  console.log(chalk.gray('  Automate campaign checks, reports, and alerts.\n'));

  const presetChoices = PRESETS.map(p => ({
    name: p.name,
    message: `${p.label} ${chalk.gray(`(${p.description})`)}`,
  }));

  presetChoices.push({
    name: 'custom',
    message: `${chalk.cyan('⏰')}  Custom schedule (describe in plain English)`,
  });

  presetChoices.push({
    name: 'list',
    message: `${chalk.gray('📋')}  View active schedules`,
  });

  presetChoices.push({
    name: 'remove',
    message: `${chalk.gray('🗑️')}   Remove a schedule`,
  });

  presetChoices.push({
    name: 'view-reports',
    message: `${chalk.green('📊')}  View latest HTML reports in browser`,
  });

  const { action } = await enquirer.prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: chalk.bold('What would you like to automate?'),
    choices: presetChoices,
  });

  if (action === 'list') return listSchedules();
  if (action === 'remove') return removeSchedule();
  if (action === 'view-reports') return chooseAndOpenReport();

  let schedule: SavedSchedule;

  if (action === 'custom') {
    const answers = await enquirer.prompt<{ prompt: string; cron: string }>([
      {
        type: 'input',
        name: 'prompt',
        message: 'What should OpenAds check or report on?',
        validate: (v) => v.trim() ? true : 'Please describe what to automate.',
      },
      {
        type: 'select',
        name: 'cron',
        message: 'How often?',
        choices: [
          { name: '0 8 * * *', message: 'Every day at 8:00 AM' },
          { name: '0 */6 * * *', message: 'Every 6 hours' },
          { name: '0 9,17 * * *', message: 'Twice daily (9 AM & 5 PM)' },
          { name: '0 9 * * 1', message: 'Weekly (Monday 9 AM)' },
          { name: '0 9 1 * *', message: 'Monthly (1st at 9 AM)' },
        ],
      } as any,
    ]);

    const safeName = 'custom-' + Date.now();
    const cronDesc = {
      '0 8 * * *': 'Every day at 8:00 AM',
      '0 */6 * * *': 'Every 6 hours',
      '0 9,17 * * *': 'Twice daily (9 AM & 5 PM)',
      '0 9 * * 1': 'Weekly (Monday 9 AM)',
      '0 9 1 * *': 'Monthly (1st at 9 AM)',
    }[answers.cron] || answers.cron;

    schedule = {
      name: safeName,
      prompt: answers.prompt,
      cron: answers.cron,
      description: cronDesc,
      createdAt: new Date().toISOString(),
    };
  } else {
    const preset = PRESETS.find(p => p.name === action)!;
    schedule = {
      name: preset.name,
      prompt: preset.prompt,
      cron: preset.cron,
      description: preset.description,
      createdAt: new Date().toISOString(),
    };
  }

  // Find openads executable
  const openadsPath = process.argv[1];

  // Install the schedule
  console.log('');
  let installed = false;

  if (isMacOS()) {
    console.log(chalk.cyan('Installing schedule via macOS launchd...'));
    installed = installLaunchd(schedule, openadsPath);
  } else {
    console.log(chalk.cyan('Installing schedule via crontab...'));
    installed = installCrontab(schedule, openadsPath);
  }

  if (installed) {
    // Save to our index
    const schedules = loadSchedules().filter(s => s.name !== schedule.name);
    schedules.push(schedule);
    saveSchedules(schedules);

    console.log(chalk.green(`\n✓ Schedule "${schedule.name}" installed!`));
    console.log(chalk.gray(`  Frequency: ${schedule.description}`));
    console.log(chalk.gray(`  Reports saved to: ${REPORTS_DIR}`));
    console.log(chalk.gray(`\n  Manage with: openads schedule list | openads schedule remove\n`));
  } else {
    console.log(chalk.red('\n✗ Failed to install schedule. Check permissions and try again.\n'));
  }
}

// ─── List / Remove ───────────────────────────────────────────────────

function listSchedules(): void {
  const schedules = loadSchedules();

  if (schedules.length === 0) {
    console.log(chalk.yellow('\n  No active schedules. Run `openads schedule` to create one.\n'));
    return;
  }

  console.log(chalk.bold.cyan('\n  Active Schedules'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────\n'));

  for (const s of schedules) {
    console.log(`  ${chalk.cyan(s.name.padEnd(25))} ${chalk.white(s.description)}`);
    console.log(`  ${' '.repeat(25)} ${chalk.gray(s.prompt.slice(0, 80))}${s.prompt.length > 80 ? '...' : ''}`);
    console.log('');
  }

  console.log(chalk.gray(`  Reports saved to: ${REPORTS_DIR}\n`));
}

async function removeSchedule(): Promise<void> {
  const schedules = loadSchedules();

  if (schedules.length === 0) {
    console.log(chalk.yellow('\n  No active schedules to remove.\n'));
    return;
  }

  const choices = schedules.map(s => ({
    name: s.name,
    message: `${s.name} — ${s.description}`,
  }));

  const { name } = await enquirer.prompt<{ name: string }>({
    type: 'select',
    name: 'name',
    message: 'Which schedule do you want to remove?',
    choices,
  });

  // Uninstall from OS
  if (isMacOS()) {
    uninstallLaunchd(name);
  } else {
    uninstallCrontab(name);
  }

  // Remove from index
  const updated = schedules.filter(s => s.name !== name);
  saveSchedules(updated);

  console.log(chalk.green(`\n✓ Schedule "${name}" removed.\n`));
}

export async function openReportInBrowser(name: string): Promise<void> {
  const reportHtmlFile = path.join(REPORTS_DIR, `${name}-latest.html`);
  if (!fs.existsSync(reportHtmlFile)) {
    // If HTML doesn't exist but MD does, let's compile it on the fly!
    const reportMdFile = path.join(REPORTS_DIR, `${name}-latest.md`);
    if (fs.existsSync(reportMdFile)) {
      const mdContent = fs.readFileSync(reportMdFile, 'utf8');
      const htmlContent = compileHtmlReport(name, mdContent);
      fs.writeFileSync(reportHtmlFile, htmlContent, 'utf8');
    } else {
      console.error(chalk.red(`\n✗ Report for "${name}" not found. Run the schedule first or select another report.\n`));
      return;
    }
  }
  console.log(chalk.cyan(`\nOpening HTML report for "${name}" in your default browser...`));
  await open(reportHtmlFile);
}

async function chooseAndOpenReport(): Promise<void> {
  const schedules = loadSchedules();
  if (schedules.length === 0) {
    console.log(chalk.yellow('\n  No active schedules. Run `openads schedule` to create one.\n'));
    return;
  }

  // Find all schedules that have reports
  const choices = schedules.map(s => {
    const reportMdFile = path.join(REPORTS_DIR, `${s.name}-latest.md`);
    const hasReport = fs.existsSync(reportMdFile);
    return {
      name: s.name,
      message: `${s.name} ${chalk.gray(`(${s.description})`)} ${hasReport ? chalk.green('[Report Available]') : chalk.red('[No Report Yet]')}`,
      disabled: !hasReport,
    };
  });

  if (choices.every(c => c.disabled)) {
    console.log(chalk.yellow('\n  No reports have been generated yet. Please wait for schedules to run.\n'));
    return;
  }

  const { name } = await enquirer.prompt<{ name: string }>({
    type: 'select',
    name: 'name',
    message: 'Select a report to open:',
    choices: choices.filter(c => !c.disabled),
  });

  await openReportInBrowser(name);
}

export function listReports(): void {
  ensureDirs();
  const files = fs.readdirSync(REPORTS_DIR);
  const reports = files.filter(f => f.endsWith('-latest.md'));

  if (reports.length === 0) {
    console.log(chalk.yellow('\n  No reports found in your reports directory. Please wait for schedules to run.\n'));
    return;
  }

  console.log(chalk.bold.cyan('\n  Generated Reports'));
  console.log(chalk.gray('  ──────────────────────────────────────────────────────────────────────────'));

  for (const file of reports) {
    const filePath = path.join(REPORTS_DIR, file);
    const stats = fs.statSync(filePath);
    const name = file.replace('-latest.md', '');
    const date = stats.mtime.toISOString().slice(0, 19).replace('T', ' ');
    const sizeKb = (stats.size / 1024).toFixed(1);
    
    // Check if HTML version exists
    const htmlExists = fs.existsSync(path.join(REPORTS_DIR, `${name}-latest.html`));
    const formatSupport = htmlExists ? chalk.green('MD + HTML') : chalk.yellow('MD Only');

    console.log(`  ${chalk.cyan(name.padEnd(25))} ${chalk.white(`${sizeKb} KB`)}   ${chalk.gray(date)}   ${formatSupport}`);
  }
  console.log(chalk.gray(`\n  Reports saved to: ${REPORTS_DIR}`));
  console.log(chalk.gray(`  To view a report in your browser, run: ${chalk.white('openads report [name]')}\n`));
}
