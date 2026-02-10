import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, getDocs, deleteDoc, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { FaArrowLeft, FaEdit, FaTrash, FaPrint, FaCalculator, FaMoneyBillWave, FaPercentage, FaFolder, FaCopy } from 'react-icons/fa'
import { copyQuotationToBuilder, createCopyUrlParams } from '../utils/copyQuotationService'

// Number to words converter
function numberToWords(num) {
  if (num === 0) return 'Zero'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

  function convertLessThanThousand(n) {
    if (n === 0) return ''
    if (n < 10) return ones[n]
    if (n < 20) return teens[n - 10]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '')
  }

  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const remainder = Math.floor(num % 1000)

  let result = ''
  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore '
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh '
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand '
  if (remainder > 0) result += convertLessThanThousand(remainder)

  return result.trim()
}

function ViewQuotation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quotation, setQuotation] = useState(null)
  const [staffMode, setStaffMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    // Load quotation first for faster page load
    loadQuotation()

    // Check if admin mode is already active
    const isAdmin = sessionStorage.getItem('adminMode') === 'true'
    if (isAdmin) {
      setStaffMode(true)
    } else {
      // Ask for password after a short delay to not block rendering
      setTimeout(() => {
        const pass = prompt('Enter admin password to enable admin tools (leave blank for client view):')
        if (pass === 'admin123') {
          setStaffMode(true)
          sessionStorage.setItem('adminMode', 'true')
        }
      }, 100)
    }
  }, [id])

  const loadQuotation = async () => {
    try {
      const docRef = doc(db, 'quotations', id)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setQuotation({ id: docSnap.id, ...docSnap.data() })
      } else {
        const quotationsRef = collection(db, 'quotations')
        const querySnapshot = await getDocs(quotationsRef)
        let found = false

        querySnapshot.forEach((doc) => {
          if (doc.id === id || doc.data().docNo === id) {
            setQuotation({ id: doc.id, ...doc.data() })
            found = true
          }
        })

        if (!found) {
          alert('Quotation not found')
          navigate('/list')
        }
      }
    } catch (err) {
      console.error('Error loading quotation:', err)
      alert('Error loading quotation. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!staffMode) {
      alert('Only admin can delete quotations')
      return
    }
    if (!confirm('Delete this quotation permanently? This cannot be undone.')) return

    try {
      await deleteDoc(doc(db, 'quotations', id))
      alert('Quotation deleted successfully')
      navigate('/list')
    } catch (err) {
      console.error('Error deleting:', err)
      alert('Error deleting quotation')
    }
  }

  const handleCopyToBuilder = async () => {
    try {
      setCopying(true)

      // Copy the quotation data
      const copiedData = copyQuotationToBuilder(quotation)

      // Create URL parameters for the copy operation
      const urlParams = createCopyUrlParams(quotation.id)

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
      setCopying(false)
    }
  }



  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid var(--bd)', borderTop: '4px solid var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '20px', color: 'var(--blue)', fontSize: '16px' }}>Loading quotation...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }
  if (!quotation) return <div style={{ padding: '40px', textAlign: 'center' }}>Quotation not found</div>

  const formatNum = (v) => `₹ ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`

  const rows = quotation.rows || []
  const subtotal = rows.reduce((sum, r) => sum + (r.qty || 0) * (r.rateClient || 0), 0)
  const discount = parseFloat(quotation.discount) || 0
  const handling = parseFloat(quotation.handling) || 0
  const tax = parseFloat(quotation.tax) || 0

  const afterDiscount = subtotal - (subtotal * discount / 100)
  const discountAmount = subtotal * discount / 100
  const pretax = afterDiscount + (afterDiscount * handling / 100)
  const handlingAmount = afterDiscount * handling / 100
  const taxAmount = pretax * (tax / 100)
  const grandTotal = pretax + taxAmount

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn-secondary" onClick={() => window.print()}>
          <FaPrint /> Print
        </button>
        <button
          className="btn-secondary"
          onClick={handleCopyToBuilder}
          disabled={copying}
          style={{
            opacity: copying ? 0.6 : 1,
            cursor: copying ? 'not-allowed' : 'pointer'
          }}
          title="Copy this quotation to the builder for editing"
        >
          <FaCopy /> {copying ? 'Copying...' : 'Copy to Builder'}
        </button>
        <button className="btn-secondary" onClick={() => navigate(`/?load=${quotation.docNo}`)}>
          <FaEdit /> Load in Builder
        </button>
        <button className="btn-secondary" onClick={() => navigate('/list')}>
          <FaArrowLeft /> Back to List
        </button>
        {staffMode && (
          <button className="btn-danger" onClick={handleDelete}>
            <FaTrash /> Delete
          </button>
        )}
      </div>

      {/* Header Page 1 - Full Page */}
      <div className="header-page-1">
        <img
          src="/quotation header page 1.png"
          alt="Header Page 1"
        />
      </div>

      {/* Header Page 2 - Full Page */}
      <div className="header-page-2">
        <img
          src="/quotation header page 2.png"
          alt="Header Page 2"
        />
      </div>

      <div className="quote" id="viewQuotation" style={{ background: 'white', padding: '40px', borderRadius: '10px', position: 'relative', pageBreakAfter: 'always' }}>
        <div className="quote-header-preview">
          <div className="company-info">
            <div>
              <h2>Brass Space Interior Solution</h2>
              <p>Design & Build Solutions</p>
            </div>
          </div>
          <div className="quote-meta-preview">
            <div><strong>Quote #:</strong> {quotation.docNo || '-'}</div>
            <div><strong>Date:</strong> {quotation.date || '-'}</div>
          </div>
        </div>

        <div className="client-info-preview">
          <div><strong>Client:</strong> {quotation.clientName || '-'}</div>
          <div><strong>Location:</strong> {quotation.location || '-'}</div>
          <div><strong>Project:</strong> {quotation.projectTitle || '-'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Component</th>
              <th>Description</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amount</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let currentSection = ''
              let sectionIndex = 0
              return rows.map((r, i) => {
                const showSectionHeader = r.section !== currentSection
                if (showSectionHeader) {
                  currentSection = r.section
                  sectionIndex++
                }

                return (
                  <>
                    {showSectionHeader && (
                      <tr key={`section-${sectionIndex}`} className="section-header-row">
                        <td colSpan="8" className="section-header-cell">
                          <FaFolder style={{ marginRight: '8px' }} />
                          <strong>{r.section || 'General'}</strong>
                        </td>
                      </tr>
                    )}
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td><strong>{r.name}</strong></td>
                      <td className="description-cell">{r.description || 'Standard material & finish included.'}</td>
                      <td className="center">{r.unit}</td>
                      <td className="num">{r.qty}</td>
                      <td className="num">{formatNum(r.rateClient)}</td>
                      <td className="num amount-highlight">{formatNum(r.qty * r.rateClient)}</td>
                      <td className="remark-cell">{r.remark || '-'}</td>
                    </tr>
                  </>
                )
              })
            })()}
          </tbody>
          <tfoot>
            <tr className="subtotal-row">
              <td colSpan="6" className="right"><strong>Subtotal</strong></td>
              <td className="num"><strong>{formatNum(subtotal)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div className="quotation-summary">
          <div className="summary-grid">
            <div className="summary-section">
              <h4><FaCalculator /> Calculation Breakdown</h4>
              <div className="summary-items">
                <div className="summary-item">
                  <span className="summary-label">Subtotal:</span>
                  <span className="summary-value">{formatNum(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="summary-item discount-item">
                    <span className="summary-label"><FaPercentage /> Discount ({discount}%):</span>
                    <span className="summary-value negative">- {formatNum(discountAmount)}</span>
                  </div>
                )}
                <div className="summary-item">
                  <span className="summary-label">After Discount:</span>
                  <span className="summary-value">{formatNum(afterDiscount)}</span>
                </div>
                {handling > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">Handling Charges ({handling}%):</span>
                    <span className="summary-value">+ {formatNum(handlingAmount)}</span>
                  </div>
                )}
                <div className="summary-item">
                  <span className="summary-label">Taxable Amount:</span>
                  <span className="summary-value">{formatNum(pretax)}</span>
                </div>
                <div className="summary-item tax-item">
                  <span className="summary-label">GST ({tax}%):</span>
                  <span className="summary-value">+ {formatNum(taxAmount)}</span>
                </div>
              </div>
            </div>

            <div className="summary-section grand-total-section">
              <h4><FaMoneyBillWave /> Final Amount</h4>
              <div className="grand-total-box">
                <div className="grand-total-label">Total Amount Payable</div>
                <div className="grand-total-value">{formatNum(grandTotal)}</div>
                <div className="grand-total-words">{numberToWords(Math.floor(grandTotal))} Only</div>
              </div>
            </div>
          </div>
        </div>

        {/* Material Description */}
        <div className="specifications-section">
          <h3 className="section-title">MATERIAL DESCRIPTION</h3>
          <table className="specifications-table">
            <tbody>
              <tr>
                <td className="spec-label"><strong>Carcase</strong></td>
                <td className="spec-value">Action Tesa/Century/Cross Bond</td>
                <td className="spec-detail">16.75mm preiam hchmr board (Texture/white)</td>
                <td className="spec-measurement">16.75mm</td>
              </tr>
              <tr>
                <td className="spec-label"><strong>Shutters</strong></td>
                <td className="spec-value">Action Tesa/Century/Cross Bond</td>
                <td className="spec-detail">hdhmr with: 8 laminate inside and 1mm laminate outside</td>
                <td className="spec-measurement"></td>
              </tr>
              <tr>
                <td className="spec-label"><strong>Fittings</strong></td>
                <td className="spec-value">Hettich</td>
                <td className="spec-detail">Soft Channels & Hinges</td>
                <td className="spec-measurement"></td>
              </tr>
              <tr>
                <td className="spec-label"><strong>Laminate</strong></td>
                <td className="spec-value">Century, Merino, Greenlam</td>
                <td className="spec-detail">Outer Laminate Ugro INR 1300-1500/Sheet</td>
                <td className="spec-measurement">1mm</td>
              </tr>
              <tr>
                <td className="spec-label"><strong>Acrylic Laminate</strong></td>
                <td className="spec-value">Prelamo Board Action Tesa</td>
                <td className="spec-detail">Outer Laminate Ugro INR 3500-4000/Sheet</td>
                <td className="spec-measurement">1.5mm</td>
              </tr>
              <tr>
                <td className="spec-label"><strong>Inner Laminate</strong></td>
                <td className="spec-value"></td>
                <td className="spec-detail">Inner Pre- Laminate rates upto 450rs/sheet</td>
                <td className="spec-measurement">8mm</td>
              </tr>
              <tr>
                <td className="spec-label"><strong>Handles</strong></td>
                <td className="spec-value"></td>
                <td className="spec-detail">Big Size upto INR 300 / Pis, Small size handles upto 150/ Pis and Nobes rates upto INR100</td>
                <td className="spec-measurement"></td>
              </tr>
              <tr>
                <td className="spec-label"><strong>Accessories</strong></td>
                <td className="spec-value"></td>
                <td className="spec-detail">all Other Accessories at extra cost</td>
                <td className="spec-measurement"></td>
              </tr>
              <tr>
                <td className="spec-label"><strong>All Furniture SPECIFICATIONS</strong></td>
                <td colSpan="3" className="spec-detail">All Furniture. With upto 2 Drawers, Glass work and lights provision of upto 24sqft.one shutters, one open shelves. All other accessories like stone at extra cost is not included</td>
              </tr>
              <tr>
                <td className="spec-label"></td>
                <td colSpan="3" className="spec-detail">Wardrobe with openable shutters,</td>
              </tr>
              <tr>
                <td className="spec-label"><strong>Wardrobe</strong></td>
                <td colSpan="3" className="spec-detail">2 handles, upto 2 drawers, 1 profile light provision, 1 SS hanging rail. 2 locks each section of upto 24sqft. Light and other accessories at extra cost</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Schedule */}
        <div className="payment-section">
          <h3 className="section-title">PAYMENT SCHEDULE</h3>
          <div className="payment-table">
            <div className="payment-row payment-header">
              <div className="payment-col">Installment</div>
              <div className="payment-col">Payment Terms</div>
            </div>
            <div className="payment-row">
              <div className="payment-col"><strong>1st Installment</strong></div>
              <div className="payment-col">Booking Amount 10% to Begin Design</div>
            </div>
            <div className="payment-row">
              <div className="payment-col"><strong>2nd Installment</strong></div>
              <div className="payment-col">Move To Production 40% to begin with production & work at site.</div>
            </div>
            <div className="payment-row">
              <div className="payment-col"><strong>3rd Installment</strong></div>
              <div className="payment-col">50% work Completed 50% - Production Completed Ready to Dispatch at site.</div>
            </div>
          </div>
        </div>

        {/* Warranty and Terms */}
        <div className="warranty-section">
          <h3 className="section-title">WARRANTY AND DISCLAIMER OF WARRANTY-WOOD WORK</h3>
          <h4 className="subsection-title">TERMS & CONDITIONS</h4>

          <div className="terms-list">
            <div className="term-item">
              <strong>1. Booking Fee:</strong> A 10% booking fee is required to secure your project. This amount will be adjusted against future orders.
            </div>
            <div className="term-item">
              <strong>2. Refunds:</strong> You have a 72-hour free look window post-booking to cancel the project with a full refund. No refunds will be provided if the project is canceled after this period.
            </div>
            <div className="term-item">
              <strong>3. Transaction Fees:</strong> A 2% convenience fee applies to payments via Wallets, IMPS, Debit Card, or Credit Card. No fees apply to NEFT, RTGS, or Cheque payments.
            </div>
            <div className="term-item">
              <strong>4. Authorized Signatory Changes in Pricing:</strong> The final price depends on the agreed scope, site measurements, material finishes, and any customizations. Expect a possible 5-10% variation from this quote, with larger changes possible for significant modifications.
            </div>
            <div className="term-item">
              <strong>5. Effect of Scope Changes:</strong> Any changes to the project scope or value during execution will result in the withdrawal of free gifts or discounts offered at the time of sale.
            </div>
            <div className="term-item">
              <strong>6. Finalized Quote (BOUC Price mutually agreed upon):</strong> No quote adjustments will be made during execution, even if proposed changes are of similar value.
            </div>
            <div className="term-item">
              <strong>7. Site Access:</strong> The client must provide unrestricted site access, water, and electricity. Delays due to restricted access will terminate the agreed delivery timeline with immediate effect.
            </div>
            <div className="term-item">
              <strong>8. Warranty:</strong> A 10-year warranty applies to modular kitchens, wardrobes, storage, hardware, and accessories. This excludes damages due to accidents, abnormal use, extreme conditions, or harsh cleaning agents.
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bank-section">
          <h3 className="section-title">BANK DETAILS FOR PAYMENT</h3>
          <div className="bank-details-grid">
            <div className="bank-item">
              <span className="bank-label">Bank Name:</span>
              <span className="bank-value">HDFC Bank</span>
            </div>
            <div className="bank-item">
              <span className="bank-label">Account Name:</span>
              <span className="bank-value">Brass Space Interior Solution</span>
            </div>
            <div className="bank-item">
              <span className="bank-label">Account Number:</span>
              <span className="bank-value">XXXX XXXX XXXX 1234</span>
            </div>
            <div className="bank-item">
              <span className="bank-label">IFSC Code:</span>
              <span className="bank-value">HDFC0001234</span>
            </div>
            <div className="bank-item">
              <span className="bank-label">Branch:</span>
              <span className="bank-value">Main Branch, City</span>
            </div>
            <div className="bank-item">
              <span className="bank-label">Account Type:</span>
              <span className="bank-value">Current Account</span>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-line"></div>
            <p className="signature-label">Customer Signature</p>
            <p className="signature-date">Date: _______________</p>
          </div>
          <div className="signature-box">
            <div className="signature-line"></div>
            <p className="signature-label">Authorized Signatory</p>
            <p className="signature-date">For Brass Space Interior Solution</p>
          </div>
        </div>

        {/* Footer */}
        <div className="quotation-footer">
          <p>THANKYOU FOR CHOOSING BRASS SPACE INTERIOR SOLUTION</p>
          <p className="footer-slogan" style={{ fontSize: '14px' }}>Your space, your story—beautifully designed.</p>
        </div>
      </div>

      {/* Footer Page - Full Page */}
      <div className="footer-page">
        <img
          src="/quotation footer.png"
          alt="Footer Page"
        />
      </div>
    </div>
  )
}

export default ViewQuotation
