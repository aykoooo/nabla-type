import parameterMetadata from './parameterMetadata';

export default {
  presets: '',

  mode: 'preview',

  f: parameterMetadata.f.initial,
  k: parameterMetadata.k.initial,
  dA: parameterMetadata.dA.initial,
  dB: parameterMetadata.dB.initial,
  timestep: parameterMetadata.timestep.initial,

  typography: {
    ascenderRatio: 0.2,
    capHeightRatio: 0.32,
    xHeightRatio: 0.48,
    baselineRatio: 0.72,
    descenderRatio: 0.9,
    lineHeight: 1.2
  },

  seed: {
    type: 0,
    circle: {
      radius: 100
    },
    square: {
      width: 200,
      height: 200,
      rotation: 0
    },
    text: {
      value: 'Reaction diffusion',
      size: 85,
      rotation: 0
    },
    image: {
      filename: '',
      image: null,
      fit: 0,
      scale: 1.0,
      rotation: 0
    },
    font: {
      filename: '',
      fontLoaded: false,
      useCustomFont: false
    }
  },

  useSmoothing: false,

  canvas: {
    width: parameterMetadata.canvas.width.initial,
    height: parameterMetadata.canvas.height.initial,
    scale: parameterMetadata.canvas.scale.initial,
    isMaximized: false,
    resolutionPreset: 1
  },

  styleMap: {
    imageLoaded: false,
    scale: 1.0,
    rotation: 0,
    translate: {
      x: 0.0,
      y: 0.0
    },
    f: parameterMetadata.f.initial,
    k: parameterMetadata.k.initial,
    dA: parameterMetadata.dA.initial,
    dB: parameterMetadata.dB.initial,
    animation: {
      enabled: false,
      parameter: '',
      easingEquation: '',
      speed: 1.0
    }
  },

  bias: {
    x: parameterMetadata.bias.x.initial,
    y: parameterMetadata.bias.y.initial
  },

  export: {
    threshold: 128,
    resolution: 2
  }
};