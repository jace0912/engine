# Black Swan Crisis Operating System
## Unified Build Plan: One Product, Two Engines

**Scope of this document.** The unified architecture (sections 1 to 9) plus the Phase 1 build instruction (sections 10 to 11). Nothing past Phase 1 is built here. The two engines are kept as separate logic systems. Neither engine is redesigned or simplified.

**Build conventions used throughout.**
- Stack target: Vite + React + TypeScript, XState v5 for the state machine, local-first persistence (IndexedDB with a localStorage fallback). No backend and no auth in Phase 1.
- The shell owns routing, modes, persistence, and the Safety Override. The engines own only their own logic.
- Every state entry writes an immutable StateSnapshot. History is append-only across the whole product.
- No free-form AI advice anywhere in Phase 1. Survival Mode shows templated, fixed-text moves only.

---

## 1. Unified product architecture

One product, one shell, two sealed engines. The product is the **Black Swan Crisis Operating System**. Inside it run two engines that never call each other's logic.

The integration happens at the **session and data layer**, never at the logic layer. The two engines write into one shared session and read their own slice of it. The shell decides which engine is active and how much of it is exposed. That decision is the Mode.

```
┌───────────────────────────────────────────────────────────────────────┐
│  SAFETY OVERRIDE  (global guard, reachable from every state, terminal)  │
└───────────────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────────────┐
│  SHELL LAYER                                                            │
│  First Check  ·  Router  ·  Mode Manager  ·  Session Store  ·  Persist  │
└───────────────┬─────────────────────────────────────┬─────────────────┘
                │ activates                            │ activates
        ┌───────▼────────┐                    ┌────────▼─────────┐
        │  ENGINE 1       │   (no shared      │  ENGINE 2        │
        │  Survival Trap  │    logic between  │  Black Swan      │
        │  Engine (sealed)│    the two)       │  Engine (sealed) │
        └───────┬────────┘                    └────────┬─────────┘
                │ writes / reads its slice             │ writes / reads its slice
┌───────────────▼─────────────────────────────────────▼─────────────────┐
│  SHARED DATA LAYER                                                      │
│  User · Session · StateSnapshot[] (append-only) · Event[] · SafetyEvent[]│
│  TrapEngineState · BlackSwanState · CrisisOperatingRecord · RecoveryScore│
└───────────────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (mode screens)                                      │
│  Survival · Guided Recovery · Strategy · Observatory (later)            │
└───────────────────────────────────────────────────────────────────────┘
```

**How two engines live in one product without merging.**
1. **Sealed logic boundaries.** Engine 1 and Engine 2 are separate modules with their own state machines, verdicts, and rules. There is no shared verdict vocabulary and no cross-call. A Door Audit never produces a Cascade Map; a Cascade Map never produces a No-Exit verdict.
2. **A single shared session.** Both engines persist into one `Session` object. Engine 1 owns `trapState`. Engine 2 owns `blackSwanState`, whose source of truth is the Crisis Operating Record. The shared snapshot, event, and safety logs belong to the shell.
3. **Mode is the projection.** Capacity decides which engine is live and how much surface area shows. Low capacity exposes one screen of Engine 1. High capacity exposes the full loop of Engine 2. The user experiences one coherent system because the shell, the session, and the Safety Override are continuous across modes.
4. **One global safety guard.** The Safety Override sits above both engines. It is the only path that can fire from any state, suppress the active tool flow, and route to a human. It is shell-owned, so it works identically whichever engine is active.

---

## 2. Engine boundary map

| Concern | Survival Trap Engine (Engine 1) | Black Swan Engine (Engine 2) | Shell / shared (neither engine) |
|---|---|---|---|
| Purpose | Low-capacity survival, constraint diagnosis, movement restoration | High-capacity crisis navigation and strategy | Routing, modes, persistence, safety |
| Core procedure | Door Audit | Seven-stage loop: GATE, TYPE, MAP, TARGET, PRE-COMMIT, EXECUTE, AUDIT | First Check, Mode Manager |
| Owned logic | No-Exit logic, Capacity Constraint, Compound Constraint, Immobile Constraint, ZCFM, Window Detection, Recovery, regression, re-entry, the door typology | GATE, TYPE, MAP, TARGET, PRE-COMMIT, EXECUTE, AUDIT, Catalyst detection, Cascade Map, Triage, Decision Architecture, Energy Economics, Five Cognitive Moves | Capacity band computation, route selection, mode transitions |
| Verdict vocabulary | Door types, Capacity Constraint, Compound Constraint, Immobile Constraint, Window, Recovery states | Crisis type, catalyst, stage estimate, loop decision | Capacity band, mode |
| Primary record | Append-only `trapState` history (door records, moves) | Crisis Operating Record (single source of truth) | `Session`, `StateSnapshot[]`, `Event[]` |
| Active in modes | Survival Mode (and the bridge into Guided) | Strategy Mode (and Observatory) | All modes |
| Safety | Inherits the global Safety Override; never emits terminal language; Compound and Immobile are non-terminal | Inherits the global Safety Override; Module 0 escalation feeds it | Owns and renders the Safety Override |

