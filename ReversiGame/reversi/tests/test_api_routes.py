import threading
import time

from reversi.backend.app import app
from reversi.backend.api import routes
from reversi.backend.engine import GreedyCornerStrategy, HybridHeuristicStrategy, MinimaxStrategy, RandomStrategy


def setup_function():
    routes.STATE = None
    routes.LAB_BENCHMARK_JOBS.clear()


def teardown_function():
    routes.STATE = None
    routes.LAB_BENCHMARK_JOBS.clear()


def _wait_for_job_status(client, job_id, expected_status, timeout=2.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        res = client.get(f"/api/lab/benchmark/status/{job_id}")
        data = res.get_json()
        if data["job"]["status"] == expected_status:
            return data["job"]
        time.sleep(0.02)
    raise AssertionError(f"Job {job_id} did not reach status {expected_status!r}")


def test_make_strategy_preserves_existing_difficulty_mappings():
    assert isinstance(routes.make_strategy("easy"), RandomStrategy)
    assert isinstance(routes.make_strategy("medium"), GreedyCornerStrategy)
    assert isinstance(routes.make_strategy("advanced"), HybridHeuristicStrategy)
    assert isinstance(routes.make_strategy("hard"), MinimaxStrategy)


def test_make_strategy_rejects_invalid_difficulty():
    try:
        routes.make_strategy("impossible")
    except ValueError as exc:
        assert str(exc) == "Invalid difficulty"
    else:
        raise AssertionError("Expected invalid difficulty to raise ValueError")


def test_api_new_accepts_advanced_difficulty():
    client = app.test_client()

    res = client.post("/api/new", json={"mode": "pva", "human": "black", "difficulty": "advanced"})
    data = res.get_json()

    assert res.status_code == 200
    assert data["ok"] is True
    assert data["state"]["mode"] == "pva"
    assert data["state"]["human_color"] == 1
    assert isinstance(routes.STATE.ai_strategy, HybridHeuristicStrategy)


def test_api_new_invalid_difficulty_still_fails():
    client = app.test_client()

    res = client.post("/api/new", json={"mode": "pva", "human": "black", "difficulty": "invalid"})
    data = res.get_json()

    assert res.status_code == 400
    assert data["ok"] is False
    assert data["error"] == "Invalid difficulty"
    assert routes.STATE is None


def test_api_lab_benchmark_accepts_valid_request():
    client = app.test_client()

    res = client.post("/api/lab/benchmark", json={"strategy_a": "medium", "strategy_b": "advanced", "num_games": 1})
    data = res.get_json()

    assert res.status_code == 200
    assert data["ok"] is True
    assert data["result"]["games_played"] == 1
    assert data["result"]["strategy_a_name"] == "GreedyCornerStrategy"
    assert data["result"]["strategy_b_name"] == "HybridHeuristicStrategy"
    assert isinstance(data["result"]["black_win_rate"], float)
    assert isinstance(data["result"]["white_win_rate"], float)
    assert data["result"]["starting_side_advantage"] == (
        data["result"]["black_win_rate"] - data["result"]["white_win_rate"]
    )
    assert data["result"]["sample_game"] is not None
    assert "progression_metrics" in data["result"]["sample_game"]
    assert "history" in data["result"]["sample_game"]


def test_api_lab_benchmark_rejects_invalid_strategy_name():
    client = app.test_client()

    res = client.post("/api/lab/benchmark", json={"strategy_a": "medium", "strategy_b": "unknown", "num_games": 4})
    data = res.get_json()

    assert res.status_code == 400
    assert data["ok"] is False
    assert data["error"] == "Invalid difficulty"


def test_api_lab_benchmark_rejects_invalid_num_games():
    client = app.test_client()

    res = client.post("/api/lab/benchmark", json={"strategy_a": "medium", "strategy_b": "advanced", "num_games": 0})
    data = res.get_json()

    assert res.status_code == 400
    assert data["ok"] is False
    assert data["error"] == "num_games must be a positive integer"


def test_api_lab_benchmark_start_accepts_valid_request():
    client = app.test_client()

    res = client.post("/api/lab/benchmark/start", json={"strategy_a": "medium", "strategy_b": "advanced", "num_games": 1})
    data = res.get_json()

    assert res.status_code == 200
    assert data["ok"] is True
    assert data["job_id"]
    assert data["job"]["strategy_a"] == "medium"
    assert data["job"]["strategy_b"] == "advanced"
    assert data["job"]["total_games"] == 1


def test_api_lab_benchmark_start_rejects_invalid_strategy():
    client = app.test_client()

    res = client.post("/api/lab/benchmark/start", json={"strategy_a": "medium", "strategy_b": "impossible", "num_games": 3})
    data = res.get_json()

    assert res.status_code == 400
    assert data["ok"] is False
    assert data["error"] == "Invalid difficulty"


def test_api_lab_benchmark_status_and_result_expose_progress(monkeypatch):
    client = app.test_client()
    progress_reached = threading.Event()
    allow_finish = threading.Event()

    def fake_benchmark(strategy_a, strategy_b, num_games, *, random_seed=None, progress_callback=None):
        if progress_callback is not None:
            progress_callback(1, num_games, {"winner": 0})
        progress_reached.set()
        allow_finish.wait(timeout=1.0)
        if progress_callback is not None:
            progress_callback(num_games, num_games, {"winner": 0})
        return {
            "games_played": num_games,
            "strategy_a_name": strategy_a.__class__.__name__,
            "strategy_b_name": strategy_b.__class__.__name__,
            "strategy_a_wins": 1,
            "strategy_b_wins": 1,
            "draws": max(0, num_games - 2),
            "average_score_diff_a_minus_b": 0.0,
            "average_move_count": 60.0,
            "strategy_a_average_score": 32.0,
            "strategy_b_average_score": 32.0,
            "strategy_a_win_rate": 0.5 if num_games else 0.0,
            "strategy_b_win_rate": 0.5 if num_games else 0.0,
            "draw_rate": 0.0,
            "black_win_rate": 0.5 if num_games else 0.0,
            "white_win_rate": 0.5 if num_games else 0.0,
            "starting_side_advantage": 0.0,
            "sample_game": {
                "winner": 0,
                "black_score": 32,
                "white_score": 32,
                "move_count": 60,
                "history": [],
                "progression_metrics": {"move_index": []},
                "analysis_summary": None,
            },
            "color_split": {
                "strategy_a_as_black": (num_games + 1) // 2,
                "strategy_a_as_white": num_games // 2,
                "strategy_b_as_black": num_games // 2,
                "strategy_b_as_white": (num_games + 1) // 2,
            },
        }

    monkeypatch.setattr(routes, "benchmark_strategies", fake_benchmark)

    start_res = client.post("/api/lab/benchmark/start", json={"strategy_a": "medium", "strategy_b": "advanced", "num_games": 2})
    start_data = start_res.get_json()
    job_id = start_data["job_id"]

    assert progress_reached.wait(timeout=1.0)

    status_res = client.get(f"/api/lab/benchmark/status/{job_id}")
    status_data = status_res.get_json()

    assert status_res.status_code == 200
    assert status_data["ok"] is True
    assert status_data["job"]["status"] == "running"
    assert status_data["job"]["completed_games"] == 1
    assert status_data["job"]["total_games"] == 2
    assert 0.0 < status_data["job"]["progress_percent"] < 100.0

    pending_result_res = client.get(f"/api/lab/benchmark/result/{job_id}")
    pending_result_data = pending_result_res.get_json()

    assert pending_result_res.status_code == 409
    assert pending_result_data["ok"] is False
    assert pending_result_data["error"] == "Benchmark is not complete yet"

    allow_finish.set()
    completed_job = _wait_for_job_status(client, job_id, "completed")
    result_res = client.get(f"/api/lab/benchmark/result/{job_id}")
    result_data = result_res.get_json()

    assert completed_job["completed_games"] == 2
    assert result_res.status_code == 200
    assert result_data["ok"] is True
    assert result_data["result"]["games_played"] == 2
    assert result_data["result"]["sample_game"]["move_count"] == 60


def test_api_lab_benchmark_failed_job_exposes_error(monkeypatch):
    client = app.test_client()

    def fake_benchmark(strategy_a, strategy_b, num_games, *, random_seed=None, progress_callback=None):
        raise RuntimeError("simulated benchmark failure")

    monkeypatch.setattr(routes, "benchmark_strategies", fake_benchmark)

    start_res = client.post("/api/lab/benchmark/start", json={"strategy_a": "medium", "strategy_b": "advanced", "num_games": 2})
    start_data = start_res.get_json()
    job_id = start_data["job_id"]

    failed_job = _wait_for_job_status(client, job_id, "failed")
    result_res = client.get(f"/api/lab/benchmark/result/{job_id}")
    result_data = result_res.get_json()

    assert failed_job["error"] == "simulated benchmark failure"
    assert result_res.status_code == 400
    assert result_data["ok"] is False
    assert result_data["error"] == "simulated benchmark failure"
