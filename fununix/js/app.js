/**
 * app.js — FunUnix Static Web Application (GitHub Pages + Firebase Realtime Database)
 * Supports:
 * 1. Solo Practice (30 Missions across 5 progressive path & command categories)
 * 2. Free Interactive Path Sandbox (walk around the AGU campus folder tree)
 * 3. Individual Student Join (Live Classroom Multiplayer with 4-letter Room Code)
 * 4. Instructor Host Screen (Projector View with QR code & live leaderboard)
 */

import { getDB, demoBanner, burstConfetti } from "./db.js";
import {
  escapeHtml,
  formatInlineMd,
  evaluateCommand,
  renderFolderTree,
  CONSTRAINT_LABELS,
} from "./evaluator.js";

// ── Global State ──────────────────────────────────────────────────────────
let categories = [];
let allQuestions = [];
let questionById = {};

// Solo Practice State
let soloFilter = "ALL";
let soloDeck = [];
let soloIdx = 0;
let soloScore = 0;
let soloAttempted = 0;
let soloStreak = 0;
let soloAnsweredCurrent = false;

// Live Classroom State (Firebase / Demo)
let activeView = "solo"; // "solo", "sandbox", "student", "host"
let studentDb = null;
let studentUid = null;
let studentCode = null;
let studentGame = null;
let studentUnlisten = null;
let lastStudentQKey = null;

let hostDb = null;
let hostUid = null;
let hostCode = null;
let hostGame = null;
let hostUnlisten = null;

// ── Navigation & Modal Controls ───────────────────────────────────────────
const views = {
  solo: document.getElementById("view-solo"),
  sandbox: document.getElementById("view-sandbox"),
  student: document.getElementById("view-student"),
  host: document.getElementById("view-host"),
};

const navButtons = {
  solo: document.getElementById("nav-solo-btn"),
  sandbox: document.getElementById("nav-sandbox-btn"),
  student: document.getElementById("nav-student-btn"),
  host: document.getElementById("nav-host-btn"),
};

function switchView(mode) {
  activeView = mode;
  Object.keys(views).forEach((k) => {
    views[k].hidden = k !== mode;
    navButtons[k].classList.toggle("btn-active", k === mode);
  });
  if (mode === "sandbox") {
    renderSandbox();
  } else if (mode === "student") {
    initStudentMode();
  } else if (mode === "host") {
    initHostMode();
  }
}

Object.keys(navButtons).forEach((mode) => {
  navButtons[mode].addEventListener("click", () => switchView(mode));
});

const rulesModal = document.getElementById("rules-modal");
document.getElementById("open-rules-btn").addEventListener("click", () => {
  rulesModal.showModal();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. SOLO SELF-PACED PRACTICE ARENA (30 MISSIONS)
// ═══════════════════════════════════════════════════════════════════════════

function buildFilterPills() {
  const container = document.getElementById("solo-filter-pills");
  container.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "pill-btn" + (soloFilter === "ALL" ? " active" : "");
  allBtn.textContent = `🌟 All Missions (${allQuestions.length})`;
  allBtn.addEventListener("click", () => applySoloFilter("ALL"));
  container.appendChild(allBtn);

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill-btn" + (soloFilter === cat.id ? " active" : "");
    btn.textContent = cat.label;
    btn.addEventListener("click", () => applySoloFilter(cat.id));
    container.appendChild(btn);
  });
}

function applySoloFilter(filterId) {
  soloFilter = filterId;
  buildFilterPills();
  soloDeck =
    filterId === "ALL"
      ? allQuestions.slice()
      : allQuestions.filter((q) => q.category === filterId);
  soloIdx = 0;
  loadSoloQuestion();
}

function updateSoloStats() {
  document.getElementById("solo-progress-badge").textContent =
    `Mission ${soloIdx + 1} / ${soloDeck.length}`;
  document.getElementById("solo-score-badge").textContent =
    `Score: ${soloScore} / ${soloAttempted}`;
  document.getElementById("solo-streak-badge").textContent =
    `🔥 Streak: ${soloStreak}`;
}