**Hard boundary invariants.**
- Engine 1 never produces a confirmed No-Exit in any automated path. Compound Constraint is not No-Exit. Immobile Constraint is not No-Exit. Both stay evidence-bounded and non-terminal.
- Engine 2's Crisis Operating Record is the only source of truth for Engine 2 state. No screen holds private Black Swan state.
- Neither engine instructs a user to start, stop, or alter treatment. That rule is enforced in copy review and in the fixed-text move library, not left to runtime generation.

---

## 3. User state ladder

Capacity is the single axis that drives everything. The ladder has five rungs. Each rung names what the user can do, what they see, and which engine is live.

| Rung | Observable signal | What the user can do | What they see | Engine / mode |
|---|---|---|---|---|
| **Zero capacity (ZCFM)** | Cannot act on even one small move; cannot complete a single offered step | Receive, breathe, hold | One passive line and the Safety button. No decisions requested. | Engine 1, Survival Mode, ZCFM sub-state |
| **Low capacity** | Shaky, can do one concrete thing at a time | One named move, then a single confirm | One screen, one move, one confirm, Safety button | Engine 1, Survival Mode |
| **Recovery** | Has completed two moves in a row; capacity rebuilding above the floor | Two to three capped actions | A simplified problem, constraint, and next move view; a mini-map may appear | Bridge from Engine 1 into Guided Recovery Mode |
| **Stable capacity** | Can hold a two-step plan and a short sequence | Work a guided multi-stage process | One active stage at a time, the COR as anchor | Engine 2, Strategy Mode |
| **High-capacity strategy** | Can hold the whole picture and wants the full instrument | The full Black Swan loop, optional visual layer | The seven-stage loop, COR panel, optional 3D | Engine 2, Strategy Mode, then optional Observatory |

**Ladder rules.**
- Capacity moves both ways. The ladder is climbed and descended.
- A drop in capacity, a control-rating drop, or a stop condition routes the user down at least one rung.
- A danger flag leaves the ladder entirely and goes to the Safety Override.
- Higher rungs are unlocked, never forced. Stable capacity *allows* Strategy Mode. It does not auto-launch it.

---

## 4. Routing logic

All users begin at the **First Check**. The First Check has two jobs in order: clear the danger gate, then read current capacity and route.

```
FIRST CHECK
 step 0  Danger gate
   show the five danger conditions plus "none of these"
   if any danger condition is true:
       record SafetyEvent
       route -> SAFETY OVERRIDE        # nothing below runs
 step 1  Capacity read
   one tappable question: "Right now, how much can you take on?"
     A "I can barely function. Get me through the next few minutes."  -> zero/low
     B "I am shaky but I can do one small thing."                     -> low
     C "I am steadier. I could work through a few steps."             -> recovering
     D "I am stable and want to work on the actual problem."         -> stable
   compute capacity band
   write Event 'first_check_completed' and a StateSnapshot
 step 2  Route by band
   zero or low or uncertain -> Survival Mode
   recovering               -> Guided Recovery Mode
   stable                   -> Strategy Mode (offered, not auto-run)
   high                     -> Strategy Mode; Observatory offered as opt-in unlock
```

**Routing precedence (enforced in code, top wins).**
```
safety  >  capacity  >  requested mode
```
- Safety always wins. A danger flag overrides any route.
- Capacity sets the default destination.
- A user may request a higher mode only if capacity allows it. The request never overrides a low-capacity read.

**Phase 1 note.** In Phase 1 only Survival Mode is built. The First Check still computes and stores the full band, but every non-danger band resolves to Survival Mode as the safe default. The recovering, stable, and high branches are wired as placeholders that fall back to Survival until their modes ship. This keeps Phase 1 minimal and forward-compatible.

**Default-safe rule.** When capacity is uncertain, or the read conflicts with itself, route down, not up. The cheapest error is to show a calmer, simpler mode than strictly needed.

---

## 5. Mode transition rules

Transitions are guarded. Each transition below lists its trigger and its guard. Up-transitions require an unlock condition. Down-transitions (regression) fire on capacity loss or a stop condition. The Safety Override fires from anywhere.

**Within Engine 1 (Survival and its sub-states).**

| From | To | Trigger | Guard |
|---|---|---|---|
| Survival | ZCFM | User cannot complete the offered move, or self-reports zero capacity | Confirm it is capacity, never architecture |
| ZCFM | Immobile | No door is currently openable by capacity | The door functions; capacity to open it is currently absent. Marked non-terminal |
| Immobile | Window Detection | The engine begins watching for a capacity or opportunity window | A door exists with a known or estimable opening (DELAYED dated, or capacity expected to return) |
| Window Detection | Survival | A window opens | Surface exactly one move to make in the window |
| ZCFM | Recovery | Two successful moves completed in a row | `recoveryScore.successfulMovesInARow >= 2` |
| Recovery | Survival | A move fails or capacity dips | Regression, single rung |

**Across the bridge and up into Engine 2.**

| From | To | Trigger | Guard |
|---|---|---|---|
| Recovery (Engine 1) | Guided Recovery Mode | Capacity rebuilt above the survival floor | Sustained completion; user can hold two to three capped actions |
| Guided Recovery Mode | Strategy Mode | Capacity reads stable | User can hold a multi-step plan; Strategy Mode is offered, then chosen |
| Strategy Mode | Observatory Mode | Capacity reads high and the user opts in | Observatory is an explicit unlock, never the default entry |

