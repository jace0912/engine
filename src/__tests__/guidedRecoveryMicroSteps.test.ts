// Phase 3-3 — Recovery Micro-Step Candidate Catalog tests.
//
// Proves the catalog is static + immutable, grants no display/runtime/selection/
// recommendation/persistence permission, that every candidate is an INERT slot
// placeholder (label = an exact approved slot marker; purpose = the fixed
// structural template), that labels/purposes carry no activity/imperative/
// banned content, and that nothing selects/ranks/recommends candidates.
//
// SCANNER NOTE: the six slot nouns (orientation, capacity, stabilization,
// review, handoff, closure) plus "slot"/"marker" are the APPROVED inert label
// vocabulary. The activity-word scan tokenises on word boundaries and EXCLUDES
// that vocabulary, so the approved label "review slot marker" survives while any
// real activity verb (breathe, walk, write, …) is still flagged. This honours
// the spec's explicit approval of "review slot marker" over the illustrative
// "review" in the activity-word list.

import { describe, expect, it } from 'vitest';
import * as microStepModule from '../recovery/guidedRecoveryMicroSteps';
import {
  getGuidedRecoveryMicroStepCatalog,
  type GuidedRecoveryMicroStepCandidate,
} from '../recovery/guidedRecoveryMicroSteps';

const catalog = getGuidedRecoveryMicroStepCatalog();
const candidates = catalog.candidates;

const PERMISSION_FALSE_KEYS = [
  'displayPermissionGranted',
  'runtimePermissionGranted',
  'selectionPermissionGranted',
  'recommendationPermissionGranted',
  'persistencePermissionGranted',
] as const;

const STOP_SAFE_TRUE_KEYS = [
  'mustNotRecommend',
  'mustBeOptional',
  'mustBeSkippable',
  'mustBeStopSafe',
  'mustNotRequirePhysicalExertion',
  'mustNotRequireDisclosure',
  'mustNotRequireMemoryRecall',
  'mustNotRequireWriting',
  'mustNotRequireSocialContact',
  'mustNotRequireSpendingMoney',
  'mustNotRequireLeavingLocation',
  'mustNotRequireMedicalChange',
  'mustNotTriggerStrategySelection',
] as const;

const APPROVED_LABELS = new Set([
  'orientation slot marker',
  'capacity slot marker',
  'stabilization slot marker',
  'review slot marker',
  'handoff slot marker',
  'closure slot marker',
]);

// Approved inert slot vocabulary — excluded from the activity-word scan.
const STRUCTURAL = new Set([
  'orientation',
  'capacity',
  'stabilization',
  'review',
  'handoff',
  'closure',
  'slot',
  'marker',
]);

// Single-word activity / imperative / medical bans (word-level).
const ACTIVITY_WORDS = new Set([
  'breathe',
  'walk',
  'write',
  'journal',
  'call',
  'drink',
  'exercise',
  'stretch',
  'meditate',
  'pray',
  'message',
  'pause',
  'check',
  'notice',
  'reflect',
  'review',
  'simplify',
  'settle',
  'prepare',
  'continue',
  'feel',
  'experience',
  'remember',
  'change',
  'try',
  'practice',
  'complete',
  'do',
  'act',
  'take',
  'go',
  'start',
  'stop',
  'use',
  'medication',
  'dosage',
  'prescription',
  'taper',
  'wean',
  'discontinue',
  'titrate',
  'hopeless',
]);

const wordsOf = (s: string): string[] => s.toLowerCase().split(/[^a-z]+/).filter(Boolean);

/** A non-structural token that is a banned activity word, or null. */
function activityWordIn(s: string): string | null {
  for (const w of wordsOf(s)) {
    if (STRUCTURAL.has(w)) continue; // approved inert slot vocabulary
    if (ACTIVITY_WORDS.has(w)) return w;
  }
  return null;
}

// Multi-word banned phrases (substring; these never collide with slot vocab).
const MULTI_WORD_BANS = catalog.bannedPhrases.filter((p) => p.includes(' '));
function bannedPhraseIn(s: string): string | null {
  const lower = s.toLowerCase();
  for (const p of MULTI_WORD_BANS) if (lower.includes(p)) return p;
  return null;
}

/** Combined positive-metadata scanner. */
function scanPositive(s: string): string | null {
  return activityWordIn(s) ?? bannedPhraseIn(s);
}

// Only candidate.label + candidate.purpose — the top-risk fields. Explicitly
// EXCLUDES bannedPhrases + forbiddenBehaviors metadata (and never reads README/
// tests/comments).
function positiveMetadataStrings(): string[] {
  return candidates.flatMap((c) => [c.label, c.purpose]);
}

