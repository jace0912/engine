// Phase 3-2 — Guided Recovery Copy Contract tests.
//
// Proves the copy contract is static + immutable, grants no display/runtime
// permission, contains no step library / prompts / dialogue, keeps reflection /
// handoff / closure fenced, preserves SafetyOverride priority and Phase 3↔4
// separation, and that its positive metadata strings are banned-phrase-clean
// (with a live negative control + near-collision positive controls). The new
// getter is distinct from the untouched Phase 3-0 boundary copy getter.

import { describe, expect, it } from 'vitest';
import * as copyModule from '../recovery/guidedRecoveryCopy';
import {
  getGuidedRecoveryStageCopyContract,
  type GuidedRecoveryStageCopyContract,
} from '../recovery/guidedRecoveryCopy';
// Phase 3-0 boundary copy getter — imported only to prove it is untouched.
import { getGuidedRecoveryCopyContract } from '../recovery/guidedRecoveryBoundary';

const contract: GuidedRecoveryStageCopyContract = getGuidedRecoveryStageCopyContract();

const FLAGGY = { displayPermissionGranted: false, runtimePermissionGranted: false, mustNotRecommend: true } as const;

function expectNoPermission(obj: {
  displayPermissionGranted: false;
  runtimePermissionGranted: false;
  mustNotRecommend: true;
}): void {
  expect(obj.displayPermissionGranted).toBe(false);
  expect(obj.runtimePermissionGranted).toBe(false);
  expect(obj.mustNotRecommend).toBe(true);
}

// Positive contract metadata only — frame texts, required qualifiers, stage
// purposes. Explicitly EXCLUDES bannedPhrases + forbiddenBehaviors + stage
// `forbidden` arrays (those legitimately name forbidden things).
function positiveMetadataStrings(): string[] {
  return [
    ...contract.approvedFrameExamples.map((f) => f.text),
    ...contract.requiredQualifiers,
    ...contract.stageRules.map((r) => r.purpose),
  ];
}

const scanFor = (banned: readonly string[]) => (s: string) =>
  banned.some((p) => s.toLowerCase().includes(p.toLowerCase()));

describe('Phase 3-2 §7 — contract shape, fixed getter, Phase 3-0 untouched', () => {
  it('getGuidedRecoveryStageCopyContract() exists and returns a contract', () => {
    expect(typeof getGuidedRecoveryStageCopyContract).toBe('function');
    expect(contract.version.length).toBeGreaterThan(0);
    expect(Array.isArray(contract.approvedFrameExamples)).toBe(true);
    expect(Array.isArray(contract.stageRules)).toBe(true);
  });

  it('does NOT export a duplicate getGuidedRecoveryCopyContract', () => {
    expect((copyModule as Record<string, unknown>).getGuidedRecoveryCopyContract).toBeUndefined();
  });

  it('the Phase 3-0 boundary getGuidedRecoveryCopyContract() remains intact and distinct', () => {
    const boundaryContract = getGuidedRecoveryCopyContract();
    expect(typeof getGuidedRecoveryCopyContract).toBe('function');
    // It still returns its own banned-phrase-bearing contract...
    expect(Array.isArray(boundaryContract.bannedPhrases)).toBe(true);
    // ...and is a different object than the Phase 3-2 stage copy contract.
    expect((boundaryContract as unknown) !== (contract as unknown)).toBe(true);
    expect(boundaryContract).not.toHaveProperty('stageRules');
    expect(boundaryContract).not.toHaveProperty('approvedFrameExamples');
  });

  it('returns a deep-frozen, stable singleton', () => {
    expect(getGuidedRecoveryStageCopyContract()).toBe(getGuidedRecoveryStageCopyContract());
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.approvedFrameExamples)).toBe(true);
    expect(Object.isFrozen(contract.approvedFrameExamples[0])).toBe(true);
    expect(Object.isFrozen(contract.stageRules)).toBe(true);
    expect(Object.isFrozen(contract.bannedPhrases)).toBe(true);
  });

  it('contract, every frame example, and every stage rule grant no display/runtime permission', () => {
    expectNoPermission(contract);
    for (const f of contract.approvedFrameExamples) expectNoPermission(f);
    for (const r of contract.stageRules) expectNoPermission(r);
  });

  it('frame examples are tagged with the approved categories only', () => {
    const allowed = new Set([
      'orientation',
      'capacity',
      'safety_boundary',
      'uncertainty',
      'mode_separation',
      'handoff',
      'closure',
    ]);
    for (const f of contract.approvedFrameExamples) expect(allowed.has(f.category)).toBe(true);
    // At least the safety_boundary and mode_separation categories are present.
    const cats = new Set(contract.approvedFrameExamples.map((f) => f.category));
    expect(cats.has('safety_boundary')).toBe(true);
    expect(cats.has('mode_separation')).toBe(true);
  });
});

