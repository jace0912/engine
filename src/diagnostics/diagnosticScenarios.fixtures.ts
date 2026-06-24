// Phase 2B-2 — realistic scenario fixtures for validating detectTrapDiagnostic.
//
// FIXTURES ONLY. These are proxy inputs used by the scenario validation suite
// (src/__tests__/detectTrapDiagnostic.scenarios.test.ts). They add no product
// behaviour and are not imported by the app. A fixed timestamp is used so the
// classifier output is deterministic.

import type { TrapDiagnosticState } from '../state/diagnostics';
import type { TrapDiagnosticProxyInput } from './detectTrapDiagnostic';

export const SCENARIO_NOW = '2026-02-01T00:00:00.000Z';

export interface Scenario {
  name: string;
  input: TrapDiagnosticProxyInput;
}

// ---------------- NO_EXIT-like evidence ----------------
export const noExitClean: Scenario = {
  name: 'all known doors sealed, enumeration complete, reliable witness',
  input: {
    allKnownDoorsSealed: true,
    enumerationComplete: true,
    hasStructurallyImpossibleDoor: true,
    witnessReliabilityLow: false,
    actorScope: 'self',
  },
};
export const noExitRefusedBlocked: Scenario = {
  name: 'sealed file but a refused door remains',
  input: { allKnownDoorsSealed: true, enumerationComplete: true, hasRefusedDoor: true },
};
export const noExitDelayedBlocked: Scenario = {
  name: 'sealed file but a delayed door remains',
  input: { allKnownDoorsSealed: true, enumerationComplete: true, hasDelayedDoor: true },
};
export const noExitCapacityBlocked: Scenario = {
  name: 'sealed file but a capacity-blocked door remains',
  input: { allKnownDoorsSealed: true, enumerationComplete: true, hasCapacityBlockedDoor: true },
};
export const noExitUnsearched: Scenario = {
  name: 'sealed claim but an unsearched door + incomplete enumeration',
  input: { allKnownDoorsSealed: true, enumerationComplete: false, hasUnsearchedDoor: true },
};
export const noExitPredictedSealed: Scenario = {
  name: 'sealed claim resting on a predicted-sealed door',
  input: { allKnownDoorsSealed: true, enumerationComplete: true, hasPredictedSealedDoor: true },
};
export const noExitIncompleteEnumeration: Scenario = {
  name: 'sealed claim but enumeration is not complete',
  input: { allKnownDoorsSealed: true, enumerationComplete: false },
};
export const noExitLowWitness: Scenario = {
  name: 'sealed + enumerated but witness reliability is low',
  input: { allKnownDoorsSealed: true, enumerationComplete: true, witnessReliabilityLow: true },
};

// ---------------- BACKFIRING-like evidence ----------------
export const backfiringSingleTimepoint: Scenario = {
  name: 'worsening but only one timepoint',
  input: { interventionPresent: true, harmIncreasingOverTime: true, functionDeclining: true, timepoints: 1 },
};
export const backfiringTooSoon: Scenario = {
  name: 'intervention present but too soon to judge',
  input: { interventionPresent: true, tooSoonToJudge: true },
};
export const backfiringAdaptation: Scenario = {
  name: 'change inside the expected adaptation window',
  input: { interventionPresent: true, insideExpectedAdaptationWindow: true },
};
export const backfiringDoseFit: Scenario = {
  name: 'a dose or fit concern could explain the result',
  input: { interventionPresent: true, doseOrFitConcern: true },
};
export const backfiringAdherence: Scenario = {
  name: 'the protocol may not have been executed as intended',
  input: { interventionPresent: true, adherenceOrExecutionIssue: true },
};
export const backfiringConfounded: Scenario = {
  name: 'multi-timepoint worsening but confounded by another change',
  input: {
    interventionPresent: true,
    harmIncreasingOverTime: true,
    functionDeclining: true,
    timepoints: 3,
    confoundedByOtherChange: true,
  },
};
export const backfiringTwoTimepoints: Scenario = {
  name: 'two timepoints of worsening with functional decline',
  input: { interventionPresent: true, harmIncreasingOverTime: true, functionDeclining: true, timepoints: 2 },
};
export const backfiringConfirmed: Scenario = {
  name: 'three timepoints of worsening with functional decline',
  input: { interventionPresent: true, harmIncreasingOverTime: true, functionDeclining: true, timepoints: 3 },
};

// ---------------- MODEL_MISMATCH-like evidence ----------------
export const modelMismatchStrong: Scenario = {
  name: 'multiple mismatch signals; stated model differs from observed pattern',
  input: {
    modelMismatchSignals: 2,
    statedProblemModel: 'willpower',
    observedFailurePattern: 'structural_constraint',
  },
};
export const modelMismatchWeak: Scenario = {
  name: 'a single weak mismatch signal',
  input: { modelMismatchSignals: 1 },
};
export const modelMismatchAbsent: Scenario = {
  name: 'no mismatch signals',
  input: { modelMismatchSignals: 0 },
};

