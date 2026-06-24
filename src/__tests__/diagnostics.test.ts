import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC_CONFIDENCE,
  DOOR_TYPES,
  FINDING_TYPES,
  INTERMEDIATE_VERDICTS,
  TRAP_DIAGNOSTIC_STATES,
} from '../state/diagnostics';
import type {
  DiagnosticFinding,
  DoorAuditLiteRecord,
  InterventionLogEntry,
  TrapDiagnosticResult,
} from '../state/diagnostics';
import * as diagnostics from '../state/diagnostics';
import type { DoorRecord, TrapEngineState } from '../state/types';

describe('Phase 2B-0 diagnostic type foundation', () => {
  it('defines exactly the five core diagnostic states', () => {
    expect([...TRAP_DIAGNOSTIC_STATES].sort()).toEqual(
      ['BACKFIRING', 'COMPETING_FAILURES', 'MODEL_MISMATCH', 'NO_EXIT', 'SYSTEM_OVERLOAD'].sort(),
    );
    expect(TRAP_DIAGNOSTIC_STATES).toHaveLength(5);
  });

  it('defines exactly the ten intermediate verdicts / safety buffers', () => {
    expect([...INTERMEDIATE_VERDICTS].sort()).toEqual(
      [
        'ADAPTATION_PHASE',
        'CAPACITY_CONSTRAINT',
        'COUNTDOWN',
        'DOSE_FIT_ISSUE',
        'INCONCLUSIVE',
        'INTENT_REFERRAL',
        'PREMATURE_ASSESSMENT',
        'REFUSED_DOOR',
        'UNEXECUTED_PROTOCOL',
        'UNMAPPED_ROOM',
      ].sort(),
    );
    expect(INTERMEDIATE_VERDICTS).toHaveLength(10);
  });

  it('defines exactly the eight door types', () => {
    expect([...DOOR_TYPES].sort()).toEqual(
      [
        'delayed_dated',
        'delayed_indefinite',
        'predicted_sealed',
        'refused',
        'sealed',
        'structurally_impossible',
        'unreachable_by_capacity',
        'unsearched',
      ].sort(),
    );
    expect(DOOR_TYPES).toHaveLength(8);
  });

  it('includes the finding types and confidence levels', () => {
    for (const f of ['STRUCTURAL', 'VALUATION_DEPENDENT', 'PROVISIONAL']) {
      expect(FINDING_TYPES).toContain(f);
    }
    for (const c of ['LOW', 'MEDIUM', 'HIGH', 'PROVISIONAL']) {
      expect(DIAGNOSTIC_CONFIDENCE).toContain(c);
    }
  });

  it('keeps door types aligned with DoorRecord.type (single source of truth)', () => {
    for (const doorType of DOOR_TYPES) {
      // Every DoorType is assignable to DoorRecord.type — they share the alias.
      const record: DoorRecord = { id: 'd', at: '2026-01-01T00:00:00.000Z', label: 'x', type: doorType };
      expect(DOOR_TYPES).toContain(record.type);
    }
  });

  it('lets TrapEngineState optionally hold diagnosticResult, doorAuditLiteRecords, interventionLog', () => {
    const finding: DiagnosticFinding = {
      verdict: 'INCONCLUSIVE',
      findingType: 'PROVISIONAL',
      confidence: 'LOW',
      evidenceNotes: ['a statement about the file, not about the world'],
      blockedBy: ['unsearched'],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const result: TrapDiagnosticResult = {
      primaryState: null,
      secondaryStates: [],
      intermediateVerdicts: ['INCONCLUSIVE'],
      findings: [finding],
      confidence: 'LOW',
      evidenceNotes: [],
      blockedBy: ['refused', 'unsearched'],
      recommendedNextDiagnosticStep: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const door: DoorAuditLiteRecord = {
      id: 'd1',
      label: 'front door',
      doorType: 'refused',
      attempted: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const intervention: InterventionLogEntry = {
      id: 'i1',
      label: 'tried something',
      category: 'self',
      attempted: true,
      outcome: 'unknown',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const trap: TrapEngineState = {
      phase: 'survival',
      doors: [],
      activeConstraint: null,
      diagnosticResult: result,
      doorAuditLiteRecords: [door],
      interventionLog: [intervention],
    };

    expect(trap.diagnosticResult?.primaryState).toBeNull();
    expect(trap.doorAuditLiteRecords).toHaveLength(1);
    expect(trap.interventionLog).toHaveLength(1);
  });

  it('exposes data + types only — no functions (no classifier/selectTarget here)', () => {
    for (const value of Object.values(diagnostics)) {
      expect(typeof value).not.toBe('function');
    }
  });
});
