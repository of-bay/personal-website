// FunGenomics Live — real-time data layer.
// Same tiny API for Firebase Realtime Database and a local demo backend
// (localStorage + BroadcastChannel) so the game can be tested offline.
import { firebaseConfig, DEMO_MODE } from "./config.js";

export const ADMIN_EMAIL = "ofb.bay@gmail.com";

const FB_VER = "10.12.2";
let impl = null;

/* ------------------------------------------------------------------ demo */
function makeDemo() {
  const KEY = "fg-demo-db";
  const chan = "BroadcastChannel" in window ? new BroadcastChannel("fg-demo") : null;
  const subs = new Set();
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (db) => { localStorage.setItem(KEY, JSON.stringify(db)); };
  const parts = (p) => p.split("/").filter(Boolean);
  const getAt = (db, p) => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), db);
  const setAt = (db, p, v) => {
    const ks = parts(p); let o = db;
    ks.slice(0, -1).forEach((k) => { if (typeof o[k] !== "object" || o[k] === null) o[k] = {}; o = o[k]; });
    if (v === null || v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
  };
  const notify = () => { const db = load(); subs.forEach((s) => s.cb(clone(getAt(db, s.path)))); };
  const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
  chan && (chan.onmessage = notify);
  window.addEventListener("storage", (e) => { if (e.key === KEY) notify(); });
  const commit = (fn) => { const db = load(); fn(db); save(db); notify(); chan && chan.postMessage(1); };

  let uid = sessionStorage.getItem("fg-demo-uid");
  if (!uid) { uid = "u" + Math.random().toString(36).slice(2, 10); sessionStorage.setItem("fg-demo-uid", uid); }

  return {
    demo: true,
    uid: async () => uid,
    hostUser: async () => ({ uid, email: ADMIN_EMAIL }),
    signOut: async () => {},
    serverNow: () => Date.now(),
    get: async (p) => clone(getAt(load(), p)),
    set: async (p, v) => commit((db) => setAt(db, p, clone(v))),
    update: async (p, obj) => commit((db) => Object.entries(obj).forEach(([k, v]) => setAt(db, p + "/" + k, clone(v)))),
    remove: async (p) => commit((db) => setAt(db, p, null)),
    listen: (p, cb) => {
      const s = { path: p, cb }; subs.add(s);
      cb(clone(getAt(load(), p)));
      return () => subs.delete(s);
    },
  };
}

