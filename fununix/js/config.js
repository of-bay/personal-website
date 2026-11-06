// FunGenomics Live — Firebase configuration (project: bay-website)
// ---------------------------------------------------------------------------
// This web config is safe to publish: access is controlled by the
// Realtime Database rules (database.rules.json), not by hiding the key.
//
// To test locally WITHOUT Firebase, open any page with ?demo=1
// (demo mode only syncs tabs on the same computer).
// ---------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "AIzaSyAuZmSU9P5cx_MibetXZW2DqmpfSxEKaz4",
  authDomain: "gen-lang-client-0995306907.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0995306907-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gen-lang-client-0995306907",
  storageBucket: "gen-lang-client-0995306907.firebasestorage.app",
  messagingSenderId: "504659427551",
  appId: "1:504659427551:web:e6465fede2f72c5ed6296a",
};

export const DEMO_MODE = !firebaseConfig.apiKey || new URLSearchParams(location.search).has("demo");
