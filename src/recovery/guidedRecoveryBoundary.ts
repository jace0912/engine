// Phase 3-0 — Guided Recovery Boundary Scaffold.
//
// Defines what Guided Recovery is ALLOWED to do before it does anything. This
// is boundary scaffolding only: a pure permission evaluator plus a static copy
// contract. It is NOT Guided Recovery, NOT a UI, NOT runtime wiring, NOT
// Strategy Mode, NOT action selection, NOT therapy, NOT medical advice, and NOT
// a recommendation engine.
//
// CORE RULE: Phase 3 restores capacity. Phase 4 chooses strategy. Guided
// Recovery returns *permission only*, never a recovery action.
//
// SAFETY / SCOPE (read before extending):
//   * Pure + deterministic. No clock, no randomness, no I/O, no React, no
//     XState, no persistence, no diagnostics, no AI/model calls. The module has
//     NO imports and is imported only by tests (no runtime wiring at all).
//   * Strict precedence: (1) SafetyOverride, (2) survival state, (3) capacity
//     band, (4) user intent. SafetyOverride ALWAYS wins — when it is active the
//     decision is blocked_by_safety_override regardless of every other field.
//   * The evaluator reads userIntent exactly as given. It never parses free
//     text, never infers intent from other fields, and never classifies
//     language.
//   * Defining safe Guided Recovery language grants NO permission to display
//     Guided Recovery to a user. Surfacing it is a later, gated phase.

// ---- Entry status -------------------------------------------------------

export type GuidedRecoveryEntryStatus =
  | 'allowed'
  | 'blocked_by_safety_override'
  | 'blocked_by_survival_not_stable'
  | 'blocked_by_insufficient_capacity'
  | 'blocked_by_excess_capacity_strategy_band'
  | 'blocked_by_diagnose_request'
  | 'blocked_by_strategy_request'
  | 'blocked_by_medical_or_treatment_request';

// ---- Decision (return contract) -----------------------------------------
// The mustNot* flags are LITERAL `true`: they are constant safety guarantees on
// every branch, allowed or blocked, and the type makes a `false` impossible.

export interface GuidedRecoveryBoundaryDecision {
  allowed: boolean;
  status: GuidedRecoveryEntryStatus;
  reason: string;
  mayShowGuidedRecovery: boolean;
  mustStayInSurvival: boolean;
  mustUseSafetyOverride: boolean;
  mustNotDiagnose: true;
  mustNotRecommend: true;
  mustNotSelectStrategy: true;
  mustNotGiveTreatmentInstruction: true;
  mustNotActAsTherapy: true;
}

// ---- Input --------------------------------------------------------------
// currentMode is contextual only; it is intentionally NOT part of precedence.
// The four precedence inputs are safetyOverrideActive, survivalState,
// capacityBand, and userIntent.

export interface GuidedRecoveryBoundaryInput {
  safetyOverrideActive: boolean;
  currentMode: 'first_check' | 'survival' | 'guided_recovery' | 'strategy' | string;
  survivalState?: 'normal' | 'zcfm' | 'immobile' | 'windowDetection' | 'recovery' | string;
  capacityBand?: 'zero' | 'low' | 'recovering' | 'stable' | 'high';
  successfulMovesInARow?: number;
  userIntent?: 'stabilize' | 'diagnose' | 'strategy' | 'medical_or_treatment' | 'unknown';
}

// The constant safety guarantees carried by every decision, on every branch.
const MUST_NOTS = {
  mustNotDiagnose: true,
  mustNotRecommend: true,
  mustNotSelectStrategy: true,
  mustNotGiveTreatmentInstruction: true,
  mustNotActAsTherapy: true,
} as const;

function blocked(
  status: Exclude<GuidedRecoveryEntryStatus, 'allowed'>,
  reason: string,
  mustUseSafetyOverride = false,
): GuidedRecoveryBoundaryDecision {
  return {
    allowed: false,
    status,
    reason,
    mayShowGuidedRecovery: false, // always equals `allowed`
    mustStayInSurvival: true, // always true whenever allowed is false
    mustUseSafetyOverride, // true ONLY for blocked_by_safety_override
    ...MUST_NOTS,
  };
}

