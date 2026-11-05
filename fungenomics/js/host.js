// FunGenomics Live — host controller (projector screen)
import { getDB, JOKERS, LETTERS, initTheme, esc, demoBanner } from "./db.js";

const $ = (s) => document.querySelector(s);
const QUIZ1 = ["2.1", "2.2", "3", "4"];
const TYPES = ["Scenario", "Figure", "Bonus"];
const CIRC = 276.46;

let db, uid, bank;
let code = null;          // current game code
let game = null;          // live snapshot of games/{code}
let unlisten = null;
let deck = [];            // full question objects (host-only, contains answers)
let lastPhase = null;
let soundOn = localStorage.getItem("fg-sound") !== "off";
let lastTick = null;

const cfg = { groups: 4, names: [], weeks: new Set(QUIZ1), types: new Set(TYPES), count: 15, timer: 45, shuffle: true };

/* ================================================================ boot */
init();
async function init() {
  initTheme();
  db = await getDB({ host: true });
  demoBanner(db);

  // Instructor-only: Google sign-in as ofb.bay@gmail.com
  const gate = (msg) => new Promise((resolve) => {
    show("#vGate");
    $("#gateErr").textContent = msg || ""; $("#gateErr").classList.toggle("hidden", !msg);
    $("#signInBtn").disabled = false;
    $("#signInBtn").onclick = () => { $("#signInBtn").disabled = true; resolve(); };
  });
  gate.error = (m) => { $("#gateErr").textContent = m; $("#gateErr").classList.toggle("hidden", !m); };
  const user = await db.hostUser(gate);
  uid = user.uid;
  if (!db.demo) {
    $("#signOutBtn").classList.remove("hidden");
    $("#signOutBtn").onclick = async () => { await db.signOut(); location.reload(); };
  }

  // Answer bank: private in the database (only the instructor can read it).
  try {
    bank = db.demo ? await (await fetch("data/questions.json")).json() : await db.get("bank");
    if (!bank || !bank.questions) throw new Error("Question bank not found in the database.");
  } catch (e) { gate.error("Could not load questions: " + e.message); show("#vGate"); return; }
  show("#vSetup");
  cleanupOldGames();
  buildSetup();
  wireControls();

  const saved = localStorage.getItem("fg-host-code");
  if (saved) {
    const g = await db.get(`games/${saved}`);
    if (g && g.hostUid === uid && g.state?.phase !== "over") {
      $("#resumeCode").textContent = saved;
      $("#resumeBox").classList.remove("hidden");
      $("#resumeBtn").onclick = () => attach(saved);
      $("#discardBtn").onclick = async () => { await db.remove(`games/${saved}`); localStorage.removeItem("fg-host-code"); $("#resumeBox").classList.add("hidden"); };
    }
  }
  setInterval(tick, 250);
}

/* =============================================================== setup */
function seg(el, values, current, label, onPick) {
  el.innerHTML = "";
  values.forEach((v) => {
    const b = document.createElement("button");
    b.textContent = label(v);
    b.className = v === current ? "on" : "";
    b.onclick = () => { onPick(v); seg(el, values, v, label, onPick); };
    el.appendChild(b);
  });
}

