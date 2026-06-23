// Always-mounted global safety surface.
//  - Not in safety: a persistent, clearly labelled help button on every screen.
//    Pressing it dispatches SAFETY_TRIGGER with the manual_help_request flag.
//  - In safety: the full Safety Override screen, which suppresses the tool flow,
//    shows help resources, and offers no path back into any tool this session.

import type { AppEvent } from '../machine/appMachine';
import {
  safetyBody,
  safetyFooter,
  safetyHeadline,
  safetyResources,
} from '../content/safetyResources';

interface Props {
  inSafety: boolean;
  send: (event: AppEvent) => void;
}

export function SafetyOverlay({ inSafety, send }: Props) {
  if (inSafety) {
    return (
      <section className="safety-screen" role="dialog" aria-modal="true" aria-label="Safety">
        <h1>{safetyHeadline}</h1>
        <p>{safetyBody}</p>
        <ul className="resource-list">
          {safetyResources.map((r) => (
            <li key={r.id}>
              <strong>{r.label}</strong>
              <span>{r.detail}</span>
            </li>
          ))}
        </ul>
        <p className="muted">{safetyFooter}</p>
      </section>
    );
  }

  return (
    <button
      type="button"
      className="safety-button"
      onClick={() => send({ type: 'SAFETY_TRIGGER', flag: 'manual_help_request' })}
    >
      Get help now
    </button>
  );
}
