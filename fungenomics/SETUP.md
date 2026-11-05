# FunGenomics Live: setup

Live classroom quiz for MBG419. You run the **host** screen on the projector, and students join from their phones.

| Page | Who | URL |
|---|---|---|
| `index.html` | Students (enter code) | https://omerfarukbay.com/fungenomics/ |
| `play.html?code=XXXX` | Students (from QR) | opened automatically by the QR code |
| `host.html` | **You** (projector) | https://omerfarukbay.com/fungenomics/host.html |

## 1. Try it locally (demo mode, no setup)
```bash
cd "~/Desktop/Tubitak 4004 Ders/Website"
python3 -m http.server 8765
```
- Open http://localhost:8765/fungenomics/host.html and click **Create game**
- Open http://localhost:8765/fungenomics/play.html?code=XXXX in 1–2 more tabs (or in a narrow window), then join different groups

Demo mode only syncs tabs on the **same computer**.

## 2. Connect Firebase (one time, ~10 min, free)
1. https://console.firebase.google.com → **Add project** (e.g. `fungenomics-live`). Analytics is not needed.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable**.
3. **Build → Realtime Database → Create database** (location: `europe-west1`, start in *locked mode*).
4. On the database's **Rules** tab, paste the contents of `database.rules.json`, then **Publish**.
5. **Project settings (⚙) → Your apps → Web (`</>`)** → register the app → copy the `firebaseConfig` object into `js/config.js`.
   Make sure `databaseURL` is filled in (e.g. `https://fungenomics-live-default-rtdb.europe-west1.firebasedatabase.app`).
6. **Authentication → Settings → Authorized domains**: make sure `omerfarukbay.com` is listed.

The Firebase web config is safe to publish: access is controlled by the rules, not by hiding the key.

## 3. Publish
Commit and push the website repository. GitHub Pages serves `/fungenomics/`.

## Who can do what (enforced by `database.rules.json`)
- Only the browser that **created** a game can change its state, scores and questions (start, reveal, next, timer).
- Students can only write their own player entry, their **own group's** answer (only while the question is open) and their group's jokers (once each).
- Correct answers are **never sent to phones before you press Reveal**.

## Host keyboard shortcuts
`Space`/`Enter`: next step (Start → Reveal → Leaderboard → Next) · `P`: pause · `F`: fullscreen · `M`: sound · `T`: light/dark theme

## Jokers (one per group per game, activated from phones)
🧪 PCR: double points · 🔀 Alt. Splicing: lock 2 answers · 🧬 PTM: change a locked answer once · ✂️ Restriction Enzyme: removes 2 wrong options from that group's screen

## Editing questions
`data/questions.json` is a copy of the desktop app's bank (figures in `figures/`, compressed JPGs).
If you edit the desktop file, copy it again and change figure extensions to `.jpg`.

