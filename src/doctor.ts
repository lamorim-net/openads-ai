import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import gradient from 'gradient-string';

const openadsGradient = gradient(['#00d2ff', '#3a7bd5', '#00d2ff']);

export async function runDoctor() {
  console.log(openadsGradient('\n  OpenAds Doctor 🩺\n'));
  console.log(chalk.gray('  Running diagnostics...\n'));

  const configDir = path.join(os.homedir(), '.openads');
  const configPath = path.join(configDir, 'openads.config.json');

  let hasErrors = false;

  let config: any = null;

  console.log(chalk.bold('Configuration'));
  if (fs.existsSync(configPath)) {
    console.log(`  ${chalk.green('✓')} Config file found at ${configPath}`);
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.provider && config.apiKey) {
        console.log(`  ${chalk.green('✓')} LLM Provider: ${config.provider}`);
      } else {
        console.log(`  ${chalk.red('✗')} Missing LLM provider or API key`);
        hasErrors = true;
      }
    } catch (e) {
      console.log(`  ${chalk.red('✗')} Config file is malformed`);
      hasErrors = true;
    }
  } else {
    console.log(`  ${chalk.red('✗')} Config file missing. Run 'openads setup'`);
    hasErrors = true;
  }

  console.log(`\n${chalk.bold('Connections')}`);
  if (config) {
    // Google Ads Check
    if (config.connectGoogle) {
      const adloopTokenPath = path.join(os.homedir(), '.adloop', 'token.json');
      const adloopCredentialsPath = path.join(os.homedir(), '.adloop', 'credentials.json');
      if (fs.existsSync(adloopTokenPath)) {
        console.log(`  ${chalk.green('✓')} Google Ads: Connected (Authenticated at ~/.adloop/token.json)`);
      } else if (fs.existsSync(adloopCredentialsPath)) {
        console.log(`  ${chalk.yellow('!')} Google Ads: Configured (OAuth credentials present, token missing. Run 'uvx adloop init')`);
      } else {
        console.log(`  ${chalk.red('✗')} Google Ads: Configured but not authenticated (Run 'openads setup')`);
        hasErrors = true;
      }
    } else {
      console.log(`  ${chalk.gray('✗')} Google Ads: Not Connected`);
    }

    // Meta Ads Check
    if (config.metaToken) {
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${config.metaToken}`);
        const data: any = await res.json();
        if (res.ok && data.id) {
          console.log(`  ${chalk.green('✓')} Meta Ads: Connected (Token is active)`);
        } else {
          const errMsg = data.error?.message || 'Invalid Access Token';
          console.log(`  ${chalk.red('✗')} Meta Ads: Connection failed — ${errMsg}`);
          hasErrors = true;
        }
      } catch (e: any) {
        console.log(`  ${chalk.red('✗')} Meta Ads: Network error verifying token — ${e.message}`);
        hasErrors = true;
      }
    } else {
      console.log(`  ${chalk.gray('✗')} Meta Ads: Not Connected`);
    }
  } else {
    console.log(`  ${chalk.red('✗')} Google Ads: Cannot verify (missing configuration)`);
    console.log(`  ${chalk.red('✗')} Meta Ads: Cannot verify (missing configuration)`);
  }

  console.log(`\n${chalk.bold('Environment')}`);
  console.log(`  Node.js: ${process.version}`);
  console.log(`  OS: ${os.type()} ${os.release()}`);

  const uvxCheck = spawnSync('uvx', ['--version']);
  if (uvxCheck.status === 0) {
    console.log(`  ${chalk.green('✓')} uvx: Installed (Required for Google Ads)`);
  } else {
    console.log(`  ${chalk.red('✗')} uvx: Not installed. Run 'curl -LsSf https://astral.sh/uv/install.sh | sh'`);
    hasErrors = true;
  }

  // ─── Local AI Check ────────────────────────────────────────────────
  if (config?.localBaseUrl) {
    console.log(`\n${chalk.bold('Local AI')}`);
    const baseUrl = config.localBaseUrl.replace(/\/$/, '');

    // 1. Check if the endpoint is reachable
    try {
      const tagsUrl = `${baseUrl.replace('/v1', '')}/api/tags`;
      const res = await fetch(tagsUrl, { signal: AbortSignal.timeout(3000) });

      if (res.ok) {
        const data: any = await res.json();
        const models: string[] = (data.models || []).map((m: any) => m.name || m.model || '');
        console.log(`  ${chalk.green('✓')} Ollama server: Reachable at ${baseUrl}`);

        // 2. Check if the configured model is pulled
        const configuredModel = config.provider.includes('/')
          ? config.provider.split('/').pop()
          : config.provider;

        const modelFound = models.some(m =>
          m === configuredModel || m.startsWith(configuredModel.split(':')[0])
        );

        if (modelFound) {
          console.log(`  ${chalk.green('✓')} Model: ${chalk.cyan(configuredModel)} is available`);
        } else {
          console.log(`  ${chalk.red('✗')} Model: ${chalk.cyan(configuredModel)} not found in Ollama`);
          console.log(`     ${chalk.gray('Available models:')} ${models.length > 0 ? models.join(', ') : 'none'}`);
          console.log(`     ${chalk.gray(`Run: ollama pull ${configuredModel}`)}`);
          hasErrors = true;
        }
      } else {
        console.log(`  ${chalk.red('✗')} Ollama server: Not reachable at ${baseUrl}`);
        console.log(`     ${chalk.gray('Start Ollama with: ollama serve')}`);
        hasErrors = true;
      }
    } catch (e: any) {
      console.log(`  ${chalk.red('✗')} Ollama server: Connection failed — ${e.message}`);
      console.log(`     ${chalk.gray('Make sure Ollama is running: ollama serve')}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.log(`\n${chalk.red('Some checks failed. Please run `openads setup` to configure your environment.')}`);
    process.exit(1);
  } else {
    console.log(`\n${chalk.green('All checks passed! You are ready to run OpenAds.')}`);
  }
}

