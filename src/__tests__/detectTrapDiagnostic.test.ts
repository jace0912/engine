import { describe, expect, it } from 'vitest';
import {
  detectTrapDiagnostic,
  type TrapDiagnosticProxyInput,
} from '../diagnostics/detectTrapDiagnostic';

const NOW = '2026-01-01T00:00:00.000Z';
const run = (input: TrapDiagnosticProxyInput) => detectTrapDiagnostic(input, NOW);
const hasVerdict = (
  r: ReturnType<typeof run>,
  v: string,
): boolean => r.findings.some((f) => f.verdict === v);

describe('detectTrapDiagnostic — determinism', () => {
  it('is deterministic for the same input + now', () => {
    const input: TrapDiagnosticProxyInput = {
      modelMismatchSignals: 2,
      functioningDoorsWithDifferentCosts: true,
      activeFailurePatternCount: 3,
      actorScope: 'seat-1',
    };
    expect(run(input)).toEqual(run(input));
  });

  it('preserves actorScope', () => {
    expect(run({ actorScope: 'seat-7' }).actorScope).toBe('seat-7');
  });
});

describe('detectTrapDiagnostic — NO_EXIT safeguards', () => {
  it('returns only an evidence-bounded, PROVISIONAL No-Exit when fully sealed and enumerated', () => {
    const r = run({ allKnownDoorsSealed: true, enumerationComplete: true });
    expect(r.primaryState).toBe('NO_EXIT');
    expect(r.confidence).toBe('PROVISIONAL');
    expect(r.confidence).not.toBe('HIGH');
    expect(r.evidenceNotes.some((n) => n.includes('not about the world'))).toBe(true);
  });

  it('a refused door blocks No-Exit', () => {
    const r = run({ allKnownDoorsSealed: true, enumerationComplete: true, hasRefusedDoor: true });
    expect(r.primaryState).not.toBe('NO_EXIT');
    expect(r.blockedBy).toContain('refused');
  });

  it('a delayed door blocks No-Exit', () => {
    const r = run({ allKnownDoorsSealed: true, enumerationComplete: true, hasDelayedDoor: true });
    expect(r.primaryState).not.toBe('NO_EXIT');
    expect(r.blockedBy).toContain('delayed');
  });

  it('a capacity-blocked door blocks No-Exit', () => {
    const r = run({ allKnownDoorsSealed: true, enumerationComplete: true, hasCapacityBlockedDoor: true });
    expect(r.primaryState).not.toBe('NO_EXIT');
    expect(r.blockedBy).toContain('unreachable_by_capacity');
  });

  it('an unsearched door routes to UNMAPPED_ROOM and blocks No-Exit', () => {
    expect(run({ hasUnsearchedDoor: true }).intermediateVerdicts).toContain('UNMAPPED_ROOM');
    const r = run({ allKnownDoorsSealed: true, enumerationComplete: true, hasUnsearchedDoor: true });
    expect(r.primaryState).not.toBe('NO_EXIT');
    expect(r.blockedBy).toContain('unsearched');
  });

  it('a predicted-sealed door never counts toward No-Exit', () => {
    const r = run({ allKnownDoorsSealed: true, enumerationComplete: true, hasPredictedSealedDoor: true });
    expect(r.primaryState).not.toBe('NO_EXIT');
    expect(r.blockedBy).toContain('predicted_sealed');
  });

  it('low witness reliability caps No-Exit', () => {
    const r = run({ allKnownDoorsSealed: true, enumerationComplete: true, witnessReliabilityLow: true });
    expect(r.primaryState).not.toBe('NO_EXIT');
    expect(r.blockedBy).toContain('witness_reliability_low');
  });

  it('incomplete enumeration blocks No-Exit', () => {
    const r = run({ allKnownDoorsSealed: true, enumerationComplete: false });
    expect(r.primaryState).not.toBe('NO_EXIT');
    expect(r.blockedBy).toContain('enumeration_incomplete');
  });
});

