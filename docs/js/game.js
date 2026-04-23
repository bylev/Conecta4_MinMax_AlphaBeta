
const ALGORITHM_LABELS = { minmax: "MinMax", alphabeta: "Alpha-Beta" };

function normalizeAlgorithm(v) {
    return v === "minmax" || v === "alphabeta" ? v : "alphabeta";
}

const params = new URLSearchParams(window.location.search);
const MODE = params.get("mode") || "human";
const AI1_ALGO = normalizeAlgorithm(params.get("ai1"));
const AI2_ALGO = normalizeAlgorithm(params.get("ai2"));

function getDepthForAlgorithm(piece, algorithm) {
    const isMixed =
        (AI1_ALGO === "minmax" && AI2_ALGO === "alphabeta") ||
        (AI1_ALGO === "alphabeta" && AI2_ALGO === "minmax");
    if (isMixed) return 4;
    if (algorithm === "minmax") return piece === PLAYER ? 3 : 4;
    return piece === PLAYER ? 3 : 6;
}

// ── Estado ──
let game = new Conecta4();
let gameOver = false;
let playerMoveCount = 0;
let aiMoveCount = 0;
let metricsHistory = [];

// ── DOM ──
const boardEl = document.getElementById("board");
const turnEl = document.getElementById("turn-indicator");
const playerMovesEl = document.getElementById("player-moves");
const aiMovesEl = document.getElementById("ai-moves");
const playerLabelEl = document.getElementById("player-label");
const aiLabelEl = document.getElementById("ai-label");
const metricsTitleEl = document.getElementById("metrics-subtitle");
const metricLabel1El = document.getElementById("metric-label-1");
const metricLabel2El = document.getElementById("metric-label-2");
const metricLabel3El = document.getElementById("metric-label-3");
const metricLabel4El = document.getElementById("metric-label-4");
const metricLabel5El = document.getElementById("metric-label-5");
const mmNodesEl = document.getElementById("mm-nodes");
const mmTimeEl = document.getElementById("mm-time");
const abNodesEl = document.getElementById("ab-nodes");
const abTimeEl = document.getElementById("ab-time");
const abRedEl = document.getElementById("ab-reduction");
const overlay = document.getElementById("result-overlay");
const resultTitle = document.getElementById("result-title");
const resultSub = document.getElementById("result-sub");

// ── Construir tablero visual ──
function buildBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = r;
            cell.dataset.col = c;
            const val = game.board[r][c];
            if (val === PLAYER) cell.classList.add("player");
            else if (val === AI) cell.classList.add("ai");
            if (!gameOver && MODE === "human") {
                cell.addEventListener("click", () => humanMove(c));
            }
            boardEl.appendChild(cell);
        }
    }
}

function updatePanelLabels() {
    if (MODE === "ai_vs_ai") {
        playerLabelEl.textContent = "Jugadas IA 1";
        aiLabelEl.textContent = "Jugadas IA 2";
        metricsTitleEl.textContent = "Último turno IA";
        metricLabel1El.textContent = "Algoritmo";
        metricLabel2El.textContent = "Nodos";
        metricLabel3El.textContent = "Tiempo";
        metricLabel4El.textContent = "Profundidad";
        metricLabel5El.textContent = "Turno";
        return;
    }
    playerLabelEl.textContent = "Tus jugadas";
    aiLabelEl.textContent = "Jugadas IA";
    metricsTitleEl.textContent = "Última jugada IA";
    metricLabel1El.textContent = "MinMax Nodos";
    metricLabel2El.textContent = "MinMax Tiempo";
    metricLabel3El.textContent = "Alpha-Beta Nodos";
    metricLabel4El.textContent = "Alpha-Beta Tiempo";
    metricLabel5El.textContent = "Reducción αβ";
}

function animateLastDrop(col, piece) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (game.board[r][col] === piece) {
            const idx = r * COLS + col;
            boardEl.children[idx].classList.add("drop-anim");
            break;
        }
    }
}

