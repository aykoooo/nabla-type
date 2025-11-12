//==================================================================
//  PARAMETERS PANE
//  - Tweakpane with core reaction-diffusion equation parameters,
//    seed patterns, rendering styles, canvas sizing, and more.
//==================================================================

import * as THREE from 'three';
import Tweakpane from 'tweakpane';

import globals from '../globals';
import parameterValues from '../parameterValues';
import parameterMetadata from '../parameterMetadata';
import parameterPresets from '../parameterPresets';

import { simulationUniforms } from '../uniforms';

import { InitialTextureTypes, drawFirstFrame } from '../firstFrame';
import { resetTextureSizes } from '../../entry';
import { setupRenderTargets } from '../renderTargets';
import { expandMap } from '../map';
import { exportImage } from '../export';
import { loadFontFromBuffer } from '../fontLoader';
import { exportBothFormats } from '../vectorExport';

let pane;
let paneContainer;
export let currentSeedType = InitialTextureTypes.CIRCLE;

let seedImageChooser;
let fontChooser;
let textSeedTextarea;
let textSeedContainer;

function clearTextSeedContainer() {
  if(textSeedContainer && textSeedContainer.parentNode) {
    textSeedContainer.parentNode.removeChild(textSeedContainer);
  }
  textSeedContainer = null;
  textSeedTextarea = null;
}

function getTextPlaceholder() {
  return parameterValues.mode === 'glyph'
    ? 'Enter glyph (single character)'
    : 'Enter sample text or alphabet';
}

export function setupRightPane() {
  if(paneContainer === undefined) {
    paneContainer = document.createElement('div');
    paneContainer.setAttribute('id', 'right-pane-container');
    document.body.appendChild(paneContainer);
  }

  pane = new Tweakpane({
    title: 'Parameters',
    container: paneContainer
  });
  textSeedTextarea = null;
  textSeedContainer = null;

  setupWorkspaceFolder();
  setupReactionDiffusionParameters();
  setupSeedFolder();
  setupRenderingFolder();
  setupCanvasSize();
  setupActions();

  if(seedImageChooser == undefined || seedImageChooser == null) {
    seedImageChooser = document.getElementById('seed-image-chooser');

    seedImageChooser.addEventListener('change', (e) => {
      if(e.target.files.length == 0) {
        return;
      }

      let reader = new FileReader();
      reader.onload = function() {
        parameterValues.seed.image.filename = e.target.files[0].name;
        parameterValues.seed.image.image = reader.result;

        // draw reader.result to the buffer canvas
        rebuildRightPane();
      };

      reader.readAsDataURL(e.target.files[0]);
    });
  }

  if(fontChooser == undefined || fontChooser == null) {
    fontChooser = document.getElementById('font-chooser');

    fontChooser.addEventListener('change', (e) => {
      if(e.target.files.length == 0) {
        return;
      }

      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = function() {
        loadFontFromBuffer(reader.result)
          .then((font) => {
            parameterValues.seed.font.filename = file.name;
            parameterValues.seed.font.fontLoaded = true;
            parameterValues.seed.font.useCustomFont = true;
            
            console.log('Font loaded:', file.name);
            rebuildRightPane();
            
            // Redraw if we're in text mode
            if(currentSeedType === InitialTextureTypes.TEXT) {
              drawFirstFrame(currentSeedType);
            }
          })
          .catch((error) => {
            alert('Error loading font: ' + error.message);
            console.error('Font loading error:', error);
          });
      };

      reader.readAsArrayBuffer(file);
    });
  }
}

  export function rebuildRightPane() {
    pane.dispose();
    setupRightPane();
  }

  export function refreshRightPane() {
    pane.refresh();
    if(textSeedTextarea) {
      textSeedTextarea.value = parameterValues.seed.text.value;
      textSeedTextarea.rows = Math.max(3, parameterValues.seed.text.value.split(/\r?\n/).length);
      textSeedTextarea.placeholder = getTextPlaceholder();
    }
  }

  export function hideRightPane() {
    pane.containerElem_.style.display = 'none';
  }

  export function showRightPane() {
    pane.containerElem_.style.display = 'block';
  }


//==============================================================
//  WORKSPACE
//==============================================================
function setupWorkspaceFolder() {
  const workspaceFolder = pane.addFolder({ title: 'Workspace' });

  workspaceFolder.addInput(parameterValues, 'mode', {
    label: 'Mode',
    options: {
      'Alphabet preview': 'preview',
      'Glyph workshop': 'glyph'
    }
  })
    .on('change', (value) => {
      parameterValues.mode = value;
      applyModeDefaults(value);
    });

  workspaceFolder.addInput(parameterValues.canvas, 'resolutionPreset', {
    label: 'Resolution',
    options: {
      'Preview (1x)': 1,
      'Detail (2x)': 2,
      'Ultra (3x)': 3,
      'Max (4x)': 4
    }
  })
    .on('change', (value) => {
      parameterValues.canvas.scale = parseFloat(value);
      resetTextureSizes();
      drawFirstFrame(currentSeedType);
    });
}

