// Top-level XState v5 machine for Phase 1.
//
//   boot ──(always)──> firstCheck ──> survival
//                          │
//   SAFETY_TRIGGER (root, from ANY state) ──> safetyOverride  [terminal/final]
//
// Invariants enforced here:
//  - The Safety Override is reachable from every state via the root-level
//    SAFETY_TRIGGER handler, and is a `final` state (terminal for the session,
//    blocks re-entry into any tool).
//  - On entry to every (atomic) state, exactly one immutable StateSnapshot is
//    appended. Compound `firstCheck` delegates to its atomic children, so each
//    occupied state contributes exactly one snapshot.
//  - All log mutations go through the append-only helpers in state/session.ts.

import { assign, setup } from 'xstate';
import type { CapacityBand, EngineId, SafetyFlag, Session } from '../state/types';
import {
  appendEvent,
  appendSafetyEvent,
  appendSnapshot,
  makeEvent,
  makeSafetyEvent,
  makeSnapshot,
} from '../state/session';
import { bandForAnswer, type CapacityAnswer } from './guards';

export interface AppContext {
  session: Session;
}

export type AppEvent =
  | { type: 'NO_DANGER' }
  | { type: 'CAPACITY_SELECTED'; answer: CapacityAnswer }
  | { type: 'CONFIRM_MOVE'; moveId: string }
  | { type: 'SAFETY_TRIGGER'; flag: SafetyFlag };

export interface AppInput {
  session: Session;
}

interface SnapshotParams {
  stateName: string;
  engine: EngineId;
}

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
    input: {} as AppInput,
  },
  guards: {
    // A persisted safety session must resume straight into the override on
    // boot, so a terminated session can never be re-entered after reload.
    sessionInSafety: ({ context }) => context.session.status === 'safety_override',
  },
  actions: {
    writeSnapshot: assign(({ context }, params: SnapshotParams) => ({
      session: appendSnapshot(
        context.session,
        makeSnapshot(context.session, params.stateName, params.engine),
      ),
    })),

    markSurvival: assign(({ context }) => ({
      session: { ...context.session, currentMode: 'survival' as const, engineInUse: 'trap' as const },
    })),

    computeBand: assign(({ context, event }) => {
      const { answer } = event as Extract<AppEvent, { type: 'CAPACITY_SELECTED' }>;
      const band: CapacityBand = bandForAnswer(answer);
      return {
        session: {
          ...context.session,
          currentCapacity: band,
          recoveryScore: {
            ...context.session.recoveryScore,
            band,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }),

    logFirstCheck: assign(({ context }) => ({
      session: appendEvent(
        context.session,
        makeEvent(context.session, 'first_check_completed', {
          band: context.session.currentCapacity,
        }),
      ),
    })),

    logMove: assign(({ context, event }) => {
      const { moveId } = event as Extract<AppEvent, { type: 'CONFIRM_MOVE' }>;
      return {
        session: appendEvent(context.session, makeEvent(context.session, 'move_logged', { moveId })),
      };
    }),

    recordSafetyEvent: assign(({ context, event }) => {
      const { flag } = event as Extract<AppEvent, { type: 'SAFETY_TRIGGER' }>;
      const withEvent = appendSafetyEvent(context.session, makeSafetyEvent(context.session, flag));
      return { session: { ...withEvent, status: 'safety_override' as const } };
    }),
  },
}).createMachine({
  id: 'app',
  context: ({ input }) => ({ session: input.session }),
  initial: 'boot',

  // Global safety guard: reachable from every state. Always wins.
  on: {
    SAFETY_TRIGGER: {
      target: '#safetyOverride',
      actions: 'recordSafetyEvent',
    },
  },

  states: {
    boot: {
      entry: { type: 'writeSnapshot', params: { stateName: 'boot', engine: 'shell' } },
      always: [
        { guard: 'sessionInSafety', target: '#safetyOverride' },
        { target: 'firstCheck' },
      ],
    },

    firstCheck: {
      initial: 'dangerGate',
      states: {
        dangerGate: {
          entry: {
            type: 'writeSnapshot',
            params: { stateName: 'firstCheck.dangerGate', engine: 'shell' },
          },
          // Selecting any danger condition dispatches the global SAFETY_TRIGGER
          // (handled at the root). "None of these" continues to the capacity read.
          on: { NO_DANGER: { target: 'capacityRead' } },
        },
        capacityRead: {
          entry: {
            type: 'writeSnapshot',
            params: { stateName: 'firstCheck.capacityRead', engine: 'shell' },
          },
          on: {
            // Phase 1: every danger-free band routes to Survival; the computed
            // band is stored on the session for later phases.
            CAPACITY_SELECTED: {
              target: '#survival',
              actions: ['computeBand', 'logFirstCheck'],
            },
          },
        },
      },
    },

    survival: {
      id: 'survival',
      entry: [
        'markSurvival',
        { type: 'writeSnapshot', params: { stateName: 'survival', engine: 'trap' } },
      ],
      on: {
        CONFIRM_MOVE: {
          // Stay in survival; log the move and append a snapshot.
          actions: [
            'logMove',
            { type: 'writeSnapshot', params: { stateName: 'survival', engine: 'trap' } },
          ],
        },
      },
    },

    safetyOverride: {
      id: 'safetyOverride',
      type: 'final', // terminal for the session; the actor stops, blocking re-entry
      entry: { type: 'writeSnapshot', params: { stateName: 'safetyOverride', engine: 'shell' } },
    },
  },
});
