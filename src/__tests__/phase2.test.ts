import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { appMachine } from '../machine/appMachine';
import { createSession } from '../state/session';

function startFresh() {
  const actor = createActor(appMachine, { input: { session: createSession('user-test') } });
  actor.start();
  return actor;
}

type Actor = ReturnType<typeof startFresh>;

/** The active Survival sub-state, e.g. 'normal' | 'zcfm' | ... or null. */
function sub(actor: Actor): string | null {
  const value = actor.getSnapshot().value;
  return typeof value === 'object' && value !== null && 'survival' in value
    ? String((value as Record<'survival', unknown>).survival)
    : null;
}

function streak(actor: Actor): number {
  return actor.getSnapshot().context.session.recoveryScore.successfulMovesInARow;
}

// --- builders that drive the machine into each Phase 2 sub-state ---
function toNormal(): Actor {
  const a = startFresh();
  a.send({ type: 'NO_DANGER' });
  a.send({ type: 'CAPACITY_SELECTED', answer: 'B' }); // band 'low' -> survival.normal
  return a;
}
function toZcfm(): Actor {
  const a = toNormal();
  a.send({ type: 'REPORT_NEAR_ZERO' });
  return a;
}
function toImmobile(): Actor {
  const a = toZcfm();
  a.send({ type: 'CANNOT_MOVE' });
  return a;
}
function toWindow(): Actor {
  const a = toImmobile();
  a.send({ type: 'WATCH_FOR_WINDOW' });
  return a;
}
function toRecovery(): Actor {
  const a = toNormal();
  a.send({ type: 'CONFIRM_MOVE', moveId: 'm1' });
  a.send({ type: 'CONFIRM_MOVE', moveId: 'm2' });
  return a;
}

const builders: Record<string, () => Actor> = {
  normal: toNormal,
  zcfm: toZcfm,
  immobile: toImmobile,
  windowDetection: toWindow,
  recovery: toRecovery,
};

describe('SafetyOverride is reachable from every Phase 2 sub-state', () => {
  for (const [name, build] of Object.entries(builders)) {
    it(`from survival.${name}`, () => {
      const a = build();
      expect(sub(a)).toBe(name);

      a.send({ type: 'SAFETY_TRIGGER', flag: 'manual_help_request' });
      expect(a.getSnapshot().value).toBe('safetyOverride');
      expect(a.getSnapshot().context.session.safetyEvents.at(-1)?.flag).toBe('manual_help_request');
    });
  }

  it('SafetyOverride stays terminal when triggered from a sub-state', () => {
    const a = toZcfm();
    a.send({ type: 'SAFETY_TRIGGER', flag: 'medical_emergency' });
    expect(a.getSnapshot().status).toBe('done');

    a.send({ type: 'CONFIRM_MOVE', moveId: 'x' });
    a.send({ type: 'WATCH_FOR_WINDOW' });
    expect(a.getSnapshot().value).toBe('safetyOverride');
  });
});

describe('ZCFM', () => {
  it('is entered from Survival when the user reports near-zero capacity', () => {
    const a = toNormal();
    expect(sub(a)).toBe('normal');
    a.send({ type: 'REPORT_NEAR_ZERO' });
    expect(sub(a)).toBe('zcfm');
  });

  it('is entered directly from First Check when capacity is zero (answer A)', () => {
    const a = startFresh();
    a.send({ type: 'NO_DANGER' });
    a.send({ type: 'CAPACITY_SELECTED', answer: 'A' });
    expect(a.getSnapshot().context.session.currentCapacity).toBe('zero');
    expect(sub(a)).toBe('zcfm');
  });

  it('move completion increments successfulMovesInARow', () => {
    const a = toZcfm();
    expect(streak(a)).toBe(0);
    a.send({ type: 'CONFIRM_MOVE', moveId: 'jaw' });
    expect(streak(a)).toBe(1);
    expect(sub(a)).toBe('zcfm'); // one success: still ZCFM, not yet Recovery
  });
});