**Regression (down) routes.**

| From | To | Trigger |
|---|---|---|
| Observatory | Strategy | Visual load too high, or capacity dip |
| Strategy | Guided | Capacity drop below stable, or a control-rating drop |
| Strategy | Survival | Sharp capacity drop, or a stop condition fires |
| Guided | Survival | Capacity drop below recovery |
| Any | ZCFM | Capacity falls to zero |
| **Any** | **Safety Override** | **Any danger flag, at any time** |

**Transition diagram.**
```
                         ┌──────────────── SAFETY OVERRIDE (from any state) ───────────────┐
                         └──────────────────────────────────────────────────────────────────┘

   ZCFM ──(no openable door)──> Immobile ──(watch)──> Window Detection ──(window opens)──> Survival
    │                                                                                        ▲  │
    │ two successful moves                                                                    │  │ move fails / dip
    ▼                                                                                        │  ▼
 Recovery ───────────────(capacity above floor)────────────> Guided Recovery ──(stable)──> Strategy ──(opt-in, high)──> Observatory
    ▲                                                              ▲   │                        ▲   │                       │
    └──────────────────────── regression ─────────────────────────┘   └──── regression ───────┘   └──── regression ───────┘
```

---

## 6. Shared data model

One shared session supports both engines. The Crisis Operating Record stays the single source of truth for Engine 2. The Trap Engine state history stays append-only. The snapshot, event, and safety logs are append-only and shell-owned.

```typescript
type Mode = 'survival' | 'guided' | 'strategy' | 'observatory';
type CapacityBand = 'zero' | 'low' | 'recovering' | 'stable' | 'high';
type EngineId = 'trap' | 'blackswan' | 'shell';
type SessionStatus = 'active' | 'safety_override' | 'closed';

interface User {
  id: string;            // local uuid in Phase 1
  createdAt: string;     // ISO-8601
}

interface Session {
  id: string;
  userId: string;
  startedAt: string;
  currentMode: Mode;
  currentCapacity: CapacityBand;
  engineInUse: EngineId | null;
  status: SessionStatus;

  // append-only logs, shell-owned
  history: StateSnapshot[];
  events: Event[];
  safetyEvents: SafetyEvent[];

  // engine slices, each owned by exactly one engine
  trapState: TrapEngineState | null;        // Engine 1
  blackSwanState: BlackSwanState | null;     // Engine 2

  recoveryScore: RecoveryScore;
}

// Immutable. Written on every state entry. Never edited, never deleted.
interface StateSnapshot {
  id: string;
  sessionId: string;
  at: string;            // ISO-8601
  mode: Mode;
  capacity: CapacityBand;
  engine: EngineId;
  stateName: string;     // machine state at this instant
  note?: string;         // short structured note; no free-form text
}

// Append-only. User and system events.
interface Event {
  id: string;
  sessionId: string;
  at: string;
  type: string;          // 'first_check_completed' | 'move_logged' | 'mode_changed' | ...
  payload: Record<string, unknown>;
}

// Append-only. Safety is logged, never silently cleared.
interface SafetyEvent {
  id: string;
  sessionId: string;
  at: string;
  flag:
    | 'suicide_self_harm'
    | 'medical_emergency'
    | 'substance_beyond_control'
    | 'threat_to_child'
    | 'violence_abuse'
    | 'manual_help_request';
  originMode: Mode | 'first_check';
  originState: string;
}

interface RecoveryScore {
  band: CapacityBand;
  successfulMovesInARow: number;   // drives ZCFM -> Recovery at >= 2
  value?: number;                  // optional internal 0..100, within-person only
  updatedAt: string;
}

// ---- Engine 1, sealed. Append-only door records and moves. ----
interface TrapEngineState {
  phase: 'survival' | 'zcfm' | 'immobile' | 'window_detection' | 'recovery';
  doors: DoorRecord[];             // append-only
  // never 'no_exit' at system level in any automated path
  activeConstraint: 'capacity' | 'compound' | 'immobile' | null;
  lastMove?: { at: string; move: string; completed: boolean };
}

interface DoorRecord {
  id: string;
  at: string;
  label: string;
  type:
    | 'sealed'
    | 'structurally_impossible'
    | 'predicted_sealed'
    | 'refused'
    | 'delayed_dated'
    | 'delayed_indefinite'
    | 'unreachable_by_capacity'
    | 'unsearched';
  note?: string;
}

// ---- Engine 2, sealed. COR is the single source of truth. ----
interface BlackSwanState {
  stage: 'gate' | 'type' | 'map' | 'target' | 'precommit' | 'execute' | 'audit';
  cor: CrisisOperatingRecord;      // single source of truth, read and written by every Strategy screen
}

// The twelve-section record from the Black Swan engine spec.
// Top-level shape only; the full field set is the approved engine spec.
interface CrisisOperatingRecord {
  runId: string;
  userId: string;
  startedAt: string;
  crisisName: string;
  container: 'inverse_swiss_cheese_model';
  lifeRaft: { fact: string; action: string; observation: string; complete: boolean };
  module0: {
    scores: Record<string, number>;        // six domains, 1..10
    direction: Record<string, 'restoring' | 'stable' | 'depleting'>;
    thresholdPass: boolean;
    stabilisationCycles: number;
  };
  diagnostic: { type: string; position: string; primaryDomain: string; capacityClass: string };
  snapshotBaseline: { situation: string; cascade: string; need: string; control: number; date: string };
  cascadeMap: { problems: { text: string; reliefCount: number }[]; catalyst: string; cocatalyst: string | null; tier1: string[]; tier2: string[]; stage: string; deadline30d: boolean };
  target: { interruptionPoint: string; triage: Record<string, string>; priorityOrder: string[] };
  precommit: { governingDecision: string; door: string; separation: unknown[]; energy: Record<string, string[]>; humanOverride: { name: string; contact: string; stakesThreshold: string }; triggers: { trigger: string; preAuthorisedResponse: string }[] };
  executionLog: { date: string; mva: string; outcome: string; notes: string }[];
  markerChecks: { tool: string; before: number; after: number; date: string }[];
  progressMarkers: { week: number; cascadeFrequency: number; decisionLatency: number; recognitionSpeed: number; control: number }[];
  snapshotRetake: { situation: string; cascade: string; need: string; control: number; date: string; controlDelta: number };
  loopDecision: { decision: string; date: string };
}
```

