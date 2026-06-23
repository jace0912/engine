import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { appMachine } from '../machine/appMachine';
import { createSession } from '../state/session';

function startFresh() {
  const session = createSession('user-test');
  const actor = createActor(appMachine, { input: { session } });
  actor.start();
  return actor;
}

// Phase 2 makes `survival` a compound state, so its value is now an object
// like { survival: 'normal' } rather than the bare string 'survival'. This
// helper keeps the Phase 1 assertions valid against either shape.
function isInSurvival(value: unknown): boolean {
  return value === 'survival' || (typeof value === 'object' && value !== null && 'survival' in value);
}

describe('Safety Override is reachable from every state', () => {
  it('routes to safety from the danger gate and records a SafetyEvent', () => {
    const actor = startFresh();
    actor.send({ type: 'SAFETY_TRIGGER', flag: 'suicide_self_harm' });

    const snap = actor.getSnapshot();
    expect(snap.value).toBe('safetyOverride');
    expect(snap.context.session.status).toBe('safety_override');
    expect(snap.context.session.safetyEvents).toHaveLength(1);
    expect(snap.context.session.safetyEvents[0].flag).toBe('suicide_self_harm');
  });

  it('routes to safety from the capacity read', () => {
    const actor = startFresh();
    actor.send({ type: 'NO_DANGER' });
    actor.send({ type: 'SAFETY_TRIGGER', flag: 'manual_help_request' });

    const snap = actor.getSnapshot();
    expect(snap.value).toBe('safetyOverride');
    expect(snap.context.session.safetyEvents.at(-1)?.flag).toBe('manual_help_request');
  });

  it('routes to safety from survival', () => {
    const actor = startFresh();
    actor.send({ type: 'NO_DANGER' });
    actor.send({ type: 'CAPACITY_SELECTED', answer: 'B' });
    expect(isInSurvival(actor.getSnapshot().value)).toBe(true);

    actor.send({ type: 'SAFETY_TRIGGER', flag: 'manual_help_request' });
    expect(actor.getSnapshot().value).toBe('safetyOverride');
  });
});

describe('Safety Override is terminal and blocks re-entry', () => {
  it('ignores tool events once in safety', () => {
    const actor = startFresh();
    actor.send({ type: 'SAFETY_TRIGGER', flag: 'violence_abuse' });
    expect(actor.getSnapshot().status).toBe('done'); // actor reached a final state

    // Any attempt to get back into a tool is ignored.
    actor.send({ type: 'NO_DANGER' });
    actor.send({ type: 'CAPACITY_SELECTED', answer: 'D' });
    expect(actor.getSnapshot().value).toBe('safetyOverride');
  });

  it('a persisted safety session resumes straight into safety on boot', () => {
    const session = { ...createSession('u'), status: 'safety_override' as const };
    const actor = createActor(appMachine, { input: { session } });
    actor.start();
    expect(actor.getSnapshot().value).toBe('safetyOverride');
    // No new SafetyEvent is recorded on resume — the original log is intact.
    expect(actor.getSnapshot().context.session.safetyEvents).toHaveLength(0);
  });
});

describe('First Check computes and stores a capacity band', () => {
  it.each([
    ['A', 'zero'],
    ['B', 'low'],
    ['C', 'recovering'],
    ['D', 'stable'],
  ] as const)('answer %s maps to band %s and routes to survival', (answer, band) => {
    const actor = startFresh();
    actor.send({ type: 'NO_DANGER' });
    actor.send({ type: 'CAPACITY_SELECTED', answer });

    const snap = actor.getSnapshot();
    expect(snap.context.session.currentCapacity).toBe(band);
    expect(isInSurvival(snap.value)).toBe(true); // Phase 1: all danger-free bands -> survival

    const firstCheck = snap.context.session.events.find((e) => e.type === 'first_check_completed');
    expect(firstCheck).toBeDefined();
    expect(firstCheck?.payload.band).toBe(band);
  });
});

describe('Survival confirm writes an Event and stays in survival', () => {
  it('appends a move_logged event plus a snapshot', () => {
    const actor = startFresh();
    actor.send({ type: 'NO_DANGER' });
    actor.send({ type: 'CAPACITY_SELECTED', answer: 'B' });

    const before = actor.getSnapshot().context.session;
    actor.send({ type: 'CONFIRM_MOVE', moveId: 'breath' });
    const after = actor.getSnapshot();

    expect(isInSurvival(after.value)).toBe(true);
    expect(after.context.session.events.some((e) => e.type === 'move_logged')).toBe(true);
    expect(after.context.session.history.length).toBe(before.history.length + 1);
  });
});

describe('StateSnapshots are append-only (history only grows)', () => {
  it('history length is monotonically non-decreasing and one is written per entry', () => {
    const actor = startFresh();
    const lengths: number[] = [];
    const record = () => lengths.push(actor.getSnapshot().context.session.history.length);

    record(); // boot + firstCheck.dangerGate
    actor.send({ type: 'NO_DANGER' });
    record(); // + firstCheck.capacityRead
    actor.send({ type: 'CAPACITY_SELECTED', answer: 'C' });
    record(); // + survival
    actor.send({ type: 'CONFIRM_MOVE', moveId: 'breath' });
    record(); // + survival (confirm)
    actor.send({ type: 'CONFIRM_MOVE', moveId: 'water' });
    record(); // + survival (confirm)

    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThan(lengths[i - 1]);
    }
    expect(lengths[0]).toBe(2); // boot + dangerGate written on start
  });
});
