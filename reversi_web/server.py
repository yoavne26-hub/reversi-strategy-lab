from flask import Flask, jsonify, render_template, request

try:
    from engine import (
        BLACK,
        WHITE,
        GameState,
        GreedyCornerStrategy,
        MinimaxStrategy,
        RandomStrategy,
    )
except ImportError:
    from reversi_web.engine import (
        BLACK,
        WHITE,
        GameState,
        GreedyCornerStrategy,
        MinimaxStrategy,
        RandomStrategy,
    )

app = Flask(__name__)
STATE = None


def state_or_404():
    global STATE
    if STATE is None:
        return None, (jsonify({"ok": False, "error": "No active game"}), 400)
    return STATE, None


def make_strategy(difficulty):
    if difficulty == "easy":
        return RandomStrategy()
    if difficulty == "medium":
        return GreedyCornerStrategy()
    if difficulty == "hard":
        return MinimaxStrategy(depth=5)
    raise ValueError("Invalid difficulty")


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/new")
def api_new():
    global STATE
    data = request.get_json(silent=True) or {}
    mode = data.get("mode", "pva")

    if mode == "pvp":
        STATE = GameState(
            human_color=BLACK,
            ai_strategy=None,
            enable_undo=bool(data.get("enable_undo", False)),
        )
        return jsonify({"ok": True, "state": STATE.as_dict()})

    if mode != "pva":
        return jsonify({"ok": False, "error": "Invalid mode"}), 400

    human_str = str(data.get("human", "black")).lower()
    if human_str not in {"black", "white"}:
        return jsonify({"ok": False, "error": "Invalid human color"}), 400
    human_color = BLACK if human_str == "black" else WHITE

    difficulty = str(data.get("difficulty", "medium")).lower()
    try:
        strategy = make_strategy(difficulty)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    STATE = GameState(human_color=human_color, ai_strategy=strategy, enable_undo=False)
    return jsonify({"ok": True, "state": STATE.as_dict()})


@app.get("/api/state")
def api_state():
    state, err = state_or_404()
    if err:
        return err
    return jsonify({"ok": True, "state": state.as_dict()})


@app.post("/api/move")
def api_move():
    state, err = state_or_404()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        r = int(data["r"])
        c = int(data["c"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"ok": False, "error": "Body must include integer r and c", "state": state.as_dict()}), 400

    if state.ai_strategy is not None and state.current_player == state.ai_color:
        return jsonify({"ok": False, "error": "It is not the human player's turn", "state": state.as_dict()}), 400
    if state.replay_mode:
        return jsonify({"ok": False, "error": "Cannot play moves in replay mode.", "state": state.as_dict()}), 400

    ok, error = state.apply_move(r, c)
    if not ok:
        return jsonify({"ok": False, "error": error, "state": state.as_dict()}), 400

    return jsonify({"ok": True, "state": state.as_dict()})

@app.post("/api/ai")
def ai_step():
    if STATE is None:
        return jsonify({"ok": False, "error": "No game."}), 400

    if STATE.ai_strategy is None:
        return jsonify({"ok": False, "error": "AI is not enabled for this game.", "state": STATE.as_dict()}), 400
    if STATE.replay_mode:
        return jsonify({"ok": False, "error": "Cannot run AI in replay mode.", "state": STATE.as_dict()}), 400

    STATE.apply_ai_if_needed()
    return jsonify({"ok": True, "state": STATE.as_dict()})


def _undo_replay_guard():
    state, err = state_or_404()
    if err:
        return None, err
    if state.ai_strategy is not None or state.as_dict().get("mode") != "pvp":
        return None, (jsonify({"ok": False, "error": "Undo/Replay is only available in Local PvP.", "state": state.as_dict()}), 400)
    if not state.enable_undo:
        return None, (jsonify({"ok": False, "error": "Undo/Replay is not enabled for this game.", "state": state.as_dict()}), 400)
    return state, None


@app.post("/api/undo")
def api_undo():
    state, err = _undo_replay_guard()
    if err:
        return err
    if state.replay_mode:
        return jsonify({"ok": False, "error": "Cannot undo while in replay mode.", "state": state.as_dict()}), 400
    ok, error = state.undo_one()
    if not ok:
        return jsonify({"ok": False, "error": error, "state": state.as_dict()}), 400
    return jsonify({"ok": True, "state": state.as_dict()})


@app.post("/api/replay/enter")
def api_replay_enter():
    state, err = _undo_replay_guard()
    if err:
        return err
    ok, error = state.enter_replay_mode()
    if not ok:
        return jsonify({"ok": False, "error": error, "state": state.as_dict()}), 400
    return jsonify({"ok": True, "state": state.as_dict()})


@app.post("/api/replay/exit")
def api_replay_exit():
    state, err = _undo_replay_guard()
    if err:
        return err
    ok, error = state.exit_replay_mode()
    if not ok:
        return jsonify({"ok": False, "error": error, "state": state.as_dict()}), 400
    return jsonify({"ok": True, "state": state.as_dict()})


@app.post("/api/replay/step")
def api_replay_step():
    state, err = _undo_replay_guard()
    if err:
        return err
    if not state.replay_mode:
        return jsonify({"ok": False, "error": "Replay mode is not active.", "state": state.as_dict()}), 400
    data = request.get_json(silent=True) or {}
    direction = data.get("dir")
    ok, error = state.step_replay(direction)
    if not ok:
        return jsonify({"ok": False, "error": error, "state": state.as_dict()}), 400
    return jsonify({"ok": True, "state": state.as_dict()})

if __name__ == "__main__":
    app.run(debug=True)
