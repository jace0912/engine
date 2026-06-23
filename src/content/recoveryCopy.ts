// Copy for the Recovery screen. Acknowledge the two completed moves plainly,
// then offer ONE small next step. Recovery does not unlock Guided Mode — that
// is Phase 3. Calm, light, short.

export const recoveryCopy = {
  headline: 'Two done. That is real.',
  body: 'Here is one small next thing, whenever you are ready.',
  tooMuchLabel: 'That is too much right now',
};

export interface RecoveryMove {
  id: string;
  text: string;
}

export const recoveryMoves: RecoveryMove[] = [
  { id: 'water', text: 'Have a few sips of water.' },
  { id: 'air', text: 'Let some fresh air into the room.' },
  { id: 'stretch', text: 'Stretch your arms up once, then let them down.' },
];

/** Recovery begins at the two-move threshold, so offset the index from there. */
export function recoveryMoveForCount(count: number): RecoveryMove {
  const offset = Math.max(0, count - 2);
  return recoveryMoves[offset % recoveryMoves.length];
}
