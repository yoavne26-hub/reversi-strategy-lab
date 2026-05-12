# API Reference

All responses are JSON and generally follow:

```json
{ "ok": true, "state": { ... } }
```

On errors:

```json
{ "ok": false, "error": "message", "state": { ...optional current state... } }
```

## `GET /`

Returns the main web UI (`index.html`).

## `POST /api/new`

Create a new game.

### PvA request

```json
{ "mode": "pva", "human": "black", "difficulty": "medium" }
```

### PvP request

```json
{ "mode": "pvp", "enable_undo": true }
```

### Notes

- `difficulty`: `easy | medium | hard`
- `enable_undo` only applies to Local PvP

## `GET /api/state`

Returns the current state.

## `POST /api/move`

Apply a move for the current player (or human in PvA).

```json
{ "r": 2, "c": 3 }
```

Errors include:

- illegal move
- out of bounds
- wrong turn (PvA)
- replay mode active

## `POST /api/ai`

Runs the AI step (PvA only).

Errors include:

- AI disabled (PvP game)
- replay mode active

## `POST /api/undo`

Undo one move (PvP + `enable_undo=true`, live mode only).

## `POST /api/replay/enter`

Enter replay mode at the latest snapshot.

## `POST /api/replay/exit`

Exit replay mode and return to the live latest snapshot.

## `POST /api/replay/step`

Step replay cursor backward or forward.

### Request

```json
{ "dir": "back" }
```

or

```json
{ "dir": "forward" }
```

## State Fields (selected)

- `grid`: 8x8 array
- `current`: `1` black, `-1` white
- `score`: `{ "black": int, "white": int }`
- `legal_moves`: `[{ "r": int, "c": int }]`
- `mode`: `pvp | pva`
- `history`: move list
- `last_move`: move object or `null`
- `enable_undo`: bool
- `can_undo`: bool
- `replay_mode`: bool
- `replay_index`: int
- `replay_total`: int

