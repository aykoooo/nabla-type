import parameterValues from './parameterValues.js';
import parameterPresets from './parameterPresets.js';
import { InitialTextureTypes } from './firstFrame.js';

/**
 * Generate a descriptive filename based on current simulation state
 * @param {string} extension - File extension (e.g., 'png', 'svg')
 * @returns {string} - Generated filename
 */
export function generateFilename(extension) {
  const timestamp = getTimestamp();
  const presetName = getPresetName();
  const seedInfo = getSeedInfo();

  // Construct filename parts
  const parts = [
    seedInfo,
    presetName,
    timestamp
  ];

  // Filter out empty parts and join with underscores
  const filename = parts.filter(p => p).join('_');

  return `${filename}.${extension}`;
}

/**
 * Get current timestamp in compact format: YYYYMMDD-HHmmss
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hour}${minute}${second}`;
}

/**
 * Get name of current preset or custom values
 */
function getPresetName() {
  const currentF = parameterValues.f;
  const currentK = parameterValues.k;

  for (const [key, preset] of Object.entries(parameterPresets)) {
    if (Math.abs(preset.f - currentF) < 0.0001 && Math.abs(preset.k - currentK) < 0.0001) {
      return preset.name.toLowerCase().replace(/\s+/g, '-');
    }
  }

  // If no exact match, return compact custom values
  return `custom-f${currentF.toFixed(4)}-k${currentK.toFixed(4)}`;
}

/**
 * Get descriptive string for current seed
 */
function getSeedInfo() {
  return 'seed';
}

/**
 * Generate filename with explicit seed type
 * @param {string} extension
 * @param {number} seedType - From InitialTextureTypes
 */
export function generateFilenameWithSeed(extension, seedType) {
  const timestamp = getTimestamp();
  const presetName = getPresetName();

  let seedInfo = 'unknown';

  switch (seedType) {
    case InitialTextureTypes.CIRCLE:
      seedInfo = 'Circle';
      break;

    case InitialTextureTypes.SQUARE:
      seedInfo = 'Square';
      break;

    case InitialTextureTypes.TEXT:
      const text = sanitizeString(parameterValues.seed.text.value || 'empty');
      const font = parameterValues.seed.font.useCustomFont ? 'CustomFont' : 'Arial';
      const boldness = parameterValues.seed.text.boldness > 0 ? `-b${parameterValues.seed.text.boldness.toFixed(1)}` : '';
      seedInfo = `Text_${text}_${font}${boldness}`;
      break;

    case InitialTextureTypes.IMAGE:
      const filename = parameterValues.seed.image.filename || 'image';
      const nameWithoutExt = filename.split('.').slice(0, -1).join('.') || filename;
      seedInfo = `Img_${sanitizeString(nameWithoutExt)}`;
      break;

    case InitialTextureTypes.DRAWING:
      seedInfo = 'Drawing';
      break;

    default:
      seedInfo = 'RD';
  }

  // Format: RD_[Seed]_[Preset]_[Timestamp]
  const parts = [
    'RD',
    seedInfo,
    presetName,
    timestamp
  ];

  return `${parts.join('_')}.${extension}`;
}

function sanitizeString(str) {
  return str
    .replace(/[^a-z0-9]/gi, '-') // Replace non-alphanumeric with dash
    .replace(/-+/g, '-')         // Collapse multiple dashes
    .replace(/^-|-$/g, '')       // Trim dashes
    .toLowerCase()
    .substring(0, 20);           // Limit length
}
