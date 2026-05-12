import random

from .board import BLACK, WHITE, Board, opponent
from .game_state import GameState


def _strategy_name(strategy):
    return strategy.__class__.__name__


def _winner_from_score(black_score, white_score):
    if black_score > white_score:
        return BLACK
    if white_score > black_score:
        return WHITE
    return 0


def simulate_game(black_strategy, white_strategy, *, board=None, current_player=BLACK, random_seed=None):
    board = Board() if board is None else board.clone()
    current_player = BLACK if current_player == BLACK else WHITE
    move_count = 0

    saved_random_state = None
    if random_seed is not None:
        saved_random_state = random.getstate()
        random.seed(random_seed)

    try:
        while True:
            moves = board.legal_moves(current_player)
            if not moves:
                other_moves = board.legal_moves(opponent(current_player))
                if not other_moves:
                    break
                current_player = opponent(current_player)
                continue

            strategy = black_strategy if current_player == BLACK else white_strategy
            move = strategy.choose_move(board.clone(), current_player)
            if move is None:
                raise ValueError(f"{_strategy_name(strategy)} returned None despite legal moves being available")
            if move not in moves:
                raise ValueError(f"{_strategy_name(strategy)} returned illegal move {move}")

            board.apply_move(move[0], move[1], current_player, moves[move])
            move_count += 1
            current_player = opponent(current_player)

        black_score, white_score = board.score()
        return {
            "winner": _winner_from_score(black_score, white_score),
            "black_score": black_score,
            "white_score": white_score,
            "move_count": move_count,
            "black_strategy": _strategy_name(black_strategy),
            "white_strategy": _strategy_name(white_strategy),
        }
    finally:
        if saved_random_state is not None:
            random.setstate(saved_random_state)


def _serialize_sample_game_state(state):
    serialized = state.as_dict()
    return {
        "winner": serialized["winner"],
        "black_score": serialized["score"]["black"],
        "white_score": serialized["score"]["white"],
        "move_count": len(serialized["history"]),
        "history": serialized["history"],
        "progression_metrics": serialized["progression_metrics"],
        "analysis_summary": serialized["analysis_summary"],
    }


def _simulate_sample_game(black_strategy, white_strategy, *, random_seed=None):
    state = GameState()
    saved_random_state = None
    if random_seed is not None:
        saved_random_state = random.getstate()
        random.seed(random_seed)

    try:
        while True:
            moves = state.board.legal_moves(state.current_player)
            if not moves:
                other_moves = state.board.legal_moves(opponent(state.current_player))
                if not other_moves:
                    break
                state.current_player = opponent(state.current_player)
                continue

            strategy = black_strategy if state.current_player == BLACK else white_strategy
            move = strategy.choose_move(state.board.clone(), state.current_player)
            if move is None:
                raise ValueError(f"{_strategy_name(strategy)} returned None despite legal moves being available")
            if move not in moves:
                raise ValueError(f"{_strategy_name(strategy)} returned illegal move {move}")

            state._apply_resolved_move(move[0], move[1], moves[move], moves)

        state._update_winner_if_finished()
        sample_game = _serialize_sample_game_state(state)
        return {
            "winner": sample_game["winner"],
            "black_score": sample_game["black_score"],
            "white_score": sample_game["white_score"],
            "move_count": sample_game["move_count"],
            "black_strategy": _strategy_name(black_strategy),
            "white_strategy": _strategy_name(white_strategy),
            "sample_game": sample_game,
        }
    finally:
        if saved_random_state is not None:
            random.setstate(saved_random_state)


def benchmark_strategies(strategy_a, strategy_b, num_games, *, random_seed=None, progress_callback=None):
    if num_games < 1:
        raise ValueError("num_games must be positive")

    result = {
        "games_played": num_games,
        "strategy_a_name": _strategy_name(strategy_a),
        "strategy_b_name": _strategy_name(strategy_b),
        "strategy_a_wins": 0,
        "strategy_b_wins": 0,
        "draws": 0,
        "average_score_diff_a_minus_b": 0.0,
        "average_move_count": 0.0,
        "strategy_a_average_score": 0.0,
        "strategy_b_average_score": 0.0,
        "strategy_a_win_rate": 0.0,
        "strategy_b_win_rate": 0.0,
        "draw_rate": 0.0,
        "black_win_rate": 0.0,
        "white_win_rate": 0.0,
        "starting_side_advantage": 0.0,
        "sample_game": None,
        "color_split": {
            "strategy_a_as_black": 0,
            "strategy_a_as_white": 0,
            "strategy_b_as_black": 0,
            "strategy_b_as_white": 0,
        },
    }
    total_score_diff = 0
    total_move_count = 0
    total_strategy_a_score = 0
    total_strategy_b_score = 0
    black_wins = 0
    white_wins = 0

    for game_index in range(num_games):
        strategy_a_is_black = game_index % 2 == 0
        black_strategy = strategy_a if strategy_a_is_black else strategy_b
        white_strategy = strategy_b if strategy_a_is_black else strategy_a
        if strategy_a_is_black:
            result["color_split"]["strategy_a_as_black"] += 1
            result["color_split"]["strategy_b_as_white"] += 1
        else:
            result["color_split"]["strategy_a_as_white"] += 1
            result["color_split"]["strategy_b_as_black"] += 1

        game_seed = None if random_seed is None else random_seed + game_index
        if game_index == 0:
            game_result = _simulate_sample_game(black_strategy, white_strategy, random_seed=game_seed)
            result["sample_game"] = game_result["sample_game"]
        else:
            game_result = simulate_game(black_strategy, white_strategy, random_seed=game_seed)

        strategy_a_score = game_result["black_score"] if strategy_a_is_black else game_result["white_score"]
        strategy_b_score = game_result["white_score"] if strategy_a_is_black else game_result["black_score"]
        total_score_diff += strategy_a_score - strategy_b_score
        total_move_count += game_result["move_count"]
        total_strategy_a_score += strategy_a_score
        total_strategy_b_score += strategy_b_score

        if game_result["winner"] == 0:
            result["draws"] += 1
        else:
            if game_result["winner"] == BLACK:
                black_wins += 1
            elif game_result["winner"] == WHITE:
                white_wins += 1

            if (game_result["winner"] == BLACK and strategy_a_is_black) or (
                game_result["winner"] == WHITE and not strategy_a_is_black
            ):
                result["strategy_a_wins"] += 1
            else:
                result["strategy_b_wins"] += 1

        if progress_callback is not None:
            progress_callback(game_index + 1, num_games, game_result)

    if num_games > 0:
        result["average_score_diff_a_minus_b"] = total_score_diff / num_games
        result["average_move_count"] = total_move_count / num_games
        result["strategy_a_average_score"] = total_strategy_a_score / num_games
        result["strategy_b_average_score"] = total_strategy_b_score / num_games
        result["strategy_a_win_rate"] = result["strategy_a_wins"] / num_games
        result["strategy_b_win_rate"] = result["strategy_b_wins"] / num_games
        result["draw_rate"] = result["draws"] / num_games
        result["black_win_rate"] = black_wins / num_games
        result["white_win_rate"] = white_wins / num_games
        result["starting_side_advantage"] = result["black_win_rate"] - result["white_win_rate"]

    return result