function buildSetup() {
  seg($("#groupSeg"), [2, 3, 4, 5, 6, 7, 8], cfg.groups, (v) => `${v}`, (v) => { cfg.groups = v; renderNames(); });
  seg($("#countSeg"), [10, 15, 20, 25, 0], cfg.count, (v) => (v ? `${v}` : "All"), (v) => { cfg.count = v; updateMatch(); });
  seg($("#timerSeg"), [20, 30, 45, 60, 90], cfg.timer, (v) => `${v}s`, (v) => { cfg.timer = v; });
  renderNames();

  const weeks = [...new Set(bank.questions.map((q) => String(q.week)))].sort((a, b) => parseFloat(a) - parseFloat(b));
  const titles = Object.fromEntries(bank.questions.map((q) => [String(q.week), q.week_title]));
  $("#weekChecks").innerHTML = weeks.map((w) =>
    `<label title="${esc(titles[w])}"><input type="checkbox" value="${w}" ${cfg.weeks.has(w) ? "checked" : ""}> Week ${w}</label>`).join("");
  $("#typeChecks").innerHTML = TYPES.map((t) =>
    `<label><input type="checkbox" value="${t}" checked> ${t === "Bonus" ? "🔥 Bonus" : t}</label>`).join("");
  $("#weekChecks").onchange = (e) => { e.target.checked ? cfg.weeks.add(e.target.value) : cfg.weeks.delete(e.target.value); updateMatch(); };
  $("#typeChecks").onchange = (e) => { e.target.checked ? cfg.types.add(e.target.value) : cfg.types.delete(e.target.value); updateMatch(); };
  document.querySelectorAll("[data-preset]").forEach((b) => b.onclick = () => {
    const p = b.dataset.preset;
    cfg.weeks = new Set(p === "quiz1" ? QUIZ1 : p === "all" ? weeks : []);
    document.querySelectorAll("#weekChecks input").forEach((i) => (i.checked = cfg.weeks.has(i.value)));
    updateMatch();
  });
  $("#shuffleChk").onchange = (e) => (cfg.shuffle = e.target.checked);
  $("#createBtn").onclick = createGame;
  updateMatch();
}

function renderNames() {
  const box = $("#groupNames");
  const prev = [...box.querySelectorAll("input")].map((i) => i.value);
  box.innerHTML = "";
  for (let i = 0; i < cfg.groups; i++) {
    const inp = document.createElement("input");
    inp.value = prev[i] || `Group ${i + 1}`;
    inp.maxLength = 24;
    inp.setAttribute("aria-label", `Name of group ${i + 1}`);
    box.appendChild(inp);
  }
}

