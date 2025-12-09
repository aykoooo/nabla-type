//==============================================================
//  INITIAL TEXTURE
//  - To start (or reset) the simulation, we need to "seed"
//    the very first frame with some pattern of data.
//==============================================================

import * as THREE from 'three';

import parameterValues from './parameterValues';
import { getTypographyMetrics } from './guidelines';
import { displayUniforms, passthroughUniforms, simulationUniforms } from './uniforms';
import { displayMaterial, passthroughMaterial, simulationMaterial } from './materials';
import { hasFontLoaded, drawTextWithFont } from './fontLoader';
import { createBoundaryMask } from './boundaryProcessor';
import { resetIterations } from './stats';

let bufferImage, bufferCanvasCtx;

export const InitialTextureTypes = {
  CIRCLE: 0,
  SQUARE: 1,
  TEXT: 2,
  IMAGE: 3,
  EMPTY: 4,
  DRAWING: 5
};

/**
 * Apply Gaussian blur to canvas using StackBlur algorithm
 * Uses CSS filter for hardware acceleration when available
 */
function applyGaussianBlur(ctx, width, height, radius) {
  if (radius <= 0) return;
  
  // Use CSS filter if available (much faster)
  if (typeof ctx.filter !== 'undefined') {
    // Get current image data
    const imageData = ctx.getImageData(0, 0, width, height);
    
    // Clear and apply blur filter
    ctx.filter = `blur(${radius}px)`;
    ctx.putImageData(imageData, 0, 0);
    
    // Redraw with blur
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Reset filter
    ctx.filter = 'none';
  } else {
    // Fallback: simple box blur (less accurate but works everywhere)
    boxBlur(ctx, width, height, Math.ceil(radius));
  }
}

/**
 * Simple box blur fallback
 */
function boxBlur(ctx, width, height, radius) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  
  const kernelSize = radius * 2 + 1;
  const kernelArea = kernelSize * kernelSize;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;
      
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const nx = Math.min(width - 1, Math.max(0, x + kx));
          const ny = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (ny * width + nx) * 4;
          
          r += copy[idx];
          g += copy[idx + 1];
          b += copy[idx + 2];
          a += copy[idx + 3];
          count++;
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = r / count;
      data[idx + 1] = g / count;
      data[idx + 2] = b / count;
      data[idx + 3] = a / count;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

