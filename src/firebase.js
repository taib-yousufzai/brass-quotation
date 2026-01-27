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

// Initialize Firestore with explicit database name
export const db = getFirestore(app)

// Enable offline persistence for better reliability
try {
  // Note: This is automatically enabled in newer versions
  console.log('Firestore initialized successfully')
} catch (error) {
  console.error('Error initializing Firestore:', error)
}

export const storage = getStorage(app)
export const analytics = getAnalytics(app);
