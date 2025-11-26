//==============================================================
//  FONT SOURCE MODAL
//  - Modal for selecting font source: Default, Upload, or Drawing
//  - Includes guidelines toggle and lock/unlock functionality
//  - Handles confirmation when changing base font
//==============================================================

import parameterValues from './parameterValues';
import { drawFirstFrame, InitialTextureTypes } from './firstFrame';
import { loadFontFromBuffer, clearFont, hasFontLoaded } from './fontLoader';

// Font source types
export const FontSourceTypes = {
  DEFAULT: 'default',
  CUSTOM: 'custom',
  DRAWING: 'drawing'
};

// Module state
let modal = null;
let confirmationModal = null;
let selectedSource = FontSourceTypes.DEFAULT;
let isLocked = true; // Lock is on by default
let guidelinesVisible = true;
let cachedGlyphs = {}; // Cache for processed glyphs
let pendingFontChange = null;

/**
 * Get the default browser font name
 * @returns {string} Default font name
 */
export function getDefaultBrowserFont() {
  // Create a temporary element to detect the default font
  const testEl = document.createElement('span');
  testEl.style.fontFamily = 'serif';
  testEl.textContent = 'Test';
  document.body.appendChild(testEl);
  
  // Get computed style
  const computedFont = window.getComputedStyle(testEl).fontFamily;
  document.body.removeChild(testEl);
  
  // Common default fonts by browser/OS
  // Most browsers default to Times New Roman or similar serif font
  // But if system font stack is used, it may vary
  const defaultFonts = {
    'Windows': 'Times New Roman',
    'Mac': 'Times',
    'Linux': 'DejaVu Serif',
    'iOS': 'Times New Roman',
    'Android': 'Droid Serif'
  };
  
  // Detect OS for better font name
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Times New Roman';
  if (userAgent.includes('Mac')) return 'Times';
  if (userAgent.includes('Linux')) return 'DejaVu Serif';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'Times New Roman';
  if (userAgent.includes('Android')) return 'Roboto';
  
  // Fallback to detected or Arial
  return computedFont.replace(/['"]/g, '') || 'Arial';
}

/**
 * Initialize the font source modal
 */
export function initFontSourceModal() {
  if (modal) return;
  
  // Load saved preferences
  loadPreferences();
  
  createModal();
  createConfirmationModal();
  
  // Apply initial lock state
  if (isLocked) {
    applyLockState();
  }
  
  // Apply initial guidelines state
  updateGuidelinesVisibility();
}

/**
 * Create the main font source modal
 */
function createModal() {
  modal = document.createElement('div');
  modal.className = 'font-source-modal';
  modal.id = 'font-source-modal';
  
  const defaultFont = getDefaultBrowserFont();
  
  modal.innerHTML = `
    <div class="font-source-container">
      <div class="font-source-header">
        <h2>Font Source</h2>
        <button class="font-source-close" title="Close">✕</button>
      </div>
      
      <div class="font-source-options">
        <div class="font-source-option ${selectedSource === FontSourceTypes.DEFAULT ? 'selected' : ''}" data-source="${FontSourceTypes.DEFAULT}">
          <div class="font-source-option-radio"></div>
          <div class="font-source-option-icon">🔤</div>
          <div class="font-source-option-content">
            <div class="font-source-option-title">
              Default Browser Font
              <span class="font-source-option-badge">${defaultFont}</span>
            </div>
            <div class="font-source-option-description">Use the system's default font for text rendering</div>
          </div>
          ${isLocked ? '<span class="font-source-option-lock">🔒</span>' : ''}
        </div>
        
        <div class="font-source-option ${selectedSource === FontSourceTypes.CUSTOM ? 'selected' : ''}" data-source="${FontSourceTypes.CUSTOM}">
          <div class="font-source-option-radio"></div>
          <div class="font-source-option-icon">📁</div>
          <div class="font-source-option-content">
            <div class="font-source-option-title">Upload TTF/OTF</div>
            <div class="font-source-option-description">Load a custom font file from your computer</div>
          </div>
        </div>
        
        <div class="font-source-option ${selectedSource === FontSourceTypes.DRAWING ? 'selected' : ''}" data-source="${FontSourceTypes.DRAWING}">
          <div class="font-source-option-radio"></div>
          <div class="font-source-option-icon">🎨</div>
          <div class="font-source-option-content">
            <div class="font-source-option-title">Drawing Editor</div>
            <div class="font-source-option-description">Create custom glyphs by hand-drawing</div>
          </div>
        </div>
      </div>
      
      <div class="font-source-settings">
        <h3>Display Settings</h3>
        <div class="font-source-toggle">
          <label>Show Typography Guidelines</label>
          <div class="toggle-switch ${guidelinesVisible ? 'active' : ''}" id="guidelines-toggle"></div>
        </div>
        <div class="font-source-toggle">
          <label>Lock Settings (Prevent Accidental Changes)</label>
          <div class="toggle-switch ${isLocked ? 'active' : ''}" id="lock-toggle"></div>
        </div>
      </div>
      
      <div class="font-source-actions">
        <button class="font-source-cancel">Cancel</button>
        <button class="font-source-apply">Apply</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setupModalEventListeners();
}

/**
 * Create the confirmation modal for font changes
 */
function createConfirmationModal() {
  confirmationModal = document.createElement('div');
  confirmationModal.className = 'confirmation-modal';
  confirmationModal.id = 'font-change-confirmation';
  
  confirmationModal.innerHTML = `
    <div class="confirmation-container">
      <div class="confirmation-icon">⚠️</div>
      <div class="confirmation-title">Reset Cached Glyphs?</div>
      <div class="confirmation-message">
        You're changing the base font. Would you like to reset all cached glyphs?
        This will clear any processed glyph data and start fresh with the new font.
      </div>
      <div class="confirmation-actions">
        <button class="confirmation-no confirmation-keep">Keep Glyphs</button>
        <button class="confirmation-yes">Reset Glyphs</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(confirmationModal);
  
  // Event listeners for confirmation modal
  confirmationModal.querySelector('.confirmation-yes').addEventListener('click', () => {
    resetCachedGlyphs();
    applyFontChange();
    hideConfirmationModal();
  });
  
  confirmationModal.querySelector('.confirmation-keep').addEventListener('click', () => {
    applyFontChange();
    hideConfirmationModal();
  });
}

/**
 * Setup event listeners for the modal
 */
function setupModalEventListeners() {
  // Close button
  modal.querySelector('.font-source-close').addEventListener('click', hideFontSourceModal);
  modal.querySelector('.font-source-cancel').addEventListener('click', hideFontSourceModal);
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideFontSourceModal();
    }
  });
  
  // Font source options
  modal.querySelectorAll('.font-source-option').forEach(option => {
    option.addEventListener('click', () => {
      if (option.classList.contains('locked')) return;
      
      const source = option.dataset.source;
      selectFontSource(source);
    });
  });
  
  // Guidelines toggle
  const guidelinesToggle = modal.querySelector('#guidelines-toggle');
  guidelinesToggle.addEventListener('click', () => {
    guidelinesVisible = !guidelinesVisible;
    guidelinesToggle.classList.toggle('active', guidelinesVisible);
    updateGuidelinesVisibility();
    savePreferences();
  });
  
  // Lock toggle
  const lockToggle = modal.querySelector('#lock-toggle');
  lockToggle.addEventListener('click', () => {
    isLocked = !isLocked;
    lockToggle.classList.toggle('active', isLocked);
    applyLockState();
    savePreferences();
    updateLockIcon();
  });
  
  // Apply button
  modal.querySelector('.font-source-apply').addEventListener('click', () => {
    handleApply();
  });
}

