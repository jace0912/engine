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
      'getDiagnosticCopyContract',
      'DiagnosticCopyContract',
      'diagnosticReadoutCopy',
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

describe('Phase 2B-6 scope guards (copy contract is a pure static contract, not a formatter)', () => {
  const readSrc = (suffix: string) =>
    readFileSync(sourceFiles.find((f) => f.endsWith(suffix)) as string, 'utf8');

  it('builds no diagnostic-result formatter or action-selector function', () => {
    // The copy contract must stay static: no function that takes a live
    // TrapDiagnosticResult and renders display text, and no action selector.
    for (const token of [
      'formatDiagnosticReadout',
      'renderDiagnosticReadout',
      'buildDiagnosticReadout',
      'summarizeDiagnosticResultForDisplay',
      'chooseAction',
      'recommendNextMove',
    ]) {
      expect(corpus.includes(token)).toBe(false);
    }
  });

  it('keeps the copy contract pure + standalone (no live result, no app imports, no browser APIs, no clock/random)', () => {
    const src = readSrc('/diagnosticReadoutCopy.ts');
    const importText = src
      .split('\n')
      .filter((l) => /^\s*import\b/.test(l))
      .join('\n');
    // Imports only static diagnostic *types* — never a live result, the
    // classifier, Door Audit Lite, React/XState, persistence, or the session.
    for (const mod of [
      'TrapDiagnosticResult',
      'detectTrapDiagnostic',
      'doorAuditLite',
      'react',
      'xstate',
      '/machine/',
      'persistence',
      'session',
    ]) {
      expect(importText).not.toContain(mod);
    }
    // Strip comments first, so prose like "no Math.random" in the file header
    // cannot create a false positive, then assert the CODE uses no clock,
    // randomness, or I/O.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const api of [
      'new Date',
      'Date.now',
      'Math.random',
      'fetch(',
      'localStorage',
      'indexedDB',
      'XMLHttpRequest',
      'new WebSocket',
    ]) {
      expect(code).not.toContain(api);
    }
  });
});

describe('Phase 3-0 scope guards (Guided Recovery boundary is pure + unwired)', () => {
  const grFile = sourceFiles.find((f) => f.endsWith('/guidedRecoveryBoundary.ts'));

  it('no source OUTSIDE src/recovery references Guided Recovery (no app/runtime/diagnostic leak)', () => {
    expect(grFile).toBeDefined();
    // The pure recovery modules (boundary, state foundation) may reference each
    // other; nothing else — machine, App, components, persistence, session,
    // diagnostics — may mention Guided Recovery at all.
    for (const f of sourceFiles) {
      if (f.includes('/recovery/')) continue;
      const src = readFileSync(f, 'utf8');
      expect(src.includes('GuidedRecovery')).toBe(false);
      expect(src.includes('guidedRecoveryBoundary')).toBe(false);
      expect(src.includes('guidedRecoveryState')).toBe(false);
    }
  });

  it('is pure + standalone (no imports at all, no browser APIs, no clock/random)', () => {
    const src = readFileSync(grFile as string, 'utf8');
    const importText = src
      .split('\n')
      .filter((l) => /^\s*import\b/.test(l))
      .join('\n');
    // The boundary module has NO imports whatsoever — nothing runtime, app,
    // diagnostic, React/XState, persistence, or session can leak in.
    expect(importText.trim()).toBe('');
    for (const mod of [
      'react',
      'xstate',
      '/machine/',
      'persistence',
      'session',
      'detectTrapDiagnostic',
      'doorAuditLite',
      'diagnosticReadoutCopy',
    ]) {
      expect(importText).not.toContain(mod);
    }
    // Strip comments so header prose ("no randomness", etc.) cannot create a
    // false positive, then assert the CODE uses no clock, randomness, or I/O.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const api of [
      'new Date',
      'Date.now',
      'Math.random',
      'fetch(',
      'localStorage',
      'indexedDB',
      'XMLHttpRequest',
      'new WebSocket',
    ]) {
      expect(code).not.toContain(api);
    }
  });

  it('is not wired into the machine, components, App, persistence, or session', () => {
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
      'evaluateGuidedRecoveryBoundary',
      'GuidedRecoveryBoundaryDecision',
      'GuidedRecoveryBoundaryInput',
      'getGuidedRecoveryCopyContract',
      'guidedRecoveryBoundary',
    ]) {
      expect(wiringCorpus.includes(token)).toBe(false);
    }
  });

  it('adds no Guided Recovery (or any Guided) UI component', () => {
    for (const file of componentFiles) {
      expect(/guided/i.test(file)).toBe(false);
    }
  });
});