// ── Turno del jugador humano ──
async function humanMove(col) {
    if (gameOver) return;
    if (!game.isValidMove(col)) return;

    // 1. Colocar ficha del jugador
    game.dropPiece(col, PLAYER);
    playerMoveCount++;
    buildBoard();
    animateLastDrop(col, PLAYER);
    playerMovesEl.textContent = playerMoveCount;

    // Check winner
    if (game.checkWinner(PLAYER)) {
        const cells = game.getWinnerCells(PLAYER);
        gameOver = true;
        highlightWinner(cells, () => showResult("player", playerMoveCount, aiMoveCount));
        return;
    }
    if (game.isFull()) {
        gameOver = true;
        showResult("draw", playerMoveCount, aiMoveCount);
        return;
    }

    // 2. Turno de la IA
    boardEl.classList.add("disabled");
    setTurn("ai");

    // Dar tiempo al DOM para actualizar antes del cálculo pesado
    await new Promise(r => setTimeout(r, 50));

    // MinMax (solo para comparar nodos)
    const mm = new Metrics();
    mm.reset("MinMax");
    mm.startTimer();
    getBestMove(game, false, mm);
    mm.stopTimer();

    // Alpha-Beta (la jugada real)
    const ab = new Metrics();
    ab.reset("Alpha-Beta");
    ab.startTimer();
    const aiCol = getBestMove(game, true, ab);
    ab.stopTimer();

    game.dropPiece(aiCol, AI);
    aiMoveCount++;
    buildBoard();
    animateLastDrop(aiCol, AI);
    aiMovesEl.textContent = aiMoveCount;

    const reduction = mm.nodes > 0 ? Math.round((1 - ab.nodes / mm.nodes) * 1000) / 10 : 0;

    mmNodesEl.textContent = mm.nodes;
    mmTimeEl.textContent = mm.time.toFixed(4) + "s";
    abNodesEl.textContent = ab.nodes;
    abTimeEl.textContent = ab.time.toFixed(4) + "s";
    abRedEl.textContent = reduction + "%";

    metricsHistory.push({
        turn: aiMoveCount,
        mm_nodes: mm.nodes,
        mm_time: parseFloat(mm.time.toFixed(4)),
        ab_nodes: ab.nodes,
        ab_time: parseFloat(ab.time.toFixed(4)),
        reduction: reduction,
    });
    localStorage.setItem("conecta4_metrics", JSON.stringify(metricsHistory));

    if (game.checkWinner(AI)) {
        const cells = game.getWinnerCells(AI);
        gameOver = true;
        highlightWinner(cells, () => showResult("ai", playerMoveCount, aiMoveCount));
        return;
    }
    if (game.isFull()) {
        gameOver = true;
        showResult("draw", playerMoveCount, aiMoveCount);
        return;
    }

    boardEl.classList.remove("disabled");
    setTurn("player");
}

// ── Resaltar celdas ganadoras ──
function highlightWinner(cells, callback) {
    if (!cells || cells.length === 0) { setTimeout(callback, 1000); return; }
    cells.forEach(([r, c]) => {
        const idx = r * COLS + c;
        boardEl.children[idx].classList.add("winner");
    });
    setTimeout(callback, 3200);
}

// ── IA vs IA ──
function getAiConfig(piece) {
    const algorithm = piece === PLAYER ? AI1_ALGO : AI2_ALGO;
    const depth = getDepthForAlgorithm(piece, algorithm);
    const label = piece === PLAYER
        ? `IA 1 · ${ALGORITHM_LABELS[algorithm]} (depth=${depth})`
        : `IA 2 · ${ALGORITHM_LABELS[algorithm]} (depth=${depth})`;
    return { depth, algorithm, label };
}

