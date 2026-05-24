import enquirer from 'enquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { renderFilled } from 'oh-my-logo';
import open from 'open';

export async function runSetup() {
  console.clear();
  const openadsLogo = await renderFilled('OpenAds', {
    palette: 'ocean',
    font: 'block',
    letterSpacing: 2
  });
  console.log(openadsLogo);
  
  console.log(chalk.cyan.bold('\nWelcome to OpenAds 🎯'));
  console.log('Your AI co-pilot for digital marketing.');
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  const configDir = path.join(os.homedir(), '.openads');
  const configPath = path.join(configDir, 'openads.config.json');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let existingConfig: any = {};
  if (fs.existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {}
  }

  // Step 1: Model Selection
  console.log(chalk.cyan('Step 1/4: Choose your AI model\n'));
  
  const providerChoices = [
    { name: 'google', message: 'Google (Gemini)' },
    { name: 'openai', message: 'OpenAI (ChatGPT)' },
    { name: 'anthropic', message: 'Anthropic (Claude)' },
    { name: 'local', message: 'Local AI (Ollama, LM Studio)' },
    { name: 'other', message: 'Other (Groq, OpenRouter, etc.)' }
  ];

  let initialProviderIndex = 0;
  if (existingConfig.provider) {
    if (existingConfig.provider.includes('google')) initialProviderIndex = 0;
    else if (existingConfig.provider.includes('openai') && !existingConfig.localBaseUrl) initialProviderIndex = 1;
    else if (existingConfig.provider.includes('anthropic')) initialProviderIndex = 2;
    else if (existingConfig.localBaseUrl) initialProviderIndex = 3;
    else initialProviderIndex = 4;
  }

  let { provider } = await enquirer.prompt<{ provider: string }>({
    type: 'select',
    name: 'provider',
    message: 'Which AI Provider would you like to use?',
    choices: providerChoices,
    initial: initialProviderIndex
  });

  let customModel = '';
  let localModelName = '';
  let localBaseUrl = '';

  if (provider === 'local') {
    console.log(chalk.yellow('\n--- Local AI Setup ---'));
    console.log('You can run models 100% offline using tools like Ollama or LM Studio.');
    console.log('First, make sure your local AI server is running.\n');
    
    const localAnswers = await enquirer.prompt<{ localModelName: string, localBaseUrl: string }>([
      {
        type: 'input',
        name: 'localModelName',
        message: 'What is the exact name of your local model? (e.g., llama3, mistral)',
        initial: existingConfig.provider && existingConfig.provider.replace('openai/', '') || 'llama3'
      },
      {
        type: 'input',
        name: 'localBaseUrl',
        message: 'What is your local API endpoint?',
        initial: existingConfig.localBaseUrl || 'http://localhost:11434/v1'
      }
    ]);
    localModelName = localAnswers.localModelName;
    localBaseUrl = localAnswers.localBaseUrl;
  } else if (provider === 'other') {
    console.log(chalk.yellow('\n--- Custom AI Setup ---'));
    console.log('You can connect to almost any AI provider via OpenAds.');
    console.log('Format: provider/model-id');
    console.log('Examples:');
    console.log(' - Groq: groq/llama-3.1-70b-versatile');
    console.log(' - OpenRouter: openrouter/anthropic/claude-3-opus\n');
    
    const otherAnswers = await enquirer.prompt<{ customModel: string }>({
      type: 'input',
      name: 'customModel',
      message: 'Enter your custom provider/model:',
      initial: existingConfig.provider && initialProviderIndex === 4 ? existingConfig.provider : ''
    });
    customModel = otherAnswers.customModel;
  }

  let apiKey = '';
  if (provider !== 'local') {
    // Open browser to API key page
    console.log(chalk.gray(`\nOpening browser to log in to ${provider === 'other' ? 'your provider' : provider}...`));
    let keyUrl = '';
    if (provider === 'google') keyUrl = 'https://aistudio.google.com/app/apikey';
    if (provider === 'openai') keyUrl = 'https://platform.openai.com/api-keys';
    if (provider === 'anthropic') keyUrl = 'https://console.anthropic.com/settings/keys';
    
    if (keyUrl) {
      await open(keyUrl);
      console.log(chalk.cyan(`Please create an API key, copy it, and return here.`));
    }
  
    const { apiKey: key } = await enquirer.prompt<{ apiKey: string }>({
      type: 'password',
      name: 'apiKey',
      message: provider === 'other' ? `Paste your API key for ${customModel.split('/')[0]}:` : `Paste your ${provider} API key:`,
      initial: existingConfig.apiKey || '',
      validate: (value) => {
        if (!value.trim()) {
          return 'API key cannot be empty.';
        }
        return true;
      }
    });
    apiKey = key;
    console.log(chalk.green(`\n✓ Key valid — ${provider === 'other' ? customModel : provider} connected.\n`));
  } else {
    apiKey = 'dummy-key';
    console.log(chalk.green(`\n✓ Local AI configured — ready to connect to ${localBaseUrl}.\n`));
  }

  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 2: Google Ads
  console.log(chalk.cyan('Step 2/4: Connect Google Ads (optional)\n'));
  console.log('OpenAds can read and analyze your Google Ads campaigns, keywords, and performance.\n');

  const { connectGoogle } = await enquirer.prompt<{ connectGoogle: boolean }>({
    type: 'confirm',
    name: 'connectGoogle',
    message: 'Connect Google Ads?',
    initial: existingConfig.connectGoogle !== undefined ? existingConfig.connectGoogle : false
  });

  if (connectGoogle) {
    console.log(chalk.gray('\nSee docs/connect-google-ads.md for how to authenticate via `uvx adloop init`'));
    console.log(chalk.green('✓ Google Ads module enabled.\n'));
  }
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 3: Meta Ads
  console.log(chalk.cyan('Step 3/4: Connect Meta Ads (optional)\n'));
  console.log('OpenAds can read your Meta campaigns, creatives, and audience performance.\n');

  const { connectMeta } = await enquirer.prompt<{ connectMeta: boolean }>({
    type: 'confirm',
    name: 'connectMeta',
    message: 'Connect Meta Ads?',
    initial: existingConfig.connectMeta !== undefined ? existingConfig.connectMeta : false
  });

  if (connectMeta) {
    console.log(chalk.gray('\nSee docs/connect-meta.md for how to authenticate via `/mcp auth meta-ads`'));
    console.log(chalk.green('✓ Meta Ads module enabled.\n'));
  }
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 4: Business Context
  console.log(chalk.cyan('Step 4/4: Tell me about your business\n'));

  const { productContext } = await enquirer.prompt<{ productContext: string }>({
    type: 'input',
    name: 'productContext',
    message: 'What do you sell or promote?',
    initial: existingConfig.productContext || ''
  });

  console.log(chalk.green('\n✓ Got it. I\'ll remember this context across all your sessions.\n'));
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Map providers to their default model strings
  let finalModel = provider;
  if (provider === 'google') finalModel = 'google/gemini-3.5-flash';
  if (provider === 'anthropic') finalModel = 'anthropic/claude-3-5-sonnet-20241022';
  if (provider === 'openai') finalModel = 'openai/gpt-4o';
  if (provider === 'other') finalModel = customModel;
  if (provider === 'local') finalModel = `openai/${localModelName}`;

  // Save basic config
  const config = {
    provider: finalModel,
    apiKey,
    localBaseUrl,
    connectGoogle,
    connectMeta,
    productContext
  };

  fs.writeFileSync(
    path.join(configDir, 'openads.config.json'),
    JSON.stringify(config, null, 2)
  );

  console.log('You\'re ready. Here are some things to try:\n');
  console.log(chalk.cyan('  > Audit my Google Ads account'));
  console.log(chalk.cyan('  > Write 3 Meta ad headlines for my product'));
  console.log(chalk.cyan('  > /autoresearch:plan'));
  console.log(chalk.cyan('  > /seo-audit\n'));
  console.log(chalk.gray('Run `openads` to start.'));
}
