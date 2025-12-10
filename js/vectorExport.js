import { loadFromCanvas } from 'potrace-wasm';
import paper from 'paper/dist/paper-core';
import { exportImage } from './export';

/**
 * Export current simulation as SVG vector
 * @param {number} threshold - Black/white threshold (0-255)
 * @param {number} brightness - Brightness adjustment (0-2, default 1.0)
 * @param {number} contrast - Contrast adjustment (0-2, default 1.0)
 * @returns {Promise<string>} - SVG content as string
 */
export async function exportAsSVG(threshold = 128, brightness = 1.0, contrast = 1.0) {
  try {
    console.log('Capturing current canvas...');

    // Get current canvas directly (no scaling)
    const canvas = captureCurrentCanvas();

    console.log('Applying adjustments...');

    // Convert to grayscale
    let imageData = getImageData(canvas);

    // Apply brightness/contrast if not default values
    if (brightness !== 1.0 || contrast !== 1.0) {
      console.log(`Applying brightness: ${brightness}, contrast: ${contrast}`);
      imageData = applyBrightnessContrast(imageData, brightness, contrast);
    }

    // Apply threshold
    const binaryData = applyThreshold(imageData, threshold);

    // Create a temporary canvas with binary data
    const binaryCanvas = createBinaryCanvas(binaryData, canvas.width, canvas.height);

    console.log('Running Potrace...');

    // Convert to SVG using potrace-wasm's loadFromCanvas
    const rawSvg = await loadFromCanvas(binaryCanvas);

    // Simplify the resulting SVG paths to reduce jagged edges / teeth
    const simplifiedSvg = simplifySvg(rawSvg, 1.2);

    console.log('SVG generation complete');

    return simplifiedSvg;
  } catch (error) {
    console.error('SVG export failed:', error);
    throw error;
  }
}

/**
 * Capture current canvas at native resolution
 * @returns {HTMLCanvasElement} - Canvas with current simulation state
 */
function captureCurrentCanvas() {
  const sourceCanvas = global.renderer.domElement;

  // Create a copy of the canvas
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  return canvas;
}

/**
 * Render current simulation at higher resolution (DEPRECATED - kept for compatibility)
 * @param {number} scale - Resolution scale factor
 * @returns {Promise<HTMLCanvasElement>} - High-res canvas
 */
async function renderHighResCanvas(scale) {
  const { renderer, camera, displayMaterial, scene } = global;

  // Store original size
  const originalWidth = renderer.domElement.width;
  const originalHeight = renderer.domElement.height;

  // Calculate high-res dimensions
  const highResWidth = Math.floor(originalWidth * scale);
  const highResHeight = Math.floor(originalHeight * scale);

  // Create high-res render target
  const highResTarget = new THREE.WebGLRenderTarget(highResWidth, highResHeight, {
    format: THREE.RGBAFormat,
    type: THREE.FloatType
  });

  // Temporarily resize renderer
  renderer.setSize(highResWidth, highResHeight, false);

  // Render to high-res target
  renderer.setRenderTarget(highResTarget);
  renderer.render(scene, camera);

  // Read pixels from render target
  const pixels = new Float32Array(highResWidth * highResHeight * 4);
  renderer.readRenderTargetPixels(highResTarget, 0, 0, highResWidth, highResHeight, pixels);

  // Create canvas from pixels
  const canvas = document.createElement('canvas');
  canvas.width = highResWidth;
  canvas.height = highResHeight;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(highResWidth, highResHeight);

  // Convert float pixels to RGBA
  for (let i = 0; i < pixels.length; i += 4) {
    const r = Math.floor(pixels[i] * 255);
    const g = Math.floor(pixels[i + 1] * 255);
    const b = Math.floor(pixels[i + 2] * 255);
    const a = Math.floor(pixels[i + 3] * 255);

    imageData.data[i] = r;
    imageData.data[i + 1] = g;
    imageData.data[i + 2] = b;
    imageData.data[i + 3] = a;
  }

  ctx.putImageData(imageData, 0, 0);

  // Restore original renderer size
  renderer.setSize(originalWidth, originalHeight, false);
  renderer.setRenderTarget(null);

  // Clean up
  highResTarget.dispose();

  return canvas;
}

