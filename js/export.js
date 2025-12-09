//==============================================================
//  EXPORT
//  - Functions to export images or other data from the
//    simulation.
//==============================================================

import { generateFilenameWithSeed } from './filenameGenerator.js';
import { InitialTextureTypes } from './firstFrame.js';
export function exportImage(seedType = InitialTextureTypes.TEXT) {
  const filename = generateFilenameWithSeed('png', seedType);

  let link = document.createElement('a');
  link.download = filename;
  link.href = renderer.domElement.toDataURL();
  link.click();
  link.remove();
}