function allow(reason: string): GuidedRecoveryBoundaryDecision {
  return {
    allowed: true,
    status: 'allowed',
    reason,
    mayShowGuidedRecovery: true, // always equals `allowed`
    mustStayInSurvival: false,
    mustUseSafetyOverride: false,
    ...MUST_NOTS,
  };
}

/**
 * Pure boundary evaluator. Returns *permission only* — never a recovery action,
 * never a diagnosis, never a strategy. Strict precedence: SafetyOverride wins,
 * then survival stability, then capacity band, then user intent.
 *
 * It does not transition the app, mutate session, import XState/React, call
 * diagnostics or AI, or produce personalized advice.
 */
export function evaluateGuidedRecoveryBoundary(
  input: GuidedRecoveryBoundaryInput,
): GuidedRecoveryBoundaryDecision {
  // 1. SafetyOverride — supreme. Wins over EVERY other field, unconditionally.
  if (input.safetyOverrideActive === true) {
    return blocked(
      'blocked_by_safety_override',
      'SafetyOverride is active, so it takes priority over everything else. Stay with the Safety Override.',
      true,
    );
  }

  // 2. Survival state — Guided Recovery opens only from a stable recovery
  //    footing: the Survival `recovery` sub-state with at least two steady
  //    moves in a row. Anything else is "survival not stable".
  if (input.survivalState !== 'recovery') {
    return blocked(
      'blocked_by_survival_not_stable',
      'Guided Recovery opens only from a stable Survival recovery footing: the recovery sub-state with at least two steady moves in a row.',
    );
  }
  if ((input.successfulMovesInARow ?? 0) < 2) {
    return blocked(
      'blocked_by_survival_not_stable',
      'Recovery footing is not yet stable: at least two steady moves in a row are needed before Guided Recovery can open.',
    );
  }

  // 3. Capacity band. High capacity is reserved for a later Strategy phase and
  //    is only BLOCKED here (never routed into strategy). Zero/low (or unknown)
  //    capacity is insufficient.
  if (input.capacityBand === 'high') {
    return blocked(
      'blocked_by_excess_capacity_strategy_band',
      'High capacity is reserved for a later Strategy phase, not Guided Recovery. Guided Recovery is simply blocked here; no strategy is offered.',
    );
  }
  if (input.capacityBand !== 'recovering' && input.capacityBand !== 'stable') {
    return blocked(
      'blocked_by_insufficient_capacity',
      'Capacity is too low to open Guided Recovery. Stay in Survival Mode until capacity is recovering or stable.',
    );
  }

  // 4. User intent — read exactly as given. Diagnose / strategy / medical
  //    requests are out of scope and each block with a distinct status.
  if (input.userIntent === 'diagnose') {
    return blocked(
      'blocked_by_diagnose_request',
      'Guided Recovery does not diagnose and does not interpret diagnostic states. A request to diagnose is out of scope here.',
    );
  }
  if (input.userIntent === 'strategy') {
    return blocked(
      'blocked_by_strategy_request',
      'Guided Recovery does not select or offer a strategy; that belongs to a later Strategy phase. It is blocked here, not fulfilled.',
    );
  }
  if (input.userIntent === 'medical_or_treatment') {
    return blocked(
      'blocked_by_medical_or_treatment_request',
      'Guided Recovery gives no medical or treatment guidance of any kind. This request is out of scope.',
    );
  }

  // Allowed: stable recovery footing + sufficient (recovering/stable) capacity
  // + no danger + a stabilizing/unknown intent. Permission only — still no
  // diagnosis, recommendation, strategy, treatment, or therapy.
  return allow(
    'A stable Survival recovery footing with recovering or stable capacity and no danger present. Guided Recovery may open as a small, stoppable, non-strategy stabilizing space; it still offers no diagnosis, no recommendation, and no strategy.',
  );
}

