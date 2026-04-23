import copy

rows = 6
cols = 7
empty = 0
player = 1
ai = 2

class Conecta4:
    def __init__(self):
        self.board = [[empty for _ in range(cols)] for _ in range(rows)]

    def copy(self):
        nuevo = Conecta4()
        nuevo.board = copy.deepcopy(self.board)
        return nuevo

    def drop_piece(self, col, piece):
        if col < 0 or col >= cols:
            return None

        for r in range(rows - 1, -1, -1):
            if self.board[r][col] == empty:
                self.board[r][col] = piece
                return r
        return None

    def is_valid_move(self, col):
        return col >= 0 and col < cols and self.board[0][col] == empty

    def get_valid_moves(self):
        return [c for c in range(cols) if self.is_valid_move(c)]

    def check_winner(self, piece):
        for r in range(rows):
            for c in range(cols - 3):
                if all(self.board[r][c+i] == piece for i in range(4)):
                    return True
        for c in range(cols):
            for r in range(rows - 3):
                if all(self.board[r+i][c] == piece for i in range(4)):
                    return True
        for r in range(rows - 3):
            for c in range(cols - 3):
                if all(self.board[r+i][c+i] == piece for i in range(4)):
                    return True
        for r in range(rows - 3):
            for c in range(3, cols):
                if all(self.board[r+i][c-i] == piece for i in range(4)):
                    return True
        return False

    def get_winner_cells(self, piece):
        for r in range(rows):
            for c in range(cols - 3):
                if all(self.board[r][c+i] == piece for i in range(4)):
                    return [[r, c+i] for i in range(4)]
        for c in range(cols):
            for r in range(rows - 3):
                if all(self.board[r+i][c] == piece for i in range(4)):
                    return [[r+i, c] for i in range(4)]
        for r in range(rows - 3):
            for c in range(cols - 3):
                if all(self.board[r+i][c+i] == piece for i in range(4)):
                    return [[r+i, c+i] for i in range(4)]
        for r in range(rows - 3):
            for c in range(3, cols):
                if all(self.board[r+i][c-i] == piece for i in range(4)):
                    return [[r+i, c-i] for i in range(4)]
        return []

    def is_full(self):
        return len(self.get_valid_moves()) == 0

    def print_board(self):
        for c in range(cols):
            print(c, end=" ")
        print()
        for r in range(rows):
            for c in range(cols):
                if self.board[r][c] == empty:
                    print(".", end=" ")
                elif self.board[r][c] == player:
                    print("X", end=" ")
                else:
                    print("O", end=" ")
            print()