describe('Phase 3-3 §6 — catalog shape, permission + stop-safe flags, immutability', () => {
  it('getGuidedRecoveryMicroStepCatalog() exists and returns a catalog', () => {
    expect(typeof getGuidedRecoveryMicroStepCatalog).toBe('function');
    expect(catalog.version.length).toBeGreaterThan(0);
    expect(candidates.length).toBeGreaterThanOrEqual(6);
  });

  it('the catalog grants no display/runtime/selection/recommendation/persistence permission', () => {
    for (const k of PERMISSION_FALSE_KEYS) expect(catalog[k]).toBe(false);
    expect(catalog.mustNotRecommend).toBe(true);
  });

  it('every candidate grants no permission and carries every stop-safe flag', () => {
    for (const c of candidates) {
      for (const k of PERMISSION_FALSE_KEYS) expect(c[k]).toBe(false);
      for (const k of STOP_SAFE_TRUE_KEYS) expect(c[k]).toBe(true);
    }
  });

  it('every candidate uses compatibleStages (no single-stage routing field)', () => {
    for (const c of candidates) {
      expect(Array.isArray(c.compatibleStages)).toBe(true);
      expect(c.compatibleStages.length).toBeGreaterThan(0);
      expect(c).not.toHaveProperty('stage');
      expect(c).not.toHaveProperty('order');
      expect(c).not.toHaveProperty('rank');
      expect(c).not.toHaveProperty('route');
    }
  });

  it('is deep-frozen and a stable singleton', () => {
    expect(getGuidedRecoveryMicroStepCatalog()).toBe(getGuidedRecoveryMicroStepCatalog());
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.candidates)).toBe(true);
    expect(Object.isFrozen(catalog.candidates[0])).toBe(true);
    expect(Object.isFrozen(catalog.candidates[0].compatibleStages)).toBe(true);
    expect(Object.isFrozen(catalog.bannedPhrases)).toBe(true);
  });

  it('covers the six slot categories', () => {
    expect(new Set(candidates.map((c) => c.category))).toEqual(
      new Set([
        'orientation_slot',
        'capacity_slot',
        'stabilization_slot',
        'review_slot',
        'handoff_slot',
        'closure_slot',
      ]),
    );
  });
});

describe('Phase 3-3 §7 — labels and purposes are inert structural metadata only', () => {
  it('every label is an exact approved inert slot marker (closed allowlist)', () => {
    for (const c of candidates) {
      expect(APPROVED_LABELS.has(c.label)).toBe(true);
      expect(c.label.includes('slot marker')).toBe(true);
    }
  });

  it('every label is built PURELY from approved inert slot vocabulary', () => {
    for (const c of candidates) {
      const nonStructural = wordsOf(c.label).filter((w) => !STRUCTURAL.has(w));
      expect(nonStructural).toEqual([]);
    }
  });

  it('every purpose is the fixed structural template (inert / placeholder / catalog / no-permission)', () => {
    for (const c of candidates) {
      expect(c.purpose).toBe(
        `Defines an inert ${c.category} placeholder in the catalog; grants no display, selection, recommendation, persistence, or runtime permission.`,
      );
      expect(c.purpose).toContain('inert');
      expect(c.purpose).toContain('placeholder');
      expect(c.purpose).toContain('catalog');
      expect(c.purpose).toContain(
        'grants no display, selection, recommendation, persistence, or runtime permission',
      );
    }
  });

  it('no label or purpose contains a non-structural activity/experience/assessment word', () => {
    for (const c of candidates) {
      expect(activityWordIn(c.label)).toBeNull();
      expect(activityWordIn(c.purpose)).toBeNull();
    }
  });
});

