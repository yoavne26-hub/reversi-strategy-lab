# Agents Guide

This file gives future coding agents project-specific context for Reversi AI Lab and the planned move from a local portfolio app to an online deployment on Render.

## Project Snapshot

Reversi AI Lab is a Python Flask web app with a vanilla JavaScript frontend. It includes playable Reversi, several AI strategies, post-game analytics, and a Simulation Lab for AI-vs-AI benchmarks.

Primary app path:

- `wsgi.py` exposes `app` for production servers.
- `run.py` starts Flask debug mode for local development only.
- `reversi/backend/app.py` creates the Flask app and wires templates/static folders.
- `reversi/backend/api/routes.py` owns web routes, API routes, active game state, and Simulation Lab benchmark jobs.
- `reversi/backend/engine/` owns board rules, game state, simulation, and strategies.
- `reversi/frontend/templates/` contains Jinja pages.
- `reversi/frontend/static/` contains CSS and vanilla JS.
- `reversi/tests/` contains pytest coverage.

Legacy or older code also exists:

- `ReversiOOP.py`
- `reversi_web/`

Treat the `reversi/` package plus root `wsgi.py`, `run.py`, and `requirements.txt` as the current application unless the user explicitly asks to work on legacy files.

## Local Commands

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Run tests:

```bash
python -m pytest reversi/tests
```

Run local production-like server:

```bash
python -m waitress --listen=127.0.0.1:5000 wsgi:app
```

Run local development server:

```bash
python run.py
```

Windows helper scripts are available for local use only:

- `install_requirements.bat`
- `play_reversi.bat`

Do not rely on `.bat` files for Render or Linux deployment.

## Render Deployment Target

The current app is closest to a Render Web Service running Python.

Recommended Render settings:

- Environment: `Python`
- Build command: `python -m pip install -r requirements.txt`
- Start command: `gunicorn --bind 0.0.0.0:$PORT wsgi:app`
- Root directory: repository root
- No separate static build step is currently required because Flask serves `reversi/frontend/static`.

Important Render constraints:

- Bind to `0.0.0.0:$PORT`, not `127.0.0.1:5000`.
- Do not use Flask debug mode in production.
- Do not assume local files or process memory survive deploys, restarts, or free-tier sleep.
- Keep secrets/configuration in Render environment variables, not committed files.

## Online Deployment State

The current backend uses per-browser-session game IDs backed by module-level process memory:

- `GAMES` maps a Flask session `game_id` to a `GameState`.
- `LAB_BENCHMARK_JOBS` stores Simulation Lab async jobs.
- Benchmark jobs run in background daemon threads.

This prevents different visitors on one Render instance from overwriting each other's games, which is suitable for a demo deployment. Before treating the Render deployment as durable, multi-instance, or fully production-grade, replace process memory with external storage.

Recommended migration direction:

- Use Flask sessions or a server-side session store for per-user active game state.
- Use Redis, a database, or another external store for benchmark job state.
- Move long-running benchmark work to a proper worker/queue if benchmark runs can become expensive.
- Add cleanup/expiration for stored games and benchmark results.
- Keep benchmark limits conservative for Render CPU and memory.

Until those changes exist, document the deployed app as a single-process portfolio demo rather than a durable multi-user service.

## Coding Guidelines

- Keep game rules authoritative in `reversi/backend/engine`.
- Keep HTTP request/response behavior in `reversi/backend/api/routes.py`.
- Keep frontend state rendering and interactions in the existing vanilla JS files.
- Prefer small, focused changes over broad rewrites.
- Preserve existing route names and JSON response shapes unless updating tests and frontend callers together.
- Add or update tests when changing engine behavior, route contracts, benchmark behavior, or user-visible game flow.
- Avoid adding heavyweight frontend frameworks unless the user explicitly asks for a frontend rewrite.

## Test Expectations

Run the focused suite after backend or route changes:

```bash
python -m pytest reversi/tests
```

When changing only documentation, tests are optional. If tests are not run, say so in the final response.

## Render Readiness Checklist

Before deployment:

- Confirm `requirements.txt` includes all runtime dependencies.
- Confirm `wsgi.py` imports `reversi.backend.app:app`.
- Confirm the Render start command uses Gunicorn and `$PORT`.
- Verify local production-like startup with Waitress.
- Run the pytest suite.
- Check that templates and static files load through Flask from `reversi/frontend`.

Before presenting the app as fully online-ready:

- Remove or redesign module-level game state for multi-user use.
- Replace in-memory benchmark job tracking if persistence matters.
- Add production error handling/logging where useful.
- Add README deployment instructions or `render.yaml` if the user wants one-click deploy configuration.
