import pytest

from reversi.backend.engine import BLACK, WHITE, GameState


REQUIRED_MOVE_FIELDS = {
    "move_index",
    "player",
    "r",
    "c",
    "notation",
    "flipped",
    "score_before",
    "score_after",
    "legal_moves_before",
    "legal_moves_after",
    "opponent_legal_moves_after",
    "mobility_delta",
    "opponent_mobility_delta",
    "position_type",
    "game_phase",
    "evaluation_before",
    "evaluation_after",
    "evaluation_delta",
    "evaluation_breakdown_before",
    "evaluation_breakdown_after",
    "move_quality",
    "caused_opponent_pass",
    "is_corner_move",
    "is_edge_move",
    "is_risky_square",
    "flip_ratio_to_board",
    "weighted_flipped_value",
    "weighted_board_control_black",
    "weighted_board_control_white",
}


PASS_SCENARIO_GRID = [
    [-1, 1, 1, 1, 0, 1, 0, 0],
    [-1, 1, 1, 1, 1, 1, 1, 1],
    [-1, -1, -1, 1, 1, -1, -1, 1],
    [-1, -1, -1, 1, -1, 1, -1, 1],
    [-1, 1, -1, 1, 1, -1, 1, 1],
    [1, 1, 1, -1, 1, -1, -1, 1],
    [0, 0, 1, 1, 1, 1, 1, -1],
    [0, 0, -1, 0, 1, -1, 0, 1],
]

GAME_OVER_SCENARIO_GRID = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, -1, -1, -1, 0, 1, 1, 1],
    [1, -1, -1, -1, -1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, -1, -1],
    [1, 1, -1, 1, 1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, 1, -1],
    [-1, -1, -1, -1, -1, 1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1],
]

FINAL_GAME_OVER_GRID = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, -1, -1, -1, -1, 1, 1, 1],
    [1, -1, -1, -1, -1, -1, 1, 1],
    [1, 1, 1, 1, 1, 1, -1, -1],
    [1, 1, -1, 1, 1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, 1, -1],
    [-1, -1, -1, -1, -1, 1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1],
]


class FixedMoveStrategy:
    def __init__(self, move):
        self.move = move

    def choose_move(self, board, player):
        return self.move


def make_history_move(move_index, player, notation, flipped, evaluation_delta, move_quality, position_type, game_phase,
                      *, is_corner_move=False, is_edge_move=False, is_risky_square=False, caused_opponent_pass=False):
    return {
        "move_index": move_index,
        "player": player,
        "r": 0,
        "c": 0,
        "notation": notation,
        "flipped": flipped,
        "score_before": {"black": 2, "white": 2},
        "score_after": {"black": 2, "white": 2},
        "legal_moves_before": 0,
        "legal_moves_after": 0,
        "opponent_legal_moves_after": 0,
        "mobility_delta": 0,
        "opponent_mobility_delta": 0,
        "position_type": position_type,
        "game_phase": game_phase,
        "evaluation_before": 0,
        "evaluation_after": evaluation_delta,
        "evaluation_delta": evaluation_delta,
        "evaluation_breakdown_before": {"positional": 0, "mobility": 0, "total": 0},
        "evaluation_breakdown_after": {"positional": evaluation_delta, "mobility": 0, "total": evaluation_delta},
        "move_quality": move_quality,
        "caused_opponent_pass": caused_opponent_pass,
        "is_corner_move": is_corner_move,
        "is_edge_move": is_edge_move,
        "is_risky_square": is_risky_square,
        "flip_ratio_to_board": 0.0,
        "weighted_flipped_value": 0,
        "weighted_board_control_black": 0.0,
        "weighted_board_control_white": 0.0,
    }


def assert_evaluation_fields(move):
    assert isinstance(move["evaluation_before"], int)
    assert isinstance(move["evaluation_after"], int)
    assert isinstance(move["evaluation_delta"], int)
    assert move["evaluation_delta"] == move["evaluation_after"] - move["evaluation_before"]


