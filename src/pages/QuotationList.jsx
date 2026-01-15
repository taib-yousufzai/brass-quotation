import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaEye, FaEdit, FaTrash, FaArrowLeft, FaClock, FaPrint, FaSearch, FaCopy } from 'react-icons/fa'
import { getAllQuotations, deleteQuotation, getQuotationsPaginated } from '../utils/dbOperations'
import { copyQuotationToBuilder, createCopyUrlParams } from '../utils/copyQuotationService'

function QuotationList() {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState([])
  const [filteredQuotations, setFilteredQuotations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [staffMode, setStaffMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copyingId, setCopyingId] = useState(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [lastDocSnapshot, setLastDocSnapshot] = useState(null)
  const [hasMorePages, setHasMorePages] = useState(false)
  const [pageSize] = useState(20)
  const [isSearching, setIsSearching] = useState(false)
  
  // Error handling state
  const [error, setError] = useState(null)
  const [retryAction, setRetryAction] = useState(null)

  useEffect(() => {
    // Load quotations first for faster page load
    loadQuotations()

    // Check if admin mode is already active
    const isAdmin = sessionStorage.getItem('adminMode') === 'true'
    if (isAdmin) {
      setStaffMode(true)
    } else {
      // Ask for password after a short delay to not block rendering
      setTimeout(() => {
        const pass = prompt('Enter admin password (leave blank for client view):')
        if (pass === 'MorphiumAdmin@2024') {
          setStaffMode(true)
          sessionStorage.setItem('adminMode', 'true')
        }
      }, 100)
    }
  }, [])

  const loadQuotations = async (lastDoc = null, isNextPage = false) => {
    setLoading(true)
    setError(null) // Clear any previous errors
    
    const result = await getQuotationsPaginated(pageSize, lastDoc)
    
    if (result.success) {
      setQuotations(result.data)
      setFilteredQuotations(result.data)
      setLastDocSnapshot(result.lastDoc)
      setHasMorePages(result.hasMore)
      
      if (isNextPage) {
        setCurrentPage(prev => prev + 1)
      }
    } else {
      // Set error state with retry action
      setError(result.message || 'Error loading quotations')
      setRetryAction(() => () => loadQuotations(lastDoc, isNextPage))
    }
    setLoading(false)
  }

  const handleSearch = async (value) => {
    setSearchTerm(value)
    setError(null) // Clear any previous errors
    
    // If search is cleared, reset to paginated mode and reload page 1
    if (!value.trim()) {
      setIsSearching(false)
      setCurrentPage(1)
      setLastDocSnapshot(null)
      await loadQuotations(null, false)
      return
    }

    // When searching, set isSearching to true and load all data
    setIsSearching(true)
    setLoading(true)
    
    const result = await getAllQuotations()
    
    if (result.success) {
      // Filter the complete dataset
      const searchLower = value.toLowerCase()
      const filtered = result.data.filter(q =>
        q.docNo?.toLowerCase().includes(searchLower) ||
        q.clientName?.toLowerCase().includes(searchLower) ||
        q.projectTitle?.toLowerCase().includes(searchLower) ||
        q.location?.toLowerCase().includes(searchLower)
      )
      
      setQuotations(result.data)
      setFilteredQuotations(filtered)
    } else {
      // Set error state with retry action
      setError(result.message || 'Error loading quotations for search')
      setRetryAction(() => () => handleSearch(value))
    }
    
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!staffMode) {
      alert('Only admin can delete quotations')
      return
    }
    if (!confirm(`Delete quotation ${id}? This cannot be undone.`)) return

    const result = await deleteQuotation(id)
    if (result.success) {
      // Handle pagination edge case: if we deleted the last item on a page
      const updatedQuotations = quotations.filter(q => q.id !== id)
      const updatedFiltered = updatedQuotations.filter(q =>
        !searchTerm ||
        q.docNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      setQuotations(updatedQuotations)
      setFilteredQuotations(updatedFiltered)
      
      // If we deleted all items on the current page and we're not on page 1, go back to page 1
      if (updatedFiltered.length === 0 && currentPage > 1 && !isSearching) {
        setCurrentPage(1)
        setLastDocSnapshot(null)
        await loadQuotations(null, false)
      }
      
      alert(result.message)
    } else {
      alert(result.message || 'Error deleting quotation')
    }
  }

  const calculateDaysAgo = (dateString) => {
    if (!dateString) return 'N/A'
    const quotationDate = new Date(dateString)
    const today = new Date()
    const diffTime = Math.abs(today - quotationDate)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  const handlePrint = (quotation) => {
    // Open the view page in a new window and trigger print
    const viewUrl = `/view/${quotation.id}`
    const printWindow = window.open(viewUrl, '_blank')

    // Wait for the page to load, then trigger print
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 1000)
      }
    }
  }

  const handleCopyToBuilder = async (quotation) => {
    try {
      setCopyingId(quotation.id)

      // Copy the quotation data
      const copiedData = copyQuotationToBuilder(quotation)

      // Create URL parameters for the copy operation using docNo
      const urlParams = createCopyUrlParams(quotation.docNo)

      // Store the copied data in sessionStorage for the builder to pick up
      sessionStorage.setItem('copiedQuotationData', JSON.stringify(copiedData))

      // Show success message
      alert(`Quotation ${quotation.docNo} copied successfully! Redirecting to builder...`)

      // Navigate to builder with copy parameters
      navigate(`/?${urlParams}`)

    } catch (error) {
      console.error('Error copying quotation:', error)
      alert(`Error copying quotation: ${error.message}`)
    } finally {
      setCopyingId(null)
    }
  }

  const handleNextPage = () => {
    if (hasMorePages && lastDocSnapshot) {
      loadQuotations(lastDocSnapshot, true)
    }
  }

  const handlePreviousPage = () => {
    // Reset to page 1 (limitation: no backward cursor caching in this version)
    setCurrentPage(1)
    setLastDocSnapshot(null)
    loadQuotations(null, false)
  }
  
  const handleRetry = () => {
    if (retryAction) {
      retryAction()
    }
  }
  
  const dismissError = () => {
    setError(null)
    setRetryAction(null)
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid var(--bd)', borderTop: '4px solid var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '20px', color: 'var(--blue)', fontSize: '16px' }}>
          {isSearching ? 'Searching quotations...' : currentPage > 1 ? 'Loading page...' : 'Loading quotations...'}
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'var(--blue)' }}>All Saved Quotations</h1>
        <div>
          <span style={{ color: 'var(--blue)', fontWeight: 600, marginRight: '20px' }}>
            {staffMode ? 'Admin Mode' : 'Client Mode'}
          </span>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            <FaArrowLeft /> Back to Builder
          </button>
        </div>
      </div>

      {/* Error Message with Retry */}
      {error && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#fee',
          border: '2px solid #fcc',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong style={{ color: '#c00', display: 'block', marginBottom: '5px' }}>Error Loading Quotations</strong>
            <span style={{ color: '#800' }}>{error}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn-secondary"
              onClick={handleRetry}
              style={{ padding: '8px 16px' }}
            >
              Retry
            </button>
            <button
              className="btn-secondary"
              onClick={dismissError}
              style={{ padding: '8px 16px' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--blue)', fontSize: '16px' }} />
          <input
            type="text"
            placeholder="Search by quotation no, client, project, or location..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              border: '2px solid var(--bd)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--blue)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--bd)'}
          />
        </div>
        {searchTerm && (
          <div style={{ color: 'var(--blue)', fontSize: '14px', fontWeight: 600 }}>
            Found {filteredQuotations.length} of {quotations.length} quotations
          </div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: 'var(--blue)', color: 'white' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>#</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Quotation No.</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Client</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Project</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Age</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredQuotations.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ color: 'var(--blue)' }}>
                  {searchTerm ? (
                    <>
                      <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px' }}>
                        No quotations found matching "{searchTerm}"
                      </p>
                      <p style={{ fontSize: '14px', color: '#666' }}>
                        Try adjusting your search terms or clear the search to see all quotations.
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px' }}>
                        No quotations found
                      </p>
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                        Get started by creating your first quotation.
                      </p>
                      <button
                        className="btn-secondary"
                        onClick={() => navigate('/')}
                        style={{ padding: '10px 20px' }}
                      >
                        Create New Quotation
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            filteredQuotations.map((q, i) => (
              <tr key={q.id} style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '12px' }}>{i + 1}</td>
                <td style={{ padding: '12px' }}>{q.docNo}</td>
                <td style={{ padding: '12px' }}>{q.clientName}</td>
                <td style={{ padding: '12px' }}>{q.projectTitle}</td>
                <td style={{ padding: '12px' }}>{q.date}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--blue)' }}>
                    <FaClock /> {calculateDaysAgo(q.date)}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <button
                    className="btn-secondary"
                    style={{ marginRight: '8px', padding: '6px 12px' }}
                    onClick={() => navigate(`/view/${q.id}`)}
                  >
                    <FaEye /> View
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ marginRight: '8px', padding: '6px 12px' }}
                    onClick={() => handlePrint(q)}
                  >
                    <FaPrint /> Print
                  </button>
                  <button
                    className="btn-secondary"
                    style={{
                      marginRight: '8px',
                      padding: '6px 12px',
                      opacity: copyingId === q.id ? 0.6 : 1,
                      cursor: copyingId === q.id ? 'not-allowed' : 'pointer'
                    }}
                    onClick={() => handleCopyToBuilder(q)}
                    disabled={copyingId === q.id}
                    title="Copy this quotation to the builder for editing"
                  >
                    {copyingId === q.id ? (
                      <>
                        <div style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          border: '2px solid var(--blue)',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginRight: '4px'
                        }}></div>
                        Copying...
                      </>
                    ) : (
                      <>
                        <FaCopy data-testid="copy-icon" /> Copy to Builder
                      </>
                    )}
                  </button>
                  {staffMode && (
                    <>
                      <button
                        className="btn-secondary"
                        style={{ marginRight: '8px', padding: '6px 12px' }}
                        onClick={() => navigate(`/?load=${q.docNo}`)}
                      >
                        <FaEdit /> Load
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleDelete(q.id)}
                      >
                        <FaTrash /> Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination Controls - Only show when not searching */}
      {!isSearching && !searchTerm && (
        <div style={{ 
          marginTop: '20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '15px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid var(--bd)'
        }}>
          <div style={{ color: 'var(--blue)', fontSize: '14px', fontWeight: 600 }}>
            Showing {filteredQuotations.length} quotations
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: 'var(--blue)', fontSize: '14px', fontWeight: 600 }}>
              Page {currentPage}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <button
                className="btn-secondary"
                onClick={handleNextPage}
                disabled={!hasMorePages}
                style={{
                  padding: '8px 16px',
                  opacity: !hasMorePages ? 0.5 : 1,
                  cursor: !hasMorePages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuotationList
