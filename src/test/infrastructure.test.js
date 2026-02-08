import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  containsStandaloneBrassSpace, 
  isValidPackageName,
  getProjectRoot 
} from './brandNameUtils'

describe('Testing Infrastructure', () => {
  it('should have fast-check available', () => {
    expect(fc).toBeDefined()
    expect(typeof fc.assert).toBe('function')
  })

  it('should have brand name utilities available', () => {
    expect(containsStandaloneBrassSpace).toBeDefined()
    expect(isValidPackageName).toBeDefined()
    expect(getProjectRoot).toBeDefined()
  })

  it('should detect standalone Brass Space', () => {
    expect(containsStandaloneBrassSpace('Brass Space')).toBe(true)
    expect(containsStandaloneBrassSpace('Brass Space Interior')).toBe(false)
    expect(containsStandaloneBrassSpace('Brass Space Interior Solution')).toBe(false)
  })

  it('should validate package names', () => {
    expect(isValidPackageName('brass-space-interior')).toBe(true)
    expect(isValidPackageName('brass-space-interior-quotation')).toBe(true)
    expect(isValidPackageName('brass-space')).toBe(false)
    expect(isValidPackageName('brass-space-quotation')).toBe(false)
  })

  it('should run property-based tests', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        return typeof str === 'string'
      }),
      { numRuns: 10 }
    )
  })
})