describe('Phase 3-1 scope guards (Guided Recovery state foundation is pure + unwired, type-only boundary import)', () => {
  const stateFile = sourceFiles.find((f) => f.endsWith('/guidedRecoveryState.ts'));
  const readState = () => readFileSync(stateFile as string, 'utf8');
  const importLines = (src: string) => src.split('\n').filter((l) => /^\s*import\b/.test(l));

  it('exists', () => {
    expect(stateFile).toBeDefined();
  });

  it('imports from the boundary as TYPE-ONLY, and nothing runtime/app/diagnostic', () => {
    const lines = importLines(readState());
    // Every import statement must be a type-only import (erased at build).
    for (const line of lines) {
      expect(/^\s*import\s+type\b/.test(line)).toBe(true);
    }
    const importText = lines.join('\n');
    for (const mod of [
      'react',
      'xstate',
      '/machine/',
      'persistence',
      'session',
      'detectTrapDiagnostic',
      'doorAuditLite',
      'diagnosticReadoutCopy',
    ]) {
      expect(importText).not.toContain(mod);
    }
    // The boundary reference, if present, is the type-only entry-status import.
    if (importText.includes('guidedRecoveryBoundary')) {
      expect(/import\s+type\b[^\n]*guidedRecoveryBoundary/.test(importText)).toBe(true);
    }
  });

  it('does not call the boundary evaluator or copy contract at runtime', () => {
    const code = readState()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toContain('evaluateGuidedRecoveryBoundary(');
    expect(code).not.toContain('getGuidedRecoveryCopyContract(');
  });

  it('is pure — no clock, randomness, or I/O', () => {
    const code = readState()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    for (const api of [
      'new Date',
      'Date.now',
      'Math.random',
      'fetch(',
      'localStorage',
      'indexedDB',
      'XMLHttpRequest',
      'new WebSocket',
    ]) {
      expect(code).not.toContain(api);
    }
  });

  it('defines no step-library, catalog, runtime-transition, or selector export (name-level)', () => {
    const src = readState();
    for (const name of [
      'createActiveGuidedRecoveryState',
      'createPausedGuidedRecoveryState',
      'enterGuidedRecovery',
      'startGuidedRecovery',
      'nextRecoveryStep',
      'recommendRecoveryStep',
      'chooseRecoveryAction',
      'selectTarget',
      'chooseAction',
      'recommendNextMove',
    ]) {
      expect(new RegExp(`\\b${name}\\b`).test(src)).toBe(false);
    }
    // No exported identifier named like a step/catalog/instruction library.
    expect(
      /export\s+(?:const|function|interface|type)\s+\w*(?:steps|microsteps|recoverysteps|steplibrary|movecatalog|actioncatalog|instructions|exercises|protocol|catalog)\w*/i.test(
        src,
      ),
    ).toBe(false);
  });

  it('is not wired into the machine, components, App, persistence, or session', () => {
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
      'guidedRecoveryState',
      'GuidedRecoveryState',
      'createInactiveGuidedRecoveryState',
      'createAvailableGuidedRecoveryState',
      'GuidedRecoveryStage',
      'GuidedRecoveryStatus',
    ]) {
      expect(wiringCorpus.includes(token)).toBe(false);
    }
  });
});

describe('Phase 3-2 scope guards (Guided Recovery copy contract is pure + unwired, type-only state import)', () => {
  const copyFile = sourceFiles.find((f) => f.endsWith('/guidedRecoveryCopy.ts'));
  const readCopy = () => readFileSync(copyFile as string, 'utf8');
  const importLinesOf = (src: string) => src.split('\n').filter((l) => /^\s*import\b/.test(l));
  const codeOf = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('exists', () => {
    expect(copyFile).toBeDefined();
  });

  it('imports from state as TYPE-ONLY, never the boundary or anything runtime/app/diagnostic', () => {
    const lines = importLinesOf(readCopy());
    for (const line of lines) {
      expect(/^\s*import\s+type\b/.test(line)).toBe(true);
    }
    const importText = lines.join('\n');
    for (const mod of [
      'react',
      'xstate',
      '/machine/',
      'persistence',
      'session',
      'detectTrapDiagnostic',
      'doorAuditLite',
      'diagnosticReadoutCopy',
      'guidedRecoveryBoundary',
    ]) {
      expect(importText).not.toContain(mod);
    }
    if (importText.includes('guidedRecoveryState')) {
      expect(/import\s+type\b[^\n]*guidedRecoveryState/.test(importText)).toBe(true);
    }
  });

  it('calls no factory, evaluator, or copy/diagnostic getter from other modules', () => {
    const code = codeOf(readCopy());
    for (const call of [
      'createInactiveGuidedRecoveryState(',
      'createAvailableGuidedRecoveryState(',
      'isGuidedRecoveryState(',
      'evaluateGuidedRecoveryBoundary(',
      'getGuidedRecoveryCopyContract(',
      'getDiagnosticCopyContract(',
      'detectTrapDiagnostic(',
      'summarizeDoorAuditLite(',
    ]) {
      expect(code).not.toContain(call);
    }
  });

  it('defines the fixed getter and NOT a duplicate Phase 3-0 getter', () => {
    const src = readCopy();
    expect(/export\s+function\s+getGuidedRecoveryStageCopyContract\b/.test(src)).toBe(true);
    expect(/export\s+function\s+getGuidedRecoveryCopyContract\b/.test(src)).toBe(false);
  });

  it('is pure — no clock, randomness, or I/O', () => {
    const code = codeOf(readCopy());
    for (const api of [
      'new Date',
      'Date.now',
      'Math.random',
      'fetch(',
      'localStorage',
      'indexedDB',
      'XMLHttpRequest',
      'new WebSocket',
    ]) {
      expect(code).not.toContain(api);
    }
  });

  it('defines no step-library / prompt / dialogue / selector export (name-level)', () => {
    const src = readCopy();
    for (const name of [
      'nextRecoveryStep',
      'recommendRecoveryStep',
      'chooseRecoveryAction',
      'selectTarget',
      'chooseAction',
      'recommendNextMove',
      'buildRecoveryDialogue',
      'generateRecoveryPrompt',
      'formatGuidedRecoveryScreen',
      'renderGuidedRecoveryCopy',
    ]) {
      expect(new RegExp(`\\b${name}\\b`).test(src)).toBe(false);
    }
    expect(
      /export\s+(?:const|function|interface|type)\s+\w*(?:steplibrary|microsteps|recoverysteps|movecatalog|actioncatalog|reflectionprompts|journalingprompts|userfacingdialogue)\w*/i.test(
        src,
      ),
    ).toBe(false);
  });

  it('is not wired into the machine, components, App, persistence, or session', () => {
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
      'guidedRecoveryCopy',
      'getGuidedRecoveryStageCopyContract',
      'GuidedRecoveryStageCopyContract',
      'GuidedRecoveryFrameExample',
    ]) {
      expect(wiringCorpus.includes(token)).toBe(false);
    }
  });
});

