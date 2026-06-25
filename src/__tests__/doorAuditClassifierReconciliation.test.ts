// Phase 2B-5 — Classifier ↔ Door Audit Lite reconciliation harness.
//
// Proves the classifier's No-Exit blocker logic (detectTrapDiagnostic) and Door
// Audit Lite's blocker summary (summarizeDoorAuditLite) stay aligned on the
// seven No-Exit blocker categories, so the two independently-implemented pure
// layers cannot silently drift apart.
//
// TEST-ONLY. No runtime wiring. Per the 2B-5 design decision there is NO shared
// blocker-category constant: each layer is exercised independently and their
// alignment is asserted from the outside. The only mapping is the inline table
// below — local to this file, not exported, not in the app bundle.

import { describe, expect, it } from 'vitest';
import { detectTrapDiagnostic, type TrapDiagnosticProxyInput } from '../diagnostics/detectTrapDiagnostic';
import {
  summarizeDoorAuditLite,
  type DoorAuditLiteSummary,
  type SummarizeOptions,
} from '../diagnostics/doorAuditLite';
import type { DoorAuditLiteRecord, DoorType } from '../state/diagnostics';
import {
  noExitCapacityBlocked,
  noExitDelayedBlocked,
  noExitIncompleteEnumeration,
  noExitLowWitness,
  noExitPredictedSealed,
  noExitRefusedBlocked,
  noExitUnsearched,
} from '../diagnostics/diagnosticScenarios.fixtures';

const NOW = '2026-03-01T00:00:00.000Z';

function door(doorType: DoorType, extra: Partial<DoorAuditLiteRecord> = {}): DoorAuditLiteRecord {
  return { id: 'd', label: 'a door', doorType, attempted: false, createdAt: NOW, ...extra };
}

type BlockerFlag =
  | 'hasRefusedDoor'
  | 'hasDelayedDoor'
  | 'hasCapacityBlockedDoor'
  | 'hasUnsearchedDoor'
  | 'hasPredictedSealedDoor'
  | 'hasLowWitnessReliability'
  | 'noExitBlockedByIncompleteMapping';

interface ReconRow {
  blockerName: string;
  // Door Audit Lite side
  records: DoorAuditLiteRecord[];
  options?: SummarizeOptions;
  doorAuditFlag: BlockerFlag;
  // Classifier side (reusing validated fixtures)
  classifierInput: TrapDiagnosticProxyInput;
  classifierBlocker: string;
}

// The inline reconciliation table (test-file-only — NOT a shared production constant).
const ROWS: ReconRow[] = [
  {
    blockerName: 'refused',
    records: [door('refused')],
    doorAuditFlag: 'hasRefusedDoor',
    classifierInput: noExitRefusedBlocked.input,
    classifierBlocker: 'refused',
  },
  {
    blockerName: 'delayed_dated',
    records: [door('delayed_dated')],
    doorAuditFlag: 'hasDelayedDoor',
    classifierInput: noExitDelayedBlocked.input,
    classifierBlocker: 'delayed',
  },
  {
    blockerName: 'delayed_indefinite',
    records: [door('delayed_indefinite')],
    doorAuditFlag: 'hasDelayedDoor',
    classifierInput: noExitDelayedBlocked.input,
    classifierBlocker: 'delayed',
  },
  {
    blockerName: 'unreachable_by_capacity',
    records: [door('unreachable_by_capacity')],
    doorAuditFlag: 'hasCapacityBlockedDoor',
    classifierInput: noExitCapacityBlocked.input,
    classifierBlocker: 'unreachable_by_capacity',
  },
  {
    blockerName: 'unsearched',
    records: [door('unsearched')],
    doorAuditFlag: 'hasUnsearchedDoor',
    classifierInput: noExitUnsearched.input,
    classifierBlocker: 'unsearched',
  },
  {
    blockerName: 'predicted_sealed',
    records: [door('predicted_sealed')],
    doorAuditFlag: 'hasPredictedSealedDoor',
    classifierInput: noExitPredictedSealed.input,
    classifierBlocker: 'predicted_sealed',
  },
  {
    blockerName: 'low witness reliability',
    records: [door('sealed', { witnessReliability: 'low' })],
    doorAuditFlag: 'hasLowWitnessReliability',
    classifierInput: noExitLowWitness.input,
    classifierBlocker: 'witness_reliability_low',
  },
  {
    blockerName: 'incomplete enumeration',
    records: [door('sealed')],
    options: { enumerationComplete: false },
    doorAuditFlag: 'noExitBlockedByIncompleteMapping',
    classifierInput: noExitIncompleteEnumeration.input,
    classifierBlocker: 'enumeration_incomplete',
  },
];