**Persistence rules.**
- One `Session` per crisis run, persisted locally, offline-first.
- `history`, `events`, and `safetyEvents` are append-only. There is no update or delete on these arrays anywhere in the codebase.
- `cor` is read and written only through the Black Swan state. No Strategy screen holds private Black Swan state.
- `trapState.doors` and `trapState` history are append-only.

---

## 7. Frontend component map (v1)

No 3D components in Phase 1. The components below cover the four modes; Phase 1 implements only the ones marked **[P1]**.

| Component | Responsibility | Mode | Phase |
|---|---|---|---|
| `FirstCheckScreen` | Danger gate, then capacity read, then route | Entry | **[P1]** |
| `SafetyOverlay` | Always-mounted global safety route; manual help button; renders the Safety Override screen | All | **[P1]** |
| `SurvivalScreen` | One screen, one templated move, one confirm | Survival | **[P1]** (placeholder) |
| `InputScreen` | Single-input capture for a survival step | Survival | P2 |
| `ChoiceScreen` | A small capped set of tappable options | Survival, Guided | P2 |
| `ActionScreen` | The one named move and its completion | Survival | P2 |
| `PassiveScreen` | ZCFM screen: one passive line, no decision asked | Survival (ZCFM) | P2 |
| `ResultScreen` | Outcome capture for a move | Survival, Guided | P2 |
| `RecoveryScreen` | Recovery view; tracks the two-move count | Survival to Guided bridge | P2 |
| `GuidedModeScreen` | Simplified problem, constraint, next move; optional mini-map | Guided | P3 |
| `StrategyStageScreen` | One Black Swan stage at a time, GATE to AUDIT | Strategy | P4 |
| `CORPanel` | Read and write the Crisis Operating Record; the single anchor | Strategy | P5 |
| `ModeShell` | Hosts the active mode, mounts the SafetyOverlay, owns the router | All | **[P1]** |
| `SnapshotWriter` (service, not visual) | Writes an immutable StateSnapshot on every state entry | All | **[P1]** |

Observatory and all 3D components are out of scope until Phase 6.

---

## 8. UX copy rules

Keep copy calm, non-moralising, non-terminal, and low in cognitive load. The same global bans apply in every mode.

**Global bans (all modes).**
- No terminal or hopeless language. Banned: "trapped," "no way out," "stuck forever," "nothing you can do," "hopeless," "this is the end."
- No treatment instruction. The system never tells a user to start, stop, or change any medication, therapy, or care.
- No diagnosis language about the person.
- No normed or "measurable outcome" claims. Scores are within-person trackers only.
- One concept per screen. Present tense. Concrete nouns. Short lines.

**Low-capacity user.**
- One instruction at a time, written as a single small action for the next few minutes.
- Sentence stems over blank fields. Stock options over open text.
- Example. Say: "Pick one: drink water, sit down, or message one person." Avoid: "Develop a plan to address your situation."

**Immobile user.**
- Name the constraint as current and bounded. State that the door still works and that the capacity to open it is what is missing right now.
- Frame waiting as a legitimate move. Make clear this is a capacity state, never a verdict about the world.
- Example. Say: "This door still works. Right now you do not have the fuel to open it. Waiting until you do is the move." Avoid: "There is no option available to you."

**Recovery user.**
- Acknowledge the two completed moves plainly, then offer one small forward step.
- Cap actions at two or three. Keep tone light and steady.
- Example. Say: "Two done. That is real. Here is one next thing when you are ready." Avoid: "Now that you have recovered, let us tackle everything."

**Strategy user.**
- The user can carry more, so show one stage at a time and let the COR hold the rest.
- Plain language for each stage. State the single output the stage produces.
- Example. Say: "This stage finds the one thing driving the cascade. Name it in one line." Avoid: dense framework names or numbered models in the interface.

