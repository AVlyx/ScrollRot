import {
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth/web-extension";
import { type Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAfinlK3aqW0vkXP-o64RtA0YMkBvGBZeI",
  authDomain: "scrollrot-bd4c1.firebaseapp.com",
  projectId: "scrollrot-bd4c1",
  storageBucket: "scrollrot-bd4c1.firebasestorage.app",
  messagingSenderId: "579601400309",
  appId: "1:579601400309:web:b9a125db4f28912f38e0bc",
  measurementId: "G-DRJNH7DD3K",
};

const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);

export { auth, firestore };
