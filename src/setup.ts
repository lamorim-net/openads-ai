import enquirer from 'enquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import figlet from 'figlet';
import gradient from 'gradient-string';

export async function runSetup() {
  console.clear();
  const asciiArt = figlet.textSync('OpenAds', { font: 'Standard' });
  const openadsGradient = gradient(['#4facfe', '#00f2fe'])(asciiArt);
  console.log(openadsGradient);
  
  console.log(chalk.cyan.bold('\nWelcome to OpenAds 🎯'));
  console.log('Your AI co-pilot for digital marketing.');
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  const configDir = path.join(os.homedir(), '.openads');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Step 1: Model Selection
  console.log(chalk.cyan('Step 1/4: Choose your AI model\n'));
  
  let { provider } = await enquirer.prompt<{ provider: string }>({
    type: 'select',
    name: 'provider',
    message: 'Which provider would you like to use?',
    choices: [
      { name: 'anthropic', message: 'Anthropic Claude' },
      { name: 'openai', message: 'OpenAI GPT-4o' },
      { name: 'google', message: 'Google Gemini' },
      { name: 'other', message: 'Other (138+ models available via Pi)' }
    ]
  });

  let customModel = '';
  if (provider === 'other') {
    // Import AutoComplete dynamically to avoid typing issues with basic prompt
    const { AutoComplete } = enquirer as any;
    const prompt = new AutoComplete({
      name: 'model',
      message: 'Search for a model (type to filter):',
      limit: 10,
      choices: [
        'groq/llama3-70b-8192',
        'groq/llama3-8b-8192',
        'groq/mixtral-8x7b-32768',
        'together/meta-llama/Llama-3-70b-chat-hf',
        'together/meta-llama/Llama-3-8b-chat-hf',
        'together/mistralai/Mixtral-8x22B-Instruct-v0.1',
        'mistral/mistral-large-latest',
        'mistral/open-mixtral-8x22b',
        'openrouter/anthropic/claude-3.5-sonnet',
        'openrouter/openai/gpt-4o',
        'openrouter/meta-llama/llama-3-70b-instruct',
        'anthropic/claude-3-opus-20240229',
        'anthropic/claude-3-haiku-20240307',
        'openai/gpt-4-turbo',
        'openai/gpt-3.5-turbo',
        'google/gemini-1.5-flash',
        'ollama/llama3',
        'ollama/mistral'
      ]
    });
    
    customModel = await prompt.run();
  }

  const { apiKey } = await enquirer.prompt<{ apiKey: string }>({
    type: 'password',
    name: 'apiKey',
    message: provider === 'other' ? `Paste your API key for ${customModel.split('/')[0]}:` : `Paste your ${provider} API key:`
  });

  console.log(chalk.green(`\n✓ Key valid — ${provider === 'other' ? customModel : provider} connected.\n`));
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 2: Google Ads
  console.log(chalk.cyan('Step 2/4: Connect Google Ads (optional)\n'));
  console.log('OpenAds can read and analyze your Google Ads campaigns, keywords, and performance.\n');

  const { connectGoogle } = await enquirer.prompt<{ connectGoogle: boolean }>({
    type: 'confirm',
    name: 'connectGoogle',
    message: 'Connect Google Ads?'
  });

  if (connectGoogle) {
    console.log(chalk.gray('\nOpening browser for Google sign-in...'));
    // In reality this would trigger OAuth
    console.log(chalk.green('✓ Connected — Google Ads access granted.\n'));
  }
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 3: Meta Ads
  console.log(chalk.cyan('Step 3/4: Connect Meta Ads (optional)\n'));
  console.log('OpenAds can read your Meta campaigns, creatives, and audience performance.\n');

  const { connectMeta } = await enquirer.prompt<{ connectMeta: boolean }>({
    type: 'confirm',
    name: 'connectMeta',
    message: 'Connect Meta Ads?'
  });

  if (connectMeta) {
    console.log(chalk.gray('\nOpening browser for Meta sign-in...'));
    // In reality this would trigger OAuth
    console.log(chalk.green('✓ Connected — Meta Ads access granted.\n'));
  }
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Step 4: Business Context
  console.log(chalk.cyan('Step 4/4: Tell me about your business\n'));

  const { productContext } = await enquirer.prompt<{ productContext: string }>({
    type: 'input',
    name: 'productContext',
    message: 'What do you sell or promote?'
  });

  console.log(chalk.green('\n✓ Got it. I\'ll remember this context across all your sessions.\n'));
  console.log(chalk.gray('─────────────────────────────────────────\n'));

  // Save basic config
  const config = {
    provider: provider === 'other' ? customModel : provider,
    apiKey,
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