---

## 9. Build phases

| Phase | Scope | Exit criteria |
|---|---|---|
| **Phase 1** | Shared state machine, First Check, text-only Survival Mode, SafetyOverlay, append-only StateSnapshots | Danger gate routes to Safety Override from any state; First Check computes and stores a capacity band; Survival placeholder shows one templated move; every state entry writes an immutable snapshot |
| **Phase 2** | ZCFM, Immobile Constraint, Window Detection, Recovery (the full Survival sub-states and their transitions) | All Engine 1 sub-state transitions fire per section 5; two-move Recovery rule works; Compound and Immobile stay non-terminal |
| **Phase 3** | Guided Recovery Mode (the bridge) | Recovery graduates to Guided; two to three capped actions; optional mini-map renders |
| **Phase 4** | Simplified Black Swan Strategy Mode, no 3D | Seven-stage loop GATE to AUDIT, one stage at a time, routing precedence enforced |
| **Phase 5** | COR panel and export | COR is the single source of truth; PDF export reproduces the paper COR |
| **Phase 6** | Optional 3D Crisis Observatory (Black Swan Engine only) | Opt-in unlock only, gated by Strategy Mode plus stable or high capacity plus a clear Safety Override; seven stations, Black Swan Core, COR side panel; one active station at a time, inactive dimmed; forms and COR as DOM overlays; fully usable without camera navigation; Safety Override reachable from every station and dims to Safe Handoff. **See the Phase 6 addendum below for the full specification.** |
| **Phase 7** | Testing and validation | Safety validation at 100 percent; engine and logic validation pass; beta cohort run documented |

---

## 10. Phase 1 implementation spec

Build only the shared state machine, the First Check, a simple text-only Survival Mode, the SafetyOverlay, and append-only state history. Do not build 3D, the Black Swan cockpit, the full Door Audit interview, or any free-form AI advice.

### 10.1 App scaffold
- Vite + React + TypeScript.
- XState v5 for the top-level machine.
- Local persistence: IndexedDB through a thin wrapper, with a localStorage fallback. Offline-first. One local `User` and one `Session` are created on first launch.
- Styling: minimal, high-contrast, large tap targets, one column. Tailwind or plain CSS modules. No animation, no time pressure.

**Suggested file structure.**
```
src/
  main.tsx
  App.tsx
  machine/
    appMachine.ts          // XState definition, guards, actions
    guards.ts              // dangerPresent, isLowCapacity, ...
    actions.ts            // writeSnapshot, writeEvent, computeBand
  state/
    session.ts             // Session factory, append-only helpers
    persistence.ts         // IndexedDB load/save, localStorage fallback
    types.ts               // all interfaces from section 6
  components/
    ModeShell.tsx
    SafetyOverlay.tsx
    FirstCheckScreen.tsx
    SurvivalScreen.tsx
  content/
    dangerConditions.ts    // the five danger conditions + copy
    survivalMoves.ts       // fixed templated moves, no AI
    safetyResources.ts     // help routing copy and resources
```

### 10.2 State machine (top level, Phase 1)

```
appMachine
  states:
    boot
      on enter: load or create User + Session
      always -> firstCheck
    firstCheck
      sub: dangerGate -> capacityRead -> route
      on DANGER:        -> safetyOverride   (record SafetyEvent)
      on BAND_COMPUTED: -> survival         (Phase 1: all non-danger bands resolve here)
    survival
      placeholder screen, one templated move, one confirm
      on CONFIRM_MOVE:  write Event 'move_logged', stay in survival
      on CAPACITY_DROP: stay in survival (ZCFM is Phase 2)
    safetyOverride
      terminal for the session
      suppress all tool prompts; show help route; record SafetyEvent
  root-level handler (applies in every state):
    on SAFETY_TRIGGER -> safetyOverride
  every state on entry: invoke writeSnapshot(stateName, mode, capacity, engine)
```

**Guards (Phase 1).**
- `dangerPresent(ctx, evt)`: any of the five danger conditions is checked.
- `bandIsDangerFree(ctx)`: First Check completed with no danger flag.

**Actions (Phase 1).**
- `writeSnapshot`: push an immutable StateSnapshot into `session.history`.
- `writeEvent`: push an Event into `session.events`.
- `recordSafetyEvent`: push a SafetyEvent into `session.safetyEvents`, set `session.status = 'safety_override'`.
- `computeBand`: map the First Check answer to a CapacityBand and store it.
- `persist`: save the Session after every transition.

### 10.3 First Check
- Danger gate first: render the five danger conditions plus "none of these." Any selection records a SafetyEvent and transitions to `safetyOverride` before anything else runs.
- Capacity read: one question, four tappable options (A to D from section 4). Map to a band, write `first_check_completed`, write a snapshot.
- Route: Phase 1 sends every danger-free band to Survival Mode and stores the band for later phases.

### 10.4 Simple routing
- Implement the precedence `safety > capacity > requested mode` in `guards.ts`, even though only Survival exists. The recovering, stable, and high branches are written as guarded transitions that currently resolve to Survival. This keeps the precedence real and the later phases drop-in.