async function aiVsAiLoop(piece) {
    if (gameOver) return;

    const current = getAiConfig(piece);
    turnEl.textContent = current.label + " pensando…";
    turnEl.className = "turn-indicator ai-turn";
    abRedEl.textContent = piece === PLAYER ? "IA 1" : "IA 2";

    await new Promise(r => setTimeout(r, 700));

    const m = new Metrics();
    m.reset(current.algorithm);
    m.startTimer();
    const col = getBestMove(game, current.algorithm === "alphabeta", m, current.depth, piece);
    m.stopTimer();

    game.dropPiece(col, piece);
    if (piece === PLAYER) playerMoveCount++;
    else aiMoveCount++;

    buildBoard();
    animateLastDrop(col, piece);
    playerMovesEl.textContent = playerMoveCount;
    aiMovesEl.textContent = aiMoveCount;

    mmNodesEl.textContent = ALGORITHM_LABELS[current.algorithm];
    mmTimeEl.textContent = m.nodes;
    abNodesEl.textContent = m.time.toFixed(4) + "s";
    abTimeEl.textContent = current.depth;
    abRedEl.textContent = piece === PLAYER ? "IA 1" : "IA 2";

    // Check winner
    let winner = null;
    let winnerCells = [];
    if (game.checkWinner(PLAYER)) {
        winner = "ia1";
        winnerCells = game.getWinnerCells(PLAYER);
    } else if (game.checkWinner(AI)) {
        winner = "ia2";
        winnerCells = game.getWinnerCells(AI);
    } else if (game.isFull()) {
        winner = "draw";
    }

    if (winner) {
        gameOver = true;
        setTimeout(() => {
            highlightWinner(winnerCells, () =>
                showResult(winner, playerMoveCount, aiMoveCount)
            );
        }, 500);
        return;
    }

    // Alternar turno
    const next = piece === PLAYER ? AI : PLAYER;
    aiVsAiLoop(next);
}

function setTurn(who) {
    if (who === "player") {
        turnEl.textContent = "Tu turno";
        turnEl.className = "turn-indicator";
    } else {
        turnEl.textContent = "IA pensando…";
        turnEl.className = "turn-indicator ai-turn";
    }
}

function showResult(winner, pm, aim) {
    gameOver = true;
    boardEl.classList.add("disabled");
    turnEl.textContent = "Partida terminada";
    turnEl.className = "turn-indicator over";

    const messages = {
        player: ["¡Ganaste! 🎉", `Tus jugadas: ${pm} · IA: ${aim}`],
        ai: ["¡Ganó la IA!", `Tus jugadas: ${pm} · IA: ${aim}`],
        ia1: [`¡Ganó IA 1 (${ALGORITHM_LABELS[AI1_ALGO]}, depth=${getDepthForAlgorithm(PLAYER, AI1_ALGO)})!`, `Jugadas — IA1: ${pm} · IA2: ${aim}`],
        ia2: [`¡Ganó IA 2 (${ALGORITHM_LABELS[AI2_ALGO]}, depth=${getDepthForAlgorithm(AI, AI2_ALGO)})!`, `Jugadas — IA1: ${pm} · IA2: ${aim}`],
        draw: ["Empate", `Total de jugadas: ${pm + aim}`],
    };
    const [title, sub] = messages[winner] || ["Partida terminada", ""];
    resultTitle.textContent = title;
    resultSub.textContent = sub;
    overlay.classList.remove("hidden");
}

function newGame() {
    overlay.classList.add("hidden");
    gameOver = false;
    boardEl.classList.remove("disabled");
    game = new Conecta4();
    playerMoveCount = 0;
    aiMoveCount = 0;
    metricsHistory = [];
    localStorage.removeItem("conecta4_metrics");

    buildBoard();
    updatePanelLabels();
    playerMovesEl.textContent = "0";
    aiMovesEl.textContent = "0";
    mmNodesEl.textContent = mmTimeEl.textContent = abNodesEl.textContent = abTimeEl.textContent = abRedEl.textContent = "—";

    if (MODE === "ai_vs_ai") {
        turnEl.textContent = `IA 1 (${ALGORITHM_LABELS[AI1_ALGO]}) vs IA 2 (${ALGORITHM_LABELS[AI2_ALGO]})`;
        aiVsAiLoop(PLAYER);
    } else {
        setTurn("player");
    }
}

// ── Iniciar ──
newGame();
