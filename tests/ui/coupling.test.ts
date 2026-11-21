// The package stays free of app data: nothing leaves the repo, no app words in the source.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('../../src', import.meta.url);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
}
const sources = files(root.pathname.replace(/^\/([A-Za-z]:)/, '$1')).map((path) => ({
  path,
  text: readFileSync(path, 'utf8'),
}));

describe('src coupling', () => {
  it('finds the sources', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it('imports only relative paths inside src and react packages', () => {
    for (const { path, text } of sources) {
      for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
        const spec = m[1] ?? '';
        if (spec.startsWith('.')) {
          // never climb out of src: at most as many `..` as the file is deep
          const depth = path.replace(/\\/g, '/').split('/src/')[1]?.split('/').length ?? 1;
          const ups = spec.split('/').filter((p) => p === '..').length;
          expect(ups, `${path}: ${spec}`).toBeLessThanOrEqual(depth - 1);
        } else {
          expect(['react', 'react-dom'], `${path}: ${spec}`).toContain(spec.split('/')[0]);
        }
      }
    }
  });

  it('contains no app words', () => {
    const forbidden = /tkd|trainer|kinder|halle|heute|mitglieder/i;
    for (const { path, text } of sources) {
      expect(forbidden.exec(text)?.[0], path).toBeUndefined();
    }
  });
});