### 10.5 Survival Mode placeholder
- One screen. One templated move drawn from `content/survivalMoves.ts` (fixed strings, no generation). One confirm button that writes `move_logged`. The Safety button is visible at all times via the SafetyOverlay.
- No Door Audit, no constraint logic, no input fields beyond the single confirm.

### 10.6 SafetyOverlay
- Always mounted by `ModeShell`, present in every state including First Check.
- A persistent, clearly labelled help button. Pressing it dispatches `SAFETY_TRIGGER` with flag `manual_help_request`.
- The Safety Override screen suppresses the active tool flow, shows the help route and resources, records the SafetyEvent, and does not allow re-entry into any tool from that screen for the session.

### 10.7 Append-only StateSnapshots
- A `writeSnapshot` action runs on entry to every machine state.
- `session.history` is append-only. There is no update or delete path. Add a unit test asserting the array only grows.
- After every transition, persist the Session.

### 10.8 Phase 1 acceptance criteria
1. From any state, including First Check and Survival, a danger flag routes to the Safety Override and records a SafetyEvent.
2. The manual help button reaches the Safety Override from every screen.
3. The Safety Override is terminal for the session and blocks re-entry into any tool.
4. The First Check computes and stores a capacity band; the band persists across reload.
5. Survival Mode shows one fixed templated move and a working confirm that writes an Event.
6. Every state entry appends exactly one immutable StateSnapshot; the history array never shrinks.
7. The Session persists locally and reloads offline.
8. No 3D, no Black Swan cockpit, no Door Audit interview, and no free-form AI text appear anywhere.

---

## 11. Developer handoff prompt (Phase 1 only)

Copy and paste the block below into Codex or Claude Code.

```
You are building Phase 1 ONLY of a product called the Black Swan Crisis Operating System.

HARD CONSTRAINTS. Read these first and obey them exactly.
- DO NOT build 3D or any visual observatory.
- DO NOT build the full Black Swan cockpit or the seven-stage loop.
- DO NOT build the full Door Audit interview or any trap-engine constraint logic.
- DO NOT build Guided Recovery Mode, Strategy Mode, or Observatory Mode.
- DO NOT build all phases. Build Phase 1 and stop.
- DO NOT redesign or merge the two engines. They are separate sealed modules. Phase 1 touches neither engine's internal logic.
- DO NOT add generic advice, AI-generated text, or any model call. Survival Mode shows fixed templated strings only.
- DO NOT add free-text fields beyond the single confirm in Survival Mode.
- DO NOT use terminal or hopeless language, and never instruct the user to start, stop, or alter any treatment.

BUILD EXACTLY THIS AND NOTHING MORE.
1. App scaffold: Vite + React + TypeScript, XState v5, local-first persistence (IndexedDB with a localStorage fallback, offline-first). Create one local User and one Session on first launch.
2. Shared data model: implement the TypeScript interfaces for User, Session, StateSnapshot, Event, SafetyEvent, RecoveryScore, and stubbed TrapEngineState and BlackSwanState. history, events, and safetyEvents are append-only with no update or delete path.
3. Top-level state machine (XState): boot -> firstCheck -> survival, plus a global safetyOverride state reachable from every state via a root-level SAFETY_TRIGGER handler. safetyOverride is terminal for the session and blocks re-entry into any tool. On entry to every state, write one immutable StateSnapshot and persist the Session.
4. First Check: a danger gate showing five danger conditions plus "none of these" (any selection records a SafetyEvent and routes to safetyOverride before anything else), then one capacity question with four tappable options that maps to a capacity band, stored on the Session. Phase 1 routes every danger-free band to Survival Mode and stores the band for later use.
5. Simple routing with precedence enforced in code: safety > capacity > requested mode. Only Survival Mode has a real destination in Phase 1; the recovering, stable, and high branches are guarded transitions that currently resolve to Survival.
6. Survival Mode placeholder: one screen, one fixed templated move from a small content file, one confirm button that writes a 'move_logged' Event. No constraint logic, no Door Audit.
7. SafetyOverlay: always mounted in every state, a persistent labelled help button that dispatches SAFETY_TRIGGER with flag 'manual_help_request', and a Safety Override screen that suppresses the tool flow, shows help resources, records the SafetyEvent, and blocks tool re-entry.

ACCEPTANCE CRITERIA. The build is done when all of these pass:
- A danger flag routes to the Safety Override and records a SafetyEvent from any state.
- The manual help button reaches the Safety Override from every screen.
- The Safety Override is terminal for the session and blocks re-entry.
- First Check computes and stores a capacity band that survives reload.
- Survival Mode shows one fixed templated move and a working confirm that writes an Event.
- Every state entry appends exactly one immutable StateSnapshot; the history array only grows (add a unit test for this).
- The Session persists locally and reloads offline.
- There is no 3D, no Black Swan cockpit, no Door Audit, and no AI-generated text anywhere.

Use a clean one-column layout, high contrast, large tap targets, no animation, no time pressure. When Phase 1 meets every acceptance criterion, stop and report. Do not begin Phase 2.
```

---

# Phase 6 addendum: Black Swan 3D Observatory

