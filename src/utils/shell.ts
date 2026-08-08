import fs from 'fs';
import path from 'path';

export function fileExists(p: string): boolean {
  return fs.existsSync(p);
}

export function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function copyFile(src: string, dest: string): void {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

export function writeText(dest: string, content: string): void {
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, content, 'utf-8');
}

export function readText(p: string): string {
  return fs.readFileSync(p, 'utf-8');
}
