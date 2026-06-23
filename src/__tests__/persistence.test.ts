import { beforeEach, describe, expect, it } from 'vitest';
import { loadSession, saveSession } from '../state/persistence';
import { createSession } from '../state/session';

// jsdom has no IndexedDB, so these exercise the localStorage fallback that
// keeps the Session offline-first.
describe('Session persists locally and reloads', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a session, preserving the stored capacity band', async () => {
    const session = { ...createSession('u1'), currentCapacity: 'stable' as const };
    await saveSession(session);

    const loaded = await loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(session.id);
    expect(loaded?.currentCapacity).toBe('stable');
  });

  it('returns null when nothing has been stored', async () => {
    expect(await loadSession()).toBeNull();
  });
});
