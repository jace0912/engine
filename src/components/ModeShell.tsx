// Hosts the active mode screen and always mounts the SafetyOverlay. Owns the
// mapping from machine state -> screen, including the Phase 2 Survival
// sub-states. When the session is in the Safety Override, all tool screens are
// suppressed and the overlay takes over.

import type { SnapshotFrom } from 'xstate';
import type { AppEvent, appMachine } from '../machine/appMachine';
import { FirstCheckScreen } from './FirstCheckScreen';
import { ImmobileScreen } from './ImmobileScreen';
import { RecoveryScreen } from './RecoveryScreen';
import { SafetyOverlay } from './SafetyOverlay';
import { SurvivalScreen } from './SurvivalScreen';
import { WindowDetectionScreen } from './WindowDetectionScreen';
import { ZCFMScreen } from './ZCFMScreen';

type Snapshot = SnapshotFrom<typeof appMachine>;

interface Props {
  snapshot: Snapshot;
  send: (event: AppEvent) => void;
}

function isFirstCheck(value: Snapshot['value']): boolean {
  return typeof value === 'object' && value !== null && 'firstCheck' in value;
}

function survivalChild(value: Snapshot['value']): string | null {
  if (typeof value === 'object' && value !== null && 'survival' in value) {
    return String((value as Record<'survival', unknown>).survival);
  }
  return null;
}

export function ModeShell({ snapshot, send }: Props) {
  const { value } = snapshot;
  const session = snapshot.context.session;
  const inSafety = value === 'safetyOverride' || session.status === 'safety_override';
  const sub = survivalChild(value);
  const count = session.recoveryScore.successfulMovesInARow;

  return (
    <div className="app-shell">
      {/* Tool flow is suppressed and hidden while the Safety Override is active. */}
      <main className="screen" aria-hidden={inSafety} hidden={inSafety}>
        {!inSafety && isFirstCheck(value) && <FirstCheckScreen snapshot={snapshot} send={send} />}
        {!inSafety && sub === 'normal' && <SurvivalScreen send={send} count={count} />}
        {!inSafety && sub === 'zcfm' && <ZCFMScreen send={send} count={count} />}
        {!inSafety && sub === 'immobile' && <ImmobileScreen send={send} />}
        {!inSafety && sub === 'windowDetection' && <WindowDetectionScreen send={send} />}
        {!inSafety && sub === 'recovery' && <RecoveryScreen send={send} count={count} />}
        {!inSafety && value === 'boot' && <p className="muted">Starting…</p>}
      </main>

      {/* Always mounted, in every state and sub-state. */}
      <SafetyOverlay inSafety={inSafety} send={send} />
    </div>
  );
}
