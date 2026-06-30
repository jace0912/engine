// Phase 3-4 — Guided Recovery UI Shell tests.
//
// Proves the shell is inert: no props, static + non-interactive, renders ONLY
// the approved placeholder strings (aria-hidden root), grants no permission,
// renders no catalog/copy/step/prompt content, contains no interactive controls,
// preserves SafetyOverride priority, stays separate from Phase 4, and exposes no
// selector/recommender/transition export. Rendering uses react-dom/server so we
// scan exactly the markup the shell produces.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as shellModule from '../recovery/GuidedRecoveryShell';
import {
  GUIDED_RECOVERY_SHELL_PERMISSIONS,
  GUIDED_RECOVERY_SHELL_PLACEHOLDER_LINES,
  GuidedRecoveryShell,
} from '../recovery/GuidedRecoveryShell';
// Imported in the TEST only — to prove none of their content is rendered.
import { getGuidedRecoveryMicroStepCatalog } from '../recovery/guidedRecoveryMicroSteps';
import { getGuidedRecoveryStageCopyContract } from '../recovery/guidedRecoveryCopy';

const html = renderToStaticMarkup(<GuidedRecoveryShell />);

// Visible text nodes (tags stripped) — what a user would actually see.
function renderedTextNodes(markup: string): string[] {
  return markup
    .replace(/<[^>]*>/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

describe('Phase 3-4 §3 — shell shape, approved strings only, no permission', () => {
  it('GuidedRecoveryShell exists and takes no props/inputs', () => {
    expect(typeof GuidedRecoveryShell).toBe('function');
    expect(GuidedRecoveryShell.length).toBe(0);
  });

  it('the root is aria-hidden', () => {
    expect(html.startsWith('<div aria-hidden="true"')).toBe(true);
  });

  it('renders EXACTLY the approved placeholder strings and nothing else', () => {
    const text = renderedTextNodes(html);
    expect(text).toEqual([...GUIDED_RECOVERY_SHELL_PLACEHOLDER_LINES]);
    // Every visible line is an approved line.
    const approved = new Set<string>(GUIDED_RECOVERY_SHELL_PLACEHOLDER_LINES);
    for (const line of text) expect(approved.has(line)).toBe(true);
  });

  it('renders the no-permission disclaimer and the SafetyOverride priority line', () => {
    expect(html).toContain(
      'This shell grants no display, selection, recommendation, persistence, or runtime permission.',
    );
    expect(html).toContain('SafetyOverride remains higher priority.');
  });

  it('the local no-permission marker grants nothing', () => {
    expect(GUIDED_RECOVERY_SHELL_PERMISSIONS.displayPermissionGranted).toBe(false);
    expect(GUIDED_RECOVERY_SHELL_PERMISSIONS.runtimePermissionGranted).toBe(false);
    expect(GUIDED_RECOVERY_SHELL_PERMISSIONS.selectionPermissionGranted).toBe(false);
    expect(GUIDED_RECOVERY_SHELL_PERMISSIONS.recommendationPermissionGranted).toBe(false);
    expect(GUIDED_RECOVERY_SHELL_PERMISSIONS.persistencePermissionGranted).toBe(false);
    expect(GUIDED_RECOVERY_SHELL_PERMISSIONS.mustNotRecommend).toBe(true);
  });
});

describe('Phase 3-4 §4/§12 — no interactivity', () => {
  it('renders no interactive elements or handlers in the markup', () => {
    const lower = html.toLowerCase();
    for (const token of [
      '<button',
      '<a ',
      'href=',
      '<input',
      '<textarea',
      '<select',
      'type="checkbox"',
      'type="radio"',
      '<form',
      'role="button"',
      'onclick',
      'onsubmit',
      'tabindex',
    ]) {
      expect(lower.includes(token)).toBe(false);
    }
  });

  it('the shell source declares no event/keyboard handlers or fake interactivity', () => {
    // Source-level: defence in depth (the markup check above can only see output).
    const src = shellSource();
    for (const token of ['onClick', 'onSubmit', 'onKeyDown', 'onKeyUp', 'onKeyPress', 'href', 'role="button"', 'tabIndex']) {
      expect(src.includes(token)).toBe(false);
    }
  });
});

describe('Phase 3-4 §7/§9/§10 — no catalog, copy, step, or recommendation rendering', () => {
  it('renders no micro-step candidate label / purpose / category', () => {
    const catalog = getGuidedRecoveryMicroStepCatalog();
    for (const c of catalog.candidates) {
      expect(html.includes(c.label)).toBe(false);
      expect(html.includes(c.purpose)).toBe(false);
      expect(html.includes(c.category)).toBe(false);
    }
  });

  it('renders no copy-contract approvedFrameExamples / requiredQualifiers / stage purposes', () => {
    const copy = getGuidedRecoveryStageCopyContract();
    const shellLines = new Set<string>(GUIDED_RECOVERY_SHELL_PLACEHOLDER_LINES);
    for (const f of copy.approvedFrameExamples) expect(html.includes(f.text)).toBe(false);
    for (const r of copy.stageRules) expect(html.includes(r.purpose)).toBe(false);
    for (const q of copy.requiredQualifiers) {
      // A copy-contract qualifier may coincide with one of the shell's OWN
      // approved placeholder lines (both independently state the SafetyOverride
      // priority). The shell does not import the copy contract; such a match is
      // its own approved string, not copy-contract content leaking into the UI.
      if (shellLines.has(q)) continue;
      expect(html.includes(q)).toBe(false);
    }
  });

  it('the shell module exposes only the component + its inert constants', () => {
    const exportNames = Object.keys(shellModule).sort();
    expect(exportNames).toEqual(
      ['GUIDED_RECOVERY_SHELL_PERMISSIONS', 'GUIDED_RECOVERY_SHELL_PLACEHOLDER_LINES', 'GuidedRecoveryShell'].sort(),
    );
    // No selector / recommender / transition / renderer export.
    for (const name of [
      'getGuidedRecoveryMicroStepCatalog',
      'getGuidedRecoveryStageCopyContract',
      'getGuidedRecoveryCopyContract',
      'evaluateGuidedRecoveryBoundary',
      'selectTarget',
      'chooseAction',
      'recommendNextMove',
      'nextRecoveryStep',
      'recommendRecoveryStep',
      'chooseRecoveryAction',
      'buildRecoveryDialogue',
      'generateRecoveryPrompt',
      'formatGuidedRecoveryScreen',
      'renderGuidedRecoveryCopy',
      'selectRecoveryStep',
      'rankRecoverySteps',
    ]) {
      expect((shellModule as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});

describe('Phase 3-4 §8/§10 — no affirmative permission implication (scan rendered markup)', () => {
  const FORBIDDEN_AFFIRMATIVE = [
    'Start Guided Recovery',
    'Continue Guided Recovery',
    'Begin Recovery',
    'Your Recovery Step',
    'Recommended Step',
    'Next Step',
    'Try This',
    'Do This',
    'Choose This',
    'Select This',
    'Complete This',
    'Recovery is available',
    'You are ready',
    'Safe to continue',
    "I'm Ready",
  ];

  it('the rendered shell contains no affirmative permission phrase', () => {
    const lower = html.toLowerCase();
    for (const phrase of FORBIDDEN_AFFIRMATIVE) expect(lower.includes(phrase.toLowerCase())).toBe(false);
  });

  it('negative control — the scanner catches an injected affirmative phrase', () => {
    const scan = (s: string) => FORBIDDEN_AFFIRMATIVE.some((p) => s.toLowerCase().includes(p.toLowerCase()));
    expect(scan('Guided Recovery shell placeholder.')).toBe(false);
    expect(scan('<p>Start Guided Recovery</p>')).toBe(true);
  });

  it('positive control — safe disclaimers survive the scanner', () => {
    const scan = (s: string) => FORBIDDEN_AFFIRMATIVE.some((p) => s.toLowerCase().includes(p.toLowerCase()));
    expect(scan('This shell grants no display, selection, recommendation, persistence, or runtime permission.')).toBe(
      false,
    );
    expect(scan('No Guided Recovery runtime is enabled.')).toBe(false);
  });
});

describe('Phase 3-4 §14/§19 — SafetyOverride preserved, not softened', () => {
  it('asserts SafetyOverride priority and never softens or bypasses it', () => {
    const lower = html.toLowerCase();
    expect(lower.includes('safetyoverride remains higher priority')).toBe(true);
    for (const bad of [
      'can proceed during danger',
      'bypass safetyoverride',
      'override safety',
      'safetyoverride is optional',
      'override the safety gate',
      'safe if safetyoverride is active',
    ]) {
      expect(lower.includes(bad)).toBe(false);
    }
  });
});

describe('Phase 3-4 §15/§9 — Phase 3 vs Phase 4 separation', () => {
  it('the rendered shell contains no affirmative Phase-4 / selector phrase', () => {
    const lower = html.toLowerCase();
    for (const phrase of [
      'select target',
      'choose action',
      'recommended action',
      'next move',
      'exit plan',
      'solve the trap',
      'strategy mode is available',
      'continue to strategy mode',
    ]) {
      expect(lower.includes(phrase)).toBe(false);
    }
  });
});

// Helper: read the shell source for source-level (defence-in-depth) checks.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
function shellSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, '..', 'recovery', 'GuidedRecoveryShell.tsx'), 'utf8');
}