function loadSoloQuestion(triedPath = null) {
  if (!soloDeck.length) return;
  const q = soloDeck[soloIdx];
  soloAnsweredCurrent = false;
  updateSoloStats();

  const catObj = categories.find((c) => c.id === q.category);
  document.getElementById("solo-cat-tag").textContent = catObj ? catObj.label : q.category;
  document.getElementById("solo-constraint-pill").textContent =
    CONSTRAINT_LABELS[q.constraint] || "Mission";
  document.getElementById("solo-title").textContent = `${q.id}: ${q.title}`;
  document.getElementById("solo-task").innerHTML = formatInlineMd(q.task);

  document.getElementById("solo-cwd-label").textContent = q.cwd;
  document.getElementById("solo-home-label").textContent = q.home;

  const folderName = q.cwd === q.home ? "~" : q.cwd.split("/").pop();
  document.getElementById("solo-prompt-prefix").textContent = `ali@agu ${folderName} $`;

  document.getElementById("solo-tree-code").innerHTML = renderFolderTree(
    q.tree,
    q.cwd,
    q.home,
    q.target,
    triedPath
  );

  const input = document.getElementById("solo-cmd-input");
  if (!triedPath) {
    input.value = "";
    document.getElementById("solo-feedback").hidden = true;
  }
  input.focus();
}

function showSoloFeedback(html, styleClass) {
  const box = document.getElementById("solo-feedback");
  box.className = "feedback-box " + styleClass;
  box.innerHTML = html;
  box.hidden = false;
}

document.getElementById("solo-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!soloDeck.length) return;
  const q = soloDeck[soloIdx];
  const cmd = document.getElementById("solo-cmd-input").value.trim();
  if (!cmd) return;

  const res = evaluateCommand(q, cmd);
  document.getElementById("solo-tree-code").innerHTML = renderFolderTree(
    q.tree,
    q.cwd,
    q.home,
    q.target,
    res.resolved_path
  );

  if (res.correct) {
    if (!soloAnsweredCurrent) {
      soloScore += 1;
      soloAttempted += 1;
      soloStreak += 1;
      soloAnsweredCurrent = true;
      burstConfetti(18);
    }
    updateSoloStats();
    showSoloFeedback(formatInlineMd(res.feedback), "ok");
  } else {
    if (!soloAnsweredCurrent) {
      soloAttempted += 1;
      soloStreak = 0;
      soloAnsweredCurrent = true;
    }
    updateSoloStats();
    showSoloFeedback(formatInlineMd(res.feedback), "err");
  }
});

document.getElementById("solo-hint-btn").addEventListener("click", () => {
  if (!soloDeck.length) return;
  const q = soloDeck[soloIdx];
  showSoloFeedback(`💡 <strong>Hint:</strong> ${formatInlineMd(q.hint)}`, "hint");
});

document.getElementById("solo-reveal-btn").addEventListener("click", () => {
  if (!soloDeck.length) return;
  const q = soloDeck[soloIdx];
  showSoloFeedback(
    `👀 <strong>Solution:</strong> <code>${escapeHtml(q.expected_cmd)}</code><br>${formatInlineMd(q.explanation)}`,
    "ok"
  );
});

document.getElementById("solo-prev-btn").addEventListener("click", () => {
  if (soloIdx > 0) {
    soloIdx -= 1;
    loadSoloQuestion();
  }
});

