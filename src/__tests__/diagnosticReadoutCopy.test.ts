// Phase 2B-6 — Diagnostic Readout Copy Contract tests.
//
// Proves getDiagnosticCopyContract() is a STATIC, pure, evidence-bounded copy
// contract: it defines the approved display vocabulary and safety rules, it
// never recommends, it never grants display permission, and it is NOT a live
// formatter. The contract takes no diagnostic result and makes no display
// decision — these tests assert exactly that, plus the safe-language ceiling.

import { describe, expect, it } from 'vitest';
import {
  getDiagnosticCopyContract,
  type DiagnosticCopyContract,
  type DiagnosticStateCopyRule,
} from '../diagnostics/diagnosticReadoutCopy';
import { INTERMEDIATE_VERDICTS, TRAP_DIAGNOSTIC_STATES } from '../state/diagnostics';

const FILE_NOT_WORLD = 'This is a statement about the file, not about the world.';

// Every rule across all four rule maps (NOT bannedPhrases, which is metadata).
function allRules(contract: DiagnosticCopyContract): DiagnosticStateCopyRule[] {
  return [
    ...Object.values(contract.stateCopy),
    ...Object.values(contract.intermediateCopy),
    ...Object.values(contract.provisionalCopy),
    ...Object.values(contract.blockerCopy),
  ];
}

// The display strings that could ever be surfaced — labels, descriptions, and
// qualifiers, plus the frame/qualifier lists. Deliberately EXCLUDES
// bannedPhrases (that array is the contract's declaration of what is banned and
// would, by definition, contain banned phrases).
function displayStrings(contract: DiagnosticCopyContract): string[] {
  const strings: string[] = [...contract.allowedFrames, ...contract.requiredQualifiers];
  for (const rule of allRules(contract)) {
    strings.push(rule.label, rule.safeDescription);
    if (rule.requiredQualifier) strings.push(rule.requiredQualifier);
  }
  return strings;
}

describe('Phase 2B-6 §structure — the contract shape is static and complete', () => {
  const contract = getDiagnosticCopyContract();

  it('exposes exactly the documented top-level keys', () => {
    expect(Object.keys(contract).sort()).toEqual(
      [
        'allowedFrames',
        'bannedPhrases',
        'blockerCopy',
        'intermediateCopy',
        'provisionalCopy',
        'requiredQualifiers',
        'stateCopy',
      ].sort(),
    );
  });

  it('covers all five core diagnostic states and no others', () => {
    expect(Object.keys(contract.stateCopy).sort()).toEqual([...TRAP_DIAGNOSTIC_STATES].sort());
  });

  it('covers all ten intermediate verdicts and no others', () => {
    expect(Object.keys(contract.intermediateCopy).sort()).toEqual([...INTERMEDIATE_VERDICTS].sort());
  });

  it('every rule is well-formed (non-empty label + description, flags present)', () => {
    for (const rule of allRules(contract)) {
      expect(typeof rule.label).toBe('string');
      expect(rule.label.length).toBeGreaterThan(0);
      expect(typeof rule.safeDescription).toBe('string');
      expect(rule.safeDescription.length).toBeGreaterThan(0);
      expect(typeof rule.mayBePrimary).toBe('boolean');
      expect(rule.mustRemainEvidenceBounded).toBe(true);
    }
  });

  it('is not a live formatter — exposes only the no-arg contract getter', () => {
    // The getter takes no arguments and ignores anything passed.
    expect(getDiagnosticCopyContract.length).toBe(0);
    expect(typeof getDiagnosticCopyContract).toBe('function');
  });
});

describe('Phase 2B-6 §7 — required qualifiers and never-recommend / never-grant', () => {
  const contract = getDiagnosticCopyContract();

  it('NO_EXIT copy carries the exact "file, not world" qualifier', () => {
    expect(contract.stateCopy.NO_EXIT.requiredQualifier).toBe(FILE_NOT_WORLD);
  });

  it('the provisional no-exit-blocked rule also carries the "file, not world" qualifier', () => {
    expect(contract.provisionalCopy.no_exit_blocked.requiredQualifier).toBe(FILE_NOT_WORLD);
  });

  it('the required-qualifiers list includes the "file, not world" qualifier', () => {
    expect(contract.requiredQualifiers).toContain(FILE_NOT_WORLD);
  });

  it('every state rule sets mustNotRecommend: true', () => {
    for (const rule of Object.values(contract.stateCopy)) {
      expect(rule.mustNotRecommend).toBe(true);
    }
  });

  it('every rule across all maps sets mustNotRecommend: true', () => {
    for (const rule of allRules(contract)) {
      expect(rule.mustNotRecommend).toBe(true);
    }
  });

  it('every rule across all maps sets displayPermissionGranted: false', () => {
    for (const rule of allRules(contract)) {
      // Defining safe language for a state does NOT authorize surfacing it.
      expect(rule.displayPermissionGranted).toBe(false);
    }
  });

  it('only NO_EXIT-adjacent states may be primary; intermediate/provisional/blocker rules may not', () => {
    for (const rule of Object.values(contract.intermediateCopy)) expect(rule.mayBePrimary).toBe(false);
    for (const rule of Object.values(contract.provisionalCopy)) expect(rule.mayBePrimary).toBe(false);
    for (const rule of Object.values(contract.blockerCopy)) expect(rule.mayBePrimary).toBe(false);
  });
});