function applyModeDefaults(mode) {
  if(mode === 'preview') {
    if(parameterValues.seed.text.value.length <= 1) {
      parameterValues.seed.text.value = 'A  B  C  D  E  F\nG  H  I  J  K  L\nM  N  O  P  Q  R\nS  T  U  V  W  X\nY  Z  .  ,  -  /  (  )';
    }
  } else if(mode === 'glyph') {
    const trimmed = parameterValues.seed.text.value.trim();
    parameterValues.seed.text.value = trimmed.length > 0 ? trimmed.charAt(0) : 'A';
  }

  if(currentSeedType === InitialTextureTypes.TEXT) {
    drawFirstFrame(currentSeedType);
  }

  rebuildRightPane();
}


//==============================================================
//  REACTION-DIFFUSION PARAMETERS
//==============================================================
function setupReactionDiffusionParameters() {
  let parameterPresetsSimpleList = {};
  Object.values(parameterPresets).forEach((preset, i) => {
    parameterPresetsSimpleList[preset.name] = i
  });

  // Presets dropdown
  pane.addInput(parameterValues, 'presets', {
    label: 'Presets',
    options: parameterPresetsSimpleList
  })
    .on('change', (index) => {
      parameterValues.f = parameterPresets[index].f;
      parameterValues.k = parameterPresets[index].k;

      simulationUniforms.f.value = parameterPresets[index].f;
      simulationUniforms.k.value = parameterPresets[index].k;

      rebuildRightPane();
    });

  // f
  pane.addInput(parameterValues, 'f', {
    label: 'Feed rate',
    min: parameterMetadata.f.min,
    max: parameterMetadata.f.max,
    step: .0001
  })
    .on('change', (value) => {
      simulationUniforms.f.value = value;
    });

  // k
  pane.addInput(parameterValues, 'k', {
    label: 'Kill rate',
    min: parameterMetadata.k.min,
    max: parameterMetadata.k.max,
    step: .0001
  })
    .on('change', (value) => {
      simulationUniforms.k.value = value;
    });

  // dA
  pane.addInput(parameterValues, 'dA', {
    label: 'dA',
    min: parameterMetadata.dA.min,
    max: parameterMetadata.dA.max,
    step: .0001
  }
    ).on('change', (value) => {
      simulationUniforms.dA.value = value;
    });

  // dB
  pane.addInput(parameterValues, 'dB', {
    label: 'dB',
    min: parameterMetadata.dB.min,
    max: parameterMetadata.dB.max,
    step: .0001
  })
    .on('change', (value) => {
      simulationUniforms.dB.value = value;
    });

  // Timestep
  pane.addInput(parameterValues, 'timestep', {
    label: 'Timestep',
    min: parameterMetadata.timestep.min,
    max: parameterMetadata.timestep.max
  })
    .on('change', (value) => {
      simulationUniforms.timestep.value = value;
    });

  // Parameter map dialog launcher button
  pane.addButton({
    title: 'Pick parameter values from map'
  })
    .on('click', () => {
      expandMap();
    });
}


