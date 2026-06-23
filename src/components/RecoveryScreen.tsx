// Recovery screen: acknowledge the two completed moves, offer one small next
// step. Recovery does NOT unlock Guided Mode (that is Phase 3) — there is no
// path forward here beyond another small move, or stepping back if it is too
// much.

import type { AppEvent } from '../machine/appMachine';
import { recoveryCopy, recoveryMoveForCount } from '../content/recoveryCopy';

interface Props {
  send: (event: AppEvent) => void;
  count: number;
}

export function RecoveryScreen({ send, count }: Props) {
  const move = recoveryMoveForCount(count);
  return (
    <section>
      <h1>{recoveryCopy.headline}</h1>
      <p className="muted">{recoveryCopy.body}</p>
      <p className="move">{move.text}</p>
      <div className="actions">
        <button
          type="button"
          className="choice primary"
          onClick={() => send({ type: 'CONFIRM_MOVE', moveId: move.id })}
        >
          I did this
        </button>
        <button type="button" className="choice" onClick={() => send({ type: 'TOO_MUCH' })}>
          {recoveryCopy.tooMuchLabel}
        </button>
      </div>
    </section>
  );
}