describe('Phase 3-3 scope guards (micro-step candidate catalog is pure + unwired, type-only state import)', () => {
  const stepFile = sourceFiles.find((f) => f.endsWith('/guidedRecoveryMicroSteps.ts'));
  const readStep = () => readFileSync(stepFile as string, 'utf8');
  const importLinesOf = (src: string) => src.split('\n').filter((l) => /^\s*import\b/.test(l));
  const codeOf = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('exists', () => {
    expect(stepFile).toBeDefined();
  });

  it('imports from state as TYPE-ONLY, never the boundary/copy or anything runtime/app/diagnostic', () => {
    const lines = importLinesOf(readStep());
    for (const line of lines) {
      expect(/^\s*import\s+type\b/.test(line)).toBe(true);
    }
    const importText = lines.join('\n');
    for (const mod of [
      'react',
      'xstate',
      '/machine/',
      'persistence',
      'session',
      'detectTrapDiagnostic',
      'doorAuditLite',
      'diagnosticReadoutCopy',
      'guidedRecoveryBoundary',
      'guidedRecoveryCopy',
    ]) {
      expect(importText).not.toContain(mod);
    }
    if (importText.includes('guidedRecoveryState')) {
      expect(/import\s+type\b[^\n]*guidedRecoveryState/.test(importText)).toBe(true);
    }
  });

  it('calls no factory, evaluator, or copy/diagnostic getter from other modules', () => {
    const code = codeOf(readStep());
    for (const call of [
      'evaluateGuidedRecoveryBoundary(',
      'getGuidedRecoveryCopyContract(',
      'getGuidedRecoveryStageCopyContract(',
      'createInactiveGuidedRecoveryState(',
      'createAvailableGuidedRecoveryState(',
      'isGuidedRecoveryState(',
      'detectTrapDiagnostic(',
      'summarizeDoorAuditLite(',
      'getDiagnosticCopyContract(',
    ]) {
      expect(code).not.toContain(call);
    }
  });

  it('is pure — no clock, randomness, or I/O', () => {
    const code = codeOf(readStep());
    for (const api of [
      'new Date',
      'Date.now',
      'Math.random',
      'fetch(',
      'localStorage',
      'indexedDB',
      'XMLHttpRequest',
      'new WebSocket',
    ]) {
      expect(code).not.toContain(api);
    }
  });

  it('defines the fixed getter and no selection/ranking/recommendation/transition export (name-level)', () => {
    const src = readStep();
    expect(/export\s+function\s+getGuidedRecoveryMicroStepCatalog\b/.test(src)).toBe(true);
    for (const name of [
      'getNextRecoveryStep',
      'getRecommendedRecoveryStep',
      'chooseRecoveryStep',
      'selectRecoveryStep',
      'rankRecoverySteps',
      'filterRecoveryStepsForUser',
      'personalizeRecoveryStep',
      'recommendRecoveryStep',
      'nextRecoveryStep',
      'chooseRecoveryAction',
      'recommendNextMove',
      'selectTarget',
      'chooseAction',
    ]) {
      expect(new RegExp(`\\b${name}\\b`).test(src)).toBe(false);
    }
  });

  it('is not wired into the machine, components, App, persistence, or session', () => {
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
      'guidedRecoveryMicroSteps',
      'getGuidedRecoveryMicroStepCatalog',
      'GuidedRecoveryMicroStepCatalog',
      'GuidedRecoveryMicroStepCandidate',
    ]) {
      expect(wiringCorpus.includes(token)).toBe(false);
    }
  });
});
