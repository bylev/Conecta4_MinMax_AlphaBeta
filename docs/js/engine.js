

const ROWS = 6, COLS = 7;
const EMPTY = 0, PLAYER = 1, AI = 2;
const MAX_DEPTH = 5;

// ── Tablero ──────────────────────────────────────────────────

class Conecta4 {
    constructor(board) {
        this.board = board
            ? board.map(r => [...r])
            : Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    }

    copy() {
        return new Conecta4(this.board);
    }

    dropPiece(col, piece) {
        if (col < 0 || col >= COLS) return null;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.board[r][col] === EMPTY) {
                this.board[r][col] = piece;
                return r;
            }
        }
        return null;
    }

    isValidMove(col) {
        return col >= 0 && col < COLS && this.board[0][col] === EMPTY;
    }

    getValidMoves() {
        const moves = [];
        for (let c = 0; c < COLS; c++) {
            if (this.isValidMove(c)) moves.push(c);
        }
        return moves;
    }

    checkWinner(piece) {
        const b = this.board;
        // Horizontal
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c <= COLS - 4; c++)
                if (b[r][c] === piece && b[r][c + 1] === piece && b[r][c + 2] === piece && b[r][c + 3] === piece) return true;
        // Vertical
        for (let c = 0; c < COLS; c++)
            for (let r = 0; r <= ROWS - 4; r++)
                if (b[r][c] === piece && b[r + 1][c] === piece && b[r + 2][c] === piece && b[r + 3][c] === piece) return true;
        // Diagonal \.
        for (let r = 0; r <= ROWS - 4; r++)
            for (let c = 0; c <= COLS - 4; c++)
                if (b[r][c] === piece && b[r + 1][c + 1] === piece && b[r + 2][c + 2] === piece && b[r + 3][c + 3] === piece) return true;
        // Diagonal /
        for (let r = 0; r <= ROWS - 4; r++)
            for (let c = 3; c < COLS; c++)
                if (b[r][c] === piece && b[r + 1][c - 1] === piece && b[r + 2][c - 2] === piece && b[r + 3][c - 3] === piece) return true;
        return false;
    }

    getWinnerCells(piece) {
        const b = this.board;
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c <= COLS - 4; c++)
                if (b[r][c] === piece && b[r][c + 1] === piece && b[r][c + 2] === piece && b[r][c + 3] === piece)
                    return [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]];
        for (let c = 0; c < COLS; c++)
            for (let r = 0; r <= ROWS - 4; r++)
                if (b[r][c] === piece && b[r + 1][c] === piece && b[r + 2][c] === piece && b[r + 3][c] === piece)
                    return [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]];
        for (let r = 0; r <= ROWS - 4; r++)
            for (let c = 0; c <= COLS - 4; c++)
                if (b[r][c] === piece && b[r + 1][c + 1] === piece && b[r + 2][c + 2] === piece && b[r + 3][c + 3] === piece)
                    return [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]];
        for (let r = 0; r <= ROWS - 4; r++)
            for (let c = 3; c < COLS; c++)
                if (b[r][c] === piece && b[r + 1][c - 1] === piece && b[r + 2][c - 2] === piece && b[r + 3][c - 3] === piece)
                    return [[r, c], [r + 1, c - 1], [r + 2, c - 2], [r + 3, c - 3]];
        return [];
    }

    isFull() {
        return this.getValidMoves().length === 0;
    }
}

// ── Métricas ─────────────────────────────────────────────────

class Metrics {
    constructor() { this.reset(""); }
    reset(name) { this.algorithm = name; this.nodes = 0; this.time = 0; this._start = 0; }
    startTimer() { this._start = performance.now(); }
    stopTimer() { this.time = (performance.now() - this._start) / 1000; }
}

// ── IA ───────────────────────────────────────────────────────

function opponentOf(piece) { return piece === AI ? PLAYER : AI; }

