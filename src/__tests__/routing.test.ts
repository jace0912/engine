import { describe, expect, it } from 'vitest';
import { bandForAnswer, resolveRoute, routeForBand } from '../machine/guards';
import type { CapacityBand } from '../state/types';

describe('First Check answer -> band mapping', () => {
  it('maps A–D to the documented bands', () => {
    expect(bandForAnswer('A')).toBe('zero');
    expect(bandForAnswer('B')).toBe('low');
    expect(bandForAnswer('C')).toBe('recovering');
    expect(bandForAnswer('D')).toBe('stable');
  });

  it("never maps a First Check answer to 'high' (reserved for a future Strategy/Observatory unlock)", () => {
    // Documents the known gap: 'high' exists in CapacityBand but has no First
    // Check entry path yet, by design. See bandForAnswer's roadmap note.
    const answers = ['A', 'B', 'C', 'D'] as const;
    for (const answer of answers) expect(bandForAnswer(answer)).not.toBe('high');
  });
});

describe('routing precedence: safety > capacity > requested', () => {
  const bands: CapacityBand[] = ['zero', 'low', 'recovering', 'stable', 'high'];

  it('Phase 1 collapses every band to survival', () => {
    for (const band of bands) expect(routeForBand(band)).toBe('survival');
  });

  it('danger always wins, regardless of capacity', () => {
    const decision = resolveRoute({ danger: true, band: 'stable' });
    expect(decision.destination).toBe('safetyOverride');
    expect(decision.reason).toBe('safety');
  });

  it('without danger, capacity sets the default destination', () => {
    const decision = resolveRoute({ danger: false, band: 'stable' });
    expect(decision.destination).toBe('survival');
    expect(decision.reason).toBe('capacity');
  });

  it('a requested mode cannot raise the destination above the capacity default', () => {
    // 'strategy' is not yet reachable in Phase 1, so the request is not honoured.
    const decision = resolveRoute({ danger: false, band: 'low', requested: 'strategy' });
    expect(decision.destination).toBe('survival');
  });
});
