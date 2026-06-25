// Phase 2B-6 — Diagnostic Readout Copy Contract.
//
// A STATIC safety contract for how diagnostic findings MAY eventually be
// displayed. It is the approved vocabulary + safety rules only — it is NOT a
// formatter: it never takes a live diagnostic result and never assembles
// display text from classifier output.
//
// SAFETY / SCOPE (read before extending):
//   * Pure + deterministic. No Date, no Math.random, no I/O, no React/XState,
//     no persistence, no app imports. The only API is getDiagnosticCopyContract().
//   * It takes NO arguments, inspects no runtime state, makes no display
//     decisions, and grants NO display permission — every rule carries
//     displayPermissionGranted: false. Defining safe language for a state does
//     not authorize surfacing that state; that is a later phase with its own gate.
//   * No recommendations, no action selection, no treatment instructions.
//   * Diagnostic results describe evidence in the file, not the world.

import type { IntermediateVerdict, TrapDiagnosticState } from '../state/diagnostics';

export interface DiagnosticStateCopyRule {
  label: string;
  safeDescription: string;
  requiredQualifier?: string;
  mayBePrimary: boolean;
  mustRemainEvidenceBounded: boolean;
  mustNotRecommend: boolean;
  displayPermissionGranted: false; // literal false — display is never granted here
}

export interface DiagnosticCopyContract {
  allowedFrames: string[];
  requiredQualifiers: string[];
  bannedPhrases: string[];
  stateCopy: Record<TrapDiagnosticState, DiagnosticStateCopyRule>;
  intermediateCopy: Record<IntermediateVerdict, DiagnosticStateCopyRule>;
  provisionalCopy: Record<string, DiagnosticStateCopyRule>;
  blockerCopy: Record<string, DiagnosticStateCopyRule>;
}

// The one qualifier every No-Exit-adjacent statement must carry.
const FILE_NOT_WORLD = 'This is a statement about the file, not about the world.';

const ALLOWED_FRAMES: string[] = [
  'The available evidence suggests…',
  'This finding is provisional.',
  FILE_NOT_WORLD,
  'Mapping appears incomplete.',
  'Some doors remain unsearched, delayed, refused, capacity-blocked, predicted-sealed, or uncertain.',
  'This describes the evidence in the file, not a universal conclusion.',
];

// The reference list of phrases the readout must NEVER use. This array is
// metadata (the contract's declaration of what is banned); it is intentionally
// excluded from the safe-language scan of display copy.
const BANNED_PHRASES: string[] = [
  // terminal / hopeless
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
  'collapse is inevitable',
  'no option exists',
  'no door exists',
  // treatment-instruction
  'medication',
  'dosage',
  'prescription',
  'stop taking',
  'start taking',
  'pause treatment',
  'pause medication',
  'alter treatment',
  'alter medication',
  'adjust treatment',
  'adjust medication',
  'reduce treatment',
  'reduce medication',
  'increase treatment',
  'increase medication',
  'lower dosage',
  'raise dosage',
  'taper',
  'wean',
  'switch medication',
  'switch treatment',
  'stop treatment',
  'start treatment',
  'change treatment',
  // recommendation / selector
  'you should choose',
  'choose this',
  'do this next',
  'recommended action',
  'best option',
  'switch strategy now',
  'take this route',
  'select target',
  'target selected',
];

const stateCopy: Record<TrapDiagnosticState, DiagnosticStateCopyRule> = {
  NO_EXIT: {
    label: 'No functioning door in the evidence',
    safeDescription: 'No functioning door appears in the evidence provided.',
    requiredQualifier: FILE_NOT_WORLD,
    mayBePrimary: true,
    mustRemainEvidenceBounded: true,
    mustNotRecommend: true,
    displayPermissionGranted: false,
  },
  BACKFIRING: {
    label: 'Possible worsening pattern',
    safeDescription: 'The evidence suggests the current intervention pattern may be worsening the situation.',
    requiredQualifier:
      'This describes a pattern only; it is not a treatment instruction. Any next step belongs with a qualified person or appropriate support.',
    mayBePrimary: true,
    mustRemainEvidenceBounded: true,
    mustNotRecommend: true,
    displayPermissionGranted: false,
  },
  MODEL_MISMATCH: {
    label: 'Possible model–pattern mismatch',
    safeDescription: 'There may be a mismatch between the problem model and the observed pattern.',
    requiredQualifier: 'A single weak signal is a provisional concern, not a confirmed mismatch.',
    mayBePrimary: true,
    mustRemainEvidenceBounded: true,
    mustNotRecommend: true,
    displayPermissionGranted: false,
  },
  COMPETING_FAILURES: {
    label: 'Options carry different costs',
    safeDescription: 'Available options appear to carry different costs or constraints.',
    requiredQualifier: 'This describes tradeoffs only.',
    mayBePrimary: true,
    mustRemainEvidenceBounded: true,
    mustNotRecommend: true,
    displayPermissionGranted: false,
  },
  SYSTEM_OVERLOAD: {
    label: 'Multiple patterns active at once',
    safeDescription: 'Multiple failure patterns appear to be active at the same time.',
    requiredQualifier: 'This describes several patterns occurring together; it does not predict any outcome.',
    mayBePrimary: true,
    mustRemainEvidenceBounded: true,
    mustNotRecommend: true,
    displayPermissionGranted: false,
  },
};

