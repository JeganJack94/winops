import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCBZLWnYUprYh_uBRF4RakSOzk72YU5I8w",
  authDomain: "win-express-ops-ab12.firebaseapp.com",
  projectId: "win-express-ops-ab12",
  storageBucket: "win-express-ops-ab12.firebasestorage.app",
  messagingSenderId: "123720512028",
  appId: "1:123720512028:web:83a64d9eedf75acdf3e5d9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
