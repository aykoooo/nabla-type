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
    blur: 0,           // Gaussian blur radius (0 = no blur)
    useGrayscale: false, // Use grayscale values instead of binary
    circle: {
      radius: 100
    },
    square: {
      width: 200,
      height: 200,
      rotation: 0
    },
    text: {
      value: 'R',
      size: 85,
      rotation: 0,
      boldness: 0
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

  iterations: {
    target: 0,       // 0 = unlimited, >0 = stop at this count
    autoPause: false // pause when target reached
  },

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

  rendering: {
    style: 6,  // Default: Black and white (soft)
    exportThreshold: 128,
    brightness: 1.0,
    contrast: 1.0
  },

  boundary: {
    enabled: false,
    mode: 'exact',          // 'exact', 'padded', 'eroded', 'soft', 'inverted'
    padding: 10,
    erosion: 5,
    blurRadius: 5,
    invert: false,
    showOverlay: false      // Debug visualization
  }
};