def assert_evaluation_breakdown_fields(move):
    for key in ("evaluation_breakdown_before", "evaluation_breakdown_after"):
        breakdown = move[key]
        assert set(breakdown.keys()) == {"positional", "mobility", "total"}
        assert isinstance(breakdown["positional"], int)
        assert isinstance(breakdown["mobility"], int)
        assert isinstance(breakdown["total"], int)
        assert breakdown["total"] == breakdown["positional"] + breakdown["mobility"]

    assert move["evaluation_before"] == move["evaluation_breakdown_before"]["total"]
    assert move["evaluation_after"] == move["evaluation_breakdown_after"]["total"]


def assert_move_quality(move):
    assert move["move_quality"] in {
        "excellent",
        "good",
        "neutral",
        "inaccuracy",
        "mistake",
    }


def assert_tactical_flags(move):
    assert isinstance(move["caused_opponent_pass"], bool)
    assert isinstance(move["is_corner_move"], bool)
    assert isinstance(move["is_edge_move"], bool)
    assert isinstance(move["is_risky_square"], bool)


def assert_advanced_move_metrics(move):
    assert isinstance(move["flip_ratio_to_board"], float)
    assert isinstance(move["weighted_flipped_value"], int)
    assert isinstance(move["weighted_board_control_black"], float)
    assert isinstance(move["weighted_board_control_white"], float)


def assert_progression_metrics(view):
    progression = view["progression_metrics"]
    assert set(progression.keys()) == {
        "move_index",
        "flipped_discs_by_player",
        "weighted_flipped_value_by_player",
        "board_control",
        "weighted_board_control",
        "flip_ratio_to_board_by_player",
    }

    move_count = len(progression["move_index"])

    for key in ("black", "white"):
        assert len(progression["flipped_discs_by_player"][key]) == move_count
        assert len(progression["weighted_flipped_value_by_player"][key]) == move_count
        assert len(progression["board_control"][key]) == move_count
        assert len(progression["weighted_board_control"][key]) == move_count
        assert len(progression["flip_ratio_to_board_by_player"][key]) == move_count


def test_move_history_records_analytics_fields():
    state = GameState(ai_strategy=None)

    ok, err = state.apply_move(2, 3)

    assert ok and err is None
    view = state.as_dict()
    move = view["history"][-1]
    assert set(move.keys()) == REQUIRED_MOVE_FIELDS
    assert move == {
        "move_index": 1,
        "player": BLACK,
        "r": 2,
        "c": 3,
        "notation": "D3",
        "flipped": 1,
        "score_before": {"black": 2, "white": 2},
        "score_after": {"black": 4, "white": 1},
        "legal_moves_before": 4,
        "legal_moves_after": 3,
        "opponent_legal_moves_after": 3,
        "mobility_delta": -1,
        "opponent_mobility_delta": -1,
        "position_type": "inner",
        "game_phase": "opening",
        "evaluation_before": 0,
        "evaluation_after": 9,
        "evaluation_delta": 9,
        "evaluation_breakdown_before": {"positional": 0, "mobility": 0, "total": 0},
        "evaluation_breakdown_after": {"positional": 9, "mobility": 0, "total": 9},
        "move_quality": "good",
        "caused_opponent_pass": False,
        "is_corner_move": False,
        "is_edge_move": False,
        "is_risky_square": False,
        "flip_ratio_to_board": 0.2,
        "weighted_flipped_value": 3,
        "weighted_board_control_black": 0.8,
        "weighted_board_control_white": 0.2,
    }
    assert view["last_move"] == move
    assert_tactical_flags(move)
    assert_advanced_move_metrics(move)
    assert move["caused_opponent_pass"] is False
    assert move["is_corner_move"] is False
    assert move["is_edge_move"] is False
    assert move["is_risky_square"] is False
    assert_progression_metrics(view)
    assert view["progression_metrics"] == {
        "move_index": [1],
        "flipped_discs_by_player": {"black": [1], "white": [0]},
        "weighted_flipped_value_by_player": {"black": [3], "white": [0]},
        "board_control": {"black": [0.8], "white": [0.2]},
        "weighted_board_control": {"black": [0.8], "white": [0.2]},
        "flip_ratio_to_board_by_player": {"black": [0.2], "white": [0.0]},
    }