//==============================================================
//  SEED
//==============================================================
function setupSeedFolder() {
  const seedFolder = pane.addFolder({ title: 'Seed pattern' });

  // Seed type dropdown
  seedFolder.addInput(parameterValues.seed, 'type', {
    label: 'Type',
    options: {
      Circle: InitialTextureTypes.CIRCLE,
      Square: InitialTextureTypes.SQUARE,
      Text: InitialTextureTypes.TEXT,
      Image: InitialTextureTypes.IMAGE,
    }
  })
    .on('change', (value) => {
      currentSeedType = parseInt(value);
      rebuildRightPane();
    });

  switch(currentSeedType) {
    case 0:
      clearTextSeedContainer();
      addCircleOptions(seedFolder);
      break;

    case 1:
      clearTextSeedContainer();
      addSquareOptions(seedFolder);
      break;

    case 2:
      clearTextSeedContainer();
      addTextOptions(seedFolder);
      break;

    case 3:
      clearTextSeedContainer();
      addImageOptions(seedFolder);
      break;
  }

  // Restart button
  seedFolder.addButton({
    title: '⟳ Restart with this pattern'
  })
    .on('click', () => {
      drawFirstFrame(currentSeedType);
    });

  // Clear button
  seedFolder.addButton({
    title: '🗑️ Clear the screen'
  })
    .on('click', () => {
      drawFirstFrame(InitialTextureTypes.EMPTY);
    });
}

  function addCircleOptions(folder) {
    folder.addInput(parameterValues.seed.circle, 'radius', {
      label: 'Radius',
      min: 1,
      max: parameterValues.canvas.width > parameterValues.canvas.height ? parameterValues.canvas.height/2 : parameterValues.canvas.width/2
    });
  }

  function addSquareOptions(folder) {
    folder.addInput(parameterValues.seed.square, 'width', {
      label: 'Width',
      min: 1,
      max: parameterValues.canvas.width
    });

    folder.addInput(parameterValues.seed.square, 'height', {
      label: 'Height',
      min: 1,
      max: parameterValues.canvas.height
    });

    folder.addInput(parameterValues.seed.square, 'rotation', {
      label: 'Rotation',
      min: -180,
      max: 180
    });
  }

  function addTextOptions(folder) {
    const doc = window.document;
    const container = doc.createElement('div');
    container.classList.add('tp-textarea-block');

    const label = doc.createElement('label');
    label.textContent = 'Text';
    label.classList.add('tp-textarea-block__label');
    label.setAttribute('for', 'seed-textarea');
    container.appendChild(label);

    textSeedTextarea = doc.createElement('textarea');
    textSeedTextarea.id = 'seed-textarea';
    textSeedTextarea.classList.add('tp-textarea-block__input');
    textSeedTextarea.rows = Math.max(3, parameterValues.seed.text.value.split(/\r?\n/).length);
    textSeedTextarea.value = parameterValues.seed.text.value;
    textSeedTextarea.placeholder = getTextPlaceholder();
    textSeedTextarea.addEventListener('input', (event) => {
      parameterValues.seed.text.value = event.target.value;
    });

    container.appendChild(textSeedTextarea);

    const targetView = folder.controller && folder.controller.view ? folder.controller.view.element : null;
    if(targetView) {
      targetView.appendChild(container);
    } else {
      console.warn('Unable to locate folder view for text seed textarea');
      pane.containerElem_.appendChild(container);
    }
    textSeedContainer = container;

    folder.addSeparator();

    // Font upload controls
    folder.addMonitor(parameterValues.seed.font, 'filename', {
      label: 'Custom font'
    });

    folder.addButton({
      title: '📁 Upload font file (TTF/OTF)'
    })
      .on('click', () => {
        fontChooser.click();
      });

    folder.addInput(parameterValues.seed.font, 'useCustomFont', {
      label: 'Use custom font'
    })
      .on('change', (value) => {
        if(value && !parameterValues.seed.font.fontLoaded) {
          alert('Please upload a font file first!');
          parameterValues.seed.font.useCustomFont = false;
          rebuildRightPane();
        }
      });

    folder.addSeparator();

    folder.addInput(parameterValues.seed.text, 'size', {
      label: 'Size',
      min: 10,
      max: 200
    });

    folder.addInput(parameterValues.seed.text, 'rotation', {
      label: 'Rotation',
      min: -180,
      max: 180
    });
  }

  function addImageOptions(folder) {
    folder.addMonitor(parameterValues.seed.image, 'filename', {
      label: 'Filename'
    });

    folder.addInput(parameterValues.seed.image, 'fit', {
      label: 'Fit',
      options: {
        None: 0,
        Scale: 1,
        Stretch: 2
      }
    });

    folder.addButton({
      title: '🖼️ Upload an image'
    })
      .on('click', (e) => {
        seedImageChooser.click();
      });

    folder.addSeparator();

    folder.addInput(parameterValues.seed.image, 'scale', {
      label: 'Scale',
      min: 0.1,
      max: 5.0
    });

    folder.addInput(parameterValues.seed.image, 'rotation', {
      label: 'Rotation',
      min: -180,
      max: 180
    });
  }


//==============================================================
//  RENDERING
//==============================================================
function setupRenderingFolder() {
  const renderingFolder = pane.addFolder({ title: 'Rendering' });

  renderingFolder.addInput(parameterValues, 'useSmoothing', { label: 'Use smoothing' })
    .on('change', () => {
      setupRenderTargets();
    });
}


