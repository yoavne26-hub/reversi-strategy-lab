# reversi_oop.py
# Console Reversi (Othello) in Python: PvP and AI (Random / Greedy / Hybrid / Minimax)

import random
import math

# Board pieces
EMPTY, BLACK, WHITE = 0, 1, -1

# Directions (8-neighborhood)
DIRS = [(-1,-1), (-1,0), (-1,1),
        (0,-1),          (0,1),
        (1,-1),  (1,0),  (1,1)]

# Column names: a..h
COL_NAMES = "abcdefgh"

def opponent(player):
    return -player

def in_bounds(r, c):
    return 0 <= r < 8 and 0 <= c < 8

# Positional weights for AI heuristics
WEIGHTS = [
    [130, -30, 30,  6,  6, 30, -30, 130],
    [-30, -60, -6, -6, -6, -6, -60, -30],
    [ 30,  -6, 15,  3,  3, 15,  -6,  30],
    [  6,  -6,  3,  3,  3,  3,  -6,   6],
    [  6,  -6,  3,  3,  3,  3,  -6,   6],
    [ 30,  -6, 15,  3,  3, 15,  -6,  30],
    [-30, -60, -6, -6, -6, -6, -60, -30],
    [130, -30, 30,  6,  6, 30, -30, 130],
]

# ---------------- Board ----------------

class Board:
    def __init__(self):
        # create 8x8 grid with EMPTY squares
        self.grid = [[EMPTY for _ in range(8)] for _ in range(8)]

        # starting 4 discs in the center
        self.grid[3][3] = WHITE
        self.grid[3][4] = BLACK
        self.grid[4][3] = BLACK
        self.grid[4][4] = WHITE

    def clone(self):
        # return a copy of the board (used by AI)
        b = Board.__new__(Board)   # make empty object without calling __init__
        b.grid = [row[:] for row in self.grid]
        return b

    def score(self):
        # count discs on board
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
        # find discs to flip if player plays at (r,c)
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
        # return dict of legal moves and flips they cause
        moves = {}
        for r in range(8):
            for c in range(8):
                f = self.find_flips(r, c, player)
                if f:
                    moves[(r, c)] = f
        return moves

    def apply_move(self, r, c, player, flips):
        # put down piece and flip
        self.grid[r][c] = player
        for rr, cc in flips:
            self.grid[rr][cc] = player

    def game_over(self):
        # no moves left for either player
        return not self.legal_moves(BLACK) and not self.legal_moves(WHITE)

    def render(self, highlight=None):
        # show board in console
        print("    " + " ".join(COL_NAMES))
        print("   " + "-" * 17)
        for r in range(8):
            row_str = []
            for c in range(8):
                ch = "."
                if self.grid[r][c] == BLACK:
                    ch = "●"
                elif self.grid[r][c] == WHITE:
                    ch = "○"
                elif highlight and (r, c) in highlight:
                    ch = "*"
                row_str.append(ch)
            print(f"{r+1:>2} | " + " ".join(row_str))
        b, w = self.score()
        print(f"\nScore  Black(●): {b}   White(○): {w}\n")

    @staticmethod
    def parse_move(s):
        # turn "d3" or "3 4" into (row, col)
        s = s.strip().lower()
        if len(s) == 2 and s[0] in COL_NAMES and s[1].isdigit():
            col = COL_NAMES.index(s[0])
            row = int(s[1]) - 1
            if in_bounds(row, col):
                return (row, col)

        parts = s.replace(",", " ").split()
        if len(parts) == 2 and all(p.isdigit() for p in parts):
            r = int(parts[0]) - 1
            c = int(parts[1]) - 1
            if in_bounds(r, c):
                return (r, c)
        return None

# ---------------- Strategies (AI) ----------------

class Strategy:
    def choose_move(self, board, player):
        raise NotImplementedError

class RandomStrategy(Strategy):
    def choose_move(self, board, player):
        moves = board.legal_moves(player)
        if not moves:
            return None
        return random.choice(list(moves.keys()))


def choose_random_best(scored_moves, maximize=True):
    best_score = None
    best_moves = []

    for move, score in scored_moves:
        if best_score is None:
            best_score = score
            best_moves = [move]
            continue

        is_better = score > best_score if maximize else score < best_score
        if is_better:
            best_score = score
            best_moves = [move]
        elif score == best_score:
            best_moves.append(move)

    if best_score is None:
        return None, None
    return random.choice(best_moves), best_score


def corner_moves(moves):
    return [m for m in [(0,0), (0,7), (7,0), (7,7)] if m in moves]

class GreedyCornerStrategy(Strategy):
    def choose_move(self, board, player):
        moves = board.legal_moves(player)
        if not moves:
            return None

        # if a corner is available, always take it
        corners = corner_moves(moves)
        if corners:
            return random.choice(corners)

        # otherwise, pick move that flips the most discs
        best_move = None
        best_flips = -1
        for (r, c), flips in moves.items():
            if len(flips) > best_flips:
                best_flips = len(flips)
                best_move = (r, c)
        return best_move

# ----- Minimax (hard AI) -----

def evaluate(board, player):
    # Score = positional weights + mobility (how many moves available)
    return evaluate_breakdown(board, player)["total"]


def evaluate_breakdown(board, player):
    # Score = positional weights + mobility (how many moves available)
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
    mobility = 5 * (my_moves - opp_moves)
    return {
        "positional": val,
        "mobility": mobility,
        "total": val + mobility,
    }


class HybridHeuristicStrategy(Strategy):
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

