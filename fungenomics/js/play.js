// FunGenomics Live — student phone client
import { getDB, JOKERS, RULES, WEEK_TITLES, LETTERS, initTheme, esc, demoBanner, burstConfetti } from "./db.js";

const $ = (s) => document.querySelector(s);
const CIRC = 263.9;

let db, uid;
let code = null, game = null, unlisten = null;
let pickedGroup = null;
let sel = [];             // local selection before locking
let selKey = null;        // question the selection belongs to
let changing = false;     // PTM change in progress
let wasIn = false;        // joined a game that may later be deleted
let activeLeftIdx = 0;    // currently selected left term in Match questions
let studyLog = [];        // local revision sheet for this session
let studyFilterMissed = false;
let celebratedKey = null;
let vibratedShortKey = null;

init();
async function init() {
  initTheme();
  db = await getDB();
  demoBanner(db);
  uid = await db.uid();

  const params = new URLSearchParams(location.search);
  const urlCode = (params.get("code") || "").toUpperCase();
  localStorage.removeItem("fg-name");   // old builds stored real names
  $("#nameIn").value = localStorage.getItem("fg-nick") || randomNick();
  $("#rerollBtn").addEventListener("click", () => { $("#nameIn").value = randomNick(); validate(); });
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
const ADJ = ["Curious", "Clever", "Speedy", "Brave", "Mighty", "Lucky", "Sneaky", "Happy", "Bold", "Cosmic", "Fuzzy", "Glowing", "Silent", "Jolly", "Witty", "Tiny"];
const NOUN = ["Ribosome", "Codon", "Plasmid", "Helicase", "Nucleotide", "Primer", "Exon", "Intron", "Contig", "Polymerase", "Histone", "Operon", "Allele", "Genome", "Read", "K-mer"];
const EMO = ["🧬", "🧪", "🔬", "🦠", "🧫", "⚗️"];
function randomNick() {
  const r = (a) => a[Math.floor(Math.random() * a.length)];
  return `${r(ADJ)} ${r(NOUN)} ${r(EMO)}`;
}

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
  localStorage.setItem("fg-nick", name);
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
const nowT = () => (S().paused ? S().pausedAt : db.serverNow());
const myEnd = () => S().deadline?.[me()?.group] ?? S().endsAt;
const myLeft = () => (S().phase === "question" ? Math.max(0, myEnd() - nowT()) : 0);
const hasRead = (k) => !!me()?.read?.[k];
let expiredKey = null;

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
  const streak = game.streaks?.[me().group] || 0;
  $("#meChip").textContent = `${me().name} · ${g?.name || ""}${streak >= 2 ? ` 🔥${streak}×` : ""}`;
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
  $("#waitEmoji").textContent = "🎓";
  $("#waitTitle").textContent = "Thanks for playing!";
  $("#waitText").innerHTML = "Game closed — your Personalised Revision Sheet is saved below.";
  $("#teamMates").innerHTML = ""; $("#miniBoard").innerHTML = ""; $("#rulesBox").classList.add("hidden");
  renderStudySheet(true);
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
  renderRules(S().phase === "lobby");
  renderStudySheet(S().phase === "over");
}