def test_turn_switches_after_move():
    state = GameState(ai_strategy=None)
    ok, err = state.apply_move(2, 3)
    assert ok and err is None
    assert state.current_player == -BLACK


def test_analysis_summary_is_none_before_game_over():
    state = GameState(ai_strategy=None)

    view = state.as_dict()

    assert view["analysis_summary"] is None
    assert_progression_metrics(view)
    assert view["progression_metrics"] == {
        "move_index": [],
        "flipped_discs_by_player": {"black": [], "white": []},
        "weighted_flipped_value_by_player": {"black": [], "white": []},
        "board_control": {"black": [], "white": []},
        "weighted_board_control": {"black": [], "white": []},
        "flip_ratio_to_board_by_player": {"black": [], "white": []},
    }
    assert state.build_analysis_summary() is None


def test_pva_human_and_ai_moves_store_analytics():
    state = GameState(ai_strategy=FixedMoveStrategy((2, 2)))

    result = state.apply_human_move(2, 3)

    assert result == {"ok": True}
    view = state.as_dict()
    history = view["history"]
    assert len(history) == 2
    assert set(history[0].keys()) == REQUIRED_MOVE_FIELDS
    assert set(history[1].keys()) == REQUIRED_MOVE_FIELDS
    assert_evaluation_fields(history[0])
    assert_evaluation_fields(history[1])
    assert_evaluation_breakdown_fields(history[0])
    assert_evaluation_breakdown_fields(history[1])
    assert_move_quality(history[0])
    assert_move_quality(history[1])
    assert_tactical_flags(history[0])
    assert_tactical_flags(history[1])
    assert_advanced_move_metrics(history[0])
    assert_advanced_move_metrics(history[1])
    assert history[0]["score_after"] == {"black": 4, "white": 1}
    assert history[0]["flip_ratio_to_board"] == pytest.approx(0.2)
    assert history[0]["weighted_flipped_value"] == 3
    assert history[0]["weighted_board_control_black"] == pytest.approx(0.8)
    assert history[0]["weighted_board_control_white"] == pytest.approx(0.2)
    assert history[1]["player"] == WHITE
    assert history[1]["score_before"] == {"black": 4, "white": 1}
    assert history[1]["score_after"] == {"black": 3, "white": 3}
    assert history[1]["legal_moves_before"] == 3
    assert history[1]["legal_moves_after"] == 4
    assert history[1]["opponent_legal_moves_after"] == 5
    assert history[1]["mobility_delta"] == 2
    assert history[1]["opponent_mobility_delta"] == 1
    assert history[1]["position_type"] == "inner"
    assert history[1]["game_phase"] == "opening"
    assert history[1]["caused_opponent_pass"] is False
    assert history[1]["is_corner_move"] is False
    assert history[1]["is_edge_move"] is False
    assert history[1]["is_risky_square"] is False
    assert history[1]["flip_ratio_to_board"] == pytest.approx(1 / 6)
    assert history[1]["weighted_flipped_value"] == 3
    assert history[1]["weighted_board_control_black"] == pytest.approx(0.3)
    assert history[1]["weighted_board_control_white"] == pytest.approx(0.7)
    assert view["last_move"] == history[1]
    assert_progression_metrics(view)
    assert view["progression_metrics"] == {
        "move_index": [1, 2],
        "flipped_discs_by_player": {"black": [1, 0], "white": [0, 1]},
        "weighted_flipped_value_by_player": {"black": [3, 0], "white": [0, 3]},
        "board_control": {"black": [0.8, 0.5], "white": [0.2, 0.5]},
        "weighted_board_control": {"black": [0.8, 0.3], "white": [0.2, 0.7]},
        "flip_ratio_to_board_by_player": {"black": [0.2, 0.0], "white": [0.0, pytest.approx(1 / 6)]},
    }


