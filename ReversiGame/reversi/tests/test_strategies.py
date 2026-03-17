import math

from reversi.backend.engine import BLACK, Board
from reversi.backend.engine.strategies import (
    GreedyCornerStrategy,
    HybridHeuristicStrategy,
    MinimaxStrategy,
    RandomStrategy,
    evaluate,
    evaluate_breakdown,
)
from reversi.backend.engine.strategies import helpers as strategy_helpers
from reversi.backend.engine.strategies import minimax_strategy as minimax_module


def test_random_strategy_returns_legal_move():
    board = Board()
    move = RandomStrategy().choose_move(board, BLACK)
    assert move in board.legal_moves(BLACK)


def test_greedy_strategy_prefers_corner_when_available():
    board = Board()
    # Construct a simple corner-available board for black.
    board.grid = [[0 for _ in range(8)] for _ in range(8)]
    board.grid[0][1] = -1
    board.grid[0][2] = 1
    move = GreedyCornerStrategy().choose_move(board, BLACK)
    assert move == (0, 0)


def test_minimax_strategy_returns_valid_move():
    board = Board()
    move = MinimaxStrategy(depth=2).choose_move(board, BLACK)
    assert move in board.legal_moves(BLACK)


def test_greedy_strategy_randomizes_among_tied_best_moves(monkeypatch):
    board = Board()
    moves = board.legal_moves(BLACK)
    best_flips = max(len(flips) for flips in moves.values())
    tied_best_moves = {move for move, flips in moves.items() if len(flips) == best_flips}
    captured = []

    def choose_last(seq):
        options = list(seq)
        captured.append(options)
        return options[-1]

    monkeypatch.setattr(strategy_helpers.random, "choice", choose_last)

    move = GreedyCornerStrategy().choose_move(board, BLACK)

    assert len(tied_best_moves) > 1
    assert captured
    assert set(captured[-1]) == tied_best_moves
    assert move in tied_best_moves


def test_minimax_strategy_randomizes_among_tied_best_root_moves(monkeypatch):
    board = Board()
    moves = board.legal_moves(BLACK)
    scored_moves = []
    for move, flips in moves.items():
        next_board = board.clone()
        next_board.apply_move(move[0], move[1], BLACK, flips)
        score, _ = minimax_module.minimax(next_board, BLACK, 1, -math.inf, math.inf, False)
        scored_moves.append((move, score))
    best_score = max(score for _, score in scored_moves)
    tied_best_moves = {move for move, score in scored_moves if score == best_score}
    captured = []

    def choose_last(seq):
        options = list(seq)
        captured.append(options)
        return options[-1]

    monkeypatch.setattr(strategy_helpers.random, "choice", choose_last)

    move = MinimaxStrategy(depth=2).choose_move(board, BLACK)

    assert len(tied_best_moves) > 1
    assert captured
    assert set(captured[-1]) == tied_best_moves
    assert move in tied_best_moves


def test_hybrid_strategy_returns_none_when_no_legal_moves_exist():
    board = Board()
    board.grid = [[BLACK for _ in range(8)] for _ in range(8)]

    move = HybridHeuristicStrategy().choose_move(board, BLACK)

    assert move is None


def test_hybrid_strategy_returns_legal_move():
    board = Board()

    move = HybridHeuristicStrategy().choose_move(board, BLACK)

    assert move in board.legal_moves(BLACK)


def test_hybrid_strategy_randomizes_among_tied_best_moves(monkeypatch):
    board = Board()
    strategy = HybridHeuristicStrategy()
    moves = board.legal_moves(BLACK)
    scored_moves = {move: strategy._score_move(board, BLACK, move[0], move[1], flips) for move, flips in moves.items()}
    best_score = max(scored_moves.values())
    tied_best_moves = {move for move, score in scored_moves.items() if score == best_score}
    captured = []

    def choose_last(seq):
        options = list(seq)
        captured.append(options)
        return options[-1]

    monkeypatch.setattr(strategy_helpers.random, "choice", choose_last)

    move = strategy.choose_move(board, BLACK)

    assert len(tied_best_moves) > 1
    assert captured
    assert set(captured[-1]) == tied_best_moves
    assert move in tied_best_moves


