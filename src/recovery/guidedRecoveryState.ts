// Phase 3-1 — Guided Recovery Type / State Foundation.
//
// Defines the internal SHAPE of future Guided Recovery state — stages, status,
// session slots, boundary flags, and stage metadata — before any UI, runtime
// wiring, recovery steps, or transitions exist. This is type/state foundation
// ONLY. It is NOT Guided Recovery, NOT a UI, NOT a recovery-step catalog, NOT
// Strategy Mode, NOT action selection, NOT therapy, NOT medical advice, NOT
// recommendations.
//
// CORE RULE: Phase 3 restores capacity. Phase 4 chooses strategy.
//
// SAFETY / SCOPE (read before extending):
//   * Pure + deterministic. No clock, no randomness, no I/O, no React, no
//     XState, no persistence, no diagnostics, no AI/model calls.
//   * The ONLY import is a TYPE-ONLY import of GuidedRecoveryEntryStatus from
//     guidedRecoveryBoundary (erased at build). This module never runtime-imports
//     the boundary, never calls evaluateGuidedRecoveryBoundary(), and never calls
//     getGuidedRecoveryCopyContract(). It defines shape, not policy execution.
//   * Defining this shape grants NO permission to display, run, route, persist,
//     or enter Guided Recovery — every state and stage carries
//     displayPermissionGranted: false and runtimePermissionGranted: false.
//   * Guided Recovery state stays subordinate to SafetyOverride and separate
//     from Phase 4 Strategy Mode: no strategy / target / action-selection /
//     recommendation / plan / route / COR fields, and no free-form text slot.

import type { GuidedRecoveryEntryStatus } from './guidedRecoveryBoundary';

// ---- Stage + status unions ----------------------------------------------

export const GUIDED_RECOVERY_STAGES = [
  'not_started',
  'orientation',
  'capacity_check',
  'stabilization',
  'reflection',
  'handoff',
  'closed',
] as const;
export type GuidedRecoveryStage = (typeof GUIDED_RECOVERY_STAGES)[number];

// 'active' and 'paused' are RESERVED future status values. Phase 3-1 adds no
// helper that produces them (no createActive / createPaused / transition).
export const GUIDED_RECOVERY_STATUSES = [
  'inactive',
  'available',
  'active',
  'paused',
  'blocked_by_safety_override',
  'closed',
] as const;
export type GuidedRecoveryStatus = (typeof GUIDED_RECOVERY_STATUSES)[number];

// ---- Flags (literal types — a weakened flag will not compile) ------------

export interface GuidedRecoveryBoundaryFlags {
  mustNotDiagnose: true;
  mustNotRecommend: true;
  mustNotSelectStrategy: true;
  mustNotGiveTreatmentInstruction: true;
  mustNotActAsTherapy: true;
  mustStayEvidenceBounded: true;
  mustRemainCapacityFocused: true;
}

export interface GuidedRecoveryPermissionFlags {
  displayPermissionGranted: false;
  runtimePermissionGranted: false;
  mustNotRecommend: true;
}

// ---- State --------------------------------------------------------------
// No notes/free-form text slot (a seam for therapy text, advice, PII, and
// persistence creep). No strategy/target/action/recommendation/plan/route/COR
// fields. Timestamps are caller-supplied strings only — the module never reads
// a clock.

export interface GuidedRecoveryState {
  status: GuidedRecoveryStatus;
  stage: GuidedRecoveryStage;
  entryStatus: GuidedRecoveryEntryStatus | string;
  boundaryFlags: GuidedRecoveryBoundaryFlags;
  permissionFlags: GuidedRecoveryPermissionFlags;
  capacityBandAtEntry?: 'recovering' | 'stable';
  successfulMovesAtEntry?: number;
  startedAt?: string;
  updatedAt?: string;
  closedAt?: string;
  copyContractVersion?: string;
}

// ---- Stage metadata (static, abstract, label-only) ----------------------

export interface GuidedRecoveryStageDefinition {
  stage: GuidedRecoveryStage;
  purpose: string;
  allowed: string[];
  forbidden: string[];
  displayPermissionGranted: false;
  runtimePermissionGranted: false;
  mustNotRecommend: true;
}

// ---- Shared constant flag values ----------------------------------------

const BOUNDARY_FLAGS: GuidedRecoveryBoundaryFlags = {
  mustNotDiagnose: true,
  mustNotRecommend: true,
  mustNotSelectStrategy: true,
  mustNotGiveTreatmentInstruction: true,
  mustNotActAsTherapy: true,
  mustStayEvidenceBounded: true,
  mustRemainCapacityFocused: true,
};

const PERMISSION_FLAGS: GuidedRecoveryPermissionFlags = {
  displayPermissionGranted: false,
  runtimePermissionGranted: false,
  mustNotRecommend: true,
};

const boundaryFlags = (): GuidedRecoveryBoundaryFlags => ({ ...BOUNDARY_FLAGS });
const permissionFlags = (): GuidedRecoveryPermissionFlags => ({ ...PERMISSION_FLAGS });

// ---- Factories / validators (smallest useful pure functions) ------------

