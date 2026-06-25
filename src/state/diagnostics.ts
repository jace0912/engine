// Trap Architecture Diagnostic Layer — TYPE FOUNDATION ONLY (Phase 2B-0).
//
// IMPORTANT — scope of this file:
//   * These are type foundations only. Phase 2B-0 adds NO behaviour.
//   * Phase 2B-0 does NOT implement classifier logic.
//   * Phase 2B-0 does NOT implement Door Audit Lite.
//   * Phase 2B-0 does NOT implement selectTarget.
//   * Nothing here routes, classifies, selects a move, or renders UI.
//
// Two safety-critical rules that LATER logic (Phase 2B-1+) must obey, recorded
// here so the constraints travel with the types:
//   * Automated confirmation of absolute NO_EXIT is FORBIDDEN. Tier A output may
//     only make evidence-bounded statements (e.g. "No functioning door appears
//     in the evidence provided. This is a statement about the file, not about
//     the world."). Refused / delayed / capacity-blocked / unsearched /
//     predicted-sealed doors block any automated No-Exit.
//   * Diagnostic findings must NEVER override the SafetyOverride, and must never
//     override movement-state regression. SafetyOverride remains highest
//     priority; this layer answers "what failure architecture appears in the
//     evidence?", never "what can the user do right now?".
//
// The diagnostic layer is distinct from the Phase 2A movement states
// (survival / zcfm / immobile / windowDetection / recovery). It is not wired
// into the machine in Phase 2B-0.

// ---- The five core diagnostic states (the diagnostic spine) ----
export const TRAP_DIAGNOSTIC_STATES = [
  'NO_EXIT',
  'BACKFIRING',
  'MODEL_MISMATCH',
  'COMPETING_FAILURES',
  'SYSTEM_OVERLOAD',
] as const;
export type TrapDiagnosticState = (typeof TRAP_DIAGNOSTIC_STATES)[number];

// ---- Intermediate verdicts / safety buffers (NOT the five core states) ----
// These exist so ambiguous evidence is not forced into the five heavy states.
export const INTERMEDIATE_VERDICTS = [
  'ADAPTATION_PHASE',
  'PREMATURE_ASSESSMENT',
  'DOSE_FIT_ISSUE',
  'CAPACITY_CONSTRAINT',
  'UNMAPPED_ROOM',
  'REFUSED_DOOR',
  'COUNTDOWN',
  'UNEXECUTED_PROTOCOL',
  'INTENT_REFERRAL',
  'INCONCLUSIVE',
] as const;
export type IntermediateVerdict = (typeof INTERMEDIATE_VERDICTS)[number];

// ---- Door types ----
// These are the canonical door-type union. They intentionally reuse the exact
// string literals already used by `DoorRecord.type` (Phase 1), so the two stay
// aligned with a single source of truth rather than two conflicting unions.
// Conceptual name -> literal:
//   SEALED -> 'sealed', STRUCTURALLY_IMPOSSIBLE -> 'structurally_impossible',
//   PREDICTED_SEALED -> 'predicted_sealed', REFUSED -> 'refused',
//   DELAYED_DATED -> 'delayed_dated', DELAYED_INDEFINITE -> 'delayed_indefinite',
//   UNREACHABLE_BY_CAPACITY -> 'unreachable_by_capacity', UNSEARCHED -> 'unsearched'.
export const DOOR_TYPES = [
  'sealed',
  'structurally_impossible',
  'predicted_sealed',
  'refused',
  'delayed_dated',
  'delayed_indefinite',
  'unreachable_by_capacity',
  'unsearched',
] as const;
export type DoorType = (typeof DOOR_TYPES)[number];

// ---- Finding classification ----
export const FINDING_TYPES = ['STRUCTURAL', 'VALUATION_DEPENDENT', 'PROVISIONAL'] as const;
export type FindingType = (typeof FINDING_TYPES)[number];

export const DIAGNOSTIC_CONFIDENCE = ['LOW', 'MEDIUM', 'HIGH', 'PROVISIONAL'] as const;
export type DiagnosticConfidence = (typeof DIAGNOSTIC_CONFIDENCE)[number];

/** A single diagnostic finding — a core state OR an intermediate verdict. */
export interface DiagnosticFinding {
  // Either one of the five core states, or an intermediate verdict / safety buffer.
  verdict: TrapDiagnosticState | IntermediateVerdict;
  findingType: FindingType;
  confidence: DiagnosticConfidence;
  evidenceNotes: string[];
  actor?: string; // actor / seat label, if applicable
  // Identifiers of blockers preventing confirmation (e.g. a door type or verdict
  // that blocks automated No-Exit). Kept as plain strings in the foundation.
  blockedBy: string[];
  createdAt: string; // ISO-8601
}

/** The result envelope a future classifier would produce. Unpopulated in 2B-0. */
export interface TrapDiagnosticResult {
  primaryState: TrapDiagnosticState | null;
  secondaryStates: TrapDiagnosticState[];
  intermediateVerdicts: IntermediateVerdict[];
  findings: DiagnosticFinding[];
  confidence: DiagnosticConfidence;
  evidenceNotes: string[];
  blockedBy: string[];
  recommendedNextDiagnosticStep: string | null;
  actorScope?: string; // actor / seat label, if applicable
  createdAt: string; // ISO-8601
}

/** A single timepoint for trajectory-based reasoning (e.g. Backfiring). */
export interface InterventionTimepoint {
  at: string; // ISO-8601
  label?: string;
  value?: number; // within-person tracker only; never a normed claim
  note?: string;
}

/**
 * A door observation for Door Audit Lite. Phase 2B-4 extends this in place with
 * optional evidence-ledger fields — all existing fields keep their shape so
 * earlier records stay compatible. Pure data; no logic lives here.
 */
export interface DoorAuditLiteRecord {
  id: string;
  label: string;
  doorType: DoorType;
  attempted: boolean;
  actor?: string; // actor / seat label, if applicable
  note?: string;
  createdAt: string; // ISO-8601

  // ---- Phase 2B-4 Door Audit Lite ledger fields (all optional) ----
  evidence?: string[]; // short evidence notes supporting the classification
  blockerReason?: string; // why this door is currently blocked, if it is
  dateOrWindow?: string; // for delayed doors: the date/window it may open
  capacityRequirement?: string; // for capacity-blocked doors: what is needed
  witnessReliability?: 'high' | 'medium' | 'low' | 'unknown';
  // Whether this door has been mapped. Omitted defaults to mapped, EXCEPT an
  // 'unsearched' door, which the summary treats as unmapped.
  mapped?: boolean;
}

/** An intervention observation. Trajectory (timepoints) supports Backfiring. */
export interface InterventionLogEntry {
  id: string;
  label: string;
  category: string;
  attempted: boolean;
  outcome: string;
  timepoints?: InterventionTimepoint[]; // if applicable
  actor?: string; // actor / seat label, if applicable
  note?: string;
  createdAt: string; // ISO-8601
}
