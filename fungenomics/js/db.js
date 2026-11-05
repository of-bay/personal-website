// FunGenomics Live — real-time data layer.
// Same tiny API for Firebase Realtime Database and a local demo backend
// (localStorage + BroadcastChannel) so the game can be tested offline.
import { firebaseConfig, DEMO_MODE } from "./config.js";

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
async function makeFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}`;
  const { initializeApp } = await import(`${base}/firebase-app.js`);
  const { getAuth, signInAnonymously, onAuthStateChanged } = await import(`${base}/firebase-auth.js`);
  const D = await import(`${base}/firebase-database.js`);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = D.getDatabase(app);

  const uidPromise = new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (u) => { if (u) resolve(u.uid); });
    signInAnonymously(auth).catch(reject);
  });
  let offset = 0;
  D.onValue(D.ref(db, ".info/serverTimeOffset"), (s) => { offset = s.val() || 0; });

  return {
    demo: false,
    uid: () => uidPromise,
    serverNow: () => Date.now() + offset,
    get: async (p) => (await D.get(D.ref(db, p))).val(),
    set: (p, v) => D.set(D.ref(db, p), v),
    update: (p, obj) => D.update(D.ref(db, p), obj),
    remove: (p) => D.remove(D.ref(db, p)),
    listen: (p, cb) => D.onValue(D.ref(db, p), (s) => cb(s.val())),
  };
}

export async function getDB() {
  if (!impl) impl = DEMO_MODE ? makeDemo() : await makeFirebase();
  return impl;
}

/* ---------------------------------------------------------------- shared */
export const JOKERS = {
  pcr:  { emoji: "🧪", name: "PCR Amplification",   desc: "Double points this round if your group is correct." },
  alt:  { emoji: "🔀", name: "Alternative Splicing", desc: "Lock TWO answers — if either is correct you score." },
  ptm:  { emoji: "🧬", name: "PTM",                  desc: "Change your locked answer once this round." },
  re:   { emoji: "✂️", name: "Restriction Enzyme",   desc: "Cuts away two wrong options from your screen." },
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
  b.innerHTML = "🧪 <b>Demo mode</b> — works only between tabs on this computer. Add your Firebase config in <code>js/config.js</code> for real phones.";
  document.body.prepend(b);
}

