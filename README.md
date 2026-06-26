# Black Swan Crisis Operating System — Phase 1

Phase 1 of the BSCOS: the shared shell and state-machine foundation. It builds
the top-level XState machine, the First Check (danger gate + capacity read), a
text-only Survival Mode placeholder, a global Safety Override, and append-only,
local-first session history.

This phase **only** builds the foundation. There is no 3D, no Black Swan
cockpit / seven-stage Strategy Mode, no Crisis Operating Record panel, no Door
Audit, and no AI-generated text. See `BSCOS_unified_build_plan2.md` (the source
of truth) for the full architecture and later phases.

## Stack

- Vite + React + TypeScript
- XState v5 (top-level state machine)
- Local-first persistence: IndexedDB when available, with a localStorage
  fallback (used in test/jsdom environments). Offline-first, no backend, no auth.
- Vitest for tests

## Run it

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build
npm test           # run the Vitest suite
```

> A fresh Session is created on first launch and persisted locally. Clearing the
> site's storage (IndexedDB / localStorage) starts a new Session.

## How it works

```
boot ──(always)──> firstCheck ──> survival
                        │
  SAFETY_TRIGGER (root handler, from ANY state) ──> safetyOverride  (terminal)
```

- **boot** loads or creates the local `User` + `Session`, writes a snapshot, and
  routes on. A persisted safety session resumes straight into `safetyOverride`,
  so a terminated session can never be re-entered after reload.
- **firstCheck** runs the danger gate first. Selecting any of the five danger
  conditions records a `SafetyEvent` and routes immediately to the Safety
  Override. "None of these" continues to the single capacity question; the
  chosen answer is mapped to a `CapacityBand` and stored on the session.
- **survival** shows one fixed templated move and a confirm button. Confirming
  writes a `move_logged` event and a snapshot, and stays in Survival.
- **safetyOverride** is a `final` state — terminal for the session. It suppresses
  the tool flow, shows help resources, and offers no path back into any tool.

Routing precedence (`safety > capacity > requested mode`) lives in
`src/machine/guards.ts` (`resolveRoute`). In Phase 1 every danger-free band
collapses to Survival; the precedence is real today so later phases drop in.

### Append-only history

The three logs — `history`, `events`, `safetyEvents` — are append-only. The
only mutation surface is the `append*` helpers in `src/state/session.ts`; there
is no update or delete path anywhere. A snapshot is written on entry to every
atomic state (the compound `firstCheck` delegates to its atomic children, so
each occupied state contributes exactly one snapshot).

## Phase 2 — Survival sub-states (Engine 1 only)

Survival Mode is now a compound state with the Engine 1 movement sub-states.
The Black Swan Engine remains stubbed; nothing past Phase 2 is built.

```
survival
  router ──(zero capacity)──> zcfm ; otherwise ──> normal
  normal   ──CONFIRM_MOVE ×2──> recovery ; ──REPORT_NEAR_ZERO──> zcfm
  zcfm     ──CONFIRM_MOVE ×2──> recovery ; ──CANNOT_MOVE──> immobile
  immobile ──WATCH_FOR_WINDOW──> windowDetection      (non-terminal; never No-Exit)
  windowDetection ──more capacity──> normal ; ──external change──> zcfm ; ──not yet──> stay
  recovery ──CONFIRM_MOVE──> stay ; ──TOO_MUCH──> normal   (does NOT unlock Guided Mode)
