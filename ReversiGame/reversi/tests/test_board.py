from reversi.backend.engine.board import BLACK, WHITE, Board


def test_initial_legal_moves_for_black():
    board = Board()
    moves = set(board.legal_moves(BLACK).keys())
    assert moves == {(2, 3), (3, 2), (4, 5), (5, 4)}


def test_apply_move_flips_correct_discs():
    board = Board()
    moves = board.legal_moves(BLACK)
    flips = moves[(2, 3)]
    board.apply_move(2, 3, BLACK, flips)
    assert board.grid[2][3] == BLACK
    assert board.grid[3][3] == BLACK
    black, white = board.score()
    assert (black, white) == (4, 1)


def test_find_flips_returns_empty_on_illegal_square():
    board = Board()
    assert board.find_flips(3, 3, WHITE) == []

