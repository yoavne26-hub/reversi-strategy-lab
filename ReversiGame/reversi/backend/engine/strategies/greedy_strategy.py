import random

from .helpers import choose_random_best


def corner_moves(moves):
    return [m for m in [(0, 0), (0, 7), (7, 0), (7, 7)] if m in moves]


class GreedyCornerStrategy:
    def choose_move(self, board, player):
        moves = board.legal_moves(player)
        if not moves:
            return None
        corners = corner_moves(moves)
        if corners:
            return random.choice(corners)
        best_move, _ = choose_random_best(
            ((move, len(flips)) for move, flips in moves.items()),
            maximize=True,
        )
        return best_move
