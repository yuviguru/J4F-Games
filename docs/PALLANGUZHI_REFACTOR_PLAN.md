# CLA-5 — Pallanguzhi Refactor Plan

## Objective
Refactor the current Pallanguzhi implementation into reusable modules that can be shared across future games (for example matchmaking, leaderboards, rooms, and turn/timer orchestration), while keeping game-specific rules and UI customizable.

## Current State (What we have today)
- `games/pallanguzhi/index.html` contains **UI, state management, game rules, animations, timers, sound, room sync, reconnect handling, and result submission** in one file.
- `js/j4f-sdk.js` already provides shared platform capabilities: auth, room lifecycle, matchmaking, leaderboard, share, and user presence.

## Pain Points
- High coupling between game rules and rendering makes Pallanguzhi hard to test and reuse.
- Multiplayer orchestration logic (move submit/replay, reconnect timers, finish handling) is duplicated risk for future games.
- The game cannot be composed from a reusable base pattern; new games will likely repeat structure.

## Target Architecture
Use a **Layered + Adapter** pattern:

1. **Platform Layer** (already mostly in SDK)
   - Auth, rooms, matchmaking, leaderboard, share, presence.

2. **Reusable Game Runtime Layer** (new shared modules)
   - Match lifecycle orchestration (create/join/matchmake/leave/finish hooks)
   - Turn engine and timeout policy
   - Reconnect/forfeit policy
   - Sync adapter for room move/state events
   - Standard game events bus

3. **Game Module Layer** (per game)
   - Pure rules engine (state transition from move)
   - Game-specific serialization/deserialization of state
   - Game-specific AI policy (optional)
   - Game-specific renderer/animation/sound skin

4. **Composition Layer** (entrypoint)
   - Wires runtime + game module + SDK adapters
   - Minimal page-specific bootstrapping

## Module Extraction Candidates

### A. Extract from Pallanguzhi into shared modules
1. **TurnTimerController**
   - start/stop/reset, warning ticks, timeout callback.
2. **ReconnectForfeitController**
   - countdown, winner-by-disconnect, cancel on reconnect.
3. **OnlineMatchController**
   - handles room updates, moveId gating, local-vs-remote move flow.
4. **ResultReporter**
   - consistent leaderboard submission + room finish semantics.
5. **GameShellState**
   - generic match metadata (`mode`, `isOnline`, `playerId`, `gameOver`, etc.).

### B. Keep game-specific in Pallanguzhi module
1. Board representation (14 pits, seed distribution rules)
2. Move simulation (`compSteps`, `simMove`) and capture rules
3. AI pick logic tuned for Pallanguzhi
4. Pallanguzhi visuals/sounds/animation timings

## Recommended File/Folder Layout

```text
js/
  j4f-sdk.js
  runtime/
    game-runtime.js            # shared lifecycle API and event contracts
    turn-timer.js
    reconnect-forfeit.js
    online-match-controller.js
    result-reporter.js
games/
  pallanguzhi/
    index.html
    pallanguzhi-engine.js      # pure rules and move simulation
    pallanguzhi-renderer.js    # DOM render + animation + sounds
    pallanguzhi-game.js        # glue: runtime + engine + renderer
```

## Runtime Contract (Proposed)

```js
createGameRuntime({
  gameId,
  initialState,
  players,
  transport,        // SDK adapter for room events/moves/state
  timerPolicy,      // per-turn timeout config
  reconnectPolicy,  // disconnect grace config
  resultReporter,   // leaderboard + finish hooks
  onRender,         // render callback
  onEvent           // optional telemetry/events
})
```

Game module contract:

```js
const gameModule = {
  getInitialState(),
  getLegalMoves(state, player),
  applyMove(state, move, ctx),
  serialize(state),
  deserialize(payload),
  evaluateResult(state)
}
```

## Incremental Delivery Plan

### Phase 1 — Stabilize contracts (low risk)
- Add runtime interfaces and no-op adapters.
- Move only timer/reconnect logic into shared runtime files.
- Keep current Pallanguzhi behavior unchanged.

### Phase 2 — Extract pure game engine
- Move Pallanguzhi rule logic into `pallanguzhi-engine.js`.
- Ensure deterministic `applyMove` and result evaluation.
- Add basic engine-level unit checks (if lightweight harness is available).

### Phase 3 — Extract online orchestration
- Introduce `online-match-controller.js` with moveId and replay safety.
- Replace inline room wiring in Pallanguzhi with runtime controller.

### Phase 4 — Renderer split
- Move DOM render + animation + sound to `pallanguzhi-renderer.js`.
- Keep `index.html` as host and minimal bootstrap script.

### Phase 5 — Reuse proof with second game
- Apply runtime layer to another game prototype (e.g. Raaja Raani lobby flow).
- Validate no Pallanguzhi-specific assumptions leak into runtime modules.

## Definition of Done for CLA-5
- Pallanguzhi still behaves the same in offline, AI, room, and matchmaking flows.
- Shared runtime modules own timer, reconnect, and online match orchestration.
- Game rules are isolated in a pure game engine file.
- Another game can reuse runtime modules without copying Pallanguzhi logic.
- README/docs updated with the runtime extension pattern for future games.

## Risks and Mitigations
- **Risk:** Behavior regression during split.
  - **Mitigation:** Extract one subsystem per phase and test after each step.
- **Risk:** Over-generalized abstractions too early.
  - **Mitigation:** Design contracts from Pallanguzhi + one additional game scenario.
- **Risk:** Tight coupling to DOM in runtime.
  - **Mitigation:** Runtime should emit events/state; renderer owns DOM.

## First Implementation Slice (Suggested next coding task)
1. Add `js/runtime/turn-timer.js` and `js/runtime/reconnect-forfeit.js`.
2. Wire Pallanguzhi to these controllers without changing visuals or rules.
3. Verify:
   - turn timeout auto-move
   - reconnect grace countdown and forfeit
   - game completion still reports to leaderboard and room finish
