import { useEffect, useRef, useState } from 'react';
import { createActor, type SnapshotFrom } from 'xstate';
import { appMachine, type AppEvent } from './machine/appMachine';
import { loadSession, saveSession } from './state/persistence';
import { createSession, createUser } from './state/session';
import { ModeShell } from './components/ModeShell';

type Actor = ReturnType<typeof createActor<typeof appMachine>>;
type Snapshot = SnapshotFrom<typeof appMachine>;

export default function App() {
  const actorRef = useRef<Actor | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Load the single local Session, or create a User + Session on first launch.
      let session = await loadSession();
      if (!session) {
        const user = createUser();
        session = createSession(user.id);
        await saveSession(session);
      }
      if (cancelled) return;

      const actor = createActor(appMachine, { input: { session } });
      // Persist on every transition: the append-only session lives in context.
      actor.subscribe((snap) => {
        setSnapshot(snap);
        void saveSession(snap.context.session);
      });
      actorRef.current = actor;
      actor.start();
    })();

    return () => {
      cancelled = true;
      actorRef.current?.stop();
      actorRef.current = null;
    };
  }, []);

  const send = (event: AppEvent) => actorRef.current?.send(event);

  if (!snapshot) {
    return (
      <main className="screen">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return <ModeShell snapshot={snapshot} send={send} />;
}
