// Phase 3-1 — Guided Recovery Type / State Foundation tests.
//
// Proves the state shape is foundation-only: stage/status unions are closed, the
// allowed-only factory never produces an available/active state from a blocked
// entry status, boundary flags stay literal true, permission flags stay false,
// no step library / free-form notes / Phase-4 keys exist, stage metadata is
// abstract + banned-phrase-clean (with a live negative control), and everything
// is pure + deterministic.

import { describe, expect, it } from 'vitest';
import * as stateModule from '../recovery/guidedRecoveryState';
import {
  GUIDED_RECOVERY_STAGES,
  GUIDED_RECOVERY_STATUSES,
  createAvailableGuidedRecoveryState,
  createInactiveGuidedRecoveryState,
  getGuidedRecoveryStageDefinitions,
  isGuidedRecoveryState,
  type GuidedRecoveryState,
} from '../recovery/guidedRecoveryState';
// Reuse the Phase 3-0 banned-phrase reference list so categories stay aligned
// with Phase 2B-6. (Test-only runtime import; never imported by the state module.)
import { getGuidedRecoveryCopyContract } from '../recovery/guidedRecoveryBoundary';

const BLOCKED_ENTRY_STATUSES = [
  'blocked_by_safety_override',
  'blocked_by_survival_not_stable',
  'blocked_by_insufficient_capacity',
  'blocked_by_excess_capacity_strategy_band',
  'blocked_by_missing_intent',
  'blocked_by_diagnose_request',
  'blocked_by_strategy_request',
  'blocked_by_medical_or_treatment_request',
] as const;

const BOUNDARY_FLAG_KEYS = [
  'mustNotDiagnose',
  'mustNotRecommend',
  'mustNotSelectStrategy',
  'mustNotGiveTreatmentInstruction',
  'mustNotActAsTherapy',
  'mustStayEvidenceBounded',
  'mustRemainCapacityFocused',
] as const;

function expectFlagsIntact(s: GuidedRecoveryState): void {
  for (const k of BOUNDARY_FLAG_KEYS) expect(s.boundaryFlags[k]).toBe(true);
  expect(s.permissionFlags.displayPermissionGranted).toBe(false);
  expect(s.permissionFlags.runtimePermissionGranted).toBe(false);
  expect(s.permissionFlags.mustNotRecommend).toBe(true);
}

describe('Phase 3-1 §shape — stage/status unions are closed', () => {
  it('GuidedRecoveryStage contains exactly the allowed stage labels', () => {
    expect([...GUIDED_RECOVERY_STAGES]).toEqual([
      'not_started',
      'orientation',
      'capacity_check',
      'stabilization',
      'reflection',
      'handoff',
      'closed',
    ]);
  });

  it('GuidedRecoveryStatus contains exactly the allowed status values', () => {
    expect([...GUIDED_RECOVERY_STATUSES]).toEqual([
      'inactive',
      'available',
      'active',
      'paused',
      'blocked_by_safety_override',
      'closed',
    ]);
  });

  it('"active" and "paused" exist only as reserved values', () => {
    expect(GUIDED_RECOVERY_STATUSES).toContain('active');
    expect(GUIDED_RECOVERY_STATUSES).toContain('paused');
  });

  it('isGuidedRecoveryState validates structurally', () => {
    expect(isGuidedRecoveryState(createInactiveGuidedRecoveryState())).toBe(true);
    expect(isGuidedRecoveryState(createAvailableGuidedRecoveryState({ entryStatus: 'allowed' }))).toBe(true);
    expect(isGuidedRecoveryState(null)).toBe(false);
    expect(isGuidedRecoveryState({})).toBe(false);
    expect(isGuidedRecoveryState({ status: 'made_up', stage: 'orientation' })).toBe(false);
  });
});

