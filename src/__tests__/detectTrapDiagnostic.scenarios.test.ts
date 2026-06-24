import { describe, expect, it } from 'vitest';
import { detectTrapDiagnostic, type TrapDiagnosticProxyInput } from '../diagnostics/detectTrapDiagnostic';
import {
  ALL_SCENARIOS,
  MAIN_SCENARIOS,
  SCENARIO_NOW,
  type Scenario,
  ambiguousAdaptation,
  ambiguousCapacityConstraint,
  ambiguousEmpty,
  ambiguousInconclusiveMixed,
  ambiguousPremature,
  ambiguousUnsearched,
  backfiringAdaptation,
  backfiringAdherence,
  backfiringConfirmed,
  backfiringConfounded,
  backfiringDoseFit,
  backfiringSingleTimepoint,
  backfiringTooSoon,
  backfiringTwoTimepoints,
  competingDifferentCosts,
  competingValuationDependent,
  competingValuationNotMatter,
  competingValuationUnknown,
  modelMismatchAbsent,
  modelMismatchContradiction,
  modelMismatchStrong,
  modelMismatchTwo,
  modelMismatchWeak,
  noExitCapacityBlocked,
  noExitClean,
  noExitDelayedBlocked,
  noExitIncompleteEnumeration,
  noExitLowWitness,
  noExitPredictedSealed,
  noExitRefusedBlocked,
  noExitUnsearched,
  systemOverloadCascade,
  systemOverloadCount,
  systemOverloadMultiLabel,
} from '../diagnostics/diagnosticScenarios.fixtures';

const run = (s: Scenario) => detectTrapDiagnostic(s.input, SCENARIO_NOW);
const resultText = (r: ReturnType<typeof run>) =>
  [...r.evidenceNotes, r.recommendedNextDiagnosticStep ?? '', ...r.findings.flatMap((f) => f.evidenceNotes)]
    .join('\n')
    .toLowerCase();

describe('Scenario validation — NO_EXIT', () => {
  it('a clean sealed file returns NO_EXIT only as evidence-bounded / PROVISIONAL', () => {
    const r = run(noExitClean);
    expect(r.primaryState).toBe('NO_EXIT');
    expect(r.confidence).toBe('PROVISIONAL');
    expect(r.confidence).not.toBe('HIGH');
    const noExitFinding = r.findings.find((f) => f.verdict === 'NO_EXIT');
    expect(noExitFinding?.findingType).toBe('PROVISIONAL');
    expect(r.evidenceNotes.some((n) => n.includes('not about the world'))).toBe(true);
  });

  it.each([
    [noExitRefusedBlocked, 'refused'],
    [noExitDelayedBlocked, 'delayed'],
    [noExitCapacityBlocked, 'unreachable_by_capacity'],
    [noExitPredictedSealed, 'predicted_sealed'],
    [noExitIncompleteEnumeration, 'enumeration_incomplete'],
    [noExitLowWitness, 'witness_reliability_low'],
  ] as const)('%s blocks No-Exit', (scenario, blocker) => {
    const r = run(scenario);
    expect(r.primaryState).not.toBe('NO_EXIT');
    expect(r.blockedBy).toContain(blocker);
  });

  it('an unsearched door routes to UNMAPPED_ROOM and blocks No-Exit', () => {
    const r = run(noExitUnsearched);
    expect(r.primaryState).not.toBe('NO_EXIT');
    expect(r.intermediateVerdicts).toContain('UNMAPPED_ROOM');
    expect(r.blockedBy).toContain('unsearched');
  });
});

describe('Scenario validation — BACKFIRING', () => {
  it('one timepoint cannot return confirmed Backfiring', () => {
    const r = run(backfiringSingleTimepoint);
    expect(r.primaryState).not.toBe('BACKFIRING');
    expect(r.findings.some((f) => f.verdict === 'BACKFIRING')).toBe(false);
    expect(r.intermediateVerdicts).toContain('PREMATURE_ASSESSMENT');
    expect(r.blockedBy).toContain('single_timepoint');
  });

  it.each([
    [backfiringTooSoon, 'PREMATURE_ASSESSMENT'],
    [backfiringAdaptation, 'ADAPTATION_PHASE'],
    [backfiringDoseFit, 'DOSE_FIT_ISSUE'],
    [backfiringAdherence, 'UNEXECUTED_PROTOCOL'],
    [backfiringConfounded, 'INCONCLUSIVE'],
  ] as const)('%s routes to its rule-out buffer', (scenario, verdict) => {
    const r = run(scenario);
    expect(r.intermediateVerdicts).toContain(verdict);
    expect(r.primaryState).not.toBe('BACKFIRING');
  });

  it('multi-timepoint worsening + functional decline can return BACKFIRING provisionally', () => {
    const two = run(backfiringTwoTimepoints);
    expect(two.primaryState).toBe('BACKFIRING');
    expect(two.confidence).toBe('PROVISIONAL');

    const three = run(backfiringConfirmed);
    expect(three.primaryState).toBe('BACKFIRING');
    expect(['PROVISIONAL', 'MEDIUM']).toContain(three.confidence);
  });

  it('contains no treatment-change instruction', () => {
    const text = resultText(run(backfiringConfirmed));
    for (const phrase of ['stop treatment', 'start treatment', 'change treatment']) {
      expect(text).not.toContain(phrase);
    }
  });
});

