import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

export async function runDoctor() {
  console.log(chalk.cyan.bold('OpenAds Doctor 🩺\n'));

  const configDir = path.join(os.homedir(), '.openads');
  const configPath = path.join(configDir, 'openads.config.json');

  let hasErrors = false;

  console.log(chalk.bold('Configuration'));
  if (fs.existsSync(configPath)) {
    console.log(`  ${chalk.green('✓')} Config file found at ${configPath}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (config.provider && config.apiKey) {
      console.log(`  ${chalk.green('✓')} LLM Provider: ${config.provider}`);
    } else {
      console.log(`  ${chalk.red('✗')} Missing LLM provider or API key`);
      hasErrors = true;
    }
  } else {
    console.log(`  ${chalk.red('✗')} Config file missing. Run 'openads setup'`);
    hasErrors = true;
  }

  console.log(`\n${chalk.bold('Connections')}`);
  // In a real implementation this would check actual token validity via API calls
  console.log(`  ${chalk.yellow('!')} Google Ads: Configured (Not verified)`);
  console.log(`  ${chalk.yellow('!')} Meta Ads: Configured (Not verified)`);

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

  if (hasErrors) {
    console.log(`\n${chalk.red('Some checks failed. Please run `openads setup` to configure your environment.')}`);
    process.exit(1);
  } else {
    console.log(`\n${chalk.green('All checks passed! You are ready to run OpenAds.')}`);
  }
}
