// ====== Daten ======
const TEAMS = ["Team1","Team2","Team3","Team4","Team5","Team6","Team7"];

const GAME_MAP = {
  A: "Fifa",
  B: "Bierpong",
  C: "Blackjack",
  D: "Dart",
  E: "Holznagelklopfen (Hammer)",
  F: "Mario Kart",
};

// Runden 1–9 aus deinem Plan (A–F werden via GAME_MAP umbenannt)
const ROUNDS = [
  { round: 1, pause: "Team1", matches: [
    { game: "E", a: "Team2", b: "Team7" },
    { game: "D", a: "Team3", b: "Team6" },
    { game: "B", a: "Team4", b: "Team5" },
  ]},
  { round: 2, pause: "Team6", matches: [
    { game: "B", a: "Team1", b: "Team7" },
    { game: "D", a: "Team2", b: "Team5" },
    { game: "C", a: "Team3", b: "Team4" },
  ]},
  { round: 3, pause: "Team4", matches: [
    { game: "F", a: "Team1", b: "Team6" },
    { game: "C", a: "Team7", b: "Team5" },
    { game: "E", a: "Team2", b: "Team3" },
  ]},
  { round: 4, pause: "Team2", matches: [
    { game: "E", a: "Team1", b: "Team5" },
    { game: "A", a: "Team6", b: "Team4" },
    { game: "B", a: "Team7", b: "Team3" },
  ]},
  { round: 5, pause: "Team7", matches: [
    { game: "D", a: "Team1", b: "Team4" },
    { game: "A", a: "Team5", b: "Team3" },
    { game: "B", a: "Team6", b: "Team2" },
  ]},
  { round: 6, pause: "Team5", matches: [
    { game: "C", a: "Team1", b: "Team3" },
    { game: "F", a: "Team4", b: "Team2" },
    { game: "A", a: "Team6", b: "Team7" },
  ]},
  { round: 7, pause: "Team3", matches: [
    { game: "A", a: "Team1", b: "Team2" },
    { game: "F", a: "Team4", b: "Team7" },
    { game: "C", a: "Team5", b: "Team6" },
  ]},
  { round: 8, pause: "Team2", matches: [
    { game: "F", a: "Team3", b: "Team5" },
    { game: "E", a: "Team4", b: "Team6" },
    { game: "D", a: "Team1", b: "Team7" },
  ]},
  { round: 9, pause: "Team4", matches: [
    { game: "C", a: "Team1", b: "Team2" },
    { game: "A", a: "Team3", b: "Team6" },
    { game: "B", a: "Team5", b: "Team7" },
  ]},
];

// ====== Speicherung ======
const STORAGE_KEY = "spieleabend_v1";

// state.results[roundIndex][matchIndex] = "A" | "D" | "B" | null
// A => Team a gewinnt, B => Team b gewinnt, D => Draw
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { results: createEmptyResults() };
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.results) return { results: createEmptyResults() };
    return parsed;
  } catch {
    return { results: createEmptyResults() };
  }
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function createEmptyResults() {
  return ROUNDS.map(r => r.matches.map(_ => null));
}

// ====== Punkteberechnung ======
function computePoints(state) {
  const pts = Object.fromEntries(TEAMS.map(t => [t, 0]));

  state.results.forEach((roundRes, rIdx) => {
    roundRes.forEach((res, mIdx) => {
      if (!res) return;
      const match = ROUNDS[rIdx].matches[mIdx];
      const a = match.a, b = match.b;

      if (res === "A") {
        pts[a] += 3;
      } else if (res === "B") {
        pts[b] += 3;
      } else if (res === "D") {
        pts[a] += 1;
        pts[b] += 1;
      }
    });
  });

  return pts;
}

