// Lógica del tablero en el navegador

const ROWS = 6, COLS = 7;
const PLAYER = 1, AI = 2;

const params = new URLSearchParams(window.location.search);
const MODE = params.get("mode") || "human";

const ALGORITHM_LABELS = {
    minmax: "MinMax",
    alphabeta: "Alpha-Beta",
};

function normalizeAlgorithm(value) {
    return value === "minmax" || value === "alphabeta" ? value : "alphabeta";
}

const AI1_ALGO = normalizeAlgorithm(params.get("ai1"));
const AI2_ALGO = normalizeAlgorithm(params.get("ai2"));

function getDepthForAlgorithm(piece, algorithm) {
    const isMixedMode =
        (AI1_ALGO === "minmax" && AI2_ALGO === "alphabeta") ||
        (AI1_ALGO === "alphabeta" && AI2_ALGO === "minmax");

    if (isMixedMode) {
        return 4;
    }

    if (algorithm === "minmax") {
        return piece === PLAYER ? 3 : 4;
    }
    return piece === PLAYER ? 3 : 6;
}

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let gameOver = false;

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
            const val = board[r][c];
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

// ── Animar la última ficha caída ──
function animateLastDrop(col, piece) {
    // Encontrar la fila más baja de esa columna con esa pieza
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][col] === piece) {
            const idx = r * COLS + col;
            const cell = boardEl.children[idx];
            cell.classList.add("drop-anim");
            break;
        }
    }
}

// ── Turno del jugador humano ──
async function humanMove(col) {
    if (gameOver) return;

    // 1. Colocar ficha del jugador de inmediato (sin esperar a la IA)
    const res1 = await fetch("/api/player_move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ col })
    });
    const data1 = await res1.json();
    if (data1.status === "invalid") return;

    board = data1.board;
    buildBoard();
    animateLastDrop(col, PLAYER);
    playerMovesEl.textContent = data1.player_moves;

    if (data1.over) {
        highlightWinner(data1.winner_cells, () =>
            showResult(data1.winner, data1.player_moves, data1.ai_moves)
        );
        return;
    }

    // 2. Deshabilitar el tablero y mostrar que la IA está pensando
    boardEl.classList.add("disabled");
    setTurn("ai");

    // 3. Llamar a la IA (puede tardar)
    const res2 = await fetch("/api/ai_turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    const data2 = await res2.json();

    board = data2.board;
    buildBoard();
    if (data2.metrics) animateLastDrop(data2.metrics.ai_col, AI);

    aiMovesEl.textContent = data2.ai_moves;
    if (data2.metrics) updateMetrics(data2.metrics);

    if (data2.over) {
        highlightWinner(data2.winner_cells, () =>
            showResult(data2.winner, data2.player_moves, data2.ai_moves)
        );
        return;
    }

    // 4. Devolver el control al jugador
    boardEl.classList.remove("disabled");
    setTurn("player");
}

// ── Resalta las 4 celdas ganadoras y luego llama al callback ──
function highlightWinner(cells, callback) {
    if (!cells || cells.length === 0) { setTimeout(callback, 1000); return; }
    cells.forEach(([r, c]) => {
        const idx = r * COLS + c;
        boardEl.children[idx].classList.add("winner");
    });
    setTimeout(callback, 3200);
}

// ── Turno IA vs IA ──
function getAiConfig(piece) {
    const algorithm = piece === PLAYER ? AI1_ALGO : AI2_ALGO;
    const depth = getDepthForAlgorithm(piece, algorithm);

    if (piece === PLAYER) {
        return { depth, algorithm, label: `IA 1 · ${ALGORITHM_LABELS[algorithm]} (depth=${depth})` };
    }
    return { depth, algorithm, label: `IA 2 · ${ALGORITHM_LABELS[algorithm]} (depth=${depth})` };
}

async function aiVsAiLoop(piece) {
    if (gameOver) return;

    const current = getAiConfig(piece);
    turnEl.textContent = current.label + " pensando…";
    turnEl.className = "turn-indicator ai-turn";
    abRedEl.textContent = piece === PLAYER ? "IA 1" : "IA 2";

    await new Promise(r => setTimeout(r, 700)); // pausa visual

    const res = await fetch("/api/ai_move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ piece, depth: current.depth, algorithm: current.algorithm })
    });
    const data = await res.json();

    board = data.board;
    buildBoard();
    if (data.metrics) {
        animateLastDrop(data.metrics.ai_col, piece);
    }

    playerMovesEl.textContent = data.player_moves;
    aiMovesEl.textContent = data.ai_moves;

    if (data.metrics) {
        mmNodesEl.textContent = ALGORITHM_LABELS[data.metrics.algorithm];
        mmTimeEl.textContent = data.metrics.nodes;
        abNodesEl.textContent = data.metrics.time + "s";
        abTimeEl.textContent = data.metrics.depth;
        abRedEl.textContent = piece === PLAYER ? "IA 1" : "IA 2";
    }

    if (data.over) {
        setTimeout(() => {
            highlightWinner(data.winner_cells, () =>
                showResult(data.winner, data.player_moves, data.ai_moves)
            );
        }, 500);
        return;
    }

    // Alternar turno
    const nextPiece = piece === PLAYER ? AI : PLAYER;
    aiVsAiLoop(nextPiece);
}

function updateMetrics(m) {
    mmNodesEl.textContent = m.minmax_nodes;
    mmTimeEl.textContent = m.minmax_time + "s";
    abNodesEl.textContent = m.ab_nodes;
    abTimeEl.textContent = m.ab_time + "s";
    abRedEl.textContent = m.reduction + "%";
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

async function newGame() {
    overlay.classList.add("hidden");
    gameOver = false;
    boardEl.classList.remove("disabled");

    await fetch("/api/new_game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: MODE })
    });

    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
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
