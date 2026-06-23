// Survival "normal" sub-state: one fixed templated move + confirm. Confirming
// logs a move and counts toward Recovery (two in a row). "I can't do this right
// now" reports near-zero capacity and routes down to ZCFM. Fixed text only.

import type { AppEvent } from '../machine/appMachine';
import { survivalMoves } from '../content/survivalMoves';

interface Props {
  send: (event: AppEvent) => void;
  count: number;
}

export function SurvivalScreen({ send, count }: Props) {
  const move = survivalMoves[count % survivalMoves.length];
  return (
    <section>
      <h1>One thing for the next few minutes</h1>
      <p className="move">{move.text}</p>
      <div className="actions">
        <button
          type="button"
          className="choice primary"
          onClick={() => send({ type: 'CONFIRM_MOVE', moveId: move.id })}
        >
          I did this
        </button>
        <button type="button" className="choice" onClick={() => send({ type: 'REPORT_NEAR_ZERO' })}>
          I can’t do this right now
        </button>
      </div>
    </section>
  );
}