def test_analysis_summary_aggregates_completed_game_history():
    state = GameState(ai_strategy=None)
    state.board.grid = [row[:] for row in FINAL_GAME_OVER_GRID]
    state.current_player = BLACK
    state.history = [
        make_history_move(1, BLACK, "A1", 2, 10, "good", "corner", "opening", is_corner_move=True, is_edge_move=True),
        make_history_move(2, WHITE, "B1", 4, -6, "inaccuracy", "c_square", "opening", is_edge_move=True, is_risky_square=True, caused_opponent_pass=True),
        make_history_move(3, BLACK, "A4", 3, 10, "good", "edge", "midgame", is_edge_move=True),
        make_history_move(4, WHITE, "B2", 2, -20, "mistake", "x_square", "endgame", is_risky_square=True),
    ]
    state._update_winner_if_finished()

    summary = state.build_analysis_summary()
    view_summary = state.as_dict()["analysis_summary"]

    assert summary == view_summary
    assert summary["total_moves"] == 4
    assert summary["average_flips_per_move"] == 2.75
    assert summary["biggest_positive_swing_move"] == {
        "move_index": 1,
        "player": BLACK,
        "notation": "A1",
        "evaluation_delta": 10,
        "move_quality": "good",
        "position_type": "corner",
        "game_phase": "opening",
        "flipped": 2,
    }
    assert summary["biggest_negative_swing_move"] == {
        "move_index": 4,
        "player": WHITE,
        "notation": "B2",
        "evaluation_delta": -20,
        "move_quality": "mistake",
        "position_type": "x_square",
        "game_phase": "endgame",
        "flipped": 2,
    }

    black = summary["players"]["black"]
    white = summary["players"]["white"]
    assert black["moves"] == 2
    assert black["corners_taken"] == 1
    assert black["edge_moves"] == 2
    assert black["risky_square_moves"] == 0
    assert black["opponent_passes_forced"] == 0
    assert black["average_flips"] == 2.5
    assert black["move_quality_counts"] == {
        "excellent": 0,
        "good": 2,
        "neutral": 0,
        "inaccuracy": 0,
        "mistake": 0,
    }

    assert white["moves"] == 2
    assert white["corners_taken"] == 0
    assert white["edge_moves"] == 1
    assert white["risky_square_moves"] == 2
    assert white["opponent_passes_forced"] == 1
    assert white["average_flips"] == 3.0
    assert white["move_quality_counts"] == {
        "excellent": 0,
        "good": 0,
        "neutral": 0,
        "inaccuracy": 1,
        "mistake": 1,
    }
    assert sum(black["move_quality_counts"].values()) == black["moves"]
    assert sum(white["move_quality_counts"].values()) == white["moves"]


def test_undo_restores_previous_snapshot():
    state = GameState(ai_strategy=None, enable_undo=True)
    state.apply_move(2, 3)
    state.apply_move(2, 2)
    assert len(state.snapshots) == 3
    ok, err = state.undo_one()
    assert ok and err is None
    assert len(state.snapshots) == 2
    view = state.as_dict()
    assert view["replay_mode"] is False
    assert view["score"] == {"black": 4, "white": 1}
    assert len(view["history"]) == 1
    assert set(view["last_move"].keys()) == REQUIRED_MOVE_FIELDS
    assert_evaluation_fields(view["last_move"])
    assert_evaluation_breakdown_fields(view["last_move"])
    assert_move_quality(view["last_move"])
    assert_tactical_flags(view["last_move"])
    assert_advanced_move_metrics(view["last_move"])
    assert view["last_move"]["score_after"] == {"black": 4, "white": 1}
    assert_progression_metrics(view)
    assert view["progression_metrics"]["move_index"] == [1]


