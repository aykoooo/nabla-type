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
  }
};

export let passthroughUniforms = {
  textureToDisplay: {
    value: null
  }
};