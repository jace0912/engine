// Immobile Constraint screen. Calm, non-terminal copy: the door still works,
// what is missing is capacity right now, and waiting counts as the move. No
// decision about the crisis is requested — only a single gentle, optional
// affordance to begin watching for a window. SafetyOverlay stays mounted.

import type { AppEvent } from '../machine/appMachine';
import { immobileCopy } from '../content/immobileCopy';

interface Props {
  send: (event: AppEvent) => void;
}

export function ImmobileScreen({ send }: Props) {
  return (
    <section>
      <h1>{immobileCopy.headline}</h1>
      {immobileCopy.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <div className="actions">
        <button
          type="button"
          className="choice primary"
          onClick={() => send({ type: 'WATCH_FOR_WINDOW' })}
        >
          {immobileCopy.watchLabel}
        </button>
      </div>
    </section>
  );
}
