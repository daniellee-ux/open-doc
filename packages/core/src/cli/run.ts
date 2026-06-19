import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as viteBuild, createServer, preview as vitePreview } from 'vite';
import { createViteConfig } from '../vite/config';

export async function dev(): Promise<void> {
  const config = await createViteConfig({ userCwd: process.cwd(), command: 'serve' });
  const server = await createServer(config);
  await server.listen();
  server.printUrls();
}

export async function build(): Promise<void> {
  const config = await createViteConfig({ userCwd: process.cwd(), command: 'build' });
  await viteBuild(config);
}

export async function preview(): Promise<void> {
  const config = await createViteConfig({ userCwd: process.cwd(), command: 'build' });
  const server = await vitePreview(config);
  server.printUrls();
}

/** Copy the bundled agent skills into the workspace's .claude/skills/. */
export async function sync(): Promise<void> {
  const skillsSrc = fileURLToPath(new URL('../../skills', import.meta.url));
  if (!existsSync(skillsSrc)) {
    console.error('No skills bundled with @opendoc/core.');
    return;
  }
  const dest = path.join(process.cwd(), '.claude', 'skills');
  mkdirSync(dest, { recursive: true });
  const names = readdirSync(skillsSrc).filter((n) => !n.startsWith('.'));
  for (const name of names) {
    cpSync(path.join(skillsSrc, name), path.join(dest, name), { recursive: true });
  }
  console.log(`Synced ${names.length} skills → .claude/skills/ (${names.join(', ')})`);
}