function qType(q) { return q.is_bonus ? "Bonus" : q.type; }
function filtered() { return bank.questions.filter((q) => cfg.weeks.has(String(q.week)) && cfg.types.has(qType(q))); }
function updateMatch() {
  const n = filtered().length;
  $("#matchNum").textContent = cfg.count ? `${Math.min(n, cfg.count)} / ${n}` : n;
  $("#createBtn").disabled = n === 0;
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

async function createGame() {
  let qs = filtered();
  if (cfg.shuffle) qs = shuffle([...qs]);
  if (cfg.count) qs = qs.slice(0, cfg.count);
  const names = [...$("#groupNames").querySelectorAll("input")].map((i, k) => i.value.trim() || `Group ${k + 1}`);
  const groups = names.map((name, i) => ({ id: `g${i + 1}`, name }));

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c;
  for (let tries = 0; tries < 10; tries++) {
    c = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    if (!(await db.get(`games/${c}/hostUid`))) break;
  }
  $("#createBtn").disabled = true;
  await db.set(`games/${c}`, {
    hostUid: uid,
    createdAt: db.serverNow(),
    config: { groups, timer: cfg.timer, deck: qs.map((q) => q.id), title: "Functional Genomics" },
    scores: Object.fromEntries(groups.map((g) => [g.id, 0])),
    state: { phase: "lobby", qIndex: -1, total: qs.length },
  });
  localStorage.setItem("fg-host-code", c);
  attach(c);
}

/* ============================================================ live game */
function attach(c) {
  code = c;
  unlisten && unlisten();
  unlisten = db.listen(`games/${c}`, (g) => {
    if (!g) { toast("Game no longer exists."); return; }
    game = g;
    const byId = Object.fromEntries(bank.questions.map((q) => [q.id, q]));
    deck = (g.config.deck || []).map((id) => byId[id]).filter(Boolean);
    render();
    handleJokers();
  });
}

const S = () => game.state || {};
const groups = () => game.config.groups || [];
const picksNow = () => (game.picks && game.picks[S().qKey]) || {};
const jokerUsedNow = (gid, key) => game.jokers?.[gid]?.[key] === S().qKey;
const playersIn = (gid) => Object.entries(game.players || {}).filter(([, p]) => p.group === gid);

function show(id) {
  ["#vGate", "#vSetup", "#vLobby", "#vQuestion", "#vBoard"].forEach((v) => $(v).classList.toggle("hidden", v !== id));
}

function render() {
  const st = S();
  $("#codeChip").textContent = `Code ${code}`;
  $("#codeChip").classList.remove("hidden");
  const inRound = st.qIndex >= 0;
  $("#roundChip").classList.toggle("hidden", !inRound);
  $("#roundChip").textContent = `Q ${st.qIndex + 1} / ${st.total}`;

  if (st.phase !== lastPhase) {
    if (st.phase === "revealed") play("reveal");
    if (st.phase === "closed" && lastPhase === "question") play("buzzer");
    if (st.phase === "over") play("award");
  }
  lastPhase = st.phase;

  if (st.phase === "lobby") renderLobby();
  else if (["question", "closed", "revealed"].includes(st.phase)) renderQuestion();
  else renderBoard();
  renderControls();
}

function renderLobby() {
  show("#vLobby");
  const url = new URL(`play.html?code=${code}`, location.href).href;
  $("#joinUrl").textContent = url.replace(/^https?:\/\//, "");
  $("#codeBig").textContent = code;
  if ($("#qr").dataset.url !== url) {
    const qr = qrcode(0, "M"); qr.addData(url); qr.make();
    $("#qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
    $("#qr").dataset.url = url;
  }
  const n = Object.keys(game.players || {}).length;
  $("#playerCount").textContent = n;
  $("#lobbyGroups").innerHTML = groups().map((g) => {
    const ps = playersIn(g.id);
    return `<div class="card lg-card"><h4>${esc(g.name)} <span class="pill">${ps.length}</span></h4>
      <ul>${ps.length ? ps.map(([id, p]) => `<li>${esc(p.name)} <button data-kick="${id}" title="Remove">✕</button></li>`).join("") : `<li class="empty">Waiting…</li>`}</ul></div>`;
  }).join("");
  $("#lobbyGroups").onclick = (e) => { const k = e.target.dataset.kick; if (k) db.remove(`games/${code}/players/${k}`); };
}

function renderQuestion() {
  show("#vQuestion");
  const st = S(), q = st.question;
  if (!q) return;
  $("#qNum").textContent = `Question ${st.qIndex + 1} of ${st.total}`;
  $("#qWeek").textContent = `Week ${q.week} · ${q.week_title}`;
  $("#qType").textContent = q.is_bonus ? "🔥 Bonus · 2 pts" : q.type;
  $("#qType").className = "pill " + (q.is_bonus ? "warn" : q.type === "Figure" ? "purple" : "");
  $("#qPrompt").textContent = q.prompt;

  const fig = $("#qFigure");
  fig.parentElement.classList.toggle("has-figure", !!q.figure);
  if (q.figure) {
    fig.classList.remove("hidden");
    const img = fig.querySelector("img");
    if (!img.src.endsWith(q.figure)) img.src = `figures/${q.figure}`;
    fig.onclick = () => lightbox(img.src);
  } else fig.classList.add("hidden");

  const revealed = st.phase === "revealed";
  const picks = picksNow();
  $("#qOptions").innerHTML = q.options.map((o, i) => {
    let cls = "opt";
    let tags = "";
    if (revealed) {
      const who = groups().filter((g) => (picks[g.id]?.opts || []).includes(o));
      tags = who.map((g) => `<span class="tag">${esc(g.name)}</span>`).join("");
      cls += o === st.reveal.answer ? " correct" : who.length ? " wrong" : " dim";
    }
    return `<div class="${cls}"><span class="letter">${LETTERS[i]}</span><span class="txt">${esc(o)}</span><span class="tags">${tags}</span></div>`;
  }).join("");

  const ex = $("#qExplain");
  if (revealed) {
    ex.classList.remove("hidden");
    ex.innerHTML =
      (st.reveal.explanation ? `<div class="card explain rise"><h4>💡 Scientific explanation</h4><p>${esc(st.reveal.explanation)}</p></div>` : "") +
      (st.reveal.rubric ? `<div class="card explain bonus rise"><h4>📋 Verbal defence rubric</h4><p>${esc(st.reveal.rubric)}</p></div>` : "");
    if (!ex.dataset.shown) { ex.dataset.shown = "1"; setTimeout(() => ex.scrollIntoView({ behavior: "smooth", block: "nearest" }), 350); }
    $("#timer .num").textContent = "✓";
    $("#timer .bar").style.strokeDashoffset = 0;
    $("#timer").classList.remove("low");
  } else { ex.classList.add("hidden"); ex.innerHTML = ""; delete ex.dataset.shown; }

  // group status sidebar
  const res = st.reveal?.results || {};
  $("#groupStatus").innerHTML = groups().map((g) => {
    const locked = !!picks[g.id];
    const jk = Object.keys(JOKERS).filter((k) => jokerUsedNow(g.id, k)).map((k) => JOKERS[k].emoji).join("");
    let delta = "";
    if (revealed && res[g.id]) {
      const r = res[g.id];
      delta = r.pending ? `<span class="delta pill warn">defend</span>` : r.pts ? `<span class="delta" style="color:var(--good)">+${r.pts}</span>` : "";
    }
    return `<div class="gs ${locked ? "locked" : ""}"><span class="dot"></span><span>${esc(g.name)} <span class="jk">${jk}</span></span>
      <span class="score">${game.scores?.[g.id] ?? 0}${delta}</span></div>`;
  }).join("");

  const nLocked = groups().filter((g) => picks[g.id]).length;
  $("#phaseLabel").textContent =
    st.phase === "question" ? (st.paused ? "⏸ Paused" : `${nLocked} / ${groups().length} groups locked`) :
    st.phase === "closed" ? "⏰ Time's up — answers closed" : "✅ Answer revealed";
}

function renderBoard() {
  show("#vBoard");
  const over = S().phase === "over";
  $("#boardTitle").textContent = over ? "🏆 Final results" : "Leaderboard";
  const ranked = groups().map((g) => ({ ...g, pts: game.scores?.[g.id] ?? 0 })).sort((a, b) => b.pts - a.pts);
  const max = Math.max(1, ...ranked.map((r) => r.pts));
  $("#podium").classList.toggle("hidden", !over);
  if (over) {
    const order = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
    const medal = { 0: "🥇", 1: "🥈", 2: "🥉" };
    $("#podium").innerHTML = order.map((r) => {
      const place = ranked.indexOf(r);
      return `<div class="pod p${place + 1} rise"><div class="medal">${medal[place]}</div><div class="name">${esc(r.name)}</div><div class="block">${r.pts}</div></div>`;
    }).join("");
  }
  $("#bars").innerHTML = ranked.map((r, i) =>
    `<div class="bar-row rise" style="animation-delay:${i * 60}ms"><span class="rank">${i + 1}</span><span>${esc(r.name)}</span>
     <div class="bar-track"><div class="bar-fill" data-w="${(r.pts / max) * 100}"></div></div><span class="pts">${r.pts}</span></div>`).join("");
  requestAnimationFrame(() => document.querySelectorAll(".bar-fill").forEach((b) => (b.style.width = b.dataset.w + "%")));
}

function renderControls() {
  const st = S(), ph = st.phase;
  $("#controls").classList.toggle("hidden", !game || ph === "lobby");
  const live = ph === "question";
  $("#pauseBtn").classList.toggle("hidden", !live);
  $("#pauseBtn").textContent = st.paused ? "▶ Resume" : "⏸ Pause";
  $("#addBtn").classList.toggle("hidden", !(live || ph === "closed"));
  $("#skipBtn").classList.toggle("hidden", !(live || ph === "closed"));
  $("#endBtn").classList.toggle("hidden", ph === "over");

  const last = st.qIndex >= st.total - 1;
  const pb = $("#primaryBtn");
  pb.disabled = false;
  if (ph === "lobby") { pb.textContent = "Start game ▶"; pb.disabled = !deck.length; }
  else if (live || ph === "closed") pb.textContent = "Reveal answer ✓";
  else if (ph === "revealed") pb.textContent = last ? "Final results 🏆" : "Leaderboard →";
  else if (ph === "board") pb.textContent = "Next question ▶";
  else if (ph === "over") pb.textContent = "New game (clears this one)";

  // bonus defence awarding
  const box = $("#bonusAward");
  const res = st.reveal?.results || {};
  const pending = ph === "revealed" ? groups().filter((g) => res[g.id]?.pending) : [];
  box.innerHTML = pending.map((g) => `<div class="bonus-row">🔥 ${esc(g.name)}
      <button class="btn good" data-bonus="${g.id}" data-v="2">Full 2</button>
      <button class="btn warn" data-bonus="${g.id}" data-v="1">Half 1</button>
      <button class="btn" data-bonus="${g.id}" data-v="0">0</button></div>`).join("");
}

/* ============================================================== actions */
function wireControls() {
  $("#primaryBtn").onclick = primary;
  $("#startBtn").onclick = () => nextQuestion();
  $("#pauseBtn").onclick = togglePause;
  $("#addBtn").onclick = () => addTime(15);
  $("#skipBtn").onclick = () => confirm("Skip this question without scoring?") && nextQuestion();
  $("#endBtn").onclick = () => confirm("End the game now and show final results?") && db.update(`games/${code}/state`, { phase: "over" });
  $("#bonusAward").onclick = (e) => { const g = e.target.dataset.bonus; if (g) awardBonus(g, +e.target.dataset.v); };
  $("#soundBtn").onclick = () => { soundOn = !soundOn; localStorage.setItem("fg-sound", soundOn ? "on" : "off"); paintSound(); };
  $("#fsBtn").onclick = toggleFs;
  paintSound();

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === " " || e.key === "Enter") { if (game && !$("#controls").classList.contains("hidden")) { e.preventDefault(); primary(); } }
    else if (e.key === "p" || e.key === "P") game && S().phase === "question" && togglePause();
    else if (e.key === "f" || e.key === "F") toggleFs();
    else if (e.key === "m" || e.key === "M") $("#soundBtn").click();
    else if (e.key === "t" || e.key === "T") document.querySelector("[data-theme-toggle]").click();
    else if (e.key === "Escape") document.querySelector(".lightbox")?.remove();
  });
}

