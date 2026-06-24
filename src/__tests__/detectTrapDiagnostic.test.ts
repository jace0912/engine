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
    // No explicit overload count/cascade — overload arises because 3 states fire.
    const r = run({
      allKnownDoorsSealed: true,
      enumerationComplete: true, // -> NO_EXIT (provisional)
      modelMismatchSignals: 1, // -> MODEL_MISMATCH
      functioningDoorsWithDifferentCosts: true, // -> COMPETING_FAILURES
    });
    expect(r.primaryState).toBe('SYSTEM_OVERLOAD');
    expect(r.secondaryStates).toContain('NO_EXIT');
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
