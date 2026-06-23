// First Check: danger gate first, then the single capacity question.
// The current sub-state (dangerGate | capacityRead) drives which step shows.

import type { SnapshotFrom } from 'xstate';
import type { AppEvent, appMachine } from '../machine/appMachine';
import { dangerConditions, noneOfThese } from '../content/dangerConditions';
import type { CapacityAnswer } from '../machine/guards';

type Snapshot = SnapshotFrom<typeof appMachine>;

interface Props {
  snapshot: Snapshot;
  send: (event: AppEvent) => void;
}

const capacityOptions: { answer: CapacityAnswer; label: string }[] = [
  { answer: 'A', label: 'I can barely function. Get me through the next few minutes.' },
  { answer: 'B', label: 'I am shaky, but I can do one small thing.' },
  { answer: 'C', label: 'I am steadier. I could work through a few steps.' },
  { answer: 'D', label: 'I am stable, and want to work on the actual problem.' },
];

export function FirstCheckScreen({ snapshot, send }: Props) {
  const { value } = snapshot;
  const sub =
    typeof value === 'object' && value !== null && 'firstCheck' in value
      ? (value as { firstCheck: 'dangerGate' | 'capacityRead' }).firstCheck
      : null;

  if (sub === 'dangerGate') {
    return (
      <section>
        <h1>First, a quick check</h1>
        <p className="muted">Is any of these happening right now?</p>
        <ul className="choice-list">
          {dangerConditions.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="choice danger"
                onClick={() => send({ type: 'SAFETY_TRIGGER', flag: c.flag })}
              >
                {c.label}
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="choice primary" onClick={() => send({ type: 'NO_DANGER' })}>
              {noneOfThese.label}
            </button>
          </li>
        </ul>
      </section>
    );
  }

  return (
    <section>
      <h1>Right now, how much can you take on?</h1>
      <ul className="choice-list">
        {capacityOptions.map((o) => (
          <li key={o.answer}>
            <button
              type="button"
              className="choice"
              onClick={() => send({ type: 'CAPACITY_SELECTED', answer: o.answer })}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
