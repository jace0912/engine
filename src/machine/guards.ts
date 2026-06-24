// Guard helpers + routing precedence for the top-level machine.
//
// Routing precedence is: safety > capacity > requested mode.
// In Phase 1 only Survival Mode has a real destination, so every danger-free
// capacity band resolves to 'survival'. The function is written so the
// precedence is real today and later phases are a drop-in change.

import type { CapacityBand, Mode } from '../state/types';

export type CapacityAnswer = 'A' | 'B' | 'C' | 'D';

/**
 * Map a First Check answer (A–D) to a stored capacity band.
 *
 * TODO/roadmap — the 'high' capacity band gap:
 *   The CapacityBand type includes 'high', but First Check has NO answer that
 *   maps to it. 'high' is reserved for a future High-Capacity Strategy / 3D
 *   Observatory unlock (see the build plan, sections 3–5), which requires an
 *   explicit opt-in path that does not exist yet. It is intentionally
 *   unreachable from the current four-option First Check. Do not add a 'high'
 *   answer here until Strategy/Observatory ship — adding one now would imply a
 *   destination that is not built.
 */
export function bandForAnswer(answer: CapacityAnswer): CapacityBand {
  switch (answer) {
    case 'A':
      return 'zero';
    case 'B':
      return 'low';
    case 'C':
      return 'recovering';
    case 'D':
      return 'stable';
  }
}

/**
 * Capacity -> mode mapping. Phase 1 collapses every band to Survival Mode.
 * Later phases will route: recovering -> guided, stable/high -> strategy.
 */
export function routeForBand(_band: CapacityBand): Mode {
  return 'survival';
}

export type RouteDecision =
  | { destination: 'safetyOverride'; reason: 'safety' }
  | { destination: Mode; reason: 'capacity' | 'requested' };

/**
 * Resolve the destination under the fixed precedence. `danger` always wins; a
 * `requested` mode may only be honoured if capacity already allows it (it can
 * never override a lower-capacity read). Phase 1 has no higher modes built, so
 * a request never raises the destination above the capacity default.
 */
export function resolveRoute(opts: {
  danger: boolean;
  band: CapacityBand;
  requested?: Mode | null;
}): RouteDecision {
  if (opts.danger) return { destination: 'safetyOverride', reason: 'safety' };

  const byCapacity = routeForBand(opts.band);
  if (opts.requested && opts.requested === byCapacity) {
    return { destination: opts.requested, reason: 'requested' };
  }
  return { destination: byCapacity, reason: 'capacity' };
}
