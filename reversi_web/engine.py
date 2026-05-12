import math
import random

# Reused core rules / constants from the terminal implementation
EMPTY, BLACK, WHITE = 0, 1, -1
COL_NAMES = "ABCDEFGH"

DIRS = [
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1),           (0, 1),
    (1, -1),  (1, 0),  (1, 1),
]

WEIGHTS = [
    [130, -30, 30, 6, 6, 30, -30, 130],
    [-30, -60, -6, -6, -6, -6, -60, -30],
    [30, -6, 15, 3, 3, 15, -6, 30],
    [6, -6, 3, 3, 3, 3, -6, 6],
    [6, -6, 3, 3, 3, 3, -6, 6],
    [30, -6, 15, 3, 3, 15, -6, 30],
    [-30, -60, -6, -6, -6, -6, -60, -30],
    [130, -30, 30, 6, 6, 30, -30, 130],
]


def opponent(player):
    return -player


def in_bounds(r, c):
    return 0 <= r < 8 and 0 <= c < 8


class Board:
    def __init__(self):
        self.grid = [[EMPTY for _ in range(8)] for _ in range(8)]
        self.grid[3][3] = WHITE
        self.grid[3][4] = BLACK
        self.grid[4][3] = BLACK
        self.grid[4][4] = WHITE

    def clone(self):
        b = Board.__new__(Board)
        b.grid = [row[:] for row in self.grid]
        return b

    def score(self):
        black = 0
        white = 0
        for r in range(8):
            for c in range(8):
                if self.grid[r][c] == BLACK:
                    black += 1
                elif self.grid[r][c] == WHITE:
                    white += 1
        return black, white

    def find_flips(self, r, c, player):
        if self.grid[r][c] != EMPTY:
            return []
        flips = []
        opp = opponent(player)
        for dr, dc in DIRS:
            path = []
            rr, cc = r + dr, c + dc
            while in_bounds(rr, cc) and self.grid[rr][cc] == opp:
                path.append((rr, cc))
                rr += dr
                cc += dc
            if path and in_bounds(rr, cc) and self.grid[rr][cc] == player:
                flips.extend(path)
        return flips

    def legal_moves(self, player):
        moves = {}
        for r in range(8):
            for c in range(8):
                flips = self.find_flips(r, c, player)
                if flips:
                    moves[(r, c)] = flips
        return moves

    def apply_move(self, r, c, player, flips):
        self.grid[r][c] = player
        for rr, cc in flips:
            self.grid[rr][cc] = player

    def game_over(self):
        return not self.legal_moves(BLACK) and not self.legal_moves(WHITE)


class Strategy:
    def choose_move(self, board, player):
        raise NotImplementedError


class RandomStrategy(Strategy):
    def choose_move(self, board, player):
        moves = board.legal_moves(player)
        if not moves:
            return None
        return random.choice(list(moves.keys()))


def corner_moves(moves):
    return [m for m in [(0, 0), (0, 7), (7, 0), (7, 7)] if m in moves]


class GreedyCornerStrategy(Strategy):
    def choose_move(self, board, player):
        moves = board.legal_moves(player)
        if not moves:
            return None
        corners = corner_moves(moves)
        if corners:
            return random.choice(corners)
        best_move = None
        best_flips = -1
        for (r, c), flips in moves.items():
            if len(flips) > best_flips:
                best_flips = len(flips)
                best_move = (r, c)
        return best_move


def evaluate(board, player):
    val = 0
    opp = opponent(player)
    for r in range(8):
        for c in range(8):
            if board.grid[r][c] == player:
                val += WEIGHTS[r][c]
            elif board.grid[r][c] == opp:
                val -= WEIGHTS[r][c]
    my_moves = len(board.legal_moves(player))
    opp_moves = len(board.legal_moves(opp))
    val += 5 * (my_moves - opp_moves)
    return val


def minimax(board, root_player, depth, alpha, beta, maximizing):
    me = root_player if maximizing else opponent(root_player)
    moves = board.legal_moves(me)

    if depth == 0 or (not moves and not board.legal_moves(opponent(me))):
        return evaluate(board, root_player), None

    best_move = None

    if not moves:
        value, _ = minimax(board, root_player, depth - 1, alpha, beta, not maximizing)
        return value, None

    if maximizing:
        value = -math.inf
        for (r, c), flips in moves.items():
            nb = board.clone()
            nb.apply_move(r, c, me, flips)
            v, _ = minimax(nb, root_player, depth - 1, alpha, beta, False)
            if v > value:
                value, best_move = v, (r, c)
            alpha = max(alpha, value)
            if beta <= alpha:
                break
        return value, best_move

    value = math.inf
    for (r, c), flips in moves.items():
        nb = board.clone()
        nb.apply_move(r, c, me, flips)
        v, _ = minimax(nb, root_player, depth - 1, alpha, beta, True)
        if v < value:
            value, best_move = v, (r, c)
        beta = min(beta, value)
        if beta <= alpha:
            break
    return value, best_move


class MinimaxStrategy(Strategy):
    def __init__(self, depth=4):
        self.depth = depth

    def choose_move(self, board, player):
        moves = board.legal_moves(player)
        if not moves:
            return None
        corners = corner_moves(moves)
        if corners:
            return random.choice(corners)
        _, move = minimax(board, player, self.depth, -math.inf, math.inf, True)
        return move


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

    def _record_move(self, player, r, c, flips):
        self.history.append(
            {
                "move_index": len(self.history) + 1,
                "player": player,
                "r": r,
                "c": c,
                "notation": self._notation(r, c),
                "flipped": len(flips),
            }
        )

    def _snapshot_from_live(self):
        return {
            "grid": [row[:] for row in self.board.grid],
            "current": self.current_player,
        }

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

    def _apply_move_internal(self, r, c):
        moves = self.board.legal_moves(self.current_player)
        flips = moves.get((r, c))
        if not flips:
            return False, "Illegal move"
        player = self.current_player
        self.board.apply_move(r, c, self.current_player, flips)
        self._record_move(player, r, c, flips)
        self._advance_turn_with_pass_logic()
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

    # Compatibility wrapper for alternate server implementations.
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
            player = self.current_player
            flips = moves[move]
            self.board.apply_move(move[0], move[1], self.current_player, flips)
            self._record_move(player, move[0], move[1], flips)
            self._advance_turn_with_pass_logic()
            self.push_snapshot()

        self._update_winner_if_finished()
