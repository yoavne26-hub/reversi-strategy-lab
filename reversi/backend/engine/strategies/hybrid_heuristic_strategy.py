from .helpers import choose_random_best
from .minimax_strategy import evaluate_breakdown


class HybridHeuristicStrategy:
    CORNER_BONUS = 1000
    X_SQUARE_PENALTY = 120
    C_SQUARE_PENALTY = 60

    def _position_type(self, r, c):
        if (r, c) in {(0, 0), (0, 7), (7, 0), (7, 7)}:
            return "corner"
        if (r, c) in {(1, 1), (1, 6), (6, 1), (6, 6)}:
            return "x_square"
        if (r, c) in {(0, 1), (1, 0), (0, 6), (1, 7), (6, 0), (7, 1), (6, 7), (7, 6)}:
            return "c_square"
        if r in {0, 7} or c in {0, 7}:
            return "edge"
        return "inner"

    def _corner_bonus(self, r, c):
        if self._position_type(r, c) == "corner":
            return self.CORNER_BONUS
        return 0

    def _risky_square_penalty(self, r, c):
        position_type = self._position_type(r, c)
        if position_type == "x_square":
            return self.X_SQUARE_PENALTY
        if position_type == "c_square":
            return self.C_SQUARE_PENALTY
        return 0

    def _score_move(self, board, player, r, c, flips):
        next_board = board.clone()
        next_board.apply_move(r, c, player, flips)
        breakdown = evaluate_breakdown(next_board, player)
        return (
            breakdown["positional"]
            + breakdown["mobility"]
            + self._corner_bonus(r, c)
            - self._risky_square_penalty(r, c)
        )

    def choose_move(self, board, player):
        moves = board.legal_moves(player)
        if not moves:
            return None

        best_move, _ = choose_random_best(
            (((r, c), self._score_move(board, player, r, c, flips)) for (r, c), flips in moves.items()),
            maximize=True,
        )
        return best_move
