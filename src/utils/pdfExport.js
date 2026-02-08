import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { consolidateItemsBySection } from './sectionConsolidator.js'
import { getOptimalSettings, CANVAS_CAPTURE_CONFIG } from './pdfOptimizationConfig.js'

// Load image as base64 with JPEG compression for smaller file size
const loadImageAsBase64 = (url, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
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
  
  // Ensure the cloned area reflects consolidated sections
  // The QuotePreview component already uses consolidateItemsBySection,
  // so the cloned content should maintain section grouping
  
  wrapper.appendChild(clonedArea)
  document.body.appendChild(wrapper)

  try {
    // Validate that section consolidation is preserved
    // Check if the cloned area maintains section grouping
    const sectionHeaders = clonedArea.querySelectorAll('.section-header-row')
    const sectionNames = new Set()
    
    sectionHeaders.forEach(header => {
      const sectionName = header.textContent.trim()
      if (sectionNames.has(sectionName)) {
        console.warn(`Duplicate section header found in export: ${sectionName}`)
      }
      sectionNames.add(sectionName)
    })

    // Load header and footer images with JPEG compression (85% quality)
    const headerImg1 = await loadImageAsBase64('/quotation header page 1.png', 0.85)
    const headerImg2 = await loadImageAsBase64('/quotation header page 2.png', 0.85)
    const footerImg = await loadImageAsBase64('/quotation footer.png', 0.85)

    const canvas = await html2canvas(wrapper, {
      ...CANVAS_CAPTURE_CONFIG.STANDARD,
      scrollY: 0,
      windowWidth: wrapper.scrollWidth,
    })

    document.body.removeChild(wrapper)

    // Convert to JPEG for smaller file size (instead of PNG)
    const contentImg = canvas.toDataURL('image/jpeg', settings.jpegQuality)
    const pdf = new jsPDF(orientation, 'mm', pageSize)
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // PAGE 1: Full page header 1 (JPEG compressed)
    pdf.addImage(headerImg1, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')

    // PAGE 2: Full page header 2 (JPEG compressed)
    pdf.addPage()
    pdf.addImage(headerImg2, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')

    // MIDDLE PAGES: Quotation content with consolidated sections
    // The content maintains section grouping as established by consolidateItemsBySection
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

  // Restore actual column visibility
  if (staffMode) {
    document.querySelectorAll('.actual-col').forEach(el => el.style.display = '')
  }

  // Restore action column visibility
  document.querySelectorAll('.no-print').forEach(el => el.style.display = '')
}
