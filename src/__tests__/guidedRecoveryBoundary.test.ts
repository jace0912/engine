// Phase 3-0 — Guided Recovery Boundary Scaffold tests.
//
// Proves the boundary evaluator returns *permission only* under strict
// precedence (SafetyOverride > survival state > capacity > intent), that the
// return booleans are total + consistent on every branch, that SafetyOverride
// is supreme, that Phase 3 stays separate from Phase 4 (blocks strategy intent
// but never fulfils it), and that the static copy contract carries no step
// library and no banned phrases.

import { describe, expect, it } from 'vitest';
import * as boundaryModule from '../recovery/guidedRecoveryBoundary';
import {
  evaluateGuidedRecoveryBoundary,
  getGuidedRecoveryCopyContract,
  type GuidedRecoveryBoundaryDecision,
  type GuidedRecoveryBoundaryInput,
} from '../recovery/guidedRecoveryBoundary';

// The canonical "allowed" input: stable recovery footing, sufficient capacity,
// no danger, stabilizing intent.
const ALLOWED_BASE: GuidedRecoveryBoundaryInput = {
  safetyOverrideActive: false,
  currentMode: 'survival',
  survivalState: 'recovery',
  capacityBand: 'recovering',
  successfulMovesInARow: 2,
  userIntent: 'stabilize',
};

const MUST_NOT_KEYS = [
  'mustNotDiagnose',
  'mustNotRecommend',
  'mustNotSelectStrategy',
  'mustNotGiveTreatmentInstruction',
  'mustNotActAsTherapy',
] as const;

function expectAllMustNots(d: GuidedRecoveryBoundaryDecision): void {
  for (const key of MUST_NOT_KEYS) expect(d[key]).toBe(true);
}

describe('Phase 3-0 §entry — the one allowing combination', () => {
  it('allows only stable recovery + moves>=2 + recovering/stable capacity + no danger + stabilize/unknown', () => {
    const d = evaluateGuidedRecoveryBoundary(ALLOWED_BASE);
    expect(d.allowed).toBe(true);
    expect(d.status).toBe('allowed');
    expect(d.mayShowGuidedRecovery).toBe(true);
    expect(d.mustStayInSurvival).toBe(false);
    expect(d.mustUseSafetyOverride).toBe(false);
    expectAllMustNots(d);
  });

  it('allows the stable capacity band and the unknown intent too', () => {
    expect(evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, capacityBand: 'stable' }).allowed).toBe(true);
    expect(evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, userIntent: 'unknown' }).allowed).toBe(true);
    expect(evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, successfulMovesInARow: 5 }).allowed).toBe(true);
  });

  it('even an allowed decision still carries every mustNot* guarantee', () => {
    const d = evaluateGuidedRecoveryBoundary(ALLOWED_BASE);
    expect(d.allowed).toBe(true);
    expect(d.mustNotDiagnose).toBe(true);
    expect(d.mustNotRecommend).toBe(true);
    expect(d.mustNotSelectStrategy).toBe(true);
    expect(d.mustNotGiveTreatmentInstruction).toBe(true);
    expect(d.mustNotActAsTherapy).toBe(true);
  });
});

