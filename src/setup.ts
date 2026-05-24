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
    let keyUrl = '';
    if (provider === 'google') keyUrl = 'https://aistudio.google.com/app/apikey';
    if (provider === 'openai') keyUrl = 'https://platform.openai.com/api-keys';
    if (provider === 'anthropic') keyUrl = 'https://console.anthropic.com/settings/keys';

    if (keyUrl) {
      const { keyAction } = await enquirer.prompt<{ keyAction: string }>({
        type: 'select',
        name: 'keyAction',
        message: 'How would you like to get your API key?',
        choices: [
          { name: 'open', message: `Ready (Open ${provider} in browser)` },
          { name: 'skip', message: 'Skip (I already have my key)' }
        ]
      });

      if (keyAction === 'open') {
        console.log(chalk.gray(`\nOpening browser to ${keyUrl}...`));
        await open(keyUrl);
        console.log(chalk.cyan('Instructions:'));
        console.log(chalk.gray('1. Log in or create an account'));
        console.log(chalk.gray('2. Generate a new API key'));
        console.log(chalk.gray('3. Copy the key and return here\n'));
      }
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
    console.log(chalk.gray('\nTo connect Google Ads, we need to run the adloop authenticator.'));
    
    const { googleAction } = await enquirer.prompt<{ googleAction: string }>({
      type: 'select',
      name: 'googleAction',
      message: 'How would you like to proceed?',
      choices: [
        { name: 'run', message: 'Ready (Run Google Ads OAuth)' },
        { name: 'skip', message: 'Skip (I am already authenticated)' }
      ]
    });

    if (googleAction === 'run') {
      console.log(chalk.cyan('\nLaunching Google OAuth...'));
      const { spawnSync } = await import('child_process');
      spawnSync('uvx', ['adloop', 'init'], { stdio: 'inherit' });
      console.log('');
    }
    console.log(chalk.green('✓ Google Ads module enabled.\n'));
  }
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 3: Meta Ads
  console.log(chalk.cyan('Step 3/4: Connect Meta Ads (optional)\n'));
  console.log('OpenAds can read your Meta campaigns, creatives, and audience performance.\n');

  let metaToken = '';
  const { connectMeta } = await enquirer.prompt<{ connectMeta: boolean }>({
    type: 'confirm',
    name: 'connectMeta',
    message: 'Connect Meta Ads?',
    initial: existingConfig.metaToken ? true : false
  });

  if (connectMeta) {
    console.log(chalk.gray('\nTo connect Meta, you need a System User Access Token.'));
    
    const { metaAction } = await enquirer.prompt<{ metaAction: string }>({
      type: 'select',
      name: 'metaAction',
      message: 'How would you like to proceed?',
      choices: [
        { name: 'open', message: 'Ready (Open Meta Business Settings in browser)' },
        { name: 'skip', message: 'Skip (I already have my token)' }
      ]
    });

    if (metaAction === 'open') {
      console.log(chalk.gray(`\nOpening browser to https://business.facebook.com/settings/system-users...`));
      await open('https://business.facebook.com/settings/system-users');
      console.log(chalk.cyan('Instructions to get your token:'));
      console.log(chalk.gray('1. In the browser, click "Add" to create a new System User (Role: Employee).'));
      console.log(chalk.gray('2. Click "Add Assets", select your Ad Accounts, and grant "Manage Campaigns" permission.'));
      console.log(chalk.gray('3. Click the "Generate New Token" button.'));
      console.log(chalk.gray('4. Check the boxes for "ads_read" and "ads_management" permissions.'));
      console.log(chalk.gray('5. Click Generate, copy the long token string, and paste it below.\n'));
    }

    const metaAnswers = await enquirer.prompt<{ metaToken: string }>({
      type: 'password',
      name: 'metaToken',
      message: 'Paste your Meta System User Access Token:',
      initial: existingConfig.metaToken || '',
      validate: (value) => value.trim() ? true : 'Token cannot be empty.'
    });
    metaToken = metaAnswers.metaToken;
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
    metaToken,
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