describe('Phase 3-3 §8/§14 — no selection / recommendation / next-step behavior', () => {
  it('the module exports only the catalog getter (no selector/ranker/recommender)', () => {
    const fnExports = Object.keys(microStepModule).filter(
      (k) => typeof (microStepModule as Record<string, unknown>)[k] === 'function',
    );
    expect(fnExports).toEqual(['getGuidedRecoveryMicroStepCatalog']);
  });

  it('exposes none of the forbidden selection/recommendation/transition names', () => {
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
      'buildRecoveryDialogue',
      'generateRecoveryPrompt',
      'formatGuidedRecoveryScreen',
      'renderGuidedRecoveryCopy',
    ]) {
      expect((microStepModule as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});

describe('Phase 3-3 §9 — concrete-action scan (word boundaries, no false positives)', () => {
  it('no candidate label or purpose contains a concrete action verb', () => {
    for (const text of positiveMetadataStrings()) expect(activityWordIn(text)).toBeNull();
  });

  it('matches whole words only — "rewrite"/"walkthrough" do NOT trip "write"/"walk"', () => {
    expect(activityWordIn('rewrite walkthrough')).toBeNull();
    expect(activityWordIn('write')).toBe('write');
    expect(activityWordIn('walk')).toBe('walk');
  });
});

describe('Phase 3-3 §10 — safe-language scan over POSITIVE metadata only', () => {
  it('no candidate label or purpose contains an activity word or banned phrase', () => {
    for (const text of positiveMetadataStrings()) expect(scanPositive(text)).toBeNull();
  });

  it('negative control — the scanner flags an injected banned term (even after slot vocab)', () => {
    expect(scanPositive('review slot marker breathe')).toBe('breathe');
    expect(scanPositive('please taper your medication')).not.toBeNull();
    expect(scanPositive('take a breath and process your trauma')).not.toBeNull();
  });

  it('positive control — every approved inert slot label survives the scanner', () => {
    for (const label of APPROVED_LABELS) expect(scanPositive(label)).toBeNull();
  });
});

describe('Phase 3-3 §11 — reflection-compatible candidates stay extra fenced', () => {
  const reflectionCandidates = candidates.filter((c) => c.compatibleStages.includes('reflection'));

  it('there is at least one reflection-compatible candidate, and it is inert', () => {
    expect(reflectionCandidates.length).toBeGreaterThan(0);
    for (const c of reflectionCandidates) {
      const text = `${c.label}\n${c.purpose}`.toLowerCase();
      expect(text.includes('?')).toBe(false);
      for (const bad of [
        'how do you feel',
        'journal',
        'trauma',
        'emotional processing',
        'clinical',
        'exercise',
        'coping',
        'meaning of what happened',
        'remember',
        'before-state',
        'notice',
      ]) {
        expect(text.includes(bad)).toBe(false);
      }
      // label is the inert review-slot marker only
      expect(c.label).toBe('review slot marker');
    }
  });
});

describe('Phase 3-3 §12 — handoff and closure candidates stay fenced', () => {
  it('handoff-compatible candidates point nowhere and recommend nothing', () => {
    const handoff = candidates.filter((c) => c.compatibleStages.includes('handoff'));
    expect(handoff.length).toBeGreaterThan(0);
    for (const c of handoff) {
      // label/purpose are pinned to the inert template (see §7). Scan for
      // AFFIRMATIVE pointing/recommending phrases only — the purpose's
      // "grants no … recommendation … permission" disclaimer is correct and
      // must not be flagged.
      const text = `${c.label}\n${c.purpose}`.toLowerCase();
      for (const bad of [
        'strategy',
        'target',
        'next action',
        'next mode',
        'next move',
        'later mode',
        'recommend a',
        'recommended',
        'route the user',
        'point the user',
        'pointing toward',
        'prepare the user',
      ]) {
        expect(text.includes(bad)).toBe(false);
      }
    }
  });

  it('closure-compatible candidates imply no resolution/success/healing/readiness/safety/completion/stability', () => {
    const closure = candidates.filter((c) => c.compatibleStages.includes('closed'));
    expect(closure.length).toBeGreaterThan(0);
    for (const c of closure) {
      const text = `${c.label}\n${c.purpose}`.toLowerCase();
      for (const bad of [
        'resolution',
        'success',
        'healing',
        'readiness',
        'safety',
        'completion',
        'stability',
        'complete',
        'healed',
      ]) {
        expect(text.includes(bad)).toBe(false);
      }
    }
  });
});

describe('Phase 3-3 §13 — SafetyOverride preserved', () => {
  it('forbiddenBehaviors (catalog + every candidate) include bypassing SafetyOverride', () => {
    expect(catalog.forbiddenBehaviors).toContain('bypassing SafetyOverride');
    for (const c of candidates) expect(c.forbiddenBehaviors).toContain('bypassing SafetyOverride');
  });

  it('no candidate grants runtime permission or claims to override safety', () => {
    for (const c of candidates) {
      expect(c.runtimePermissionGranted).toBe(false);
      const text = `${c.label}\n${c.purpose}`.toLowerCase();
      for (const bad of ['override safety', 'bypass safety', 'ignore safety', 'skip safety']) {
        expect(text.includes(bad)).toBe(false);
      }
    }
  });
});

describe('Phase 3-3 §14 — Phase 3 vs Phase 4 separation', () => {
  it('no candidate metadata contains an affirmative selector/routing phrase', () => {
    const phase4 = [
      'select target',
      'target selected',
      'recommended action',
      'best option',
      'do this next',
      'take this route',
      'solve the trap',
      'exit plan',
      'diagnostic-to-action',
      'next move',
    ];
    for (const text of positiveMetadataStrings()) {
      const lower = text.toLowerCase();
      for (const p of phase4) expect(lower.includes(p)).toBe(false);
    }
  });

  it('the catalog forbiddenBehaviors declare strategy/target/action selection out of bounds', () => {
    for (const b of ['selecting strategy', 'selecting target', 'selecting action', 'routing the user']) {
      expect(catalog.forbiddenBehaviors).toContain(b);
    }
  });
});

// Type-only spot check (compile-time contract): a candidate's permission flags
// are literal false / true — a weakened flag would fail typecheck.
const _typeCheck: GuidedRecoveryMicroStepCandidate | undefined = candidates[0];
void _typeCheck;