//==============================================================
//  CANVAS SIZE
//==============================================================
function setupCanvasSize() {
  const canvasSizeFolder = pane.addFolder({ title: 'Canvas size' });

  if(!parameterValues.canvas.isMaximized) {
    // Width range slider
    canvasSizeFolder.addInput(parameterValues.canvas, 'width', {
      label: 'Width',
      min: parameterMetadata.canvas.width.min,
      max: parameterMetadata.canvas.width.max,
      step: 1
    })
      .on('change', (value) => {
        parameterValues.canvas.width = parseInt(value);
        canvas.style.width = parameterValues.canvas.width + 'px';

        renderer.setSize(parameterValues.canvas.width, parameterValues.canvas.height, false);
        camera.aspect = parameterValues.canvas.width / parameterValues.canvas.height;
        camera.updateProjectionMatrix();
        setupRenderTargets();
        resetTextureSizes();
        drawFirstFrame(currentSeedType);
      });

    // Height range slider
    canvasSizeFolder.addInput(parameterValues.canvas, 'height', {
      label: 'Height',
      min: parameterMetadata.canvas.height.min,
      max: parameterMetadata.canvas.height.max,
      step: 1
    })
      .on('change', (value) => {
        parameterValues.canvas.height = parseInt(value);
        canvas.style.height = parameterValues.canvas.height + 'px';

        renderer.setSize(parameterValues.canvas.width, parameterValues.canvas.height, false);
        camera.aspect = parameterValues.canvas.width / parameterValues.canvas.height;
        camera.updateProjectionMatrix();
        setupRenderTargets();
        resetTextureSizes();
        drawFirstFrame(currentSeedType);
      });
  }

  // Resolution scale slider
  canvasSizeFolder.addInput(parameterValues.canvas, 'scale', {
    label: 'Resolution scale',
    min: parameterMetadata.canvas.scale.min,
    max: parameterMetadata.canvas.scale.max,
    step: .1
  })
    .on('change', (value) => {
      parameterValues.canvas.scale = value;
      setupRenderTargets();
      resetTextureSizes();
    });

  // Maximized checkbox
  canvasSizeFolder.addInput(parameterValues.canvas, 'isMaximized', { label: 'Maximize' })
    .on('change', (checked) => {
      if(checked) {
        parameterValues.canvas._lastWidth = parameterValues.canvas.width;
        parameterValues.canvas._lastHeight = parameterValues.canvas.height;  // change to this for 1D glitch parameterValues._lastHeight = parameterValues.canvas.height;

        parameterValues.canvas.width = window.innerWidth;
        parameterValues.canvas.height = window.innerHeight;
      } else {
        parameterValues.canvas.width = parameterValues.canvas._lastWidth;
        parameterValues.canvas.height = parameterValues.canvas._lastHeight;
      }

      canvas.style.width = parameterValues.canvas.width + 'px';
      canvas.style.height = parameterValues.canvas.height + 'px';

      renderer.setSize(parameterValues.canvas.width, parameterValues.canvas.height, false);
      camera.aspect = parameterValues.canvas.width / parameterValues.canvas.height;
      camera.updateProjectionMatrix();
      setupRenderTargets();
      resetTextureSizes();
      drawFirstFrame(currentSeedType);

      rebuildRightPane();
    });
}


//==============================================================
//  ACTIONS
//==============================================================
function setupActions() {
  const actionsFolder = pane.addFolder({ title: 'Actions' });

  // Pause / play button
  actionsFolder.addButton({
    title: '⏸ Pause/play'
  })
    .on('click', () => {
      globals.isPaused = !globals.isPaused;
    });

  // Save as image button
  actionsFolder.addButton({
    title: '💾 Save as image'
  })
    .on('click', () => {
      exportImage();
    });

  actionsFolder.addSeparator();

  // Vector export settings
  actionsFolder.addInput(parameterValues.export, 'threshold', {
    label: 'Export threshold',
    min: 0,
    max: 255,
    step: 1
  });

  actionsFolder.addInput(parameterValues.export, 'resolution', {
    label: 'Export resolution',
    options: {
      '1x': 1,
      '2x': 2,
      '4x': 4,
      '8x': 8
    }
  });

  // Export as SVG button
  actionsFolder.addButton({
    title: '📤 Export as SVG'
  })
    .on('click', async () => {
      try {
        const { exportAsSVG, downloadSVG } = await import('../vectorExport');
        const svg = await exportAsSVG(parameterValues.export.threshold, parameterValues.export.resolution);
        downloadSVG(svg);
        console.log('SVG exported successfully');
      } catch (error) {
        console.error('SVG export failed:', error);
        alert('SVG export failed: ' + error.message);
      }
    });

  // Export both PNG and SVG
  actionsFolder.addButton({
    title: '📦 Export PNG + SVG'
  })
    .on('click', () => {
      exportBothFormats(parameterValues.export.threshold, parameterValues.export.resolution);
    });
}