function renderRules(showIt) {
  const box = $("#rulesBox");
  box.classList.toggle("hidden", !showIt);
  if (!showIt) return;
  const keys = Object.keys(JOKERS), n = keys.filter(hasRead).length;
  box.innerHTML = `
    <h3>📖 How to play</h3>
    <ol class="rules">${RULES.map(([e, t]) => `<li><span>${e}</span><span>${esc(t)}</span></li>`).join("")}</ol>
    <h3>🃏 Your group's jokers <span class="pill ${n === keys.length ? "good" : "warn"}">${n} / ${keys.length} read</span></h3>
    <p class="muted small">Read each joker and tick the box. A joker can only be used from your phone after you've ticked it.</p>
    <div class="jk-list">${keys.map((k) => { const j = JOKERS[k]; return `
      <label class="jk-card ${hasRead(k) ? "done" : ""}">
        <input type="checkbox" data-read="${k}" ${hasRead(k) ? "checked disabled" : ""}>
        <span class="e">${j.emoji}</span>
        <span class="t"><b>${esc(j.name)}</b><span>${esc(j.desc)}</span><small>When: ${esc(j.when)}</small></span>
      </label>`; }).join("")}</div>
    ${n === keys.length ? `<p class="all-read">✅ All set! Wait for the instructor to start.</p>` : ""}`;
  box.onchange = (e) => {
    const k = e.target.dataset.read; if (!k || !e.target.checked) return;
    db.set(`games/${code}/players/${uid}/read/${k}`, true).catch((err) => toast(err.message));
  };
}