const intermediate = (label: string, safeDescription: string): DiagnosticStateCopyRule => ({
  label,
  safeDescription,
  mayBePrimary: false,
  mustRemainEvidenceBounded: true,
  mustNotRecommend: true,
  displayPermissionGranted: false,
});

const intermediateCopy: Record<IntermediateVerdict, DiagnosticStateCopyRule> = {
  ADAPTATION_PHASE: intermediate('Possible adaptation phase', 'The change may still be within an expected adaptation window.'),
  PREMATURE_ASSESSMENT: intermediate('Too early to assess', 'It may be too early to judge this pattern.'),
  DOSE_FIT_ISSUE: intermediate('Possible dose-or-fit concern', 'A dose-or-fit concern could explain what is observed.'),
  CAPACITY_CONSTRAINT: intermediate('Possible capacity constraint', 'A capacity-blocked door is a capacity issue, not a sealed door.'),
  UNMAPPED_ROOM: intermediate('Unmapped door', 'An unsearched door means the mapping is still incomplete.'),
  REFUSED_DOOR: intermediate('Refused door', 'A refused door is not the same as a sealed door.'),
  COUNTDOWN: intermediate('Possible delay window', 'A delayed door may still open later.'),
  UNEXECUTED_PROTOCOL: intermediate('Possible unexecuted protocol', 'The protocol may not have been carried out as intended.'),
  INTENT_REFERRAL: intermediate('Intent referral', 'Intent signals route to a person, not to a diagnosis.'),
  INCONCLUSIVE: intermediate('Inconclusive', 'The evidence is currently inconclusive.'),
};

const provisionalCopy: Record<string, DiagnosticStateCopyRule> = {
  weak_model_mismatch: {
    label: 'Provisional model-fit concern',
    safeDescription: 'A single weak signal is a provisional model-fit concern, not a confirmed mismatch.',
    mayBePrimary: false,
    mustRemainEvidenceBounded: true,
    mustNotRecommend: true,
    displayPermissionGranted: false,
  },
  no_exit_blocked: {
    label: 'Incomplete or uncertain mapping',
    safeDescription: 'No functioning door appears yet, but the mapping is incomplete or uncertain.',
    requiredQualifier: FILE_NOT_WORLD,
    mayBePrimary: false,
    mustRemainEvidenceBounded: true,
    mustNotRecommend: true,
    displayPermissionGranted: false,
  },
  backfiring_single_timepoint: {
    label: 'Premature to assess trajectory',
    safeDescription: 'A single timepoint is premature to assess a worsening trajectory.',
    mayBePrimary: false,
    mustRemainEvidenceBounded: true,
    mustNotRecommend: true,
    displayPermissionGranted: false,
  },
  low_confidence: {
    label: 'Low-confidence signal',
    safeDescription: 'This is a low-confidence, provisional concern.',
    mayBePrimary: false,
    mustRemainEvidenceBounded: true,
    mustNotRecommend: true,
    displayPermissionGranted: false,
  },
};

const blocker = (label: string, safeDescription: string): DiagnosticStateCopyRule => ({
  label,
  safeDescription,
  mayBePrimary: false,
  mustRemainEvidenceBounded: true,
  mustNotRecommend: true,
  displayPermissionGranted: false,
});

const blockerCopy: Record<string, DiagnosticStateCopyRule> = {
  refused: blocker('Refused door', 'A door is refused in the current evidence.'),
  delayed: blocker('Delayed door', 'A door is delayed.'),
  capacity_blocked: blocker('Capacity-blocked door', 'A door may be unreachable under current capacity.'),
  unsearched: blocker('Unsearched door', 'A door remains unsearched.'),
  predicted_sealed: blocker('Predicted-sealed door', 'A door is predicted sealed, but not directly verified.'),
  low_witness_reliability: blocker('Low witness reliability', 'Witness reliability is low or uncertain.'),
  incomplete_enumeration: blocker('Incomplete enumeration', 'The map appears incomplete.'),
  unmapped_door: blocker('Unmapped door', 'A door has not yet been mapped, so the mapping is incomplete.'),
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

const CONTRACT: DiagnosticCopyContract = deepFreeze({
  allowedFrames: ALLOWED_FRAMES,
  requiredQualifiers: [FILE_NOT_WORLD, 'This finding is provisional.'],
  bannedPhrases: BANNED_PHRASES,
  stateCopy,
  intermediateCopy,
  provisionalCopy,
  blockerCopy,
});

/** The only API: a static, descriptive copy contract. Takes no result, makes no display decision. */
export function getDiagnosticCopyContract(): DiagnosticCopyContract {
  return CONTRACT;
}