describe('Phase 3-0 §6 — SafetyOverride is supreme', () => {
  it('SafetyOverride active always blocks, with the safety status + flags', () => {
    const d = evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, safetyOverrideActive: true });
    expect(d.allowed).toBe(false);
    expect(d.status).toBe('blocked_by_safety_override');
    expect(d.mustUseSafetyOverride).toBe(true);
    expect(d.mustStayInSurvival).toBe(true);
    expect(d.mayShowGuidedRecovery).toBe(false);
    expectAllMustNots(d);
  });

  it('SafetyOverride wins even when every other field would otherwise allow', () => {
    // ALLOWED_BASE would allow; flipping only safety must flip the whole result.
    const d = evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, safetyOverrideActive: true });
    expect(d.status).toBe('blocked_by_safety_override');
  });

  it('SafetyOverride wins even when MANY other blockers are simultaneously present', () => {
    const d = evaluateGuidedRecoveryBoundary({
      safetyOverrideActive: true,
      currentMode: 'survival',
      survivalState: 'zcfm', // would block
      capacityBand: 'zero', // would block
      successfulMovesInARow: 0, // would block
      userIntent: 'medical_or_treatment', // would block
    });
    expect(d.status).toBe('blocked_by_safety_override');
    expect(d.mustUseSafetyOverride).toBe(true);
  });

  it('no other input combination produces blocked_by_safety_override, and none sets mustUseSafetyOverride', () => {
    const survivalStates = ['normal', 'zcfm', 'immobile', 'windowDetection', 'recovery'] as const;
    const bands = ['zero', 'low', 'recovering', 'stable', 'high'] as const;
    const intents = ['stabilize', 'diagnose', 'strategy', 'medical_or_treatment', 'unknown'] as const;
    for (const survivalState of survivalStates) {
      for (const capacityBand of bands) {
        for (const userIntent of intents) {
          for (const successfulMovesInARow of [0, 2]) {
            const d = evaluateGuidedRecoveryBoundary({
              safetyOverrideActive: false,
              currentMode: 'survival',
              survivalState,
              capacityBand,
              successfulMovesInARow,
              userIntent,
            });
            expect(d.status).not.toBe('blocked_by_safety_override');
            expect(d.mustUseSafetyOverride).toBe(false);
          }
        }
      }
    }
  });
});

describe('Phase 3-0 §entry — survival-state and moves blocks', () => {
  it.each(['normal', 'zcfm', 'immobile', 'windowDetection'] as const)(
    'survivalState %s blocks Guided Recovery',
    (survivalState) => {
      const d = evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, survivalState });
      expect(d.allowed).toBe(false);
      expect(d.status).toBe('blocked_by_survival_not_stable');
    },
  );

  it('survivalState recovery with successfulMovesInARow < 2 blocks', () => {
    const d = evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, successfulMovesInARow: 1 });
    expect(d.allowed).toBe(false);
    expect(d.status).toBe('blocked_by_survival_not_stable');
  });

  it('missing successfulMovesInARow is treated as < 2 (safe block)', () => {
    const { successfulMovesInARow: _omit, ...noMoves } = ALLOWED_BASE;
    const d = evaluateGuidedRecoveryBoundary(noMoves);
    expect(d.allowed).toBe(false);
    expect(d.status).toBe('blocked_by_survival_not_stable');
  });
});

describe('Phase 3-0 §entry — capacity-band blocks', () => {
  it.each(['zero', 'low'] as const)('capacityBand %s blocks with blocked_by_insufficient_capacity', (capacityBand) => {
    const d = evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, capacityBand });
    expect(d.allowed).toBe(false);
    expect(d.status).toBe('blocked_by_insufficient_capacity');
  });

  it('capacityBand high blocks with blocked_by_excess_capacity_strategy_band', () => {
    const d = evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, capacityBand: 'high' });
    expect(d.allowed).toBe(false);
    expect(d.status).toBe('blocked_by_excess_capacity_strategy_band');
  });

  it('missing capacityBand is treated as insufficient (safe block)', () => {
    const { capacityBand: _omit, ...noBand } = ALLOWED_BASE;
    const d = evaluateGuidedRecoveryBoundary(noBand);
    expect(d.allowed).toBe(false);
    expect(d.status).toBe('blocked_by_insufficient_capacity');
  });
});

describe('Phase 3-0 §entry — intent blocks with distinct statuses', () => {
  it('diagnose intent → blocked_by_diagnose_request', () => {
    expect(evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, userIntent: 'diagnose' }).status).toBe(
      'blocked_by_diagnose_request',
    );
  });
  it('strategy intent → blocked_by_strategy_request', () => {
    expect(evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, userIntent: 'strategy' }).status).toBe(
      'blocked_by_strategy_request',
    );
  });
  it('medical_or_treatment intent → blocked_by_medical_or_treatment_request', () => {
    expect(evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, userIntent: 'medical_or_treatment' }).status).toBe(
      'blocked_by_medical_or_treatment_request',
    );
  });
});

