import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { consolidateItemsBySection } from './sectionConsolidator.js'
import { getOptimalSettings, CANVAS_CAPTURE_CONFIG } from './pdfOptimizationConfig.js'

// Load image as base64 with JPEG compression for smaller file size
const loadImageAsBase64 = (url, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Remove crossOrigin for local assets as requested
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      // Use JPEG compression for smaller file size
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

export const exportToPDF = async (formData, rows, staffMode, currency, pageSize, orientation) => {
  const previewArea = document.getElementById('previewArea')
  if (!previewArea) return

  // Get optimal settings for standard quality (smaller file size)
  const settings = getOptimalSettings('standard')

  // Ensure rows are consolidated by section before export
  const consolidatedRows = consolidateItemsBySection(rows)

  // Hide actual columns for client mode
  if (!staffMode) {
    document.querySelectorAll('.actual-col').forEach(el => el.style.display = 'none')
  }

  // Hide action columns for PDF export
  document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none')

  // Create wrapper
  const wrapper = document.createElement('div')
  wrapper.style.padding = '10px'
  wrapper.style.background = '#fff'
  wrapper.style.width = '100%'
  wrapper.style.boxSizing = 'border-box'

  // Clone the preview area
  const clonedArea = previewArea.cloneNode(true)

  // Remove action columns from the clone
  clonedArea.querySelectorAll('.no-print').forEach(el => el.remove())

  wrapper.appendChild(clonedArea)
  document.body.appendChild(wrapper)

  try {
    const headerImg1 = await loadImageAsBase64(encodeURI('/quotation header page 1.png'), 0.8)
    const headerImg2 = await loadImageAsBase64(encodeURI('/quotation header page 2.png'), 0.8)

    // Capture dynamic footer instead of loading image
    const footerArea = document.getElementById('footerArea')
    let footerImg = null
    if (footerArea) {
      const footerCanvas = await html2canvas(footerArea, {
        ...CANVAS_CAPTURE_CONFIG.STANDARD,
        scale: 2, // High resolution for footer
        useCORS: true,
        logging: false
      })
      footerImg = footerCanvas.toDataURL('image/jpeg', 0.8)
    }

    const canvas = await html2canvas(wrapper, {
      ...CANVAS_CAPTURE_CONFIG.STANDARD,
      scrollY: 0,
      windowWidth: wrapper.scrollWidth,
    })

    document.body.removeChild(wrapper)

    // Convert to JPEG for smaller file size
    const contentImg = canvas.toDataURL('image/jpeg', settings.jpegQuality)

    // Enable compression in jsPDF and use specified settings
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: pageSize,
      compress: true
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // PAGE 1: Full page header 1 (JPEG compressed)
    pdf.addImage(headerImg1, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')

    // PAGE 2: Full page header 2 (JPEG compressed)
    pdf.addPage()
    pdf.addImage(headerImg2, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')

    // MIDDLE PAGES: Quotation content
    const imgProps = pdf.getImageProperties(contentImg)
    const imgWidth = pageWidth
    const imgHeight = (imgProps.height * pageWidth) / imgProps.width

    let heightLeft = imgHeight
    let position = 0

    // Add first content page with JPEG compression
    pdf.addPage()
    pdf.addImage(contentImg, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
    heightLeft -= pageHeight

    // Add additional content pages if needed
    while (heightLeft > 0) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(contentImg, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      heightLeft -= pageHeight
    }

    // LAST PAGE: Full page footer (JPEG compressed)
    pdf.addPage()
    pdf.addImage(footerImg, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')

    pdf.save(`${formData.docNo || 'Quotation'}.pdf`)
  } catch (err) {
    console.error('PDF export error:', err)
    alert('Error exporting PDF. Please ensure header and footer images are available.')
  }

  // Restore column visibility
  if (staffMode) {
    document.querySelectorAll('.actual-col').forEach(el => el.style.display = '')
  }
  document.querySelectorAll('.no-print').forEach(el => el.style.display = '')
}