def test_analysis_summary_handles_empty_history_defensively():
    state = GameState(ai_strategy=None)
    state.board.grid = [row[:] for row in FINAL_GAME_OVER_GRID]
    state.current_player = BLACK
    state.history = []
    state._update_winner_if_finished()

    summary = state.build_analysis_summary()

    assert summary["total_moves"] == 0
    assert summary["average_flips_per_move"] == 0.0
    assert summary["biggest_positive_swing_move"] is None
    assert summary["biggest_negative_swing_move"] is None
    assert summary["players"]["black"]["moves"] == 0
    assert summary["players"]["white"]["moves"] == 0
    assert summary["players"]["black"]["average_flips"] == 0.0
    assert summary["players"]["white"]["average_flips"] == 0.0


def test_replay_mode_blocks_moves_and_steps_snapshots():
    state = GameState(ai_strategy=None, enable_undo=True)
    state.apply_move(2, 3)
    state.apply_move(2, 2)
    ok, _ = state.enter_replay_mode()
    assert ok
    assert state.as_dict()["replay_mode"] is True
    ok, _ = state.step_replay("back")
    assert ok
    view = state.as_dict()
    assert view["replay_index"] == 1
    assert len(view["history"]) == 1
    assert set(view["last_move"].keys()) == REQUIRED_MOVE_FIELDS
    assert_evaluation_fields(view["last_move"])
    assert_evaluation_breakdown_fields(view["last_move"])
    assert_move_quality(view["last_move"])
    assert_tactical_flags(view["last_move"])
    assert_advanced_move_metrics(view["last_move"])
    assert view["last_move"]["score_after"] == {"black": 4, "white": 1}
    assert_progression_metrics(view)
    assert view["progression_metrics"]["move_index"] == [1]
    ok, error = state.apply_move(4, 5)
    assert not ok
    assert "replay mode" in error.lower()
    ok, _ = state.exit_replay_mode()
    assert ok
    assert state.as_dict()["replay_mode"] is False


def test_analysis_summary_respects_replay_view():
    state = GameState(ai_strategy=None, enable_undo=True)
    initial = GameState(ai_strategy=None)._snapshot_from_live()
    state.history = [
        make_history_move(1, WHITE, "E2", 1, 24, "excellent", "inner", "endgame"),
    ]
    state.snapshots = [
        initial,
        {"grid": [row[:] for row in FINAL_GAME_OVER_GRID], "current": BLACK},
    ]
    state.board.grid = [row[:] for row in FINAL_GAME_OVER_GRID]
    state.current_player = BLACK
    state._update_winner_if_finished()

    ok, _ = state.enter_replay_mode()
    assert ok

    final_view = state.as_dict()
    assert final_view["analysis_summary"] is not None
    assert final_view["analysis_summary"]["total_moves"] == 1
    assert_progression_metrics(final_view)
    assert final_view["progression_metrics"]["move_index"] == [1]

    ok, _ = state.step_replay("back")
    assert ok
    replay_view = state.as_dict()
    assert replay_view["analysis_summary"] is None
    assert_progression_metrics(replay_view)
    assert replay_view["progression_metrics"]["move_index"] == []


def test_pass_turn_move_records_post_pass_legal_moves():
    state = GameState(ai_strategy=None, enable_undo=True)
    state.board.grid = [row[:] for row in PASS_SCENARIO_GRID]
    state.current_player = WHITE
    state.history = []
    state.snapshots = [state._snapshot_from_live()]
    state.replay_mode = False
    state.replay_index = 0
    state._update_winner_if_finished()

    ok, err = state.apply_move(7, 6)

    assert ok and err is None
    assert state.current_player == WHITE
    move = state.as_dict()["history"][-1]
    assert set(move.keys()) == REQUIRED_MOVE_FIELDS
    assert_evaluation_fields(move)
    assert_evaluation_breakdown_fields(move)
    assert_move_quality(move)
    assert_tactical_flags(move)
    assert_advanced_move_metrics(move)
    assert move["score_before"] == {"black": 34, "white": 21}
    assert move["score_after"] == {"black": 30, "white": 26}
    assert move["legal_moves_before"] == 8
    assert move["legal_moves_after"] == 7
    assert move["opponent_legal_moves_after"] == 7
    assert move["mobility_delta"] == -1
    assert move["opponent_mobility_delta"] == 6
    assert move["position_type"] == "c_square"
    assert move["game_phase"] == "endgame"
    assert move["caused_opponent_pass"] is True
    assert move["is_corner_move"] is False
    assert move["is_edge_move"] is True
    assert move["is_risky_square"] is True
    assert move["flip_ratio_to_board"] == pytest.approx(4 / 56)
    assert move["weighted_flipped_value"] == -60
    assert move["weighted_board_control_black"] == pytest.approx(0.4563106796)
    assert move["weighted_board_control_white"] == pytest.approx(0.5436893204)