// ---- Static copy boundary contract --------------------------------------
// STATIC framing fragments only — orienting / slowing / stabilizing / noticing
// capacity / returning to Survival if capacity drops / acknowledging
// uncertainty without diagnosing. There is NO concrete recovery-step library,
// NO micro-step catalog, NO personalized or generated instructions, NO
// recommendations, NO strategy/treatment suggestions.

export interface GuidedRecoveryCopyRule {
  label: string;
  text: string;
  displayPermissionGranted: false;
  mustNotRecommend: true;
}

export interface GuidedRecoveryCopyContract {
  // Static framing fragments that Guided Recovery MAY eventually use.
  allowedFrames: string[];
  framing: Record<string, GuidedRecoveryCopyRule>;
  // The reference list of phrases Guided Recovery must NEVER use. Metadata —
  // excluded from the safe-language scan of display copy.
  bannedPhrases: string[];
  displayPermissionGranted: false;
  mustNotRecommend: true;
}

const ALLOWED_FRAMES: string[] = [
  'This is a recovery space, not strategy mode.',
  'The goal is to stabilize capacity before making larger decisions.',
  'We are not choosing a strategy here.',
  'If danger is present, SafetyOverride takes priority.',
  'If capacity drops, return to Survival Mode.',
  'This should stay small enough to stop safely.',
];

const frame = (label: string, text: string): GuidedRecoveryCopyRule => ({
  label,
  text,
  displayPermissionGranted: false,
  mustNotRecommend: true,
});

const FRAMING: Record<string, GuidedRecoveryCopyRule> = {
  orienting: frame('orienting', 'This is a recovery space, not strategy mode.'),
  stabilizing: frame('stabilizing', 'The goal is to stabilize capacity before making larger decisions.'),
  not_strategy: frame('not_strategy', 'We are not choosing a strategy here.'),
  safety_first: frame('safety_first', 'If danger is present, SafetyOverride takes priority.'),
  return_if_capacity_drops: frame('return_if_capacity_drops', 'If capacity drops, return to Survival Mode.'),
  small_and_stoppable: frame('small_and_stoppable', 'This should stay small enough to stop safely.'),
};

const BANNED_PHRASES: string[] = [
  // strategy / selector
  'select target',
  'target selected',
  'choose strategy',
  'best strategy',
  'recommended action',
  'best option',
  'do this next',
  'take this route',
  'solve the trap',
  'exit plan',
  // diagnostic conclusion
  'your diagnosis is',
  'the trap is',
  'this is no-exit',
  'this is backfiring',
  'this is model mismatch',
  'this is system overload',
  'this is competing failures',
  // therapy-like
  'i am your therapist',
  'this will heal you',
  'trauma treatment',
  'exposure therapy',
  'cognitive behavioral therapy',
  'clinical intervention',
  'guaranteed recovery',
  // medical / treatment (expanded set, aligned with Phase 2B-6)
  'medication',
  'dosage',
  'prescription',
  'stop taking',
  'start taking',
  'pause treatment',
  'pause medication',
  'alter treatment',
  'alter medication',
  'adjust treatment',
  'adjust medication',
  'reduce treatment',
  'reduce medication',
  'increase treatment',
  'increase medication',
  'lower dosage',
  'raise dosage',
  'taper',
  'wean',
  'switch medication',
  'switch treatment',
  'change treatment',
  'discontinue',
  'titrate',
  // terminal / hopeless
  'no way out',
  'no exit exists',
  'nothing can be done',
  'nothing you can do',
  'hopeless',
  'stuck forever',
  'trapped forever',
  'this is the end',
];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

const COPY_CONTRACT: GuidedRecoveryCopyContract = deepFreeze({
  allowedFrames: ALLOWED_FRAMES,
  framing: FRAMING,
  bannedPhrases: BANNED_PHRASES,
  displayPermissionGranted: false,
  mustNotRecommend: true,
});

/** The only copy API: a static framing contract. Grants no display permission. */
export function getGuidedRecoveryCopyContract(): GuidedRecoveryCopyContract {
  return COPY_CONTRACT;
}
