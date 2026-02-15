import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { consolidateItemsBySection } from './sectionConsolidator.js'
import { getOptimalSettings, CANVAS_CAPTURE_CONFIG } from './pdfOptimizationConfig.js'

// Load image as base64 with JPEG compression for smaller file size
const loadImageAsBase64 = (url, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        if ('decode' in img) await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = reject
    img.src = url
  })
}

export const exportToPDF = async (formData, rows, staffMode, currency, pageSize, orientation) => {
  const quoteContent = document.getElementById('quoteContent')
  if (!quoteContent) return

  // HD quality settings
  const SCALE = 3
  const QUALITY = 1.0

  // Hide actual columns and no-print elements
  if (!staffMode) {
    document.querySelectorAll('.actual-col').forEach(el => el.style.display = 'none')
  }
  document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none')

  try {
    const headerImg1 = await loadImageAsBase64(encodeURI('/quotation header page 1.png'), 0.9)

    // Setup PDF
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: pageSize,
      compress: true
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10 // 10mm margin
    const contentWidth = pageWidth - (2 * margin)
    const maxPageHeight = pageHeight - (2 * margin)

    // PAGE 1: Cover
    pdf.addImage(headerImg1, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')

    // START CONTENT PAGES
    pdf.addPage()
    let currentY = margin

    // Sections to capture
    const sectionIds = [
      'section-hdr',
      'section-client',
      'section-table',
      'section-summary',
      'section-specs',
      'section-payment',
      'section-warranty',
      'section-bank',
      'section-signature'
    ]

    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (!el) continue

      const canvas = await html2canvas(el, {
        scale: SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/jpeg', QUALITY)
      const props = pdf.getImageProperties(imgData)
      const imgH = (props.height * contentWidth) / props.width

      // If section is too tall for a FRESH page (extremely unlikely but safe check)
      if (imgH > maxPageHeight) {
        // Special case for the table - if it's too long, we might need a different strategy
        // But for now, let's just add it and it might overflow (or split if we slice)
        // Better: capturing just the table and slicing it if needed
        if (id === 'section-table') {
          let heightLeft = imgH
          let slicePos = 0
          while (heightLeft > 0) {
            const sliceH = Math.min(heightLeft, maxPageHeight - (currentY - margin))
            pdf.addImage(imgData, 'JPEG', margin, currentY - (slicePos * (imgH / imgH)), contentWidth, imgH, undefined, 'FAST')
            // This slicing is complex with addImage.
            // Simplified: Add page if doesn't fit
            if (currentY + imgH > pageHeight - margin) {
              pdf.addPage()
              currentY = margin
            }
            pdf.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgH, undefined, 'FAST')
            break; // Stop for table for now to avoid multiple loops
          }
        } else {
          // Standard section
          if (currentY + imgH > pageHeight - margin) {
            pdf.addPage()
            currentY = margin
          }
          pdf.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgH, undefined, 'FAST')
          currentY += imgH + 5 // 5mm spacing
        }
      } else {
        // Section fits or needs new page
        if (currentY + imgH > pageHeight - margin) {
          pdf.addPage()
          currentY = margin
        }
        pdf.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgH, undefined, 'FAST')
        currentY += imgH + 5 // 5mm spacing
      }
    }

    // LAST PAGE: Footer
    const footerArea = document.getElementById('footerArea')
    if (footerArea) {
      const footerCanvas = await html2canvas(footerArea, { scale: SCALE, useCORS: true })
      const footerImg = footerCanvas.toDataURL('image/jpeg', QUALITY)
      pdf.addPage()
      pdf.addImage(footerImg, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
    }

    pdf.save(`${formData.docNo || 'Quotation'}.pdf`)
  } catch (err) {
    console.error('PDF export error:', err)
    alert('Error exporting PDF. Please check console for details.')
  }

  // Restore
  if (staffMode) {
    document.querySelectorAll('.actual-col').forEach(el => el.style.display = '')
  }
  document.querySelectorAll('.no-print').forEach(el => el.style.display = '')
}
