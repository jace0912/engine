import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Scans user-facing copy (content library + component text) for banned
// terminal/hopeless language and for treatment instructions.
const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..');

function readDir(dir: string, ext: RegExp): string {
  const full = join(srcDir, dir);
  return readdirSync(full)
    .filter((f) => ext.test(f))
    .map((f) => readFileSync(join(full, f), 'utf8'))
    .join('\n');
}

const userFacing = `${readDir('content', /\.ts$/)}\n${readDir('components', /\.tsx$/)}`.toLowerCase();

describe('User-facing copy stays calm and non-terminal', () => {
  it('contains no terminal or hopeless language', () => {
    const forbidden = [
      'trapped',
      'no way out',
      'hopeless',
      'nothing you can do',
      'stuck forever',
      'this is the end',
    ];
    for (const phrase of forbidden) expect(userFacing).not.toContain(phrase);
  });

  it('contains no treatment instructions', () => {
    const forbidden = ['medication', 'prescription', 'stop taking', 'start taking', 'dosage'];
    for (const phrase of forbidden) expect(userFacing).not.toContain(phrase);
  });
});