describe('detectTrapDiagnostic — BACKFIRING safeguards', () => {
  it('cannot return Backfiring from a single time point', () => {
    const r = run({ harmIncreasingOverTime: true, functionDeclining: true, timepoints: 1 });
    expect(r.primaryState).not.toBe('BACKFIRING');
    expect(hasVerdict(r, 'BACKFIRING')).toBe(false);
    expect(r.intermediateVerdicts).toContain('PREMATURE_ASSESSMENT');
    expect(r.blockedBy).toContain('single_timepoint');
  });

  it('too-soon-to-judge routes to PREMATURE_ASSESSMENT', () => {
    expect(run({ interventionPresent: true, tooSoonToJudge: true }).intermediateVerdicts).toContain(
      'PREMATURE_ASSESSMENT',
    );
  });

  it('adaptation window routes to ADAPTATION_PHASE', () => {
    expect(
      run({ interventionPresent: true, insideExpectedAdaptationWindow: true }).intermediateVerdicts,
    ).toContain('ADAPTATION_PHASE');
  });

  it('dose/fit concern routes to DOSE_FIT_ISSUE', () => {
    expect(run({ interventionPresent: true, doseOrFitConcern: true }).intermediateVerdicts).toContain(
      'DOSE_FIT_ISSUE',
    );
  });

  it('adherence/execution issue routes to UNEXECUTED_PROTOCOL', () => {
    expect(
      run({ interventionPresent: true, adherenceOrExecutionIssue: true }).intermediateVerdicts,
    ).toContain('UNEXECUTED_PROTOCOL');
  });

  it('confounded worsening routes to INCONCLUSIVE, not Backfiring', () => {
    const r = run({
      harmIncreasingOverTime: true,
      functionDeclining: true,
      timepoints: 3,
      confoundedByOtherChange: true,
    });
    expect(r.intermediateVerdicts).toContain('INCONCLUSIVE');
    expect(r.primaryState).not.toBe('BACKFIRING');
  });

  it('multi-timepoint worsening with functional decline can return Backfiring provisionally', () => {
    const r = run({ harmIncreasingOverTime: true, functionDeclining: true, timepoints: 2 });
    expect(r.primaryState).toBe('BACKFIRING');
    expect(['PROVISIONAL', 'MEDIUM']).toContain(r.confidence);
  });
});

describe('detectTrapDiagnostic — other states', () => {
  it('model mismatch signals return MODEL_MISMATCH', () => {
    const r = run({ modelMismatchSignals: 2 });
    expect(r.primaryState).toBe('MODEL_MISMATCH');
    expect(r.confidence).toBe('MEDIUM');
  });

  it('functioning costly doors return COMPETING_FAILURES', () => {
    expect(run({ functioningDoorsWithDifferentCosts: true }).primaryState).toBe('COMPETING_FAILURES');
  });

  it('valuation-dependent route difference is tagged VALUATION_DEPENDENT', () => {
    const r = run({ identicalOutcomeDifferentRoutes: true, routeDifferencesMatterToActor: true });
    expect(r.primaryState).toBe('COMPETING_FAILURES');
    const finding = r.findings.find((f) => f.verdict === 'COMPETING_FAILURES');
    expect(finding?.findingType).toBe('VALUATION_DEPENDENT');
  });

  it('identical routes with unknown valuation are inconclusive', () => {
    const r = run({ identicalOutcomeDifferentRoutes: true });
    expect(r.primaryState).toBeNull();
    expect(r.intermediateVerdicts).toContain('INCONCLUSIVE');
  });

  it('three or more active failure patterns trigger SYSTEM_OVERLOAD', () => {
    expect(run({ activeFailurePatternCount: 3 }).primaryState).toBe('SYSTEM_OVERLOAD');
  });

  it('strong cascade signals trigger SYSTEM_OVERLOAD', () => {
    expect(run({ cascadeSignals: true }).primaryState).toBe('SYSTEM_OVERLOAD');
  });
});

describe('detectTrapDiagnostic — multi-label', () => {
  it('returns a primary plus secondary states without forcing a single result', () => {
    const r = run({
      modelMismatchSignals: 2,
      functioningDoorsWithDifferentCosts: true,
      activeFailurePatternCount: 3,
    });
    expect(r.primaryState).toBe('SYSTEM_OVERLOAD');
    expect(r.secondaryStates).toContain('MODEL_MISMATCH');
    expect(r.secondaryStates).toContain('COMPETING_FAILURES');
  });

  it('three simultaneous patterns raise SYSTEM_OVERLOAD via the simultaneity rule', () => {
    // Three genuinely fired core states. Phase 2B-3: a weak single MODEL_MISMATCH
    // signal does NOT count toward the tally, so two signals are used here so
    // MODEL_MISMATCH actually fires as the third state.
    const r = run({
      allKnownDoorsSealed: true,
      enumerationComplete: true, // -> NO_EXIT (provisional, fired)
      modelMismatchSignals: 2, // -> MODEL_MISMATCH (fired)
      functioningDoorsWithDifferentCosts: true, // -> COMPETING_FAILURES (fired)
    });
    expect(r.primaryState).toBe('SYSTEM_OVERLOAD');
    expect(r.secondaryStates).toContain('NO_EXIT');
  });
});

