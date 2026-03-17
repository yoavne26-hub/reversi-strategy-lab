import threading
import time
import uuid

from flask import Blueprint, jsonify, render_template, request

from ..engine import (
    BLACK,
    WHITE,
    benchmark_strategies,
    GameState,
    GreedyCornerStrategy,
    HybridHeuristicStrategy,
    MinimaxStrategy,
    RandomStrategy,
)

web_bp = Blueprint("web", __name__)
api_bp = Blueprint("api", __name__, url_prefix="/api")

STATE = None
LAB_BENCHMARK_JOBS = {}
LAB_BENCHMARK_LOCK = threading.Lock()


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
    if difficulty == "advanced":
        return HybridHeuristicStrategy()
    if difficulty == "hard":
        return MinimaxStrategy(depth=5)
    raise ValueError("Invalid difficulty")


def _parse_num_games(raw_value):
    try:
        num_games = int(raw_value)
    except (TypeError, ValueError):
        raise ValueError("num_games must be a positive integer") from None
    if num_games < 1:
        raise ValueError("num_games must be a positive integer")
    return num_games


def _validate_benchmark_request(data):
    strategy_a_name = str(data.get("strategy_a", "")).lower()
    strategy_b_name = str(data.get("strategy_b", "")).lower()
    num_games = _parse_num_games(data.get("num_games"))

    make_strategy(strategy_a_name)
    make_strategy(strategy_b_name)
    return strategy_a_name, strategy_b_name, num_games


def _get_benchmark_job(job_id):
    with LAB_BENCHMARK_LOCK:
        job = LAB_BENCHMARK_JOBS.get(job_id)
        return None if job is None else dict(job)


def _set_benchmark_job(job_id, **changes):
    with LAB_BENCHMARK_LOCK:
        job = LAB_BENCHMARK_JOBS.get(job_id)
        if job is None:
            return None
        job.update(changes)
        return dict(job)


def _serialize_job_status(job):
    elapsed_seconds = None
    eta_seconds = None

    if job["started_at"] is not None:
        elapsed_seconds = max(0.0, time.time() - job["started_at"])
        if job["status"] == "completed":
            eta_seconds = 0.0
        elif job["status"] == "running" and job["completed_games"] > 0 and job["completed_games"] < job["total_games"]:
            average_seconds_per_game = elapsed_seconds / job["completed_games"]
            remaining_games = job["total_games"] - job["completed_games"]
            eta_seconds = average_seconds_per_game * remaining_games

    progress_percent = 100.0 if job["total_games"] == 0 else (job["completed_games"] / job["total_games"]) * 100

    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "strategy_a": job["strategy_a"],
        "strategy_b": job["strategy_b"],
        "total_games": job["total_games"],
        "completed_games": job["completed_games"],
        "started_at": job["started_at"],
        "elapsed_seconds": elapsed_seconds,
        "estimated_remaining_seconds": eta_seconds,
        "progress_percent": progress_percent,
        "error": job["error"],
    }


def _run_benchmark_job(job_id):
    job = _get_benchmark_job(job_id)
    if job is None:
        return

    started_at = time.time()
    _set_benchmark_job(job_id, status="running", started_at=started_at)

    try:
        strategy_a = make_strategy(job["strategy_a"])
        strategy_b = make_strategy(job["strategy_b"])

        def on_progress(completed_games, total_games, _game_result):
            _set_benchmark_job(job_id, completed_games=completed_games, total_games=total_games)

        result = benchmark_strategies(
            strategy_a,
            strategy_b,
            job["total_games"],
            progress_callback=on_progress,
        )
        _set_benchmark_job(
            job_id,
            status="completed",
            completed_games=job["total_games"],
            result=result,
            finished_at=time.time(),
        )
    except Exception as exc:  # pragma: no cover - defensive path
        _set_benchmark_job(
            job_id,
            status="failed",
            error=str(exc),
            finished_at=time.time(),
        )


def _create_benchmark_job(strategy_a_name, strategy_b_name, num_games):
    job_id = uuid.uuid4().hex
    job = {
        "job_id": job_id,
        "status": "pending",
        "strategy_a": strategy_a_name,
        "strategy_b": strategy_b_name,
        "total_games": num_games,
        "completed_games": 0,
        "started_at": None,
        "finished_at": None,
        "result": None,
        "error": None,
    }
    with LAB_BENCHMARK_LOCK:
        LAB_BENCHMARK_JOBS[job_id] = job

    worker = threading.Thread(target=_run_benchmark_job, args=(job_id,), daemon=True)
    worker.start()
    return dict(job)