describe('Recovery (two-successful-moves rule)', () => {
  it('two successful Survival moves route to Recovery', () => {
    const a = toNormal();
    a.send({ type: 'CONFIRM_MOVE', moveId: 'a' });
    expect(sub(a)).toBe('normal');
    a.send({ type: 'CONFIRM_MOVE', moveId: 'b' });
    expect(sub(a)).toBe('recovery');
    expect(streak(a)).toBeGreaterThanOrEqual(2);
    expect(a.getSnapshot().context.session.events.some((e) => e.type === 'recovery_entered')).toBe(true);
  });

  it('two successful ZCFM moves route to Recovery', () => {
    const a = toZcfm();
    a.send({ type: 'CONFIRM_MOVE', moveId: 'a' });
    a.send({ type: 'CONFIRM_MOVE', moveId: 'b' });
    expect(sub(a)).toBe('recovery');
  });

  it('a capacity drop resets the streak and prevents Recovery', () => {
    const a = toNormal();
    a.send({ type: 'CONFIRM_MOVE', moveId: 'a' }); // streak 1
    a.send({ type: 'REPORT_NEAR_ZERO' }); // reset -> zcfm
    expect(streak(a)).toBe(0);
    a.send({ type: 'CONFIRM_MOVE', moveId: 'b' }); // streak 1 again
    expect(sub(a)).toBe('zcfm'); // not Recovery
  });

  it('exits to Survival on TOO_MUCH and resets the streak', () => {
    const a = toRecovery();
    expect(sub(a)).toBe('recovery');
    a.send({ type: 'TOO_MUCH' });
    expect(sub(a)).toBe('normal');
    expect(streak(a)).toBe(0);
  });

  it('does not unlock Guided Mode (no guided/strategy state exists)', () => {
    const a = toRecovery();
    a.send({ type: 'CONFIRM_MOVE', moveId: 'c' });
    // Still in survival.recovery; there is no path to a guided/strategy mode.
    expect(sub(a)).toBe('recovery');
  });
});

describe('Immobile Constraint', () => {
  it('is non-terminal and is not the SafetyOverride', () => {
    const a = toImmobile();
    expect(sub(a)).toBe('immobile');

    const snap = a.getSnapshot();
    expect(snap.status).toBe('active'); // not a final state
    expect(snap.value).not.toBe('safetyOverride');
    expect(snap.context.session.status).toBe('active'); // not safety_override

    // It can be left — proving it is non-terminal.
    a.send({ type: 'WATCH_FOR_WINDOW' });
    expect(sub(a)).toBe('windowDetection');
  });
});

describe('Window Detection', () => {
  it('routes back to Survival when the user has more capacity', () => {
    const a = toWindow();
    a.send({ type: 'WINDOW_MORE_CAPACITY' });
    expect(sub(a)).toBe('normal');
    expect(a.getSnapshot().context.session.events.some((e) => e.type === 'window_detected')).toBe(true);
  });

  it('routes back to ZCFM when something external changed', () => {
    const a = toWindow();
    a.send({ type: 'WINDOW_EXTERNAL_CHANGE' });
    expect(sub(a)).toBe('zcfm');
  });

  it('stays put, without pressure, on "Not yet"', () => {
    const a = toWindow();
    a.send({ type: 'WINDOW_NONE' });
    expect(sub(a)).toBe('windowDetection');
  });
});

describe('Persistence / append-only across Phase 2', () => {
  it('history only grows across a full sub-state tour', () => {
    const a = toNormal();
    const lengths: number[] = [];
    const record = () => lengths.push(a.getSnapshot().context.session.history.length);

    record();
    a.send({ type: 'REPORT_NEAR_ZERO' }); // -> zcfm
    record();
    a.send({ type: 'CANNOT_MOVE' }); // -> immobile
    record();
    a.send({ type: 'WATCH_FOR_WINDOW' }); // -> windowDetection
    record();
    a.send({ type: 'WINDOW_NONE' }); // stay
    record();
    a.send({ type: 'WINDOW_MORE_CAPACITY' }); // -> normal
    record();

    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThan(lengths[i - 1]);
    }
  });

  it('appends events for capacity drops and window detection', () => {
    const a = toWindow(); // normal -> (drop) zcfm -> (drop) immobile -> windowDetection
    const types = a.getSnapshot().context.session.events.map((e) => e.type);
    expect(types.filter((t) => t === 'capacity_drop').length).toBeGreaterThanOrEqual(2);

    a.send({ type: 'WINDOW_MORE_CAPACITY' });
    expect(a.getSnapshot().context.session.events.some((e) => e.type === 'window_detected')).toBe(true);
  });
});
