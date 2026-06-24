import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { appMachine, type AppEvent } from '../machine/appMachine';
import { createSession } from '../state/session';

type Actor = ReturnType<typeof createActor<typeof appMachine>>;

function start(session = createSession('u')): Actor {
  const actor = createActor(appMachine, { input: { session } });
  actor.start();
  return actor;
}
const send = (a: Actor, e: AppEvent) => a.send(e);
const lastSafety = (a: Actor) => a.getSnapshot().context.session.safetyEvents.at(-1);

// Builders that settle the machine into each survival sub-state.
const toNormal = (): Actor => {
  const a = start();
  send(a, { type: 'NO_DANGER' });
  send(a, { type: 'CAPACITY_SELECTED', answer: 'B' });
  return a;
};
const toZcfm = (): Actor => {
  const a = toNormal();
  send(a, { type: 'REPORT_NEAR_ZERO' });
  return a;
};
const toImmobile = (): Actor => {
  const a = toZcfm();
  send(a, { type: 'CANNOT_MOVE' });
  return a;
};
const toWindow = (): Actor => {
  const a = toImmobile();
  send(a, { type: 'WATCH_FOR_WINDOW' });
  return a;
};
const toRecovery = (): Actor => {
  const a = toNormal();
  send(a, { type: 'CONFIRM_MOVE', moveId: 'a' });
  send(a, { type: 'CONFIRM_MOVE', moveId: 'b' });
  return a;
};

describe('Safety-event provenance — First Check', () => {
  it('a danger flag at the danger gate logs first_check + firstCheck.dangerGate', () => {
    const a = start();
    send(a, { type: 'SAFETY_TRIGGER', flag: 'suicide_self_harm' });
    const ev = lastSafety(a);
    expect(ev?.originMode).toBe('first_check');
    expect(ev?.originState).toBe('firstCheck.dangerGate');
    expect(ev?.flag).toBe('suicide_self_harm'); // flag itself is unchanged
  });

  it('a danger flag at the capacity read logs first_check + firstCheck.capacityRead', () => {
    const a = start();
    send(a, { type: 'NO_DANGER' });
    send(a, { type: 'SAFETY_TRIGGER', flag: 'manual_help_request' });
    const ev = lastSafety(a);
    expect(ev?.originMode).toBe('first_check');
    expect(ev?.originState).toBe('firstCheck.capacityRead');
  });
});

describe('Safety-event provenance — Survival sub-states', () => {
  it.each([
    ['normal', toNormal, 'survival.normal'],
    ['zcfm', toZcfm, 'survival.zcfm'],
    ['immobile', toImmobile, 'survival.immobile'],
    ['windowDetection', toWindow, 'survival.windowDetection'],
    ['recovery', toRecovery, 'survival.recovery'],
  ] as const)('SAFETY_TRIGGER from survival.%s logs that exact originState', (_name, build, originState) => {
    const a = build();
    send(a, { type: 'SAFETY_TRIGGER', flag: 'manual_help_request' });
    const ev = lastSafety(a);
    expect(ev?.originState).toBe(originState);
    expect(ev?.originMode).toBe('survival');
  });
});

describe('Safety-event provenance — invariants preserved', () => {
  it('SafetyOverride remains terminal after a provenance-tagged trigger', () => {
    const a = toZcfm();
    send(a, { type: 'SAFETY_TRIGGER', flag: 'manual_help_request' });
    expect(a.getSnapshot().status).toBe('done');
    expect(a.getSnapshot().value).toBe('safetyOverride');

    // Further tool events are ignored.
    send(a, { type: 'CONFIRM_MOVE', moveId: 'x' });
    expect(a.getSnapshot().value).toBe('safetyOverride');
  });

  it('boot resume into SafetyOverride does not duplicate the SafetyEvent', () => {
    const a1 = toNormal();
    send(a1, { type: 'SAFETY_TRIGGER', flag: 'violence_abuse' });
    const persisted = a1.getSnapshot().context.session;
    expect(persisted.safetyEvents).toHaveLength(1);
    expect(persisted.safetyEvents[0].originState).toBe('survival.normal');

    // Reload: a new actor with the persisted (safety) session resumes via the
    // boot `always` guard — NOT via SAFETY_TRIGGER — so no new event is logged.
    const a2 = createActor(appMachine, { input: { session: persisted } });
    a2.start();
    expect(a2.getSnapshot().value).toBe('safetyOverride');
    expect(a2.getSnapshot().context.session.safetyEvents).toHaveLength(1);
  });
});
