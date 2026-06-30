// Phase 3-4 — Guided Recovery UI Shell (inert, non-runtime, test-only).
//
// A NON-FUNCTIONAL visual shell boundary for a future Guided Recovery UI. It is
// deliberately placed in src/recovery/ (NOT src/components/) so it stays out of
// the live component tree, and it is imported ONLY by tests — never by App,
// appMachine, routing, persistence, session runtime, or any live component, and
// never through a barrel file. It must not appear in the runtime bundle.
//
// CORE RULE: Phase 3 restores capacity. Phase 4 chooses strategy.
//
// SAFETY / SCOPE (read before extending):
//   * Static, non-interactive, deterministic. No props, no inputs, no event
//     handlers, no clickable controls, no clock/randomness/I/O, no imports.
//   * It renders ONLY the approved non-operational placeholder strings below and
//     nothing else. It does not import or call any Guided Recovery / diagnostic
//     module, and it renders no candidate, copy-contract frame, step, prompt,
//     instruction, or recommendation.
//   * It grants NO display / runtime / selection / recommendation / persistence
//     permission and implies no permission to use Guided Recovery. SafetyOverride
//     stays higher priority; the shell never softens or bypasses it.
//   * Defining this shell does not route, navigate to, enter, or enable Guided
//     Recovery anywhere in the app.

// Local, test-only no-permission marker. It enables no runtime behavior.
export const GUIDED_RECOVERY_SHELL_PERMISSIONS = {
  displayPermissionGranted: false,
  runtimePermissionGranted: false,
  selectionPermissionGranted: false,
  recommendationPermissionGranted: false,
  persistencePermissionGranted: false,
  mustNotRecommend: true,
} as const;

// The ONLY approved, non-operational placeholder strings this shell may render.
// Tests scan exactly these against the rendered output.
export const GUIDED_RECOVERY_SHELL_PLACEHOLDER_LINES = [
  'Guided Recovery shell placeholder.',
  'No Guided Recovery runtime is enabled.',
  'No recovery steps are displayed in this shell.',
  'This shell grants no display, selection, recommendation, persistence, or runtime permission.',
  'SafetyOverride remains higher priority.',
] as const;

/**
 * Inert, non-interactive Guided Recovery shell. No props, no handlers, no
 * controls. The root is aria-hidden so the non-operational shell does not
 * announce itself even when test-rendered.
 */
export function GuidedRecoveryShell() {
  return (
    <div aria-hidden="true">
      {GUIDED_RECOVERY_SHELL_PLACEHOLDER_LINES.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
