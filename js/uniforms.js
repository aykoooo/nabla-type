//==============================================================
//  UNIFORMS
//  - Uniforms are custom variables that get passed to the
//    shaders. They get set on the CPU, then used on the GPU.
//  - Many of these uniforms get modified by the UI.
//  - See https://threejs.org/docs/index.html#api/en/core/Uniform
//==============================================================

import * as THREE from 'three';
import parameterValues from './parameterValues';

export let simulationUniforms = {
  previousIterationTexture: {
    type: "t",
    value: undefined
  },
  resolution: {
    type: "v2",
    value: new THREE.Vector2(parameterValues.canvas.width, parameterValues.canvas.height)
  },
  mousePosition: {
    type: "v2",
    value: new THREE.Vector2(-1,-1)
  },
  brushRadius: {
    type: "f",
    value: 10.0
  },
  styleMapTexture: {
    type: "t",
    value: undefined
  },
  styleMapResolution: {
    type: "vec2",
    value: new THREE.Vector2(-1,-1)
  },
  styleMapTransforms: {
    type: "v4",
    value: new THREE.Vector4(1.0, 0.0, 0.0, 0.0)  // {scale, rotation, xOffset, yOffset}
  },
  styleMapParameters: {
    type: "v4",
    value: new THREE.Vector4(parameterValues.f, parameterValues.k, parameterValues.dA, parameterValues.dB)
  },
  bias: {
    type: 'vec2',
    value: new THREE.Vector2(parameterValues.bias.x, parameterValues.bias.y)
  },

  // Boundary condition uniforms
  boundaryMask: {
    type: "t",
    value: null
  },
  enableBoundary: {
    type: "bool",
    value: false
  },
  boundaryFalloff: {
    type: "f",
    value: 0.0
  },

  // Reaction-diffusion equation parameters
  f: {   // feed rate
    type: "f",
    value: parameterValues.f
  },
  k: {   // kill rate
    type: "f",
    value: parameterValues.k
  },
  dA: {  // diffusion rate for chemical A
    type: "f",
    value: parameterValues.dA
  },
  dB: {  // diffusion rate for chemical B
    type: "f",
    value: parameterValues.dB
  },
  timestep: {
    type: "f",
    value: parameterValues.timestep
  }
};

export let displayUniforms = {
  textureToDisplay: {
    value: null
  },
  previousIterationTexture: {
    value: null
  },
  time: {
    type: "f",
    value: 0
  },
  renderingStyle: {
    type: "i",
    value: parameterValues.rendering.style || 6  // Default to Black and white (soft)
  },
  exportThreshold: {
    type: "f",
    value: parameterValues.rendering.exportThreshold / 255.0
  },
  brightness: {
    type: "f",
    value: parameterValues.rendering.brightness
  },
  contrast: {
    type: "f",
    value: parameterValues.rendering.contrast
  },
  // Boundary overlay uniforms
  showBoundaryOverlay: {
    type: "bool",
    value: false
  },
  boundaryMaskDisplay: {
    type: "t",
    value: null
  },
  // HSL parameters
  hslFrom: {
    type: "v2",
    value: new THREE.Vector2(0.6, 1.0)
  },
  hslTo: {
    type: "v2",
    value: new THREE.Vector2(0.0, 0.6)
  },
  hslSaturation: {
    type: "f",
    value: 0.5
  },
  hslLuminosity: {
    type: "f",
    value: 1.0
  },
  // Gradient color stops (RGBA where A is the position 0-1)
  colorStop1: {
    type: "v4",
    value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0)  // Black at 0%
  },
  colorStop2: {
    type: "v4",
    value: new THREE.Vector4(0.0, 0.0, 1.0, 0.25)  // Blue at 25%
  },
  colorStop3: {
    type: "v4",
    value: new THREE.Vector4(0.0, 1.0, 1.0, 0.5)  // Cyan at 50%
  },
  colorStop4: {
    type: "v4",
    value: new THREE.Vector4(1.0, 1.0, 0.0, 0.75)  // Yellow at 75%
  },
  colorStop5: {
    type: "v4",
    value: new THREE.Vector4(1.0, 0.0, 0.0, 1.0)  // Red at 100%
  }
};

export let passthroughUniforms = {
  textureToDisplay: {
    value: null
  }
};