describe('detectTrapDiagnostic — MODEL_MISMATCH calibration (Phase 2B-3)', () => {
  it('zero signals (and no contradiction) produce no MODEL_MISMATCH', () => {
    const r = run({ modelMismatchSignals: 0 });
    expect(r.primaryState).not.toBe('MODEL_MISMATCH');
    expect(r.findings.some((f) => f.verdict === 'MODEL_MISMATCH')).toBe(false);
  });

  it('one weak signal is never primary, but records a LOW/PROVISIONAL concern', () => {
    const r = run({ modelMismatchSignals: 1 });
    expect(r.primaryState).not.toBe('MODEL_MISMATCH');
    expect(r.primaryState).toBeNull();
    const finding = r.findings.find((f) => f.verdict === 'MODEL_MISMATCH');
    expect(finding?.findingType).toBe('PROVISIONAL');
    expect(finding?.confidence).toBe('LOW');
  });

  it('one weak signal does NOT count toward SYSTEM_OVERLOAD simultaneity', () => {
    // The pre-calibration overload trigger: NO_EXIT + 1 weak MM + COMPETING.
    const r = run({
      allKnownDoorsSealed: true,
      enumerationComplete: true, // NO_EXIT (fired)
      modelMismatchSignals: 1, // weak -> NOT fired
      functioningDoorsWithDifferentCosts: true, // COMPETING_FAILURES (fired)
    });
    expect(r.primaryState).not.toBe('SYSTEM_OVERLOAD');
    expect(r.findings.some((f) => f.verdict === 'SYSTEM_OVERLOAD')).toBe(false);
    expect(r.secondaryStates).not.toContain('SYSTEM_OVERLOAD');
  });

  it('two signals -> MODEL_MISMATCH MEDIUM; three+ -> HIGH', () => {
    const two = run({ modelMismatchSignals: 2 });
    expect(two.primaryState).toBe('MODEL_MISMATCH');
    expect(two.confidence).toBe('MEDIUM');

    const three = run({ modelMismatchSignals: 3 });
    expect(three.primaryState).toBe('MODEL_MISMATCH');
    expect(three.confidence).toBe('HIGH');
  });

  it('explicit contradiction -> MODEL_MISMATCH HIGH (flag or stated-vs-observed)', () => {
    expect(run({ explicitModelContradiction: true }).confidence).toBe('HIGH');
    expect(run({ explicitModelContradiction: true }).primaryState).toBe('MODEL_MISMATCH');

    const stated = run({ statedProblemModel: 'willpower', observedFailurePattern: 'structure' });
    expect(stated.primaryState).toBe('MODEL_MISMATCH');
    expect(stated.confidence).toBe('HIGH');
  });

  it('explicit contradiction does not double-count as a weak signal', () => {
    // Contradiction + one weak signal is still a single HIGH MODEL_MISMATCH,
    // routed through the strong path — not "weak provisional + extra count".
    const r = run({ explicitModelContradiction: true, modelMismatchSignals: 1 });
    const mmFindings = r.findings.filter((f) => f.verdict === 'MODEL_MISMATCH');
    expect(mmFindings).toHaveLength(1);
    expect(mmFindings[0].confidence).toBe('HIGH');
    expect(r.primaryState).toBe('MODEL_MISMATCH');
  });

  it('a weak signal does not override a stronger primary state', () => {
    const r = run({ functioningDoorsWithDifferentCosts: true, modelMismatchSignals: 1 });
    expect(r.primaryState).toBe('COMPETING_FAILURES');
    expect(r.secondaryStates).not.toContain('MODEL_MISMATCH');
    // It may still annotate the file as a provisional concern.
    expect(r.findings.some((f) => f.verdict === 'MODEL_MISMATCH' && f.findingType === 'PROVISIONAL')).toBe(true);
  });
});

describe('detectTrapDiagnostic — no terminal language / no treatment instruction', () => {
  it('produces no banned terminal or treatment-instruction text', () => {
    const scenarios: TrapDiagnosticProxyInput[] = [
      { allKnownDoorsSealed: true, enumerationComplete: true },
      { allKnownDoorsSealed: true, enumerationComplete: true, hasRefusedDoor: true },
      { harmIncreasingOverTime: true, functionDeclining: true, timepoints: 3 },
      { activeFailurePatternCount: 4, controlRatingLow: true },
      {},
    ];
    const banned = [
      'trapped',
      'no way out',
      'hopeless',
      'nothing you can do',
      'stuck forever',
      'this is the end',
      'stop taking',
      'start taking',
      'medication',
      'dosage',
      'prescription',
    ];
    for (const scenario of scenarios) {
      const r = run(scenario);
      const text = [
        ...r.evidenceNotes,
        r.recommendedNextDiagnosticStep ?? '',
        ...r.findings.flatMap((f) => f.evidenceNotes),
      ]
        .join('\n')
        .toLowerCase();
      for (const phrase of banned) expect(text).not.toContain(phrase);
    }
  });
});
