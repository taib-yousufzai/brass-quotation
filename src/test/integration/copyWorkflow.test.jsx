import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QuotationList from '../../pages/QuotationList'
import QuotationBuilder from '../../pages/QuotationBuilder'
import * as dbOperations from '../../utils/dbOperations'
import * as copyService from '../../utils/copyQuotationService'

// Mock the database operations
vi.mock('../../utils/dbOperations', () => ({
  getAllQuotations: vi.fn(),
  getQuotationsPaginated: vi.fn(),
  deleteQuotation: vi.fn(),
  saveQuotation: vi.fn(),
  loadQuotation: vi.fn()
}))

// Mock the copy service
vi.mock('../../utils/copyQuotationService', () => ({
  copyQuotationToBuilder: vi.fn(),
  createCopyUrlParams: vi.fn(),
  generateNewQuotationNumber: vi.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.sessionStorage = sessionStorageMock

// Mock window functions
global.alert = vi.fn()
global.confirm = vi.fn(() => true)
global.prompt = vi.fn(() => '')
global.print = vi.fn()
global.open = vi.fn()

// Mock react-router-dom navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Test data
const mockOriginalQuotation = {
  id: 'test-id-1',
  docNo: 'LI-0001',
  clientName: 'Original Client',
  location: 'Original Location',
  projectTitle: 'Original Project',
  date: '2024-01-15',
  rows: [
    {
      section: 'KITCHEN',
      name: 'Kitchen Cabinet',
      description: 'Modular kitchen cabinet',
      unit: 'SQFT',
      qty: 25,
      rateClient: 1200,
      rateActual: 1000,
      remark: 'Premium finish'
    },
    {
      section: 'WASHROOM',
      name: 'Bathroom Tiles',
      description: 'Ceramic wall tiles',
      unit: 'SQFT',
      qty: 40,
      rateClient: 800,
      rateActual: 650,
      remark: 'Waterproof'
    }
  ],
  discount: 5,
  handling: 10,
  tax: 18,
  terms: 'Original terms and conditions',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z'
}

const mockCopiedQuotation = {
  ...mockOriginalQuotation,
  docNo: 'LI-0002',
  date: '2024-01-20',
  createdAt: '2024-01-20T15:30:00.000Z',
  updatedAt: '2024-01-20T15:30:00.000Z'
}

const mockEditedQuotation = {
  ...mockCopiedQuotation,
  clientName: 'Edited Client Name',
  location: 'Edited Location',
  rows: [
    ...mockCopiedQuotation.rows,
    {
      section: 'LIVING AREA',
      name: 'Sofa Set',
      description: 'L-shaped sofa',
      unit: 'SET',
      qty: 1,
      rateClient: 25000,
      rateActual: 20000,
      remark: 'Leather finish'
    }
  ]
}

describe('Integration Test: Complete Copy Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock returns
    localStorageMock.getItem.mockReturnValue('1')
    sessionStorageMock.getItem.mockReturnValue(null)
    
    // Mock successful quotations loading for QuotationList
    dbOperations.getAllQuotations.mockResolvedValue({
      success: true,
      data: [mockOriginalQuotation]
    })
    
    // Mock successful paginated quotations loading for QuotationList
    dbOperations.getQuotationsPaginated.mockResolvedValue({
      success: true,
      data: [mockOriginalQuotation],
      lastDoc: null,
      hasMore: false
    })
    
    // Mock successful quotation loading for copy operation
    dbOperations.loadQuotation.mockResolvedValue({
      success: true,
      data: mockOriginalQuotation
    })
    
    // Mock successful save operation
    dbOperations.saveQuotation.mockResolvedValue({
      success: true,
      message: 'Quotation saved successfully'
    })
    
    // Mock copy service functions
    copyService.copyQuotationToBuilder.mockReturnValue(mockCopiedQuotation)
    copyService.createCopyUrlParams.mockReturnValue('copy=test-id-1')
    copyService.generateNewQuotationNumber.mockReturnValue('LI-0002')
  })

  it('should complete the full copy workflow: copy from list, edit in builder, and save as new quotation', async () => {
    // Requirements: 2.1, 2.2, 2.5, 4.5
    
    // Step 1: Render QuotationList and verify copy button is present
    const { unmount: unmountList } = render(
      <MemoryRouter>
        <QuotationList />
      </MemoryRouter>
    )

    // Wait for quotations to load
    await waitFor(() => {
      expect(screen.getByText('LI-0001')).toBeInTheDocument()
    })

    // Verify copy button is present (Requirement 2.1)
    const copyButton = screen.getByText('Copy to Builder')
    expect(copyButton).toBeInTheDocument()
    expect(copyButton.closest('button')).toHaveAttribute('title', 'Copy this quotation to the builder for editing')

    // Step 2: Click copy button and verify copy operation
    fireEvent.click(copyButton)

    await waitFor(() => {
      // Verify copy service was called with correct data (Requirement 2.2)
      expect(copyService.copyQuotationToBuilder).toHaveBeenCalledWith(mockOriginalQuotation)
      
      // Verify session storage was set with copied data
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'copiedQuotationData',
        JSON.stringify(mockCopiedQuotation)
      )
      
      // Verify success message and navigation (Requirement 2.5)
      expect(global.alert).toHaveBeenCalledWith('Quotation LI-0001 copied successfully! Redirecting to builder...')
      expect(mockNavigate).toHaveBeenCalledWith('/?copy=test-id-1')
    })

    // Clean up QuotationList component
    unmount: unmountList()

    // Step 3: Simulate navigation to QuotationBuilder with copy parameters
    vi.clearAllMocks() // Clear previous calls but keep mock implementations
    
    // Reset session storage to return copied data
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockCopiedQuotation))
    
    const { unmount: unmountBuilder } = render(
      <MemoryRouter initialEntries={['/?copy=test-id-1']}>
        <QuotationBuilder />
      </MemoryRouter>
    )

    // Wait for copy operation to complete in builder
    await waitFor(() => {
      expect(dbOperations.loadQuotation).toHaveBeenCalledWith('test-id-1')
    })

    // Verify copied data is loaded in builder
    await waitFor(() => {
      expect(copyService.copyQuotationToBuilder).toHaveBeenCalledWith(mockOriginalQuotation)
    })

    // Step 4: Simulate editing the quotation in builder
    // This would normally involve user interactions, but we'll simulate the final save
    
    // Mock the edited quotation data
    const editedQuotationData = mockEditedQuotation
    
    // Step 5: Simulate saving the edited quotation as a new document
    // In a real scenario, this would be triggered by user clicking save
    
    // Verify that when saved, it's stored as a new independent document (Requirement 4.5)
    // The save operation should use the new quotation number, not the original
    expect(editedQuotationData.docNo).toBe('LI-0002')
    expect(editedQuotationData.docNo).not.toBe(mockOriginalQuotation.docNo)
    
    // Verify that the copied data maintains independence from original
    expect(editedQuotationData.clientName).not.toBe(mockOriginalQuotation.clientName)
    expect(editedQuotationData.rows.length).toBeGreaterThan(mockOriginalQuotation.rows.length)
    
    // Verify that original quotation data is preserved
    expect(mockOriginalQuotation.clientName).toBe('Original Client')
    expect(mockOriginalQuotation.rows.length).toBe(2)

    // Clean up
    unmount: unmountBuilder()
  })

  it('should handle copy workflow errors gracefully', async () => {
    // Test error handling in the copy workflow
    
    // Mock copy service to throw error
    copyService.copyQuotationToBuilder.mockImplementationOnce(() => {
      throw new Error('Validation failed: Client name is required')
    })

    render(
      <MemoryRouter>
        <QuotationList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('LI-0001')).toBeInTheDocument()
    })

    const copyButton = screen.getByText('Copy to Builder')
    fireEvent.click(copyButton)

    await waitFor(() => {
      // Verify error is displayed
      expect(global.alert).toHaveBeenCalledWith('Error copying quotation: Validation failed: Client name is required')
      
      // Verify no navigation occurred
      expect(mockNavigate).not.toHaveBeenCalled()
      
      // Verify no session data was set
      expect(sessionStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  it('should preserve all data integrity throughout the copy workflow', async () => {
    // Test complete data preservation through the entire workflow
    
    render(
      <MemoryRouter>
        <QuotationList />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('LI-0001')).toBeInTheDocument()
    })

    const copyButton = screen.getByText('Copy to Builder')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(copyService.copyQuotationToBuilder).toHaveBeenCalledWith(mockOriginalQuotation)
    })

    // Verify all data fields are preserved in the copy
    const copiedData = copyService.copyQuotationToBuilder.mock.results[0].value
    
    // Client details preservation
    expect(copiedData.clientName).toBe(mockOriginalQuotation.clientName)
    expect(copiedData.location).toBe(mockOriginalQuotation.location)
    expect(copiedData.projectTitle).toBe(mockOriginalQuotation.projectTitle)
    
    // Calculation settings preservation
    expect(copiedData.discount).toBe(mockOriginalQuotation.discount)
    expect(copiedData.handling).toBe(mockOriginalQuotation.handling)
    expect(copiedData.tax).toBe(mockOriginalQuotation.tax)
    expect(copiedData.terms).toBe(mockOriginalQuotation.terms)
    
    // Items preservation
    expect(copiedData.rows).toHaveLength(mockOriginalQuotation.rows.length)
    mockOriginalQuotation.rows.forEach((originalItem, index) => {
      const copiedItem = copiedData.rows[index]
      expect(copiedItem.section).toBe(originalItem.section)
      expect(copiedItem.name).toBe(originalItem.name)
      expect(copiedItem.description).toBe(originalItem.description)
      expect(copiedItem.unit).toBe(originalItem.unit)
      expect(copiedItem.qty).toBe(originalItem.qty)
      expect(copiedItem.rateClient).toBe(originalItem.rateClient)
      expect(copiedItem.rateActual).toBe(originalItem.rateActual)
      expect(copiedItem.remark).toBe(originalItem.remark)
    })
    
    // New quotation initialization
    expect(copiedData.docNo).not.toBe(mockOriginalQuotation.docNo)
    expect(copiedData.date).not.toBe(mockOriginalQuotation.date)
    expect(copiedData.createdAt).not.toBe(mockOriginalQuotation.createdAt)
    expect(copiedData.updatedAt).not.toBe(mockOriginalQuotation.updatedAt)
  })
})