@web_bp.get("/")
def home():
    return render_template("home.html", page_name="home")


@web_bp.get("/play")
def play():
    return render_template("play.html", page_name="play")


@web_bp.get("/lab")
def lab():
    return render_template("lab.html", page_name="lab")


@web_bp.get("/settings")
def settings():
    return render_template("settings.html", page_name="settings")


@api_bp.post("/new")
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


@api_bp.post("/lab/benchmark")
def api_lab_benchmark():
    data = request.get_json(silent=True) or {}
    try:
        strategy_a_name, strategy_b_name, num_games = _validate_benchmark_request(data)
        strategy_a = make_strategy(strategy_a_name)
        strategy_b = make_strategy(strategy_b_name)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    result = benchmark_strategies(strategy_a, strategy_b, num_games)
    return jsonify({"ok": True, "result": result})


@api_bp.post("/lab/benchmark/start")
def api_lab_benchmark_start():
    data = request.get_json(silent=True) or {}
    try:
        strategy_a_name, strategy_b_name, num_games = _validate_benchmark_request(data)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    job = _create_benchmark_job(strategy_a_name, strategy_b_name, num_games)
    return jsonify({"ok": True, "job_id": job["job_id"], "job": _serialize_job_status(job)})


@api_bp.get("/lab/benchmark/status/<job_id>")
def api_lab_benchmark_status(job_id):
    job = _get_benchmark_job(job_id)
    if job is None:
        return jsonify({"ok": False, "error": "Benchmark job not found"}), 404
    return jsonify({"ok": True, "job": _serialize_job_status(job)})


@api_bp.get("/lab/benchmark/result/<job_id>")
def api_lab_benchmark_result(job_id):
    job = _get_benchmark_job(job_id)
    if job is None:
        return jsonify({"ok": False, "error": "Benchmark job not found"}), 404
    if job["status"] == "failed":
        return jsonify({"ok": False, "error": job["error"] or "Benchmark failed", "job": _serialize_job_status(job)}), 400
    if job["status"] != "completed":
        return jsonify({"ok": False, "error": "Benchmark is not complete yet", "job": _serialize_job_status(job)}), 409
    return jsonify({"ok": True, "result": job["result"], "job": _serialize_job_status(job)})


@api_bp.get("/state")
def api_state():
    state, err = state_or_404()
    if err:
        return err
    return jsonify({"ok": True, "state": state.as_dict()})


@api_bp.post("/move")
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


@api_bp.post("/ai")
def ai_step():
    state, err = state_or_404()
    if err:
        return err
    if state.ai_strategy is None:
        return jsonify({"ok": False, "error": "AI is not enabled for this game.", "state": state.as_dict()}), 400
    if state.replay_mode:
        return jsonify({"ok": False, "error": "Cannot run AI in replay mode.", "state": state.as_dict()}), 400

    state.apply_ai_if_needed()
    return jsonify({"ok": True, "state": state.as_dict()})


def _undo_replay_guard():
    state, err = state_or_404()
    if err:
        return None, err
    if state.ai_strategy is not None or state.as_dict().get("mode") != "pvp":
        return None, (jsonify({"ok": False, "error": "Undo/Replay is only available in Local PvP.", "state": state.as_dict()}), 400)
    if not state.enable_undo:
        return None, (jsonify({"ok": False, "error": "Undo/Replay is not enabled for this game.", "state": state.as_dict()}), 400)
    return state, None


@api_bp.post("/undo")
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


@api_bp.post("/replay/enter")
def api_replay_enter():
    state, err = _undo_replay_guard()
    if err:
        return err
    ok, error = state.enter_replay_mode()
    if not ok:
        return jsonify({"ok": False, "error": error, "state": state.as_dict()}), 400
    return jsonify({"ok": True, "state": state.as_dict()})


@api_bp.post("/replay/exit")
def api_replay_exit():
    state, err = _undo_replay_guard()
    if err:
        return err
    ok, error = state.exit_replay_mode()
    if not ok:
        return jsonify({"ok": False, "error": error, "state": state.as_dict()}), 400
    return jsonify({"ok": True, "state": state.as_dict()})


@api_bp.post("/replay/step")
def api_replay_step():
    state, err = _undo_replay_guard()
    if err:
        return err
    if not state.replay_mode:
        return jsonify({"ok": False, "error": "Replay mode is not active.", "state": state.as_dict()}), 400
    data = request.get_json(silent=True) or {}
    ok, error = state.step_replay(data.get("dir"))
    if not ok:
        return jsonify({"ok": False, "error": error, "state": state.as_dict()}), 400
    return jsonify({"ok": True, "state": state.as_dict()})
