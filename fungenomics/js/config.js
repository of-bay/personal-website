// FunGenomics Live — Firebase configuration
// ---------------------------------------------------------------------------
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Add a "Web app" and paste its config object below.
// 3. Enable  Build → Authentication → Sign-in method → Anonymous
// 4. Enable  Build → Realtime Database, then paste database.rules.json
//    into the "Rules" tab and Publish.
//
// While apiKey is empty, the game runs in DEMO MODE: everything works,
// but only between browser tabs on the SAME computer (good for testing).
// ---------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

export const DEMO_MODE = !firebaseConfig.apiKey;

