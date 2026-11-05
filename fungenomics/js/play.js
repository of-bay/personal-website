// FunGenomics Live — student phone client
import { getDB, JOKERS, LETTERS, initTheme, esc, demoBanner } from "./db.js";

const $ = (s) => document.querySelector(s);
const CIRC = 263.9;

let db, uid;
let code = null, game = null, unlisten = null;
let pickedGroup = null;
let sel = [];             // local selection before locking
let selKey = null;        // question the selection belongs to
let changing = false;     // PTM change in progress
let wasIn = false;        // joined a game that may later be deleted

init();
async function init() {
  initTheme();
  db = await getDB();
  demoBanner(db);
  uid = await db.uid();

  const params = new URLSearchParams(location.search);
  const urlCode = (params.get("code") || "").toUpperCase();
  $("#nameIn").value = localStorage.getItem("fg-name") || "";
  if (urlCode) { $("#codeIn").value = urlCode; $("#codeField").classList.add("hidden"); watch(urlCode); }
  $("#codeIn").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (e.target.value.length === 4) watch(e.target.value);
  });
  $("#nameIn").addEventListener("input", validate);
  $("#joinForm").addEventListener("submit", join);
  $("#lockBtn").addEventListener("click", lock);
  setInterval(tick, 250);
}

/* ================================================================ join */
function watch(c) {
  if (c === code) return;
  code = c;
  unlisten && unlisten();
  unlisten = db.listen(`games/${c}`, (g) => { game = g; render(); });
}

function validate() {
  $("#joinBtn").disabled = !(game && pickedGroup && $("#nameIn").value.trim());
}

async function join(e) {
  e.preventDefault();
  const name = $("#nameIn").value.trim().slice(0, 24);
  if (!game || !pickedGroup || !name) return;
  localStorage.setItem("fg-name", name);
  try {
    await db.set(`games/${code}/players/${uid}`, { name, group: pickedGroup, at: db.serverNow() });
  } catch (err) { showErr("Could not join: " + err.message); }
}

function showErr(m) { $("#joinErr").textContent = m; $("#joinErr").classList.toggle("hidden", !m); }

/* ============================================================== render */
const S = () => game?.state || {};
const me = () => game?.players?.[uid];
const myGroup = () => (game?.config?.groups || []).find((g) => g.id === me()?.group);
const myPick = () => game?.picks?.[S().qKey]?.[me()?.group];
const used = (key) => game?.jokers?.[me()?.group]?.[key];
const usedNow = (key) => used(key) === S().qKey;

function show(id) { ["#vJoin", "#vWait", "#vQ"].forEach((v) => $(v).classList.toggle("hidden", v !== id)); }

function render() {
  if (!game && wasIn) {
    renderEnded(); return;
  }
  if (!game) {
    if (code && code.length === 4) {
      show("#vJoin"); $("#codeField").classList.remove("hidden");
      $("#groupPick").innerHTML = `<p class="muted">No game with code <b class="mono">${esc(code)}</b>. Check the code on the screen.</p>`;
    }
    validate(); return;
  }
  if (!me()) return renderJoin();
  wasIn = true;

  const g = myGroup();
  $("#meChip").textContent = `${me().name} · ${g?.name || ""}`;
  $("#meChip").classList.remove("hidden");

  const ph = S().phase;
  if (ph === "lobby") renderWait("⏳", "You're in!", `Waiting for the instructor to start. You are in <b>${esc(g?.name)}</b>.`, true, false);
  else if (ph === "board") renderWait("📊", "Leaderboard", "Next question coming up…", false, true);
  else if (ph === "over") renderWait("🏆", "Game over!", finalLine(), false, true);
  else renderQuestion();
}

function renderEnded() {
  ["#vJoin", "#vQ"].forEach((v) => $(v).classList.add("hidden"));
  $("#vWait").classList.remove("hidden");
  $("#actionBar").classList.add("hidden");
  $("#waitEmoji").textContent = "👋";
  $("#waitTitle").textContent = "Thanks for playing!";
  $("#waitText").innerHTML = "This game has been closed by the instructor.";
  $("#teamMates").innerHTML = ""; $("#miniBoard").innerHTML = "";
}

function renderJoin() {
  show("#vJoin");
  $("#meChip").classList.add("hidden");
  $("#actionBar").classList.add("hidden");
  const counts = {};
  Object.values(game.players || {}).forEach((p) => (counts[p.group] = (counts[p.group] || 0) + 1));
  $("#groupPick").innerHTML = (game.config.groups || []).map((g) =>
    `<button type="button" data-g="${g.id}" class="${pickedGroup === g.id ? "on" : ""}">${esc(g.name)}<small>${counts[g.id] || 0} joined</small></button>`).join("");
  $("#groupPick").onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    pickedGroup = b.dataset.g; renderJoin();
  };
  if (S().phase === "over") showErr("This game has ended."); else showErr("");
  validate();
}

