// Phase 2B-4 — Door Audit Lite foundation.
//
// An EVIDENCE LEDGER, not a decision engine. summarizeDoorAuditLite folds a set
// of DoorAuditLiteRecord observations into a deterministic, evidence-bounded
// summary that future diagnostics can read.
//
// SAFETY / SCOPE (read before extending):
//   * Pure, deterministic, side-effect-free. No Date, no randomness, no I/O.
//   * It does NOT import, call, or alter detectTrapDiagnostic. The classifier
//     stays the source of truth for verdicts; this is a standalone summary.
//   * It NEVER declares a universal No-Exit. It only reports, in evidence-
//     bounded language, whether mapping is complete enough to even consider it.
//   * Its No-Exit blocker categories are kept aligned with the classifier:
//     refused, delayed, capacity-blocked, unsearched, predicted-sealed, low
//     witness reliability, and incomplete enumeration (plus unmapped doors).
//   * It is not wired into the app (machine, UI, routing, persistence).

import type { DoorAuditLiteRecord } from '../state/diagnostics';

export interface SummarizeOptions {
  // Enumeration completeness is an EXPLICIT, deterministic input. Omitted or
  // false both mean "incomplete" — it is never inferred from the records alone.
  enumerationComplete?: boolean;
}

export interface DoorAuditLiteSummary {
  records: DoorAuditLiteRecord[];
  totalDoors: number;
  mappedDoors: number;
  unmappedDoors: number;
  enumerationComplete: boolean;
  hasUnsearchedDoor: boolean;
  hasRefusedDoor: boolean;
  hasDelayedDoor: boolean;
  hasCapacityBlockedDoor: boolean;
  hasPredictedSealedDoor: boolean;
  hasLowWitnessReliability: boolean;
  allKnownMappedDoorsBlocked: boolean;
  noExitBlockedByIncompleteMapping: boolean;
  evidenceNotes: string[];
}

// Door types that represent a currently non-functional ("blocked") door once it
// has been mapped. 'unsearched' is unmapped, so it is not in this set.
const BLOCKED_DOOR_TYPES = new Set<DoorAuditLiteRecord['doorType']>([
  'sealed',
  'structurally_impossible',
  'predicted_sealed',
  'refused',
  'delayed_dated',
  'delayed_indefinite',
  'unreachable_by_capacity',
]);

/** A door counts as mapped unless explicitly unmapped, or it is 'unsearched'. */
function isMapped(record: DoorAuditLiteRecord): boolean {
  if (record.mapped !== undefined) return record.mapped;
  return record.doorType !== 'unsearched';
}

export function summarizeDoorAuditLite(
  records: DoorAuditLiteRecord[],
  options?: SummarizeOptions,
): DoorAuditLiteSummary {
  // Omitted -> incomplete. Only an explicit `true` marks enumeration complete.
  const enumerationComplete = options?.enumerationComplete === true;

  const has = (predicate: (r: DoorAuditLiteRecord) => boolean) => records.some(predicate);
  const hasUnsearchedDoor = has((r) => r.doorType === 'unsearched');
  const hasRefusedDoor = has((r) => r.doorType === 'refused');
  const hasDelayedDoor = has((r) => r.doorType === 'delayed_dated' || r.doorType === 'delayed_indefinite');
  const hasCapacityBlockedDoor = has((r) => r.doorType === 'unreachable_by_capacity');
  const hasPredictedSealedDoor = has((r) => r.doorType === 'predicted_sealed');
  const hasLowWitnessReliability = has((r) => r.witnessReliability === 'low');

  const mappedRecords = records.filter(isMapped);
  const mappedDoors = mappedRecords.length;
  const unmappedDoors = records.length - mappedDoors;

  // "All currently mapped doors appear blocked": at least one mapped door, and
  // every mapped door is of a blocked type. (No 'open' door type exists yet.)
  const allKnownMappedDoorsBlocked =
    mappedDoors > 0 && mappedRecords.every((r) => BLOCKED_DOOR_TYPES.has(r.doorType));

  // No-Exit is blocked the moment mapping is incomplete or uncertain in any way.
  const noExitBlockedByIncompleteMapping =
    hasUnsearchedDoor ||
    hasRefusedDoor ||
    hasDelayedDoor ||
    hasCapacityBlockedDoor ||
    hasPredictedSealedDoor ||
    hasLowWitnessReliability ||
    !enumerationComplete ||
    unmappedDoors > 0;

  const evidenceNotes: string[] = [];
  if (records.length === 0) {
    evidenceNotes.push('No doors recorded yet.');
  }
  if (allKnownMappedDoorsBlocked) {
    evidenceNotes.push('All currently mapped doors appear blocked.');
  }
  if (hasUnsearchedDoor || unmappedDoors > 0) {
    evidenceNotes.push('Unsearched or uncertain doors remain.');
  }
  if (!enumerationComplete) {
    evidenceNotes.push('Door enumeration is not marked complete.');
  }
  if (noExitBlockedByIncompleteMapping) {
    evidenceNotes.push('No-Exit is blocked by incomplete mapping.');
    evidenceNotes.push('This is a statement about the file, not about the world.');
  }

  return {
    records: [...records],
    totalDoors: records.length,
    mappedDoors,
    unmappedDoors,
    enumerationComplete,
    hasUnsearchedDoor,
    hasRefusedDoor,
    hasDelayedDoor,
    hasCapacityBlockedDoor,
    hasPredictedSealedDoor,
    hasLowWitnessReliability,
    allKnownMappedDoorsBlocked,
    noExitBlockedByIncompleteMapping,
    evidenceNotes,
  };
}
