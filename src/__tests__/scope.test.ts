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

describe('Phase 2B scope guards (classifier + Door Audit Lite are pure + unwired)', () => {
  // The proxy classifier and (Phase 2B-4) the Door Audit Lite summary legitimately
  // exist now, but must stay unwired. selectTarget, full/build Door Audit, and a
  // Door Audit UI must NOT be built. Definition patterns avoid tripping on the
  // "does NOT implement …" comments and on the allowed summarizeDoorAuditLite.
  it('builds no selectTarget, build/run Door Audit, or Door Audit UI', () => {
    const definitionPatterns = [
      /function\s+selectTarget\b/,
      /\bselectTarget\s*[:=]\s*(?:\(|function|async)/,
      /function\s+(?:build|run)DoorAudit\w*/,
      /\b(?:build|run)DoorAudit\w*\s*[:=]\s*(?:\(|function|async)/,
      /DoorAuditInterview/,
      /DoorAuditScreen/,
    ];
    for (const re of definitionPatterns) expect(re.test(corpus)).toBe(false);
  });

  it('does not wire diagnostics or Door Audit Lite into the machine, components, App, or persistence', () => {
    const wiringCorpus = sourceFiles
      .filter(
        (f) =>
          f.includes('/machine/') ||
          f.includes('/components/') ||
          f.endsWith('App.tsx') ||
          f.endsWith('persistence.ts') ||
          f.endsWith('session.ts'),
      )
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    for (const token of [
      'detectTrapDiagnostic',
      'TrapDiagnosticResult',
      'diagnosticResult',
      'summarizeDoorAuditLite',
      'DoorAuditLiteSummary',
    ]) {
      expect(wiringCorpus.includes(token)).toBe(false);
    }
  });

  it('keeps Door Audit Lite pure + standalone (no app/classifier imports, no browser APIs)', () => {
    const file = sourceFiles.find((f) => f.endsWith('/doorAuditLite.ts'));
    expect(file).toBeDefined();
    const src = readFileSync(file as string, 'utf8');
    const importText = src
      .split('\n')
      .filter((l) => /^\s*import\b/.test(l))
      .join('\n');
    // It may import door types from state, but nothing runtime/app/classifier.
    for (const mod of ['react', 'xstate', '/machine/', 'persistence', 'detectTrapDiagnostic']) {
      expect(importText).not.toContain(mod);
    }
    for (const api of ['fetch(', 'localStorage', 'indexedDB', 'XMLHttpRequest', 'new WebSocket']) {
      expect(src).not.toContain(api);
    }
  });

  it('adds no diagnostic or Door Audit UI component', () => {
    for (const file of componentFiles) {
      expect(/diagnostic|dooraudit/i.test(file)).toBe(false);
    }
  });
});

describe('Phase 2B-5 scope guards (independent layers, no shared blocker constant)', () => {
  const readSrc = (suffix: string) =>
    readFileSync(sourceFiles.find((f) => f.endsWith(suffix)) as string, 'utf8');
  const importLines = (src: string) =>
    src
      .split('\n')
      .filter((l) => /^\s*import\b/.test(l))
      .join('\n');

  it('the classifier does not import Door Audit Lite', () => {
    const imports = importLines(readSrc('/detectTrapDiagnostic.ts'));
    for (const token of ['doorAuditLite', 'summarizeDoorAuditLite', 'DoorAuditLiteSummary']) {
      expect(imports).not.toContain(token);
    }
  });

  it('Door Audit Lite does not import the classifier', () => {
    expect(importLines(readSrc('/doorAuditLite.ts'))).not.toContain('detectTrapDiagnostic');
  });

  it('introduces no shared blocker-category constant in production diagnostics', () => {
    // Neither production diagnostic module exports a shared blocker-category list,
    // and neither imports one — so the reconciliation test compares two genuinely
    // independent implementations and can still detect drift.
    for (const suffix of ['/detectTrapDiagnostic.ts', '/doorAuditLite.ts', '/state/diagnostics.ts']) {
      const src = readSrc(suffix);
      expect(/export\s+const\s+\w*[Bb]locker\w*/.test(src)).toBe(false);
    }
    for (const suffix of ['/detectTrapDiagnostic.ts', '/doorAuditLite.ts']) {
      expect(importLines(readSrc(suffix))).not.toContain('locker');
    }
  });
});
