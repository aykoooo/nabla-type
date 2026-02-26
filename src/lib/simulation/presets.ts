export interface SimParams {
  feed: number
  kill: number
  da: number
  db: number
  dt: number
  stepsPerFrame: number
}

export const PRESETS: Record<string, SimParams> = {
  'coral': { feed: 0.0545, kill: 0.0620, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 },
  'mitosis': { feed: 0.0272, kill: 0.0649, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 },
  'fingerprint': { feed: 0.0545, kill: 0.0545, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 },
  'solitons': { feed: 0.0300, kill: 0.0620, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 },
  'worms': { feed: 0.0780, kill: 0.0610, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 },
  'holes': { feed: 0.0390, kill: 0.0580, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 },
  'chaos': { feed: 0.0260, kill: 0.0510, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 },
  'movingspots': { feed: 0.0100, kill: 0.0470, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 },
}

export const PRESET_NAMES = Object.keys(PRESETS)
