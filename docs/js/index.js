const btn = document.getElementById("landing-btn");
const landing = document.getElementById("landing");
const wrap = document.getElementById("site-wrap");

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
    });
}, { threshold: 0.15 });

document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));

function showSite() {
    landing.style.display = "none";
    wrap.classList.remove("hidden");
    wrap.classList.add("site-wrap-visible");
    loadCharts();
}

if (sessionStorage.getItem("seenLanding")) {
    showSite();
} else {
    btn.addEventListener("click", () => {
        sessionStorage.setItem("seenLanding", "1");
        landing.classList.add("exit");
        setTimeout(showSite, 700);
    });
}

function playAiVsAi() {
    const sel = document.getElementById("ai-mode-select");
    window.location.href = sel.value;
}

function loadCharts() {
    try {
        const raw = localStorage.getItem("conecta4_metrics");
        if (!raw) {
            document.getElementById("charts-empty").style.display = "";
            document.getElementById("charts-wrap").style.display = "none";
            return;
        }

        const history = JSON.parse(raw);
        if (!history || history.length === 0) {
            document.getElementById("charts-empty").style.display = "";
            document.getElementById("charts-wrap").style.display = "none";
            return;
        }

        document.getElementById("charts-empty").style.display = "none";
        document.getElementById("charts-wrap").style.display = "";

        const labels = history.map((h) => "Jugada " + h.turn);
        const sage = "#7ea876";
        const sageBg = "rgba(126,168,118,.25)";
        const sky = "#6fa0b8";
        const skyBg = "rgba(111,160,184,.25)";
        const yellow = "#e8b84b";
        const yellowBg = "rgba(232,184,75,.25)";

        const baseOpts = {
            responsive: true,
            plugins: {
                legend: { labels: { font: { family: "'Inter', sans-serif", size: 13 }, usePointStyle: true, pointStyle: "circle" } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", size: 11 } } },
                y: { beginAtZero: true, ticks: { font: { family: "'Inter', sans-serif", size: 11 } } }
            }
        };

        new Chart(document.getElementById("chart-nodes"), {
            type: "bar",
            data: {
                labels,
                datasets: [
                    { label: "MinMax", data: history.map((h) => h.mm_nodes), backgroundColor: sageBg, borderColor: sage, borderWidth: 2, borderRadius: 6 },
                    { label: "Alpha-Beta", data: history.map((h) => h.ab_nodes), backgroundColor: skyBg, borderColor: sky, borderWidth: 2, borderRadius: 6 }
                ]
            },
            options: baseOpts
        });

        new Chart(document.getElementById("chart-time"), {
            type: "line",
            data: {
                labels,
                datasets: [
                    { label: "MinMax (s)", data: history.map((h) => h.mm_time), borderColor: sage, backgroundColor: sageBg, fill: true, tension: 0.35, pointRadius: 5, pointBackgroundColor: sage },
                    { label: "Alpha-Beta (s)", data: history.map((h) => h.ab_time), borderColor: sky, backgroundColor: skyBg, fill: true, tension: 0.35, pointRadius: 5, pointBackgroundColor: sky }
                ]
            },
            options: baseOpts
        });

        new Chart(document.getElementById("chart-reduction"), {
            type: "bar",
            data: {
                labels,
                datasets: [
                    { label: "Reducción %", data: history.map((h) => h.reduction), backgroundColor: yellowBg, borderColor: yellow, borderWidth: 2, borderRadius: 6 }
                ]
            },
            options: { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: false } }, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, max: 100 } } }
        });
    } catch (e) {
        console.log("No metrics yet", e);
    }
}
