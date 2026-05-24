import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgDir = path.resolve(__dirname, '..');

function findPiPkgDir() {
  // Candidate 1: Nested under openads-ai/node_modules
  const nestedPath = path.resolve(pkgDir, 'node_modules', '@earendil-works', 'pi-coding-agent');
  if (fs.existsSync(nestedPath)) return nestedPath;

  // Candidate 2: Hoisted node_modules (climbing up)
  let currentDir = pkgDir;
  while (currentDir !== path.dirname(currentDir)) {
    const parentNodeModules = path.resolve(currentDir, '..', 'node_modules', '@earendil-works', 'pi-coding-agent');
    if (fs.existsSync(parentNodeModules)) return parentNodeModules;
    currentDir = path.dirname(currentDir);
  }
  return null;
}

const piPkgDir = findPiPkgDir();
if (!piPkgDir) {
  console.log('OpenAds: @earendil-works/pi-coding-agent not found. Skipping white-label patch.');
  process.exit(0);
}

const piPkgPath = path.join(piPkgDir, 'package.json');
try {
  const piPkg = JSON.parse(fs.readFileSync(piPkgPath, 'utf8'));
  piPkg.piConfig = { name: 'openads', configDir: '.openads' };
  fs.writeFileSync(piPkgPath, JSON.stringify(piPkg, null, 2));
  console.log('OpenAds: Successfully patched pi-coding-agent for branding!');
} catch (e) {
  console.error('OpenAds: Failed to patch branding on pi-coding-agent package.json:', e.message);
}
