import time

class Metrics:
    def __init__(self):
        self.nodes = 0
        self.time = 0.0
        self.algorithm = ""
        self._start = 0.0

    def reset(self, algorithm_name):
        self.nodes = 0
        self.time = 0.0
        self.algorithm = algorithm_name
        self._start = 0.0

    def start_timer(self):
        self._start = time.time()

    def stop_timer(self):
        self.time = time.time() - self._start

    def report(self):
        print(f"========= Métricas: {self.algorithm} =========")
        print(f"Nodos visitados    : {self.nodes}")
        print(f"Tiempo de ejecución: {self.time:.4f} segundos")
        print("=" * 42)


def compare(metrics_minmax, metrics_alphabeta):
    print("\n====== Comparación MinMax vs Alpha-Beta ======")
    print(f"{'Algoritmo':<12} | {'Nodos':>8} | {'Tiempo (s)':>10}")
    print("=" * 38)
    print(f"{'MinMax':<12} | {metrics_minmax.nodes:>8} | {metrics_minmax.time:>10.4f}")
    print(f"{'Alpha-Beta':<12} | {metrics_alphabeta.nodes:>8} | {metrics_alphabeta.time:>10.4f}")
    print("=" * 38)

    if metrics_minmax.nodes > 0:
        reduccion = (1 - metrics_alphabeta.nodes / metrics_minmax.nodes) * 100
        print(f"Alpha-Beta redujo {reduccion:.1f}% los nodos evaluados")
    print("=" * 38)
