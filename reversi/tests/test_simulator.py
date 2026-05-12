import pytest

from reversi.backend.engine import (
    BLACK,
    WHITE,
    Board,
    GreedyCornerStrategy,
    HybridHeuristicStrategy,
    RandomStrategy,
    benchmark_strategies,
    simulate_game,
)


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


class FirstLegalStrategy:
    def choose_move(self, board, player):
        moves = board.legal_moves(player)
        if not moves:
            return None
        return sorted(moves.keys())[0]


class NoneStrategy:
    def choose_move(self, board, player):
        return None


class IllegalMoveStrategy:
    def choose_move(self, board, player):
        return (0, 0)


def test_simulate_game_completes_full_game_and_returns_result_fields():
    result = simulate_game(HybridHeuristicStrategy(), HybridHeuristicStrategy())

    assert set(result.keys()) == {
        "winner",
        "black_score",
        "white_score",
        "move_count",
        "black_strategy",
        "white_strategy",
    }
    assert result["winner"] in {BLACK, WHITE, 0}
    assert result["move_count"] >= 0
    total_discs = result["black_score"] + result["white_score"]
    assert 4 <= total_discs <= 64
    assert result["black_strategy"] == "HybridHeuristicStrategy"
    assert result["white_strategy"] == "HybridHeuristicStrategy"


def test_simulate_game_handles_pass_scenarios_without_crashing():
    board = Board()
    board.grid = [row[:] for row in PASS_SCENARIO_GRID]

    result = simulate_game(FirstLegalStrategy(), FirstLegalStrategy(), board=board, current_player=WHITE)

    assert result["winner"] in {BLACK, WHITE, 0}
    assert result["move_count"] > 0


def test_simulate_game_raises_when_strategy_returns_none_with_legal_moves():
    with pytest.raises(ValueError, match="returned None despite legal moves being available"):
        simulate_game(NoneStrategy(), FirstLegalStrategy())


def test_simulate_game_raises_when_strategy_returns_illegal_move():
    with pytest.raises(ValueError, match="returned illegal move"):
        simulate_game(IllegalMoveStrategy(), FirstLegalStrategy())


def test_benchmark_strategies_runs_multiple_games_and_returns_aggregate_fields():
    result = benchmark_strategies(RandomStrategy(), GreedyCornerStrategy(), 4, random_seed=7)

    assert set(result.keys()) == {
        "games_played",
        "strategy_a_name",
        "strategy_b_name",
        "strategy_a_wins",
        "strategy_b_wins",
        "draws",
        "average_score_diff_a_minus_b",
        "average_move_count",
        "strategy_a_average_score",
        "strategy_b_average_score",
        "strategy_a_win_rate",
        "strategy_b_win_rate",
        "draw_rate",
        "black_win_rate",
        "white_win_rate",
        "starting_side_advantage",
        "sample_game",
        "color_split",
    }
    assert result["games_played"] == 4
    assert result["strategy_a_name"] == "RandomStrategy"
    assert result["strategy_b_name"] == "GreedyCornerStrategy"
    assert result["strategy_a_wins"] + result["strategy_b_wins"] + result["draws"] == result["games_played"]
    assert isinstance(result["average_score_diff_a_minus_b"], float)
    assert isinstance(result["average_move_count"], float)
    assert isinstance(result["strategy_a_average_score"], float)
    assert isinstance(result["strategy_b_average_score"], float)
    assert isinstance(result["strategy_a_win_rate"], float)
    assert isinstance(result["strategy_b_win_rate"], float)
    assert isinstance(result["draw_rate"], float)
    assert isinstance(result["black_win_rate"], float)
    assert isinstance(result["white_win_rate"], float)
    assert isinstance(result["starting_side_advantage"], float)
    assert 0.0 <= result["strategy_a_win_rate"] <= 1.0
    assert 0.0 <= result["strategy_b_win_rate"] <= 1.0
    assert 0.0 <= result["draw_rate"] <= 1.0
    assert 0.0 <= result["black_win_rate"] <= 1.0
    assert 0.0 <= result["white_win_rate"] <= 1.0
    assert result["average_move_count"] >= 0.0
    assert result["strategy_a_average_score"] >= 0.0
    assert result["strategy_b_average_score"] >= 0.0
    assert pytest.approx(
        result["strategy_a_win_rate"] + result["strategy_b_win_rate"] + result["draw_rate"]
    ) == 1.0
    assert pytest.approx(result["black_win_rate"] + result["white_win_rate"] + result["draw_rate"]) == 1.0
    assert result["starting_side_advantage"] == pytest.approx(result["black_win_rate"] - result["white_win_rate"])
    assert result["sample_game"] is not None
    assert set(result["sample_game"].keys()) == {
        "winner",
        "black_score",
        "white_score",
        "move_count",
        "history",
        "progression_metrics",
        "analysis_summary",
    }
    assert result["sample_game"]["winner"] in {BLACK, WHITE, 0}
    assert result["sample_game"]["move_count"] == len(result["sample_game"]["history"])
    assert result["sample_game"]["progression_metrics"]["move_index"]
    assert result["color_split"] == {
        "strategy_a_as_black": 2,
        "strategy_a_as_white": 2,
        "strategy_b_as_black": 2,
        "strategy_b_as_white": 2,
    }


def test_benchmark_strategies_balances_colors_with_odd_game_count():
    result = benchmark_strategies(GreedyCornerStrategy(), HybridHeuristicStrategy(), 5)

    assert result["games_played"] == 5
    assert result["color_split"]["strategy_a_as_black"] == 3
    assert result["color_split"]["strategy_a_as_white"] == 2
    assert result["color_split"]["strategy_b_as_black"] == 2
    assert result["color_split"]["strategy_b_as_white"] == 3
    assert result["strategy_a_wins"] + result["strategy_b_wins"] + result["draws"] == 5
    assert pytest.approx(
        result["strategy_a_win_rate"] + result["strategy_b_win_rate"] + result["draw_rate"]
    ) == 1.0
    assert pytest.approx(result["black_win_rate"] + result["white_win_rate"] + result["draw_rate"]) == 1.0
    assert result["starting_side_advantage"] == pytest.approx(result["black_win_rate"] - result["white_win_rate"])


def test_benchmark_strategies_accepts_single_game():
    result = benchmark_strategies(RandomStrategy(), GreedyCornerStrategy(), 1, random_seed=5)

    assert result["games_played"] == 1
    assert result["strategy_a_wins"] + result["strategy_b_wins"] + result["draws"] == 1
    assert 0.0 <= result["strategy_a_win_rate"] <= 1.0
    assert 0.0 <= result["strategy_b_win_rate"] <= 1.0
    assert 0.0 <= result["draw_rate"] <= 1.0
    assert 0.0 <= result["black_win_rate"] <= 1.0
    assert 0.0 <= result["white_win_rate"] <= 1.0
    assert result["sample_game"] is not None
    assert result["sample_game"]["move_count"] == len(result["sample_game"]["history"])


def test_benchmark_strategies_rejects_zero_or_negative_game_count():
    with pytest.raises(ValueError, match="num_games must be positive"):
        benchmark_strategies(RandomStrategy(), GreedyCornerStrategy(), 0)

    with pytest.raises(ValueError, match="num_games must be positive"):
        benchmark_strategies(RandomStrategy(), GreedyCornerStrategy(), -1)