function renderQuestion() {
  show("#vQ");
  const st = S(), q = st.question; if (!q) return;
  if (selKey !== st.qKey) { sel = []; selKey = st.qKey; changing = false; activeLeftIdx = 0; }

  $("#qMeta").textContent = `Q${st.qIndex + 1}/${st.total} · Week ${q.week}`;
  const typeBadges = {
    Order: ["🧩 Order 4 Steps · 2 pts", "pill accent"],
    Match: ["🔗 Match 4 Pairs · 2 pts", "pill purple"],
    Write: ["✍️ Written Answer · 2 pts", "pill warn"],
  };
  if (q.is_bonus) {
    $("#qBonus").textContent = "🔥 Bonus · 2 pts";
    $("#qBonus").className = "pill warn";
  } else if (typeBadges[q.type]) {
    $("#qBonus").textContent = typeBadges[q.type][0];
    $("#qBonus").className = typeBadges[q.type][1];
  } else {
    $("#qBonus").classList.add("hidden");
  }
  $("#qPrompt").style.whiteSpace = "pre-line";
  $("#qPrompt").textContent = q.prompt;

  const fig = $("#qFigure");
  if (q.figure) {
    fig.classList.remove("hidden");
    const img = fig.querySelector("img");
    if (!img.src.endsWith(q.figure)) img.src = `figures/${q.figure}`;
    fig.onclick = () => lightbox(img.src);
  } else fig.classList.add("hidden");

  const pick = myPick();
  const open = st.phase === "question" && !st.paused && myLeft() > 0;
  expiredKey = open ? null : st.qKey;
  const revealed = st.phase === "revealed";
  const isMCQ = !["Order", "Match", "Write"].includes(q.type);
  const maxSel = isMCQ && usedNow("alt") ? 2 : 1;
  const canEdit = open && (!pick || changing);
  const cut = st.cut?.[me().group] || [];
  const chosen = pick && !changing ? pick.opts || [] : sel;

  // lock banner
  const lb = $("#lockBanner");
  if (pick && !revealed) {
    let txt = "";
    if (q.type === "Order") txt = (pick.opts || []).map((_, i) => `#${i + 1}`).join(" → ") + " ordered";
    else if (q.type === "Match") txt = `${(pick.opts || []).length} pairs matched`;
    else if (q.type === "Write") txt = `"${esc((pick.opts || [])[0] || "")}"`;
    else txt = (pick.opts || []).map((o) => `${LETTERS[q.options.indexOf(o)]}. ${esc(o)}`).join(" + ");
    const canChange = open && usedNow("ptm") && !pick.changes && !changing;
    lb.className = "lock-banner";
    lb.innerHTML = `🔒 <span>Locked${pick.uid === uid ? "" : ` by ${esc(pick.by)}`}: ${txt}</span>` +
      (canChange ? `<button class="btn" id="ptmChange">🧬 Change</button>` : "");
    lb.classList.toggle("hidden", changing);
    const pc = $("#ptmChange"); if (pc) pc.onclick = () => { changing = true; sel = [...(pick.opts || [])]; render(); };
  } else if (!pick && (st.phase === "closed" || (st.phase === "question" && !st.paused && myLeft() <= 0))) {
    lb.className = "lock-banner closed"; lb.textContent = "⏰ Time's up — your group did not lock an answer.";
  } else if (st.paused && !revealed) {
    lb.className = "lock-banner closed"; lb.textContent = "⏸ Paused by the instructor";
  } else if (!revealed && timeNote()) {
    lb.className = "lock-banner warn"; lb.innerHTML = timeNote();
  } else lb.className = "lock-banner hidden";

  // question interaction body
  const box = $("#qOptions");
  let readyToLock = false;

  if (q.type === "Order") {
    box.className = "options phone-options";
    const steps = revealed ? (st.reveal.steps || q.options) : q.options;
    const head = !revealed && canEdit && chosen.length
      ? `<div class="order-head"><span class="muted small">Tap steps in order (1 → ${steps.length})</span><button type="button" class="btn ghost" style="padding:.25em .6em;font-size:.82rem" id="resetOrderBtn">↺ Reset</button></div>`
      : !revealed ? `<p class="muted small">Tap the 4 steps in chronological order (1 → 4):</p>` : "";
    box.innerHTML = head + steps.map((step, i) => {
      const pos = chosen.indexOf(step);
      const isSel = pos !== -1;
      const cls = "opt " + (revealed ? "correct" : isSel ? "selected" : "");
      const num = revealed ? i + 1 : isSel ? pos + 1 : "·";
      return `<button type="button" class="${cls}" data-o="${esc(step)}" ${canEdit ? "" : "disabled"}>
        <span class="step-num">${num}</span><span class="txt">${esc(step)}</span></button>`;
    }).join("");
    const rb = $("#resetOrderBtn");
    if (rb) rb.onclick = (e) => { e.stopPropagation(); sel = []; render(); };
    box.onclick = (e) => {
      const b = e.target.closest(".opt"); if (!b || b.disabled) return;
      const o = b.dataset.o;
      if (sel.includes(o)) sel = sel.filter((x) => x !== o);
      else sel = [...sel, o];
      navigator.vibrate?.(10);
      render();
    };
    readyToLock = sel.length === (q.options || []).length;
  } else if (q.type === "Match") {
    box.className = "match-phone";
    const lefts = q.lefts || [];
    const rights = q.options || [];
    const map = {};
    chosen.forEach((pairStr) => {
      const [l, r] = pairStr.split(" => ");
      if (l && r) map[l] = r;
    });
    if (!revealed) {
      box.innerHTML = `
        <p class="muted small">Tap a term (1–4), then tap its matching definition below:</p>
        <div class="match-group">${lefts.map((l, idx) => {
          const hasR = !!map[l];
          return `<button type="button" class="match-item ${activeLeftIdx === idx && canEdit ? "active" : ""} ${hasR ? `paired-${idx}` : ""}" data-left-idx="${idx}" ${canEdit ? "" : "disabled"}>
            <span class="pair-tag">${idx + 1}</span>
            <span class="txt"><b>${esc(l)}</b>${hasR ? `<br><small class="muted">➔ ${esc(map[l])}</small>` : ""}</span>
          </button>`;
        }).join("")}</div>
        <div class="match-group">${rights.map((r) => {
          const pairedLeftIdx = lefts.findIndex((l) => map[l] === r);
          return `<button type="button" class="match-item ${pairedLeftIdx !== -1 ? `paired-${pairedLeftIdx}` : ""}" data-right="${esc(r)}" ${canEdit ? "" : "disabled"}>
            <span class="pair-tag">${pairedLeftIdx !== -1 ? pairedLeftIdx + 1 : "?"}</span>
            <span class="txt">${esc(r)}</span>
          </button>`;
        }).join("")}</div>`;
      box.onclick = (e) => {
        const lb = e.target.closest("[data-left-idx]");
        if (lb && !lb.disabled) { activeLeftIdx = +lb.dataset.leftIdx; render(); return; }
        const rb = e.target.closest("[data-right]");
        if (rb && !rb.disabled) {
          const rightVal = rb.dataset.right;
          const leftVal = lefts[activeLeftIdx] || lefts[0];
          sel = sel.filter((s) => {
            const [l, r] = s.split(" => ");
            return l !== leftVal && r !== rightVal;
          });
          sel.push(`${leftVal} => ${rightVal}`);
          const nextUnpaired = lefts.findIndex((l, idx) => idx > activeLeftIdx && !sel.some((s) => s.startsWith(l + " => ")));
          if (nextUnpaired !== -1) activeLeftIdx = nextUnpaired;
          navigator.vibrate?.(10);
          render();
        }
      };
    } else {
      const pairs = st.reveal.pairs || [];
      box.innerHTML = pairs.map((p, idx) => {
        const myR = map[p.left];
        const ok = myR === p.right;
        return `<div class="opt ${ok ? "correct" : "wrong"}"><span class="letter">${idx + 1}</span>
          <span class="txt"><b>${esc(p.left)}</b> ➔ ${esc(p.right)}${myR && !ok ? `<br><small>Your group: ${esc(myR)}</small>` : ""}</span></div>`;
      }).join("");
    }
    readyToLock = sel.length === lefts.length;
  } else if (q.type === "Write") {
    box.className = "write-phone";
    const val = chosen[0] || "";
    if (!revealed) {
      box.innerHTML = `
        <input id="writeIn" class="write-in" maxlength="64" placeholder="${esc(q.placeholder || "Type your answer...")}" value="${esc(val)}" ${canEdit ? "" : "disabled"} autocomplete="off" autocapitalize="characters">
        <p class="muted small">Agree as a group, type your exact answer above, then press Lock.</p>`;
      const inp = $("#writeIn");
      if (inp) {
        inp.oninput = (e) => {
          const v = e.target.value.trim();
          sel = v ? [v] : [];
          $("#lockBtn").disabled = !sel.length;
          $("#lockBtn").textContent = !sel.length ? "Type an answer above" : changing ? "🧬 Confirm change" : `🔒 Lock in for ${myGroup()?.name}`;
        };
        inp.onkeydown = (e) => { if (e.key === "Enter" && sel.length && canEdit) { e.preventDefault(); lock(); } };
      }
    } else {
      const r = st.reveal.results?.[me().group] || {};
      box.innerHTML = `<div class="opt ${r.correct ? "correct" : "wrong"}"><span class="letter">${r.correct ? "✅" : "❌"}</span>
        <span class="txt">Your group: <b class="mono">${val ? esc(val) : "—"}</b><br>Correct answer: <b class="mono">${esc(st.reveal.answer)}</b></span></div>`;
    }
    readyToLock = sel.length > 0 && !!sel[0];
  } else {
    box.className = "options phone-options";
    box.innerHTML = (q.options || []).map((o, i) => {
      let cls = "opt";
      const isSel = chosen.includes(o);
      if (revealed) cls += o === st.reveal.answer ? " correct" : isSel ? " wrong" : " dim";
      else if (cut.includes(o)) cls += " cut";
      else if (isSel) cls += " selected";
      const mark = revealed ? (o === st.reveal.answer ? "✅" : isSel ? "❌" : "") : isSel ? "●" : "";
      return `<button class="${cls}" data-o="${esc(o)}" ${canEdit && !cut.includes(o) ? "" : "disabled"}>
        <span class="letter">${LETTERS[i]}</span><span class="txt">${esc(o)}</span><span class="check">${mark}</span></button>`;
    }).join("");
    box.onclick = (e) => {
      const b = e.target.closest(".opt"); if (!b || b.disabled) return;
      const o = b.dataset.o;
      if (sel.includes(o)) sel = sel.filter((x) => x !== o);
      else sel = maxSel === 1 ? [o] : [...sel, o].slice(-maxSel);
      navigator.vibrate?.(10);
      render();
    };
    readyToLock = sel.length > 0;
  }

  // action bar
  const bar = $("#actionBar");
  bar.classList.toggle("hidden", !canEdit);
  $("#lockBtn").disabled = !readyToLock;
  const promptTxt = q.type === "Order" ? `Order all ${(q.options || []).length} steps (${sel.length}/${(q.options || []).length})`
    : q.type === "Match" ? `Match all ${(q.lefts || []).length} pairs (${sel.length}/${(q.lefts || []).length})`
    : q.type === "Write" ? "Type an answer above"
    : maxSel > 1 ? "Select up to 2 answers" : "Select an answer";
  $("#lockBtn").textContent = !readyToLock ? promptTxt : changing ? "🧬 Confirm change" : `🔒 Lock in for ${myGroup()?.name}`;

  // result
  const rb = $("#resultBox");
  if (revealed) {
    const r = st.reveal.results?.[me().group] || {};
    recordStudyItem(st, q, pick, r);
    if ((r.correct || r.pts > 0) && celebratedKey !== st.qKey) {
      celebratedKey = st.qKey;
      burstConfetti(28);
    }
    let html;
    if (r.pending) html = `<div class="result wait rise"><div class="e">🎤</div><h3>Correct — now defend it!</h3><p>Explain your reasoning to the class for up to 2 points.</p></div>`;
    else if (r.correct) html = `<div class="result good rise"><div class="e">🎉</div><h3>Correct! +${r.pts}</h3><p>${r.mult > 1 ? "🧪 PCR doubled your points!" : "Nice work, team."}</p></div>`;
    else if (r.pts > 0) html = `<div class="result wait rise"><div class="e">👏</div><h3>Partial credit! +${r.pts}</h3><p>You matched ${r.hits || 0} of 4 pairs correctly.</p></div>`;
    else html = `<div class="result bad rise"><div class="e">${pick ? "😬" : "⌛"}</div><h3>${pick ? "Not this time" : "No answer locked"}</h3><p>Correct answer: <b>${esc(st.reveal.answer)}</b></p></div>`;
    if (st.reveal.explanation) html += `<div class="card explain"><h4>💡 Explanation</h4><p>${esc(st.reveal.explanation)}</p></div>`;
    rb.innerHTML = html; rb.classList.remove("hidden");
  } else { rb.classList.add("hidden"); rb.innerHTML = ""; }

  // jokers
  $("#jokerBar").classList.toggle("hidden", revealed);
  $("#jokers").innerHTML = Object.entries(JOKERS).map(([k, j]) => {
    const active = usedNow(k);
    const spent = used(k) && !active;
    const mcqOnly = (k === "alt" || k === "re") && !isMCQ;
    let allowed = open && !used(k) && hasRead(k) && !mcqOnly;
    if (k === "alt" || k === "re" || k === "pcr") allowed = allowed && !pick;
    if (k === "ptm") allowed = allowed && !!pick;
    if (k === "sho") allowed = allowed && myLeft() > 10000;
    const note = active ? "<br>active" : spent ? "<br>used" : !hasRead(k) ? "<br>not read" : mcqOnly ? "<br>MCQ only" : "";
    return `<button class="jk ${active ? "active" : ""}" data-j="${k}" ${allowed ? "" : "disabled"} title="${esc(j.desc)}">
      <span class="e">${j.emoji}</span>${esc(j.short)}${note}</button>`;
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
  const ms = myLeft();
  const secs = Math.ceil(ms / 1000);
  $("#timer .num").textContent = st.phase === "revealed" ? "✓" : secs;
  $("#timer .bar").style.strokeDashoffset = CIRC * (1 - (st.duration ? Math.min(1, ms / st.duration) : 0));
  $("#timer").classList.toggle("low", st.phase === "question" && secs <= 5);
  if (st.phase === "question" && !st.paused && ms <= 0 && expiredKey !== st.qKey) render();
  if (st.phase === "question" && me()) { const tn = timeNote(); const lb = $("#lockBanner");
    if (lb.classList.contains("warn") && tn) lb.innerHTML = tn; }
}

// Explains Telomerase / Telomere Shortening effects on this group's clock.
function timeNote() {
  const st = S(); if (st.phase !== "question" || !me()) return "";
  const mine = me().group, gs = game.config.groups || [];
  const shortBy = gs.filter((g) => g.id !== mine && game.jokers?.[g.id]?.sho === st.qKey).map((g) => esc(g.name));
  const secs = Math.ceil(myLeft() / 1000);
  if (usedNow("tel")) return `🧲 Telomerase: +15 s for your group · <b class="mono">${secs}s</b> left`;
  if (shortBy.length) {
    if (vibratedShortKey !== st.qKey) { vibratedShortKey = st.qKey; navigator.vibrate?.([90, 40, 130]); }
    return `⏳ ${shortBy.join(", ")} used Telomere Shortening! <b class="mono">${secs}s</b> left`;
  }
  return "";
}

function lightbox(src) {
  const d = document.createElement("div");
  d.className = "lightbox"; d.innerHTML = `<img src="${src}" alt="">`;
  d.onclick = () => d.remove(); document.body.appendChild(d);
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2400); }


function recordStudyItem(st, q, pick, r) {
  if (!st.reveal) return;
  // Never store question prompts or answers so questions can be reused in future sessions/quizzes.
  const item = {
    qKey: st.qKey,
    week: q.week,
    title: WEEK_TITLES[q.week] || "Functional Genomics",
    ok: !!r.correct,
    partial: !!(r.pts > 0 && !r.correct),
    explanation: st.reveal.explanation || "",
  };
  const idx = studyLog.findIndex((x) => x.qKey === st.qKey);
  if (idx === -1) studyLog.push(item);
  else studyLog[idx] = item;
  try { sessionStorage.setItem(`fg-study-${code}`, JSON.stringify(studyLog)); } catch {}
}

function renderStudySheet(showIt) {
  const box = $("#studyBox");
  if (!box) return;
  if (!studyLog.length && code) {
    try { studyLog = JSON.parse(sessionStorage.getItem(`fg-study-${code}`)) || []; } catch {}
  }
  if (!showIt || !studyLog.length) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const okCount = studyLog.filter((x) => x.ok).length;
  const toReview = studyLog.filter((x) => !x.ok && x.explanation);

  box.innerHTML = `
    <div class="study-head">
      <div>
        <h3>🎓 Personalised Concept Study Guide</h3>
        <p class="muted small">Your group got <b>${okCount} / ${studyLog.length}</b> fully right. ${toReview.length ? `Below ${toReview.length === 1 ? "is the core concept" : `are the <b>${toReview.length} core concepts</b>`} behind the questions your group missed or got partial credit on (questions &amp; answers are hidden so the game can be replayed).` : "Spotless performance!"}</p>
      </div>
      ${toReview.length ? `<div class="no-print" style="display:flex;gap:.4rem;flex-wrap:wrap">
        <button type="button" class="btn primary" id="stPrintBtn" style="padding:.4em .85em;font-size:.82rem">🖨️ Save / Print PDF</button>
      </div>` : ""}
    </div>
    <div class="jk-list">${toReview.length ? toReview.map((it, idx) => `
      <div class="study-item missed">
        <div class="eyebrow">Concept ${idx + 1} · Week ${esc(it.week)} — ${esc(it.title)} · ${it.partial ? "⚠️ Partial credit" : "📌 Review this topic"}</div>
        <div class="exp-line" style="margin-top:.2rem;color:var(--text);font-size:.95rem">💡 ${esc(it.explanation)}</div>
      </div>`).join("") : `<p class="muted">🎉 Your group answered every single question right — no weak spots detected!</p>`}
    </div>`;

  const printBtn = $("#stPrintBtn");
  if (printBtn) printBtn.onclick = () => window.print();
}
