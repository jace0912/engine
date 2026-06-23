// Session factory + append-only helpers.
//
// The three logs (history, events, safetyEvents) are append-only by contract:
// the ONLY way to add to them is through the append* helpers below, and there
// is no update or delete path anywhere in the codebase. Each helper returns a
// NEW Session with exactly one item added, so XState context stays immutable.

import type {
  EngineId,
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

export function makeSafetyEvent(session: Session, flag: SafetyFlag): SafetyEvent {
  return {
    id: uuid(),
    sessionId: session.id,
    at: nowISO(),
    flag,
    originMode: session.currentMode,
    originState: session.currentMode,
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
