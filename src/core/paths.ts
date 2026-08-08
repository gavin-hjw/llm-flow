import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Package root (llm-flow repo / installed package) */
export function packageRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

/** Vendored @tobilu/qmd package directory */
export function vendorQmdPkgDir(): string {
  return path.join(packageRoot(), 'vendor', 'qmd', 'node_modules', '@tobilu', 'qmd');
}

/** Path to vendored qmd CLI entry (prefer dist to avoid bin re-spawn of `node`) */
export function vendorQmdBin(): string {
  const dist = path.join(vendorQmdPkgDir(), 'dist', 'cli', 'qmd.js');
  if (fs.existsSync(dist)) return dist;
  return path.join(vendorQmdPkgDir(), 'bin', 'qmd');
}

export function vendorModelsDir(): string {
  return path.join(packageRoot(), 'vendor', 'models');
}

export function hasVendoredQmd(): boolean {
  return fs.existsSync(vendorQmdBin());
}

export function vendorBunBin(): string | null {
  const root = packageRoot();
  const plat = process.platform;
  const arch = process.arch;
  const candidates: string[] = [];
  if (plat === 'win32' && arch === 'x64') candidates.push(path.join(root, 'vendor', 'bun', 'win-x64', 'bun.exe'));
  if (plat === 'win32' && arch === 'arm64') candidates.push(path.join(root, 'vendor', 'bun', 'win-arm64', 'bun.exe'));
  if (plat === 'darwin' && arch === 'arm64') candidates.push(path.join(root, 'vendor', 'bun', 'darwin-aarch64', 'bun'));
  if (plat === 'darwin' && arch === 'x64') candidates.push(path.join(root, 'vendor', 'bun', 'darwin-x64', 'bun'));
  if (plat === 'linux' && arch === 'x64') candidates.push(path.join(root, 'vendor', 'bun', 'linux-x64', 'bun'));
  if (plat === 'linux' && arch === 'arm64') candidates.push(path.join(root, 'vendor', 'bun', 'linux-aarch64', 'bun'));
  return candidates.find((p) => fs.existsSync(p)) || null;
}

export function listVendorGgufModels(): string[] {
  const dir = vendorModelsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.gguf'));
}

/** ~/.cache/qmd/models — where qmd/node-llama-cpp looks for GGUF files */
export function userQmdModelsDir(): string {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(home, '.cache', 'qmd', 'models');
}
