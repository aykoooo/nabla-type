//==============================================================
//  GLYPH EXPORT
//  - Export specific glyphs or ranges of glyphs
//  - Similar to print page selection functionality
//==============================================================

import parameterValues from './parameterValues';
import { drawFirstFrame, InitialTextureTypes } from './firstFrame';

let modal = null;
let currentGlyphs = [];

/**
 * Initialize the glyph export modal
 */
export function initGlyphExportModal() {
  if (modal) return;
  createModal();
}

/**
 * Create the glyph export modal
 */
function createModal() {
  modal = document.createElement('div');
  modal.className = 'glyph-export-modal';
  modal.id = 'glyph-export-modal';
  
  modal.innerHTML = `
    <div class="glyph-export-container">
      <div class="glyph-export-header">
        <h2>Export Specific Glyphs</h2>
        <button class="font-source-close" title="Close">✕</button>
      </div>
      
      <div class="glyph-export-content">
        <label for="glyph-selection">Enter glyphs to export:</label>
        <input type="text" 
               class="glyph-export-input" 
               id="glyph-selection" 
               placeholder="e.g., A-Z, a-z, 0-9 or ABC123"
               value="">
        <div class="glyph-export-hint">
          Use ranges (A-Z) or individual characters (ABC). Separate with commas for multiple ranges.
        </div>
        
        <div class="glyph-export-preview" id="glyph-preview">
          <h4>Glyphs to export: <span id="glyph-count">0</span></h4>
          <div id="glyph-list" style="font-family: monospace; color: #888; margin-top: 8px; word-break: break-all;"></div>
        </div>
      </div>
      
      <div class="glyph-export-options" style="margin-top: 20px;">
        <div class="font-source-toggle" style="justify-content: space-between; padding: 12px 0;">
          <label style="color: #ccc;">Export as individual files</label>
          <div class="toggle-switch" id="individual-files-toggle"></div>
        </div>
        <div class="font-source-toggle" style="justify-content: space-between; padding: 12px 0;">
          <label style="color: #ccc;">Include SVG format</label>
          <div class="toggle-switch active" id="svg-format-toggle"></div>
        </div>
      </div>
      
      <div class="glyph-export-actions">
        <button class="font-source-cancel">Cancel</button>
        <button class="font-source-apply">Export Glyphs</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Close button
  modal.querySelector('.font-source-close').addEventListener('click', hideGlyphExportModal);
  modal.querySelector('.font-source-cancel').addEventListener('click', hideGlyphExportModal);
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideGlyphExportModal();
    }
  });
  
  // Glyph input
  const input = modal.querySelector('#glyph-selection');
  input.addEventListener('input', (e) => {
    updateGlyphPreview(e.target.value);
  });
  
  // Toggle switches
  const individualToggle = modal.querySelector('#individual-files-toggle');
  individualToggle.addEventListener('click', () => {
    individualToggle.classList.toggle('active');
  });
  
  const svgToggle = modal.querySelector('#svg-format-toggle');
  svgToggle.addEventListener('click', () => {
    svgToggle.classList.toggle('active');
  });
  
  // Export button
  modal.querySelector('.font-source-apply').addEventListener('click', () => {
    exportSelectedGlyphs();
  });
}

/**
 * Parse glyph selection string into array of characters
 * @param {string} input - Selection string (e.g., "A-Z, a-z, 0-9, ABC")
 * @returns {string[]} - Array of individual characters
 */
export function parseGlyphSelection(input) {
  const glyphs = new Set();
  
  // Split by comma for multiple selections
  const parts = input.split(',').map(p => p.trim());
  
  for (const part of parts) {
    // Check if it's a range (e.g., A-Z)
    const rangeMatch = part.match(/^(.)-(.)/);
    if (rangeMatch) {
      const start = rangeMatch[1].charCodeAt(0);
      const end = rangeMatch[2].charCodeAt(0);
      
      if (start <= end) {
        for (let i = start; i <= end; i++) {
          glyphs.add(String.fromCharCode(i));
        }
      } else {
        // Reverse range
        for (let i = start; i >= end; i--) {
          glyphs.add(String.fromCharCode(i));
        }
      }
    } else {
      // Individual characters
      for (const char of part) {
        if (char.trim()) {
          glyphs.add(char);
        }
      }
    }
  }
  
  return Array.from(glyphs);
}

/**
 * Update the glyph preview
 */
function updateGlyphPreview(input) {
  const glyphs = parseGlyphSelection(input);
  currentGlyphs = glyphs;
  
  const countEl = modal.querySelector('#glyph-count');
  const listEl = modal.querySelector('#glyph-list');
  
  countEl.textContent = glyphs.length;
  listEl.textContent = glyphs.join(' ');
}

/**
 * Export the selected glyphs
 */
async function exportSelectedGlyphs() {
  if (currentGlyphs.length === 0) {
    alert('Please enter glyphs to export');
    return;
  }
  
  const individualFiles = modal.querySelector('#individual-files-toggle').classList.contains('active');
  const includeSVG = modal.querySelector('#svg-format-toggle').classList.contains('active');
  
  console.log('Exporting glyphs:', {
    glyphs: currentGlyphs,
    individualFiles,
    includeSVG
  });
  
  // Store original text value
  const originalText = parameterValues.seed.text.value;
  const originalMode = parameterValues.mode;
  
  try {
    // Switch to glyph mode for individual exports
    parameterValues.mode = 'glyph';
    
    if (individualFiles) {
      // Export each glyph as individual file
      for (const glyph of currentGlyphs) {
        await exportSingleGlyph(glyph, includeSVG);
      }
    } else {
      // Export all glyphs in a single image/file
      await exportGlyphsSheet(currentGlyphs, includeSVG);
    }
    
    hideGlyphExportModal();
    console.log('Export complete!');
    
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed: ' + error.message);
  } finally {
    // Restore original settings
    parameterValues.seed.text.value = originalText;
    parameterValues.mode = originalMode;
  }
}

/**
 * Export a single glyph
 */
async function exportSingleGlyph(glyph, includeSVG) {
  // Set the glyph as the text
  parameterValues.seed.text.value = glyph;
  
  // Draw the frame
  drawFirstFrame(InitialTextureTypes.TEXT);
  
  // Wait for rendering
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Check if renderer is available
  if (!global.renderer || !global.renderer.domElement) {
    console.error('Renderer not available');
    return;
  }
  
  // Export PNG
  const canvas = global.renderer.domElement;
  const pngLink = document.createElement('a');
  pngLink.download = `glyph-${glyph.charCodeAt(0)}-${glyph}.png`;
  pngLink.href = canvas.toDataURL('image/png');
  pngLink.click();
  
  // Export SVG if requested
  if (includeSVG) {
    try {
      const { exportAsSVG, downloadSVG } = await import('./vectorExport.js');
      const svg = await exportAsSVG(
        parameterValues.rendering.exportThreshold,
        parameterValues.rendering.brightness,
        parameterValues.rendering.contrast
      );
      downloadSVG(svg, `glyph-${glyph.charCodeAt(0)}-${glyph}.svg`);
    } catch (error) {
      console.warn('SVG export failed for glyph:', glyph, error);
    }
  }
}

/**
 * Export all glyphs as a sheet
 */
async function exportGlyphsSheet(glyphs, includeSVG) {
  // Create a combined text with all glyphs
  // Arrange in rows for better viewing
  const glyphsPerRow = 10;
  let text = '';
  
  for (let i = 0; i < glyphs.length; i++) {
    text += glyphs[i];
    if ((i + 1) % glyphsPerRow === 0 && i < glyphs.length - 1) {
      text += '\n';
    } else if (i < glyphs.length - 1) {
      text += '  ';
    }
  }
  
  // Switch to preview mode for sheet
  const originalMode = parameterValues.mode;
  parameterValues.mode = 'preview';
  parameterValues.seed.text.value = text;
  
  // Draw the frame
  drawFirstFrame(InitialTextureTypes.TEXT);
  
  // Wait for rendering
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Check if renderer is available
  if (!global.renderer || !global.renderer.domElement) {
    console.error('Renderer not available');
    parameterValues.mode = originalMode;
    return;
  }
  
  // Export PNG
  const canvas = global.renderer.domElement;
  const pngLink = document.createElement('a');
  pngLink.download = `glyphs-sheet-${Date.now()}.png`;
  pngLink.href = canvas.toDataURL('image/png');
  pngLink.click();
  
  // Export SVG if requested
  if (includeSVG) {
    try {
      const { exportAsSVG, downloadSVG } = await import('./vectorExport.js');
      const svg = await exportAsSVG(
        parameterValues.rendering.exportThreshold,
        parameterValues.rendering.brightness,
        parameterValues.rendering.contrast
      );
      downloadSVG(svg, `glyphs-sheet-${Date.now()}.svg`);
    } catch (error) {
      console.warn('SVG export failed for sheet:', error);
    }
  }
  
  // Restore mode
  parameterValues.mode = originalMode;
}

/**
 * Show the glyph export modal
 */
export function showGlyphExportModal() {
  if (!modal) {
    initGlyphExportModal();
  }
  
  // Clear previous input
  const input = modal.querySelector('#glyph-selection');
  input.value = '';
  updateGlyphPreview('');
  
  modal.classList.add('active');
}

/**
 * Hide the glyph export modal
 */
export function hideGlyphExportModal() {
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Quick export common glyph sets
 */
export const CommonGlyphSets = {
  UPPERCASE: 'A-Z',
  LOWERCASE: 'a-z',
  NUMBERS: '0-9',
  BASIC_PUNCTUATION: '.,!?-_',
  FULL_ALPHABET: 'A-Z, a-z',
  ALPHANUMERIC: 'A-Z, a-z, 0-9'
};
