/**
 * Boundary Processor Module
 *
 * Generates boundary masks from seed canvas for constraining reaction-diffusion simulation.
 * Supports exact boundaries, padding (dilation), erosion, Gaussian blur (soft edges), and inversion.
 */

/**
 * Main function to create boundary mask from source canvas
 * @param {HTMLCanvasElement} sourceCanvas - Canvas containing seed pattern
 * @param {Object} options - Configuration options
 * @returns {Float32Array} - Boundary mask data (0.0 = outside, 1.0 = inside)
 */
export function createBoundaryMask(sourceCanvas, options = {}) {
    const {
        mode = 'exact',          // 'exact', 'padded', 'eroded', 'soft', 'inverted'
        padding = 0,              // Pixels to expand (if padded)
        erosion = 0,              // Pixels to contract (if eroded)
        blurRadius = 0,           // Gaussian blur sigma (if soft)
        invert = false            // Flip inside/outside
    } = options;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // 1. Get binary mask from source canvas
    const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, width, height);
    let binaryMask = createBinaryMask(imageData, width, height);

    // 2. Apply geometric transformations based on mode
    if (mode === 'padded' && padding > 0) {
        binaryMask = dilate(binaryMask, width, height, padding);
    }
    else if (mode === 'eroded' && erosion > 0) {
        binaryMask = erode(binaryMask, width, height, erosion);
    }
    else if (mode === 'soft' && blurRadius > 0) {
        binaryMask = gaussianBlur(binaryMask, width, height, blurRadius);
    }

    // 3. Invert if requested (either via 'inverted' mode or invert checkbox)
    if (mode === 'inverted' || invert) {
        for (let i = 0; i < binaryMask.length; i++) {
            binaryMask[i] = 1.0 - binaryMask[i];
        }
    }

    return binaryMask;
}

/**
 * Convert RGBA ImageData to binary mask (0.0 or 1.0)
 * Uses luminance (brightness) to detect seed pattern
 * Black pixels (seed) = 1.0 (inside boundary)
 * White pixels (background) = 0.0 (outside boundary)
 */
function createBinaryMask(imageData, width, height) {
    const pixels = imageData.data;
    const mask = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];

        // Calculate luminance (perceived brightness)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // Dark pixels (< 128 out of 255) are inside boundary
        // This matches how seeds are drawn (black on white)
        mask[i] = luminance < 128 ? 1.0 : 0.0;
    }

    return mask;
}

/**
 * Morphological dilation - expand boundary outward
 * Uses circular structuring element for uniform expansion
 */
function dilate(mask, width, height, radius) {
    const output = new Float32Array(width * height);
    const radiusSq = radius * radius;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            let maxVal = mask[idx];

            // Search in circular neighborhood
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx * dx + dy * dy > radiusSq) continue; // Skip if outside circle

                    const nx = x + dx;
                    const ny = y + dy;

                    // Clamp to bounds
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                    const nIdx = ny * width + nx;
                    maxVal = Math.max(maxVal, mask[nIdx]);
                }
            }

            output[idx] = maxVal;
        }
    }

    return output;
}

/**
 * Morphological erosion - shrink boundary inward
 * Uses circular structuring element for uniform contraction
 */
function erode(mask, width, height, radius) {
    const output = new Float32Array(width * height);
    const radiusSq = radius * radius;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            let minVal = mask[idx];

            // Search in circular neighborhood
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx * dx + dy * dy > radiusSq) continue; // Skip if outside circle

                    const nx = x + dx;
                    const ny = y + dy;

                    // Clamp to bounds
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                    const nIdx = ny * width + nx;
                    minVal = Math.min(minVal, mask[nIdx]);
                }
            }

            output[idx] = minVal;
        }
    }

    return output;
}

/**
 * Gaussian blur - creates soft boundaries with smooth falloff
 * Two-pass separable convolution for efficiency
 */
function gaussianBlur(mask, width, height, sigma) {
    // Generate 1D Gaussian kernel
    const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
    const kernel = new Float32Array(kernelSize);
    const center = Math.floor(kernelSize / 2);
    let kernelSum = 0;

    for (let i = 0; i < kernelSize; i++) {
        const x = i - center;
        kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernelSum += kernel[i];
    }

    // Normalize kernel
    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= kernelSum;
    }

    // Horizontal pass
    const temp = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let k = 0; k < kernelSize; k++) {
                const nx = x + k - center;
                if (nx >= 0 && nx < width) {
                    sum += mask[y * width + nx] * kernel[k];
                }
            }
            temp[y * width + x] = sum;
        }
    }

    // Vertical pass
    const output = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let k = 0; k < kernelSize; k++) {
                const ny = y + k - center;
                if (ny >= 0 && ny < height) {
                    sum += temp[ny * width + x] * kernel[k];
                }
            }
            output[y * width + x] = sum;
        }
    }

    return output;
}
