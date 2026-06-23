// ZCFM screen: one ultra-small move for near-zero capacity. "I did this"
// counts as success whether attempted or completed. "I can't do even this"
// routes down to the Immobile Constraint. Fixed text only.

import type { AppEvent } from '../machine/appMachine';
import { zcfmMoveForCount } from '../content/zcfmMoves';

interface Props {
  send: (event: AppEvent) => void;
  count: number;
}

export function ZCFMScreen({ send, count }: Props) {
  const move = zcfmMoveForCount(count);
  return (
    <section>
      <h1>Just one very small thing</h1>
      <p className="move">{move.text}</p>
      <div className="actions">
        <button
          type="button"
          className="choice primary"
          onClick={() => send({ type: 'CONFIRM_MOVE', moveId: move.id })}
        >
          I did this — or tried
        </button>
        <button type="button" className="choice" onClick={() => send({ type: 'CANNOT_MOVE' })}>
          I can’t do even this right now
        </button>
      </div>
    </section>
  );
}