describe('Scenario validation — MODEL_MISMATCH', () => {
  it('absent mismatch signals do not produce MODEL_MISMATCH', () => {
    const r = run(modelMismatchAbsent);
    expect(r.primaryState).not.toBe('MODEL_MISMATCH');
    expect(r.findings.some((f) => f.verdict === 'MODEL_MISMATCH')).toBe(false);
  });

  // Phase 2B-3 calibration: one weak signal annotates the file but cannot become
  // primary; two+ signals (or an explicit contradiction) are required to fire.
  it('one weak signal is a provisional concern only, never primary', () => {
    const r = run(modelMismatchWeak);
    expect(r.primaryState).not.toBe('MODEL_MISMATCH');
    const finding = r.findings.find((f) => f.verdict === 'MODEL_MISMATCH');
    expect(finding?.findingType).toBe('PROVISIONAL');
    expect(finding?.confidence).toBe('LOW');
  });

  it('two signals return MODEL_MISMATCH with MEDIUM confidence', () => {
    const r = run(modelMismatchTwo);
    expect(r.primaryState).toBe('MODEL_MISMATCH');
    expect(r.confidence).toBe('MEDIUM');
  });

  it('three or more signals return MODEL_MISMATCH with HIGH confidence', () => {
    const r = run(modelMismatchStrong);
    expect(r.primaryState).toBe('MODEL_MISMATCH');
    expect(r.confidence).toBe('HIGH');
  });

  it('an explicit stated-vs-observed contradiction returns MODEL_MISMATCH with HIGH confidence', () => {
    const r = run(modelMismatchContradiction);
    expect(r.primaryState).toBe('MODEL_MISMATCH');
    expect(r.confidence).toBe('HIGH');
  });
});

describe('Scenario validation — COMPETING_FAILURES', () => {
  it('functioning doors with different costs return COMPETING_FAILURES', () => {
    expect(run(competingDifferentCosts).primaryState).toBe('COMPETING_FAILURES');
  });

  it('valuation-dependent route differences are tagged VALUATION_DEPENDENT', () => {
    const r = run(competingValuationDependent);
    expect(r.primaryState).toBe('COMPETING_FAILURES');
    expect(r.findings.find((f) => f.verdict === 'COMPETING_FAILURES')?.findingType).toBe('VALUATION_DEPENDENT');
  });

  it.each([
    [competingValuationNotMatter],
    [competingValuationUnknown],
  ] as const)('route differences that do not matter / are unknown do not over-confirm', (scenario) => {
    const r = run(scenario);
    expect(r.primaryState).not.toBe('COMPETING_FAILURES');
    expect(r.intermediateVerdicts).toContain('INCONCLUSIVE');
  });
});

describe('Scenario validation — SYSTEM_OVERLOAD', () => {
  it('three active failure patterns trigger SYSTEM_OVERLOAD', () => {
    expect(run(systemOverloadCount).primaryState).toBe('SYSTEM_OVERLOAD');
  });

  it('strong cascade signals trigger SYSTEM_OVERLOAD', () => {
    expect(run(systemOverloadCascade).primaryState).toBe('SYSTEM_OVERLOAD');
  });

  it('overload coexists with secondary states (multi-label)', () => {
    const r = run(systemOverloadMultiLabel);
    expect(r.primaryState).toBe('SYSTEM_OVERLOAD');
    expect(r.secondaryStates).toContain('MODEL_MISMATCH');
    expect(r.secondaryStates).toContain('COMPETING_FAILURES');
  });
});

describe('Scenario validation — cross-state divergence (no collapse)', () => {
  it.each(MAIN_SCENARIOS)('the $state fixture yields primaryState $state', ({ state, scenario }) => {
    expect(run(scenario).primaryState).toBe(state);
  });

  it('the five main scenarios produce five distinct primary states', () => {
    const primaries = MAIN_SCENARIOS.map(({ scenario }) => run(scenario).primaryState);
    expect(new Set(primaries).size).toBe(5);
    expect(primaries).not.toContain(null);
  });
});

describe('Scenario validation — ambiguous cases stay intermediate (not forced into heavy states)', () => {
  it.each([
    [ambiguousUnsearched, 'UNMAPPED_ROOM'],
    [ambiguousCapacityConstraint, 'CAPACITY_CONSTRAINT'],
    [ambiguousPremature, 'PREMATURE_ASSESSMENT'],
    [ambiguousAdaptation, 'ADAPTATION_PHASE'],
    [ambiguousInconclusiveMixed, 'INCONCLUSIVE'],
    [ambiguousEmpty, 'INCONCLUSIVE'],
  ] as const)('%s -> intermediate %s with no heavy primaryState', (scenario, verdict) => {
    const r = run(scenario);
    expect(r.primaryState).toBeNull();
    expect(r.intermediateVerdicts).toContain(verdict);
  });
});

describe('Scenario validation — purity, determinism, language safety', () => {
  it('is deterministic across every fixture with a fixed now', () => {
    for (const scenario of ALL_SCENARIOS) {
      expect(run(scenario)).toEqual(run(scenario));
    }
  });

  it('does not mutate a frozen input (side-effect-free)', () => {
    const input: TrapDiagnosticProxyInput = { allKnownDoorsSealed: true, enumerationComplete: true };
    Object.freeze(input);
    expect(() => detectTrapDiagnostic(input, SCENARIO_NOW)).not.toThrow();
    expect(input).toEqual({ allKnownDoorsSealed: true, enumerationComplete: true });
  });

  it('emits no forbidden terminal or treatment-instruction language across all fixtures', () => {
    const banned = [
      'trapped',
      'no way out',
      'hopeless',
      'nothing you can do',
      'stuck forever',
      'this is the end',
      'stop looking universally',
      'stop treatment',
      'start treatment',
      'change treatment',
    ];
    for (const scenario of ALL_SCENARIOS) {
      const text = resultText(run(scenario));
      for (const phrase of banned) expect(text).not.toContain(phrase);
    }
  });
});
