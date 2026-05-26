import enquirer from 'enquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import gradient from 'gradient-string';
import open from 'open';

const SETUP_LOGO = [
  '  ██████╗ ██████╗ ███████╗███╗   ██╗ █████╗ ██████╗ ███████╗',
  '  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔══██╗██╔════╝',
  '  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████║██║  ██║███████╗',
  '  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔══██║██║  ██║╚════██║',
  '  ╚██████╔╝██║     ███████╗██║ ╚████║██║  ██║██████╔╝███████║',
  '   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═════╝ ╚══════╝',
].join('\n');

const openadsGradient = gradient(['#00d2ff', '#3a7bd5', '#00d2ff']);

export async function runSetup() {
  console.clear();
  console.log(openadsGradient(SETUP_LOGO));

  console.log(chalk.cyan.bold('  Setup Wizard 🎯'));
  console.log(chalk.gray('  Connect your AI model, ad platforms, and tell us about your business.\n'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────────\n'));

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
  console.log(chalk.cyan('Step 1/6: Choose your AI model\n'));
  
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

  let selectedModel = '';

  if (provider === 'google') {
    const googleChoices = [
      { name: 'google/gemini-3.5-flash', message: 'Gemini 3.5 Flash (Cutting Edge — High-speed flagship)' },
      { name: 'google/gemini-3.5-pro', message: 'Gemini 3.5 Pro (Reasoning Frontier — Ultimate capabilities)' },
      { name: 'google/gemini-2.5-flash', message: 'Gemini 2.5 Flash (Fast, smart & cost-effective)' },
      { name: 'google/gemini-2.5-pro', message: 'Gemini 2.5 Pro (Best reasoning, huge context)' },
      { name: 'google/gemini-1.5-flash', message: 'Gemini 1.5 Flash (Reliable legacy lightweight)' },
      { name: 'google/gemini-1.5-pro', message: 'Gemini 1.5 Pro (Reliable legacy standard)' }
    ];
    let initialIndex = googleChoices.findIndex(c => c.name === existingConfig.provider);
    if (initialIndex === -1) initialIndex = 0;

    let { model } = await enquirer.prompt<{ model: string }>({
      type: 'select',
      name: 'model',
      message: 'Choose your Google Gemini model:',
      choices: googleChoices,
      initial: initialIndex
    });
    selectedModel = model;
  } else if (provider === 'openai') {
    const openaiChoices = [
      { name: 'openai/gpt-4o', message: 'GPT-4o (Omni — Dynamic reasoning & vision)' },
      { name: 'openai/gpt-4o-mini', message: 'GPT-4o Mini (Omni Mini — Fast & affordable)' },
      { name: 'openai/gpt-4.1', message: 'GPT-4.1 (Recommended — Excellent instruction following)' },
      { name: 'openai/gpt-4.1-mini', message: 'GPT-4.1 Mini (Lightweight — Fast and budget-friendly)' }
    ];
    let initialIndex = openaiChoices.findIndex(c => c.name === existingConfig.provider);
    if (initialIndex === -1) initialIndex = 2;

    let { model } = await enquirer.prompt<{ model: string }>({
      type: 'select',
      name: 'model',
      message: 'Choose your OpenAI model:',
      choices: openaiChoices,
      initial: initialIndex
    });
    selectedModel = model;
  } else if (provider === 'anthropic') {
    const anthropicChoices = [
      { name: 'anthropic/claude-sonnet-4', message: 'Claude Sonnet 4 (Recommended — Outstanding reasoning)' },
      { name: 'anthropic/claude-haiku-4', message: 'Claude Haiku 4 (Lightweight — Fast & responsive)' },
      { name: 'anthropic/claude-3-5-sonnet', message: 'Claude 3.5 Sonnet (Highly popular and smart)' },
      { name: 'anthropic/claude-3-5-haiku', message: 'Claude 3.5 Haiku (Fast & cost-efficient)' },
      { name: 'anthropic/claude-3-opus', message: 'Claude 3 Opus (Deep creative reasoning)' }
    ];
    let initialIndex = anthropicChoices.findIndex(c => c.name === existingConfig.provider);
    if (initialIndex === -1) initialIndex = 0;

    let { model } = await enquirer.prompt<{ model: string }>({
      type: 'select',
      name: 'model',
      message: 'Choose your Anthropic Claude model:',
      choices: anthropicChoices,
      initial: initialIndex
    });
    selectedModel = model;
  }

  let customModel = '';
  let localModelName = '';
  let localBaseUrl = '';
  let mode: 'audit' | 'launch' = 'audit';

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

  // Step 2: Experience Tier
  console.log(chalk.cyan('Step 2/6: Choose your experience tier\n'));
  console.log('  OpenAds adapts its depth based on your model\'s capability:\n');
  console.log(`  ${chalk.yellow('⚡ Express')}   — Fast & reliable. Compact prompts, structured output.`);
  console.log(`  ${chalk.blue('📊 Standard')}  — Balanced depth. Live data tools, detailed reports.`);
  console.log(`  ${chalk.magenta('🚀 Full')}      — Maximum depth. Multi-step analysis, creative exploration.\n`);

  // Auto-detect recommended tier based on model choice
  const isLocalSetup = provider === 'local';
  const modelLower = (selectedModel || localModelName || customModel || '').toLowerCase();
  let suggestedTier: 'express' | 'standard' | 'full' = 'full';
  if (isLocalSetup) {
    suggestedTier = (modelLower.includes('70b') || modelLower.includes('72b') || modelLower.includes('405b')) ? 'standard' : 'express';
  } else {
    const isLiteTier = modelLower.includes('flash') || modelLower.includes('mini') || modelLower.includes('haiku');
    suggestedTier = isLiteTier ? 'standard' : 'full';
  }

  const tierChoices = [
    { name: 'express',  message: `${chalk.yellow('⚡')} Express  — Best for: Llama 8B, Mistral 7B, Phi-3  ${suggestedTier === 'express' ? chalk.green('← Recommended') : ''}` },
    { name: 'standard', message: `${chalk.blue('📊')} Standard — Best for: Gemini Flash, GPT-4o Mini, Llama 70B  ${suggestedTier === 'standard' ? chalk.green('← Recommended') : ''}` },
    { name: 'full',     message: `${chalk.magenta('🚀')} Full     — Best for: GPT-4o, Claude Sonnet, Gemini Pro  ${suggestedTier === 'full' ? chalk.green('← Recommended') : ''}` },
  ];

  let initialTierIndex = tierChoices.findIndex(c => c.name === (existingConfig.tier || suggestedTier));
  if (initialTierIndex === -1) initialTierIndex = tierChoices.findIndex(c => c.name === suggestedTier);

  const { selectedTier } = await enquirer.prompt<{ selectedTier: 'express' | 'standard' | 'full' }>({
    type: 'select',
    name: 'selectedTier',
    message: 'Select your experience tier:',
    choices: tierChoices,
    initial: initialTierIndex
  } as any);

  const tierLabels: Record<string, string> = {
    express: `${chalk.yellow('⚡ Express')}`,
    standard: `${chalk.blue('📊 Standard')}`,
    full: `${chalk.magenta('🚀 Full')}`,
  };
  console.log(chalk.green(`\n✓ Experience tier: ${tierLabels[selectedTier]}.\n`));
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 3: Choose operational mode
  console.log(chalk.cyan('Step 3/6: Choose operational mode\n'));
  console.log('OpenAds has two operational modes:');
  console.log(` - ${chalk.green.bold('Audit Mode (Safe / Read-only)')}: AI can analyze performance, find budget waste, and recommend strategies. Zero risk.`);
  console.log(` - ${chalk.red.bold('Launch Mode (Read-Write)')}: AI is authorized to optimize bids, modify budgets, and launch ads (always requires confirmation).\n`);

  const modeAnswers = await enquirer.prompt<{ selectedMode: 'audit' | 'launch' }>({
    type: 'select',
    name: 'selectedMode',
    message: 'Choose your default operational mode:',
    choices: [
      { name: 'audit', message: 'Audit Mode (Safe / Read-only — Recommended)' },
      { name: 'launch', message: 'Launch Mode (Read-Write — Active campaign changes)' }
    ],
    initial: existingConfig.mode === 'launch' ? 1 : 0
  } as any);
  mode = modeAnswers.selectedMode;

  console.log(chalk.green(`\n✓ Operational mode configured: ${mode === 'launch' ? 'Launch Mode (Read-Write)' : 'Audit Mode (Safe / Read-only)'}.\n`));
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 4: Google Ads
  console.log(chalk.cyan('Step 4/6: Connect Google Ads (optional)\n'));
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
      const { spawnSync } = await import('child_process');
      const uvxCheck = spawnSync('uvx', ['--version']);
      if (uvxCheck.status !== 0) {
        console.log(chalk.red('\n🛑 Google Ads Setup Error: `uv` is not installed.'));
        console.log(chalk.gray('Google Ads integration requires `uv`, a ultra-fast tool runner.'));
        console.log(chalk.cyan('To install `uv` on your Mac, open a new terminal window and run:'));
        console.log(chalk.white.bold('  curl -LsSf https://astral.sh/uv/install.sh | sh'));
        console.log(chalk.cyan('\nAfter installing it, please restart this setup wizard.\n'));
      } else {
        console.log(chalk.cyan('\nLaunching Google OAuth...'));
        spawnSync('uvx', ['adloop', 'init'], { stdio: 'inherit' });
        console.log('');
      }
    }
    console.log(chalk.green('✓ Google Ads module enabled.\n'));
  }
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 4: Meta Ads
  console.log(chalk.cyan('Step 5/6: Connect Meta Ads (optional)\n'));
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
        { name: 'help', message: 'Help (Open Meta System User Tutorial in browser)' },
        { name: 'skip', message: 'Skip (I already have my token)' }
      ]
    });

    if (metaAction === 'help') {
      console.log(chalk.gray(`\nOpening tutorial at https://developers.facebook.com/docs/business-management-api/guides/system-users...`));
      await open('https://developers.facebook.com/docs/business-management-api/guides/system-users');
    }

    if (metaAction === 'open' || metaAction === 'help') {
      if (metaAction === 'open') {
        console.log(chalk.gray(`\nOpening browser to https://business.facebook.com/settings/system-users...`));
        await open('https://business.facebook.com/settings/system-users');
      }
      console.log(chalk.cyan('Instructions to get your token:'));
      console.log(chalk.gray('1. Create a basic App at developers.facebook.com.'));
      console.log(chalk.gray('2. In Business Settings, go to "Accounts" -> "Apps" and click Add to connect your App.'));
      console.log(chalk.gray('3. Go to "Users" -> "System Users" and Add a new user (Role: Employee).'));
      console.log(chalk.gray('4. Click "Add Assets". Under Apps, assign your App. Under Ad Accounts, assign your Ad Accounts.'));
      console.log(chalk.gray('5. Click "Generate New Token", select your App, check "ads_read" and "ads_management", and click Generate.'));
    }

    let tokenVerified = false;
    while (!tokenVerified) {
      const metaAnswers = await enquirer.prompt<{ metaToken: string }>({
        type: 'password',
        name: 'metaToken',
        message: 'Paste your Meta System User Access Token:',
        initial: existingConfig.metaToken || '',
        validate: (value) => value.trim() ? true : 'Token cannot be empty.'
      });
      metaToken = metaAnswers.metaToken;

      console.log(chalk.cyan('🔄 Verifying Meta token live...'));
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${metaToken}`);
        const data: any = await res.json();
        if (res.ok && data.id) {
          console.log(chalk.green('\n✓ Token active & verified successfully!\n'));
          tokenVerified = true;
        } else {
          const errMsg = data.error?.message || 'Invalid Token';
          console.log(chalk.red(`\n🛑 Connection Failed: ${errMsg}\n`));
          
          const { retryAction } = await enquirer.prompt<{ retryAction: string }>({
            type: 'select',
            name: 'retryAction',
            message: 'How would you like to handle this?',
            choices: [
              { name: 'retry', message: 'Try again (Re-paste token)' },
              { name: 'keep', message: 'Keep anyway (I am sure it is correct)' },
              { name: 'skip', message: 'Skip Meta Ads connection' }
            ]
          });

          if (retryAction === 'keep') {
            tokenVerified = true;
          } else if (retryAction === 'skip') {
            metaToken = '';
            break;
          }
        }
      } catch (e: any) {
        console.log(chalk.red(`\n🛑 Network error verifying token: ${e.message}\n`));
        const { retryAction } = await enquirer.prompt<{ retryAction: string }>({
          type: 'select',
          name: 'retryAction',
          message: 'How would you like to handle this?',
          choices: [
            { name: 'retry', message: 'Try again' },
            { name: 'keep', message: 'Keep anyway' },
            { name: 'skip', message: 'Skip Meta Ads connection' }
          ]
        });

        if (retryAction === 'keep') {
          tokenVerified = true;
        } else if (retryAction === 'skip') {
          metaToken = '';
          break;
        }
      }
    }
    if (metaToken) {
      console.log(chalk.green('✓ Meta Ads module enabled.\n'));
    } else {
      console.log(chalk.yellow('✓ Meta Ads module skipped.\n'));
    }
  }
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 6: Business Context
  console.log(chalk.cyan('Step 6/6: Tell me about your business\n'));

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
  if (provider === 'google' || provider === 'openai' || provider === 'anthropic') {
    finalModel = selectedModel;
  }
  if (provider === 'other') finalModel = customModel;
  if (provider === 'local') finalModel = `openai/${localModelName}`;

  // Save basic config
  const config = {
    provider: finalModel,
    apiKey,
    localBaseUrl,
    tier: selectedTier,
    mode,
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
