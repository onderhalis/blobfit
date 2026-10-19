// Credentials come from the environment or a git-ignored `.env.local`. They are never printed.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const KEYS = ['WIRO_API_KEY', 'WIRO_API_SECRET', 'WIRO_BASE_URL', 'WIRO_BUDGET_CAP_USD'];

export function parseEnvFile(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export function loadConfig(root = process.cwd(), env = process.env) {
  const file = join(root, '.env.local');
  const fromFile = existsSync(file) ? parseEnvFile(readFileSync(file, 'utf8')) : {};
  const config = {};
  for (const key of KEYS) {
    config[key] = env[key] ?? fromFile[key];
  }
  return config;
}

/** Describes a credential without revealing it; only the API key shows its last 4 characters. */
export function describeSecret(value, { showTail = false } = {}) {
  if (!value) return 'NOT SET';
  return showTail ? `set (ends …${value.slice(-4)})` : 'set';
}