function primary() {
  if (!game) return;
  const ph = S().phase;
  if (ph === "lobby") nextQuestion();
  else if (ph === "question" || ph === "closed") reveal();
  else if (ph === "revealed") {
    if (S().qIndex >= S().total - 1) db.update(`games/${code}/state`, { phase: "over" });
    else db.update(`games/${code}/state`, { phase: "board" });
  }
  else if (ph === "board") nextQuestion();
  else if (ph === "over") { finishAndDelete(); }
}

function buildOptions(q) {
  const pool = shuffle(bank.answer_bank.filter((a) => a !== q.answer)).slice(0, 5);
  return shuffle([q.answer, ...pool]);
}

async function nextQuestion() {
  const i = S().qIndex + 1;
  if (i >= deck.length) return db.update(`games/${code}/state`, { phase: "over" });
  const q = deck[i];
  await db.set(`games/${code}/state`, {
    phase: "question", qIndex: i, qKey: `q${i}`, total: deck.length,
    question: { id: q.id, week: String(q.week), week_title: q.week_title, type: q.type, is_bonus: !!q.is_bonus,
                prompt: q.prompt, figure: q.figure_asset || null, options: buildOptions(q) },
    endsAt: db.serverNow() + game.config.timer * 1000, duration: game.config.timer * 1000, paused: false,
  });
}

