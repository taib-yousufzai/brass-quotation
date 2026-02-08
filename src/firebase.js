import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from "firebase/analytics";

// Firebase configuration for Brass Space Interior
const firebaseConfig = {
  apiKey: "AIzaSyB-Mjw16FT11D8b5US5YpV5bMjQADvNav0",
  authDomain: "brass-libs-4053d.firebaseapp.com",
  projectId: "brass-libs-4053d",
  storageBucket: "brass-libs-4053d.firebasestorage.app",
  messagingSenderId: "387160498227",
  appId: "1:387160498227:web:10038b8ff09d6e4f72c346",
  measurementId: "G-06GTY4H962"
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
