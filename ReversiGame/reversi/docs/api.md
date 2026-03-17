# API Reference

This document describes the current HTTP surface for Reversi AI Lab.

The application exposes:

- page routes for the multi-page web UI
- JSON routes for live gameplay
- JSON routes for Simulation Lab benchmarking

Unless noted otherwise, API responses are JSON.

## Response Shape

Successful gameplay responses generally follow:

```json
{ "ok": true, "state": { ... } }
```

Successful Lab responses typically follow:

```json
{ "ok": true, "result": { ... } }
```

or:

```json
{ "ok": true, "job": { ... } }
```

Error responses generally follow:

```json
{ "ok": false, "error": "message" }
```

Many gameplay errors also include the current serialized `state`.

## Page Routes

### `GET /`

Returns the landing page.

### `GET /play`

Returns the main gameplay page.

### `GET /lab`

Returns the Simulation Lab page for AI-vs-AI benchmarking and comparison.

### `GET /settings`

Returns the settings/help page.

## Gameplay API

### `POST /api/new`

Creates a new game.

#### Local PvA request

```json
{ "mode": "pva", "human": "black", "difficulty": "medium" }
```

#### Local PvP request

```json
{ "mode": "pvp", "enable_undo": true }
```

#### Request notes

- `mode`: `pva | pvp`
- `human`: `black | white` for PvA only
- `difficulty`: `easy | medium | advanced | hard` for PvA only
- `enable_undo` is only meaningful for local PvP

#### Strategy mapping

- `easy` -> `RandomStrategy`
- `medium` -> `GreedyCornerStrategy`
- `advanced` -> `HybridHeuristicStrategy`
- `hard` -> `MinimaxStrategy`

### `GET /api/state`

Returns the current serialized match state.

If no active game exists, returns:

- `400` with `No active game`

### `POST /api/move`

Applies a move for the current live player.

#### Request

```json
{ "r": 2, "c": 3 }
```

#### Common errors

- missing or non-integer `r` / `c`
- no active game
- illegal move
- move while it is the AI's turn in PvA
- move attempt during replay mode

### `POST /api/ai`

Runs AI turn application for the current game.

This is only valid for PvA games with AI enabled.

#### Common errors

- no active game
- AI not enabled for this match
- replay mode active

### `POST /api/undo`

Undoes one completed move.

Only available when:

- the current game is local PvP
- undo/replay was enabled at game creation
- replay mode is not active

### `POST /api/replay/enter`

Enters replay mode at the latest snapshot.

Only available for local PvP games with undo/replay enabled.

### `POST /api/replay/exit`

Leaves replay mode and restores the latest live snapshot.

### `POST /api/replay/step`

Moves the replay cursor backward or forward.

#### Request

```json
{ "dir": "back" }
```

or

```json
{ "dir": "forward" }
```

#### Common errors

- replay mode is not active
- invalid direction
- undo/replay unavailable for the current match

## Simulation Lab API

### `POST /api/lab/benchmark`

Runs a synchronous AI-vs-AI benchmark and returns the full result when complete.

#### Request

```json
{
  "strategy_a": "medium",
  "strategy_b": "advanced",
  "num_games": 20
}
```

#### Notes

- accepted strategy names: `easy | medium | advanced | hard`
- `num_games` must be a positive integer

### `POST /api/lab/benchmark/start`

Starts an asynchronous benchmark job and returns job metadata immediately.

#### Request

```json
{
  "strategy_a": "easy",
  "strategy_b": "hard",
  "num_games": 100
}
```

#### Response shape

```json
{
  "ok": true,
  "job_id": "abc123",
  "job": {
    "job_id": "abc123",
    "status": "pending",
    "strategy_a": "easy",
    "strategy_b": "hard",
    "total_games": 100,
    "completed_games": 0,
    "started_at": null,
    "elapsed_seconds": null,
    "estimated_remaining_seconds": null,
    "progress_percent": 0.0,
    "error": null
  }
}
```

### `GET /api/lab/benchmark/status/<job_id>`

Returns current async benchmark job status.

#### Possible status values

- `pending`
- `running`
- `completed`
- `failed`

### `GET /api/lab/benchmark/result/<job_id>`

Returns the final result for a completed async benchmark job.

#### Possible errors

- `404` if the job does not exist
- `409` if the job is not complete yet
- `400` if the job failed

## Match State Contract

The serialized gameplay state contains more than just board data because the Play page supports replay, history, and post-game analytics.

### Core fields

- `grid`: 8x8 integer matrix
- `current`: current player (`1` for black, `-1` for white)
- `score`: `{ "black": int, "white": int }`
- `legal_moves`: list of `{ "r": int, "c": int }`
- `game_over`: boolean
- `winner`: `1`, `-1`, `0`, or `null`
- `mode`: `pvp | pva`
- `human_color`: player color in PvA
- `ai_color`: AI color in PvA, otherwise `null`

### History and replay fields

- `history`: move objects in chronological order
- `last_move`: last move object or `null`
- `enable_undo`: boolean
- `can_undo`: boolean
- `replay_mode`: boolean
- `replay_index`: current snapshot index
- `replay_total`: total snapshot count

### Analytics fields

- `analysis_summary`: post-game summary payload or `null` while game is still active
- `progression_metrics`: arrays used by the frontend charts and progress views

## Move History Shape

Each move entry in `history` includes gameplay and analysis data such as:

- move index and notation
- acting player
- square coordinates
- discs flipped
- score before and after
- mobility deltas
- game phase classification
- position type classification
- evaluation before and after
- move quality classification
- weighted flip and board-control metrics

This richer contract is what supports the Play page's post-game analysis views without re-running analysis in the browser.
