import { describe, expect, it } from 'vitest';
import { summarizeDoorAuditLite } from '../diagnostics/doorAuditLite';
import type { DoorAuditLiteRecord, DoorType } from '../state/diagnostics';

function door(doorType: DoorType, extra: Partial<DoorAuditLiteRecord> = {}): DoorAuditLiteRecord {
  return {
    id: 'd',
    label: 'a door',
    doorType,
    attempted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

describe('summarizeDoorAuditLite — types + summary behavior', () => {
  it('an empty record list produces a safe summary (No-Exit cannot be concluded)', () => {
    const s = summarizeDoorAuditLite([]);
    expect(s.totalDoors).toBe(0);
    expect(s.mappedDoors).toBe(0);
    expect(s.unmappedDoors).toBe(0);
    expect(s.allKnownMappedDoorsBlocked).toBe(false);
    expect(s.noExitBlockedByIncompleteMapping).toBe(true); // safe default
  });

  it('omitted enumerationComplete defaults to incomplete', () => {
    expect(summarizeDoorAuditLite([door('sealed')]).enumerationComplete).toBe(false);
  });

  it('enumerationComplete:false marks incomplete; true marks complete', () => {
    expect(summarizeDoorAuditLite([door('sealed')], { enumerationComplete: false }).enumerationComplete).toBe(false);
    expect(summarizeDoorAuditLite([door('sealed')], { enumerationComplete: true }).enumerationComplete).toBe(true);
  });

  it('never exposes a universal No-Exit verdict field', () => {
    const s = summarizeDoorAuditLite([door('sealed')], { enumerationComplete: true });
    for (const key of ['noExit', 'hasNoExit', 'noExitConfirmed', 'isNoExit', 'noExitConclusion']) {
      expect(s).not.toHaveProperty(key);
    }
  });

  it('a single sealed door is mapped + blocked but implies no universal No-Exit', () => {
    const s = summarizeDoorAuditLite([door('sealed')], { enumerationComplete: true });
    expect(s.mappedDoors).toBe(1);
    expect(s.allKnownMappedDoorsBlocked).toBe(true);
    expect(s.noExitBlockedByIncompleteMapping).toBe(false); // complete + no uncertainty
  });

  it('a structurally_impossible door is counted as a mapped blocked door', () => {
    const s = summarizeDoorAuditLite([door('structurally_impossible')], { enumerationComplete: true });
    expect(s.mappedDoors).toBe(1);
    expect(s.allKnownMappedDoorsBlocked).toBe(true);
  });

  it.each([
    ['refused', 'hasRefusedDoor'],
    ['delayed_dated', 'hasDelayedDoor'],
    ['delayed_indefinite', 'hasDelayedDoor'],
    ['unreachable_by_capacity', 'hasCapacityBlockedDoor'],
    ['predicted_sealed', 'hasPredictedSealedDoor'],
    ['unsearched', 'hasUnsearchedDoor'],
  ] as const)('a %s door sets %s = true', (doorType, flag) => {
    const s = summarizeDoorAuditLite([door(doorType)]);
    expect(s[flag]).toBe(true);
  });

  it('per-door witnessReliability:"low" sets hasLowWitnessReliability', () => {
    expect(summarizeDoorAuditLite([door('sealed', { witnessReliability: 'low' })]).hasLowWitnessReliability).toBe(true);
    expect(summarizeDoorAuditLite([door('sealed', { witnessReliability: 'high' })]).hasLowWitnessReliability).toBe(false);
  });

  it('mapped/unmapped counts are correct; omitted mapped stays backward-compatible', () => {
    const s = summarizeDoorAuditLite([
      door('sealed'), // mapped omitted -> mapped
      door('unsearched'), // -> unmapped
      door('sealed', { mapped: false }), // explicit unmapped
    ]);
    expect(s.totalDoors).toBe(3);
    expect(s.mappedDoors).toBe(1);
    expect(s.unmappedDoors).toBe(2);
  });
});

describe('summarizeDoorAuditLite — No-Exit blockers (incomplete/uncertain mapping)', () => {
  it.each([
    ['unsearched door', [door('unsearched')], { enumerationComplete: true }],
    ['refused door', [door('refused')], { enumerationComplete: true }],
    ['delayed_dated door', [door('delayed_dated')], { enumerationComplete: true }],
    ['delayed_indefinite door', [door('delayed_indefinite')], { enumerationComplete: true }],
    ['capacity-blocked door', [door('unreachable_by_capacity')], { enumerationComplete: true }],
    ['predicted_sealed door', [door('predicted_sealed')], { enumerationComplete: true }],
    ['low witness reliability', [door('sealed', { witnessReliability: 'low' })], { enumerationComplete: true }],
    ['enumerationComplete:false', [door('sealed')], { enumerationComplete: false }],
    ['enumerationComplete omitted', [door('sealed')], undefined],
    ['mapped:false door', [door('sealed', { mapped: false })], { enumerationComplete: true }],
  ] as const)('%s blocks No-Exit', (_name, records, options) => {
    expect(summarizeDoorAuditLite([...records], options).noExitBlockedByIncompleteMapping).toBe(true);
  });

  it('a complete, fully-mapped, blocker-free set is NOT blocked by mapping (still no No-Exit claim)', () => {
    const s = summarizeDoorAuditLite(
      [door('sealed', { witnessReliability: 'high' }), door('structurally_impossible')],
      { enumerationComplete: true },
    );
    expect(s.noExitBlockedByIncompleteMapping).toBe(false);
    expect(s.allKnownMappedDoorsBlocked).toBe(true);
  });
});

describe('summarizeDoorAuditLite — mapped omitted stays on the safe side', () => {
  it('a sealed door with mapped omitted keeps the incomplete-mapping caveat by default', () => {
    // Preferred check: doorType 'sealed', `mapped` omitted, enumeration omitted.
    const s = summarizeDoorAuditLite([door('sealed')]);
    // It counts as mapped (backward-compatible) ...
    expect(s.mappedDoors).toBe(1);
    // ... but No-Exit stays blocked, so the caveat is never silently dropped ...
    expect(s.noExitBlockedByIncompleteMapping).toBe(true);
    // ... and the summary never marks enumeration complete on its own, so
    // allKnownMappedDoorsBlocked cannot imply completeness by accident.
    expect(s.enumerationComplete).toBe(false);
  });

  it('mapped:false is unmapped and keeps No-Exit blocked even when enumeration is claimed complete', () => {
    const s = summarizeDoorAuditLite([door('sealed', { mapped: false })], { enumerationComplete: true });
    expect(s.unmappedDoors).toBe(1);
    expect(s.noExitBlockedByIncompleteMapping).toBe(true);
  });
});

describe('summarizeDoorAuditLite — safe language', () => {
  const battery = [
    summarizeDoorAuditLite([]),
    summarizeDoorAuditLite([door('sealed')], { enumerationComplete: true }),
    summarizeDoorAuditLite([door('unsearched'), door('refused'), door('delayed_dated')]),
    summarizeDoorAuditLite([door('predicted_sealed', { witnessReliability: 'low' })], { enumerationComplete: false }),
    summarizeDoorAuditLite([door('structurally_impossible')], { enumerationComplete: true }),
  ];
  const corpus = battery.flatMap((s) => s.evidenceNotes).join('\n').toLowerCase();

  it('contains no banned terminal phrases', () => {
    const banned = [
      'no way out',
      'no exit exists',
      'nothing can be done',
      'nothing you can do',
      'hopeless',
      'stuck forever',
      'stop looking',
      'all exits are impossible',
      'trapped forever',
      'this is the end',
    ];
    for (const phrase of banned) expect(corpus).not.toContain(phrase);
  });

  it('contains no treatment-instruction phrases', () => {
    const banned = [
      'medication',
      'dosage',
      'prescription',
      'stop taking',
      'start taking',
      'stop treatment',
      'start treatment',
      'change treatment',
    ];
    for (const phrase of banned) expect(corpus).not.toContain(phrase);
  });

  it('uses only evidence-bounded, file-not-world language when discussing No-Exit', () => {
    const s = summarizeDoorAuditLite([door('unsearched')]);
    expect(s.evidenceNotes.some((n) => n.includes('not about the world'))).toBe(true);
  });
});

describe('summarizeDoorAuditLite — purity / determinism', () => {
  it('is deterministic and does not mutate its input', () => {
    const records = [door('refused'), door('unsearched')];
    Object.freeze(records);
    const a = summarizeDoorAuditLite(records, { enumerationComplete: false });
    const b = summarizeDoorAuditLite(records, { enumerationComplete: false });
    expect(a).toEqual(b);
    expect(records).toHaveLength(2); // unchanged
  });
});
