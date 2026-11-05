// FunGenomics Live — host controller (projector screen)
import { getDB, JOKERS, LETTERS, initTheme, esc, demoBanner, normText, burstConfetti, synthFX } from "./db.js";

const $ = (s) => document.querySelector(s);
const QUIZ1 = ["2.1", "2.2", "3", "4"];
const TYPES = ["Scenario", "Figure", "Order", "Match", "Write", "Bonus"];
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
  const typeLabel = { Scenario: "Scenario", Figure: "Figure", Order: "🧩 Order", Match: "🔗 Match", Write: "✍️ Write", Bonus: "🔥 Bonus" };
  $("#typeChecks").innerHTML = TYPES.map((t) =>
    `<label><input type="checkbox" value="${t}" checked> ${typeLabel[t] || t}</label>`).join("");
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
    streaks: Object.fromEntries(groups.map((g) => [g.id, 0])),
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
    if (st.phase === "over") { play("award"); burstConfetti(48); if (soundOn) synthFX("fanfare"); }
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
  const ready = Object.values(game.players || {}).filter((p) => Object.keys(JOKERS).every((k) => p.read?.[k])).length;
  $("#readyCount").textContent = n ? `📖 ${ready} / ${n} have read the rules` : "";
  $("#lobbyGroups").innerHTML = groups().map((g) => {
    const ps = playersIn(g.id);
    return `<div class="card lg-card"><h4>${esc(g.name)} <span class="pill">${ps.length}</span></h4>
      <ul>${ps.length ? ps.map(([id, p]) => {
        const n = Object.keys(JOKERS).filter((k) => p.read?.[k]).length, all = n === Object.keys(JOKERS).length;
        return `<li class="${all ? "read" : ""}" title="${all ? "Read all rules" : `Read ${n} of ${Object.keys(JOKERS).length} jokers`}">${all ? "📖 " : ""}${esc(p.name)} <button data-kick="${id}" title="Remove">✕</button></li>`;
      }).join("") : `<li class="empty">Waiting…</li>`}</ul></div>`;
  }).join("");
  $("#lobbyGroups").onclick = (e) => { const k = e.target.dataset.kick; if (k) db.remove(`games/${code}/players/${k}`); };
}