/** A safe default: inactive, not started, all flags intact, no permission. */
export function createInactiveGuidedRecoveryState(): GuidedRecoveryState {
  return {
    status: 'inactive',
    stage: 'not_started',
    entryStatus: 'blocked_by_survival_not_stable',
    boundaryFlags: boundaryFlags(),
    permissionFlags: permissionFlags(),
  };
}

export interface CreateAvailableGuidedRecoveryInput {
  entryStatus: GuidedRecoveryEntryStatus | string;
  capacityBandAtEntry?: 'recovering' | 'stable';
  successfulMovesAtEntry?: number;
  startedAt?: string;
  copyContractVersion?: string;
}

/**
 * Allowed-only factory. Returns an "available" state ONLY when
 * entryStatus === 'allowed'. For any blocked entry status it returns a blocked
 * state that preserves the entryStatus with all flags intact — never an
 * available or active state. Contradictory states are not produced here.
 */
export function createAvailableGuidedRecoveryState(
  input: CreateAvailableGuidedRecoveryInput,
): GuidedRecoveryState {
  if (input.entryStatus !== 'allowed') {
    // Preferred behavior: a blocked state preserving entryStatus. SafetyOverride
    // maps to its own status; every other block stays a safe 'inactive'.
    const status: GuidedRecoveryStatus =
      input.entryStatus === 'blocked_by_safety_override' ? 'blocked_by_safety_override' : 'inactive';
    return {
      status,
      stage: 'not_started',
      entryStatus: input.entryStatus,
      boundaryFlags: boundaryFlags(),
      permissionFlags: permissionFlags(),
    };
  }

  // entryStatus === 'allowed' → available, at the orientation label. Still no
  // display/runtime permission; "available" is shape, not an authorization.
  return {
    status: 'available',
    stage: 'orientation',
    entryStatus: 'allowed',
    boundaryFlags: boundaryFlags(),
    permissionFlags: permissionFlags(),
    ...(input.capacityBandAtEntry !== undefined ? { capacityBandAtEntry: input.capacityBandAtEntry } : {}),
    ...(input.successfulMovesAtEntry !== undefined ? { successfulMovesAtEntry: input.successfulMovesAtEntry } : {}),
    ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
    ...(input.copyContractVersion !== undefined ? { copyContractVersion: input.copyContractVersion } : {}),
  };
}

/** Structural validator. Does not evaluate entry policy. */
export function isGuidedRecoveryState(value: unknown): value is GuidedRecoveryState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.status === 'string' &&
    (GUIDED_RECOVERY_STATUSES as readonly string[]).includes(v.status) &&
    typeof v.stage === 'string' &&
    (GUIDED_RECOVERY_STAGES as readonly string[]).includes(v.stage) &&
    typeof v.entryStatus === 'string' &&
    typeof v.boundaryFlags === 'object' &&
    v.boundaryFlags !== null &&
    typeof v.permissionFlags === 'object' &&
    v.permissionFlags !== null
  );
}

// ---- Stage definitions (deep-frozen static metadata) --------------------

// Forbidden content is identical across every stage: these are label-only
// stages and authorize none of the following.
const FORBIDDEN_ACROSS_STAGES: readonly string[] = [
  'diagnosis',
  'strategy selection',
  'target selection',
  'action selection',
  'recommendations',
  'treatment guidance',
  'therapy-like content',
  'reflection questions',
  'journaling prompts',
  'how-do-you-feel framing',
  'exercises',
  'coping techniques',
  'concrete recovery steps',
];

const stageDef = (
  stage: GuidedRecoveryStage,
  purpose: string,
  allowed: string[],
): GuidedRecoveryStageDefinition => ({
  stage,
  purpose,
  allowed,
  forbidden: [...FORBIDDEN_ACROSS_STAGES],
  displayPermissionGranted: false,
  runtimePermissionGranted: false,
  mustNotRecommend: true,
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

const STAGE_DEFINITIONS: Record<GuidedRecoveryStage, GuidedRecoveryStageDefinition> = deepFreeze({
  not_started: stageDef('not_started', 'Label for a not-yet-started state only.', ['not-started label']),
  orientation: stageDef(
    'orientation',
    'Label for a future recovery orientation only; not user-facing dialogue.',
    ['orientation label'],
  ),
  capacity_check: stageDef(
    'capacity_check',
    'Label for a future capacity observation only; not an assessment prompt.',
    ['capacity observation label'],
  ),
  stabilization: stageDef(
    'stabilization',
    'Label for a future capacity stabilization only; not a step.',
    ['capacity stabilization label'],
  ),
  reflection: stageDef(
    'reflection',
    'Label for a future non-therapeutic review only; not reflective prompting.',
    ['non-therapeutic review label'],
  ),
  handoff: stageDef('handoff', 'Label for a future gated handoff only; not a recommendation.', ['gated handoff label']),
  closed: stageDef('closed', 'Label for an ended state only.', ['ended-state label']),
});

/** Static, abstract stage metadata. Labels only — grants no display/runtime permission. */
export function getGuidedRecoveryStageDefinitions(): Record<GuidedRecoveryStage, GuidedRecoveryStageDefinition> {
  return STAGE_DEFINITIONS;
}
