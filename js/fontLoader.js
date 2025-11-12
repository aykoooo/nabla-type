import opentype from 'opentype.js';

let loadedFont = null;

/**
 * Load a font from an ArrayBuffer (from file upload)
 * @param {ArrayBuffer} buffer - Font file data
 * @returns {Promise<Object>} - Loaded opentype.js font object
 */
export function loadFontFromBuffer(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const font = opentype.parse(buffer);
      loadedFont = font;
      console.log('Font loaded successfully:', font.names.fullName.en);
      console.log('Font metrics:', {
        unitsPerEm: font.unitsPerEm,
        ascender: font.ascender,
        descender: font.descender
      });
      resolve(font);
    } catch (error) {
      console.error('Error loading font:', error);
      reject(error);
    }
  });
}

/**
 * Get the currently loaded font
 * @returns {Object|null} - opentype.js font object or null
 */
export function getLoadedFont() {
  return loadedFont;
}

/**
 * Check if a font is currently loaded
 * @returns {boolean}
 */
export function hasFontLoaded() {
  return loadedFont !== null;
}

/**
 * Clear the loaded font
 */
export function clearFont() {
  loadedFont = null;
}

/**
 * Draw text to canvas using the loaded font
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to render
 * @param {number} x - X position (will be adjusted for center alignment)
 * @param {number} y - Y position (baseline)
 * @param {number} fontSize - Font size in pixels
 */
export function drawTextWithFont(ctx, text, x, y, fontSize) {
  if (!loadedFont) {
    console.warn('No font loaded, using fallback');
    return false;
  }

  try {
    // Get the text width for center alignment
    const textWidth = loadedFont.getAdvanceWidth(text, fontSize);
    const adjustedX = x - (textWidth / 2); // Center align
    
    // Create a path from the text
    const path = loadedFont.getPath(text, adjustedX, y, fontSize);
    
    // Convert opentype.js path commands to Canvas path
    const p2d = new Path2D();
    path.commands.forEach(cmd => {
      switch (cmd.type) {
        case 'M': // moveTo
          p2d.moveTo(cmd.x, cmd.y);
          break;
        case 'L': // lineTo
          p2d.lineTo(cmd.x, cmd.y);
          break;
        case 'C': // bezierCurveTo
          p2d.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          break;
        case 'Q': // quadraticCurveTo
          p2d.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
          break;
        case 'Z': // closePath
          p2d.closePath();
          break;
      }
    });
    
    ctx.fill(p2d);
    return true;
  } catch (error) {
    console.error('Error drawing text with font:', error);
    return false;
  }
}

/**
 * Get glyph metrics for a character
 * @param {string} char - Character to measure
 * @param {number} fontSize - Font size in pixels
 * @returns {Object} - Metrics object
 */
export function getGlyphMetrics(char, fontSize) {
  if (!loadedFont) {
    return null;
  }

  const glyph = loadedFont.charToGlyph(char);
  const scale = fontSize / loadedFont.unitsPerEm;
  
  return {
    advanceWidth: glyph.advanceWidth * scale,
    leftSideBearing: glyph.leftSideBearing * scale,
    bbox: {
      x1: glyph.xMin * scale,
      y1: glyph.yMin * scale,
      x2: glyph.xMax * scale,
      y2: glyph.yMax * scale
    }
  };
}

/**
 * Get font metrics scaled to a specific font size
 * @param {number} fontSize - Font size in pixels
 * @returns {Object} - Font metrics
 */
export function getFontMetrics(fontSize) {
  if (!loadedFont) {
    return null;
  }

  const scale = fontSize / loadedFont.unitsPerEm;
  
  return {
    ascender: loadedFont.ascender * scale,
    descender: loadedFont.descender * scale,
    unitsPerEm: loadedFont.unitsPerEm,
    scale: scale
  };
}
