import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guards the Phase 1 scope: no 3D, no AI/model calls, no forbidden libraries.
const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..');
const repoRoot = join(srcDir, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === '__tests__') return []; // do not scan the tests themselves
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(full) && !/\.test\.tsx?$/.test(full) ? [full] : [];
  });
}

const sourceFiles = walk(srcDir);
const corpus = sourceFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
const corpusLower = corpus.toLowerCase();

const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

// Phase 2 is Engine 1 sub-states only: the component set must not grow into
// later-phase surfaces.
const componentFiles = readdirSync(join(srcDir, 'components')).filter((f) => f.endsWith('.tsx'));
const ALLOWED_COMPONENTS = new Set([
  'ModeShell.tsx',
  'SafetyOverlay.tsx',
  'FirstCheckScreen.tsx',
  'SurvivalScreen.tsx',
  'ZCFMScreen.tsx',
  'ImmobileScreen.tsx',
  'WindowDetectionScreen.tsx',
  'RecoveryScreen.tsx',
]);

describe('Phase 1 scope guards', () => {
  it('declares no 3D or AI/model dependencies', () => {
    const forbidden = [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'openai',
      '@anthropic-ai/sdk',
      '@google/generative-ai',
      'cohere-ai',
      'langchain',
      'ollama',
      '@mistralai/mistralai',
    ];
    for (const dep of forbidden) expect(allDeps[dep]).toBeUndefined();
  });

  it('imports nothing from a 3D or AI module', () => {
    const badImport =
      /from\s+['"](three|@react-three\/[a-z-]+|openai|@anthropic-ai\/[a-z-]+|@google\/generative-ai|cohere-ai|langchain|ollama|@mistralai\/[a-z-]+)['"]/i;
    expect(badImport.test(corpus)).toBe(false);
  });

  it('makes no network/model calls (no fetch, XHR, or websocket)', () => {
    expect(corpusLower).not.toContain('fetch(');
    expect(corpusLower).not.toContain('xmlhttprequest');
    expect(corpusLower).not.toContain('new websocket');
  });

  it('references no 3D / WebGL APIs in source', () => {
    for (const token of ['webgl', '@react-three', 'three.js']) {
      expect(corpusLower).not.toContain(token);
    }
  });
});

describe('Phase 2 scope guards (Engine 1 sub-states only)', () => {
  it('adds no Guided / Strategy / COR / Observatory / Door Audit components', () => {
    for (const file of componentFiles) {
      expect(ALLOWED_COMPONENTS.has(file)).toBe(true);
    }
  });

  it('references no later-phase feature components in source', () => {
    for (const token of [
      'GuidedModeScreen',
      'StrategyStageScreen',
      'CORPanel',
      'ObservatoryScene',
      'DoorAuditInterview',
    ]) {
      expect(corpus.includes(token)).toBe(false);
    }
  });
});