async function reveal() {
  const st = S(), q = deck[st.qIndex];
  const picks = picksNow();
  const results = {};
  const scores = { ...(game.scores || {}) };
  groups().forEach((g) => {
    const opts = picks[g.id]?.opts || [];
    const correct = opts.includes(q.answer);
    const mult = jokerUsedNow(g.id, "pcr") ? 2 : 1;
    let pts = 0, pending = false;
    if (correct) { if (q.is_bonus) pending = true; else pts = 1 * mult; }
    results[g.id] = { correct, pts, pending, mult };
    scores[g.id] = (scores[g.id] || 0) + pts;
  });
  await db.update(`games/${code}`, {
    "state/phase": "revealed",
    "state/reveal": { answer: q.answer, explanation: q.explanation || null, rubric: q.bonus_defense_prompt || null, results },
    scores,
  });
  if (Object.values(results).some((r) => r.pts > 0)) setTimeout(() => play("award"), 600);
}

async function awardBonus(gid, v) {
  const r = S().reveal.results[gid];
  const pts = v * (r.mult || 1);
  await db.update(`games/${code}`, {
    [`state/reveal/results/${gid}/pending`]: false,
    [`state/reveal/results/${gid}/pts`]: pts,
    [`scores/${gid}`]: (game.scores?.[gid] || 0) + pts,
  });
  if (pts) play("award");
}

