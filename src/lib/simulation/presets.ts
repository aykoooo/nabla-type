export interface SimParams {
  feed: number
  kill: number
  da: number
  db: number
  dt: number
  stepsPerFrame: number
}

export interface PresetEntry {
  id: string
  name: string
  params: SimParams
  builtIn?: boolean
}

export const DEFAULT_PRESETS: PresetEntry[] = [
  { id: 'builtin-coral',       name: 'coral',       builtIn: true, params: { feed: 0.0545, kill: 0.0620, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 } },
  { id: 'builtin-mitosis',     name: 'mitosis',     builtIn: true, params: { feed: 0.0272, kill: 0.0649, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 } },
  { id: 'builtin-fingerprint', name: 'fingerprint', builtIn: true, params: { feed: 0.0545, kill: 0.0545, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 } },
  { id: 'builtin-solitons',    name: 'solitons',    builtIn: true, params: { feed: 0.0300, kill: 0.0620, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 } },
  { id: 'builtin-worms',       name: 'worms',       builtIn: true, params: { feed: 0.0780, kill: 0.0610, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 } },
  { id: 'builtin-holes',       name: 'holes',       builtIn: true, params: { feed: 0.0390, kill: 0.0580, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 } },
  { id: 'builtin-chaos',       name: 'chaos',       builtIn: true, params: { feed: 0.0260, kill: 0.0510, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 } },
  { id: 'builtin-movingspots', name: 'movingspots', builtIn: true, params: { feed: 0.0100, kill: 0.0470, da: 1.0, db: 0.5, dt: 1.0, stepsPerFrame: 8 } },
]