def test_game_over_move_does_not_record_opponent_pass():
    state = GameState(ai_strategy=None, enable_undo=True)
    state.board.grid = [row[:] for row in GAME_OVER_SCENARIO_GRID]
    state.current_player = WHITE
    state.history = []
    state.snapshots = [state._snapshot_from_live()]
    state.replay_mode = False
    state.replay_index = 0
    state._update_winner_if_finished()

    ok, err = state.apply_move(1, 4)

    assert ok and err is None
    assert state.winner == WHITE
    move = state.as_dict()["history"][-1]
    assert_tactical_flags(move)
    assert_advanced_move_metrics(move)
    assert move["legal_moves_after"] == 0
    assert move["opponent_legal_moves_after"] == 0
    assert move["caused_opponent_pass"] is False


def test_tactical_square_flags_cover_boundaries():
    state = GameState(ai_strategy=None)

    assert state._is_corner_square(0, 0) is True
    assert state._is_edge_square(0, 0) is True
    assert state._classify_position_type(0, 0) == "corner"
    assert (state._classify_position_type(0, 0) in {"x_square", "c_square"}) is False

    assert state._is_corner_square(0, 3) is False
    assert state._is_edge_square(0, 3) is True
    assert state._classify_position_type(0, 3) == "edge"
    assert (state._classify_position_type(0, 3) in {"x_square", "c_square"}) is False

    assert state._is_corner_square(1, 1) is False
    assert state._is_edge_square(1, 1) is False
    assert state._classify_position_type(1, 1) == "x_square"
    assert (state._classify_position_type(1, 1) in {"x_square", "c_square"}) is True

    assert state._is_corner_square(0, 1) is False
    assert state._is_edge_square(0, 1) is True
    assert state._classify_position_type(0, 1) == "c_square"
    assert (state._classify_position_type(0, 1) in {"x_square", "c_square"}) is True


def test_position_type_and_game_phase_classifiers_cover_boundaries():
    state = GameState(ai_strategy=None)

    assert state._classify_position_type(0, 0) == "corner"
    assert state._classify_position_type(0, 3) == "edge"
    assert state._classify_position_type(1, 1) == "x_square"
    assert state._classify_position_type(7, 6) == "c_square"
    assert state._classify_position_type(3, 3) == "inner"

    assert state._classify_game_phase(20) == "opening"
    assert state._classify_game_phase(21) == "midgame"
    assert state._classify_game_phase(50) == "midgame"
    assert state._classify_game_phase(51) == "endgame"


def test_move_quality_thresholds_cover_boundaries():
    state = GameState(ai_strategy=None)

    assert state._classify_move_quality(15) == "excellent"
    assert state._classify_move_quality(14) == "good"
    assert state._classify_move_quality(5) == "good"
    assert state._classify_move_quality(4) == "neutral"
    assert state._classify_move_quality(0) == "neutral"
    assert state._classify_move_quality(-4) == "neutral"
    assert state._classify_move_quality(-5) == "inaccuracy"
    assert state._classify_move_quality(-14) == "inaccuracy"
    assert state._classify_move_quality(-15) == "mistake"