describe('Phase 2B-6 §6 — safe-language ceiling (no banned phrase in any display copy)', () => {
  const contract = getDiagnosticCopyContract();

  it('no display string contains any banned phrase', () => {
    const strings = displayStrings(contract);
    for (const text of strings) {
      const lower = text.toLowerCase();
      for (const phrase of contract.bannedPhrases) {
        expect(lower.includes(phrase.toLowerCase())).toBe(false);
      }
    }
  });

  it('the banned-phrase list declares the expected terminal / hopeless phrases', () => {
    for (const phrase of [
      'no way out',
      'no exit exists',
      'nothing can be done',
      'hopeless',
      'stuck forever',
      'stop looking',
      'all exits are impossible',
      'this is the end',
    ]) {
      expect(contract.bannedPhrases).toContain(phrase);
    }
  });

  it('the banned-phrase list declares the expected treatment-instruction phrases', () => {
    for (const phrase of ['medication', 'dosage', 'prescription', 'stop taking', 'taper', 'wean']) {
      expect(contract.bannedPhrases).toContain(phrase);
    }
  });

  it('the banned-phrase list declares the expected recommendation / selector phrases', () => {
    for (const phrase of ['recommended action', 'best option', 'select target', 'do this next']) {
      expect(contract.bannedPhrases).toContain(phrase);
    }
  });

  it('allowed frames stay evidence-bounded (none asserts a universal conclusion)', () => {
    const frames = contract.allowedFrames.join('\n').toLowerCase();
    // The frames describe the file/evidence, never the world.
    for (const phrase of ['no exit exists', 'no way out', 'no door exists', 'all exits are impossible']) {
      expect(frames).not.toContain(phrase);
    }
  });
});

describe('Phase 2B-6 §11 — Backfiring copy is pattern-only, never a treatment instruction', () => {
  const contract = getDiagnosticCopyContract();
  const backfiring = contract.stateCopy.BACKFIRING;

  it('does not recommend and grants no display permission', () => {
    expect(backfiring.mustNotRecommend).toBe(true);
    expect(backfiring.displayPermissionGranted).toBe(false);
  });

  it('routes any next step to a qualified person / appropriate support', () => {
    const qualifier = (backfiring.requiredQualifier ?? '').toLowerCase();
    expect(qualifier).toContain('qualified person');
    expect(qualifier).toContain('not a treatment instruction');
  });

  it('contains no treatment-instruction phrase in its label, description, or qualifier', () => {
    const text = `${backfiring.label}\n${backfiring.safeDescription}\n${backfiring.requiredQualifier ?? ''}`.toLowerCase();
    for (const phrase of [
      'medication',
      'dosage',
      'stop taking',
      'start taking',
      'alter treatment',
      'adjust treatment',
      'reduce treatment',
      'increase treatment',
      'switch treatment',
      'change treatment',
      'taper',
      'wean',
    ]) {
      expect(text).not.toContain(phrase);
    }
  });
});

describe('Phase 2B-6 §9 — purity & determinism', () => {
  it('returns a deeply-equal contract on every call', () => {
    expect(getDiagnosticCopyContract()).toEqual(getDiagnosticCopyContract());
  });

  it('returns the same stable singleton reference (no per-call construction)', () => {
    expect(getDiagnosticCopyContract()).toBe(getDiagnosticCopyContract());
  });

  it('is deeply frozen — copy cannot be mutated at runtime', () => {
    const contract = getDiagnosticCopyContract();
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.stateCopy)).toBe(true);
    expect(Object.isFrozen(contract.stateCopy.NO_EXIT)).toBe(true);
    expect(Object.isFrozen(contract.bannedPhrases)).toBe(true);
    // A frozen rule silently ignores writes (non-strict) — value is unchanged.
    const before = contract.stateCopy.NO_EXIT.label;
    try {
      (contract.stateCopy.NO_EXIT as { label: string }).label = 'mutated';
    } catch {
      /* strict-mode throw is also acceptable */
    }
    expect(contract.stateCopy.NO_EXIT.label).toBe(before);
  });
});