describe('Phase 3-1 §factory — inactive default + allowed-only invariant', () => {
  it('createInactiveGuidedRecoveryState is inactive / not_started with flags intact', () => {
    const s = createInactiveGuidedRecoveryState();
    expect(s.status).toBe('inactive');
    expect(s.stage).toBe('not_started');
    expectFlagsIntact(s);
  });

  it('createAvailableGuidedRecoveryState returns available ONLY from entryStatus "allowed"', () => {
    const s = createAvailableGuidedRecoveryState({ entryStatus: 'allowed' });
    expect(s.status).toBe('available');
    expect(s.stage).toBe('orientation');
    expect(s.entryStatus).toBe('allowed');
    expectFlagsIntact(s);
  });

  it.each(BLOCKED_ENTRY_STATUSES)(
    'blocked entry status %s cannot create available or active state',
    (entryStatus) => {
      const s = createAvailableGuidedRecoveryState({ entryStatus });
      expect(s.status).not.toBe('available');
      expect(s.status).not.toBe('active');
      expect(s.status).not.toBe('paused');
      expect(s.entryStatus).toBe(entryStatus); // entryStatus preserved
      expectFlagsIntact(s);
    },
  );

  it('safety-override entry status maps to the blocked_by_safety_override status', () => {
    const s = createAvailableGuidedRecoveryState({ entryStatus: 'blocked_by_safety_override' });
    expect(s.status).toBe('blocked_by_safety_override');
    expect(s.stage).toBe('not_started');
  });

  it('every other blocked entry status maps to a safe inactive status', () => {
    for (const entryStatus of BLOCKED_ENTRY_STATUSES.filter((e) => e !== 'blocked_by_safety_override')) {
      expect(createAvailableGuidedRecoveryState({ entryStatus }).status).toBe('inactive');
    }
  });

  it('no factory ever produces an "active" or "paused" state', () => {
    const states = [
      createInactiveGuidedRecoveryState(),
      createAvailableGuidedRecoveryState({ entryStatus: 'allowed' }),
      ...BLOCKED_ENTRY_STATUSES.map((entryStatus) => createAvailableGuidedRecoveryState({ entryStatus })),
    ];
    for (const s of states) {
      expect(s.status).not.toBe('active');
      expect(s.status).not.toBe('paused');
    }
  });

  it('optional entry slots are caller-supplied and passed through only when given', () => {
    const s = createAvailableGuidedRecoveryState({
      entryStatus: 'allowed',
      capacityBandAtEntry: 'stable',
      successfulMovesAtEntry: 3,
      startedAt: '2026-01-01T00:00:00.000Z',
      copyContractVersion: 'v-test',
    });
    expect(s.capacityBandAtEntry).toBe('stable');
    expect(s.successfulMovesAtEntry).toBe(3);
    expect(s.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(s.copyContractVersion).toBe('v-test');
    // Omitted optionals do not appear.
    expect(createAvailableGuidedRecoveryState({ entryStatus: 'allowed' })).not.toHaveProperty('startedAt');
  });
});

describe('Phase 3-1 §6 — SafetyOverride subordination', () => {
  const s = createAvailableGuidedRecoveryState({ entryStatus: 'blocked_by_safety_override' });

  it('a safety-override-blocked state is representable', () => {
    expect(s.status).toBe('blocked_by_safety_override');
    expect(isGuidedRecoveryState(s)).toBe(true);
  });

  it('boundary flags remain true under SafetyOverride', () => {
    for (const k of BOUNDARY_FLAG_KEYS) expect(s.boundaryFlags[k]).toBe(true);
  });

  it('permission flags remain false under SafetyOverride (no display/runtime grant)', () => {
    expect(s.permissionFlags.displayPermissionGranted).toBe(false);
    expect(s.permissionFlags.runtimePermissionGranted).toBe(false);
  });

  it('SafetyOverride state carries no recovery steps / actions', () => {
    for (const k of ['steps', 'recoverySteps', 'microSteps', 'action', 'instructions', 'protocol']) {
      expect(s).not.toHaveProperty(k);
    }
  });

  it('no helper can create active/available from a safety-override entry status', () => {
    expect(createAvailableGuidedRecoveryState({ entryStatus: 'blocked_by_safety_override' }).status).not.toBe('available');
    // No active/paused/enter/start helper exists at all.
    for (const name of [
      'createActiveGuidedRecoveryState',
      'createPausedGuidedRecoveryState',
      'enterGuidedRecovery',
      'startGuidedRecovery',
    ]) {
      expect((stateModule as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});

describe('Phase 3-1 §7 — separate from Phase 4 (no forbidden keys / exports)', () => {
  const states = [
    createInactiveGuidedRecoveryState(),
    createAvailableGuidedRecoveryState({ entryStatus: 'allowed' }),
    ...BLOCKED_ENTRY_STATUSES.map((entryStatus) => createAvailableGuidedRecoveryState({ entryStatus })),
  ];
  const FORBIDDEN_KEYS = [
    'strategy',
    'target',
    'selectedTarget',
    'selectedAction',
    'action',
    'recommendation',
    'recommendedAction',
    'nextMove',
    'route',
    'plan',
    'COR',
    'observatory',
    'diagnosticToAction',
    'instructions',
    'protocol',
    'notes', // no free-form text slot
    'steps',
    'microSteps',
    'recoverySteps',
    'catalog',
    'exercises',
  ];

  it('no state carries a forbidden Phase-4 / step / therapy / notes key', () => {
    for (const s of states) for (const k of FORBIDDEN_KEYS) expect(s).not.toHaveProperty(k);
  });

  it('no stage definition carries a forbidden key', () => {
    for (const def of Object.values(getGuidedRecoveryStageDefinitions())) {
      for (const k of FORBIDDEN_KEYS) expect(def).not.toHaveProperty(k);
    }
  });

  it('the module exports no selector / action / transition / step function', () => {
    for (const name of [
      'selectTarget',
      'chooseAction',
      'recommendNextMove',
      'nextRecoveryStep',
      'recommendRecoveryStep',
      'chooseRecoveryAction',
      'createActiveGuidedRecoveryState',
      'createPausedGuidedRecoveryState',
      'enterGuidedRecovery',
      'startGuidedRecovery',
    ]) {
      expect((stateModule as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});

describe('Phase 3-1 §stage — labels only, no permission, abstract', () => {
  const defs = getGuidedRecoveryStageDefinitions();

  it('a definition exists for every stage and grants no permission', () => {
    for (const stage of GUIDED_RECOVERY_STAGES) {
      const def = defs[stage];
      expect(def.stage).toBe(stage);
      expect(def.displayPermissionGranted).toBe(false);
      expect(def.runtimePermissionGranted).toBe(false);
      expect(def.mustNotRecommend).toBe(true);
      expect(def.purpose.length).toBeGreaterThan(0);
    }
  });

  it('stage metadata is deeply frozen (cannot be mutated into prompts at runtime)', () => {
    expect(Object.isFrozen(defs)).toBe(true);
    expect(Object.isFrozen(defs.orientation)).toBe(true);
    expect(Object.isFrozen(defs.orientation.forbidden)).toBe(true);
  });
});

describe('Phase 3-1 §9 — safe-language scan over state/stage metadata', () => {
  const banned = getGuidedRecoveryCopyContract().bannedPhrases;

  // Collect every metadata display string: stage purposes, allowed + forbidden
  // entries, the stage/status union values, and the default entryStatus strings.
  function metadataStrings(): string[] {
    const out: string[] = [...GUIDED_RECOVERY_STAGES, ...GUIDED_RECOVERY_STATUSES];
    for (const def of Object.values(getGuidedRecoveryStageDefinitions())) {
      out.push(def.stage, def.purpose, ...def.allowed, ...def.forbidden);
    }
    out.push(
      createInactiveGuidedRecoveryState().entryStatus,
      createAvailableGuidedRecoveryState({ entryStatus: 'allowed' }).entryStatus,
    );
    return out;
  }

  it('no state/stage metadata string contains any banned phrase', () => {
    for (const text of metadataStrings()) {
      const lower = text.toLowerCase();
      for (const phrase of banned) expect(lower.includes(phrase.toLowerCase())).toBe(false);
    }
  });

  it('negative control — the scanner flags a known banned phrase when injected', () => {
    const scan = (s: string) => banned.some((p) => s.toLowerCase().includes(p.toLowerCase()));
    expect(scan('a safe neutral capacity label')).toBe(false);
    expect(scan('please taper your medication and stop taking it')).toBe(true);
    expect(banned).toContain('taper');
    expect(banned).toContain('medication');
  });
});

describe('Phase 3-1 §purity — deterministic, no mutation', () => {
  it('factories are deterministic (deeply equal across calls)', () => {
    expect(createInactiveGuidedRecoveryState()).toEqual(createInactiveGuidedRecoveryState());
    expect(createAvailableGuidedRecoveryState({ entryStatus: 'allowed' })).toEqual(
      createAvailableGuidedRecoveryState({ entryStatus: 'allowed' }),
    );
  });

  it('each factory call returns a fresh object (independent flag instances)', () => {
    const a = createInactiveGuidedRecoveryState();
    const b = createInactiveGuidedRecoveryState();
    expect(a).not.toBe(b);
    expect(a.boundaryFlags).not.toBe(b.boundaryFlags);
  });

  it('does not mutate its input', () => {
    const input = { entryStatus: 'allowed' as const, successfulMovesAtEntry: 2 };
    const snapshot = JSON.stringify(input);
    createAvailableGuidedRecoveryState(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('stage definitions are a stable singleton', () => {
    expect(getGuidedRecoveryStageDefinitions()).toBe(getGuidedRecoveryStageDefinitions());
  });
});
