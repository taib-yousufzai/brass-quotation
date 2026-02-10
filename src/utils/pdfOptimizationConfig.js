/**
 * PDF Optimization Configuration for Quotation System
 * 
 * Optimized settings to minimize file sizes while maintaining professional quality
 */

// DPI Settings - Reduced from 300 DPI for smaller file sizes
export const DPI_SETTINGS = {
  STANDARD: 150,    // Standard quality - good for screen/email
  HIGH: 200,        // High quality - good for printing
  PRINT: 300        // Maximum quality - only when needed
};

// Scale settings for html2canvas
export const SCALE_SETTINGS = {
  STANDARD: 1.0,    // Reduced for smallest file size
  HIGH: 1.5,        // Balanced quality
  MAXIMUM: 2.0      // Higher quality
};

// JPEG compression quality
export const COMPRESSION_QUALITY = {
  STANDARD: 0.8,    // 80% - optimized for size and quality
  HIGH: 0.85,       // 85% - balanced
  MAXIMUM: 0.90     // 90% - high quality
};

// File size limits
export const FILE_SIZE_LIMITS = {
  TARGET_MB: 5,     // Target file size
  WARNING_MB: 8,    // Show warning above this
  MAX_MB: 10        // Maximum acceptable size
};

// Canvas capture configuration
export const CANVAS_CAPTURE_CONFIG = {
  STANDARD: {
    scale: SCALE_SETTINGS.STANDARD,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    imageTimeout: 15000
  },
  HIGH: {
    scale: SCALE_SETTINGS.HIGH,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    imageTimeout: 20000
  }
};

/**
 * Get optimal settings based on content complexity
 */
export const getOptimalSettings = (quality = 'standard') => {
  const presets = {
    standard: {
      scale: SCALE_SETTINGS.STANDARD,
      jpegQuality: COMPRESSION_QUALITY.STANDARD,
      format: 'jpeg',
      dpi: DPI_SETTINGS.STANDARD
    },
    high: {
      scale: SCALE_SETTINGS.HIGH,
      jpegQuality: COMPRESSION_QUALITY.HIGH,
      format: 'jpeg',
      dpi: DPI_SETTINGS.HIGH
    },
    maximum: {
      scale: SCALE_SETTINGS.MAXIMUM,
      jpegQuality: COMPRESSION_QUALITY.MAXIMUM,
      format: 'png',
      dpi: DPI_SETTINGS.PRINT
    }
  };

  return presets[quality] || presets.standard;
};

export default {
  DPI_SETTINGS,
  SCALE_SETTINGS,
  COMPRESSION_QUALITY,
  FILE_SIZE_LIMITS,
  CANVAS_CAPTURE_CONFIG,
  getOptimalSettings
};
