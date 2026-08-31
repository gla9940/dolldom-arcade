import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST_DIRECTORY = path.resolve('dist');
const LIMITS = {
  '.js': 80 * 1024,
  '.css': 40 * 1024,
  '.jpg': 350 * 1024,
  '.png': 150 * 1024,
};

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(entryPath) : entryPath;
    }),
  );
  return nestedFiles.flat();
}

const files = await collectFiles(DIST_DIRECTORY);
const oversizedFiles = [];

for (const file of files) {
  const extension = path.extname(file).toLowerCase();
  const limit = LIMITS[extension];
  if (!limit) continue;

  const { size } = await stat(file);
  if (size > limit) {
    oversizedFiles.push(`${path.relative(DIST_DIRECTORY, file)}: ${size} bytes (limit ${limit})`);
  }
}

if (oversizedFiles.length) {
  throw new Error(`번들 크기 제한을 초과했습니다.\n${oversizedFiles.join('\n')}`);
}

console.log(`Bundle budget passed for ${files.length} files.`);
