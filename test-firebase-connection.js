// Quick test to verify Firebase connection
import { db, storage, analytics } from './src/firebase.js'
import { collection, getDocs } from 'firebase/firestore'

console.log('Testing Firebase connection...')
console.log('Database:', db ? '✓ Connected' : '✗ Failed')
console.log('Storage:', storage ? '✓ Connected' : '✗ Failed')
console.log('Analytics:', analytics ? '✓ Connected' : '✗ Failed')

// Try to read from Firestore
try {
  const quotationsRef = collection(db, 'quotations')
  const snapshot = await getDocs(quotationsRef)
  console.log(`✓ Firestore working! Found ${snapshot.size} quotations`)
} catch (error) {
  console.error('✗ Firestore error:', error.message)
}
