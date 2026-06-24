// Top-level XState v5 machine.
//
// Phase 1 (unchanged behaviour): boot -> firstCheck -> survival, with a global
// terminal safetyOverride reachable from every state.
//
// Phase 2 extends Survival Mode into the Engine 1 movement sub-state layer:
//
//   survival (compound, id 'survival')
//     router (transient) ──> normal | zcfm        (zero capacity routes to zcfm)
//     normal ──CONFIRM_MOVE──> (2 in a row) recovery | stay
//            ──REPORT_NEAR_ZERO──> zcfm
//     zcfm   ──CONFIRM_MOVE──> (2 in a row) recovery | stay
//            ──CANNOT_MOVE──> immobile
//     immobile ──WATCH_FOR_WINDOW──> windowDetection        (non-terminal)
//     windowDetection ──WINDOW_MORE_CAPACITY──> normal
//                     ──WINDOW_EXTERNAL_CHANGE──> zcfm
//                     ──WINDOW_NONE──> (stay)
//     recovery ──CONFIRM_MOVE──> (stay) ; ──TOO_MUCH──> normal
//
// Invariants preserved from Phase 1:
//  - safetyOverride is global (root SAFETY_TRIGGER handler) and `final`/terminal.
//  - Exactly one immutable StateSnapshot is appended on entry to every atomic
//    state. Compound `survival` and the transient `router` do not snapshot;
//    each occupied atomic sub-state contributes exactly one snapshot. A
//    confirmed move that stays in place also appends one snapshot (as in P1).
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

/** Two successful moves in a row route the user up into Recovery. */
export const RECOVERY_THRESHOLD = 2;

export interface AppContext {
  session: Session;
}

export type AppEvent =
  | { type: 'NO_DANGER' }
  | { type: 'CAPACITY_SELECTED'; answer: CapacityAnswer }
  | { type: 'CONFIRM_MOVE'; moveId: string }
  | { type: 'REPORT_NEAR_ZERO' }
  | { type: 'CANNOT_MOVE' }
  | { type: 'WATCH_FOR_WINDOW' }
  | { type: 'WINDOW_MORE_CAPACITY' }
  | { type: 'WINDOW_EXTERNAL_CHANGE' }
  | { type: 'WINDOW_NONE' }
  | { type: 'TOO_MUCH' }
  | { type: 'SAFETY_TRIGGER'; flag: SafetyFlag };

export interface AppInput {
  session: Session;
}

interface SnapshotParams {
  stateName: string;
  engine: EngineId;
}

const TRAP_SNAPSHOT = (stateName: string) =>
  ({ type: 'writeSnapshot', params: { stateName, engine: 'trap' } }) as const;

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
    input: {} as AppInput,
  },
  guards: {
    // Resume a persisted safety session straight into the override on boot.
    sessionInSafety: ({ context }) => context.session.status === 'safety_override',
    // Near-zero capacity lands directly in ZCFM rather than the normal move.
    capacityIsZero: ({ context }) => context.session.currentCapacity === 'zero',
    // This completion will be the second-in-a-row, so route up into Recovery.
    willReachRecovery: ({ context }) =>
      context.session.recoveryScore.successfulMovesInARow + 1 >= RECOVERY_THRESHOLD,
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

    setCapacity: assign(({ context }, params: { band: CapacityBand }) => ({
      session: {
        ...context.session,
        currentCapacity: params.band,
        recoveryScore: {
          ...context.session.recoveryScore,
          band: params.band,
          updatedAt: new Date().toISOString(),
        },
      },
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

    incrementStreak: assign(({ context }) => ({
      session: {
        ...context.session,
        recoveryScore: {
          ...context.session.recoveryScore,
          successfulMovesInARow: context.session.recoveryScore.successfulMovesInARow + 1,
          updatedAt: new Date().toISOString(),
        },
      },
    })),

    resetStreak: assign(({ context }) => ({
      session: {
        ...context.session,
        recoveryScore: {
          ...context.session.recoveryScore,
          successfulMovesInARow: 0,
          updatedAt: new Date().toISOString(),
        },
      },
    })),

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

    logEvent: assign(({ context }, params: { type: string; payload?: Record<string, unknown> }) => ({
      session: appendEvent(context.session, makeEvent(context.session, params.type, params.payload ?? {})),
    })),

    recordSafetyEvent: assign(({ context, event }) => {
      const { flag } = event as Extract<AppEvent, { type: 'SAFETY_TRIGGER' }>;
      // Provenance: the atomic state active when the trigger fired is the most
      // recent snapshot (one is written on entry to every atomic state).
      const originState = context.session.history.at(-1)?.stateName ?? context.session.currentMode;
      const withEvent = appendSafetyEvent(
        context.session,
        makeSafetyEvent(context.session, flag, originState),
      );
      return { session: { ...withEvent, status: 'safety_override' as const } };
    }),
  },
}).createMachine({
  id: 'app',
  context: ({ input }) => ({ session: input.session }),
  initial: 'boot',

  // Global safety guard: reachable from every state and sub-state. Always wins.
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
          entry: { type: 'writeSnapshot', params: { stateName: 'firstCheck.dangerGate', engine: 'shell' } },
          on: { NO_DANGER: { target: 'capacityRead' } },
        },
        capacityRead: {
          entry: { type: 'writeSnapshot', params: { stateName: 'firstCheck.capacityRead', engine: 'shell' } },
          on: {
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
      entry: 'markSurvival',
      initial: 'router',
      states: {
        // Transient routing node: picks the landing sub-state by capacity.
        // It is never "occupied", so it writes no snapshot.
        router: {
          always: [
            { guard: 'capacityIsZero', target: 'zcfm' },
            { target: 'normal' },
          ],
        },

        normal: {
          entry: TRAP_SNAPSHOT('survival.normal'),
          on: {
            CONFIRM_MOVE: [
              { guard: 'willReachRecovery', target: 'recovery', actions: ['incrementStreak', 'logMove'] },
              { actions: ['incrementStreak', 'logMove', TRAP_SNAPSHOT('survival.normal')] },
            ],
            REPORT_NEAR_ZERO: {
              target: 'zcfm',
              actions: [
                { type: 'setCapacity', params: { band: 'zero' } },
                'resetStreak',
                { type: 'logEvent', params: { type: 'capacity_drop', payload: { from: 'survival.normal' } } },
              ],
            },
          },
        },

        zcfm: {
          entry: TRAP_SNAPSHOT('survival.zcfm'),
          on: {
            CONFIRM_MOVE: [
              { guard: 'willReachRecovery', target: 'recovery', actions: ['incrementStreak', 'logMove'] },
              { actions: ['incrementStreak', 'logMove', TRAP_SNAPSHOT('survival.zcfm')] },
            ],
            CANNOT_MOVE: {
              target: 'immobile',
              actions: [
                { type: 'setCapacity', params: { band: 'zero' } },
                'resetStreak',
                { type: 'logEvent', params: { type: 'capacity_drop', payload: { from: 'survival.zcfm' } } },
              ],
            },
          },
        },

        // Non-terminal capacity constraint. Not SafetyOverride, not No-Exit.
        immobile: {
          entry: TRAP_SNAPSHOT('survival.immobile'),
          on: {
            WATCH_FOR_WINDOW: { target: 'windowDetection' },
          },
        },

        windowDetection: {
          entry: TRAP_SNAPSHOT('survival.windowDetection'),
          on: {
            WINDOW_MORE_CAPACITY: {
              target: 'normal',
              actions: [
                { type: 'setCapacity', params: { band: 'low' } },
                { type: 'logEvent', params: { type: 'window_detected', payload: { via: 'more_capacity' } } },
              ],
            },
            WINDOW_EXTERNAL_CHANGE: {
              target: 'zcfm',
              actions: [
                { type: 'setCapacity', params: { band: 'low' } },
                { type: 'logEvent', params: { type: 'window_detected', payload: { via: 'external_change' } } },
              ],
            },
            // No window yet: stay, no pressure. Record the check + a snapshot.
            WINDOW_NONE: {
              actions: [
                { type: 'logEvent', params: { type: 'window_checked', payload: { opened: false } } },
                TRAP_SNAPSHOT('survival.windowDetection'),
              ],
            },
          },
        },

        recovery: {
          entry: [
            { type: 'setCapacity', params: { band: 'recovering' } },
            { type: 'logEvent', params: { type: 'recovery_entered' } },
            TRAP_SNAPSHOT('survival.recovery'),
          ],
          on: {
            CONFIRM_MOVE: {
              actions: ['incrementStreak', 'logMove', TRAP_SNAPSHOT('survival.recovery')],
            },
            // Capacity dip / move too much: regress one rung to normal Survival.
            TOO_MUCH: {
              target: 'normal',
              actions: [
                { type: 'setCapacity', params: { band: 'low' } },
                'resetStreak',
                { type: 'logEvent', params: { type: 'capacity_drop', payload: { from: 'survival.recovery' } } },
              ],
            },
          },
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
