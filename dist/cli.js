#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import chalk from 'chalk';
import boxen from 'boxen';
import { renderFilled } from 'oh-my-logo';
import { runSetup } from './setup.js';
import { runDoctor } from './doctor.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgDir = path.resolve(__dirname, '..');
async function main() {
    const args = process.argv.slice(2);
    // Command routing
    if (args[0] === 'setup') {
        await runSetup();
        return;
    }
    if (args[0] === 'doctor') {
        await runDoctor();
        return;
    }
    // Splash Screen
    console.clear();
    const openadsLogo = await renderFilled('OpenAds', {
        palette: 'ocean',
        font: 'block',
        letterSpacing: 2
    });
    // Read config to build dynamic status panel
    const configDir = path.join(os.homedir(), '.openads');
    const configPath = path.join(configDir, 'openads.config.json');
    let modelName = 'Not Configured';
    let googleStatus = chalk.gray('✗ Not Connected');
    let metaStatus = chalk.gray('✗ Not Connected');
    let providerArg = '';
    let apiKeyArg = '';
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.provider) {
                modelName = chalk.cyan(config.provider);
                providerArg = `--model ${config.provider}`;
            }
            if (config.apiKey) {
                apiKeyArg = `--api-key ${config.apiKey}`;
            }
            if (config.connectGoogle) {
                googleStatus = chalk.green('✓ Connected');
            }
            if (config.connectMeta) {
                metaStatus = chalk.green('✓ Connected');
            }
        }
        catch (e) {
            // ignore
        }
    }
    const statusPanel = `
  ${chalk.bold('Model')}     ${modelName}
  ${chalk.bold('Google')}    ${googleStatus}
  ${chalk.bold('Meta')}      ${metaStatus}
  ${chalk.bold('Skills')}    product · ads · copy · autoresearch
  `;
    const boxContent = `
  ${chalk.cyan('OpenAds v0.1.0')}  ${chalk.gray('AI for marketers')}
${chalk.gray('───────────────────────────────────────────────')}
${statusPanel}`;
    console.log(boxen(boxContent, {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
    }));
    console.log('  Type your question or /help for commands\n');
    // Build pi arguments dynamically from config
    let piArgsRaw = [];
    if (providerArg)
        piArgsRaw.push(...providerArg.split(' '));
    if (apiKeyArg)
        piArgsRaw.push(...apiKeyArg.split(' '));
    const skillsDir = path.join(pkgDir, 'skills');
    const templatesDir = path.join(pkgDir, 'templates');
    const piArgs = [
        ...piArgsRaw,
        '--skill', skillsDir,
        '--prompt-template', templatesDir,
        ...args
    ];
    const env = {
        ...process.env,
        NODE_NO_WARNINGS: '1'
    };
    // --- WHITE-LABEL PATCH ---
    // 1. Force Pi to adopt OpenAds branding and directory
    const piPkgPath = path.resolve(pkgDir, 'node_modules', '@earendil-works', 'pi-coding-agent', 'package.json');
    if (fs.existsSync(piPkgPath)) {
        try {
            const piPkg = JSON.parse(fs.readFileSync(piPkgPath, 'utf8'));
            if (!piPkg.piConfig || piPkg.piConfig.name !== 'openads') {
                piPkg.piConfig = { name: 'openads', configDir: '.openads' };
                fs.writeFileSync(piPkgPath, JSON.stringify(piPkg, null, 2));
            }
        }
        catch (e) { }
    }
    // 2. Silence Pi's default startup banner entirely
    const agentDir = path.join(os.homedir(), '.openads', 'agent');
    if (!fs.existsSync(agentDir)) {
        fs.mkdirSync(agentDir, { recursive: true });
    }
    const settingsPath = path.join(agentDir, 'settings.json');
    let settings = {};
    if (fs.existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        catch (e) { }
    }
    if (!settings.quietStartup) {
        settings.quietStartup = true;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }
    // --- END WHITE-LABEL PATCH ---
    const child = spawn('npx', ['pi', ...piArgs], {
        stdio: 'inherit',
        env
    });
    child.on('exit', (code) => {
        process.exit(code || 0);
    });
}
main().catch((err) => {
    console.error(chalk.red('Error:'), err);
    process.exit(1);
});