function rankedGroups() {
  return (game.config.groups || []).map((g) => ({ ...g, pts: game.scores?.[g.id] ?? 0 })).sort((a, b) => b.pts - a.pts);
}
function finalLine() {
  const r = rankedGroups(); const i = r.findIndex((g) => g.id === me().group);
  return i === 0 ? "🎉 Your group won! Congratulations!" : `Your group finished <b>#${i + 1}</b>. Well played!`;
}

function renderWait(emoji, title, text, mates, board) {
  show("#vWait");
  $("#actionBar").classList.add("hidden");
  $("#waitEmoji").textContent = emoji;
  $("#waitTitle").textContent = title;
  $("#waitText").innerHTML = text;
  const ms = Object.values(game.players || {}).filter((p) => p.group === me().group);
  $("#teamMates").innerHTML = mates ? ms.map((p) => `<span>${esc(p.name)}</span>`).join("") : "";
  $("#miniBoard").innerHTML = board ? rankedGroups().map((g, i) =>
    `<div class="mb-row ${g.id === me().group ? "me" : ""}"><span class="r">${i + 1}</span><span>${esc(g.name)}</span><span class="p">${g.pts}</span></div>`).join("") : "";
}

function renderQuestion() {
  show("#vQ");
  const st = S(), q = st.question; if (!q) return;
  if (selKey !== st.qKey) { sel = []; selKey = st.qKey; changing = false; }

  $("#qMeta").textContent = `Q${st.qIndex + 1}/${st.total} · Week ${q.week}`;
  $("#qBonus").classList.toggle("hidden", !q.is_bonus);
  $("#qPrompt").textContent = q.prompt;
  const fig = $("#qFigure");
  if (q.figure) {
    fig.classList.remove("hidden");
    const img = fig.querySelector("img");
    if (!img.src.endsWith(q.figure)) img.src = `figures/${q.figure}`;
    fig.onclick = () => lightbox(img.src);
  } else fig.classList.add("hidden");

  const pick = myPick();
  const open = st.phase === "question" && !st.paused;
  const revealed = st.phase === "revealed";
  const maxSel = usedNow("alt") ? 2 : 1;
  const canEdit = open && (!pick || changing);
  const cut = st.cut?.[me().group] || [];
  const chosen = pick && !changing ? pick.opts || [] : sel;

  // lock banner
  const lb = $("#lockBanner");
  if (pick && !revealed) {
    const txt = (pick.opts || []).map((o) => `${LETTERS[q.options.indexOf(o)]}. ${esc(o)}`).join(" + ");
    const canChange = open && usedNow("ptm") && !pick.changes && !changing;
    lb.className = "lock-banner";
    lb.innerHTML = `🔒 <span>Locked${pick.uid === uid ? "" : ` by ${esc(pick.by)}`}: ${txt}</span>` +
      (canChange ? `<button class="btn" id="ptmChange">🧬 Change</button>` : "");
    lb.classList.toggle("hidden", changing);
    const pc = $("#ptmChange"); if (pc) pc.onclick = () => { changing = true; sel = [...(pick.opts || [])]; render(); };
  } else if (!pick && st.phase === "closed") {
    lb.className = "lock-banner closed"; lb.textContent = "⏰ Time's up — your group did not lock an answer.";
  } else if (st.paused && !revealed) {
    lb.className = "lock-banner closed"; lb.textContent = "⏸ Paused by the instructor";
  } else lb.className = "lock-banner hidden";

  // options
  $("#qOptions").innerHTML = q.options.map((o, i) => {
    let cls = "opt";
    const isSel = chosen.includes(o);
    if (revealed) cls += o === st.reveal.answer ? " correct" : isSel ? " wrong" : " dim";
    else if (cut.includes(o)) cls += " cut";
    else if (isSel) cls += " selected";
    const mark = revealed ? (o === st.reveal.answer ? "✅" : isSel ? "❌" : "") : isSel ? "●" : "";
    return `<button class="${cls}" data-o="${esc(o)}" ${canEdit && !cut.includes(o) ? "" : "disabled"}>
      <span class="letter">${LETTERS[i]}</span><span class="txt">${esc(o)}</span><span class="check">${mark}</span></button>`;
  }).join("");
  $("#qOptions").onclick = (e) => {
    const b = e.target.closest(".opt"); if (!b || b.disabled) return;
    const o = b.dataset.o;
    if (sel.includes(o)) sel = sel.filter((x) => x !== o);
    else sel = maxSel === 1 ? [o] : [...sel, o].slice(-maxSel);
    navigator.vibrate?.(10);
    render();
  };

  // action bar
  const bar = $("#actionBar");
  bar.classList.toggle("hidden", !canEdit);
  $("#lockBtn").disabled = !sel.length;
  $("#lockBtn").textContent = !sel.length ? (maxSel > 1 ? "Select up to 2 answers" : "Select an answer")
    : changing ? "🧬 Confirm change" : `🔒 Lock in for ${myGroup()?.name}`;

  // result
  const rb = $("#resultBox");
  if (revealed) {
    const r = st.reveal.results?.[me().group] || {};
    let html;
    if (r.pending) html = `<div class="result wait rise"><div class="e">🎤</div><h3>Correct — now defend it!</h3><p>Explain your reasoning to the class for up to 2 points.</p></div>`;
    else if (r.correct) html = `<div class="result good rise"><div class="e">🎉</div><h3>Correct! +${r.pts}</h3><p>${r.mult > 1 ? "🧪 PCR doubled your points!" : "Nice work, team."}</p></div>`;
    else html = `<div class="result bad rise"><div class="e">${pick ? "😬" : "⌛"}</div><h3>${pick ? "Not this time" : "No answer locked"}</h3><p>Correct answer: <b>${esc(st.reveal.answer)}</b></p></div>`;
    if (st.reveal.explanation) html += `<div class="card explain"><h4>💡 Explanation</h4><p>${esc(st.reveal.explanation)}</p></div>`;
    rb.innerHTML = html; rb.classList.remove("hidden");
  } else { rb.classList.add("hidden"); rb.innerHTML = ""; }

  // jokers
  $("#jokerBar").classList.toggle("hidden", revealed);
  $("#jokers").innerHTML = Object.entries(JOKERS).map(([k, j]) => {
    const active = usedNow(k);
    const spent = used(k) && !active;
    let allowed = open && !used(k);
    if (k === "alt" || k === "re") allowed = allowed && !pick;
    if (k === "ptm") allowed = allowed && !!pick;
    return `<button class="jk ${active ? "active" : ""}" data-j="${k}" ${allowed ? "" : "disabled"} title="${esc(j.desc)}">
      <span class="e">${j.emoji}</span>${esc(j.name.replace("Amplification", "").replace("Alternative ", "Alt. ").replace("Restriction ", "Restr. "))}${active ? "<br>active" : spent ? "<br>used" : ""}</button>`;
  }).join("");
  $("#jokers").onclick = (e) => {
    const b = e.target.closest(".jk"); if (!b || b.disabled) return;
    const j = JOKERS[b.dataset.j];
    if (confirm(`${j.emoji} Use ${j.name}?\n\n${j.desc}\n\nYour group can use it only once per game.`))
      db.set(`games/${code}/jokers/${me().group}/${b.dataset.j}`, S().qKey).catch((err) => toast("Could not use joker: " + err.message));
  };
}

