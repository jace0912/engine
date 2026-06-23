// Fixed, templated survival moves. No generation, no model calls — Phase 1
// shows one small, concrete action at a time, drawn from this list only.

export interface SurvivalMove {
  id: string;
  text: string;
}

export const survivalMoves: SurvivalMove[] = [
  { id: 'breath', text: 'Take one slow breath. In for four counts, out for six.' },
  { id: 'water', text: 'Have a few sips of water.' },
  { id: 'sit', text: 'Find somewhere to sit down for a moment.' },
];

// Phase 1 surfaces exactly one move. Picking the first keeps it deterministic.
export const firstSurvivalMove: SurvivalMove = survivalMoves[0];
