// Copy for the Immobile Constraint screen.
//
// Rules (from the build plan): name the constraint as current and bounded;
// the door still works and what is missing is the capacity to open it right
// now; waiting / preserving signal is a legitimate move; do not ask the user
// to make a decision about their situation. This is a capacity state, never a
// verdict about the world. It is NOT No-Exit and NOT SafetyOverride.

export const immobileCopy = {
  headline: 'Right now, the door still works.',
  lines: [
    'What is missing this moment is the energy to open it — not the door itself.',
    'This is a capacity moment, and capacity can come back.',
    'Resting, or simply staying here for a while, counts as the move right now.',
  ],
  // A single, gentle, optional affordance — not a decision about the crisis.
  watchLabel: 'When you are ready, watch for a small opening',
};
