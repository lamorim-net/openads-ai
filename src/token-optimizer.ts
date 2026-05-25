import { spawnSync } from 'child_process';

/**
 * Checks if the Rust Token Killer (rtk) CLI binary is installed globally on the user's machine.
 */
export function hasGlobalRtk(): boolean {
  try {
    const result = spawnSync('rtk', ['--version'], { stdio: 'ignore' });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * TS-native token compression utility. Filters out progress bars, experimental warnings,
 * download lines, and redundant log noise from CLI processes to optimize AI context windows.
 */
export function optimizeTokenContext(text: string): string {
  if (!text) return '';

  // 1. Strip ANSI escape sequences (colors, text formatting, control characters)
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  let cleanText = text.replace(ansiRegex, '');

  // 2. Process line-by-line to strip installation/CLI environment noise
  const lines = cleanText.split('\n');
  const filteredLines = lines.filter(line => {
    const l = line.trim();
    if (!l) return true; // Keep spacing empty lines

    // Ignore Node, NPM, NPX, UV/UVX experimental warnings & logs
    if (l.startsWith('ExperimentalWarning:')) return false;
    if (l.startsWith('npm notice')) return false;
    if (l.startsWith('npm warn')) return false;
    if (l.startsWith('npm ERR!')) return false;
    if (l.includes('npx: installed')) return false;
    if (l.includes('npm install')) return false;
    if (l.includes('audited')) return false;
    if (l.includes('found 0 vulnerabilities')) return false;
    
    // Ignore package/tool downloader progress indicators
    if (l.includes('Retrieving')) return false;
    if (l.includes('Downloading')) return false;
    if (l.startsWith('Resolving')) return false;
    if (l.startsWith('Installed')) return false;
    if (l.includes('Warning:')) return false;

    // Ignore progress bar lines
    if (l.includes('[=====')) return false;
    if (l.includes('========>')) return false;

    return true;
  });

  return filteredLines.join('\n');
}
