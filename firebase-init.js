import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth/web-extension";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAfinlK3aqW0vkXP-o64RtA0YMkBvGBZeI",
  authDomain: "scrollrot-bd4c1.firebaseapp.com",
  projectId: "scrollrot-bd4c1",
  storageBucket: "scrollrot-bd4c1.firebasestorage.app",
  messagingSenderId: "579601400309",
  appId: "1:579601400309:web:b9a125db4f28912f38e0bc",
  measurementId: "G-DRJNH7DD3K",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configure for extension use
auth._getFramework = () => "extension";
db._getFramework = () => "extension";

export { auth, db };
