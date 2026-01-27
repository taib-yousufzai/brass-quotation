/**
 * CSV Helper Utilities for Quotations
 */

/**
 * Escape a field for CSV format
 * Wraps in quotes if it contains comma, quote, or newline
 * Escapes quotes by doubling them
 */
const escapeCSV = (field) => {
    if (field === null || field === undefined) return ''
    const stringField = String(field)
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
        return `"${stringField.replace(/"/g, '""')}"`
    }
    return stringField
}

/**
 * Convert an array of quotations to CSV format
 * @param {Array} quotations - Array of quotation objects
 * @returns {string} CSV string
 */
export const convertToCSV = (quotations) => {
    const headers = [
        'DocNo', 'Date', 'ClientName', 'ProjectTitle', 'Location',
        'Discount', 'Handling', 'Tax', 'Terms',
        'Section', 'ItemName', 'Description', 'Unit', 'Qty', 'RateClient', 'RateActual', 'Remark'
    ]

    const csvRows = [headers.join(',')]

    for (const q of quotations) {
        // Common quotation data
        const qData = [
            q.docNo, q.date, q.clientName, q.projectTitle, q.location,
            q.discount, q.handling, q.tax, q.terms
        ]

        if (!q.rows || q.rows.length === 0) {
            // If no items, output one row with empty item fields
            const row = [...qData, '', '', '', '', '', '', '', '']
            csvRows.push(row.map(escapeCSV).join(','))
        } else {
            // Output one row per item
            for (const item of q.rows) {
                const itemData = [
                    item.section, item.name, item.description, item.unit,
                    item.qty, item.rateClient, item.rateActual, item.remark
                ]
                const row = [...qData, ...itemData]
                csvRows.push(row.map(escapeCSV).join(','))
            }
        }
    }

    return csvRows.join('\n')
}

/**
 * Parse CSV string back to array of quotations
 * @param {string} csvText - CSV content string
 * @returns {Array} Array of quotation objects
 */
export const parseCSV = (csvText) => {
    const lines = csvText.split(/\r?\n/)
    if (lines.length < 2) return [] // Empty or header only

    const headers = lines[0].split(',').map(h => h.trim())
    const quotationsMap = new Map()

    // Helper to parse a CSV line handling quotes
    const parseLine = (text) => {
        const result = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < text.length; i++) {
            const char = text[i]
            if (char === '"') {
                if (inQuotes && text[i + 1] === '"') {
                    current += '"'
                    i++
                } else {
                    inQuotes = !inQuotes
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current)
                current = ''
            } else {
                current += char
            }
        }
        result.push(current)
        return result
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = parseLine(line)

        // Map values to named fields based on index
        // We assume the column order matches convertToCSV
        // Indices based on headers array above:
        // 0: DocNo, 1: Date, 2: ClientName, ... 8: Terms
        // 9: Section, 10: ItemName, ... 16: Remark

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
                createdAt: new Date().toISOString(), // New timestamp for import
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

    return Array.from(quotationsMap.values())
}
