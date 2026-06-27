// Phase 3-3 — Recovery Micro-Step Candidate Catalog.
//
// A STATIC, non-rendered, non-recommending catalog of INERT candidate
// placeholders for future Guided Recovery review. The candidate set exists only
// to exercise the catalog shape, constraints, and safety tests — it is NOT
// approved user-facing recovery content. A later content/display/selection
// phase must review candidates again before any user exposure.
//
// This is a candidate catalog only: NOT Guided Recovery, NOT a UI, NOT a
// recovery flow, NOT user-facing dialogue, NOT a recommendation engine, NOT
// action selection, NOT Strategy Mode, NOT therapy/medical/treatment.
//
// CORE RULE: Phase 3 restores capacity. Phase 4 chooses strategy.
//
// SAFETY / SCOPE (read before extending):
//   * Pure + deterministic. No clock, randomness, or I/O; no React / XState /
//     persistence / diagnostics / app imports. The ONLY import is a TYPE-ONLY
//     import of GuidedRecoveryStage (erased at build).
//   * It never calls any factory, evaluator, or copy/diagnostic getter.
//   * The single API is getGuidedRecoveryMicroStepCatalog(). It does not
//     display, select, rank, recommend, personalize, adapt, generate, execute,
//     route, or persist candidates.
//   * NO permission is granted: display/runtime/selection/recommendation/
//     persistence permission are all false on the catalog and every candidate.
//   * Candidate labels name inert stage SLOTS; candidate purposes describe a
//     structural catalog role only. Neither is display-ready copy, an
//     instruction, an activity, an assessment, or a recommendation, and neither
//     may be rendered directly.

import type { GuidedRecoveryStage } from './guidedRecoveryState';

export type GuidedRecoveryMicroStepCategory =
  | 'orientation_slot'
  | 'capacity_slot'
  | 'stabilization_slot'
  | 'review_slot'
  | 'handoff_slot'
  | 'closure_slot';

export interface GuidedRecoveryMicroStepCandidate {
  id: string;
  // Non-exclusive compatibility metadata only: no ordering, routing, selection,
  // display-in-stage, stage screen, or flow is implied.
  compatibleStages: readonly GuidedRecoveryStage[];
  category: GuidedRecoveryMicroStepCategory;
  // label + purpose are STATIC STRUCTURAL METADATA ONLY. They are not
  // display-ready copy, not instructions, not activities, not assessments, not
  // recommendations, and must not be rendered directly.
  label: string;
  purpose: string;
  displayPermissionGranted: false;
  runtimePermissionGranted: false;
  selectionPermissionGranted: false;
  recommendationPermissionGranted: false;
  persistencePermissionGranted: false;
  mustNotRecommend: true;
  mustBeOptional: true;
  mustBeSkippable: true;
  mustBeStopSafe: true;
  mustNotRequirePhysicalExertion: true;
  mustNotRequireDisclosure: true;
  mustNotRequireMemoryRecall: true;
  mustNotRequireWriting: true;
  mustNotRequireSocialContact: true;
  mustNotRequireSpendingMoney: true;
  mustNotRequireLeavingLocation: true;
  mustNotRequireMedicalChange: true;
  mustNotTriggerStrategySelection: true;
  forbiddenBehaviors: readonly string[];
}

export interface GuidedRecoveryMicroStepCatalog {
  version: string;
  displayPermissionGranted: false;
  runtimePermissionGranted: false;
  selectionPermissionGranted: false;
  recommendationPermissionGranted: false;
  persistencePermissionGranted: false;
  mustNotRecommend: true;
  candidates: readonly GuidedRecoveryMicroStepCandidate[];
  bannedPhrases: readonly string[];
  forbiddenBehaviors: readonly string[];
}

// ---- Forbidden behaviors (reference metadata) ----------------------------