document.getElementById("solo-next-btn").addEventListener("click", () => {
  if (soloIdx + 1 < soloDeck.length) {
    soloIdx += 1;
  } else {
    soloIdx = 0;
  }
  loadSoloQuestion();
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. FREE INTERACTIVE PATH SANDBOX
// ═══════════════════════════════════════════════════════════════════════════

let sandboxTree = {};
let sandboxFiles = {};
let sandboxCwd = "/Users/ali/agu_campus";
const sandboxHome = "/Users/ali";

function resetSandboxData() {
  sandboxTree = {
    "/Users/ali": ["agu_campus", "Desktop"],
    "/Users/ali/Desktop": ["todo.txt"],
    "/Users/ali/agu_campus": ["entrance.txt", "cafeteria", "library", "labs"],
    "/Users/ali/agu_campus/cafeteria": ["menu.txt", "kitchen"],
    "/Users/ali/agu_campus/cafeteria/kitchen": ["fridge.txt"],
    "/Users/ali/agu_campus/library": ["books.txt", ".secret_note", "basement"],
    "/Users/ali/agu_campus/library/basement": ["treasure.txt"],
    "/Users/ali/agu_campus/labs": ["biology_lab"],
    "/Users/ali/agu_campus/labs/biology_lab": ["dna_samples.txt"],
  };
  sandboxFiles = {
    "/Users/ali/Desktop/todo.txt": "1. Practice Unix paths\n2. Finish BENG 105 lab",
    "/Users/ali/agu_campus/entrance.txt":
      "Welcome to AGU Campus! Try walking to cafeteria, library/basement, or labs/biology_lab.",
    "/Users/ali/agu_campus/cafeteria/menu.txt": "lentil_soup 25\ngrilled_chicken 75\ntea 10",
    "/Users/ali/agu_campus/cafeteria/kitchen/fridge.txt": "Milk, cheese, and cold water.",
    "/Users/ali/agu_campus/library/books.txt":
      "Introduction to Programming\nMolecular Biology of the Cell",
    "/Users/ali/agu_campus/library/.secret_note":
      "Hidden clue: You found the secret note with ls -a!",
    "/Users/ali/agu_campus/library/basement/treasure.txt":
      "🏆 Congratulations! You navigated to the basement treasure!",
    "/Users/ali/agu_campus/labs/biology_lab/dna_samples.txt":
      "Sample_01 ATGCGT\nSample_02 GGCCTA",
  };
  sandboxCwd = "/Users/ali/agu_campus";
}

function normSandboxPath(cwd, raw) {
  let p = (raw || "").trim().replace(/^["']|["']$/g, "");
  if (!p || p === "~" || p === "~/") return sandboxHome;
  if (p.startsWith("~/")) p = sandboxHome + "/" + p.slice(2);
  else if (!p.startsWith("/")) p = cwd.replace(/\/$/, "") + "/" + p;
  const parts = p.split("/");
  const stack = [];
  for (const seg of parts) {
    if (!seg || seg === ".") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }
  return "/" + stack.join("/");
}

function renderSandbox() {
  document.getElementById("sandbox-tree-code").innerHTML = renderFolderTree(
    sandboxTree,
    sandboxCwd,
    sandboxHome,
    null,
    null
  );
  document.getElementById("sandbox-cwd-label").textContent = sandboxCwd;
  const folder = sandboxCwd === sandboxHome ? "~" : sandboxCwd.split("/").pop();
  document.getElementById("sandbox-prompt-prefix").textContent = `ali@agu ${folder} $`;
}

function appendSandboxLog(cmd, output) {
  const codeEl = document.getElementById("sandbox-log-code");
  const preEl = document.getElementById("sandbox-log-pre");
  let entry = `\n$ ${cmd}`;
  if (output) entry += `\n${output}`;
  codeEl.textContent += entry;
  preEl.scrollTop = preEl.scrollHeight;
}

document.getElementById("sandbox-reset-btn").addEventListener("click", () => {
  resetSandboxData();
  document.getElementById("sandbox-log-code").textContent =
    "# Sandbox map reset to default!\n# You are standing in /Users/ali/agu_campus";
  renderSandbox();
});

document.getElementById("sandbox-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("sandbox-cmd-input");
  const raw = input.value.trim();
  if (!raw) return;
  input.value = "";

  const parts = raw.split(/\s+/);
  const cmd = parts[0];

  if (cmd === "clear") {
    document.getElementById("sandbox-log-code").textContent = "";
    return;
  }
  if (cmd === "pwd") {
    appendSandboxLog(raw, sandboxCwd);
    return;
  }
  if (cmd === "cd") {
    const targetArg = parts[1] || "~";
    const dest = normSandboxPath(sandboxCwd, targetArg);
    if (Object.prototype.hasOwnProperty.call(sandboxTree, dest)) {
      sandboxCwd = dest;
      appendSandboxLog(raw, `# 📍 Moved to ${sandboxCwd}`);
      renderSandbox();
    } else if (Object.prototype.hasOwnProperty.call(sandboxFiles, dest)) {
      appendSandboxLog(raw, `cd: not a directory: ${targetArg}`);
    } else {
      appendSandboxLog(raw, `cd: no such file or directory: ${targetArg} (looked for ${dest})`);
    }
    return;
  }
  if (cmd === "ls") {
    let showAll = false;
    let pathArg = ".";
    for (const tok of parts.slice(1)) {
      if (tok.startsWith("-")) {
        if (tok.includes("a")) showAll = true;
      } else {
        pathArg = tok;
      }
    }
    const dest = normSandboxPath(sandboxCwd, pathArg);
    if (Object.prototype.hasOwnProperty.call(sandboxTree, dest)) {
      let items = sandboxTree[dest].slice();
      if (!showAll) items = items.filter((x) => !x.startsWith("."));
      else items = [".", "..", ...items];
      appendSandboxLog(raw, items.join("  "));
    } else {
      appendSandboxLog(raw, `ls: ${pathArg}: No such file or directory`);
    }
    return;
  }
  if (cmd === "cat") {
    if (!parts[1]) {
      appendSandboxLog(raw, "cat: please specify a file path");
      return;
    }
    const dest = normSandboxPath(sandboxCwd, parts[1]);
    if (Object.prototype.hasOwnProperty.call(sandboxFiles, dest)) {
      appendSandboxLog(raw, sandboxFiles[dest]);
    } else if (Object.prototype.hasOwnProperty.call(sandboxTree, dest)) {
      appendSandboxLog(raw, `cat: ${parts[1]}: Is a directory`);
    } else {
      appendSandboxLog(raw, `cat: ${parts[1]}: No such file or directory (looked for ${dest})`);
    }
    return;
  }
  if (cmd === "mkdir") {
    if (!parts[1]) {
      appendSandboxLog(raw, "mkdir: missing folder name");
      return;
    }
    const arg = parts[parts.length - 1];
    const dest = normSandboxPath(sandboxCwd, arg);
    const parent = dest.substring(0, dest.lastIndexOf("/")) || "/";
    const base = dest.substring(dest.lastIndexOf("/") + 1);
    if (Object.prototype.hasOwnProperty.call(sandboxTree, parent)) {
      if (!sandboxTree[parent].includes(base)) {
        sandboxTree[parent].push(base);
        sandboxTree[dest] = [];
      }
      appendSandboxLog(raw, `# Created folder ${dest}`);
      renderSandbox();
    } else {
      appendSandboxLog(raw, `mkdir: ${parent}: No such file or directory`);
    }
    return;
  }
  if (cmd === "touch") {
    if (!parts[1]) {
      appendSandboxLog(raw, "touch: missing file name");
      return;
    }
    const dest = normSandboxPath(sandboxCwd, parts[1]);
    const parent = dest.substring(0, dest.lastIndexOf("/")) || "/";
    const base = dest.substring(dest.lastIndexOf("/") + 1);
    if (Object.prototype.hasOwnProperty.call(sandboxTree, parent)) {
      if (!sandboxTree[parent].includes(base)) {
        sandboxTree[parent].push(base);
      }
      sandboxFiles[dest] = "(empty file created with touch)";
      appendSandboxLog(raw, `# Created file ${dest}`);
      renderSandbox();
    } else {
      appendSandboxLog(raw, `touch: ${parent}: No such file or directory`);
    }
    return;
  }

  appendSandboxLog(
    raw,
    "Supported sandbox commands: pwd, ls, ls -a, cd, cat, mkdir, touch, clear"
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. INDIVIDUAL STUDENT JOIN (FIREBASE REALTIME DATABASE)
//    Each student joins individually as their own group (`group: studentUid`)
//    so `database.rules.json` allows each student to lock their own answer!
// ═══════════════════════════════════════════════════════════════════════════

async function initStudentMode() {
  if (!studentDb) {
    studentDb = await getDB({ host: false });
    demoBanner(studentDb);
    studentUid = await studentDb.uid();
  }
  const savedName = localStorage.getItem("fununix_student_name") || "";
  if (savedName && !document.getElementById("student-name-input").value) {
    document.getElementById("student-name-input").value = savedName;
  }
}

document.getElementById("student-join-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await initStudentMode();
  const errEl = document.getElementById("student-join-err");
  errEl.hidden = true;

  const rawCode = document
    .getElementById("student-code-input")
    .value.trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const name = document.getElementById("student-name-input").value.trim().slice(0, 24);
  if (rawCode.length !== 4 || !name) return;

  localStorage.setItem("fununix_student_name", name);
  const btn = document.getElementById("student-join-btn");
  btn.disabled = true;

  try {
    const g = await studentDb.get(`games/${rawCode}`);
    if (!g || !g.hostUid) {
      errEl.textContent = `No active classroom room found with code ${rawCode}. Check the code on the projector.`;
      errEl.hidden = false;
      btn.disabled = false;
      return;
    }

    // Register individual student in `games/{code}/players/{studentUid}` with `group: studentUid`
    await studentDb.set(`games/${rawCode}/players/${studentUid}`, {
      name,
      group: studentUid,
      at: studentDb.serverNow(),
    });

    studentCode = rawCode;
    document.getElementById("student-join-card").hidden = true;
    document.getElementById("student-game-area").hidden = false;
    document.getElementById("student-room-label").textContent = `Room ${rawCode}`;

    if (studentUnlisten) studentUnlisten();
    studentUnlisten = studentDb.listen(`games/${rawCode}`, (liveGame) => {
      studentGame = liveGame;
      renderStudentLive();
    });
  } catch (err) {
    errEl.textContent = `Could not join room: ${err.message || err}`;
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("student-answer-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!studentDb || !studentCode || !studentGame) return;
  const st = studentGame.state || {};
  if (st.phase !== "question" || !st.qKey) return;

  const input = document.getElementById("student-cmd-input");
  const cmd = input.value.trim();
  if (!cmd) return;

  const myName = studentGame.players?.[studentUid]?.name || "Student";
  try {
    await studentDb.set(`games/${studentCode}/picks/${st.qKey}/${studentUid}`, {
      opts: [cmd],
      by: myName,
      uid: studentUid,
      at: studentDb.serverNow(),
    });
    renderStudentLive();
  } catch (err) {
    const fbBox = document.getElementById("student-feedback-box");
    fbBox.hidden = false;
    fbBox.className = "feedback-box err";
    fbBox.textContent = "⏰ Could not lock answer (timer may have expired).";
  }
});

function renderStudentLive() {
  if (!studentGame) return;
  const st = studentGame.state || {};
  const players = studentGame.players || {};
  const scores = studentGame.scores || {};
  const streaks = studentGame.streaks || {};

  const myName = players[studentUid]?.name || "Student";
  const myScore = scores[studentUid] || 0;
  const myStreak = streaks[studentUid] || 0;

  const sortedUids = Object.keys(players).sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  const myRank = Math.max(1, sortedUids.indexOf(studentUid) + 1);

  document.getElementById("student-player-label").textContent = `👤 ${myName}`;
  document.getElementById("student-rank-label").textContent = `Rank: #${myRank} / ${sortedUids.length}`;
  document.getElementById("student-score-badge").textContent = `${myScore} pts`;
  document.getElementById("student-streak-badge").textContent = `🔥 ${myStreak}`;

  if (st.phase === "lobby" || !st.question) {
    document.getElementById("student-lobby-msg").hidden = false;
    document.getElementById("student-round-grid").hidden = true;
    return;
  }

  document.getElementById("student-lobby-msg").hidden = true;
  document.getElementById("student-round-grid").hidden = false;

  const q = questionById[st.question.id] || st.question;
  document.getElementById("student-q-counter").textContent =
    `Round ${(st.qIndex || 0) + 1} / ${st.total || 30}`;
  document.getElementById("student-constraint-pill").textContent =
    CONSTRAINT_LABELS[q.constraint] || "Mission";
  document.getElementById("student-q-title").textContent = `${q.id}: ${q.title}`;
  document.getElementById("student-q-task").innerHTML = formatInlineMd(q.task);
  document.getElementById("student-cwd-label").textContent = q.cwd;

  const myPick = studentGame.picks?.[st.qKey]?.[studentUid];
  const stuInput = document.getElementById("student-cmd-input");
  const stuBtn = document.getElementById("student-submit-btn");
  const fbBox = document.getElementById("student-feedback-box");

  if (lastStudentQKey !== st.qKey) {
    lastStudentQKey = st.qKey;
    stuInput.value = "";
  }

  let triedPath = null;
  if (myPick && myPick.opts && myPick.opts[0]) {
    const evalRes = evaluateCommand(q, myPick.opts[0]);
    triedPath = evalRes.resolved_path;
    stuInput.disabled = true;
    stuBtn.disabled = true;
    fbBox.hidden = false;
    if (st.phase === "revealed") {
      const r = st.reveal?.results?.[studentUid] || {};
      fbBox.className = "feedback-box " + (evalRes.correct ? "ok" : "err");
      fbBox.innerHTML =
        `<strong>Your Command:</strong> <code>${escapeHtml(myPick.opts[0])}</code> (${r.pts ? `+${r.pts} pts` : "0 pts"})<br>` +
        formatInlineMd(evalRes.feedback) +
        `<br><strong>Official Solution:</strong> <code>${escapeHtml(q.expected_cmd)}</code>`;
    } else {
      fbBox.className = "feedback-box " + (evalRes.correct ? "ok" : "hint");
      fbBox.innerHTML =
        `🔒 <strong>Locked:</strong> <code>${escapeHtml(myPick.opts[0])}</code><br>` +
        formatInlineMd(evalRes.feedback);
    }
  } else if (st.phase === "revealed" || st.phase === "closed") {
    stuInput.disabled = true;
    stuBtn.disabled = true;
    fbBox.hidden = false;
    fbBox.className = "feedback-box hint";
    fbBox.innerHTML = `⏰ Round ended! Official solution: <code>${escapeHtml(q.expected_cmd)}</code><br>${formatInlineMd(q.explanation)}`;
  } else {
    stuInput.disabled = false;
    stuBtn.disabled = false;
    fbBox.hidden = true;
  }

  document.getElementById("student-tree-code").innerHTML = renderFolderTree(
    q.tree,
    q.cwd,
    q.home,
    q.target,
    triedPath
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. INSTRUCTOR HOST SCREEN (PROJECTOR VIEW)
// ═══════════════════════════════════════════════════════════════════════════

async function initHostMode() {
  if (hostDb && hostUid) return;
  hostDb = await getDB({ host: true });
  demoBanner(hostDb);

  const gateCard = document.getElementById("host-gate-card");
  const liveArea = document.getElementById("host-live-area");
  const gateErr = document.getElementById("host-gate-err");
  const signInBtn = document.getElementById("host-signin-btn");

  const gate = (msg) =>
    new Promise((resolve) => {
      gateCard.hidden = false;
      liveArea.hidden = true;
      if (msg) {
        gateErr.textContent = msg;
        gateErr.hidden = false;
      } else {
        gateErr.hidden = true;
      }
      signInBtn.disabled = false;
      signInBtn.onclick = () => {
        signInBtn.disabled = true;
        resolve();
      };
    });
  gate.error = (m) => {
    if (m) {
      gateErr.textContent = m;
      gateErr.hidden = false;
    }
  };

  const user = await hostDb.hostUser(gate);
  hostUid = user.uid;
  gateCard.hidden = true;
  liveArea.hidden = false;

  // Populate topic select
  const sel = document.getElementById("host-cat-select");
  if (sel.options.length <= 1) {
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.label;
      sel.appendChild(opt);
    });
  }

  // Resume existing room if available
  const savedCode = localStorage.getItem("fununix_host_code");
  if (savedCode) {
    const existing = await hostDb.get(`games/${savedCode}`);
    if (existing && existing.hostUid === hostUid) {
      attachHostRoom(savedCode);
      return;
    }
  }
  await createHostRoom();
}

async function createHostRoom() {
  if (!hostDb || !hostUid) return;
  const catFilter = document.getElementById("host-cat-select").value;
  const deck = (
    catFilter === "ALL"
      ? allQuestions
      : allQuestions.filter((q) => q.category === catFilter)
  ).map((q) => q.id);

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "UNIX";
  for (let tries = 0; tries < 10; tries++) {
    c = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    if (!(await hostDb.get(`games/${c}/hostUid`))) break;
  }

  await hostDb.set(`games/${c}`, {
    hostUid,
    createdAt: hostDb.serverNow(),
    config: {
      groups: [{ id: "individual", name: "Individual Students" }],
      timer: 45,
      deck,
      title: "FunUnix Path Arena",
    },
    scores: {},
    streaks: {},
    state: {
      phase: "lobby",
      qIndex: -1,
      total: deck.length,
    },
  });

  localStorage.setItem("fununix_host_code", c);
  attachHostRoom(c);
}

function attachHostRoom(c) {
  hostCode = c;
  document.getElementById("host-room-code").textContent = c;
  const joinUrl = new URL(`?mode=student&code=${c}`, window.location.href).href;
  document.getElementById("host-join-url").textContent = joinUrl.replace(/^https?:\/\//, "");

  if (typeof window.qrcode === "function") {
    const qr = window.qrcode(0, "M");
    qr.addData(joinUrl);
    qr.make();
    document.getElementById("host-qr-box").innerHTML = qr.createSvgTag({
      cellSize: 3,
      margin: 0,
      scalable: true,
    });
  }

  if (hostUnlisten) hostUnlisten();
  hostUnlisten = hostDb.listen(`games/${c}`, (g) => {
    hostGame = g;
    renderHostLive();
  });
}

document.getElementById("host-create-btn").addEventListener("click", () => {
  createHostRoom();
});

document.getElementById("host-next-btn").addEventListener("click", async () => {
  if (!hostDb || !hostCode || !hostGame) return;
  const st = hostGame.state || {};
  const deck = hostGame.config?.deck || [];
  const nextIdx = (st.qIndex ?? -1) + 1;
  if (nextIdx >= deck.length) {
    await hostDb.update(`games/${hostCode}/state`, { phase: "over" });
    return;
  }
  const qid = deck[nextIdx];
  const q = questionById[qid];
  if (!q) return;

  const now = hostDb.serverNow();
  const timerSec = hostGame.config?.timer || 45;
  await hostDb.set(`games/${hostCode}/state`, {
    phase: "question",
    qIndex: nextIdx,
    qKey: `q${nextIdx}`,
    total: deck.length,
    question: {
      id: q.id,
      title: q.title,
      category: q.category,
      cwd: q.cwd,
      home: q.home,
      target: q.target,
      constraint: q.constraint,
      task: q.task,
    },
    startedAt: now,
    endsAt: now + timerSec * 1000,
    duration: timerSec * 1000,
    paused: false,
  });
});

document.getElementById("host-reveal-btn").addEventListener("click", async () => {
  if (!hostDb || !hostCode || !hostGame) return;
  const st = hostGame.state || {};
  if (st.phase !== "question" || !st.question) return;
  const q = questionById[st.question.id];
  if (!q) return;

  const players = hostGame.players || {};
  const picks = (hostGame.picks && hostGame.picks[st.qKey]) || {};
  const scores = { ...(hostGame.scores || {}) };
  const streaks = { ...(hostGame.streaks || {}) };
  const results = {};

  Object.keys(players).forEach((uid) => {
    const rawCmd = picks[uid]?.opts?.[0] || "";
    const ev = rawCmd ? evaluateCommand(q, rawCmd) : { correct: false };
    let pts = 0;
    if (ev.correct) {
      const elapsedSec = Math.max(0, ((picks[uid]?.at || st.endsAt) - st.startedAt) / 1000);
      const ratio = Math.max(0, 1 - elapsedSec / 45);
      const speedBonus = Math.round(400 * ratio);
      streaks[uid] = (streaks[uid] || 0) + 1;
      const streakBonus = Math.min(300, (streaks[uid] - 1) * 100);
      pts = 600 + speedBonus + streakBonus;
      scores[uid] = (scores[uid] || 0) + pts;
    } else {
      streaks[uid] = 0;
    }
    results[uid] = {
      correct: ev.correct,
      pts,
      cmd: rawCmd,
    };
  });

  await hostDb.update(`games/${hostCode}`, {
    "state/phase": "revealed",
    "state/reveal": {
      expected_cmd: q.expected_cmd,
      explanation: q.explanation,
      results,
    },
    scores,
    streaks,
  });
  burstConfetti(28);
});

function renderHostLive() {
  if (!hostGame) return;
  const st = hostGame.state || {};
  const players = hostGame.players || {};
  const scores = hostGame.scores || {};
  const streaks = hostGame.streaks || {};
  const picks = (st.qKey && hostGame.picks?.[st.qKey]) || {};

  const playerEntries = Object.entries(players).map(([uid, p]) => ({
    uid,
    name: p.name,
    score: scores[uid] || 0,
    streak: streaks[uid] || 0,
    locked: !!picks[uid],
  }));
  playerEntries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  document.getElementById("host-player-count").textContent = `${playerEntries.length} joined`;
  document.getElementById("host-answered-counter").textContent =
    `${playerEntries.filter((p) => p.locked).length} / ${playerEntries.length} Students Locked`;

  const sbList = document.getElementById("host-scoreboard-list");
  const medals = ["🥇", "🥈", "🥉"];
  if (!playerEntries.length) {
    sbList.innerHTML = '<li class="scoreboard-item" style="color:var(--text2);">No students joined yet.</li>';
  } else {
    sbList.innerHTML = playerEntries
      .map((p, idx) => {
        const medal = idx < 3 ? medals[idx] : `#${idx + 1}`;
        const statusIcon = p.locked ? "✅" : "⏳";
        const stBadge = p.streak > 1 ? ` <span style="color:var(--amber)">🔥${p.streak}</span>` : "";
        return `<li class="scoreboard-item">
          <span>${medal} <strong>${escapeHtml(p.name)}</strong> ${statusIcon}${stBadge}</span>
          <span class="scoreboard-score">${p.score}</span>
        </li>`;
      })
      .join("");
  }

  if (st.phase === "lobby" || !st.question) {
    document.getElementById("host-round-label").textContent = `Lobby · ${st.total || 30} Missions Ready`;
    document.getElementById("host-reveal-box").hidden = true;
    return;
  }

  const q = questionById[st.question.id] || st.question;
  document.getElementById("host-round-label").textContent =
    `Round ${(st.qIndex || 0) + 1} / ${st.total || 30} · ${q.id}`;
  document.getElementById("host-q-title").textContent = `${q.id}: ${q.title}`;
  document.getElementById("host-q-task").innerHTML =
    `<strong>Current Working Directory (<code>pwd</code>):</strong> <code>${escapeHtml(q.cwd)}</code><br><br>` +
    formatInlineMd(q.task);
  document.getElementById("host-tree-code").innerHTML = renderFolderTree(
    q.tree,
    q.cwd,
    q.home,
    q.target,
    null
  );

  const revBox = document.getElementById("host-reveal-box");
  if (st.phase === "revealed" && st.reveal) {
    revBox.hidden = false;
    document.getElementById("host-expected-cmd").textContent = st.reveal.expected_cmd || q.expected_cmd;
    document.getElementById("host-explanation").innerHTML = formatInlineMd(
      st.reveal.explanation || q.explanation
    );
    const resMap = st.reveal.results || {};
    const subItems = playerEntries
      .filter((p) => resMap[p.uid]?.cmd)
      .map((p) => {
        const r = resMap[p.uid];
        return `${r.correct ? "✅" : "❌"} <strong>${escapeHtml(p.name)}</strong>: <code>${escapeHtml(r.cmd)}</code> (+${r.pts} pts)`;
      });
    document.getElementById("host-submissions-list").innerHTML = subItems.length
      ? "<strong>Student Answers:</strong><br>" + subItems.join(" · ")
      : "No answers submitted this round.";
  } else {
    revBox.hidden = true;
  }
}

// Live Timer Tick for Student & Host
setInterval(() => {
  if (studentGame && studentDb) {
    const st = studentGame.state || {};
    if (st.phase === "question" && st.endsAt) {
      const rem = Math.max(0, Math.ceil((st.endsAt - studentDb.serverNow()) / 1000));
      document.getElementById("student-timer-badge").textContent = `⏱️ ${rem}s`;
    } else if (st.phase === "revealed") {
      document.getElementById("student-timer-badge").textContent = "✅ Revealed";
    }
  }
  if (hostGame && hostDb) {
    const st = hostGame.state || {};
    if (st.phase === "question" && st.endsAt) {
      const remMs = Math.max(0, st.endsAt - hostDb.serverNow());
      const remSec = Math.ceil(remMs / 1000);
      document.getElementById("host-timer-label").textContent = `⏱️ ${remSec}s`;
      const pct = st.duration ? Math.min(100, (remMs / st.duration) * 100) : 0;
      document.getElementById("host-timer-bar").style.width = `${pct}%`;
    } else if (st.phase === "revealed") {
      document.getElementById("host-timer-label").textContent = "✅ Revealed";
      document.getElementById("host-timer-bar").style.width = "100%";
    }
  }
}, 250);

// ── Boot Application ──────────────────────────────────────────────────────
async function boot() {
  resetSandboxData();
  const resp = await fetch("data/questions.json");
  const data = await resp.json();
  categories = data.categories || [];
  allQuestions = data.questions || [];
  questionById = Object.fromEntries(allQuestions.map((q) => [q.id, q]));

  applySoloFilter("ALL");

  // Support direct QR link `?mode=student&code=ABCD`
  const params = new URLSearchParams(window.location.search);
  const urlCode = (params.get("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const urlMode = params.get("mode");
  if (urlCode.length === 4) {
    document.getElementById("student-code-input").value = urlCode;
    switchView("student");
  } else if (urlMode && views[urlMode]) {
    switchView(urlMode);
  }
}

boot();

