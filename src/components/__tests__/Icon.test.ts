import IONICONS from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

import { SF_SYMBOLS } from '../Icon';

// Node built-in, typed narrowly: the app's tsconfig deliberately has no Node types.
const fs: {
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: 'utf8'): string;
  statSync(path: string): { isDirectory(): boolean };
} = require('fs'); // eslint-disable-line @typescript-eslint/no-require-imports

const PATTERNS = [/<Icon name="([a-z-]+)"/g, /icon=["{]'?([a-z-]+)'?["}]/g, /\b(?:icon|on|off): '([a-z-]+)'/g, /(?:name|icon)=\{[^}]*\? '([a-z-]+)' : '([a-z-]+)'\}/g];

/** Ionicons names written literally in the app's source (icon props, tab icons, conditional icons). */
function iconNamesInSource(dir: string, found = new Set<string>()): Set<string> {
  for (const entry of fs.readdirSync(dir)) {
    const path = `${dir}/${entry}`;
    if (fs.statSync(path).isDirectory()) {
      if (entry !== '__tests__') {
        iconNamesInSource(path, found);
      }
    } else if (/\.tsx?$/.test(entry)) {
      const source = fs.readFileSync(path, 'utf8');
      for (const pattern of PATTERNS) {
        for (const match of source.matchAll(pattern)) {
          for (const name of match.slice(1)) {
            if (name && name in IONICONS) {
              found.add(name);
            }
          }
        }
      }
    }
  }
  return found;
}

describe('SF Symbols mapping', () => {
  it('maps every icon the app uses, so iOS never mixes icon families', () => {
    const used = [...iconNamesInSource('src')];
    const unmapped = used.filter((name) => !(name in SF_SYMBOLS));
    expect(used.length).toBeGreaterThan(20);
    expect(unmapped).toEqual([]);
  });
});
