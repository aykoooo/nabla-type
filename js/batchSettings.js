//==============================================================
//  BATCH SETTINGS
//  - Apply settings to all glyphs at once
//  - Process multiple glyphs with current parameters
//==============================================================

import parameterValues from './parameterValues';
import { drawFirstFrame, InitialTextureTypes } from './firstFrame';
import { cacheGlyph, getCachedGlyphChars } from './fontSourceModal';

let modal = null;
let isProcessing = false;
let processingProgress = 0;

// Default glyph sets
const GlyphSets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  punctuation: '.,;:!?-_()[]{}@#$%&*+=<>/\\|\'"`~',
  basic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  extended: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?-_()'
};

/**
 * Initialize batch settings modal
 */
export function initBatchSettingsModal() {
  if (modal) return;
  createModal();
}

/**
 * Create the batch settings modal
 */
function createModal() {
  modal = document.createElement('div');
  modal.className = 'font-source-modal';
  modal.id = 'batch-settings-modal';
  
  modal.innerHTML = `
    <div class="font-source-container" style="max-width: 650px;">
      <div class="font-source-header">
        <h2>Apply Settings to All Glyphs</h2>
        <button class="font-source-close" title="Close">✕</button>
      </div>
      
      <div class="batch-content" style="margin-bottom: 20px;">
        <p style="color: #888; margin-bottom: 20px; line-height: 1.6;">
          Process multiple glyphs with the current reaction-diffusion parameters. 
          Each glyph will be rendered and cached for later use.
        </p>
        
        <div class="batch-presets" style="margin-bottom: 20px;">
          <label style="color: #fff; display: block; margin-bottom: 10px;">Quick Presets:</label>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <button class="preset-btn" data-preset="uppercase">A-Z</button>
            <button class="preset-btn" data-preset="lowercase">a-z</button>
            <button class="preset-btn" data-preset="numbers">0-9</button>
            <button class="preset-btn" data-preset="basic">Full Basic</button>
            <button class="preset-btn" data-preset="punctuation">Punctuation</button>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="color: #fff; display: block; margin-bottom: 10px;">Custom Glyphs:</label>
          <textarea id="batch-glyphs-input" 
                    style="width: 100%; height: 80px; padding: 12px; background: rgba(0,0,0,0.3); 
                           border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; 
                           color: #fff; font-family: monospace; font-size: 14px; resize: vertical;"
                    placeholder="Enter glyphs to process (e.g., ABCDEF123)"></textarea>
        </div>
        
        <div class="batch-options" style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <label style="color: #ccc;">Wait time between glyphs (ms)</label>
            <input type="number" id="batch-wait-time" value="500" min="100" max="5000" step="100"
                   style="width: 80px; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); 
                          border-radius: 4px; color: #fff; text-align: center;">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <label style="color: #ccc;">Simulation iterations</label>
            <input type="number" id="batch-iterations" value="2000" min="500" max="10000" step="500"
                   style="width: 80px; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); 
                          border-radius: 4px; color: #fff; text-align: center;">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="color: #ccc;">Save each glyph as image</label>
            <div class="toggle-switch" id="batch-save-toggle"></div>
          </div>
        </div>
        
        <div id="batch-progress" style="display: none; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #fff;">Processing...</span>
            <span id="batch-progress-text" style="color: #4a9eff;">0%</span>
          </div>
          <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
            <div id="batch-progress-bar" style="height: 100%; background: #4a9eff; width: 0%; transition: width 0.3s;"></div>
          </div>
          <div id="batch-current-glyph" style="color: #888; font-size: 12px; margin-top: 8px; text-align: center;"></div>
        </div>
      </div>
      
      <div class="font-source-actions">
        <button class="font-source-cancel">Cancel</button>
        <button class="font-source-apply" id="batch-start-btn">Start Processing</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add preset button styles
  const style = document.createElement('style');
  style.textContent = `
    .preset-btn {
      padding: 8px 16px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .preset-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    .preset-btn.active {
      background: #4a9eff;
      border-color: #4a9eff;
    }
  `;
  document.head.appendChild(style);
  
  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Close buttons
  modal.querySelector('.font-source-close').addEventListener('click', hideBatchSettingsModal);
  modal.querySelector('.font-source-cancel').addEventListener('click', () => {
    if (isProcessing) {
      isProcessing = false; // Stop processing
    }
    hideBatchSettingsModal();
  });
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal && !isProcessing) {
      hideBatchSettingsModal();
    }
  });
  
  // Preset buttons
  modal.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const input = modal.querySelector('#batch-glyphs-input');
      input.value = GlyphSets[preset] || '';
      
      // Update active state
      modal.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // Save toggle
  const saveToggle = modal.querySelector('#batch-save-toggle');
  saveToggle.addEventListener('click', () => {
    saveToggle.classList.toggle('active');
  });
  
  // Start button
  modal.querySelector('#batch-start-btn').addEventListener('click', startBatchProcessing);
}

/**
 * Start batch processing
 */
async function startBatchProcessing() {
  const input = modal.querySelector('#batch-glyphs-input');
  const glyphs = input.value.split('').filter(c => c.trim());
  
  if (glyphs.length === 0) {
    alert('Please enter glyphs to process');
    return;
  }
  
  const waitTime = parseInt(modal.querySelector('#batch-wait-time').value) || 500;
  const iterations = parseInt(modal.querySelector('#batch-iterations').value) || 2000;
  const saveImages = modal.querySelector('#batch-save-toggle').classList.contains('active');
  
  isProcessing = true;
  processingProgress = 0;
  
  // Show progress
  const progressEl = modal.querySelector('#batch-progress');
  const progressBar = modal.querySelector('#batch-progress-bar');
  const progressText = modal.querySelector('#batch-progress-text');
  const currentGlyph = modal.querySelector('#batch-current-glyph');
  const startBtn = modal.querySelector('#batch-start-btn');
  
  progressEl.style.display = 'block';
  startBtn.textContent = 'Processing...';
  startBtn.disabled = true;
  
  // Store original settings
  const originalText = parameterValues.seed.text.value;
  const originalMode = parameterValues.mode;
  
  try {
    parameterValues.mode = 'glyph';
    
    for (let i = 0; i < glyphs.length; i++) {
      if (!isProcessing) {
        console.log('Batch processing cancelled');
        break;
      }
      
      const glyph = glyphs[i];
      processingProgress = ((i + 1) / glyphs.length) * 100;
      
      // Update UI
      progressBar.style.width = processingProgress + '%';
      progressText.textContent = Math.round(processingProgress) + '%';
      currentGlyph.textContent = `Processing: "${glyph}" (${i + 1}/${glyphs.length})`;
      
      // Process glyph
      await processGlyph(glyph, iterations, saveImages);
      
      // Wait between glyphs
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    console.log('Batch processing complete!');
    alert(`Successfully processed ${glyphs.length} glyphs!`);
    
  } catch (error) {
    console.error('Batch processing error:', error);
    alert('Batch processing failed: ' + error.message);
  } finally {
    // Restore original settings
    parameterValues.seed.text.value = originalText;
    parameterValues.mode = originalMode;
    
    isProcessing = false;
    progressEl.style.display = 'none';
    startBtn.textContent = 'Start Processing';
    startBtn.disabled = false;
    
    hideBatchSettingsModal();
  }
}

/**
 * Process a single glyph
 */
async function processGlyph(glyph, iterations, saveImage) {
  // Set the glyph
  parameterValues.seed.text.value = glyph;
  
  // Draw initial frame
  drawFirstFrame(InitialTextureTypes.TEXT);
  
  // Wait for simulation to run
  // The main loop runs automatically, we just need to wait
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Check if renderer is available
  if (!global.renderer || !global.renderer.domElement) {
    console.error('Renderer not available for glyph:', glyph);
    return;
  }
  
  // Capture the result
  const canvas = global.renderer.domElement;
  const imageData = canvas.toDataURL('image/png');
  
  // Cache the glyph
  cacheGlyph(glyph, {
    imageData,
    parameters: {
      f: parameterValues.f,
      k: parameterValues.k,
      dA: parameterValues.dA,
      dB: parameterValues.dB
    }
  });
  
  // Save as image if requested
  if (saveImage) {
    const link = document.createElement('a');
    link.download = `glyph-${glyph.charCodeAt(0)}-${glyph}.png`;
    link.href = imageData;
    link.click();
  }
  
  console.log(`Processed glyph: "${glyph}"`);
}

/**
 * Apply current settings to all cached glyphs
 */
export async function applySettingsToAllGlyphs() {
  const cachedGlyphs = getCachedGlyphChars();
  
  if (cachedGlyphs.length === 0) {
    alert('No cached glyphs to update. Process some glyphs first.');
    return;
  }
  
  const confirmed = confirm(`Apply current settings to ${cachedGlyphs.length} cached glyph(s)?`);
  if (!confirmed) return;
  
  // Show batch modal with pre-filled glyphs
  showBatchSettingsModal();
  const input = modal.querySelector('#batch-glyphs-input');
  input.value = cachedGlyphs.join('');
}

/**
 * Show the batch settings modal
 */
export function showBatchSettingsModal() {
  if (!modal) {
    initBatchSettingsModal();
  }
  
  // Reset state
  isProcessing = false;
  modal.querySelector('#batch-progress').style.display = 'none';
  modal.querySelector('#batch-start-btn').textContent = 'Start Processing';
  modal.querySelector('#batch-start-btn').disabled = false;
  
  modal.classList.add('active');
}

/**
 * Hide the batch settings modal
 */
export function hideBatchSettingsModal() {
  if (modal && !isProcessing) {
    modal.classList.remove('active');
  }
}

/**
 * Get processing status
 */
export function isCurrentlyProcessing() {
  return isProcessing;
}

/**
 * Get processing progress
 */
export function getProcessingProgress() {
  return processingProgress;
}
