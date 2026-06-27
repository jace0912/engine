// Phase 3-2 — Guided Recovery Copy Contract.
//
// Defines the SAFE-LANGUAGE boundary for future Guided Recovery copy — what it
// is allowed to sound like — as static copy rules only, before any UI, runtime
// wiring, recovery steps, prompts, or user-facing flow exists. This is copy
// contract only: NOT Guided Recovery, NOT a UI, NOT a recovery-step catalog, NOT
// user-facing dialogue, NOT reflection/journaling prompts, NOT exercises/coping
// techniques, NOT Strategy Mode, NOT action selection, NOT therapy/medical
// advice, NOT recommendations.
//
// CORE RULE: Phase 3 restores capacity. Phase 4 chooses strategy.
//
// SAFETY / SCOPE (read before extending):
//   * Pure + deterministic. No clock, randomness, or I/O; no React / XState /
//     persistence / diagnostics / app imports. The ONLY import is a TYPE-ONLY
//     import of GuidedRecoveryStage (erased at build).
//   * It never calls any factory, evaluator, or copy/diagnostic getter from
//     other modules — it defines static metadata only.
//   * The single API is getGuidedRecoveryStageCopyContract(). It does NOT define
//     or replace the Phase 3-0 boundary copy getter, which stays untouched.
//   * Defining safe copy grants NO permission to display, run, route, persist,
//     enter, or surface Guided Recovery: displayPermissionGranted and
//     runtimePermissionGranted are false on the contract, every frame example,
//     and every stage rule.
//   * Subordinate to SafetyOverride; separate from Phase 4 Strategy Mode.
//     Handoff and closure copy stay fenced.

import type { GuidedRecoveryStage } from './guidedRecoveryState';

export type GuidedRecoveryFrameCategory =
  | 'orientation'
  | 'capacity'
  | 'safety_boundary'
  | 'uncertainty'
  | 'mode_separation'
  | 'handoff'
  | 'closure';

export interface GuidedRecoveryFrameExample {
  id: string;
  category: GuidedRecoveryFrameCategory;
  // The text field is STATIC CONTRACT METADATA ONLY. It is not display-ready
  // copy and must not be rendered directly.
  text: string;
  displayPermissionGranted: false;
  runtimePermissionGranted: false;
  mustNotRecommend: true;
}

export interface GuidedRecoveryStageCopyRule {
  stage: GuidedRecoveryStage | string;
  purpose: string;
  allowedFrameCategories: readonly string[];
  forbidden: readonly string[];
  displayPermissionGranted: false;
  runtimePermissionGranted: false;
  mustNotRecommend: true;
}

export interface GuidedRecoveryStageCopyContract {
  version: string;
  displayPermissionGranted: false;
  runtimePermissionGranted: false;
  mustNotRecommend: true;
  approvedFrameExamples: readonly GuidedRecoveryFrameExample[];
  stageRules: readonly GuidedRecoveryStageCopyRule[];
  requiredQualifiers: readonly string[];
  bannedPhrases: readonly string[];
  forbiddenBehaviors: readonly string[];
}

// ---- Approved frame examples (static metadata, one per category) ---------

const frame = (
  id: string,
  category: GuidedRecoveryFrameCategory,
  text: string,
): GuidedRecoveryFrameExample => ({
  id,
  category,
  text,
  displayPermissionGranted: false,
  runtimePermissionGranted: false,
  mustNotRecommend: true,
});

const APPROVED_FRAME_EXAMPLES: readonly GuidedRecoveryFrameExample[] = [
  frame(
    'orientation_space',
    'orientation',
    'Guided Recovery is an orientation context that names a future recovery space, not a step or prompt.',
  ),
  frame('capacity_preserve', 'capacity', 'The purpose is to preserve capacity before larger decisions.'),
  frame(
    'safety_priority',
    'safety_boundary',
    'SafetyOverride remains higher priority than Guided Recovery; if safety is active, Guided Recovery is unavailable.',
  ),
  frame('uncertainty_ack', 'uncertainty', 'Uncertainty should remain acknowledged without diagnosis.'),
  frame(
    'mode_separation',
    'mode_separation',
    'Guided Recovery is a capacity-stabilization space, not Strategy Mode; this copy does not choose a strategy, target, route, or action.',
  ),
  frame('handoff_neutral', 'handoff', 'Handoff language must not recommend a next mode or action.'),
  frame(
    'closure_neutral',
    'closure',
    'Closure language must not claim resolution, success, healing, readiness, safety, completion, or stability.',
  ),
];

// ---- Required qualifiers (static contract qualifiers, not auto user-facing) ----

const REQUIRED_QUALIFIERS: readonly string[] = [
  'This is recovery framing, not strategy selection.',
  'This does not provide medical, therapeutic, or treatment guidance.',
  'This does not diagnose the situation.',
  'SafetyOverride remains higher priority.',
  'No display permission is granted by this contract.',
  'No runtime permission is granted by this contract.',
];

// ---- Stage copy rules (constraints, not content) -------------------------