const FORBIDDEN_BEHAVIORS: readonly string[] = [
  'displaying candidate directly',
  'selecting candidate',
  'ranking candidate',
  'recommending candidate',
  'personalizing candidate',
  'adapting candidate',
  'generating candidate',
  'executing candidate',
  'persisting candidate choice',
  'tracking candidate completion',
  'giving instructions',
  'asking questions',
  'asking reflective questions',
  'asking journaling questions',
  'giving exercises',
  'giving coping techniques',
  'giving medical guidance',
  'giving treatment guidance',
  'acting as therapy',
  'selecting strategy',
  'selecting target',
  'selecting action',
  'routing the user',
  'bypassing SafetyOverride',
  'calling AI/model APIs',
];

// ---- Inert candidate set (fixture-like placeholders, NOT approved content) ----

const candidate = (
  id: string,
  category: GuidedRecoveryMicroStepCategory,
  compatibleStages: readonly GuidedRecoveryStage[],
  label: string,
): GuidedRecoveryMicroStepCandidate => ({
  id,
  compatibleStages,
  category,
  label,
  // Fixed structural template — describes the catalog slot, never user activity.
  purpose: `Defines an inert ${category} placeholder in the catalog; grants no display, selection, recommendation, persistence, or runtime permission.`,
  displayPermissionGranted: false,
  runtimePermissionGranted: false,
  selectionPermissionGranted: false,
  recommendationPermissionGranted: false,
  persistencePermissionGranted: false,
  mustNotRecommend: true,
  mustBeOptional: true,
  mustBeSkippable: true,
  mustBeStopSafe: true,
  mustNotRequirePhysicalExertion: true,
  mustNotRequireDisclosure: true,
  mustNotRequireMemoryRecall: true,
  mustNotRequireWriting: true,
  mustNotRequireSocialContact: true,
  mustNotRequireSpendingMoney: true,
  mustNotRequireLeavingLocation: true,
  mustNotRequireMedicalChange: true,
  mustNotTriggerStrategySelection: true,
  forbiddenBehaviors: [...FORBIDDEN_BEHAVIORS],
});

const CANDIDATES: readonly GuidedRecoveryMicroStepCandidate[] = [
  candidate('orientation_slot_marker', 'orientation_slot', ['orientation'], 'orientation slot marker'),
  candidate('capacity_slot_marker', 'capacity_slot', ['capacity_check'], 'capacity slot marker'),
  candidate('stabilization_slot_marker', 'stabilization_slot', ['stabilization'], 'stabilization slot marker'),
  candidate('review_slot_marker', 'review_slot', ['reflection'], 'review slot marker'),
  candidate('handoff_slot_marker', 'handoff_slot', ['handoff'], 'handoff slot marker'),
  candidate('closure_slot_marker', 'closure_slot', ['closed'], 'closure slot marker'),
];

// ---- Banned phrases (reference list; aligned with Phase 3-2 / 2B-6) -------

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
  // instruction / step (single + multi-word)
  'take a breath',
  'go for a walk',
  'drink water',
  'call someone',
  'try this exercise',
  'practice this technique',
  'do this next',
  'breathe',
  'walk',
  'write',
  'exercise',
  'stretch',
  'meditate',
  'pause',
  'check',
  'notice',
  'reflect',
  'review',
  'simplify',
  'settle',
  'prepare',
  'continue',
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

const CATALOG: GuidedRecoveryMicroStepCatalog = deepFreeze({
  version: 'guided-recovery-micro-step-catalog-1',
  displayPermissionGranted: false,
  runtimePermissionGranted: false,
  selectionPermissionGranted: false,
  recommendationPermissionGranted: false,
  persistencePermissionGranted: false,
  mustNotRecommend: true,
  candidates: CANDIDATES,
  bannedPhrases: BANNED_PHRASES,
  forbiddenBehaviors: FORBIDDEN_BEHAVIORS,
});

/**
 * The single Phase 3-3 API: a static, deep-frozen catalog of INERT candidate
 * placeholders. It selects nothing, recommends nothing, and grants no
 * permission. Candidates are not approved user-facing recovery content.
 */
export function getGuidedRecoveryMicroStepCatalog(): GuidedRecoveryMicroStepCatalog {
  return CATALOG;
}