/**
 * Select a font source option
 */
function selectFontSource(source) {
  // Remove selected class from all options
  modal.querySelectorAll('.font-source-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  
  // Add selected class to chosen option
  const selectedOption = modal.querySelector(`[data-source="${source}"]`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
  }
  
  selectedSource = source;
}

/**
 * Handle apply button click
 */
function handleApply() {
  // Check if font source is changing
  const currentSource = getCurrentFontSource();
  
  if (currentSource !== selectedSource && hasCachedGlyphs()) {
    // Font is changing and we have cached glyphs - ask for confirmation
    pendingFontChange = selectedSource;
    showConfirmationModal();
  } else {
    applyFontChange();
    hideFontSourceModal();
  }
}

/**
 * Apply the font change
 */
function applyFontChange() {
  const source = pendingFontChange || selectedSource;
  pendingFontChange = null;
  
  switch (source) {
    case FontSourceTypes.DEFAULT:
      // Use default browser font
      parameterValues.seed.font.useCustomFont = false;
      clearFont();
      parameterValues.fontSource = FontSourceTypes.DEFAULT;
      break;
      
    case FontSourceTypes.CUSTOM:
      // Trigger font file upload
      const fontChooser = document.getElementById('font-chooser');
      if (fontChooser) {
        fontChooser.click();
      }
      parameterValues.fontSource = FontSourceTypes.CUSTOM;
      break;
      
    case FontSourceTypes.DRAWING:
      // Open drawing editor
      import('./drawingEditor.js').then(module => {
        module.openDrawingEditor();
      });
      parameterValues.fontSource = FontSourceTypes.DRAWING;
      break;
  }
  
  savePreferences();
  
  // Dynamically import and rebuild right pane to avoid circular dependencies
  import('./ui/right-pane.js').then(module => {
    module.rebuildRightPane();
  });
  
  // Redraw if we're in text mode
  if (parameterValues.seed.type === InitialTextureTypes.TEXT) {
    drawFirstFrame(InitialTextureTypes.TEXT);
  }
  
  hideFontSourceModal();
}

/**
 * Get the current font source
 */
function getCurrentFontSource() {
  if (parameterValues.seed.font.useCustomFont && hasFontLoaded()) {
    return FontSourceTypes.CUSTOM;
  }
  return parameterValues.fontSource || FontSourceTypes.DEFAULT;
}

/**
 * Check if there are cached glyphs
 */
function hasCachedGlyphs() {
  return Object.keys(cachedGlyphs).length > 0;
}

/**
 * Reset all cached glyphs
 */
export function resetCachedGlyphs() {
  cachedGlyphs = {};
  console.log('All cached glyphs have been reset');
}

/**
 * Cache a processed glyph
 */
export function cacheGlyph(char, data) {
  cachedGlyphs[char] = {
    data: data,
    timestamp: Date.now()
  };
}

/**
 * Get a cached glyph
 */
export function getCachedGlyph(char) {
  return cachedGlyphs[char] || null;
}

/**
 * Get all cached glyph characters
 */
export function getCachedGlyphChars() {
  return Object.keys(cachedGlyphs);
}

/**
 * Update lock icon in modal
 */
function updateLockIcon() {
  const defaultOption = modal.querySelector(`[data-source="${FontSourceTypes.DEFAULT}"]`);
  if (defaultOption) {
    const lockIcon = defaultOption.querySelector('.font-source-option-lock');
    if (isLocked && !lockIcon) {
      const icon = document.createElement('span');
      icon.className = 'font-source-option-lock';
      icon.textContent = '🔒';
      defaultOption.appendChild(icon);
    } else if (!isLocked && lockIcon) {
      lockIcon.remove();
    }
  }
}

/**
 * Apply lock state to UI elements
 */
function applyLockState() {
  // Lock prevents accidental changes to critical parameters
  // This is stored in parameterValues for other components to check
  parameterValues.isLocked = isLocked;
}

/**
 * Update guidelines visibility
 */
function updateGuidelinesVisibility() {
  const overlay = document.getElementById('guideline-overlay');
  if (overlay) {
    overlay.style.display = guidelinesVisible ? 'block' : 'none';
  }
  parameterValues.guidelinesVisible = guidelinesVisible;
}

/**
 * Show the font source modal
 */
export function showFontSourceModal() {
  if (!modal) {
    initFontSourceModal();
  }
  
  // Update selected state based on current source
  const currentSource = getCurrentFontSource();
  selectFontSource(currentSource);
  
  // Update toggles
  const guidelinesToggle = modal.querySelector('#guidelines-toggle');
  const lockToggle = modal.querySelector('#lock-toggle');
  if (guidelinesToggle) {
    guidelinesToggle.classList.toggle('active', guidelinesVisible);
  }
  if (lockToggle) {
    lockToggle.classList.toggle('active', isLocked);
  }
  
  modal.classList.add('active');
}

/**
 * Hide the font source modal
 */
export function hideFontSourceModal() {
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Show confirmation modal
 */
function showConfirmationModal() {
  if (confirmationModal) {
    confirmationModal.classList.add('active');
  }
}

/**
 * Hide confirmation modal
 */
function hideConfirmationModal() {
  if (confirmationModal) {
    confirmationModal.classList.remove('active');
  }
}

/**
 * Toggle guidelines visibility
 */
export function toggleGuidelines() {
  guidelinesVisible = !guidelinesVisible;
  updateGuidelinesVisibility();
  savePreferences();
  return guidelinesVisible;
}

/**
 * Get guidelines visibility state
 */
export function areGuidelinesVisible() {
  return guidelinesVisible;
}

/**
 * Get lock state
 */
export function isSettingsLocked() {
  return isLocked;
}

/**
 * Set lock state
 */
export function setSettingsLocked(locked) {
  isLocked = locked;
  applyLockState();
  savePreferences();
}

/**
 * Save preferences to localStorage
 */
function savePreferences() {
  try {
    localStorage.setItem('fontSourcePrefs', JSON.stringify({
      selectedSource,
      isLocked,
      guidelinesVisible
    }));
  } catch (e) {
    console.warn('Could not save preferences:', e);
  }
}

/**
 * Load preferences from localStorage
 */
function loadPreferences() {
  try {
    const saved = localStorage.getItem('fontSourcePrefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      selectedSource = prefs.selectedSource || FontSourceTypes.DEFAULT;
      isLocked = prefs.isLocked !== undefined ? prefs.isLocked : true; // Default to locked
      guidelinesVisible = prefs.guidelinesVisible !== undefined ? prefs.guidelinesVisible : true;
    }
  } catch (e) {
    console.warn('Could not load preferences:', e);
  }
}
