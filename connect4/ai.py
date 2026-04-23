from game import Conecta4, player, ai, rows, cols, empty
import math

max_depth = 5


def opponent_of(piece):
    return player if piece == ai else ai


def score_window(window, piece):
    score = 0
    opponent = opponent_of(piece)

    if window.count(piece) == 4:
        score += 100
    elif window.count(piece) == 3 and window.count(empty) == 1:
        score += 5
    elif window.count(piece) == 2 and window.count(empty) == 2:
        score += 2
    elif window.count(opponent) == 3 and window.count(empty) == 1:
        score -= 4

    return score


def evaluate_board(game, piece):
    score = 0
    board = game.board

    # Preferir columna central
    center_col = cols // 2
    center_arr = [board[r][center_col] for r in range(rows)]
    score += center_arr.count(piece) * 3

    # Ventanas horizontales
    for r in range(rows):
        row_arr = board[r]
        for c in range(cols - 3):
            window = row_arr[c:c+4]
            score += score_window(window, piece)

    # Ventanas verticales
    for c in range(cols):
        col_arr = [board[r][c] for r in range(rows)]
        for r in range(rows - 3):
            window = col_arr[r:r+4]
            score += score_window(window, piece)

    # Diagonal \
    for r in range(rows - 3):
        for c in range(cols - 3):
            window = [board[r+i][c+i] for i in range(4)]
            score += score_window(window, piece)

    # Diagonal /
    for r in range(rows - 3):
        for c in range(3, cols):
            window = [board[r+i][c-i] for i in range(4)]
            score += score_window(window, piece)

    return score


def is_terminal(game):
    return game.check_winner(player) or game.check_winner(ai) or game.is_full()


def minmax(game, depth, maximizing, metrics, maximizing_piece=ai):
    minimizing_piece = opponent_of(maximizing_piece)

    if game.check_winner(maximizing_piece):
        return None, 1000000
    elif game.check_winner(minimizing_piece):
        return None, -1000000
    elif game.is_full():
        return None, 0
    elif depth == 0:
        return None, evaluate_board(game, maximizing_piece)

    valid_moves = game.get_valid_moves()

    if maximizing:
        value = -math.inf
        column = valid_moves[0]
        for col in valid_moves:
            new_board = game.copy()
            new_board.drop_piece(col, maximizing_piece)
            metrics.nodes += 1
            new_score = minmax(new_board, depth - 1, False, metrics, maximizing_piece)[1]
            if new_score > value:
                value = new_score
                column = col
        return column, value
    else:
        value = math.inf
        column = valid_moves[0]
        for col in valid_moves:
            new_board = game.copy()
            new_board.drop_piece(col, minimizing_piece)
            metrics.nodes += 1
            new_score = minmax(new_board, depth - 1, True, metrics, maximizing_piece)[1]
            if new_score < value:
                value = new_score
                column = col
        return column, value


def alphabeta(game, depth, alpha, beta, maximizing, metrics, maximizing_piece=ai):
    minimizing_piece = opponent_of(maximizing_piece)

    if game.check_winner(maximizing_piece):
        return None, 1000000
    elif game.check_winner(minimizing_piece):
        return None, -1000000
    elif game.is_full():
        return None, 0
    elif depth == 0:
        return None, evaluate_board(game, maximizing_piece)

    valid_moves = game.get_valid_moves()

    if maximizing:
        value = -math.inf
        column = valid_moves[0]
        for col in valid_moves:
            new_board = game.copy()
            new_board.drop_piece(col, maximizing_piece)
            metrics.nodes += 1
            new_score = alphabeta(new_board, depth - 1, alpha, beta, False, metrics, maximizing_piece)[1]
            if new_score > value:
                value = new_score
                column = col
            alpha = max(alpha, value)
            if alpha >= beta:
                break  # poda beta
        return column, value
    else:
        value = math.inf
        column = valid_moves[0]
        for col in valid_moves:
            new_board = game.copy()
            new_board.drop_piece(col, minimizing_piece)
            metrics.nodes += 1
            new_score = alphabeta(new_board, depth - 1, alpha, beta, True, metrics, maximizing_piece)[1]
            if new_score < value:
                value = new_score
                column = col
            beta = min(beta, value)
            if alpha >= beta:
                break  # poda alpha
        return column, value


def get_best_move(game, use_alphabeta, metrics, depth=max_depth, piece=ai):
    if use_alphabeta:
        col, _ = alphabeta(game, depth, -math.inf, math.inf, True, metrics, piece)
    else:
        col, _ = minmax(game, depth, True, metrics, piece)
    return col
