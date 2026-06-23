// Shared data model for the Black Swan Crisis Operating System.
// Phase 1 implements these types directly from section 6 of the unified build
// plan. The two engine slices (TrapEngineState, BlackSwanState) are present as
// forward-compatible stubs only — Phase 1 builds neither engine's logic.
//
// Note: the build plan calls the per-session log event type `Event`. To avoid
// colliding with the DOM `Event` global, it is named `SessionEvent` here.

// Phase 2B-0: the Trap Architecture Diagnostic Layer type foundation lives in
// ./diagnostics. These are types only — no classifier, Door Audit Lite, or
// selectTarget logic is wired in yet.
import type {
  DoorAuditLiteRecord,
  DoorType,
  InterventionLogEntry,
  TrapDiagnosticResult,
} from './diagnostics';

export type Mode = 'survival' | 'guided' | 'strategy' | 'observatory';
export type CapacityBand = 'zero' | 'low' | 'recovering' | 'stable' | 'high';
export type EngineId = 'trap' | 'blackswan' | 'shell';
export type SessionStatus = 'active' | 'safety_override' | 'closed';

export type SafetyFlag =
  | 'suicide_self_harm'
  | 'medical_emergency'
  | 'substance_beyond_control'
  | 'threat_to_child'
  | 'violence_abuse'
  | 'manual_help_request';

export interface User {
  id: string; // local uuid in Phase 1
  createdAt: string; // ISO-8601
}

export interface Session {
  id: string;
  userId: string;
  startedAt: string;
  currentMode: Mode;
  currentCapacity: CapacityBand;
  engineInUse: EngineId | null;
  status: SessionStatus;

  // append-only logs, shell-owned
  history: StateSnapshot[];
  events: SessionEvent[];
  safetyEvents: SafetyEvent[];

  // engine slices, each owned by exactly one engine (stubbed in Phase 1)
  trapState: TrapEngineState | null; // Engine 1
  blackSwanState: BlackSwanState | null; // Engine 2

  recoveryScore: RecoveryScore;
}

// Immutable. Written on every state entry. Never edited, never deleted.
export interface StateSnapshot {
  id: string;
  sessionId: string;
  at: string; // ISO-8601
  mode: Mode;
  capacity: CapacityBand;
  engine: EngineId;
  stateName: string; // machine state at this instant
  note?: string; // short structured note; no free-form text
}

// Append-only. User and system events. (Plan name: `Event`.)
export interface SessionEvent {
  id: string;
  sessionId: string;
  at: string;
  type: string; // 'first_check_completed' | 'move_logged' | 'mode_changed' | ...
  payload: Record<string, unknown>;
}

// Append-only. Safety is logged, never silently cleared.
export interface SafetyEvent {
  id: string;
  sessionId: string;
  at: string;
  flag: SafetyFlag;
  originMode: Mode | 'first_check';
  originState: string;
}

export interface RecoveryScore {
  band: CapacityBand;
  successfulMovesInARow: number; // drives ZCFM -> Recovery at >= 2 (Phase 2)
  value?: number; // optional internal 0..100, within-person only
  updatedAt: string;
}

// ---- Engine 1, sealed. STUB in Phase 1; Phase 2B-0 adds optional diagnostic
// holders (type only — left unpopulated, never read or written yet). ----
export interface TrapEngineState {
  phase: 'survival' | 'zcfm' | 'immobile' | 'window_detection' | 'recovery';
  doors: DoorRecord[]; // append-only
  // never 'no_exit' at system level in any automated path
  activeConstraint: 'capacity' | 'compound' | 'immobile' | null;
  lastMove?: { at: string; move: string; completed: boolean };

  // Phase 2B-0 scaffolding. Optional; not populated, routed on, or rendered yet.
  diagnosticResult?: TrapDiagnosticResult | null;
  doorAuditLiteRecords?: DoorAuditLiteRecord[];
  interventionLog?: InterventionLogEntry[];
}

export interface DoorRecord {
  id: string;
  at: string;
  label: string;
  // Aligned with the canonical DoorType union in ./diagnostics (same literals,
  // single source of truth) rather than re-declaring the union here.
  type: DoorType;
  note?: string;
}

// ---- Engine 2, sealed. STUB ONLY in Phase 1. COR is the single source of truth. ----
export interface BlackSwanState {
  stage: 'gate' | 'type' | 'map' | 'target' | 'precommit' | 'execute' | 'audit';
  cor: CrisisOperatingRecord; // single source of truth, read and written by every Strategy screen
}

// The twelve-section record from the Black Swan engine spec.
// Top-level shape only; the full field set is the approved engine spec.
export interface CrisisOperatingRecord {
  runId: string;
  userId: string;
  startedAt: string;
  crisisName: string;
  container: 'inverse_swiss_cheese_model';
  lifeRaft: { fact: string; action: string; observation: string; complete: boolean };
  module0: {
    scores: Record<string, number>; // six domains, 1..10
    direction: Record<string, 'restoring' | 'stable' | 'depleting'>;
    thresholdPass: boolean;
    stabilisationCycles: number;
  };
  diagnostic: { type: string; position: string; primaryDomain: string; capacityClass: string };
  snapshotBaseline: { situation: string; cascade: string; need: string; control: number; date: string };
  cascadeMap: {
    problems: { text: string; reliefCount: number }[];
    catalyst: string;
    cocatalyst: string | null;
    tier1: string[];
    tier2: string[];
    stage: string;
    deadline30d: boolean;
  };
  target: { interruptionPoint: string; triage: Record<string, string>; priorityOrder: string[] };
  precommit: {
    governingDecision: string;
    door: string;
    separation: unknown[];
    energy: Record<string, string[]>;
    humanOverride: { name: string; contact: string; stakesThreshold: string };
    triggers: { trigger: string; preAuthorisedResponse: string }[];
  };
  executionLog: { date: string; mva: string; outcome: string; notes: string }[];
  markerChecks: { tool: string; before: number; after: number; date: string }[];
  progressMarkers: {
    week: number;
    cascadeFrequency: number;
    decisionLatency: number;
    recognitionSpeed: number;
    control: number;
  }[];
  snapshotRetake: {
    situation: string;
    cascade: string;
    need: string;
    control: number;
    date: string;
    controlDelta: number;
  };
  loopDecision: { decision: string; date: string };
}