/* =============================================================== lock */
async function lock() {
  if (!sel.length) return;
  const pick = myPick();
  const data = { opts: sel, by: me().name, uid, changes: pick ? (pick.changes || 0) + 1 : 0, at: db.serverNow() };
  try {
    await db.set(`games/${code}/picks/${S().qKey}/${me().group}`, data);
    changing = false;
    navigator.vibrate?.([20, 40, 20]);
    toast("🔒 Answer locked for your group");
  } catch (err) { toast("Too late — answers are closed."); }
}

/* ============================================================== timer */
function tick() {
  const st = S();
  if (!game || !["question", "closed", "revealed"].includes(st.phase)) return;
  const ms = st.phase !== "question" ? 0 : st.paused ? st.remaining : Math.max(0, st.endsAt - db.serverNow());
  const secs = Math.ceil(ms / 1000);
  $("#timer .num").textContent = st.phase === "revealed" ? "✓" : secs;
  $("#timer .bar").style.strokeDashoffset = CIRC * (1 - (st.duration ? Math.min(1, ms / st.duration) : 0));
  $("#timer").classList.toggle("low", st.phase === "question" && secs <= 5);
  if (st.phase === "question" && ms <= 0 && !$("#actionBar").classList.contains("hidden")) $("#actionBar").classList.add("hidden");
}

function lightbox(src) {
  const d = document.createElement("div");
  d.className = "lightbox"; d.innerHTML = `<img src="${src}" alt="">`;
  d.onclick = () => d.remove(); document.body.appendChild(d);
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2400); }

