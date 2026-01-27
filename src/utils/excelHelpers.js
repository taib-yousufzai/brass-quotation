/**
 * Excel Helper Utilities for Quotations
 * Uses 'xlsx' (SheetJS) library
 */
import * as XLSX from 'xlsx'

/**
 * Convert data to sheet format
 * @param {Object} quotation - Quotation object
 * @returns {Array} Array of arrays for sheet data
 */
const getSheetData = (quotation) => {
    const headers = [
        'DocNo', 'Date', 'ClientName', 'ProjectTitle', 'Location',
        'Discount', 'Handling', 'Tax', 'Terms',
        'Section', 'ItemName', 'Description', 'Unit', 'Qty', 'RateClient', 'RateActual', 'Remark'
    ]

    const rows = [headers]

    // Common quotation data
    const qData = [
        quotation.docNo, quotation.date, quotation.clientName, quotation.projectTitle, quotation.location,
        quotation.discount, quotation.handling, quotation.tax, quotation.terms
    ]

    if (!quotation.rows || quotation.rows.length === 0) {
        // If no items, output one row with empty item fields
        const row = [...qData, '', '', '', '', '', '', '', '']
        rows.push(row)
    } else {
        // Output one row per item
        for (const item of quotation.rows) {
            const itemData = [
                item.section, item.name, item.description, item.unit,
                item.qty, item.rateClient, item.rateActual, item.remark
            ]
            const row = [...qData, ...itemData]
            rows.push(row)
        }
    }

    return rows
}

/**
 * Export quotations to Excel file
 * @param {Array} quotations - Array of quotation objects
 * @param {string} filename - Output filename
 */
export const exportToExcel = (quotations, filename) => {
    const wb = XLSX.utils.book_new()

    quotations.forEach(q => {
        const sheetData = getSheetData(q)
        const ws = XLSX.utils.aoa_to_sheet(sheetData)

        // Sheet name cannot exceed 31 chars and cannot contain : \ / ? * [ ]
        let sheetName = q.docNo || 'Sheet'
        sheetName = sheetName.replace(/[:\\/?*\[\]]/g, '_').substring(0, 31)

        // Ensure unique sheet names
        let uniqueName = sheetName
        let counter = 1
        while (wb.SheetNames.includes(uniqueName)) {
            uniqueName = `${sheetName.substring(0, 28)}_${counter}`
            counter++
        }

        XLSX.utils.book_append_sheet(wb, ws, uniqueName)
    })

    XLSX.writeFile(wb, filename)
}

/**
 * Import quotations from Excel file
 * @param {File} file - Excel file object
 * @returns {Promise<Array>} Array of quotation objects
 */
export const importFromExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const wb = XLSX.read(data, { type: 'array' })

                const quotations = []

                wb.SheetNames.forEach(sheetName => {
                    const ws = wb.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) // Get array of arrays

                    if (jsonData.length < 2) return // Skip empty or header-only sheets

                    // Parse rows back to quotation object
                    // Assuming the structure matches getSheetData
                    const headerRow = jsonData[0] // We could validate headers here

                    // Group by DocNo within this sheet (although logically one sheet = one quote)
                    const quotationsMap = new Map()

                    for (let i = 1; i < jsonData.length; i++) {
                        const values = jsonData[i]
                        if (!values || values.length === 0) continue

                        const docNo = values[0]
                        if (!docNo) continue

                        if (!quotationsMap.has(docNo)) {
                            quotationsMap.set(docNo, {
                                docNo,
                                date: values[1],
                                clientName: values[2],
                                projectTitle: values[3],
                                location: values[4],
                                discount: parseFloat(values[5]) || 0,
                                handling: parseFloat(values[6]) || 0,
                                tax: parseFloat(values[7]) || 0,
                                terms: values[8],
                                rows: [],
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            })
                        }

                        const quotation = quotationsMap.get(docNo)

                        // Check if we have item data (ItemName is at index 10)
                        if (values[10]) {
                            quotation.rows.push({
                                section: values[9] || '',
                                name: values[10] || '',
                                description: values[11] || '',
                                unit: values[12] || '',
                                qty: parseFloat(values[13]) || 0,
                                rateClient: parseFloat(values[14]) || 0,
                                rateActual: parseFloat(values[15]) || 0,
                                remark: values[16] || ''
                            })
                        }
                    }

                    quotations.push(...quotationsMap.values())
                })

                resolve(quotations)
            } catch (error) {
                reject(error)
            }
        }

        reader.onerror = (error) => reject(error)
        reader.readAsArrayBuffer(file)
    })
}
