from .board import BLACK, WHITE, Board, COL_NAMES, in_bounds, opponent
from .strategies import evaluate_breakdown
from .strategies.minimax_strategy import WEIGHTS


class GameState:
    def __init__(self, human_color=BLACK, ai_strategy=None, enable_undo=False):
        self.board = Board()
        self.current_player = BLACK
        self.human_color = human_color
        self.ai_color = opponent(human_color) if ai_strategy is not None else None
        self.ai_strategy = ai_strategy
        self.enable_undo = bool(enable_undo) and ai_strategy is None
        self.winner = None
        self.history = []
        self.snapshots = []
        self.replay_mode = False
        self.replay_index = 0
        self._update_winner_if_finished()
        self.push_snapshot()

    def _notation(self, r, c):
        return f"{COL_NAMES[c]}{r + 1}"

    def _score_dict(self):
        black, white = self.board.score()
        return {"black": black, "white": white}

    def _classify_position_type(self, r, c):
        if (r, c) in {(0, 0), (0, 7), (7, 0), (7, 7)}:
            return "corner"
        if (r, c) in {(1, 1), (1, 6), (6, 1), (6, 6)}:
            return "x_square"
        if (r, c) in {(0, 1), (1, 0), (0, 6), (1, 7), (6, 0), (7, 1), (6, 7), (7, 6)}:
            return "c_square"
        if r in {0, 7} or c in {0, 7}:
            return "edge"
        return "inner"

    def _classify_game_phase(self, total_discs):
        if total_discs <= 20:
            return "opening"
        if total_discs <= 50:
            return "midgame"
        return "endgame"

    def _classify_move_quality(self, evaluation_delta):
        if evaluation_delta >= 15:
            return "excellent"
        if evaluation_delta >= 5:
            return "good"
        if evaluation_delta >= -4:
            return "neutral"
        if evaluation_delta >= -14:
            return "inaccuracy"
        return "mistake"

    def _is_corner_square(self, r, c):
        return (r, c) in {(0, 0), (0, 7), (7, 0), (7, 7)}

    def _is_edge_square(self, r, c):
        return r in {0, 7} or c in {0, 7}

    def _evaluation_breakdown_for_player(self, player):
        breakdown = evaluate_breakdown(self.board, player)
        return {
            "positional": int(breakdown["positional"]),
            "mobility": int(breakdown["mobility"]),
            "total": int(breakdown["total"]),
        }

    def _weighted_square_value(self, r, c):
        return WEIGHTS[r][c]

    def _weighted_flipped_value(self, flips):
        return sum(self._weighted_square_value(r, c) for r, c in flips)

    def _weighted_board_control_ratios(self):
        black_weight = 0
        white_weight = 0
        for r in range(8):
            for c in range(8):
                if self.board.grid[r][c] == BLACK:
                    black_weight += self._weighted_square_value(r, c)
                elif self.board.grid[r][c] == WHITE:
                    white_weight += self._weighted_square_value(r, c)
        total_weight = black_weight + white_weight
        if total_weight == 0:
            return 0.0, 0.0
        return black_weight / total_weight, white_weight / total_weight

    def _compact_summary_move(self, move):
        return {
            "move_index": move["move_index"],
            "player": move["player"],
            "notation": move["notation"],
            "evaluation_delta": move["evaluation_delta"],
            "move_quality": move["move_quality"],
            "position_type": move["position_type"],
            "game_phase": move["game_phase"],
            "flipped": move["flipped"],
        }

    def _empty_player_summary(self):
        return {
            "moves": 0,
            "corners_taken": 0,
            "edge_moves": 0,
            "risky_square_moves": 0,
            "opponent_passes_forced": 0,
            "average_flips": 0.0,
            "move_quality_counts": {
                "excellent": 0,
                "good": 0,
                "neutral": 0,
                "inaccuracy": 0,
                "mistake": 0,
            },
        }

    def _build_analysis_summary_from_history(self, history):
        players = {
            "black": self._empty_player_summary(),
            "white": self._empty_player_summary(),
        }
        flip_totals = {"black": 0, "white": 0}

        for move in history:
            player_key = "black" if move["player"] == BLACK else "white"
            player_summary = players[player_key]
            player_summary["moves"] += 1
            player_summary["corners_taken"] += int(move["is_corner_move"])
            player_summary["edge_moves"] += int(move["is_edge_move"])
            player_summary["risky_square_moves"] += int(move["is_risky_square"])
            player_summary["opponent_passes_forced"] += int(move["caused_opponent_pass"])
            player_summary["move_quality_counts"][move["move_quality"]] += 1
            flip_totals[player_key] += move["flipped"]

        for player_key, player_summary in players.items():
            moves = player_summary["moves"]
            player_summary["average_flips"] = 0.0 if moves == 0 else flip_totals[player_key] / moves

        total_moves = len(history)
        average_flips_per_move = 0.0 if total_moves == 0 else sum(move["flipped"] for move in history) / total_moves
        biggest_positive = max(history, key=lambda move: move["evaluation_delta"], default=None)
        biggest_negative = min(history, key=lambda move: move["evaluation_delta"], default=None)

        return {
            "total_moves": total_moves,
            "average_flips_per_move": average_flips_per_move,
            "biggest_positive_swing_move": None if biggest_positive is None else self._compact_summary_move(biggest_positive),
            "biggest_negative_swing_move": None if biggest_negative is None else self._compact_summary_move(biggest_negative),
            "players": players,
        }

    def _empty_progression_metrics(self):
        return {
            "move_index": [],
            "flipped_discs_by_player": {"black": [], "white": []},
            "weighted_flipped_value_by_player": {"black": [], "white": []},
            "board_control": {"black": [], "white": []},
            "weighted_board_control": {"black": [], "white": []},
            "flip_ratio_to_board_by_player": {"black": [], "white": []},
        }

    def _build_progression_metrics_from_history(self, history):
        progression = self._empty_progression_metrics()

        for move in history:
            is_black_move = move["player"] == BLACK
            black_score = move["score_after"]["black"]
            white_score = move["score_after"]["white"]
            total_discs = black_score + white_score
            black_control = 0.0 if total_discs == 0 else black_score / total_discs
            white_control = 0.0 if total_discs == 0 else white_score / total_discs
            progression["move_index"].append(move["move_index"])
            progression["flipped_discs_by_player"]["black"].append(move["flipped"] if is_black_move else 0)
            progression["flipped_discs_by_player"]["white"].append(move["flipped"] if not is_black_move else 0)
            progression["weighted_flipped_value_by_player"]["black"].append(move["weighted_flipped_value"] if is_black_move else 0)
            progression["weighted_flipped_value_by_player"]["white"].append(move["weighted_flipped_value"] if not is_black_move else 0)
            progression["board_control"]["black"].append(black_control)
            progression["board_control"]["white"].append(white_control)
            progression["weighted_board_control"]["black"].append(move["weighted_board_control_black"])
            progression["weighted_board_control"]["white"].append(move["weighted_board_control_white"])
            progression["flip_ratio_to_board_by_player"]["black"].append(move["flip_ratio_to_board"] if is_black_move else 0.0)
            progression["flip_ratio_to_board_by_player"]["white"].append(move["flip_ratio_to_board"] if not is_black_move else 0.0)

        return progression

    def build_analysis_summary(self):
        if not self.board.game_over():
            return None
        return self._build_analysis_summary_from_history(self.history)

    def _record_move(
        self,
        player,
        r,
        c,
        flips,
        *,
        score_before,
        score_after,
        legal_moves_before,
        legal_moves_after,
        opponent_legal_moves_after,
        mobility_delta,
        opponent_mobility_delta,
        position_type,
        game_phase,
        evaluation_before,
        evaluation_after,
        evaluation_delta,
        evaluation_breakdown_before,
        evaluation_breakdown_after,
        move_quality,
        caused_opponent_pass,
        is_corner_move,
        is_edge_move,
        is_risky_square,
        flip_ratio_to_board,
        weighted_flipped_value,
        weighted_board_control_black,
        weighted_board_control_white,
    ):
        move = {
            "move_index": len(self.history) + 1,
            "player": player,
            "r": r,
            "c": c,
            "notation": self._notation(r, c),
            "flipped": len(flips),
        }
        move.update(
            {
                "score_before": score_before,
                "score_after": score_after,
                "legal_moves_before": legal_moves_before,
                "legal_moves_after": legal_moves_after,
                "opponent_legal_moves_after": opponent_legal_moves_after,
                "mobility_delta": mobility_delta,
                "opponent_mobility_delta": opponent_mobility_delta,
                "position_type": position_type,
                "game_phase": game_phase,
                "evaluation_before": evaluation_before,
                "evaluation_after": evaluation_after,
                "evaluation_delta": evaluation_delta,
                "evaluation_breakdown_before": evaluation_breakdown_before,
                "evaluation_breakdown_after": evaluation_breakdown_after,
                "move_quality": move_quality,
                "caused_opponent_pass": caused_opponent_pass,
                "is_corner_move": is_corner_move,
                "is_edge_move": is_edge_move,
                "is_risky_square": is_risky_square,
                "flip_ratio_to_board": flip_ratio_to_board,
                "weighted_flipped_value": weighted_flipped_value,
                "weighted_board_control_black": weighted_board_control_black,
                "weighted_board_control_white": weighted_board_control_white,
            }
        )
        self.history.append(move)

    def _snapshot_from_live(self):
        return {"grid": [row[:] for row in self.board.grid], "current": self.current_player}

    def push_snapshot(self):
        self.snapshots.append(self._snapshot_from_live())
        self.replay_index = len(self.snapshots) - 1

    def _restore_live_from_snapshot(self, snapshot):
        self.board.grid = [row[:] for row in snapshot["grid"]]
        self.current_player = snapshot["current"]
        self._update_winner_if_finished()

    def restore_snapshot(self, index):
        if not (0 <= index < len(self.snapshots)):
            return False
        self._restore_live_from_snapshot(self.snapshots[index])
        self.replay_index = index
        return True

    def can_undo(self):
        return self.enable_undo and not self.replay_mode and len(self.snapshots) > 1

    def undo_one(self):
        if not self.can_undo():
            return False, "Undo is not available"
        self.snapshots.pop()
        if self.history:
            self.history.pop()
        self.restore_snapshot(len(self.snapshots) - 1)
        return True, None

    def enter_replay_mode(self):
        if not self.enable_undo:
            return False, "Undo/Replay is not enabled"
        self.replay_mode = True
        self.replay_index = len(self.snapshots) - 1
        return True, None

    def exit_replay_mode(self):
        if not self.enable_undo:
            return False, "Undo/Replay is not enabled"
        self.replay_mode = False
        self.replay_index = len(self.snapshots) - 1
        return True, None

    def step_replay(self, direction):
        if not self.enable_undo:
            return False, "Undo/Replay is not enabled"
        if not self.replay_mode:
            return False, "Replay mode is not active"
        if direction == "back":
            self.replay_index = max(0, self.replay_index - 1)
            return True, None
        if direction == "forward":
            self.replay_index = min(len(self.snapshots) - 1, self.replay_index + 1)
            return True, None
        return False, "Invalid replay direction"

    def _update_winner_if_finished(self):
        if not self.board.game_over():
            self.winner = None
            return
        b, w = self.board.score()
        if b > w:
            self.winner = BLACK
        elif w > b:
            self.winner = WHITE
        else:
            self.winner = 0

    def _advance_turn_with_pass_logic(self):
        self.current_player = opponent(self.current_player)
        while True:
            self._update_winner_if_finished()
            if self.winner is not None:
                return
            if self.board.legal_moves(self.current_player):
                return
            self.current_player = opponent(self.current_player)

    def _apply_resolved_move(self, r, c, flips, legal_moves):
        player = self.current_player
        score_before = self._score_dict()
        evaluation_breakdown_before = self._evaluation_breakdown_for_player(player)
        evaluation_before = evaluation_breakdown_before["total"]
        opponent_legal_moves_before = len(self.board.legal_moves(opponent(player)))
        legal_moves_before = len(legal_moves)
        total_discs_before = score_before["black"] + score_before["white"]
        position_type = self._classify_position_type(r, c)
        game_phase = self._classify_game_phase(total_discs_before)
        is_corner_move = self._is_corner_square(r, c)
        is_edge_move = self._is_edge_square(r, c)
        is_risky_square = position_type in {"x_square", "c_square"}

        self.board.apply_move(r, c, player, flips)
        score_after = self._score_dict()
        total_discs_after = score_after["black"] + score_after["white"]
        self._advance_turn_with_pass_logic()
        evaluation_breakdown_after = self._evaluation_breakdown_for_player(player)
        evaluation_after = evaluation_breakdown_after["total"]

        next_player_legal_moves = self.board.legal_moves(self.current_player)
        legal_moves_after = len(next_player_legal_moves)
        caused_opponent_pass = self.current_player == player and self.winner is None
        if self.current_player == player:
            opponent_legal_moves_after = legal_moves_after
        else:
            opponent_legal_moves_after = len(self.board.legal_moves(player))
        mobility_delta = opponent_legal_moves_after - legal_moves_before
        opponent_mobility_delta = legal_moves_after - opponent_legal_moves_before
        evaluation_delta = evaluation_after - evaluation_before
        move_quality = self._classify_move_quality(evaluation_delta)
        flip_ratio_to_board = 0.0 if total_discs_after == 0 else len(flips) / total_discs_after
        weighted_flipped_value = self._weighted_flipped_value(flips)
        weighted_board_control_black, weighted_board_control_white = self._weighted_board_control_ratios()

        self._record_move(
            player,
            r,
            c,
            flips,
            score_before=score_before,
            score_after=score_after,
            legal_moves_before=legal_moves_before,
            legal_moves_after=legal_moves_after,
            opponent_legal_moves_after=opponent_legal_moves_after,
            mobility_delta=mobility_delta,
            opponent_mobility_delta=opponent_mobility_delta,
            position_type=position_type,
            game_phase=game_phase,
            evaluation_before=evaluation_before,
            evaluation_after=evaluation_after,
            evaluation_delta=evaluation_delta,
            evaluation_breakdown_before=evaluation_breakdown_before,
            evaluation_breakdown_after=evaluation_breakdown_after,
            move_quality=move_quality,
            caused_opponent_pass=caused_opponent_pass,
            is_corner_move=is_corner_move,
            is_edge_move=is_edge_move,
            is_risky_square=is_risky_square,
            flip_ratio_to_board=flip_ratio_to_board,
            weighted_flipped_value=weighted_flipped_value,
            weighted_board_control_black=weighted_board_control_black,
            weighted_board_control_white=weighted_board_control_white,
        )

    def _apply_move_internal(self, r, c):
        moves = self.board.legal_moves(self.current_player)
        flips = moves.get((r, c))
        if not flips:
            return False, "Illegal move"
        self._apply_resolved_move(r, c, flips, moves)
        return True, None

    def _make_board_from_grid(self, grid):
        b = Board.__new__(Board)
        b.grid = [row[:] for row in grid]
        return b

    def as_dict(self):
        if self.replay_mode and self.snapshots:
            snap = self.snapshots[self.replay_index]
            view_board = self._make_board_from_grid(snap["grid"])
            view_current = snap["current"]
            view_winner = None
            if view_board.game_over():
                b_score, w_score = view_board.score()
                if b_score > w_score:
                    view_winner = BLACK
                elif w_score > b_score:
                    view_winner = WHITE
                else:
                    view_winner = 0
            history = [move.copy() for move in self.history[: self.replay_index]]
        else:
            view_board = self.board
            view_current = self.current_player
            view_winner = self.winner
            history = [move.copy() for move in self.history]

        black, white = view_board.score()
        legal = view_board.legal_moves(view_current)
        game_over = view_board.game_over()
        last_move = history[-1] if history else None
        analysis_summary = self._build_analysis_summary_from_history(history) if game_over else None
        progression_metrics = self._build_progression_metrics_from_history(history)
        return {
            "grid": [row[:] for row in view_board.grid],
            "current": view_current,
            "score": {"black": black, "white": white},
            "legal_moves": [{"r": r, "c": c} for (r, c) in legal.keys()],
            "game_over": game_over,
            "human_color": self.human_color,
            "ai_color": self.ai_color,
            "mode": "pva" if self.ai_strategy is not None else "pvp",
            "winner": view_winner,
            "history": history,
            "last_move": last_move,
            "analysis_summary": analysis_summary,
            "progression_metrics": progression_metrics,
            "enable_undo": self.enable_undo,
            "can_undo": self.can_undo(),
            "replay_mode": self.replay_mode,
            "replay_index": self.replay_index,
            "replay_total": len(self.snapshots),
        }

    def apply_move(self, r, c):
        if self.replay_mode:
            return False, "Cannot play moves in replay mode."
        if self.board.game_over():
            return False, "Game is already over"
        if not in_bounds(r, c):
            return False, "Move out of bounds"
        ok, error = self._apply_move_internal(r, c)
        if ok:
            self.push_snapshot()
        return ok, error

    def apply_human_move(self, r, c):
        if self.replay_mode:
            return {"ok": False, "error": "Cannot play moves in replay mode."}
        if self.ai_strategy is not None and self.ai_color is not None and self.current_player == self.ai_color:
            return {"ok": False, "error": "It is not the human player's turn"}
        ok, error = self.apply_move(r, c)
        if not ok:
            return {"ok": False, "error": error}
        self.apply_ai_if_needed()
        return {"ok": True}

    def apply_ai_if_needed(self):
        while (
            self.ai_strategy is not None
            and self.ai_color is not None
            and not self.board.game_over()
            and self.current_player == self.ai_color
        ):
            moves = self.board.legal_moves(self.current_player)
            if not moves:
                if not self.board.legal_moves(opponent(self.current_player)):
                    self._update_winner_if_finished()
                    return
                self.current_player = opponent(self.current_player)
                continue
            move = self.ai_strategy.choose_move(self.board, self.current_player)
            if move is None or move not in moves:
                move = next(iter(moves.keys()))
            flips = moves[move]
            self._apply_resolved_move(move[0], move[1], flips, moves)
            self.push_snapshot()
        self._update_winner_if_finished()