```

- **Two-moves rule:** each completed move increments `recoveryScore.successfulMovesInARow`;
  a capacity drop or "too much" resets it. Two in a row routes to Recovery.
- **ZCFM** shows one ultra-small move (no money / planning / sustained attention / new
  skill / external approval / outcome dependency). Success = attempted or completed.
- **Immobile Constraint** is a non-terminal capacity state — the door still works and
  waiting counts as the move. It is **not** No-Exit and **not** the Safety Override.
- **Window Detection** is low-pressure: fixed options, no timers, no countdown.
- SafetyOverride stays global, terminal, and reachable from every sub-state; one immutable
  snapshot is still appended on entry to every atomic state.

New content: `content/{zcfmMoves,immobileCopy,windowOptions,recoveryCopy}.ts`.
New screens: `ZCFMScreen`, `ImmobileScreen`, `WindowDetectionScreen`, `RecoveryScreen`.

## Diagnostics layer (Phase 2B — pure, unwired)

Engine 1 has an early Trap-Architecture diagnostic layer. It is **pure library
code that is not part of the running app** — it is never imported by the state
machine, UI, routing, or persistence, so it adds **zero runtime behaviour** (the
app bundle is unchanged). It exists only to be exercised by tests for now.

- **Phase 2B-0 — type foundation** (`src/state/diagnostics.ts`): the five core
  `TrapDiagnosticState`s, ten `IntermediateVerdict`s, the eight `DoorType`s
  (aligned with `DoorRecord`), and the result/record interfaces. Types only.
- **Phase 2B-1 — proxy classifier** (`src/diagnostics/detectTrapDiagnostic.ts`):
  `detectTrapDiagnostic(input, now?)` maps proxy signals to a
  `TrapDiagnosticResult`. It is **pure and deterministic** (inject `now` for a
  fixed timestamp), never auto-confirms No-Exit (capped at evidence-bounded
  `PROVISIONAL`, blocked by open questions), needs trajectory for Backfiring,
  and never overrides the SafetyOverride or movement-state regression.
- **Phase 2B-2 — validation suite** (`diagnosticScenarios.fixtures.ts` +
  `detectTrapDiagnostic.scenarios.test.ts`): realistic scenario fixtures that
  prove the five states diverge cleanly and the safety ceilings hold.
- **Phase 2B-3 — MODEL_MISMATCH calibration**: MODEL_MISMATCH does not become a
  primary diagnostic state from a single weak signal. A single weak signal
  produces only a provisional model-fit concern and does not count toward
  SYSTEM_OVERLOAD simultaneity. Two or more signals, or one explicit
  contradiction, are required for MODEL_MISMATCH to become a fired core
  diagnostic state.
- **Phase 2B-4 — Door Audit Lite foundation** (`src/diagnostics/doorAuditLite.ts`):
  pure diagnostic infrastructure only. It extends the existing
  `DoorAuditLiteRecord` scaffold and adds `summarizeDoorAuditLite(records,
  options?)`, which records and summarizes door evidence as an **evidence
  ledger, not a decision engine**. It uses the same No-Exit blocker categories
  as the classifier — refused, delayed, capacity-blocked, unsearched,
  predicted-sealed, low witness reliability, and incomplete enumeration — and
  treats an omitted `enumerationComplete` as **incomplete**, so it blocks any
  premature No-Exit interpretation when mapping is incomplete or uncertain. It
  never imports or calls the classifier, is not wired into the app, has no UI,
  no `selectTarget`, and makes no recommendations or AI/model calls.
- **Phase 2B-5 — reconciliation tests**: proves Door Audit Lite blocker flags and
  classifier No-Exit blockers stay aligned. This remains test-only / pure
  diagnostic validation and adds no runtime wiring. No shared blocker-category
  constant is introduced, so the tests can detect drift between the two
  independently implemented layers.
- **Phase 2B-6 — diagnostic readout copy contract**
  (`src/diagnostics/diagnosticReadoutCopy.ts`): a **static** safety contract for
  how diagnostic findings MAY eventually be displayed — the approved labels,
  descriptions, required qualifiers, allowed frames, and the banned-phrase list —
  exposed by the single no-argument API `getDiagnosticCopyContract()`. It is
  **not a formatter**: it never takes a live `TrapDiagnosticResult` and never
  assembles display text from classifier output. Every rule carries
  `displayPermissionGranted: false` and `mustNotRecommend: true`, so defining
  safe language for a state grants **no** permission to surface it (that is a
  later phase with its own gate). No-Exit copy stays evidence-bounded ("a
  statement about the file, not about the world"), and Backfiring copy is
  pattern-only — it routes any next step to a qualified person and is never a
  treatment instruction. Pure, deterministic, deep-frozen, and unwired.

**Not built yet:** no full Door Audit, no Door Audit UI, no `selectTarget`, no
diagnostic routing/persistence, and no Guided Mode, Strategy Mode, COR panel,
3D, or Observatory.

## Phase 3-0 — Guided Recovery Boundary Scaffold

Phase 3-0 defines the **boundary** for a future Guided Recovery — what it is
allowed to do before it does anything — as pure scaffolding
(`src/recovery/guidedRecoveryBoundary.ts`). It is **not** Guided Recovery, not a
UI, and not wired into the running app; like the diagnostics layer it is pure
library code exercised only by tests.

- Guided Recovery is for **stabilizing capacity after Survival Recovery**. The
  core rule: **Phase 3 restores capacity; Phase 4 chooses strategy.**
- `evaluateGuidedRecoveryBoundary(input)` returns **permission only**, never a
  recovery action. It uses strict precedence — **SafetyOverride → survival state
  → capacity band → user intent** — and **SafetyOverride always wins**: when it
  is active the decision is `blocked_by_safety_override` regardless of every
  other field. Entry is allowed only from the stable Survival `recovery` footing
  (two steady moves in a row), with `recovering`/`stable` capacity and an
  explicit `stabilize`/`unknown` intent. `high` capacity is **blocked** here
  (reserved for a later Strategy phase), never routed into strategy. Missing gate
  inputs fail safe and block: an absent `capacityBand` or `successfulMovesInARow`
  blocks, and an absent `userIntent` is `blocked_by_missing_intent` — distinct
  from the explicit typed value `unknown`, which may pass.
- Every decision carries the constant guarantees `mustNotDiagnose`,
  `mustNotRecommend`, `mustNotSelectStrategy`, `mustNotGiveTreatmentInstruction`,
  and `mustNotActAsTherapy` as `true` — even when entry is allowed.
- Guided Recovery copy is **static framing only**, not a micro-step catalog:
  there is no recovery-step library, no generated or personalized instructions,
  no recommendations. The copy contract and every rule carry
  `displayPermissionGranted: false` and `mustNotRecommend: true`, so defining
  safe language grants **no** permission to surface Guided Recovery — that is a
  later, gated phase.
- Guided Recovery does not diagnose, select strategy, recommend actions, provide
  therapy, or give medical/treatment instructions. SafetyOverride remains
  supreme, and Phase 3 stays separate from Phase 4 Strategy Mode. No Guided
  Recovery UI or runtime wiring exists yet.

## Phase 3-1 — Guided Recovery Type / State Foundation

Phase 3-1 defines the **state shape** for a future Guided Recovery
(`src/recovery/guidedRecoveryState.ts`) — stage/status unions, boundary + permission
flags, session slots, and abstract stage metadata — **before** any UI, runtime
wiring, or recovery steps exist. It is type/state foundation only: it adds no
Guided Recovery UI, no runtime wiring, no recovery step library, no
recommendations, and no strategy selection.

- `GuidedRecoveryStage` (`not_started`/`orientation`/`capacity_check`/
  `stabilization`/`reflection`/`handoff`/`closed`) and `GuidedRecoveryStatus`
  (`inactive`/`available`/`active`/`paused`/`blocked_by_safety_override`/`closed`)
  are closed label unions. `active`/`paused` are **reserved** future values —
  Phase 3-1 adds no `createActive`/`createPaused` or any transition helper.
- The factory is **allowed-only**: `createAvailableGuidedRecoveryState(input)`
  returns an `available` state **only** when `entryStatus === 'allowed'`; every
  blocked entry status yields a blocked state that preserves the `entryStatus`
  (SafetyOverride → `blocked_by_safety_override`, otherwise `inactive`) — never
  `available`/`active`. It stores a caller-supplied `entryStatus` and **does not**
  evaluate entry policy (it never calls `evaluateGuidedRecoveryBoundary`).
- Every state keeps boundary flags literal `true` (`mustNotDiagnose`,
  `mustNotRecommend`, `mustNotSelectStrategy`, `mustNotGiveTreatmentInstruction`,
  `mustNotActAsTherapy`, `mustStayEvidenceBounded`, `mustRemainCapacityFocused`)
  and permission flags `displayPermissionGranted: false` /
  `runtimePermissionGranted: false` — even under SafetyOverride. Defining the
  shape grants **no** permission to display, run, route, persist, or enter Guided
  Recovery.
- Stage definitions are **labels only** and authorize no recovery prompts,
  reflection questions, journaling prompts, exercises, coping techniques,
  concrete steps, treatment guidance, strategy, recommendations, or user-facing
  dialogue. There is **no** `notes` (or other free-form text) slot, and no
  strategy/target/action/recommendation/plan/route/COR field.
- Any timestamp fields are **caller-supplied strings only** (the module never
  calls a clock), and `copyContractVersion` is a caller-supplied string that adds
  no versioning behavior to `getGuidedRecoveryCopyContract`. The module imports
  only the `GuidedRecoveryEntryStatus` **type** from the boundary (erased at
  build); it stays pure and unwired, so the app bundle is unchanged.

### Capacity bands — the `high` gap

`CapacityBand` includes `high`, but First Check has no answer that maps to it
(answers A–D map to `zero`/`low`/`recovering`/`stable`). `high` is **reserved**
for a future High-Capacity Strategy / 3D Observatory unlock and is intentionally
unreachable from the current flow until those modes ship. See the roadmap note
on `bandForAnswer` in `src/machine/guards.ts`.

## File map

```
src/
  main.tsx                  app entry
  App.tsx                   bootstraps session + actor, persists on transition
  machine/
    appMachine.ts           XState v5 machine, guards/actions wiring
    guards.ts               band mapping + routing precedence
  state/
    types.ts                shared data model (incl. stubbed engine slices)
    session.ts              Session factory + append-only helpers
    persistence.ts          IndexedDB load/save with localStorage fallback
  components/
    ModeShell.tsx           hosts the active screen, mounts SafetyOverlay
    SafetyOverlay.tsx       persistent help button + Safety Override screen
    FirstCheckScreen.tsx    danger gate, then capacity read
    SurvivalScreen.tsx      one templated move + confirm
  content/
    dangerConditions.ts     five danger conditions + "none of these"
    survivalMoves.ts        fixed templated moves (no generation)
    safetyResources.ts      Safety Override copy + resources (localise in prod)
  __tests__/                Vitest suites (see below)
```

## Acceptance criteria → where proven

| Criterion | Where | Test |
|---|---|---|
| Danger flag routes to Safety Override + records SafetyEvent, from any state | `appMachine.ts` root `SAFETY_TRIGGER` | `machine.test.ts` |
| Manual help button reaches Safety Override from every screen | `SafetyOverlay.tsx` → `SAFETY_TRIGGER` | `machine.test.ts` |
| Safety Override is terminal and blocks re-entry | `safetyOverride: { type: 'final' }`, boot resume guard | `machine.test.ts` |
| First Check computes + stores a band that survives reload | `computeBand`, persistence | `machine.test.ts`, `persistence.test.ts` |
| Survival shows one templated move + confirm that writes an Event | `SurvivalScreen.tsx`, `logMove` | `machine.test.ts` |
| Every state entry appends one immutable snapshot; history only grows | entry `writeSnapshot`, append-only helpers | `machine.test.ts`, `session.test.ts` |
| Session persists locally and reloads offline | `persistence.ts` | `persistence.test.ts` |
| No 3D / cockpit / Door Audit / AI text anywhere | scope guard | `scope.test.ts` |
