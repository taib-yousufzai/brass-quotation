import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Recursively get all files in a directory matching a pattern
 */
export function getFilesRecursively(dir, pattern = /\.(jsx?|tsx?|md)$/) {
  const files = []
  
  function traverse(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name)
        
        // Skip node_modules, dist, build, .git directories
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git', '.firebase'].includes(entry.name)) {
            traverse(fullPath)
          }
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  traverse(dir)
  return files
}

/**
 * Get all React component files (JSX/TSX files in src directory)
 */
export function getComponentFiles(projectRoot) {
  const srcDir = path.join(projectRoot, 'src')
  return getFilesRecursively(srcDir, /\.(jsx|tsx)$/)
}

/**
 * Get all package.json files in a project
 */
export function getPackageJsonFiles(projectRoot) {
  const files = []
  
  function traverse(currentPath, depth = 0) {
    // Don't go too deep or into node_modules
    if (depth > 3) return
    
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name)
        
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
          traverse(fullPath, depth + 1)
        } else if (entry.isFile() && entry.name === 'package.json') {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  traverse(projectRoot)
  return files
}

/**
 * Get all documentation files (markdown files)
 */
export function getDocumentationFiles(projectRoot) {
  return getFilesRecursively(projectRoot, /\.md$/i)
}

/**
 * Extract JSX content from a file (text between JSX tags)
 */
export function extractJSXContent(fileContent) {
  const jsxContent = []
  
  // Match content within JSX tags, including string literals
  const jsxStringPattern = /(?:>|=\s*["'`])([^<>"'`]*(?:Brass\s+Space[^<>"'`]*))(?:<|["'`])/gi
  let match
  
  while ((match = jsxStringPattern.exec(fileContent)) !== null) {
    jsxContent.push(match[1].trim())
  }
  
  return jsxContent
}

/**
 * Extract all comments from a file
 */
export function extractComments(fileContent) {
  const comments = []
  
  // Single-line comments
  const singleLinePattern = /\/\/\s*(.+)$/gm
  let match
  
  while ((match = singleLinePattern.exec(fileContent)) !== null) {
    comments.push(match[1].trim())
  }
  
  // Multi-line comments
  const multiLinePattern = /\/\*\s*([\s\S]*?)\s*\*\//g
  
  while ((match = multiLinePattern.exec(fileContent)) !== null) {
    comments.push(match[1].trim())
  }
  
  return comments
}

/**
 * Check if text contains standalone "Brass Space" (not followed by "Interior")
 */
export function containsStandaloneBrassSpace(text) {
  // Match "Brass Space" not followed by "Interior"
  const standalonePattern = /Brass\s+Space(?!\s+Interior)/i
  return standalonePattern.test(text)
}

/**
 * Check if package name follows the correct pattern
 */
export function isValidPackageName(packageName) {
  // Should contain "brass-space-interior" or be exactly "brass-space-interior"
  if (!packageName) return false
  
  const validPatterns = [
    /^brass-space-interior$/i,
    /^brass-space-interior-.+$/i,
  ]
  
  return validPatterns.some(pattern => pattern.test(packageName))
}

/**
 * Get the project root directory
 */
export function getProjectRoot() {
  // Go up from src/test to project root
  return path.resolve(__dirname, '../..')
}
