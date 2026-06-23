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