describe('No-Exit blocker alignment table (Door Audit Lite ↔ classifier)', () => {
  it.each(ROWS)(
    '$blockerName: Door Audit Lite flag is set AND classifier blocks (never confirmed No-Exit)',
    (row) => {
      // ---- Door Audit Lite side ----
      const summary: DoorAuditLiteSummary = summarizeDoorAuditLite(row.records, row.options);
      expect(summary[row.doorAuditFlag]).toBe(true);
      expect(summary.noExitBlockedByIncompleteMapping).toBe(true);
      expect(summary).not.toHaveProperty('noExit'); // no universal No-Exit verdict

      // ---- Classifier side ----
      const result = detectTrapDiagnostic(row.classifierInput, NOW);
      expect(result.primaryState).not.toBe('NO_EXIT');
      expect(result.blockedBy).toContain(row.classifierBlocker);
      // No CONFIRMED No-Exit: any NO_EXIT finding stays PROVISIONAL.
      expect(result.findings.some((f) => f.verdict === 'NO_EXIT' && f.confidence !== 'PROVISIONAL')).toBe(false);
      // No-Exit-adjacent output remains evidence-bounded ("file, not world").
      expect(result.evidenceNotes.some((n) => n.includes('not about the world'))).toBe(true);
    },
  );

  it('covers exactly the seven classifier-aligned blocker categories', () => {
    const flags = new Set(ROWS.map((r) => r.doorAuditFlag));
    expect(flags).toEqual(
      new Set<BlockerFlag>([
        'hasRefusedDoor',
        'hasDelayedDoor',
        'hasCapacityBlockedDoor',
        'hasUnsearchedDoor',
        'hasPredictedSealedDoor',
        'hasLowWitnessReliability',
        'noExitBlockedByIncompleteMapping',
      ]),
    );
  });

  it('delayed_dated and delayed_indefinite both reconcile to the same delayed category', () => {
    expect(summarizeDoorAuditLite([door('delayed_dated')]).hasDelayedDoor).toBe(true);
    expect(summarizeDoorAuditLite([door('delayed_indefinite')]).hasDelayedDoor).toBe(true);
    // The classifier exposes a single generic 'delayed' blocker for both.
    expect(detectTrapDiagnostic(noExitDelayedBlocked.input, NOW).blockedBy).toContain('delayed');
  });
});

describe('unmapped door — a Door Audit Lite-specific safety blocker (classifier has none)', () => {
  it('mapped:false increases unmappedDoors and blocks No-Exit', () => {
    const s = summarizeDoorAuditLite([door('sealed', { mapped: false })], { enumerationComplete: true });
    expect(s.unmappedDoors).toBe(1);
    expect(s.noExitBlockedByIncompleteMapping).toBe(true);
  });

  it('mapped omitted stays safe (enumeration defaults incomplete) and never implies completeness', () => {
    const s = summarizeDoorAuditLite([door('sealed')]); // enumeration omitted
    expect(s.enumerationComplete).toBe(false);
    expect(s.noExitBlockedByIncompleteMapping).toBe(true);
    // allKnownMappedDoorsBlocked may be true, but it does not imply completeness.
    expect(s.allKnownMappedDoorsBlocked).toBe(true);
    expect(s.enumerationComplete).toBe(false);
  });

  it('exposes no universal No-Exit field', () => {
    const s = summarizeDoorAuditLite([door('sealed')]);
    for (const key of ['noExit', 'hasNoExit', 'noExitConfirmed']) expect(s).not.toHaveProperty(key);
  });

  it('does not invent an unmapped-door blocker on the classifier (Door Audit Lite-only)', () => {
    const result = detectTrapDiagnostic({ allKnownDoorsSealed: true, enumerationComplete: true }, NOW);
    expect(result.blockedBy).not.toContain('unmapped');
  });
});

describe('safe-language reconciliation (both layers stay evidence-bounded)', () => {
  const doorAuditText = ROWS.flatMap((r) => summarizeDoorAuditLite(r.records, r.options).evidenceNotes);
  const classifierText = ROWS.flatMap((r) => {
    const res = detectTrapDiagnostic(r.classifierInput, NOW);
    return [
      ...res.evidenceNotes,
      res.recommendedNextDiagnosticStep ?? '',
      ...res.findings.flatMap((f) => f.evidenceNotes),
    ];
  });
  const corpus = [...doorAuditText, ...classifierText].join('\n').toLowerCase();

  it('emits no banned terminal phrases (either layer)', () => {
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

  it('emits no treatment-instruction phrases (either layer)', () => {
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
});