**Status of this addendum.** This is an addition only. Phase 1 is unchanged. The build order is unchanged. The 3D Observatory stays at Phase 6 and is never moved earlier. The Survival Trap Engine and the Black Swan Crisis Engine remain separate logic systems and are not merged here. The Trap Engine is not turned into a 3D maze.

**Art direction.** The reference image is the target look for this phase: a dark crisis control room, a central glowing Black Swan Core, seven stations ringed around it, the red Safety Override pathway running across the top and the bottom, and the Crisis Operating Record as a real-time log panel down the right side. The image carries its own governing caption, "this is your cockpit, not a maze," and that line is the rule. The Black Swan Observatory is a control room and a cockpit. It is never a maze.

### 1. Purpose

The 3D Observatory is a high-capacity optional visual layer for the Black Swan Engine. It gives a stable, high-capacity user a single cockpit view of the seven-stage loop and the live state of their crisis.

- It is a view, never an engine. It adds presentation to Strategy Mode and changes none of the Black Swan logic.
- It is not the default entry. Every user still begins at the First Check.
- It is not used for low-capacity Survival Mode. A depleted user is never routed here.
- It is optional. Strategy Mode remains fully usable in its flat, one-stage-at-a-time form without the Observatory.

### 2. Unlock condition

Observatory Mode is unlocked only when all four hold at once:

1. The user is in Strategy Mode.
2. Capacity reads stable or high.
3. The Safety Override is clear.
4. The user explicitly opts in.

The unlock is an offer, never an automatic launch. If any condition drops (capacity falls, or the Safety Override fires), the Observatory closes and the user returns to the flat Strategy Mode or lower, per the regression rules in section 5 of the main plan.

### 3. 3D metaphor

The approved metaphor set, matching the reference image:

- **Crisis Observatory** as the whole scene.
- **Control room** as the framing.
- **Black Swan Core** at the centre, the live cascade core showing the real-time crisis map and system state.
- **Seven stations** ringed around the core: GATE, TYPE, MAP, TARGET, PRE-COMMIT, EXECUTE, AUDIT.
- **COR side panel** down the right, the real-time system log and system-state readout.
- **Safety Override pathway** visible everywhere, rendered as the persistent red banner across the top and the bottom and as the exit route in the COR panel.

A maze metaphor is never used for the Black Swan Engine. The cockpit framing is fixed.

### 4. Data rule

The 3D scene must not own state. It is a read-only projection of the existing store. It subscribes and renders; it never holds the truth.

It reads:
- `BlackSwanState`
- the Crisis Operating Record
- the current stage
- the safety state
- the catalyst and the co-catalyst
- the cascade tiers
- the control rating
- the loop decision

Write path. Any input a user makes in the Observatory (a form field, a stage action, a deploy) is routed through the existing Black Swan state machine and written to the COR, exactly as Strategy Mode writes. The Observatory never writes directly to the store and never holds a private copy of session state. The only state the 3D layer may hold is ephemeral view state, such as which station has focus and where the camera sits, and that view state is never persisted as truth.

The Crisis Operating Record remains the single source of truth. A test for this phase: removing the entire 3D layer leaves the COR and all session data intact and the flat Strategy Mode fully functional.

### 5. UX rule

- **One active station at a time.** Exactly one station is live and detailed. The other six are dimmed.
- **DOM controls, not 3D navigation.** A DOM control rail lets the user switch stations and operate every control without moving the camera. The Observatory must be fully usable by someone who never touches 3D navigation. The 3D camera is enhancement, never a requirement for the task.
- **Forms are DOM overlays.** The Module 0 inputs at GATE, the type selection at TYPE, the cut-point and risk fields at TARGET, the pre-decide and allocation controls at PRE-COMMIT, the action and deploy controls at EXECUTE, and every other entry surface render as accessible DOM overlays anchored to the active station. Text is never typed into the WebGL canvas. This keeps keyboard use, screen readers, and copy and paste working.
- **The COR panel renders the existing log.** The right-side panel is a read-only view of the append-only event and snapshot history plus the live system-state readout. It does not introduce a second store.

### 6. Safety rule

The Safety Override remains global, visible, and reachable from every station. It is rendered as the persistent red pathway at the top and the bottom and as the exit and safe-handoff route in the COR panel.

When the Safety Override is triggered, from any station:
1. Suppress the normal tool flow. Station switching and stage actions are disabled.
2. Dim the Observatory toward near-black so the scene recedes.
3. Close all station overlays.
4. Show the Safe Handoff overlay, with professional support and resources.
5. Do not continue normal navigation until the user deliberately closes the overlay, and on close, return to a safe state rather than the mid-task position.

This mirrors the global Safety Override behaviour in the main plan. The 3D layer changes the visuals of the override, never its authority.

### 7. Trap Engine boundary

The Survival Trap Engine remains text-first. It is never rendered as a 3D maze and is never folded into the Observatory. The Observatory is a Black Swan Engine view only.

A separate high-capacity review visual for the Trap Engine may be considered in the future, for example a door-audit review board used after stabilisation. That is its own future workstream. It is not Phase 6 and it is not part of the Black Swan Observatory. The caption on the reference image, "this is your cockpit, not a maze," applies to the Black Swan cockpit and is also the reason the Trap Engine keeps its own text-first surface rather than borrowing this one.