function renderQuestion() {
  show("#vQuestion");
  const st = S(), q = st.question;
  if (!q) return;
  $("#qNum").textContent = `Question ${st.qIndex + 1} of ${st.total}`;
  $("#qWeek").textContent = `Week ${q.week} · ${q.week_title}`;
  const badgeMap = {
    Order: ["🧩 Order Pipeline · 2 pts", "accent"],
    Match: ["🔗 Match Pairs · 2 pts", "purple"],
    Write: ["✍️ Written · 2 pts", "warn"],
    Figure: ["Figure · 1 pt", "purple"],
    Scenario: ["Scenario · 1 pt", ""],
  };
  const [bTxt, bCls] = q.is_bonus ? ["🔥 Bonus · 2 pts", "warn"] : (badgeMap[q.type] || [q.type, ""]);
  $("#qType").textContent = bTxt;
  $("#qType").className = "pill " + bCls;
  $("#qPrompt").style.whiteSpace = "pre-line";
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
  const res = st.reveal?.results || {};
  const box = $("#qOptions");

  if (q.type === "Order") {
    box.className = "options host-options";
    const list = revealed ? (st.reveal.steps || q.options) : q.options;
    const winners = revealed ? groups().filter((g) => res[g.id]?.correct).map((g) => `<span class="tag">${esc(g.name)}</span>`).join("") : "";
    box.innerHTML = list.map((step, i) =>
      `<div class="opt ${revealed ? "correct" : ""}"><span class="letter">${revealed ? i + 1 : "?"}</span><span class="txt">${esc(step)}</span><span class="tags">${i === list.length - 1 ? winners : ""}</span></div>`
    ).join("");
  } else if (q.type === "Match") {
    box.className = "match-host-grid";
    if (!revealed) {
      box.innerHTML = `
        <div class="match-col"><h4>Terms / Platforms</h4>${(q.lefts || []).map((l, i) => `<div class="opt"><span class="letter">${i + 1}</span><span class="txt">${esc(l)}</span></div>`).join("")}</div>
        <div class="match-col"><h4>Shuffled Definitions</h4>${(q.options || []).map((r, i) => `<div class="opt"><span class="letter">${LETTERS[i]}</span><span class="txt">${esc(r)}</span></div>`).join("")}</div>`;
    } else {
      const pairs = st.reveal.pairs || [];
      box.innerHTML = pairs.map((p, i) =>
        `<div class="opt correct" style="grid-column:1/-1"><span class="letter">${i + 1}</span><span class="txt"><b>${esc(p.left)}</b>  ➔  ${esc(p.right)}</span></div>`
      ).join("");
    }
  } else if (q.type === "Write") {
    box.className = "card write-host-box";
    if (!revealed) {
      box.innerHTML = `<p class="muted" style="font-size:1.2rem">✍️ <b>Short-answer round:</b> Groups are typing their answer on their phones (no multiple-choice options).</p>`;
    } else {
      box.innerHTML = `
        <div class="opt correct"><span class="letter">✓</span><span class="txt">Correct Answer: <b class="mono">${esc(st.reveal.answer)}</b></span></div>
        <div class="write-answers-grid">${groups().map((g) => {
          const typed = (picks[g.id]?.opts || [])[0] || "";
          const r = res[g.id] || {};
          const canAccept = typed && !r.correct;
          return `<div class="write-ans-card ${r.correct ? "correct" : typed ? "wrong" : ""}">
            <div class="gname"><span>${esc(g.name)}</span>${canAccept ? `<button class="btn good" style="padding:.25em .6em;font-size:.78rem" data-accept-write="${g.id}">✓ Accept</button>` : r.correct ? `<span>✅ +${r.pts}</span>` : ""}</div>
            <div class="val">${typed ? esc(typed) : "<span class='muted'>—</span>"}</div>
          </div>`;
        }).join("")}</div>`;
      box.onclick = (e) => {
        const gid = e.target.dataset?.acceptWrite;
        if (gid) acceptWrittenAnswer(gid);
      };
    }
  } else {
    box.className = "options host-options";
    box.innerHTML = (q.options || []).map((o, i) => {
      let cls = "opt";
      let tags = "";
      if (revealed) {
        const who = groups().filter((g) => (picks[g.id]?.opts || []).includes(o));
        tags = who.map((g) => `<span class="tag">${esc(g.name)}</span>`).join("");
        cls += o === st.reveal.answer ? " correct" : who.length ? " wrong" : " dim";
      }
      return `<div class="${cls}"><span class="letter">${LETTERS[i]}</span><span class="txt">${esc(o)}</span><span class="tags">${tags}</span></div>`;
    }).join("");
  }

  const ex = $("#qExplain");
  if (revealed) {
    ex.classList.remove("hidden");
    const tel = [];
    if (st.reveal.fastest) tel.push(`<span class="pill good">⚡ Fastest: ${esc(st.reveal.fastest)}</span>`);
    if (st.reveal.trap) tel.push(`<span class="pill bad">🪤 Class Trap: ${esc(st.reveal.trap)}</span>`);
    const telHtml = tel.length ? `<div class="telemetry-bar rise">${tel.join("")}</div>` : "";
    ex.innerHTML =
      telHtml +
      (st.reveal.explanation ? `<div class="card explain rise"><h4>💡 Scientific explanation</h4><p>${esc(st.reveal.explanation)}</p></div>` : "") +
      (st.reveal.rubric ? `<div class="card explain bonus rise"><h4>📋 Verbal defence rubric</h4><p>${esc(st.reveal.rubric)}</p></div>` : "");
    if (!ex.dataset.shown) { ex.dataset.shown = "1"; setTimeout(() => ex.scrollIntoView({ behavior: "smooth", block: "nearest" }), 350); }
    $("#timer .num").textContent = "✓";
    $("#timer .bar").style.strokeDashoffset = 0;
    $("#timer").classList.remove("low");
  } else { ex.classList.add("hidden"); ex.innerHTML = ""; delete ex.dataset.shown; }

  // group status sidebar
  $("#groupStatus").innerHTML = groups().map((g) => {
    const locked = !!picks[g.id];
    const jk = Object.keys(JOKERS).filter((k) => jokerUsedNow(g.id, k)).map((k) => JOKERS[k].emoji).join("");
    const streak = game.streaks?.[g.id] || 0;
    const streakBadge = streak >= 2 ? `<span class="streak-pill" title="${streak} correct in a row!">🔥 ${streak}×</span>` : "";
    let delta = "";
    if (revealed && res[g.id]) {
      const r = res[g.id];
      delta = r.pending ? `<span class="delta pill warn">defend</span>` : r.pts ? `<span class="delta" style="color:var(--good)">+${r.pts}</span>` : "";
    }
    const own = st.phase === "question" && st.deadline?.[g.id] != null && !locked
      ? `<span class="own-t mono" data-g="${g.id}"></span>` : "";
    return `<div class="gs ${locked ? "locked" : ""}"><span class="dot"></span><span>${esc(g.name)}${streakBadge} <span class="jk">${jk}</span>${own}</span>
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
  let options = [], lefts = null, placeholder = null;
  if (q.type === "Order") {
    options = shuffle([...q.steps]);
    if (options.every((x, idx) => x === q.steps[idx]) && options.length > 1) [options[0], options[1]] = [options[1], options[0]];
  } else if (q.type === "Match") {
    lefts = q.pairs.map((p) => p.left);
    options = shuffle(q.pairs.map((p) => p.right));
  } else if (q.type === "Write") {
    options = [];
    placeholder = q.placeholder || "Type your answer...";
  } else {
    options = buildOptions(q);
  }
  const now = db.serverNow();
  await db.set(`games/${code}/state`, {
    phase: "question", qIndex: i, qKey: `q${i}`, total: deck.length,
    question: { id: q.id, week: String(q.week), week_title: q.week_title, type: q.type, is_bonus: !!q.is_bonus,
                prompt: q.prompt, figure: q.figure_asset || null, options, lefts, placeholder },
    startedAt: now, endsAt: now + game.config.timer * 1000, duration: game.config.timer * 1000, paused: false, pausedAt: null,
  });
}

async function reveal() {
  const st = S(), q = deck[st.qIndex];
  const picks = picksNow();
  const results = {};
  const scores = { ...(game.scores || {}) };
  const streaks = { ...(game.streaks || {}) };

  groups().forEach((g) => {
    const opts = picks[g.id]?.opts || [];
    const mult = jokerUsedNow(g.id, "pcr") ? 2 : 1;
    let correct = false, base = 0, pending = false, hits = 0;

    if (q.type === "Order") {
      correct = opts.length === q.steps.length && opts.every((x, idx) => x === q.steps[idx]);
      base = correct ? 2 : 0;
    } else if (q.type === "Match") {
      const want = new Set(q.pairs.map((p) => `${p.left} => ${p.right}`));
      hits = opts.filter((x) => want.has(x)).length;
      correct = hits === q.pairs.length;
      base = correct ? 2 : hits >= 2 ? 1 : 0;
    } else if (q.type === "Write") {
      const typed = normText(opts[0] || "");
      const valid = new Set([normText(q.answer), ...(q.accepted || []).map(normText)]);
      correct = !!typed && valid.has(typed);
      base = correct ? 2 : 0;
    } else {
      correct = opts.includes(q.answer);
      if (correct) { if (q.is_bonus) pending = true; else base = 1; }
    }

    const pts = base * mult;
    results[g.id] = { correct, pts, pending, mult, hits };
    scores[g.id] = (scores[g.id] || 0) + pts;
    streaks[g.id] = (correct || base > 0) ? (streaks[g.id] || 0) + 1 : 0;
  });

  // Photofinish telemetry (fastest lock)
  let fastest = null;
  if (st.startedAt) {
    const pool = groups().filter((g) => picks[g.id]?.at && (results[g.id]?.correct || results[g.id]?.pts > 0));
    const list = (pool.length ? pool : groups().filter((g) => picks[g.id]?.at))
      .map((g) => ({ name: g.name, dt: Math.max(0.4, (picks[g.id].at - st.startedAt) / 1000), ok: results[g.id]?.correct }))
      .sort((a, b) => a.dt - b.dt);
    if (list.length) fastest = `${list[0].name} (${list[0].dt.toFixed(1)}s${list[0].ok ? " · correct" : ""})`;
  }

  // Class Trap alert (when >= 2 groups pick the same wrong MCQ option)
  let trap = null;
  if (!["Order", "Match", "Write"].includes(q.type)) {
    const wrongCounts = {};
    groups().forEach((g) => {
      (picks[g.id]?.opts || []).forEach((o) => {
        if (o !== q.answer) wrongCounts[o] = (wrongCounts[o] || 0) + 1;
      });
    });
    const topWrong = Object.entries(wrongCounts).sort((a, b) => b[1] - a[1])[0];
    if (topWrong && topWrong[1] >= 2) trap = `${topWrong[1]} groups picked "${topWrong[0]}"`;
  }

  await db.update(`games/${code}`, {
    "state/phase": "revealed",
    "state/reveal": {
      answer: q.answer,
      steps: q.steps || null,
      pairs: q.pairs || null,
      explanation: q.explanation || null,
      rubric: q.bonus_defense_prompt || null,
      fastest,
      trap,
      results,
    },
    scores,
    streaks,
  });
  if (Object.values(results).some((r) => r.pts > 0)) {
    burstConfetti(34);
    setTimeout(() => play("award"), 600);
  }
}

async function acceptWrittenAnswer(gid) {
  const r = S().reveal?.results?.[gid];
  if (!r || r.correct) return;
  const pts = 2 * (r.mult || 1);
  await db.update(`games/${code}`, {
    [`state/reveal/results/${gid}/correct`]: true,
    [`state/reveal/results/${gid}/pts`]: pts,
    [`scores/${gid}`]: (game.scores?.[gid] || 0) + pts,
    [`streaks/${gid}`]: (game.streaks?.[gid] || 0) + 1,
  });
  play("award");
  burstConfetti(28);
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

// Time model: shared `endsAt`, optional per-group `deadline[gid]` (Telomerase / Telomere Shortening).
const nowT = () => (S().paused ? S().pausedAt : db.serverNow());
const groupEnd = (gid) => S().deadline?.[gid] ?? S().endsAt;
const groupLeft = (gid) => Math.max(0, groupEnd(gid) - nowT());
function remainingMs() {            // longest time any group still has
  return Math.max(0, ...groups().map((g) => groupLeft(g.id)));
}
function shifted(d) {
  const out = { endsAt: S().endsAt + d };
  Object.entries(S().deadline || {}).forEach(([g, t]) => (out[`deadline/${g}`] = t + d));
  return out;
}
function togglePause() {
  const st = S();
  if (st.paused) db.update(`games/${code}/state`, { ...shifted(db.serverNow() - st.pausedAt), paused: false, pausedAt: null });
  else db.update(`games/${code}/state`, { paused: true, pausedAt: db.serverNow() });
}
function addTime(s) {
  const st = S();
  if (st.phase === "closed") return db.update(`games/${code}/state`, { phase: "question", paused: false, pausedAt: null, endsAt: db.serverNow() + s * 1000, deadline: null });
  db.update(`games/${code}/state`, shifted(s * 1000));
}

// Host is authoritative for jokers that need the answer or change timers.
const seenJokers = new Set();
function handleJokers() {
  const st = S();
  if (st.phase !== "question" || !st.question) return;
  const q = deck[st.qIndex];
  const upd = {};
  const dl = { ...(st.deadline || {}) };
  const end = (gid) => dl[gid] ?? st.endsAt;
  groups().forEach((g) => {
    Object.keys(JOKERS).forEach((k) => {
      if (!jokerUsedNow(g.id, k)) return;
      const id = `${st.qKey}:${g.id}:${k}`;
      if (!seenJokers.has(id)) { seenJokers.add(id); showJokerCinema(g.name, k); }
      if (st.applied?.[`${g.id}_${k}`]) return;
      if (k === "re") {
        upd[`cut/${g.id}`] = shuffle(st.question.options.filter((o) => o !== q.answer)).slice(0, 2);
      } else if (k === "tel") {
        dl[g.id] = end(g.id) + 15000;
      } else if (k === "sho") {
        const cap = nowT() + 10000;
        groups().forEach((h) => { if (h.id !== g.id) dl[h.id] = Math.min(end(h.id), cap); });
      } else return;
      upd[`applied/${g.id}_${k}`] = true;
    });
  });
  if (!Object.keys(upd).length) return;
  Object.entries(dl).forEach(([g, t]) => (upd[`deadline/${g}`] = t));
  db.update(`games/${code}/state`, upd);
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
  document.querySelectorAll(".own-t").forEach((el) => {
    const left = Math.ceil(groupLeft(el.dataset.g) / 1000);
    el.textContent = left > 0 ? ` ⏱ ${left}s` : " ⏱ 0";
    el.classList.toggle("low", left <= 5);
  });
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


function showJokerCinema(groupName, key) {
  const j = JOKERS[key];
  if (!j) return;
  if (soundOn) synthFX(key === "sho" ? "sabotage" : "boost");
  document.querySelector(".joker-cinema")?.remove();
  const d = document.createElement("div");
  d.className = "joker-cinema" + (key === "sho" ? " sabotage" : "");
  d.innerHTML = `<div class="joker-cinema-box">
    <div class="jc-emoji">${j.emoji}</div>
    <div class="jc-title">${esc(groupName)} activated ${esc(j.name)}!</div>
    <div class="jc-sub">${esc(j.desc)}</div>
  </div>`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2400);
}
