import potrace from 'potrace-wasm';
import { exportImage } from './export';

/**
 * Export current simulation as SVG vector
 * @param {number} threshold - Black/white threshold (0-255)
 * @param {number} resolutionScale - Scale factor for high-res export
 * @returns {Promise<string>} - SVG content as string
 */
export async function exportAsSVG(threshold = 128, resolutionScale = 1) {
  try {
    // Get current render target as high-res image
    const canvas = await renderHighResCanvas(resolutionScale);

    // Convert to grayscale and apply threshold
    const imageData = getImageData(canvas);
    const binaryData = applyThreshold(imageData, threshold);

    // Create a temporary canvas with binary data
    const binaryCanvas = createBinaryCanvas(binaryData, canvas.width, canvas.height);

    // Convert to SVG using potrace
    const svg = await potrace(binaryCanvas);

    return svg;
  } catch (error) {
    console.error('SVG export failed:', error);
    throw error;
  }
}

/**
 * Render current simulation at higher resolution
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
 * @param {number} resolutionScale
 */
export async function exportBothFormats(threshold = 128, resolutionScale = 1) {
  try {
    // Export PNG (existing functionality)
    exportImage();

    // Export SVG
    const svg = await exportAsSVG(threshold, resolutionScale);
    downloadSVG(svg);

    console.log('Exported both PNG and SVG');
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed: ' + error.message);
  }
}