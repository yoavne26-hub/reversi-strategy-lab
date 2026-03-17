# Architecture

## Overview

Reversi AI Lab is structured as a Flask application with a clear split between backend game logic, HTTP route handling, and frontend presentation assets.

The project is built around three main concerns:

- `backend/engine`: authoritative Reversi rules, AI strategies, simulation utilities, and game-state orchestration
- `backend/api`: Flask blueprints for both page routes and JSON API routes
- `frontend/`: templates and static assets for the multi-page browser interface

This keeps the game rules and AI behavior in Python while the frontend stays focused on rendering, interaction, and data visualization.

## High-Level Flow

1. The app starts from the repository root through `run.py` or `wsgi.py`.
2. `reversi/backend/app.py` creates the Flask app and registers the web and API blueprints.
3. Page requests render templates from `reversi/frontend/templates`.
4. Frontend JavaScript calls JSON endpoints under `/api`.
5. The backend `GameState` remains the source of truth for live play state.
6. Simulation Lab benchmark routes use backend engine utilities to run AI-vs-AI experiments and return summary data.

## Runtime Entry

- Root `run.py`: local development entrypoint using Flask's development server
- Root `wsgi.py`: WSGI entrypoint used by Waitress in the standard launcher flow
- `play_reversi.bat`: convenience launcher that starts Waitress and opens the browser

## Application Layers

### App Layer (`backend/app.py`)

Responsible for application bootstrapping:

- configures template and static folders from `frontend/`
- creates the Flask app instance
- registers:
  - `web_bp` for page routes
  - `api_bp` for JSON endpoints

### Route Layer (`backend/api/routes.py`)

This module contains two kinds of routes.

Web routes:

- `/` for the landing page
- `/play` for the interactive game surface
- `/lab` for AI benchmarking and comparison
- `/settings` for preferences and how-to-play content

API routes:

- live game lifecycle and move execution
- undo and replay controls for local PvP
- synchronous Lab benchmarking
- asynchronous benchmark job creation, progress polling, and result retrieval

The route layer translates HTTP requests into calls on `GameState`, strategy constructors, or simulator helpers.

### Engine Layer (`backend/engine`)

The engine package is the gameplay and AI core.

- `board.py`
  - board representation
  - legal move detection
  - flip discovery
  - move application
  - score and terminal-state checks
- `game_state.py`
  - owns the active match state
  - handles turn flow and pass logic
  - coordinates human and AI turns
  - stores move history and replay snapshots
  - computes post-game analysis summaries and progression metrics
  - serializes frontend-ready state via `as_dict()`
- `simulator.py`
  - runs headless AI-vs-AI games
  - benchmarks strategies across repeated runs
  - supports progress callbacks for async job tracking
- `strategies/`
  - `RandomStrategy`
  - `GreedyCornerStrategy`
  - `HybridHeuristicStrategy`
  - `MinimaxStrategy`
  - shared evaluation helpers

## Frontend Layer (`frontend/`)

The frontend is organized as a multi-page product rather than a single-screen game.

Templates:

- `base.html`: shared shell/navigation
- `home.html`: landing page and product framing
- `play.html`: gameplay UI and post-game analysis surface
- `lab.html`: Simulation Lab workspace
- `settings.html`: preferences and help content

Static assets:

- `app.js`: gameplay interactions, board rendering, move flow, replay controls, analysis display
- `lab.js`: benchmark execution, polling, remembered-run comparison views, representative analysis
- `settings.js`: settings page behavior
- `preferences.js`: local preference persistence
- `style.css`: application-wide styling

## State Management

For live play, the backend `GameState` is the source of truth.

- the frontend sends actions to `/api`
- the backend validates and applies those actions
- the frontend re-renders from the returned serialized state

This keeps the game logic centralized and prevents browser-side rule drift.

### Serialized Match State

`GameState.as_dict()` exposes the data needed by the Play page, including:

- board grid and current player
- legal moves
- score and winner status
- mode metadata (`pvp` or `pva`)
- move history and last move
- undo and replay flags
- post-game analysis summary
- progression metrics for charts

## Undo and Replay

Undo and replay are supported for local PvP when explicitly enabled.

- snapshots are stored after each completed move
- undo removes the most recent snapshot and restores the previous one
- replay mode exposes a snapshot view instead of the live board
- move input and AI execution are blocked while replay mode is active

This design lets the same serialized state contract support both live play and historical review.

## Simulation Lab Architecture

The Lab uses the same engine package as normal gameplay but through simulation utilities rather than the live `GameState` flow.

Two benchmark patterns exist:

- synchronous benchmark execution for immediate results
- asynchronous benchmark jobs backed by in-memory job tracking

Async benchmark jobs are stored in module-level memory with a lock and updated from background worker threads. Each job tracks:

- requested strategies
- total and completed games
- status
- elapsed time
- estimated remaining time
- result payload or failure error

This enables progress polling from the browser without introducing a database or external queue.

## Design Intent

The architecture reflects the broader project goal described in the root README:

- playable game experience
- inspectable AI behavior
- analytics and benchmarking as product features, not just developer utilities

The codebase is therefore shaped less like a minimal game demo and more like a compact product with gameplay, analysis, and experimentation surfaces built on one backend engine.