def minimax(board, root_player, depth, alpha, beta, maximizing):
    me = root_player if maximizing else opponent(root_player)
    moves = board.legal_moves(me)

    # stop conditions: no moves for both players OR depth 0
    if depth == 0 or (not moves and not board.legal_moves(opponent(me))):
        return evaluate(board, root_player), None

    best_move = None

    if not moves:
        # player must pass
        value, mv = minimax(board, root_player, depth-1, alpha, beta, not maximizing)
        return value, None

    if maximizing:
        value = -math.inf
        for (r, c), flips in moves.items():
            nb = board.clone()
            nb.apply_move(r, c, me, flips)
            v, _ = minimax(nb, root_player, depth-1, alpha, beta, False)
            if v > value:
                value, best_move = v, (r, c)
            alpha = max(alpha, value)
            if beta <= alpha:
                break
        return value, best_move
    else:
        value = math.inf
        for (r, c), flips in moves.items():
            nb = board.clone()
            nb.apply_move(r, c, me, flips)
            v, _ = minimax(nb, root_player, depth-1, alpha, beta, True)
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
        # if a corner exists, shortcut
        corners = corner_moves(moves)
        if corners:
            return random.choice(corners)
        _, move = minimax(board, player, self.depth, -math.inf, math.inf, True)
        return move

# ---------------- Players ----------------

class Player:
    def __init__(self, color, name):
        self.color = color
        self.name = name

    def get_move(self, board):
        raise NotImplementedError

class HumanPlayer(Player):
    def get_move(self, board):
        moves = board.legal_moves(self.color)
        if not moves:
            print(f"{self.name} has no legal moves. Turn passes.\n")
            return None
        board.render(highlight=moves)
        while True:
            s = input(f"{self.name} ({'Black ●' if self.color==BLACK else 'White ○'}) move (e.g., d3 or '3 4', 'q' to quit): ").strip()
            if s.lower() in ('q', 'quit', 'exit'):
                print("Quitting game. Bye!")
                raise SystemExit
            mv = Board.parse_move(s)
            if mv and mv in moves:
                return mv
            print("Invalid move. Try again. Legal moves are marked with '*'.")

class AIPlayer(Player):
    def __init__(self, color, strategy, name="AI"):
        super().__init__(color, name)
        self.strategy = strategy

    def get_move(self, board):
        moves = board.legal_moves(self.color)
        if not moves:
            print("AI has no legal moves. Turn passes.\n")
            return None
        board.render()  # show state before AI plays
        print(f"{self.name} is thinking...")
        mv = self.strategy.choose_move(board, self.color)
        if mv:
            r, c = mv
            print(f"{self.name} plays: {COL_NAMES[c]}{r+1}")
        return mv

# ---------------- Game ----------------

class Game:
    def __init__(self, p_black, p_white):
        self.board = Board()
        self.players = {BLACK: p_black, WHITE: p_white}
        self.current = BLACK  # Black starts

    def play(self):
        while not self.board.game_over():
            player = self.players[self.current]
            mv = player.get_move(self.board)
            if mv is not None:
                r, c = mv
                flips = self.board.legal_moves(self.current)[(r, c)]
                self.board.apply_move(r, c, self.current, flips)
            self.current = opponent(self.current)

        # Game end
        self.board.render()
        b, w = self.board.score()
        print("Game over!")
        print(f"Final Score — Black(●): {b}  White(○): {w}")
        if b > w:
            print(f"Winner: Black (●) — {self.players[BLACK].name}")
        elif w > b:
            print(f"Winner: White (○) — {self.players[WHITE].name}")
        else:
            print("It's a tie!")

# ---------------- Menu / main ----------------

def choose_color():
    print("\nChoose your color:")
    print("  1) Black (●) — moves first")
    print("  2) White (○) — moves second")
    while True:
        s = input("Enter 1/2: ").strip()
        if s == '1':
            return BLACK
        if s == '2':
            return WHITE
        print("Invalid choice. Try again.")

def choose_difficulty():
    print("\nChoose AI difficulty:")
    print("  1) Easy     — random move")
    print("  2) Medium   — greedy")
    print("  3) Advanced — hybrid heuristic")
    print("  4) Hard     — minimax")
    while True:
        s = input("Enter 1/2/3/4: ").strip()
        if s == '1':
            return RandomStrategy()
        if s == '2':
            return GreedyCornerStrategy()
        if s == '3':
            return HybridHeuristicStrategy()
        if s == '4':
            return MinimaxStrategy(depth=5)
        print("Invalid choice. Try again.")

def main():
    print("=====================================")
    print("         Reversi (Othello)")
    print("=====================================")
    print("Welcome to Yoav's Reversi Game! :)")
    print("Instructions:")
    print("'*' marks legal moves. '.' empty, '●' black, '○' white.")
    print("Your game board input examples: d3   or   '3 4'\n")
    print("Select mode:")
    print("  1) Player vs Player (PvP)")
    print("  2) Player vs AI")

    while True:
        mode = input("Enter 1 or 2: ").strip()
        if mode == '1':
            p1 = HumanPlayer(BLACK, "Player 1")
            p2 = HumanPlayer(WHITE, "Player 2")
            Game(p1, p2).play()
            break
        elif mode == '2':
            human_color = choose_color()
            ai_color = opponent(human_color)
            strategy = choose_difficulty()
            human = HumanPlayer(human_color, "You")
            ai = AIPlayer(ai_color, strategy, name=f"AI ({strategy.__class__.__name__})")
            players = {human_color: human, ai_color: ai}
            Game(players[BLACK], players[WHITE]).play()
            break
        else:
            print("Invalid selection. Try again.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted. Bye!")
