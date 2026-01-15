import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { presets, defaultDescription } from '../data/presets'
import Header from '../components/Header'
import ClientDetails from '../components/ClientDetails'
import ItemForm from '../components/ItemForm'
import QuotePreview from '../components/QuotePreview'
import Totals from '../components/Totals'
import Actions from '../components/Actions'
import { exportToPDF } from '../utils/pdfExport'
import { saveQuotation, loadQuotation } from '../utils/dbOperations'
import { copyQuotationToBuilder } from '../utils/copyQuotationService'

function QuotationBuilder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [staffMode, setStaffMode] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('rk_qb_theme') || 'light')
  const [currency, setCurrency] = useState(localStorage.getItem('rk_qb_currency') || '₹')
  const [pageSize, setPageSize] = useState(localStorage.getItem('rk_qb_pageSize') || 'a4')
  const [orientation, setOrientation] = useState(localStorage.getItem('rk_qb_orientation') || 'p')
  const [autoSave, setAutoSave] = useState(true)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const [visibleSections, setVisibleSections] = useState({
    materialDescription: true,
    paymentSchedule: true,
    warranty: true,
    bankDetails: true
  })

  const [formData, setFormData] = useState({
    docNo: '',
    clientName: '',
    location: '',
    projectTitle: '',
    date: new Date().toISOString().split('T')[0],
    discount: 0,
    handling: 10,
    tax: 18,
    terms: '1. 30% advance upon order confirmation.\n2. Balance as per progress milestones.\n3. Delivery and installation as per schedule.\n4. All materials are of approved quality.'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    autoSetQuoteNumber()
    loadFromStorage()

    // Check if admin mode is already active
    const isAdmin = sessionStorage.getItem('adminMode') === 'true'
    if (isAdmin) {
      setStaffMode(true)
      document.body.classList.add('staff-mode')
    }

    // Handle copy operation first, then load operation
    const copyId = searchParams.get('copy')
    const qno = searchParams.get('load') || searchParams.get('qno')

    if (copyId) {
      loadAndCopyQuotation(copyId)
    } else if (qno) {
      loadQuotationFromFirebase(qno)
    }
  }, [])

  useEffect(() => {
    if (autoSave) {
      const timeoutId = setTimeout(() => {
        saveDraft()
      }, 2000) // Debounce: wait 2 seconds after last change

      return () => clearTimeout(timeoutId)
    }
  }, [rows, formData, autoSave])

  const autoSetQuoteNumber = () => {
    let last = localStorage.getItem('qb_last_no') || '0'
    last = parseInt(last) + 1
    localStorage.setItem('qb_last_no', last)
    const num = String(last).padStart(4, '0')
    if (!formData.docNo) setFormData(prev => ({ ...prev, docNo: `LI-${num}` }))
  }

  const saveDraft = async () => {
    const draft = { ...formData, rows }
    // Save to localStorage
    localStorage.setItem('rk_qb_data', JSON.stringify(draft))

    // Also save to Firebase if quotation number exists
    if (formData.docNo) {
      const result = await saveQuotation(draft)
      if (result.success) {
        console.log('Auto-saved to database:', formData.docNo)
      }
    }
  }

  const loadFromStorage = () => {
    const raw = localStorage.getItem('rk_qb_data')
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      setRows(data.rows || [])
      setFormData(prev => ({ ...prev, ...data }))
    } catch (e) {
      console.error('Failed to restore draft', e)
    }
  }

  const loadQuotationFromFirebase = async (qno) => {
    try {
      console.log('Loading quotation:', qno)
      const result = await loadQuotation(qno)
      console.log('Load result:', result)

      if (result.success) {
        const data = result.data
        console.log('Loaded data:', data)
        setRows(data.rows || [])
        setFormData({
          docNo: data.docNo || '',
          clientName: data.clientName || '',
          location: data.location || '',
          projectTitle: data.projectTitle || '',
          date: data.date || new Date().toISOString().split('T')[0],
          discount: data.discount || 0,
          handling: data.handling || 10,
          tax: data.tax || 18,
          terms: data.terms || '1. 30% advance upon order confirmation.\n2. Balance as per progress milestones.'
        })
        alert(`Quotation ${qno} loaded successfully!`)
      } else {
        console.error('Failed to load:', result.message)
        alert(result.message || 'Quotation not found.')
      }
    } catch (error) {
      console.error('Error in loadQuotationFromFirebase:', error)
      alert('Error loading quotation: ' + error.message)
    }
  }

  const loadAndCopyQuotation = async (copyId) => {
    try {
      console.log('Loading quotation for copy:', copyId)
      const result = await loadQuotation(copyId)
      console.log('Copy load result:', result)

      if (result.success) {
        const originalData = result.data
        console.log('Original data for copy:', originalData)

        // Use copyQuotationToBuilder to transform the data
        const copiedData = copyQuotationToBuilder(originalData)
        console.log('Copied data:', copiedData)

        // Load the copied data into the component state
        setRows(copiedData.rows || [])
        setFormData({
          docNo: copiedData.docNo || '',
          clientName: copiedData.clientName || '',
          location: copiedData.location || '',
          projectTitle: copiedData.projectTitle || '',
          date: copiedData.date || new Date().toISOString().split('T')[0],
          discount: copiedData.discount || 0,
          handling: copiedData.handling || 10,
          tax: copiedData.tax || 18,
          terms: copiedData.terms || '1. 30% advance upon order confirmation.\n2. Balance as per progress milestones.'
        })

        // Clear localStorage draft since this is a new quotation
        localStorage.removeItem('rk_qb_data')

        alert(`Quotation copied successfully! New quotation number: ${copiedData.docNo}`)
      } else {
        console.error('Failed to load quotation for copy:', result.message)
        alert(result.message || 'Quotation not found for copying.')
      }
    } catch (error) {
      console.error('Error in loadAndCopyQuotation:', error)
      alert('Error copying quotation: ' + error.message)
    }
  }

  const saveToFirebase = async (showAlert = true) => {
    if (!formData.docNo) {
      if (showAlert) alert('Please enter a quotation number first.')
      return { success: false }
    }
    const data = { ...formData, rows }
    const result = await saveQuotation(data)
    if (showAlert) alert(result.message)
    return result
  }

  const addItem = (item) => {
    setRows(prev => [...prev, item])
  }

  const deleteRow = (index) => {
    if (!confirm('Delete this item?')) return
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const duplicateRow = (index) => {
    setRows(prev => [...prev.slice(0, index + 1), { ...prev[index] }, ...prev.slice(index + 1)])
  }

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((row, i) =>
      i === index ? { ...row, [field]: field === 'qty' || field === 'rateClient' || field === 'rateActual' ? parseFloat(value) || 0 : value } : row
    ))
  }

  const clearAll = () => {
    if (!confirm('This will clear the current quotation and create a NEW quotation number. Continue?')) return
    setRows([])
    autoSetQuoteNumber()
    setFormData({
      docNo: '',
      clientName: '',
      location: '',
      projectTitle: '',
      date: new Date().toISOString().split('T')[0],
      discount: 0,
      handling: 10,
      tax: 18,
      terms: '1. 30% advance upon order confirmation.\n2. Balance as per progress milestones.'
    })
    localStorage.removeItem('rk_qb_data')
  }

  const handleExportPDF = async () => {
    // Auto-save to database before exporting PDF
    if (formData.docNo) {
      const result = await saveToFirebase(false)
      if (result.success) {
        console.log('Quotation auto-saved to database')
      }
    }
    exportToPDF(formData, rows, staffMode, currency, pageSize, orientation)
  }

  const handlePrint = async () => {
    // Auto-save to database before printing
    if (formData.docNo) {
      const result = await saveToFirebase(false)
      if (result.success) {
        console.log('Quotation auto-saved to database')
      }
    }
    window.print()
  }

  const toggleStaffMode = () => {
    if (!staffMode) {
      const pass = prompt('Enter admin password:')
      if (pass === 'MorphiumAdmin@2024') {
        setStaffMode(true)
        sessionStorage.setItem('adminMode', 'true')
        document.body.classList.add('staff-mode')
      } else if (pass !== null) {
        alert('Incorrect password')
      }
    } else {
      setStaffMode(false)
      sessionStorage.removeItem('adminMode')
      document.body.classList.remove('staff-mode')
    }
  }

  const loadByNumber = async () => {
    const pass = prompt('Enter admin password:')
    if (pass !== 'admin123') {
      if (pass !== null) {
        alert('Incorrect password')
      }
      return
    }
    const qno = prompt('Enter quotation number to load:')
    if (!qno) return
    await loadQuotationFromFirebase(qno)
  }

  return (
    <div>
      <Header
        formData={formData}
        setFormData={setFormData}
        theme={theme}
        setTheme={setTheme}
        currency={currency}
        setCurrency={setCurrency}
        pageSize={pageSize}
        setPageSize={setPageSize}
        orientation={orientation}
        setOrientation={setOrientation}
        toggleStaffMode={toggleStaffMode}
        staffMode={staffMode}
        navigate={navigate}
        loadByNumber={loadByNumber}
        handleExportPDF={handleExportPDF}
        handlePrint={handlePrint}
        saveToFirebase={saveToFirebase}
        clearAll={clearAll}
      />
      <ClientDetails formData={formData} setFormData={setFormData} />
      <div className="layout">
        <aside className="controls">
          <ItemForm
            addItem={addItem}
            staffMode={staffMode}
          />
          <hr className="divider" />
          <Totals
            rows={rows}
            formData={formData}
            setFormData={setFormData}
            currency={currency}
            staffMode={staffMode}
          />
          <hr className="divider" />
          <div className="terms-section">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--blue)', marginBottom: '12px' }}>
              Terms & Conditions
            </h3>
            <textarea
              className="modern-textarea"
              rows="5"
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              placeholder="Enter terms and conditions..."
            />
          </div>
          <Actions
            handleExportPDF={handleExportPDF}
            handlePrint={handlePrint}
            clearAll={clearAll}
            autoSave={autoSave}
            setAutoSave={setAutoSave}
            staffMode={staffMode}
            navigate={navigate}
            saveToFirebase={saveToFirebase}
            loadByNumber={loadByNumber}
          />
        </aside>
        <QuotePreview
          formData={formData}
          rows={rows}
          deleteRow={deleteRow}
          duplicateRow={duplicateRow}
          updateRow={updateRow}
          currency={currency}
          staffMode={staffMode}
          visibleSections={visibleSections}
          setVisibleSections={setVisibleSections}
        />
      </div>
    </div>
  )
}

export default QuotationBuilder
