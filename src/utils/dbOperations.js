import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, deleteDoc, limit, startAfter } from 'firebase/firestore'
import { db } from '../firebase'

const COLLECTION_NAME = 'quotations'

/**
 * Test Firebase connection
 */
export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...')
    const testDoc = doc(db, 'test', 'connection')
    await setDoc(testDoc, { timestamp: new Date().toISOString() })
    console.log('✓ Firebase connection test successful')
    return { success: true }
  } catch (error) {
    console.error('✗ Firebase connection test failed:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Save or update a quotation in Firebase
 */
export const saveQuotation = async (quotationData) => {
  try {
    console.log('saveQuotation called with:', quotationData.docNo)
    
    if (!quotationData.docNo) {
      throw new Error('Quotation number is required')
    }

    if (!db) {
      console.error('Firebase db is not initialized!')
      throw new Error('Database connection not available')
    }

    const data = {
      ...quotationData,
      updatedAt: new Date().toISOString(),
      createdAt: quotationData.createdAt || new Date().toISOString()
    }

    console.log('Attempting to save to Firebase with docNo:', quotationData.docNo)
    const docRef = doc(db, COLLECTION_NAME, quotationData.docNo)
    console.log('Document reference created:', docRef.path)
    
    await setDoc(docRef, data)
    console.log('setDoc completed successfully')
    
    return { success: true, message: 'Quotation saved successfully!' }
  } catch (error) {
    console.error('Error saving quotation:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    // Provide more helpful error messages
    let userMessage = error.message
    if (error.code === 'permission-denied') {
      userMessage = 'Permission denied. Please check Firestore security rules or try again.'
    } else if (error.code === 'unavailable') {
      userMessage = 'Firebase is currently unavailable. Please check your internet connection.'
    }
    
    return { success: false, message: `Save failed: ${userMessage}` }
  }
}

/**
 * Load a quotation by document number
 */
export const loadQuotation = async (docNo) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, docNo)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() }
    } else {
      return { success: false, message: 'Quotation not found' }
    }
  } catch (error) {
    console.error('Error loading quotation:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get all quotations
 * @deprecated Consider using getQuotationsPaginated for better performance with large datasets
 */
export const getAllQuotations = async () => {
  try {
    const quotationsRef = collection(db, COLLECTION_NAME)
    const q = query(quotationsRef, orderBy('updatedAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    const quotations = []
    querySnapshot.forEach((doc) => {
      quotations.push({ id: doc.id, ...doc.data() })
    })
    
    return { success: true, data: quotations }
  } catch (error) {
    console.error('Error fetching quotations:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get paginated quotations
 * @param {number} pageSize - Number of quotations per page (default: 20)
 * @param {DocumentSnapshot} lastDoc - Last document from previous page (for pagination)
 * @returns {Promise<{success: boolean, data: Array, lastDoc: DocumentSnapshot, hasMore: boolean, message?: string}>}
 */
export const getQuotationsPaginated = async (pageSize = 20, lastDoc = null) => {
  try {
    const quotationsRef = collection(db, COLLECTION_NAME)
    
    // Build query with ordering and limit
    // Fetch pageSize + 1 to detect if more pages exist
    let q = query(
      quotationsRef,
      orderBy('updatedAt', 'desc'),
      limit(pageSize + 1)
    )
    
    // If lastDoc is provided, start after it for pagination
    if (lastDoc) {
      q = query(
        quotationsRef,
        orderBy('updatedAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize + 1)
      )
    }
    
    const querySnapshot = await getDocs(q)
    
    const quotations = []
    querySnapshot.forEach((doc) => {
      quotations.push({ id: doc.id, ...doc.data() })
    })
    
    // Detect if more pages exist by checking if we got more than pageSize
    const hasMore = quotations.length > pageSize
    
    // If we have more, remove the extra item (it was just for detection)
    if (hasMore) {
      quotations.pop()
    }
    
    // Get the last document snapshot for next page cursor
    const lastDocSnapshot = querySnapshot.docs[quotations.length - 1] || null
    
    return {
      success: true,
      data: quotations,
      lastDoc: lastDocSnapshot,
      hasMore: hasMore
    }
  } catch (error) {
    console.error('Error fetching paginated quotations:', error)
    return {
      success: false,
      message: error.message,
      data: [],
      lastDoc: null,
      hasMore: false
    }
  }
}

/**
 * Delete a quotation
 */
export const deleteQuotation = async (docNo) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, docNo)
    await deleteDoc(docRef)
    return { success: true, message: 'Quotation deleted successfully!' }
  } catch (error) {
    console.error('Error deleting quotation:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Search quotations by client name or project title
 */
export const searchQuotations = async (searchTerm) => {
  try {
    const result = await getAllQuotations()
    if (!result.success) return result
    
    const filtered = result.data.filter(q => 
      q.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.docNo?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    return { success: true, data: filtered }
  } catch (error) {
    console.error('Error searching quotations:', error)
    return { success: false, message: error.message, data: [] }
  }
}
