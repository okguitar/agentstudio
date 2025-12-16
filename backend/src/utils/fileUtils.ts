import fs from 'fs/promises';

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}