function remainingMs() {
  const st = S();
  return st.paused ? st.remaining : Math.max(0, st.endsAt - db.serverNow());
}
function togglePause() {
  const st = S();
  if (st.paused) db.update(`games/${code}/state`, { paused: false, endsAt: db.serverNow() + st.remaining, remaining: null });
  else db.update(`games/${code}/state`, { paused: true, remaining: remainingMs() });
}
function addTime(s) {
  const st = S();
  if (st.phase === "closed") return db.update(`games/${code}/state`, { phase: "question", paused: false, endsAt: db.serverNow() + s * 1000 });
  if (st.paused) db.update(`games/${code}/state`, { remaining: st.remaining + s * 1000 });
  else db.update(`games/${code}/state`, { endsAt: st.endsAt + s * 1000 });
}

// Restriction Enzyme: host (who knows the answer) cuts 2 wrong options for that group.
function handleJokers() {
  const st = S();
  if (st.phase !== "question" || !st.question) return;
  const q = deck[st.qIndex];
  groups().forEach((g) => {
    if (jokerUsedNow(g.id, "re") && !st.cut?.[g.id]) {
      const wrong = shuffle(st.question.options.filter((o) => o !== q.answer)).slice(0, 2);
      db.set(`games/${code}/state/cut/${g.id}`, wrong);
    }
  });
}

/* ================================================================ timer */
function tick() {
  if (!game || !["question", "closed"].includes(S().phase)) return;
  const st = S();
  const ms = st.phase === "closed" ? 0 : remainingMs();
  const secs = Math.ceil(ms / 1000);
  const frac = st.duration ? Math.min(1, ms / st.duration) : 0;
  $("#timer .num").textContent = secs;
  $("#timer .bar").style.strokeDashoffset = CIRC * (1 - frac);
  $("#timer").classList.toggle("low", secs <= 5);
  if (st.phase === "question" && !st.paused) {
    if (secs <= 5 && secs > 0 && secs !== lastTick) play("tick");
    lastTick = secs;
    if (ms <= 0) db.update(`games/${code}/state`, { phase: "closed" });
  }
}

/* ============================================================ cleanup */
// Nothing is kept long-term: a game is deleted when you start a new one,
// and any game older than 6 hours is removed the next time you sign in.
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
async function cleanupOldGames() {
  if (db.demo) return;
  try {
    const all = (await db.get("games")) || {};
    const now = db.serverNow(), keep = localStorage.getItem("fg-host-code");
    const old = Object.entries(all).filter(([c, g]) => c !== keep && (!g.createdAt || now - g.createdAt > MAX_AGE_MS));
    await Promise.all(old.map(([c]) => db.remove(`games/${c}`)));
    if (old.length) console.info(`Removed ${old.length} old game(s).`);
  } catch (e) { console.warn("Cleanup skipped:", e.message); }
}
async function finishAndDelete() {
  unlisten && unlisten();
  await db.remove(`games/${code}`).catch(() => {});
  localStorage.removeItem("fg-host-code");
  location.href = location.pathname;
}

/* ============================================================== helpers */
const sounds = {};
function play(name) {
  if (!soundOn) return;
  const a = sounds[name] || (sounds[name] = new Audio(`sounds/${name}.wav`));
  a.currentTime = 0; a.play().catch(() => {});
}
function paintSound() { $("#soundBtn").textContent = soundOn ? "🔊" : "🔇"; }
function toggleFs() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
function lightbox(src) {
  const d = document.createElement("div");
  d.className = "lightbox"; d.innerHTML = `<img src="${src}" alt="">`;
  d.onclick = () => d.remove(); document.body.appendChild(d);
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600); }

