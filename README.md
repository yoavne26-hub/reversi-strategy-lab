# Reversi AI Lab

A browser-based Reversi web application built as more than a simple board-game clone.  
This project combines playable strategy gameplay, multiple AI opponents, post-game analysis, and a dedicated Simulation Lab for AI-vs-AI benchmarking and matchup comparison.

It is designed as a portfolio-quality engineering project: part strategy game, part AI sandbox, and part analytics product.

## Overview

Reversi AI Lab is a Python Flask + vanilla JavaScript application that brings several layers of the same problem space into one product:

- a clean browser-based Reversi experience
- local Player vs Player and Player vs AI gameplay
- multiple AI strategies with distinct difficulty levels
- post-game analytics and move progression charts
- a Simulation Lab for repeated headless benchmark runs
- remembered benchmark comparisons, dominance views, and pairwise matchup analysis

The result is a project that is useful from multiple angles: it can be played as a game, inspected as an AI experiment, and reviewed as a product-focused analytics interface.

## Why This Project Is Interesting

This project stands out because it does not stop at implementing Reversi correctly. It uses the game as a controlled environment for strategy comparison, simulation, and explainable analysis.

Key strengths:

- It blends game logic with AI experimentation rather than treating AI as a single opaque opponent.
- It exposes strategy behavior through measurable outputs such as benchmark summaries, remembered comparisons, and representative-game analysis.
- It includes user-facing analytics, not just engine-side calculations.
- It reflects both engineering rigor and product thinking: gameplay, analysis, and instructional UX are all treated as first-class parts of the experience.

## Feature Breakdown

### Core Gameplay

- Full browser-based Reversi play flow
- Local Player vs Player mode
- Player vs AI mode
- Legal-move handling, pass logic, score tracking, and correct game-end detection
- Move history and replay support
- Undo support where appropriate
- Multi-page app shell with dedicated Home, Play, Simulation Lab, and Settings pages

### AI & Strategy

- Multiple AI difficulty levels backed by distinct strategies:
  - Easy: `RandomStrategy`
  - Medium: `GreedyCornerStrategy`
  - Advanced: `HybridHeuristicStrategy`
  - Hard: `MinimaxStrategy`
- Strategy tie-breaking behavior that remains deterministic only when evaluation is not tied
- Headless AI-vs-AI simulation utilities for single games and repeated benchmark runs
- Fair color rotation across benchmark batches

### Post-Game Analytics

- Match summary after completed games
- Move history and replay-compatible analysis data
- Progression metrics serialized from the backend
- Post-game charting on the Play page, including:
  - board control over time
  - weighted flips over time
  - flips per move
  - flip ratio over time
- Highlight rows and compact side-average summaries for finished games

### Simulation Lab

- Benchmark runner with async progress updates
- Honest ETA estimation based on completed games
- Single-run benchmark verdicts and metric summaries
- Remembered benchmark runs stored in session memory
- Comparison graphs across remembered runs
- Dominance summary built from remembered measured results
- Pairwise matchup matrix / heatmap for measured runs only
- Representative-game breakdown for a selected remembered benchmark run
- Tooltip-supported comparison views for matrix cells and graphs

### UX / Product Polish

- Multi-page product shell instead of a single overloaded screen
- Dedicated settings and how-to-play surface
- Local preference persistence for key frontend options
- Dashboard-style Lab layout with current-run metrics, remembered comparison workspace, and drill-down analysis
- Portfolio-oriented landing page and product framing

## AI Ladder

The built-in AI ladder is meant to serve both players and analysis:

- **Easy / Random**: useful for basic play and low-pressure experimentation
- **Medium / Greedy**: focuses on immediate gain and tactical corner opportunities
- **Advanced / Hybrid**: stronger heuristic play with more strategic weighting
- **Hard / Minimax**: search-based opponent for the strongest built-in challenge

## About the Project

Strategy games are a strong sandbox for algorithms, heuristics, and evaluation logic because they create clear rules, measurable outcomes, and meaningful tradeoffs. Reversi is especially useful in that regard: positional value, mobility, timing, and local tactics all matter, which makes it a good environment for experimenting with both AI behavior and user-facing explanation.

I built this project as a way to combine several interests in one system: AI, analytics, optimization, product design, and technical clarity. The goal was not only to make the game playable, but to make the system inspectable. That meant treating benchmarks, comparison tooling, and post-game analysis as product features rather than internal developer utilities.

From a portfolio perspective, the project reflects the kind of work I am most interested in: systems that are technically rich under the hood, but still shaped around usability, interpretation, and clear product structure.

## Tech Stack

- **Python**
- **Flask**
- **Waitress**
- **HTML**
- **CSS**
- **Vanilla JavaScript**
- **pytest**
- **Custom game engine and strategy heuristics**

## Local Setup (Windows)

### Recommended Flow

1. Install **Python 3** and make sure it is added to `PATH`
2. From the project root, run:
   - `install_requirements.bat`
3. Then run:
   - `play_reversi.bat`
4. The app should open in your browser automatically at:
   - `http://127.0.0.1:5000/`

The launcher starts the application with **Waitress** in a separate terminal window. To stop the app, close the `Reversi Server` window or press `Ctrl+C` in it.

### Manual Fallback

If the batch files do not work in your environment, use the manual setup path:

