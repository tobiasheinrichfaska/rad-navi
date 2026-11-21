// tsc rewrites relative `.ts`/`.tsx` imports to `.js` in the emitted JavaScript, but not in the
// declaration files; consumers would then look for `./x.tsx` next to `x.d.ts`. Rewrite them here.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
let changed = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith('.d.ts')) {
      const before = readFileSync(path, 'utf8');
      const after = before.replace(
        /(from\s+|import\()(['"])(\.{1,2}\/[^'"]+)\.tsx?\2/g,
        '$1$2$3.js$2',
      );
      if (after !== before) {
        writeFileSync(path, after);
        changed++;
      }
    }
  }
}

walk(root);
console.log(`declarations rewritten: ${changed} files`);
