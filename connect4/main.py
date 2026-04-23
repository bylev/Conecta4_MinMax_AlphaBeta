from game import Conecta4, player, ai
from metrics import Metrics, compare
from ai import get_best_move
import time
import matplotlib.pyplot as plt

DEPTH = 5

class Main:
    def __init__(self):
        self.game = Conecta4()
        self.metrics_minmax = Metrics()
        self.metrics_alphabeta = Metrics()
        self.turn = player
        self.player_moves = 0
        self.ai_moves = 0

    def play(self):
        print("========= CONECTA 4 =========")
        print("1. Jugador vs IA")
        print("2. IA vs IA")
        print("=============================")
        opcion = input("Elige modo (1 o 2): ").strip()

        if opcion == "2":
            self.play_ai_vs_ai()
        else:
            self.play_vs_human()

    def play_vs_human(self):
        while True:
            self.game.print_board()

            if self.game.check_winner(player):
                print(f"¡Ganaste! Tus movimientos: {self.player_moves} | IA: {self.ai_moves}")
                break
            if self.game.check_winner(ai):
                print(f"¡Ganó la IA! Tus movimientos: {self.player_moves} | IA: {self.ai_moves}")
                break
            if self.game.is_full():
                print(f"¡Empate! Tus movimientos: {self.player_moves} | IA: {self.ai_moves}")
                break

            if self.turn == player:
                try:
                    col = int(input("Jugador, elige una columna (0-6): "))
                except ValueError:
                    print("Ingresa un número válido.")
                    continue

                if self.game.is_valid_move(col):
                    self.game.drop_piece(col, player)
                    self.player_moves += 1
                    self.turn = ai
                else:
                    print("Movimiento inválido. Intenta de nuevo.")

            else:
                print("IA pensando...")

                self.metrics_minmax.reset("MinMax")
                self.metrics_minmax.start_timer()
                get_best_move(self.game, False, self.metrics_minmax)
                self.metrics_minmax.stop_timer()

                self.metrics_alphabeta.reset("Alpha-Beta")
                self.metrics_alphabeta.start_timer()
                col_alphabeta = get_best_move(self.game, True, self.metrics_alphabeta)
                self.metrics_alphabeta.stop_timer()

                self.game.drop_piece(col_alphabeta, ai)
                self.ai_moves += 1
                self.turn = player

                compare(self.metrics_minmax, self.metrics_alphabeta)

    def play_ai_vs_ai(self):
        metrics_mm = Metrics()
        metrics_ab = Metrics()
        turn = player
        moves_mm = 0
        moves_ab = 0

        history_mm = []  # [(jugada, nodos, tiempo), ...]
        history_ab = []

        print(f"\nMinMax (X, depth={DEPTH})  vs  Alpha-Beta (O, depth={DEPTH})\n")

        while True:
            self.game.print_board()
            time.sleep(1)

            if self.game.check_winner(player):
                print(f"¡Ganó MinMax (X)! Jugadas — MM: {moves_mm} | AB: {moves_ab}")
                break
            if self.game.check_winner(ai):
                print(f"¡Ganó Alpha-Beta (O)! Jugadas — MM: {moves_mm} | AB: {moves_ab}")
                break
            if self.game.is_full():
                print(f"¡Empate! Jugadas — MM: {moves_mm} | AB: {moves_ab}")
                break

            if turn == player:
                print(f"MinMax pensando (depth={DEPTH})...")
                metrics_mm.reset(f"MinMax (depth={DEPTH})")
                metrics_mm.start_timer()
                col = get_best_move(self.game, False, metrics_mm, depth=DEPTH)
                metrics_mm.stop_timer()
                self.game.drop_piece(col, player)
                moves_mm += 1
                history_mm.append((moves_mm, metrics_mm.nodes, metrics_mm.time))
                metrics_mm.report()
                turn = ai

            else:
                print(f"Alpha-Beta pensando (depth={DEPTH})...")
                metrics_ab.reset(f"Alpha-Beta (depth={DEPTH})")
                metrics_ab.start_timer()
                col = get_best_move(self.game, True, metrics_ab, depth=DEPTH)
                metrics_ab.stop_timer()
                self.game.drop_piece(col, ai)
                moves_ab += 1
                history_ab.append((moves_ab, metrics_ab.nodes, metrics_ab.time))
                metrics_ab.report()
                turn = player

        # totales para compare()
        metrics_mm.nodes = sum(h[1] for h in history_mm)
        metrics_mm.time  = sum(h[2] for h in history_mm)
        metrics_ab.nodes = sum(h[1] for h in history_ab)
        metrics_ab.time  = sum(h[2] for h in history_ab)
        compare(metrics_mm, metrics_ab)

        self._plot(history_mm, history_ab)

    def _plot(self, history_mm, history_ab):
        jugadas_mm = [h[0] for h in history_mm]
        nodos_mm   = [h[1] for h in history_mm]
        tiempo_mm  = [h[2] for h in history_mm]

        jugadas_ab = [h[0] for h in history_ab]
        nodos_ab   = [h[1] for h in history_ab]
        tiempo_ab  = [h[2] for h in history_ab]

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        fig.suptitle(f"MinMax vs Alpha-Beta  (depth={DEPTH})", fontsize=14, fontweight="bold")

        ax1.plot(jugadas_mm, nodos_mm, "o-", color="#7ea876", label="MinMax")
        ax1.plot(jugadas_ab, nodos_ab, "o-", color="#6fa0b8", label="Alpha-Beta")
        ax1.set_title("Nodos evaluados por jugada")
        ax1.set_xlabel("Jugada")
        ax1.set_ylabel("Nodos")
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        ax2.plot(jugadas_mm, tiempo_mm, "o-", color="#7ea876", label="MinMax")
        ax2.plot(jugadas_ab, tiempo_ab, "o-", color="#6fa0b8", label="Alpha-Beta")
        ax2.set_title("Tiempo de ejecución por jugada")
        ax2.set_xlabel("Jugada")
        ax2.set_ylabel("Tiempo (s)")
        ax2.legend()
        ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig("resultados.png", dpi=150)
        print("\nGráfica guardada en resultados.png")
        plt.show()


if __name__ == "__main__":
    main = Main()
    main.play()
