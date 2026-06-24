// Session factory + append-only helpers.
//
// The three logs (history, events, safetyEvents) are append-only by contract:
// the ONLY way to add to them is through the append* helpers below, and there
// is no update or delete path anywhere in the codebase. Each helper returns a
// NEW Session with exactly one item added, so XState context stays immutable.

import type {
  EngineId,
  Mode,
  SafetyEvent,
  SafetyFlag,
  Session,
  SessionEvent,
  StateSnapshot,
  User,
} from './types';

export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function createUser(): User {
  return { id: uuid(), createdAt: nowISO() };
}

export function createSession(userId: string): Session {
  return {
    id: uuid(),
    userId,
    startedAt: nowISO(),
    // Phase 1 default-safe posture: survival mode, low capacity until the
    // First Check computes a real band.
    currentMode: 'survival',
    currentCapacity: 'low',
    engineInUse: null,
    status: 'active',
    history: [],
    events: [],
    safetyEvents: [],
    trapState: null,
    blackSwanState: null,
    recoveryScore: { band: 'low', successfulMovesInARow: 0, updatedAt: nowISO() },
  };
}

// ---- factories for log items ----

export function makeSnapshot(session: Session, stateName: string, engine: EngineId): StateSnapshot {
  return {
    id: uuid(),
    sessionId: session.id,
    at: nowISO(),
    mode: session.currentMode,
    capacity: session.currentCapacity,
    engine,
    stateName,
  };
}

export function makeEvent(
  session: Session,
  type: string,
  payload: Record<string, unknown> = {},
): SessionEvent {
  return { id: uuid(), sessionId: session.id, at: nowISO(), type, payload };
}

/**
 * Derive a safety event's originMode from the atomic machine state where it
 * fired. Phase 2A: `firstCheck.*` -> 'first_check', `survival.*` -> 'survival'.
 * Future modes (guided/strategy/observatory) extend this mapping later; until
 * then we fall back to the session's current mode. The pattern is preserved so
 * those modes are a drop-in addition.
 */
export function originModeForState(stateName: string, fallback: Mode): SafetyEvent['originMode'] {
  if (stateName.startsWith('firstCheck')) return 'first_check';
  if (stateName.startsWith('survival')) return 'survival';
  return fallback;
}

// `originState` is the exact atomic machine state (e.g. 'survival.zcfm') where
// the trigger fired — passed in so provenance is not lost.
export function makeSafetyEvent(session: Session, flag: SafetyFlag, originState: string): SafetyEvent {
  return {
    id: uuid(),
    sessionId: session.id,
    at: nowISO(),
    flag,
    originMode: originModeForState(originState, session.currentMode),
    originState,
  };
}

// ---- append-only helpers (the only mutation surface for the logs) ----

export function appendSnapshot(session: Session, snapshot: StateSnapshot): Session {
  return { ...session, history: [...session.history, snapshot] };
}

export function appendEvent(session: Session, event: SessionEvent): Session {
  return { ...session, events: [...session.events, event] };
}

export function appendSafetyEvent(session: Session, event: SafetyEvent): Session {
  return { ...session, safetyEvents: [...session.safetyEvents, event] };
}
