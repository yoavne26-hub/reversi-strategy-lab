EMPTY, BLACK, WHITE = 0, 1, -1
COL_NAMES = "ABCDEFGH"

DIRS = [
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1),           (0, 1),
    (1, -1),  (1, 0),  (1, 1),
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