def test_hybrid_strategy_prefers_corner_when_available():
    board = Board()
    # Corner is the clearly dominant tactical choice.
    board.grid = [[0 for _ in range(8)] for _ in range(8)]
    board.grid[0][1] = -1
    board.grid[0][2] = 1

    move = HybridHeuristicStrategy().choose_move(board, BLACK)

    assert move == (0, 0)


def test_hybrid_strategy_avoids_risky_square_when_safer_move_is_clearly_better():
    board = Board()
    # On this crafted board, Greedy has a tied best 2-flip choice on risky squares
    # at (1, 6) and (6, 2), while Hybrid should still prefer the safer inner move
    # at (3, 4) because its heuristic applies strong risky-square penalties.
    board.grid = [
        [0, 0, -1, -1, 0, 1, -1, -1],
        [1, 0, 0, 1, -1, -1, 0, 0],
        [-1, 0, 1, -1, 1, 1, 0, -1],
        [-1, 0, 1, 0, 0, 0, 1, 0],
        [1, 0, 0, 0, -1, 0, 0, 0],
        [1, -1, 0, 0, 1, 0, 1, 0],
        [1, -1, 0, 0, -1, 0, -1, 1],
        [0, 0, 0, 1, 0, 0, -1, 0],
    ]

    greedy_move = GreedyCornerStrategy().choose_move(board, BLACK)
    hybrid_move = HybridHeuristicStrategy().choose_move(board, BLACK)

    assert greedy_move in {(1, 6), (6, 2)}
    assert hybrid_move == (3, 4)
    assert hybrid_move in board.legal_moves(BLACK)


def test_hybrid_strategy_can_be_instantiated_with_existing_strategies():
    strategies = [
        RandomStrategy(),
        GreedyCornerStrategy(),
        HybridHeuristicStrategy(),
        MinimaxStrategy(depth=2),
    ]

    assert len(strategies) == 4


def test_hybrid_strategy_is_instantiable_from_public_engine_exports():
    from reversi.backend.engine import HybridHeuristicStrategy as ExportedHybridHeuristicStrategy

    strategy = ExportedHybridHeuristicStrategy()

    assert isinstance(strategy, HybridHeuristicStrategy)


def test_hybrid_strategy_differs_from_greedy_on_a_deterministic_board():
    board = Board()
    # Greedy randomizes across its tied 2-flip risky options; Hybrid prefers the
    # safer inner move.
    board.grid = [
        [0, 0, -1, -1, 0, 1, -1, -1],
        [1, 0, 0, 1, -1, -1, 0, 0],
        [-1, 0, 1, -1, 1, 1, 0, -1],
        [-1, 0, 1, 0, 0, 0, 1, 0],
        [1, 0, 0, 0, -1, 0, 0, 0],
        [1, -1, 0, 0, 1, 0, 1, 0],
        [1, -1, 0, 0, -1, 0, -1, 1],
        [0, 0, 0, 1, 0, 0, -1, 0],
    ]

    greedy_move = GreedyCornerStrategy().choose_move(board, BLACK)
    hybrid_move = HybridHeuristicStrategy().choose_move(board, BLACK)

    assert greedy_move in {(1, 6), (6, 2)}
    assert hybrid_move == (3, 4)
    assert greedy_move != hybrid_move


def test_evaluate_breakdown_matches_total_evaluation():
    board = Board()
    breakdown = evaluate_breakdown(board, BLACK)
    assert breakdown["total"] == breakdown["positional"] + breakdown["mobility"]
    assert breakdown["total"] == evaluate(board, BLACK)
