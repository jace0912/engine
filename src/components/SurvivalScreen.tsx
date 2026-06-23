// Survival Mode placeholder: one fixed templated move, one confirm button.
// The SafetyOverlay (mounted by ModeShell) stays visible. Confirm logs a
// move_logged Event and stays in Survival. Fixed text only — no generation.

import { useState } from 'react';
import type { AppEvent } from '../machine/appMachine';
import { firstSurvivalMove } from '../content/survivalMoves';

interface Props {
  send: (event: AppEvent) => void;
}

export function SurvivalScreen({ send }: Props) {
  // Local UI acknowledgement only; the authoritative record is the session log.
  const [confirmedCount, setConfirmedCount] = useState(0);

  const confirm = () => {
    send({ type: 'CONFIRM_MOVE', moveId: firstSurvivalMove.id });
    setConfirmedCount((n) => n + 1);
  };

  return (
    <section>
      <h1>One thing for the next few minutes</h1>
      <p className="move">{firstSurvivalMove.text}</p>
      <button type="button" className="choice primary" onClick={confirm}>
        I did this
      </button>
      {confirmedCount > 0 && <p className="muted">Logged. That counts. Take your time.</p>}
    </section>
  );
}