---

## Updated build-phase table

The build order is unchanged. The 3D Observatory stays at Phase 6. Only the Phase 6 row carries new detail; every other row is as in section 9 of the main plan.

| Phase | Scope | Exit criteria |
|---|---|---|
| **Phase 1** | Shared state machine, First Check, text-only Survival Mode, SafetyOverlay, append-only StateSnapshots | Danger gate routes to Safety Override from any state; First Check computes and stores a capacity band; Survival placeholder shows one templated move; every state entry writes an immutable snapshot |
| **Phase 2** | ZCFM, Immobile Constraint, Window Detection, Recovery | All Engine 1 sub-state transitions fire per section 5; two-move Recovery rule works; Compound and Immobile stay non-terminal |
| **Phase 3** | Guided Recovery Mode (the bridge) | Recovery graduates to Guided; two to three capped actions; optional mini-map renders |
| **Phase 4** | Simplified Black Swan Strategy Mode, no 3D | Seven-stage loop GATE to AUDIT, one stage at a time, routing precedence enforced |
| **Phase 5** | COR panel and export | COR is the single source of truth; PDF export reproduces the paper COR |
| **Phase 6** | Optional 3D Crisis Observatory (Black Swan Engine only) | Opt-in unlock only, gated by Strategy Mode plus stable or high capacity plus a clear Safety Override; seven stations, Black Swan Core, COR side panel; one active station at a time, inactive dimmed; forms and COR as DOM overlays; fully usable without camera navigation; the scene owns no state and reads from the store; Safety Override reachable from every station and dims to Safe Handoff |
| **Phase 7** | Testing and validation | Safety validation at 100 percent; engine and logic validation pass; beta cohort run documented |

---

## Phase 6 developer handoff prompt (future)

Use the block below only when Phases 1 to 5 are built and working. Copy and paste it into Codex or Claude Code at that time.

```
You are building Phase 6 ONLY of the Black Swan Crisis Operating System: the optional 3D Crisis Observatory.

DO NOT START YET. Phase 6 may begin only after Phases 1 to 5 are built and working: the shared state machine, the First Check, Survival Mode and its sub-states, Guided Recovery Mode, the simplified Black Swan Strategy Mode, and the COR panel with export. If any of those is incomplete, stop and say so before writing anything.

HARD CONSTRAINTS. Read first, obey exactly.
- DO NOT make 3D the default entry. The default entry is always the First Check.
- DO NOT route low-capacity or Survival Mode users into the Observatory, ever.
- DO NOT build a maze. The Black Swan metaphor is a control room and a cockpit. This is your cockpit, not a maze.
- DO NOT touch or convert the Survival Trap Engine. It stays text-first. The Observatory is a Black Swan Engine view only.
- DO NOT let the 3D scene own state. It is a read-only projection of the existing store.
- DO NOT put forms or text entry inside the WebGL canvas. All forms and the COR are accessible DOM overlays.
- DO NOT remove or weaken the global Safety Override.

BUILD EXACTLY THIS.
- An optional Observatory Mode for the Black Swan Engine, unlocked only when the user is in Strategy Mode, capacity reads stable or high, the Safety Override is clear, and the user explicitly opts in. The unlock is an offer, never an automatic launch.
- Render with React Three Fiber and Drei.
- A dark control-room scene: a central Black Swan Core showing the live cascade map and system state, seven stations ringed around it (GATE, TYPE, MAP, TARGET, PRE-COMMIT, EXECUTE, AUDIT), the Safety Override pathway visible at the top and the bottom at all times, and the Crisis Operating Record as a right-side real-time log and system-state panel.
- One active station at a time. The other six dimmed.
- A DOM control rail so the user can switch stations and operate every control without 3D navigation. The Observatory must be fully usable by someone who never moves the camera.
- Forms as accessible DOM overlays anchored to the active station. Never text entry in WebGL.
- All data read from the existing store: BlackSwanState, the Crisis Operating Record, the current stage, the safety state, the catalyst and co-catalyst, the cascade tiers, the control rating, and the loop decision. The COR stays the single source of truth. Any write goes through the existing Black Swan state machine, exactly as Strategy Mode writes. The 3D layer holds only ephemeral view state, never persisted as truth.
- Safety behaviour: the Safety Override is reachable from every station. When triggered, suppress normal tool flow, disable station switching and stage actions, dim the Observatory toward near-black, close all station overlays, and show the Safe Handoff overlay with professional support and resources. Do not resume navigation until the user deliberately closes it, and return to a safe state rather than the mid-task position.

ACCEPTANCE.
- The Observatory cannot be entered except through the four-part unlock condition above.
- A low-capacity or Survival user can never reach it.
- The scene holds no authoritative state. Deleting the entire 3D layer leaves the COR and all session data intact and the flat Strategy Mode fully functional.
- Every form is a DOM overlay. Nothing is typed into WebGL.
- The full flow works using DOM controls alone, with no camera movement.
- The Safety Override dims the scene and shows the Safe Handoff from any station, and blocks navigation until the user closes it.

When Phase 6 meets every acceptance criterion, stop and report. Do not start Phase 7 here.
```
