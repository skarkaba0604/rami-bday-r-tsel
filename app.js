import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* =========================
   Daten
========================= */

const TEAMS = ["Team1","Team2","Team3","Team4","Team5","Team6","Team7"];

const GAME_MAP = {
  A: "Fifa",
  B: "Bierpong",
  C: "Blackjack",
  D: "Dart",
  E: "Holznagelklopfen (Hammer)",
  F: "Mario Kart",
};

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

/* =========================
   Session & Routing (Hash)
   URL Beispiel:
   .../#round=1&session=party123
========================= */

function parseHash() {
  const h = location.hash.replace("#", "");
  const params = new URLSearchParams(h);
  const round = clamp(parseInt(params.get("round") || "1", 10), 1, ROUNDS.length);
  const session = params.get("session") || "party";
  return { round, session };
}

function setHash({ round, session }) {
  const params = new URLSearchParams();
  params.set("round", String(round));
  params.set("session", session || "party");
  location.hash = `#${params.toString()}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* =========================
   Firestore State
========================= */

function createEmptyResults() {
  // results[roundIndex][matchIndex] = "A" | "D" | "B" | null
  return ROUNDS.map(r => r.matches.map(() => null));
}

let { round: currentRound, session: sessionId } = parseHash();
let state = { results: createEmptyResults() };
let unsub = null;

function sessionRef() {
  return doc(db, "sessions", sessionId);
}

async function ensureSessionDoc() {
  const snap = await getDoc(sessionRef());

  // Wenn Session neu ist ODER noch keine results hat -> results anlegen (merge!)
  if (!snap.exists() || !snap.data()?.results) {
    await setDoc(sessionRef(), {
      results: createEmptyResults(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

async function writeResults(newResults) {
  await setDoc(sessionRef(), {
    results: newResults,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function subscribeSession() {
  if (unsub) unsub();
  unsub = onSnapshot(sessionRef(), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (data?.results) {
      state.results = data.results;
      renderAll();
    }
  });
}

/* =========================
   Punkteberechnung
========================= */

function computePoints() {
  const pts = Object.fromEntries(TEAMS.map(t => [t, 0]));

  state.results.forEach((roundRes, rIdx) => {
    roundRes.forEach((res, mIdx) => {
      if (!res) return;
      const match = ROUNDS[rIdx].matches[mIdx];
      const a = match.a, b = match.b;

      if (res === "A") pts[a] += 3;
      else if (res === "B") pts[b] += 3;
      else if (res === "D") { pts[a] += 1; pts[b] += 1; }
    });
  });

  return pts;
}

/* =========================
   UI (minimal, arbeitet mit deinem styles.css)
========================= */

// Falls du noch den "Firestore Test" Code drin hattest, entfernen wir das nicht.
// Deine index.html hat schon Layout-Container. Hier erwarten wir die IDs:
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

// Safety: falls jemand falsche HTML lädt
const required = Object.entries(els).filter(([_, v]) => !v).map(([k]) => k);
if (required.length) {
  document.body.innerHTML = `
    <div style="padding:16px;font-family:system-ui;color:#fff;background:#111">
      <h2>Fehlende HTML-Elemente</h2>
      <p>Ich finde diese IDs nicht in index.html:</p>
      <pre>${required.join(", ")}</pre>
      <p>Bitte stelle sicher, dass du die richtige index.html-Version nutzt.</p>
    </div>
  `;
  throw new Error("Missing required DOM elements: " + required.join(", "));
}

function renderAll() {
  renderScoreboard();
  renderRoundNav();
  renderMatches();
}

function renderScoreboard() {
  const pts = computePoints();

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
    btn.addEventListener("click", () => setHash({ round: r, session: sessionId }));
    els.roundDots.appendChild(btn);
  }
}

function renderMatches() {
  const roundIdx = currentRound - 1;
  const round = ROUNDS[roundIdx];

  els.matchesContainer.innerHTML = "";

  round.matches.forEach((m, matchIdx) => {
    const res = state.results?.[roundIdx]?.[matchIdx] ?? null;
    const gameName = GAME_MAP[m.game] ?? m.game;

    const card = document.createElement("div");
    card.className = "match";
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

      <div class="small-muted">Klick nochmal auf dasselbe Ergebnis → zurücksetzen.</div>
    `;

    card.querySelectorAll(".result-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const chosen = btn.getAttribute("data-res");
        const current = state.results[roundIdx][matchIdx];
        const next = (current === chosen) ? null : chosen;

        // lokale Kopie updaten (snappy UI)
        const newResults = state.results.map(r => r.slice());
        newResults[roundIdx][matchIdx] = next;
        state.results = newResults;
        renderAll();

        // nach Firestore schreiben -> alle Clients bekommen live update
        await writeResults(newResults);
      });
    });

    els.matchesContainer.appendChild(card);
  });
}

/* =========================
   Events
========================= */

window.addEventListener("hashchange", async () => {
  const parsed = parseHash();
  const sessionChanged = parsed.session !== sessionId;

  currentRound = parsed.round;

  if (sessionChanged) {
    sessionId = parsed.session;
    await ensureSessionDoc();
    subscribeSession();
  }

  renderAll();
});

els.prevBtn.addEventListener("click", () => setHash({ round: currentRound - 1, session: sessionId }));
els.nextBtn.addEventListener("click", () => setHash({ round: currentRound + 1, session: sessionId }));

els.resetBtn.addEventListener("click", async () => {
  const ok = confirm(`Wirklich alles zurücksetzen? (Session: ${sessionId})`);
  if (!ok) return;

  const empty = createEmptyResults();
  state.results = empty;
  renderAll();
  await writeResults(empty);
});

/* =========================
   Start
========================= */

(async function init() {
  // Hash setzen, falls leer
  if (!location.hash) setHash({ round: 1, session: "party" });

  ({ round: currentRound, session: sessionId } = parseHash());

  await ensureSessionDoc();
  subscribeSession();
  renderAll();
})();
