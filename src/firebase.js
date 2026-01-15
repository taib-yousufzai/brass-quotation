import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from "firebase/analytics";

// Firebase configuration for Lifeasy Interior
const firebaseConfig = {
  apiKey: "AIzaSyBmPfH2SjJWW4m5epbDDnY-_FE3nYSG5Sw",
  authDomain: "quotationbuilder-d79e9.firebaseapp.com",
  projectId: "quotationbuilder-d79e9",
  storageBucket: "quotationbuilder-d79e9.firebasestorage.app",
  messagingSenderId: "79503850976",
  appId: "1:79503850976:web:9ca0469b0ec4d6c251bf85",
  measurementId: "G-60K90EZWQ6"
};

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const analytics = getAnalytics(app);