// ---------------- COMPETING_FAILURES-like evidence ----------------
export const competingDifferentCosts: Scenario = {
  name: 'functioning doors, each with a different cost',
  input: { functioningDoorsWithDifferentCosts: true },
};
export const competingValuationDependent: Scenario = {
  name: 'identical outcome, route differences matter to the actor',
  input: { identicalOutcomeDifferentRoutes: true, routeDifferencesMatterToActor: true },
};
export const competingValuationNotMatter: Scenario = {
  name: 'identical outcome, route differences do not matter',
  input: { identicalOutcomeDifferentRoutes: true, routeDifferencesMatterToActor: false },
};
export const competingValuationUnknown: Scenario = {
  name: 'identical outcome, whether route differences matter is unknown',
  input: { identicalOutcomeDifferentRoutes: true },
};

// ---------------- SYSTEM_OVERLOAD-like evidence ----------------
export const systemOverloadCount: Scenario = {
  name: 'three active failure patterns',
  input: { activeFailurePatternCount: 3 },
};
export const systemOverloadCascade: Scenario = {
  name: 'strong cascade signals with low control rating',
  input: { cascadeSignals: true, controlRatingLow: true },
};
export const systemOverloadStrong: Scenario = {
  name: 'four active patterns, cascade, low control',
  input: { activeFailurePatternCount: 4, cascadeSignals: true, controlRatingLow: true },
};
export const systemOverloadMultiLabel: Scenario = {
  name: 'overload with model-mismatch and competing-failures co-firing',
  input: {
    modelMismatchSignals: 2,
    functioningDoorsWithDifferentCosts: true,
    activeFailurePatternCount: 3,
  },
};

// ---------------- intermediate / ambiguous ----------------
export const ambiguousUnsearched: Scenario = {
  name: 'an unsearched door with incomplete enumeration, no sealed claim',
  input: { hasUnsearchedDoor: true, enumerationComplete: false },
};
export const ambiguousCapacityConstraint: Scenario = {
  name: 'a capacity-blocked door, no sealed claim',
  input: { hasCapacityBlockedDoor: true },
};
export const ambiguousPremature: Scenario = {
  name: 'intervention present but too soon to judge',
  input: { interventionPresent: true, tooSoonToJudge: true },
};
export const ambiguousAdaptation: Scenario = {
  name: 'inside the adaptation window',
  input: { interventionPresent: true, insideExpectedAdaptationWindow: true },
};
export const ambiguousInconclusiveMixed: Scenario = {
  name: 'worsening but confounded — mixed, inconclusive evidence',
  input: {
    interventionPresent: true,
    harmIncreasingOverTime: true,
    functionDeclining: true,
    timepoints: 2,
    confoundedByOtherChange: true,
  },
};
export const ambiguousEmpty: Scenario = {
  name: 'no signal at all',
  input: {},
};

// The five canonical fixtures, one per core state, for the divergence table.
export const MAIN_SCENARIOS: { state: TrapDiagnosticState; scenario: Scenario }[] = [
  { state: 'NO_EXIT', scenario: noExitClean },
  { state: 'BACKFIRING', scenario: backfiringConfirmed },
  { state: 'MODEL_MISMATCH', scenario: modelMismatchStrong },
  { state: 'COMPETING_FAILURES', scenario: competingDifferentCosts },
  { state: 'SYSTEM_OVERLOAD', scenario: systemOverloadStrong },
];

// Every fixture, for sweeps (determinism, language safety).
export const ALL_SCENARIOS: Scenario[] = [
  noExitClean,
  noExitRefusedBlocked,
  noExitDelayedBlocked,
  noExitCapacityBlocked,
  noExitUnsearched,
  noExitPredictedSealed,
  noExitIncompleteEnumeration,
  noExitLowWitness,
  backfiringSingleTimepoint,
  backfiringTooSoon,
  backfiringAdaptation,
  backfiringDoseFit,
  backfiringAdherence,
  backfiringConfounded,
  backfiringTwoTimepoints,
  backfiringConfirmed,
  modelMismatchStrong,
  modelMismatchWeak,
  modelMismatchAbsent,
  competingDifferentCosts,
  competingValuationDependent,
  competingValuationNotMatter,
  competingValuationUnknown,
  systemOverloadCount,
  systemOverloadCascade,
  systemOverloadStrong,
  systemOverloadMultiLabel,
  ambiguousUnsearched,
  ambiguousCapacityConstraint,
  ambiguousPremature,
  ambiguousAdaptation,
  ambiguousInconclusiveMixed,
  ambiguousEmpty,
];