/* -------------------------------------------------------------- firebase */
async function makeFirebase(opts = {}) {
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}`;
  const { initializeApp } = await import(`${base}/firebase-app.js`);
  const A = await import(`${base}/firebase-auth.js`);
  const { getAuth, signInAnonymously, onAuthStateChanged } = A;
  const D = await import(`${base}/firebase-database.js`);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = D.getDatabase(app);

  // Students: anonymous sign-in. Host: Google sign-in (see hostUser()).
  const uidPromise = opts.host ? null : new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (u) => { if (u) resolve(u.uid); });
    signInAnonymously(auth).catch(reject);
  });
  const firstUser = new Promise((r) => { const off = onAuthStateChanged(auth, (u) => { off(); r(u); }); });
  let offset = 0;
  D.onValue(D.ref(db, ".info/serverTimeOffset"), (s) => { offset = s.val() || 0; });

  return {
    demo: false,
    uid: async () => (uidPromise ? uidPromise : (auth.currentUser && auth.currentUser.uid)),
    // Resolves with the signed-in instructor; `gate(show, err)` renders the sign-in UI.
    hostUser: async (gate) => {
      let u = await firstUser;
      const ok = (x) => x && !x.isAnonymous && x.email === ADMIN_EMAIL && x.emailVerified;
      while (!ok(u)) {
        const msg = u && !u.isAnonymous ? `${u.email} is not allowed to host games.` : "";
        if (u) await A.signOut(auth);
        await gate(msg);  // resolves when the user clicks "Sign in"
        try {
          const provider = new A.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account", login_hint: ADMIN_EMAIL });
          u = (await A.signInWithPopup(auth, provider)).user;
        } catch (e) { u = null; gate.error && gate.error(e.code === "auth/popup-closed-by-user" ? "" : e.message); }
      }
      return u;
    },
    signOut: () => A.signOut(auth),
    serverNow: () => Date.now() + offset,
    get: async (p) => (await D.get(D.ref(db, p))).val(),
    set: (p, v) => D.set(D.ref(db, p), v),
    update: (p, obj) => D.update(D.ref(db, p), obj),
    remove: (p) => D.remove(D.ref(db, p)),
    listen: (p, cb) => D.onValue(D.ref(db, p), (s) => cb(s.val())),
  };
}

export async function getDB(opts = {}) {
  if (!impl) impl = DEMO_MODE ? makeDemo() : await makeFirebase(opts);
  return impl;
}

/* ---------------------------------------------------------------- shared */
export const JOKERS = {
  pcr: { emoji: "🧪", name: "PCR Amplification", short: "PCR",
         desc: "Doubles your group's points for this question if your answer is correct.",
         when: "Before your group locks an answer." },
  alt: { emoji: "🔀", name: "Alternative Splicing", short: "Alt. Splicing",
         desc: "Your group may lock TWO answers. If either one is correct, you score.",
         when: "Before your group locks an answer." },
  ptm: { emoji: "🧬", name: "Post-Translational Modification", short: "PTM",
         desc: "Change your group's locked answer once.",
         when: "After your group has locked an answer, while time remains." },
  re:  { emoji: "✂️", name: "Restriction Enzyme", short: "Restr. Enzyme",
         desc: "Cuts away two wrong options from your group's screen.",
         when: "Before your group locks an answer." },
  sho: { emoji: "⏳", name: "Telomere Shortening", short: "Telomere Short.",
         desc: "Every OTHER group is left with only 10 seconds to lock their answer.",
         when: "While more than 10 seconds remain." },
  tel: { emoji: "🧲", name: "Telomerase", short: "Telomerase",
         desc: "Adds 15 extra seconds for YOUR group only.",
         when: "Any time before your group's time runs out." },
};

export const RULES = [
  ["🎯", "Questions appear on the projector and your phone: Multiple Choice (1 pt), plus harder Ordering, Matching, Written & 🔥 Bonus rounds (up to 2 pts)."],
  ["👥", "You play as a group. The first group member to press 🔒 Lock decides the group's answer, so agree before you lock!"],
  ["⏱️", "Lock your answer before the timer runs out. Fastest correct group earns the ⚡ Speed badge, and 3+ in a row ignites a 🔥 Processivity Streak!"],
  ["🃏", "Each group has 6 jokers (once per game). Note: Alt. Splicing and Restriction Enzyme apply to multiple-choice questions only."],
  ["🎓", "At the end of the game, your phone generates a Personalised Concept Study Guide explaining the topics behind any questions your group missed (without revealing the questions or answers)."],
];

export const WEEK_TITLES = {
  "2.1": "Genomes & History I",
  "2.2": "Human Genome Project & Post-Genomic Era",
  "3": "Principles of Genome Sequencing",
  "4": "Genome Assembly",
  "6": "Genome Annotation",
  "7": "Transcriptomics & RNA-seq",
  "9": "Single-Cell & Spatial Transcriptomics",
  "12": "Proteomics & Mass Spectrometry",
};


export const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function initTheme() {
  const saved = localStorage.getItem("fg-theme");
  const theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
    const paint = () => { b.textContent = document.documentElement.dataset.theme === "dark" ? "☀️" : "🌙"; };
    paint();
    b.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("fg-theme", next);
      paint();
    });
  });
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function demoBanner(db) {
  if (!db.demo) return;
  const b = document.createElement("div");
  b.className = "demo-banner";
  b.innerHTML = "🧪 <b>Demo mode</b> — works only between tabs on this computer. Remove <code>?demo=1</code> from the address to play with real phones.";
  document.body.prepend(b);
}


export function normText(str) {
  return String(str ?? "").toLowerCase().trim().replace(/\s+/g, "").replace(/['"\-_]/g, "");
}

export function burstConfetti(count = 36) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const wrap = document.createElement("div");
  wrap.className = "dna-confetti";
  const tokens = ["A", "T", "G", "C", "🧬", "✨", "🧪"];
  const colors = ["#00f0ff", "#b56cff", "#ffb547", "#3ddc97", "#ff6b8b", "#6c9bff"];
  for (let i = 0; i < count; i++) {
    const sp = document.createElement("span");
    const tok = tokens[i % tokens.length];
    sp.textContent = tok;
    sp.style.left = Math.random() * 100 + "vw";
    sp.style.color = colors[i % colors.length];
    sp.style.animationDelay = (Math.random() * 0.45).toFixed(2) + "s";
    sp.style.animationDuration = (1.6 + Math.random() * 1.1).toFixed(2) + "s";
    sp.style.fontSize = (tok.length === 1 ? 18 + Math.random() * 12 : 20 + Math.random() * 12) + "px";
    wrap.appendChild(sp);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3100);
}

let audioCtx = null;
export function synthFX(kind = "boost") {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    const now = audioCtx.currentTime;
    const notes = kind === "sabotage" ? [440, 330, 220, 165] : kind === "fanfare" ? [523.25, 659.25, 783.99, 1046.5] : [392, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = kind === "sabotage" ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.12, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.24);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now + i * 0.09); osc.stop(now + i * 0.09 + 0.25);
    });
  } catch {}
}
