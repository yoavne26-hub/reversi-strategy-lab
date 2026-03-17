import random


def choose_random_best(scored_moves, *, maximize=True):
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