export function drawFirstFrame(type = InitialTextureTypes.CIRCLE) {
  // Reset iteration counter on every restart
  resetIterations();
  // Grab the invisible canvas context that we can draw initial image data into
  global.bufferCanvas = document.querySelector('#buffer-canvas');
  bufferCanvasCtx = bufferCanvas.getContext('2d', { willReadFrequently: true });

  // Resize buffer canvas to match current canvas dimensions
  bufferCanvas.width = parameterValues.canvas.width;
  bufferCanvas.height = parameterValues.canvas.height;

  // Grab the invisible <img> tag that we can use to draw images from the file system, then copy into the buffer canvas
  bufferImage = document.querySelector('#buffer-image');

  // Clear the invisible canvas
  bufferCanvasCtx.fillStyle = '#fff';
  bufferCanvasCtx.fillRect(0, 0, parameterValues.canvas.width, parameterValues.canvas.height);

  // Build initial simulation texture data and pass it on to the render targets
  const centerX = parameterValues.canvas.width/2,
        centerY = parameterValues.canvas.height/2;

  switch(type) {
    case InitialTextureTypes.CIRCLE:
      bufferCanvasCtx.beginPath();
      bufferCanvasCtx.arc(centerX, centerY, parameterValues.seed.circle.radius, 0, Math.PI*2);
      bufferCanvasCtx.fillStyle = '#000';
      bufferCanvasCtx.fill();
      renderInitialDataToRenderTargets( convertPixelsToTextureData() );
      break;

    case InitialTextureTypes.SQUARE:
      bufferCanvasCtx.fillStyle = '#000';

      bufferCanvasCtx.translate(parameterValues.canvas.width/2, parameterValues.canvas.height/2);
      bufferCanvasCtx.rotate(parameterValues.seed.square.rotation * Math.PI / 180);
      bufferCanvasCtx.translate(-parameterValues.canvas.width/2, -parameterValues.canvas.height/2);

      bufferCanvasCtx.fillRect(
        centerX - parameterValues.seed.square.width/2,
        centerY - parameterValues.seed.square.height/2,
        parameterValues.seed.square.width,
        parameterValues.seed.square.height
      );

      bufferCanvasCtx.resetTransform();
      renderInitialDataToRenderTargets( convertPixelsToTextureData() );
      break;

    case InitialTextureTypes.TEXT: {
      bufferCanvasCtx.fillStyle = '#000';
      
      const useCustomFont = parameterValues.seed.font.useCustomFont && hasFontLoaded();
      
      if (!useCustomFont) {
        // Map boldness 0-3 to font weights 400-900
        // 0 -> 400 (Normal)
        // 1 -> 600 (Semi-Bold)
        // 2 -> 800 (Extra-Bold)
        // 3 -> 900 (Black)
        let weight = 400;
        if (parameterValues.seed.text.boldness > 2.5) weight = 900;
        else if (parameterValues.seed.text.boldness > 1.5) weight = 800;
        else if (parameterValues.seed.text.boldness > 0.5) weight = 600;
        else if (parameterValues.seed.text.boldness > 0) weight = 500;
        
        bufferCanvasCtx.font = weight + ' ' + parameterValues.seed.text.size + 'px Arial';
      }
      
      bufferCanvasCtx.textAlign = 'center';
      bufferCanvasCtx.textBaseline = 'alphabetic';

      const multilineText = parameterValues.seed.text.value || 'A';
      const textLines = multilineText.split(/\r?\n/);
      const lineHeight = parameterValues.seed.text.size * parameterValues.typography.lineHeight;
      const metrics = getTypographyMetrics(parameterValues.canvas.height);

      bufferCanvasCtx.translate(parameterValues.canvas.width/2, parameterValues.canvas.height/2);
      bufferCanvasCtx.rotate(parameterValues.seed.text.rotation * Math.PI / 180);
      bufferCanvasCtx.translate(-parameterValues.canvas.width/2, -parameterValues.canvas.height/2);

      textLines.forEach((line, index) => {
        const baselineY = metrics.baseline - ((textLines.length - 1) - index) * lineHeight;
        
        if (useCustomFont) {
          drawTextWithFont(bufferCanvasCtx, line, centerX, baselineY, parameterValues.seed.text.size, parameterValues.seed.text.boldness);
        } else {
          bufferCanvasCtx.fillText(line, centerX, baselineY);
        }
      });

      bufferCanvasCtx.resetTransform();
      renderInitialDataToRenderTargets( convertPixelsToTextureData() );
      break;
    }

    case InitialTextureTypes.IMAGE:
      if(parameterValues.seed.image.image != null) {
        getImagePixels(parameterValues.seed.image.image, centerX, centerY)
          .then((initialData) => {
            renderInitialDataToRenderTargets(initialData);
          })
          .catch(error => console.error(error));
      } else {
        alert('Upload an image using the button first!');
      }
      break;

    case InitialTextureTypes.EMPTY:
      bufferCanvasCtx.clearRect(0, 0, parameterValues.canvas.width, parameterValues.canvas.height);
      renderInitialDataToRenderTargets( convertPixelsToTextureData() );
      break;

    case InitialTextureTypes.DRAWING:
      // Use custom drawing from drawing editor
      if (global.customDrawingSeed) {
        bufferCanvasCtx.putImageData(global.customDrawingSeed, 0, 0);
        renderInitialDataToRenderTargets( convertPixelsToTextureData() );
        
        // If custom boundary was also drawn, use it
        if (global.customDrawingBoundary && parameterValues.boundary.enabled) {
          // Will be processed in generateBoundaryMask via bufferCanvas
        }
      } else {
        console.warn('No custom drawing data available');
        renderInitialDataToRenderTargets( convertPixelsToTextureData() );
      }
      break;
  }
}

  function renderInitialDataToRenderTargets(initialData) {
    // Put the initial data into a texture format that ThreeJS can pass into the render targets
    let texture = new THREE.DataTexture(initialData, parameterValues.canvas.width, parameterValues.canvas.height, THREE.RGBAFormat, THREE.FloatType);
    texture.flipY = true;  // DataTexture coordinates are vertically inverted compared to canvas coordinates
    texture.needsUpdate = true;

    // Pass the DataTexture to the passthrough material
    passthroughUniforms.textureToDisplay.value = texture;

    // Activate the passthrough material
    displayMesh.material = passthroughMaterial;

    // Render the DataTexture into both of the render targets
    for(let i=0; i<2; i++) {
      renderer.setRenderTarget(renderTargets[i]);
      renderer.render(scene, camera);
    }

    // GENERATE BOUNDARY MASK if enabled
    if (parameterValues.boundary.enabled) {
      generateBoundaryMask();
    } else {
      // Disable boundary if not enabled
      simulationMaterial.uniforms.enableBoundary.value = false;
    }

    // Switch back to the display material and pass along the initial rendered texture
    displayUniforms.textureToDisplay.value = renderTargets[0].texture;
    displayUniforms.previousIterationTexture.value = renderTargets[0].texture;
    displayMesh.material = displayMaterial;

    // Set the render target back to the default display buffer and render the first frame
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  function getImagePixels(imageData, centerX, centerY) {
    // Create an asynchronous Promise that can be used to wait for the image to load
    return new Promise((resolve) => {
      bufferImage.src = imageData;

      bufferImage.addEventListener('load', () => {
        bufferCanvasCtx.translate(parameterValues.canvas.width/2 * parameterValues.seed.image.scale, parameterValues.canvas.height/2 * parameterValues.seed.image.scale);
        bufferCanvasCtx.rotate(parameterValues.seed.image.rotation * Math.PI / 180);
        bufferCanvasCtx.translate(-parameterValues.canvas.width/2 * parameterValues.seed.image.scale, -parameterValues.canvas.height/2 * parameterValues.seed.image.scale);

        let startX, startY, width, height;

        switch(parameterValues.seed.image.fit) {
          // None - use the image's true dimensions
          case 0:
            startX = centerX - bufferImage.width/2;
            startY = centerY - bufferImage.height/2;
            width = bufferImage.width * parameterValues.seed.image.scale;
            height = bufferImage.height * parameterValues.seed.image.scale;
            break;

          // Scale - scale the image up or down to fit the canvas without stretching
          // https://stackoverflow.com/a/50165098
          case 1:
            const widthRatio = parameterValues.canvas.width / bufferImage.width,
                  heightRatio = parameterValues.canvas.height / bufferImage.height,
                  bestFitRatio = Math.min(widthRatio, heightRatio),
                  scaledWidth = bufferImage.width * bestFitRatio,
                  scaledHeight = bufferImage.height * bestFitRatio;

            startX = centerX - scaledWidth/2;
            startY = centerY - scaledHeight/2;
            width = scaledWidth;
            height = scaledHeight;
            break;

          // Stretch
          case 2:
            startX = 0;
            startY = 0;
            width = parameterValues.canvas.width;
            height = parameterValues.canvas.height;
            break;
        }

        bufferCanvasCtx.drawImage(bufferImage, startX, startY, width, height);

        bufferCanvasCtx.resetTransform();
        resolve(convertPixelsToTextureData());
      });
    });
  }

  // Create initial data based on the current content of the invisible canvas
  function convertPixelsToTextureData() {
    // Apply blur if enabled
    if (parameterValues.seed.blur > 0) {
      applyGaussianBlur(bufferCanvasCtx, parameterValues.canvas.width, parameterValues.canvas.height, parameterValues.seed.blur);
    }

    let pixels = bufferCanvasCtx.getImageData(0, 0, parameterValues.canvas.width, parameterValues.canvas.height).data;
    let data = new Float32Array(pixels.length);

    // Use grayscale mode if explicitly enabled OR if blur is applied
    const useGrayscale = parameterValues.seed.useGrayscale || parameterValues.seed.blur > 0;

    for(let i=0; i<data.length; i+=4) {
      data[i] = 1.0;
      
      if (useGrayscale) {
        // Grayscale mode: map brightness to chemical B concentration
        // Black (0) = full seed (0.5), White (255) = no seed (0.0)
        const brightness = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
        data[i+1] = (1.0 - brightness / 255.0) * 0.5;
      } else {
        // Binary mode: original behavior
        data[i+1] = pixels[i+1] == 0 ? 0.5 : 0.0;
      }
      
      data[i+2] = 0.0;
      data[i+3] = 0.0;
    }

    return data;
  }

  function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate boundary mask from current buffer canvas
   * Called when boundary conditions are enabled
   */
  function generateBoundaryMask() {
    let boundaryData;
    
    // Check if we have a custom drawn boundary
    if (global.customDrawingBoundary) {
      // Use custom drawn boundary directly
      const imageData = global.customDrawingBoundary;
      const width = imageData.width;
      const height = imageData.height;
      boundaryData = new Float32Array(width * height);
      
      // Convert ImageData to Float32Array
      // BLACK = Wall/Constraint (pattern blocked) = 0.0
      // TRANSPARENT/ERASED = Open space (pattern allowed) = 1.0
      for (let i = 0; i < width * height; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        const a = imageData.data[i * 4 + 3];
        
        // If transparent (erased), allow pattern
        if (a < 128) {
          boundaryData[i] = 1.0;  // Open space - pattern can go here
        } else {
          // If opaque, check luminance
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          // Black = wall (0.0), White = open (1.0)
          boundaryData[i] = luminance < 128 ? 0.0 : 1.0;
        }
      }
      
      console.log('Using custom drawn boundary mask (inverted: black=wall, transparent=open)');
    } else {
      // Generate boundary from seed pattern
      boundaryData = createBoundaryMask(bufferCanvas, {
        mode: parameterValues.boundary.mode,
        padding: parameterValues.boundary.padding,
        erosion: parameterValues.boundary.erosion,
        blurRadius: parameterValues.boundary.blurRadius,
        invert: parameterValues.boundary.invert
      });
    }

    // DEBUG: Check if boundary data contains non-zero values
    let nonZeroCount = 0;
    let oneCount = 0;
    for (let i = 0; i < Math.min(boundaryData.length, 1000); i++) {
      if (boundaryData[i] > 0) nonZeroCount++;
      if (boundaryData[i] >= 1.0) oneCount++;
    }
    console.log('Boundary mask sample (first 1000 pixels):', {
      nonZero: nonZeroCount,
      ones: oneCount,
      min: Math.min(...Array.from(boundaryData).slice(0, 1000)),
      max: Math.max(...Array.from(boundaryData).slice(0, 1000))
    });

    // Create DataTexture from boundary mask (single channel, red format)
    const boundaryTexture = new THREE.DataTexture(
      boundaryData,
      parameterValues.canvas.width,
      parameterValues.canvas.height,
      THREE.RedFormat,
      THREE.FloatType
    );
    boundaryTexture.flipY = true;  // Match DataTexture coordinate system
    boundaryTexture.needsUpdate = true;

    // Pass boundary texture to simulation shader
    simulationMaterial.uniforms.boundaryMask.value = boundaryTexture;
    simulationMaterial.uniforms.enableBoundary.value = true;
    
    // Pass boundary texture to display shader for overlay visualization
    displayMaterial.uniforms.boundaryMaskDisplay.value = boundaryTexture;
    
    // Set soft boundary falloff if in 'soft' mode
    if (parameterValues.boundary.mode === 'soft') {
      simulationMaterial.uniforms.boundaryFalloff.value = 0.3;
    } else {
      simulationMaterial.uniforms.boundaryFalloff.value = 0.0;
    }

    console.log('Boundary mask generated:', {
      mode: parameterValues.boundary.mode,
      size: `${parameterValues.canvas.width}x${parameterValues.canvas.height}`,
      enabled: true,
      uniformValue: simulationMaterial.uniforms.enableBoundary.value
    });
  }

  // Export generateBoundaryMask so it can be called from UI
  export { generateBoundaryMask };