// Phase 2B-1 — proxy diagnostic classifier.
//
// detectTrapDiagnostic(input) maps simple proxy signals to a TrapDiagnosticResult.
//
// SAFETY / SCOPE (read before extending):
//   * This function is PURE and SIDE-EFFECT-FREE. Given the same input (and the
//     same `now`), it always returns the same result. It reads no globals and
//     writes nothing. (`now` is injectable so the timestamp is deterministic in
//     tests; the default only stamps `createdAt`.)
//   * It does NOT route the app. It is not wired into the state machine.
//   * It does NOT override the SafetyOverride.
//   * It does NOT override movement-state regression.
//   * It does NOT confirm No-Exit in automated mode — No-Exit is capped at an
//     evidence-bounded PROVISIONAL reading and is blocked by any open question.
//   * It does NOT instruct the user to start, stop, or change any treatment.
//
// This is an EARLY proxy classifier, not the final diagnostic engine and not a
// Door Audit. It exists so the five diagnostic states behave differently under
// test. No user-facing output; no terminal language.

import type {
  DiagnosticConfidence,
  DiagnosticFinding,
  FindingType,
  IntermediateVerdict,
  TrapDiagnosticResult,
  TrapDiagnosticState,
} from '../state/diagnostics';

/** Compact proxy signals. All optional; absent means "unknown / not asserted". */
export interface TrapDiagnosticProxyInput {
  // Door / option evidence
  allKnownDoorsSealed?: boolean;
  hasStructurallyImpossibleDoor?: boolean;
  hasRefusedDoor?: boolean;
  hasDelayedDoor?: boolean;
  hasCapacityBlockedDoor?: boolean;
  hasUnsearchedDoor?: boolean;
  hasPredictedSealedDoor?: boolean;
  enumerationComplete?: boolean;
  witnessReliabilityLow?: boolean;

  // Intervention trajectory
  interventionPresent?: boolean;
  timepoints?: number; // count of observed timepoints (proxy)
  harmIncreasingOverTime?: boolean;
  functionDeclining?: boolean;
  insideExpectedAdaptationWindow?: boolean;
  tooSoonToJudge?: boolean;
  doseOrFitConcern?: boolean;
  adherenceOrExecutionIssue?: boolean;
  confoundedByOtherChange?: boolean;

  // Model mismatch
  statedProblemModel?: string;
  observedFailurePattern?: string;
  modelMismatchSignals?: number; // count of mismatch signals (proxy)

  // Competing failures
  functioningDoorsWithDifferentCosts?: boolean;
  routeDifferencesMatterToActor?: boolean; // undefined = unknown
  identicalOutcomeDifferentRoutes?: boolean;

  // System overload
  activeFailurePatternCount?: number;
  cascadeSignals?: boolean; // strong cascade present
  controlRatingLow?: boolean;

  // Actor / seat
  actorScope?: string;
}

const FILE_NOT_WORLD =
  'No functioning door appears in the evidence provided. This is a statement about the file, not about the world.';

// Deterministic precedence used to pick the primary state when several fire.
const PRIMARY_PRECEDENCE: TrapDiagnosticState[] = [
  'SYSTEM_OVERLOAD',
  'BACKFIRING',
  'MODEL_MISMATCH',
  'COMPETING_FAILURES',
  'NO_EXIT',
];

const BUFFER_NOTES: Record<IntermediateVerdict, string> = {
  ADAPTATION_PHASE: 'Change may be inside the expected adaptation window.',
  PREMATURE_ASSESSMENT: 'It is too soon to judge this intervention.',
  DOSE_FIT_ISSUE: 'A dose or fit concern could explain the result.',
  CAPACITY_CONSTRAINT: 'A capacity-blocked door is a capacity issue, not a sealed door.',
  UNMAPPED_ROOM: 'An unsearched door means enumeration is incomplete.',
  REFUSED_DOOR: 'A refused door is not a sealed door.',
  COUNTDOWN: 'A delayed door may still open later.',
  UNEXECUTED_PROTOCOL: 'The protocol may not have been executed as intended.',
  INTENT_REFERRAL: 'Intent signals would route to a human, not to a diagnosis.',
  INCONCLUSIVE: 'The evidence is currently inconclusive.',
};

