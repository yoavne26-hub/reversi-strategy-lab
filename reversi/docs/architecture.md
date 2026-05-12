# Architecture

## Overview

The project is split into three primary layers:

- `backend/engine`: core game rules, board operations, AI, and `GameState`
- `backend/api`: Flask route handlers and HTTP API contract
- `frontend/`: browser UI assets (HTML/CSS/JS)

This separation keeps the game rules authoritative in Python while the frontend remains a thin rendering/input layer.

## Layers

### Engine Layer (`backend/engine`)

- `board.py`
  - board grid representation
  - legal move detection
  - flip discovery and move application
  - score and game-over checks
- `game_state.py`
  - active game orchestration
  - current player and pass logic
  - AI turn application
  - move history
  - undo snapshots
  - replay cursor/state
  - JSON serialization (`as_dict`)
- `strategies/`
  - pluggable AI strategies (`Random`, `GreedyCorner`, `Minimax`)

### API Layer (`backend/api/routes.py`)

Defines all web routes and translates HTTP requests into `GameState` operations.

- Web route: `/`
- API routes:
  - `/api/new`
  - `/api/state`
  - `/api/move`
  - `/api/ai`
  - `/api/undo`
  - `/api/replay/enter`
  - `/api/replay/exit`
  - `/api/replay/step`

### Frontend Layer (`frontend/`)

- `templates/index.html`: Home + Game screen layout
- `static/app.js`: UI state rendering, API calls, animations, replay controls
- `static/style.css`: styling, layout, animations, overlays

## State Management

The backend `GameState` is the source of truth.

- Frontend requests state updates through API calls.
- Frontend renders the returned JSON state.
- Replay mode is server-driven: `as_dict()` returns the snapshot view, not the live board.

## Undo / Replay System

`GameState` stores snapshots (`grid` + `current player`) after each completed move.

- `snapshots[0]` is the initial board
- Undo pops one snapshot and restores the previous one
- Replay mode uses `replay_index` to select which snapshot is exposed through `as_dict()`
- Moves are blocked while replay mode is active

## Runtime Entry

- `run.py` imports `backend.app.app` and starts Flask in debug mode for local development.