```bash
python -m pip install -r requirements.txt
python -m waitress --listen=127.0.0.1:5000 wsgi:app

Then open:

```text
http://127.0.0.1:5000/
```

### Development Server Fallback

For local development only:

```bash
python run.py
```

This uses Flask's development server rather than Waitress.

## Troubleshooting

### Python is not recognized

- Reinstall Python 3 and enable **Add Python to PATH**
- Restart the terminal after installation
- Verify with:

```bash
python --version
```

If `python` is unavailable on Windows but `py` exists, the batch scripts will still try `py -3`.

### Dependencies are missing

Run:

```bash
install_requirements.bat
```

or:

```bash
python -m pip install -r requirements.txt
```

### The browser did not open automatically

The server may still be running successfully. Open this URL manually:

```text
http://127.0.0.1:5000/
```

### The port is already in use

If `127.0.0.1:5000` is busy:

- close the existing process using that port
- or run the app manually on another port by changing the Waitress command

Example:

```bash
python -m waitress --listen=127.0.0.1:5001 wsgi:app
```

Then open:

```text
http://127.0.0.1:5001/
```

### The batch file closes immediately

Open Command Prompt in the project root and run the script manually so error messages remain visible:

```bash
play_reversi.bat
```

If needed, install dependencies first:

```bash
install_requirements.bat
```

## Testing

Run the test suite with:

```bash
python -m pytest reversi/tests
```

## Project Structure

```text
reversi/
  backend/
    api/
      routes.py
    engine/
      board.py
      game_state.py
      simulator.py
      strategies/
  frontend/
    static/
      app.js
      lab.js
      preferences.js
      settings.js
      style.css
    templates/
      base.html
      home.html
      play.html
      lab.html
      settings.html
  docs/
  tests/
run.py
wsgi.py
requirements.txt
install_requirements.bat
play_reversi.bat
```

## Screenshots

### Home / Landing Page

The Home page introduces the project as more than a playable Reversi clone. It presents the app as a multi-surface product with gameplay, AI benchmarking, and analytics-oriented exploration.

![Home Landing Page](ReversiGame/assets/screenshots/home/homepage.png)

*Portfolio-style landing page with direct navigation to gameplay, simulation benchmarking, and settings.*

![Home Page Overview](ReversiGame/assets/screenshots/home/homepage2.png)

*Home page overview presenting the product structure, AI ladder, and core analytical value of the project.*

![About the Project Section](ReversiGame/assets/screenshots/home/aboutme.png)

*Project motivation section explaining the engineering, analytics, and product perspective behind the build.*

### Play Page

The Play page covers the full gameplay loop: match setup, live board interaction, move tracking, and replay support for completed games.

![Play Setup Screen](ReversiGame/assets/screenshots/play/play.png)

*Play setup screen with mode selection, side choice, and AI difficulty controls.*

![Live Gameplay Board](ReversiGame/assets/screenshots/play/gameplay.png)

*Live match view showing the board, current score, active turn, and move timeline with flip counts.*

![Replay Mode](ReversiGame/assets/screenshots/play/playreplay.png)

*Replay mode for reviewing completed matches move by move with synchronized board and timeline history.*

### Post-Game Analytics

Completed games transition into a post-game analysis surface with summary metrics and progression charts, turning each match into something that can be reviewed rather than only observed.

![Completed Match View](ReversiGame/assets/screenshots/play/playcomplete.png)

*Completed match view with final board state, replay controls, and post-game summary access.*

![Post-Game Progression Chart](ReversiGame/assets/screenshots/play/playgraph.png)

*Post-game progression chart showing board control over time across the full match.*

### Simulation Lab

The Simulation Lab turns the project into an AI experimentation workspace rather than only a playable board game. It supports repeated browser-based benchmark runs, live progress tracking, remembered comparisons, and matchup inspection tools.

![Simulation Lab Overview](ReversiGame/assets/screenshots/lab/lab.png)

*Simulation Lab overview with benchmark controls, live progress tracking, and current-run status.*

![Single Run Benchmark Results](ReversiGame/assets/screenshots/lab/singleruncompare.png)

*Single benchmark result view summarizing win rates, score differential, move count, color rotation, and interpretation notes.*

![Metric Guide Panel](ReversiGame/assets/screenshots/lab/metricguide.png)

*Built-in metric guide explaining benchmark statistics and helping users interpret matchup results.*

### Matchup Matrix / Representative Breakdown

Remembered benchmark runs can be compared side by side through summary rankings, chart views, pairwise matchup inspection, and one representative measured game per run.

![Remembered Comparison Workspace](ReversiGame/assets/screenshots/lab/multiruncompare.png)

*Remembered comparison workspace for reviewing stored benchmark runs, dominance signals, matchup matrix results, and representative-game drill-down.*

![Win Rate Comparison Chart](ReversiGame/assets/screenshots/lab/winrate.png)

*Comparison chart view showing how remembered benchmark runs differ in win-rate outcomes across strategy matchups.*

![Representative Game Breakdown](ReversiGame/assets/screenshots/lab/labgamebreakdowncontrol.png)

*Representative game breakdown with move-by-move board-control analysis from a measured benchmark run.*

### Settings & How to Play

The Settings page gives the project a more complete product surface by combining local gameplay preferences with onboarding guidance and AI difficulty explanations.

![Settings and How to Play](ReversiGame/assets/screenshots/settings/settings.png)

*Settings and onboarding page with local preferences, AI difficulty explanations, and a built-in gameplay guide.*
## Documentation

Additional project notes are available in:

- `reversi/docs/architecture.md`
- `reversi/docs/api.md`

## Future Improvements

- richer strategy presets and experimental configuration controls
- exportable benchmark summaries
- tournament or ladder mode for repeated AI competitions
- deeper visual analytics in the Lab
- persistent benchmark storage through CSV export or relational SQL database integration
- predictive modeling for estimating game outcomes based on strategy pairing and starting side
- packaged desktop-style release for easier local distribution