export function detectTrapDiagnostic(
  input: TrapDiagnosticProxyInput,
  now: string = new Date().toISOString(),
): TrapDiagnosticResult {
  const findings: DiagnosticFinding[] = [];
  const firedStates = new Set<TrapDiagnosticState>();
  const intermediate = new Set<IntermediateVerdict>();
  const blockedBy = new Set<string>();
  const evidenceNotes: string[] = [];

  const note = (text: string) => {
    if (!evidenceNotes.includes(text)) evidenceNotes.push(text);
  };
  const addFinding = (
    verdict: TrapDiagnosticState | IntermediateVerdict,
    findingType: FindingType,
    confidence: DiagnosticConfidence,
    notes: string[],
    blockers: string[] = [],
  ) => {
    findings.push({
      verdict,
      findingType,
      confidence,
      evidenceNotes: notes,
      actor: input.actorScope,
      blockedBy: blockers,
      createdAt: now,
    });
  };
  const addState = (
    state: TrapDiagnosticState,
    findingType: FindingType,
    confidence: DiagnosticConfidence,
    notes: string[],
    blockers: string[] = [],
  ) => {
    if (firedStates.has(state)) return;
    firedStates.add(state);
    addFinding(state, findingType, confidence, notes, blockers);
  };
  const addVerdict = (
    verdict: IntermediateVerdict,
    confidence: DiagnosticConfidence = 'LOW',
    extraNotes: string[] = [],
  ) => {
    if (intermediate.has(verdict)) return;
    intermediate.add(verdict);
    addFinding(verdict, 'PROVISIONAL', confidence, [BUFFER_NOTES[verdict], ...extraNotes]);
  };

  // ---------- Door / option evidence -> No-Exit (gated, never confirmed) ----------
  const noExitBlockers: string[] = [];
  if (input.hasRefusedDoor) {
    noExitBlockers.push('refused');
    addVerdict('REFUSED_DOOR');
  }
  if (input.hasDelayedDoor) {
    noExitBlockers.push('delayed');
    addVerdict('COUNTDOWN');
  }
  if (input.hasCapacityBlockedDoor) {
    noExitBlockers.push('unreachable_by_capacity');
    addVerdict('CAPACITY_CONSTRAINT');
  }
  if (input.hasUnsearchedDoor) {
    noExitBlockers.push('unsearched');
    addVerdict('UNMAPPED_ROOM');
  }
  if (input.hasPredictedSealedDoor) {
    // A predicted-sealed door is a prediction, not evidence. It never counts
    // toward No-Exit.
    noExitBlockers.push('predicted_sealed');
    note('A predicted-sealed door is a prediction, not evidence; it never counts toward No-Exit.');
  }
  if (input.witnessReliabilityLow) noExitBlockers.push('witness_reliability_low');
  if (input.enumerationComplete !== true) noExitBlockers.push('enumeration_incomplete');

  if (input.allKnownDoorsSealed) {
    if (noExitBlockers.length === 0) {
      // Evidence-bounded, PROVISIONAL only. Automated No-Exit is never confirmed.
      note(FILE_NOT_WORLD);
      addState('NO_EXIT', 'PROVISIONAL', 'PROVISIONAL', [FILE_NOT_WORLD]);
    } else {
      for (const b of noExitBlockers) blockedBy.add(b);
      note(`No-Exit cannot be assessed while blockers remain (${noExitBlockers.join(', ')}). ${FILE_NOT_WORLD}`);
    }
  }

  // ---------- Intervention trajectory -> Backfiring (needs trajectory) ----------
  const buffers: IntermediateVerdict[] = [];
  if (input.tooSoonToJudge) buffers.push('PREMATURE_ASSESSMENT');
  if (input.insideExpectedAdaptationWindow) buffers.push('ADAPTATION_PHASE');
  if (input.doseOrFitConcern) buffers.push('DOSE_FIT_ISSUE');
  if (input.adherenceOrExecutionIssue) buffers.push('UNEXECUTED_PROTOCOL');
  if (input.confoundedByOtherChange) buffers.push('INCONCLUSIVE');
  for (const b of buffers) addVerdict(b);

  const timepoints = input.timepoints ?? 0;
  const worsening = Boolean(input.harmIncreasingOverTime) && Boolean(input.functionDeclining);
  if (worsening && timepoints >= 2 && buffers.length === 0) {
    note('Backfiring is a provisional reading from trajectory; it is not a treatment instruction.');
    const confidence: DiagnosticConfidence = timepoints >= 3 ? 'MEDIUM' : 'PROVISIONAL';
    addState('BACKFIRING', 'PROVISIONAL', confidence, [
      'Harm increasing and function declining across multiple timepoints.',
    ]);
  } else if (worsening && timepoints < 2) {
    // A single time point cannot confirm Backfiring.
    blockedBy.add('single_timepoint');
    addVerdict('PREMATURE_ASSESSMENT', 'LOW', ['A single timepoint cannot confirm Backfiring.']);
  }

  // ---------- Model mismatch ----------
  let mismatchSignals = input.modelMismatchSignals ?? 0;
  if (
    input.statedProblemModel &&
    input.observedFailurePattern &&
    input.statedProblemModel !== input.observedFailurePattern
  ) {
    mismatchSignals += 1;
  }
  if (mismatchSignals > 0) {
    const confidence: DiagnosticConfidence =
      mismatchSignals >= 3 ? 'HIGH' : mismatchSignals === 2 ? 'MEDIUM' : 'LOW';
    addState('MODEL_MISMATCH', 'STRUCTURAL', confidence, [
      'The response model does not fit the observed failure pattern.',
    ]);
  }

  // ---------- Competing failures ----------
  if (input.functioningDoorsWithDifferentCosts) {
    const valuation =
      input.identicalOutcomeDifferentRoutes === true && input.routeDifferencesMatterToActor === true;
    addState(
      'COMPETING_FAILURES',
      valuation ? 'VALUATION_DEPENDENT' : 'STRUCTURAL',
      'MEDIUM',
      ['Functioning doors exist, but each carries a cost, loss, or failure.'],
    );
  } else if (input.identicalOutcomeDifferentRoutes) {
    if (input.routeDifferencesMatterToActor === true) {
      addState('COMPETING_FAILURES', 'VALUATION_DEPENDENT', 'MEDIUM', [
        'Routes reach the same outcome but differ in ways that matter to the actor.',
      ]);
    } else {
      addVerdict('INCONCLUSIVE', 'LOW', [
        'Routes look identical in outcome; whether the differences matter is unknown.',
      ]);
    }
  }

  // ---------- System overload (simultaneity meta-rule) ----------
  const overloadByCount = (input.activeFailurePatternCount ?? 0) >= 3;
  const overloadByCascade = input.cascadeSignals === true;
  const overloadBySimultaneity = firedStates.size >= 3;
  if (overloadByCount || overloadByCascade || overloadBySimultaneity) {
    const strong =
      overloadByCascade || (input.activeFailurePatternCount ?? 0) >= 4 || overloadBySimultaneity;
    const notes = ['Multiple failure patterns are firing at once; single-problem logic breaks down.'];
    if (input.controlRatingLow) notes.push('Control rating is low.');
    addState('SYSTEM_OVERLOAD', 'STRUCTURAL', strong ? 'MEDIUM' : 'LOW', notes);
  }

  // ---------- Assemble primary / secondary ----------
  let primaryState: TrapDiagnosticState | null = null;
  const secondaryStates: TrapDiagnosticState[] = [];
  for (const state of PRIMARY_PRECEDENCE) {
    if (!firedStates.has(state)) continue;
    if (primaryState === null) primaryState = state;
    else secondaryStates.push(state);
  }

  if (primaryState === null && intermediate.size === 0) {
    addVerdict('INCONCLUSIVE', 'LOW', ['No proxy signal was strong enough to indicate a failure architecture.']);
  }

  const primaryFinding = findings.find((f) => f.verdict === primaryState);
  const confidence: DiagnosticConfidence = primaryFinding
    ? primaryFinding.confidence
    : intermediate.size > 0
      ? 'LOW'
      : 'PROVISIONAL';

  let recommendedNextDiagnosticStep: string | null;
  if (primaryState === 'NO_EXIT') {
    recommendedNextDiagnosticStep =
      'Re-confirm enumeration completeness and witness reliability; No-Exit stays evidence-bounded and is never auto-confirmed.';
  } else if (blockedBy.has('single_timepoint')) {
    recommendedNextDiagnosticStep = 'Gather at least one more timepoint before assessing Backfiring.';
  } else if (intermediate.has('UNMAPPED_ROOM')) {
    recommendedNextDiagnosticStep = 'Search the unmapped door(s) before assessing No-Exit.';
  } else if (primaryState) {
    recommendedNextDiagnosticStep = `Corroborate ${primaryState} with a fuller door enumeration when available.`;
  } else {
    recommendedNextDiagnosticStep = 'Collect more evidence; signals are currently inconclusive.';
  }

  return {
    primaryState,
    secondaryStates,
    intermediateVerdicts: [...intermediate],
    findings,
    confidence,
    evidenceNotes,
    blockedBy: [...blockedBy],
    recommendedNextDiagnosticStep,
    actorScope: input.actorScope,
    createdAt: now,
  };
}
