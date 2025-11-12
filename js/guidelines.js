import parameterValues from './parameterValues';

let overlayElement = null;
let guidelineElements = {};

const GUIDELINE_CONFIG = [
  { key: 'ascender', className: 'guideline-ascender', ratioKey: 'ascenderRatio' },
  { key: 'capHeight', className: 'guideline-cap-height', ratioKey: 'capHeightRatio' },
  { key: 'xHeight', className: 'guideline-x-height', ratioKey: 'xHeightRatio' },
  { key: 'baseline', className: 'guideline-baseline', ratioKey: 'baselineRatio' },
  { key: 'descender', className: 'guideline-descender', ratioKey: 'descenderRatio' }
];

export function initGuidelines(container) {
  if(overlayElement && overlayElement.parentNode) {
    overlayElement.parentNode.removeChild(overlayElement);
  }

  overlayElement = document.createElement('div');
  overlayElement.setAttribute('id', 'guideline-overlay');
  overlayElement.setAttribute('aria-hidden', 'true');
  container.appendChild(overlayElement);

  guidelineElements = {};
  GUIDELINE_CONFIG.forEach(({ key, className }) => {
    const line = document.createElement('div');
    line.classList.add('guideline', className);
    overlayElement.appendChild(line);
    guidelineElements[key] = line;
  });

  updateGuidelines();
}

export function getTypographyMetrics(canvasHeight) {
  const ratios = parameterValues.typography;
  return {
    ascender: canvasHeight * ratios.ascenderRatio,
    capHeight: canvasHeight * ratios.capHeightRatio,
    xHeight: canvasHeight * ratios.xHeightRatio,
    baseline: canvasHeight * ratios.baselineRatio,
    descender: canvasHeight * ratios.descenderRatio
  };
}

export function updateGuidelines() {
  if(!overlayElement || !global.canvas) {
    return;
  }

  const width = global.canvas.clientWidth;
  const height = global.canvas.clientHeight;

  overlayElement.style.width = width + 'px';
  overlayElement.style.height = height + 'px';

  const metrics = getTypographyMetrics(height);
  Object.entries(guidelineElements).forEach(([key, element]) => {
    if(element && metrics[key] !== undefined) {
      element.style.top = metrics[key] + 'px';
    }
  });
}