function scoreWindow(window, piece) {
    let score = 0;
    const opp = opponentOf(piece);
    const cnt = window.filter(v => v === piece).length;
    const emp = window.filter(v => v === EMPTY).length;
    const oppC = window.filter(v => v === opp).length;

    if (cnt === 4) score += 100;
    else if (cnt === 3 && emp === 1) score += 5;
    else if (cnt === 2 && emp === 2) score += 2;
    if (oppC === 3 && emp === 1) score -= 4;
    return score;
}

function evaluateBoard(game, piece) {
    let score = 0;
    const b = game.board;

    // Centro
    const center = Math.floor(COLS / 2);
    for (let r = 0; r < ROWS; r++) if (b[r][center] === piece) score += 3;

    // Horizontal
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c <= COLS - 4; c++)
            score += scoreWindow([b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]], piece);

    // Vertical
    for (let c = 0; c < COLS; c++)
        for (let r = 0; r <= ROWS - 4; r++)
            score += scoreWindow([b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]], piece);

    // Diag \.
    for (let r = 0; r <= ROWS - 4; r++)
        for (let c = 0; c <= COLS - 4; c++)
            score += scoreWindow([b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]], piece);

    // Diag /
    for (let r = 0; r <= ROWS - 4; r++)
        for (let c = 3; c < COLS; c++)
            score += scoreWindow([b[r][c], b[r + 1][c - 1], b[r + 2][c - 2], b[r + 3][c - 3]], piece);

    return score;
}

function minmax(game, depth, maximizing, metrics, maxPiece = AI) {
    const minPiece = opponentOf(maxPiece);

    if (game.checkWinner(maxPiece)) return [null, 1000000];
    if (game.checkWinner(minPiece)) return [null, -1000000];
    if (game.isFull()) return [null, 0];
    if (depth === 0) return [null, evaluateBoard(game, maxPiece)];

    const moves = game.getValidMoves();

    if (maximizing) {
        let value = -Infinity, column = moves[0];
        for (const col of moves) {
            const nb = game.copy();
            nb.dropPiece(col, maxPiece);
            metrics.nodes++;
            const s = minmax(nb, depth - 1, false, metrics, maxPiece)[1];
            if (s > value) { value = s; column = col; }
        }
        return [column, value];
    } else {
        let value = Infinity, column = moves[0];
        for (const col of moves) {
            const nb = game.copy();
            nb.dropPiece(col, minPiece);
            metrics.nodes++;
            const s = minmax(nb, depth - 1, true, metrics, maxPiece)[1];
            if (s < value) { value = s; column = col; }
        }
        return [column, value];
    }
}

function alphabeta(game, depth, alpha, beta, maximizing, metrics, maxPiece = AI) {
    const minPiece = opponentOf(maxPiece);

    if (game.checkWinner(maxPiece)) return [null, 1000000];
    if (game.checkWinner(minPiece)) return [null, -1000000];
    if (game.isFull()) return [null, 0];
    if (depth === 0) return [null, evaluateBoard(game, maxPiece)];

    const moves = game.getValidMoves();

    if (maximizing) {
        let value = -Infinity, column = moves[0];
        for (const col of moves) {
            const nb = game.copy();
            nb.dropPiece(col, maxPiece);
            metrics.nodes++;
            const s = alphabeta(nb, depth - 1, alpha, beta, false, metrics, maxPiece)[1];
            if (s > value) { value = s; column = col; }
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
        }
        return [column, value];
    } else {
        let value = Infinity, column = moves[0];
        for (const col of moves) {
            const nb = game.copy();
            nb.dropPiece(col, minPiece);
            metrics.nodes++;
            const s = alphabeta(nb, depth - 1, alpha, beta, true, metrics, maxPiece)[1];
            if (s < value) { value = s; column = col; }
            beta = Math.min(beta, value);
            if (alpha >= beta) break;
        }
        return [column, value];
    }
}

function getBestMove(game, useAlphabeta, metrics, depth = MAX_DEPTH, piece = AI) {
    if (useAlphabeta) {
        return alphabeta(game, depth, -Infinity, Infinity, true, metrics, piece)[0];
    }
    return minmax(game, depth, true, metrics, piece)[0];
}