// ====== Routing (Hash) ======
function getRoundFromHash() {
  const m = location.hash.match(/round=(\d+)/);
  const n = m ? parseInt(m[1], 10) : 1;
  return clamp(n, 1, ROUNDS.length);
}
function setRoundHash(round) {
  location.hash = `#round=${round}`;
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// ====== Render ======
const els = {
  scoreTable: document.getElementById("scoreTable"),
  matchesContainer: document.getElementById("matchesContainer"),
  roundLabel: document.getElementById("roundLabel"),
  pauseLabel: document.getElementById("pauseLabel"),
  prevBtn: document.getElementById("prevRoundBtn"),
  nextBtn: document.getElementById("nextRoundBtn"),
  roundDots: document.getElementById("roundDots"),
  resetBtn: document.getElementById("resetBtn"),
};

let state = loadState();
let currentRound = getRoundFromHash();

function renderAll() {
  renderScoreboard();
  renderRoundNav();
  renderMatches();
}

function renderScoreboard() {
  const pts = computePoints(state);

  // sortiert nach Punkten (desc), dann Name
  const sorted = [...TEAMS].sort((t1, t2) => {
    const d = pts[t2] - pts[t1];
    return d !== 0 ? d : t1.localeCompare(t2);
  });

  els.scoreTable.innerHTML = "";
  sorted.forEach(team => {
    const pill = document.createElement("div");
    pill.className = "team-pill";
    pill.innerHTML = `
      <div class="team-name">${team}</div>
      <div class="team-points">${pts[team]}</div>
    `;
    els.scoreTable.appendChild(pill);
  });
}

function renderRoundNav() {
  const roundObj = ROUNDS[currentRound - 1];
  els.roundLabel.textContent = `Runde ${roundObj.round}`;
  els.pauseLabel.textContent = `Pause: ${roundObj.pause}`;

  els.prevBtn.disabled = currentRound === 1;
  els.nextBtn.disabled = currentRound === ROUNDS.length;

  // Dots
  els.roundDots.innerHTML = "";
  for (let r = 1; r <= ROUNDS.length; r++) {
    const btn = document.createElement("button");
    btn.className = "dot" + (r === currentRound ? " active" : "");
    btn.type = "button";
    btn.textContent = String(r);
    btn.addEventListener("click", () => setRoundHash(r));
    els.roundDots.appendChild(btn);
  }
}

function renderMatches() {
  const roundIdx = currentRound - 1;
  const round = ROUNDS[roundIdx];

  els.matchesContainer.innerHTML = "";

  round.matches.forEach((m, matchIdx) => {
    const res = state.results[roundIdx][matchIdx]; // "A"|"D"|"B"|null

    const card = document.createElement("div");
    card.className = "match";

    const gameName = GAME_MAP[m.game] ?? m.game;

    card.innerHTML = `
      <div class="match-top">
        <div class="game-badge">${gameName}</div>
        <div class="teams">
          <span>${m.a}</span>
          <span class="vs">vs</span>
          <span>${m.b}</span>
        </div>
      </div>

      <div class="result-row">
        <button class="result-btn ${res==="A" ? "selected winA" : ""}" data-res="A" type="button">🏆 ${m.a}</button>
        <button class="result-btn ${res==="D" ? "selected draw" : ""}" data-res="D" type="button">🤝 Unentschieden</button>
        <button class="result-btn ${res==="B" ? "selected winB" : ""}" data-res="B" type="button">🏆 ${m.b}</button>
      </div>

      <div class="small-muted">Tip: Klick auf das gleiche Ergebnis nochmal → setzt es zurück.</div>
    `;

    // Events
    card.querySelectorAll(".result-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const chosen = btn.getAttribute("data-res");
        const current = state.results[roundIdx][matchIdx];
        state.results[roundIdx][matchIdx] = (current === chosen) ? null : chosen;

        saveState(state);
        renderAll();
      });
    });

    els.matchesContainer.appendChild(card);
  });
}

// ====== Events ======
window.addEventListener("hashchange", () => {
  currentRound = getRoundFromHash();
  renderAll();
});

els.prevBtn.addEventListener("click", () => setRoundHash(currentRound - 1));
els.nextBtn.addEventListener("click", () => setRoundHash(currentRound + 1));

els.resetBtn.addEventListener("click", () => {
  const ok = confirm("Wirklich alles zurücksetzen? (Ergebnisse & Punkte)");
  if (!ok) return;
  state = { results: createEmptyResults() };
  saveState(state);
  renderAll();
});

// Initial
if (!location.hash) setRoundHash(1);
currentRound = getRoundFromHash();
renderAll();
