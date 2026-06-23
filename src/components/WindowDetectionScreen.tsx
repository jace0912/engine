// Window Detection screen. Low-pressure fixed options; no timers or countdown.
// A window opening routes back to one move (Survival or ZCFM); "Not yet" stays
// here without pressure.

import type { AppEvent } from '../machine/appMachine';
import { windowHeadline, windowOptions } from '../content/windowOptions';

interface Props {
  send: (event: AppEvent) => void;
}

export function WindowDetectionScreen({ send }: Props) {
  return (
    <section>
      <h1>{windowHeadline}</h1>
      <ul className="choice-list">
        {windowOptions.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className="choice"
              onClick={() => send({ type: option.event } as AppEvent)}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
