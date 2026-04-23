from flask import Flask, render_template, request, jsonify, session
from game import Conecta4, player, ai
from ai import get_best_move
from metrics import Metrics, compare
import io, sys, os

# templates/ y static/ están en el directorio padre (raíz del proyecto)
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

app = Flask(
    __name__,
    template_folder=os.path.join(base_dir, "templates"),
    static_folder=os.path.join(base_dir, "static"),
)
app.secret_key = "conecta4_secret"

# una partida a la vez — sin sesiones múltiples
game_state = {
    "game": None,
    "metrics_minmax": None,
    "metrics_alphabeta": None,
    "mode": "human",
    "player_moves": 0,
    "ai_moves": 0,
    "over": False,
    "winner": None,
}

metrics_history = []

def state_to_dict():
    g = game_state["game"]
    return {
        "board": g.board,
        "over": game_state["over"],
        "winner": game_state["winner"],
        "player_moves": game_state["player_moves"],
        "ai_moves": game_state["ai_moves"],
    }

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/game")
def game():
    return render_template("game.html")

@app.route("/api/new_game", methods=["POST"])
def new_game():
    data = request.get_json()
    mode = data.get("mode", "human")
    game_state["game"] = Conecta4()
    game_state["metrics_minmax"] = Metrics()
    game_state["metrics_alphabeta"] = Metrics()
    game_state["mode"] = mode
    game_state["player_moves"] = 0
    game_state["ai_moves"] = 0
    game_state["over"] = False
    game_state["winner"] = None
    metrics_history.clear()
    return jsonify({"status": "ok", **state_to_dict()})

@app.route("/api/player_move", methods=["POST"])
def player_move():
    data = request.get_json()
    col = data.get("col")
    g = game_state["game"]

    if game_state["over"] or not g.is_valid_move(col):
        return jsonify({"status": "invalid", **state_to_dict()})

    g.drop_piece(col, player)
    game_state["player_moves"] += 1

    winner_cells = []
    if g.check_winner(player):
        game_state["over"] = True
        game_state["winner"] = "player"
        winner_cells = g.get_winner_cells(player)

    if g.is_full() and not game_state["over"]:
        game_state["over"] = True
        game_state["winner"] = "draw"

    return jsonify({"status": "ok", "winner_cells": winner_cells, **state_to_dict()})

@app.route("/api/ai_turn", methods=["POST"])
def ai_turn():
    g = game_state["game"]

    if game_state["over"]:
        return jsonify({"status": "over", "metrics": None, **state_to_dict()})

    mm = game_state["metrics_minmax"]
    ab = game_state["metrics_alphabeta"]

    mm.reset("MinMax")
    mm.start_timer()
    get_best_move(g, False, mm)
    mm.stop_timer()

    ab.reset("Alpha-Beta")
    ab.start_timer()
    ai_col = get_best_move(g, True, ab)
    ab.stop_timer()

    g.drop_piece(ai_col, ai)
    game_state["ai_moves"] += 1

    winner_cells = []
    if g.check_winner(ai):
        game_state["over"] = True
        game_state["winner"] = "ai"
        winner_cells = g.get_winner_cells(ai)

    if g.is_full() and not game_state["over"]:
        game_state["over"] = True
        game_state["winner"] = "draw"

    metrics = {
        "minmax_nodes": mm.nodes,
        "minmax_time": round(mm.time, 4),
        "ab_nodes": ab.nodes,
        "ab_time": round(ab.time, 4),
        "reduction": round((1 - ab.nodes / mm.nodes) * 100, 1) if mm.nodes > 0 else 0,
        "ai_col": ai_col,
    }

    metrics_history.append({
        "turn": game_state["ai_moves"],
        "mm_nodes": mm.nodes,
        "mm_time": round(mm.time, 4),
        "ab_nodes": ab.nodes,
        "ab_time": round(ab.time, 4),
        "reduction": metrics["reduction"],
    })

    return jsonify({"status": "ok", "metrics": metrics, "winner_cells": winner_cells, **state_to_dict()})

@app.route("/api/ai_move", methods=["POST"])
def ai_move():
    data = request.get_json()
    piece = data.get("piece")
    depth = data.get("depth")
    algorithm = data.get("algorithm", "alphabeta")
    if algorithm not in {"minmax", "alphabeta"}:
        algorithm = "alphabeta"
    g = game_state["game"]

    if game_state["over"]:
        return jsonify({"status": "over", **state_to_dict()})

    use_alphabeta = algorithm == "alphabeta"
    m = Metrics()
    m.reset(f"{algorithm} (depth={depth})")
    m.start_timer()
    col = get_best_move(g, use_alphabeta, m, depth=depth, piece=piece)
    m.stop_timer()

    g.drop_piece(col, piece)

    if piece == player:
        game_state["player_moves"] += 1
    else:
        game_state["ai_moves"] += 1

    winner_cells = []
    if g.check_winner(player):
        game_state["over"] = True
        game_state["winner"] = "ia1"
        winner_cells = g.get_winner_cells(player)
    elif g.check_winner(ai):
        game_state["over"] = True
        game_state["winner"] = "ia2"
        winner_cells = g.get_winner_cells(ai)
    elif g.is_full():
        game_state["over"] = True
        game_state["winner"] = "draw"

    metrics = {
        "nodes": m.nodes,
        "time": round(m.time, 4),
        "depth": depth,
        "algorithm": algorithm,
        "piece": piece,
        "ai_col": col,
    }

    return jsonify({"status": "ok", "metrics": metrics, "winner_cells": winner_cells, **state_to_dict()})

@app.route("/api/last_game_metrics")
def last_game_metrics():
    return jsonify({"history": metrics_history})

if __name__ == "__main__":
    app.run(debug=True)
