// Hosts the active mode screen and always mounts the SafetyOverlay.
// Owns the mapping from machine state -> screen. When the session is in the
// Safety Override, all tool screens are suppressed and the overlay takes over.

import type { SnapshotFrom } from 'xstate';
import type { AppEvent, appMachine } from '../machine/appMachine';
import { FirstCheckScreen } from './FirstCheckScreen';
import { SafetyOverlay } from './SafetyOverlay';
import { SurvivalScreen } from './SurvivalScreen';

type Snapshot = SnapshotFrom<typeof appMachine>;

interface Props {
  snapshot: Snapshot;
  send: (event: AppEvent) => void;
}

function isFirstCheck(value: Snapshot['value']): boolean {
  return typeof value === 'object' && value !== null && 'firstCheck' in value;
}

export function ModeShell({ snapshot, send }: Props) {
  const { value } = snapshot;
  const inSafety =
    value === 'safetyOverride' || snapshot.context.session.status === 'safety_override';

  return (
    <div className="app-shell">
      {/* Tool flow is suppressed and hidden while the Safety Override is active. */}
      <main className="screen" aria-hidden={inSafety} hidden={inSafety}>
        {!inSafety && isFirstCheck(value) && <FirstCheckScreen snapshot={snapshot} send={send} />}
        {!inSafety && value === 'survival' && <SurvivalScreen send={send} />}
        {!inSafety && value === 'boot' && <p className="muted">Starting…</p>}
      </main>

      {/* Always mounted, in every state. */}
      <SafetyOverlay inSafety={inSafety} send={send} />
    </div>
  );
}
