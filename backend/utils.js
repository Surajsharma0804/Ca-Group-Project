import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileLocks = new Map();

export function withFileLock(filePath, operation) {
  const previous = fileLocks.get(filePath) || Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  fileLocks.set(filePath, next.finally(() => {
    if (fileLocks.get(filePath) === next) fileLocks.delete(filePath);
  }));
  return next;
}

export async function ensureJsonFile(filePath, initialValue, isValid = () => true) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!isValid(parsed)) throw new Error('Invalid JSON structure.');
  } catch {
    await fs.writeFile(filePath, JSON.stringify(initialValue, null, 2), 'utf8');
  }
}

export { crypto, __dirname };