const BASE_FORBIDDEN: readonly string[] = [
  'concrete recovery steps',
  'micro-steps',
  'instructions',
  'prompts',
  'questions',
  'exercises',
  'coping techniques',
  'recommendations',
  'strategy selection',
  'target selection',
  'action selection',
  'user-facing dialogue',
];

// Reflection is therapy-adjacent and gets extra fencing.
const REFLECTION_FORBIDDEN: readonly string[] = [
  'reflection questions',
  'journaling prompts',
  'how do you feel framing',
  'trauma processing',
  'emotional processing',
  'meaning-making prompts',
  'therapy-like interpretation',
  'clinical framing',
];

const HANDOFF_FORBIDDEN: readonly string[] = [
  'recommending',
  'routing',
  'preparing the user for Strategy Mode',
  'pointing toward Strategy Mode',
  'pointing toward target selection',
  'pointing toward next action',
  'pointing toward next mode',
  'pointing toward any later mode',
];

const CLOSURE_FORBIDDEN: readonly string[] = [
  'implying resolution',
  'implying success',
  'implying healing',
  'implying readiness',
  'implying safety',
  'implying completion',
  'implying stability',
];

const rule = (
  stage: GuidedRecoveryStage,
  purpose: string,
  allowedFrameCategories: readonly string[],
  extraForbidden: readonly string[] = [],
): GuidedRecoveryStageCopyRule => ({
  stage,
  purpose,
  allowedFrameCategories,
  forbidden: [...BASE_FORBIDDEN, ...extraForbidden],
  displayPermissionGranted: false,
  runtimePermissionGranted: false,
  mustNotRecommend: true,
});

const STAGE_RULES: readonly GuidedRecoveryStageCopyRule[] = [
  rule('not_started', 'Names a not-yet-started copy context only.', ['orientation']),
  rule('orientation', 'Frames a future recovery-orientation context; not user-facing dialogue.', [
    'orientation',
    'mode_separation',
  ]),
  rule('capacity_check', 'Frames future capacity observation language only; not an assessment prompt or question.', [
    'capacity',
    'uncertainty',
  ]),
  rule('stabilization', 'Frames future capacity-stabilization language only; not a step or instruction.', ['capacity']),
  rule(
    'reflection',
    'Frames a future non-therapeutic review label only; not reflective prompting.',
    ['uncertainty'],
    REFLECTION_FORBIDDEN,
  ),
  rule(
    'handoff',
    'Frames a future gated handoff label only; not a recommendation or route.',
    ['handoff', 'safety_boundary'],
    HANDOFF_FORBIDDEN,
  ),
  rule(
    'closed',
    'Marks that a future Guided Recovery copy context is closed; claims no resolution.',
    ['closure'],
    CLOSURE_FORBIDDEN,
  ),
];

// ---- Forbidden behaviors (reference metadata) ----------------------------

const FORBIDDEN_BEHAVIORS: readonly string[] = [
  'diagnosing',
  'recommending',
  'selecting strategy',
  'selecting target',
  'selecting action',
  'giving treatment instruction',
  'acting as therapy',
  'asking reflective questions',
  'asking journaling questions',
  'providing exercises',
  'providing coping techniques',
  'giving user-facing dialogue',
  'bypassing SafetyOverride',
  'routing the user',
  'pointing toward Strategy Mode',
  'pointing toward next action',
  'pointing toward next mode',
  'implying resolution',
  'implying success',
  'implying healing',
  'implying readiness',
  'implying safety',
  'implying completion',
  'implying stability',
  'persisting user recovery text',
  'calling AI/model APIs',
];

// ---- Banned phrases (reference list; aligned with Phase 3-0 / 2B-6) -------

const BANNED_PHRASES: readonly string[] = [
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
  'process your trauma',
  'emotional processing',
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
  // reflection / journaling / prompt
  'how do you feel',
  'ask yourself',
  'journal',
  'write down',
  'reflect on',
  'process what happened',
  'meaning of what happened',
  // instruction / step
  'take a breath',
  'go for a walk',
  'drink water',
  'call someone',
  'try this exercise',
  'practice this technique',
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

const CONTRACT: GuidedRecoveryStageCopyContract = deepFreeze({
  version: 'guided-recovery-copy-contract-1',
  displayPermissionGranted: false,
  runtimePermissionGranted: false,
  mustNotRecommend: true,
  approvedFrameExamples: APPROVED_FRAME_EXAMPLES,
  stageRules: STAGE_RULES,
  requiredQualifiers: REQUIRED_QUALIFIERS,
  bannedPhrases: BANNED_PHRASES,
  forbiddenBehaviors: FORBIDDEN_BEHAVIORS,
});

/**
 * The single Phase 3-2 API: a static, deep-frozen Guided Recovery copy contract.
 * Distinct from the Phase 3-0 boundary copy getter, which is untouched.
 */
export function getGuidedRecoveryStageCopyContract(): GuidedRecoveryStageCopyContract {
  return CONTRACT;
}
