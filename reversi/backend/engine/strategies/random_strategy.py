import random


class RandomStrategy:
    def choose_move(self, board, player):
        moves = board.legal_moves(player)
        if not moves:
            return None
        return random.choice(list(moves.keys()))