describe('Phase 3-2 §8 — no step library, prompts, or dialogue keys', () => {
  const FORBIDDEN_KEYS = [
    'steps',
    'microSteps',
    'recoverySteps',
    'stepLibrary',
    'catalog',
    'moveCatalog',
    'actionCatalog',
    'instructions',
    'exercises',
    'copingTechniques',
    'prompts',
    'reflectionPrompts',
    'journalingPrompts',
    'questions',
    'dialogue',
    'userFacingDialogue',
  ];

  it('the contract exposes none of the forbidden keys', () => {
    for (const k of FORBIDDEN_KEYS) expect(contract).not.toHaveProperty(k);
  });

  it('no frame example or stage rule exposes a forbidden key', () => {
    for (const f of contract.approvedFrameExamples) for (const k of FORBIDDEN_KEYS) expect(f).not.toHaveProperty(k);
    for (const r of contract.stageRules) for (const k of FORBIDDEN_KEYS) expect(r).not.toHaveProperty(k);
  });

  it('the module exports no step/prompt/dialogue builder', () => {
    for (const name of [
      'buildRecoveryDialogue',
      'generateRecoveryPrompt',
      'formatGuidedRecoveryScreen',
      'renderGuidedRecoveryCopy',
      'nextRecoveryStep',
      'recommendRecoveryStep',
      'chooseRecoveryAction',
    ]) {
      expect((copyModule as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});

describe('Phase 3-2 §9 — safe-language scan over POSITIVE metadata only', () => {
  const scan = scanFor(contract.bannedPhrases);

  it('no positive metadata string contains any banned phrase', () => {
    for (const text of positiveMetadataStrings()) expect(scan(text)).toBe(false);
  });

  it('negative control — the scanner flags an injected banned phrase', () => {
    expect(scan('a safe neutral capacity-stabilization label')).toBe(false);
    expect(scan('please taper your medication and process your trauma')).toBe(true);
    expect(contract.bannedPhrases).toContain('taper');
    expect(contract.bannedPhrases).toContain('process your trauma');
  });

  it('near-collision positive controls survive (no exact banned phrase present)', () => {
    expect(scan('This copy does not choose a strategy, target, route, or action.')).toBe(false);
    expect(scan('Handoff language must not recommend a next mode or action.')).toBe(false);
    // The near-miss banned phrases really are in the list (so the survival is meaningful).
    expect(contract.bannedPhrases).toContain('choose strategy');
    expect(contract.bannedPhrases).toContain('recommended action');
  });

  it('approved safe frame examples all survive the scanner', () => {
    for (const f of contract.approvedFrameExamples) expect(scan(f.text)).toBe(false);
  });
});

describe('Phase 3-2 §6 — expanded treatment-verb coverage in bannedPhrases', () => {
  it('includes the expanded treatment verbs', () => {
    for (const phrase of [
      'discontinue',
      'titrate',
      'taper',
      'wean',
      'switch medication',
      'switch treatment',
      'change treatment',
      'adjust treatment',
      'reduce treatment',
      'increase treatment',
    ]) {
      expect(contract.bannedPhrases).toContain(phrase);
    }
  });

  it('includes a representative phrase from every banned category', () => {
    for (const phrase of [
      'select target', // strategy/selector
      'the trap is', // diagnostic
      'exposure therapy', // therapy
      'process your trauma', // therapy/processing
      'medication', // medical
      'how do you feel', // reflection/journaling
      'take a breath', // instruction/step
      'no way out', // terminal
    ]) {
      expect(contract.bannedPhrases).toContain(phrase);
    }
  });
});

describe('Phase 3-2 §10 — reflection stage is extra fenced', () => {
  const reflection = contract.stageRules.find((r) => r.stage === 'reflection');

  it('the reflection rule exists and forbids therapy-adjacent content', () => {
    expect(reflection).toBeDefined();
    for (const f of [
      'reflection questions',
      'journaling prompts',
      'how do you feel framing',
      'trauma processing',
      'emotional processing',
      'meaning-making prompts',
      'therapy-like interpretation',
      'clinical framing',
    ]) {
      expect(reflection?.forbidden).toContain(f);
    }
    // also forbids exercises / coping techniques (from the shared base)
    expect(reflection?.forbidden).toContain('exercises');
    expect(reflection?.forbidden).toContain('coping techniques');
  });

  it('the reflection rule contains no actual question text', () => {
    const strings = [reflection?.purpose ?? '', ...(reflection?.allowedFrameCategories ?? [])];
    for (const s of strings) expect(s.includes('?')).toBe(false);
    expect(reflection?.purpose.toLowerCase()).toContain('non-therapeutic');
  });
});

describe('Phase 3-2 §11 — handoff and closure are fenced', () => {
  const handoff = contract.stageRules.find((r) => r.stage === 'handoff');
  const closed = contract.stageRules.find((r) => r.stage === 'closed');

  it('handoff forbids recommending, routing, and pointing toward later modes/actions', () => {
    for (const f of [
      'recommending',
      'routing',
      'preparing the user for Strategy Mode',
      'pointing toward Strategy Mode',
      'pointing toward target selection',
      'pointing toward next action',
      'pointing toward next mode',
      'pointing toward any later mode',
    ]) {
      expect(handoff?.forbidden).toContain(f);
    }
  });

  it('closure forbids implying resolution/success/healing/readiness/safety/completion/stability', () => {
    for (const f of [
      'implying resolution',
      'implying success',
      'implying healing',
      'implying readiness',
      'implying safety',
      'implying completion',
      'implying stability',
    ]) {
      expect(closed?.forbidden).toContain(f);
    }
  });
});

describe('Phase 3-2 §12 — SafetyOverride priority preserved in copy', () => {
  it('a safety_boundary frame exists and grants no permission', () => {
    const safety = contract.approvedFrameExamples.filter((f) => f.category === 'safety_boundary');
    expect(safety.length).toBeGreaterThan(0);
    for (const f of safety) expectNoPermission(f);
  });

  it('copy preserves SafetyOverride priority and does not soften or bypass it', () => {
    const joined = [
      ...contract.approvedFrameExamples.map((f) => f.text),
      ...contract.requiredQualifiers,
    ]
      .join('\n')
      .toLowerCase();
    expect(joined).toContain('safetyoverride remains higher priority');
    expect(joined).toContain('guided recovery is unavailable');
    // No softening / override language.
    for (const bad of [
      'guided recovery can override',
      'override safety',
      'bypass safety',
      'ignore safety',
      'skip safety',
    ]) {
      expect(joined).not.toContain(bad);
    }
  });
});

describe('Phase 3-2 §13 — Phase 3 vs Phase 4 separation', () => {
  it('positive metadata includes no AFFIRMATIVE Phase-4 selector / routing phrase', () => {
    // Affirmative phrases only — descriptive terms like "strategy selection"
    // legitimately appear in disclaiming qualifiers ("not strategy selection"),
    // so they are asserted via forbiddenBehaviors below, not by substring scan.
    const affirmative = [
      'select target',
      'target selected',
      'recommended action',
      'best option',
      'do this next',
      'take this route',
      'solve the trap',
      'exit plan',
      'diagnostic-to-action',
    ];
    const scan = scanFor(affirmative);
    for (const text of positiveMetadataStrings()) expect(scan(text)).toBe(false);
  });

  it('the contract explicitly forbids Phase-4 selection / routing behaviors', () => {
    for (const b of [
      'selecting strategy',
      'selecting target',
      'selecting action',
      'routing the user',
      'pointing toward Strategy Mode',
      'pointing toward next action',
      'pointing toward next mode',
    ]) {
      expect(contract.forbiddenBehaviors).toContain(b);
    }
  });

  it('the module exports no selector / transition / step function', () => {
    for (const name of [
      'selectTarget',
      'chooseAction',
      'recommendNextMove',
      'nextRecoveryStep',
      'recommendRecoveryStep',
      'chooseRecoveryAction',
    ]) {
      expect((copyModule as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});

describe('Phase 3-2 §metadata — frame text documented as non-display', () => {
  it('exposes flag-only frames whose text is metadata (the type carries the not-display contract)', () => {
    // Spot-check the literal-false flag shape is exactly the documented contract.
    for (const f of contract.approvedFrameExamples) {
      expect(Object.keys(f).sort()).toEqual(
        ['category', 'displayPermissionGranted', 'id', 'mustNotRecommend', 'runtimePermissionGranted', 'text'].sort(),
      );
      expect(f).toMatchObject(FLAGGY);
    }
  });
});
