import { describe, expect, it } from 'vitest';
import {
  appendEvent,
  appendSafetyEvent,
  appendSnapshot,
  createSession,
  makeEvent,
  makeSafetyEvent,
  makeSnapshot,
} from '../state/session';
import * as sessionModule from '../state/session';

describe('append-only log helpers', () => {
  it('appendSnapshot grows history by exactly one and is immutable', () => {
    const s0 = createSession('u');
    const s1 = appendSnapshot(s0, makeSnapshot(s0, 'boot', 'shell'));
    const s2 = appendSnapshot(s1, makeSnapshot(s1, 'survival', 'trap'));

    expect(s0.history).toHaveLength(0); // original untouched
    expect(s1.history).toHaveLength(1);
    expect(s2.history).toHaveLength(2);
    expect(s2.history[0].stateName).toBe('boot');
    expect(s2.history[1].stateName).toBe('survival');
  });

  it('appendEvent and appendSafetyEvent each grow by exactly one', () => {
    const s0 = createSession('u');
    const s1 = appendEvent(s0, makeEvent(s0, 'move_logged', { moveId: 'breath' }));
    const s2 = appendSafetyEvent(s1, makeSafetyEvent(s1, 'manual_help_request'));

    expect(s1.events).toHaveLength(1);
    expect(s2.safetyEvents).toHaveLength(1);
    expect(s2.events).toHaveLength(1); // unchanged by the safety append
  });

  it('exposes no delete or update path on the logs', () => {
    // The module's only mutation surface is the append* helpers. This is a
    // documentation guard: there is no removeSnapshot / clearEvents export.
    const mod = sessionModule as Record<string, unknown>;
    const forbidden = ['removeSnapshot', 'deleteEvent', 'clearEvents', 'clearHistory', 'popSnapshot'];
    for (const name of forbidden) expect(mod[name]).toBeUndefined();
  });
});