describe('Phase 3-0 §return-contract — totals are consistent on every branch', () => {
  // A representative decision for each reachable status.
  const samples: GuidedRecoveryBoundaryInput[] = [
    ALLOWED_BASE, // allowed
    { ...ALLOWED_BASE, safetyOverrideActive: true }, // safety
    { ...ALLOWED_BASE, survivalState: 'normal' }, // survival not stable
    { ...ALLOWED_BASE, successfulMovesInARow: 0 }, // survival not stable (moves)
    { ...ALLOWED_BASE, capacityBand: 'zero' }, // insufficient capacity
    { ...ALLOWED_BASE, capacityBand: 'high' }, // excess capacity
    { ...ALLOWED_BASE, userIntent: 'diagnose' }, // diagnose
    { ...ALLOWED_BASE, userIntent: 'strategy' }, // strategy
    { ...ALLOWED_BASE, userIntent: 'medical_or_treatment' }, // medical
  ];

  it('mayShowGuidedRecovery always equals allowed', () => {
    for (const input of samples) {
      const d = evaluateGuidedRecoveryBoundary(input);
      expect(d.mayShowGuidedRecovery).toBe(d.allowed);
    }
  });

  it('mustStayInSurvival is true whenever allowed is false (and false when allowed)', () => {
    for (const input of samples) {
      const d = evaluateGuidedRecoveryBoundary(input);
      expect(d.mustStayInSurvival).toBe(!d.allowed);
    }
  });

  it('mustUseSafetyOverride is true iff status is blocked_by_safety_override', () => {
    for (const input of samples) {
      const d = evaluateGuidedRecoveryBoundary(input);
      expect(d.mustUseSafetyOverride).toBe(d.status === 'blocked_by_safety_override');
    }
  });

  it('every branch — allowed or blocked — carries all mustNot* flags as true', () => {
    for (const input of samples) {
      expectAllMustNots(evaluateGuidedRecoveryBoundary(input));
    }
  });

  it('every branch returns a non-empty reason string', () => {
    for (const input of samples) {
      const d = evaluateGuidedRecoveryBoundary(input);
      expect(typeof d.reason).toBe('string');
      expect(d.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('Phase 3-0 §7 — Phase 3 stays separate from Phase 4 (blocks strategy, never fulfils it)', () => {
  it('strategy intent is blocked, not fulfilled — the decision offers no strategy/target field', () => {
    const d = evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, userIntent: 'strategy' });
    expect(d.allowed).toBe(false);
    expect(d.status).toBe('blocked_by_strategy_request');
    expect(d.mustNotSelectStrategy).toBe(true);
    // The decision shape carries no selected strategy / target / action.
    for (const key of ['strategy', 'selectedStrategy', 'target', 'selectedTarget', 'action', 'nextMove', 'recommendation']) {
      expect(d).not.toHaveProperty(key);
    }
  });

  it('high capacity is blocked here, never routed into strategy', () => {
    const d = evaluateGuidedRecoveryBoundary({ ...ALLOWED_BASE, capacityBand: 'high' });
    expect(d.allowed).toBe(false);
    expect(d.status).toBe('blocked_by_excess_capacity_strategy_band');
    expect(d).not.toHaveProperty('strategy');
  });

  it('the module exports no selector / action / strategy function', () => {
    for (const name of ['selectTarget', 'chooseAction', 'recommendNextMove', 'chooseStrategy', 'selectStrategy', 'recommendAction']) {
      expect((boundaryModule as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});

describe('Phase 3-0 §8 — safe-language ceiling (no banned phrase in any display copy)', () => {
  const contract = getGuidedRecoveryCopyContract();

  // Display strings = allowedFrames + each framing rule's label/text. Excludes
  // bannedPhrases (metadata).
  function displayStrings(): string[] {
    const out = [...contract.allowedFrames];
    for (const rule of Object.values(contract.framing)) out.push(rule.label, rule.text);
    return out;
  }

  it('no display string contains any banned phrase', () => {
    for (const text of displayStrings()) {
      const lower = text.toLowerCase();
      for (const phrase of contract.bannedPhrases) {
        expect(lower.includes(phrase.toLowerCase())).toBe(false);
      }
    }
  });

  it('each allowed example phrase survives the banned-phrase scan', () => {
    const examples = [
      'This is a recovery space, not strategy mode.',
      'The goal is to stabilize capacity before making larger decisions.',
      'We are not choosing a strategy here.',
      'If danger is present, SafetyOverride takes priority.',
      'If capacity drops, return to Survival Mode.',
      'This should stay small enough to stop safely.',
    ];
    for (const text of examples) {
      expect(contract.allowedFrames).toContain(text);
      const lower = text.toLowerCase();
      for (const phrase of contract.bannedPhrases) {
        expect(lower.includes(phrase.toLowerCase())).toBe(false);
      }
    }
  });

  it('"We are not choosing a strategy here." does NOT trip the banned "choose strategy"', () => {
    const phrase = 'We are not choosing a strategy here.';
    expect(contract.bannedPhrases).toContain('choose strategy');
    expect(phrase.toLowerCase().includes('choose strategy')).toBe(false);
  });

  it('bannedPhrases declares a representative phrase from each banned category', () => {
    for (const phrase of [
      'choose strategy', // strategy/selector
      'select target',
      'the trap is', // diagnostic conclusion
      'this is no-exit',
      'exposure therapy', // therapy-like
      'guaranteed recovery',
      'medication', // medical/treatment
      'taper',
      'discontinue',
      'titrate',
      'no way out', // terminal/hopeless
      'hopeless',
    ]) {
      expect(contract.bannedPhrases).toContain(phrase);
    }
  });

  it('the evaluator reason strings also stay clean of banned phrases', () => {
    const inputs: GuidedRecoveryBoundaryInput[] = [
      ALLOWED_BASE,
      { ...ALLOWED_BASE, safetyOverrideActive: true },
      { ...ALLOWED_BASE, survivalState: 'normal' },
      { ...ALLOWED_BASE, successfulMovesInARow: 0 },
      { ...ALLOWED_BASE, capacityBand: 'zero' },
      { ...ALLOWED_BASE, capacityBand: 'high' },
      { ...ALLOWED_BASE, userIntent: 'diagnose' },
      { ...ALLOWED_BASE, userIntent: 'strategy' },
      { ...ALLOWED_BASE, userIntent: 'medical_or_treatment' },
    ];
    for (const input of inputs) {
      const lower = evaluateGuidedRecoveryBoundary(input).reason.toLowerCase();
      for (const phrase of contract.bannedPhrases) {
        expect(lower.includes(phrase.toLowerCase())).toBe(false);
      }
    }
  });
});

describe('Phase 3-0 §copy — static framing only, no step library, no display permission', () => {
  const contract = getGuidedRecoveryCopyContract();

  it('grants no display permission and never recommends (contract + every rule)', () => {
    expect(contract.displayPermissionGranted).toBe(false);
    expect(contract.mustNotRecommend).toBe(true);
    for (const rule of Object.values(contract.framing)) {
      expect(rule.displayPermissionGranted).toBe(false);
      expect(rule.mustNotRecommend).toBe(true);
    }
  });

  it('contains no concrete recovery-step library / micro-step catalog', () => {
    for (const key of ['steps', 'microSteps', 'recoverySteps', 'stepLibrary', 'catalog', 'moves', 'actions', 'instructions']) {
      expect(contract).not.toHaveProperty(key);
    }
    // Framing rules are short static fragments, not enumerated step lists.
    for (const rule of Object.values(contract.framing)) {
      expect(rule).not.toHaveProperty('steps');
      expect(rule).not.toHaveProperty('action');
    }
  });

  it('is deeply frozen and a stable singleton', () => {
    expect(getGuidedRecoveryCopyContract()).toBe(getGuidedRecoveryCopyContract());
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.framing)).toBe(true);
    expect(Object.isFrozen(contract.bannedPhrases)).toBe(true);
  });
});

describe('Phase 3-0 §purity — deterministic evaluator', () => {
  it('is deterministic: same input → deeply-equal decision', () => {
    expect(evaluateGuidedRecoveryBoundary(ALLOWED_BASE)).toEqual(evaluateGuidedRecoveryBoundary(ALLOWED_BASE));
    const blockedInput = { ...ALLOWED_BASE, safetyOverrideActive: true };
    expect(evaluateGuidedRecoveryBoundary(blockedInput)).toEqual(evaluateGuidedRecoveryBoundary(blockedInput));
  });

  it('does not mutate its input', () => {
    const input: GuidedRecoveryBoundaryInput = { ...ALLOWED_BASE };
    const snapshot = JSON.stringify(input);
    evaluateGuidedRecoveryBoundary(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
