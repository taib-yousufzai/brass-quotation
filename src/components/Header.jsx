import { useRef } from 'react'
import { FaFileAlt, FaArrowsAltV, FaPalette, FaRupeeSign, FaUserShield, FaLink, FaList, FaDownload, FaFilePdf, FaPrint, FaSave, FaTrash, FaFileExport, FaFileImport } from 'react-icons/fa'

function Header({ formData, setFormData, theme, setTheme, currency, setCurrency, pageSize, setPageSize, orientation, setOrientation, toggleStaffMode, staffMode, navigate, loadByNumber, handleExportPDF, handlePrint, saveToFirebase, clearAll, handleExportCSV, handleImportCSV }) {
  const fileInputRef = useRef(null)

  const handleThemeChange = (e) => {
    const newTheme = e.target.value
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('rk_qb_theme', newTheme)
  }

  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value
    setCurrency(newCurrency)
    localStorage.setItem('rk_qb_currency', newCurrency)
  }

  const handlePageSizeChange = (e) => {
    const newSize = e.target.value
    setPageSize(newSize)
    localStorage.setItem('rk_qb_pageSize', newSize)
  }

  const handleOrientationChange = (e) => {
    const newOrientation = e.target.value
    setOrientation(newOrientation)
    localStorage.setItem('rk_qb_orientation', newOrientation)
  }

  const copyLink = () => {
    if (!formData.docNo) {
      alert('Please enter a quotation number first.')
      return
    }
    const url = `${window.location.origin}/?qno=${encodeURIComponent(formData.docNo)}`
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy link')
    })
  }

  return (
    <header className="header">
      <div className="brand">
        <div className="logo">BS</div>
        <div className="brand-text">
          <h1>Brass Space Interior</h1>
          <p>Design & Build Solutions</p>
        </div>
      </div>
      <div className="doc-meta">
        <div className="meta-group">
          <label>
            <span className="label-text">Quote #</span>
            <input
              className="modern-input"
              placeholder="Auto"
              value={formData.docNo}
              onChange={(e) => setFormData(prev => ({ ...prev, docNo: e.target.value }))}
            />
          </label>
          <label>
            <span className="label-text">Date</span>
            <input
              type="date"
              className="modern-input"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </label>
        </div>

        <div className="meta-group">
          <label>
            <span className="label-text"><FaFileAlt /> Page Size</span>
            <select className="modern-select" value={pageSize} onChange={handlePageSizeChange}>
              <option value="a4">A4</option>
              <option value="a3">A3</option>
              <option value="letter">Letter</option>
              <option value="legal">Legal</option>
            </select>
          </label>

          <label>
            <span className="label-text"><FaArrowsAltV /> Orientation</span>
            <select className="modern-select" value={orientation} onChange={handleOrientationChange}>
              <option value="p">Portrait</option>
              <option value="l">Landscape</option>
            </select>
          </label>

          <label>
            <span className="label-text"><FaPalette /> Theme</span>
            <select className="modern-select" value={theme} onChange={handleThemeChange}>
              <option value="light">Light</option>
              <option value="brand">Brand Blue</option>
              <option value="dark">Dark</option>
              <option value="ocean">Ocean Blue</option>
              <option value="forest">Forest Green</option>
              <option value="sunset">Sunset Red</option>
              <option value="purple">Royal Purple</option>
            </select>
          </label>

          <label>
            <span className="label-text"><FaRupeeSign /> Currency</span>
            <select className="modern-select" value={currency} onChange={handleCurrencyChange}>
              <option value="₹">₹ (INR)</option>
              <option value="$">$ (USD)</option>
              <option value="€">€ (EUR)</option>
              <option value="£">£ (GBP)</option>
            </select>
          </label>
        </div>

        <div className="meta-group">
          <button className="btn-primary" onClick={handleExportPDF}>
            <FaFilePdf /> Download PDF
          </button>
          <button className="btn-secondary" onClick={handlePrint}>
            <FaPrint /> Print
          </button>
          <button className="btn-secondary" onClick={() => saveToFirebase(true)}>
            <FaSave /> Save to Database
          </button>
          <button className="btn-secondary" onClick={loadByNumber}>
            <FaDownload /> Load Quotation
          </button>
          <button className="btn-secondary" onClick={() => navigate('/list')}>
            <FaList /> View All Quotations
          </button>
          <button className="btn-danger" onClick={clearAll}>
            <FaTrash /> Clear / New
          </button>
          <button className="btn-secondary" onClick={toggleStaffMode}>
            <FaUserShield /> {staffMode ? 'Client Mode' : 'Admin Mode'}
          </button>
          <button className="btn-secondary" onClick={copyLink}>
            <FaLink /> Copy Link
          </button>
          <div style={{ display: 'none' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleImportCSV}
            />
          </div>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} title="Import from Excel">
            <FaFileImport /> Import Excel
          </button>
          <button className="btn-secondary" onClick={handleExportCSV} title="Export to Excel">
            <FaFileExport /> Export Excel
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
