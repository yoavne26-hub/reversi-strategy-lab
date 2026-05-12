# Reversi Web App

A polished browser-based Reversi (Othello) game built with Flask + vanilla JavaScript, with Python-based game logic and AI.

## Features

- Local PvP and PvA modes
- AI difficulties: Random / Greedy / Minimax
- Move history timeline
- Last-move highlight
- Undo + Replay mode (optional, Local PvP)
- Win celebration modal
- Animated discs and flips

## Project Structure

```text
reversi/
  backend/
    api/
    engine/
  frontend/
    templates/
    static/
  tests/
  docs/
  run.py
```

## Run

### Development

```bash
pip install -r requirements.txt
python run.py
```

Open `http://127.0.0.1:5000/`.

### WSGI (Waitress)

```bash
pip install -r requirements.txt
python -m waitress --listen=127.0.0.1:5000 wsgi:app
```

If you run from the repository root, use the root `wsgi.py`. If running from inside `reversi/`, prefer `python ..\\run.py` from Windows shells.

## Test

```bash
pytest
```

See `docs/architecture.md` and `docs/api.md` for details.