/**
 * Get ImageData from canvas
 * @param {HTMLCanvasElement} canvas
 * @returns {ImageData}
 */
function getImageData(canvas) {
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Apply brightness and contrast adjustments to image data
 * @param {ImageData} imageData
 * @param {number} brightness - 0-2 multiplier (1.0 = no change)
 * @param {number} contrast - 0-2 multiplier (1.0 = no change)
 * @returns {ImageData}
 */
function applyBrightnessContrast(imageData, brightness, contrast) {
  const data = imageData.data;
  const adjusted = new Uint8ClampedArray(data.length);

  // Convert brightness from 0-2 range to -128 to +128
  const brightnessOffset = (brightness - 1.0) * 128;

  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast and brightness to RGB channels
    for (let j = 0; j < 3; j++) {
      // Contrast: center around 128, apply multiplier, then offset back
      let value = data[i + j];
      value = ((value - 128) * contrast) + 128;
      // Brightness: add offset
      value += brightnessOffset;
      // Clamp to valid range
      adjusted[i + j] = Math.max(0, Math.min(255, value));
    }
    // Alpha channel unchanged
    adjusted[i + 3] = data[i + 3];
  }

  return new ImageData(adjusted, imageData.width, imageData.height);
}

/**
 * Apply threshold to create binary image
 * @param {ImageData} imageData
 * @param {number} threshold
 * @returns {Uint8ClampedArray}
 */
function applyThreshold(imageData, threshold) {
  const data = imageData.data;
  const binary = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale using luminance
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = gray > threshold ? 255 : 0;

    binary[i] = value;     // R
    binary[i + 1] = value; // G
    binary[i + 2] = value; // B
    binary[i + 3] = 255;   // A
  }

  return binary;
}

/**
 * Create canvas from binary data
 * @param {Uint8ClampedArray} binaryData
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
function createBinaryCanvas(binaryData, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(binaryData, width, height);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Simplify SVG paths using Paper.js
 * @param {string} svgContent
 * @param {number} tolerance - higher = more aggressive simplification
 * @returns {string}
 */
function simplifySvg(svgContent, tolerance = 0.4) {
  try {
    const scope = new paper.PaperScope();
    // Minimal setup; view size will adjust to imported SVG
    scope.setup(new scope.Size(1, 1));

    const item = scope.project.importSVG(svgContent, { expandShapes: true });
    if (!item) {
      scope.project.clear();
      return svgContent;
    }

    // Determine content bounds
    const contentBounds = item.bounds || scope.project.activeLayer.bounds;
    if (contentBounds) {
      // Normalize to origin so exported viewBox matches content
      item.translate(contentBounds.topLeft.multiply(-1));
      scope.view.viewSize = contentBounds.size;
    }

    // Collect all path items (Path + CompoundPath)
    const paths = item.getItems({
      recursive: true,
      match: (el) => el instanceof scope.PathItem
    });

    // Flatten curves then simplify to remove “teeth”
    paths.forEach((p) => {
      try {
        if (p.flatten) p.flatten(tolerance);
        if (p.simplify) p.simplify(tolerance);
      } catch (e) {
        // ignore individual path errors
      }
    });

    const result = scope.project.exportSVG({
      asString: true,
      bounds: contentBounds || undefined
    });
    scope.project.clear();
    return typeof result === 'string' ? result : svgContent;
  } catch (err) {
    console.warn('SVG simplification skipped:', err);
    return svgContent;
  }
}

/**
 * Download SVG file
 * @param {string} svgContent
 * @param {string} filename
 */
export function downloadSVG(svgContent, filename = 'reaction-diffusion.svg') {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export both PNG and SVG
 * @param {number} threshold
 * @param {number} brightness
 * @param {number} contrast
 */
export async function exportBothFormats(threshold = 128, brightness = 1.0, contrast = 1.0) {
  try {
    // Export PNG (existing functionality)
    exportImage();

    // Export SVG
    const svg = await exportAsSVG(threshold, brightness, contrast);
    downloadSVG(svg);

    console.log('Exported both PNG and SVG');
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed: ' + error.message);
  }
}