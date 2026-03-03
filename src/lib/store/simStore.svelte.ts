import { PRESETS, type SimParams } from '$lib/simulation/presets'

export type AspectMode = 'free' | '1:1' | '4:3' | '16:9'

export interface GradientStop {
    color: string
    position: number // normalized 0..1
}

export interface PauseSnapshot {
    state: Float32Array
    iteration: number
    params: SimParams
    width: number
    height: number
    activeColormapId: string
    customColorHex: string
    customGradientHexes: string[]
    customGradientStops: GradientStop[]
    resolution: { width: number; height: number }
    resolutionLocked: boolean
    aspectMode: AspectMode
    useParamMaps: boolean
    activePreset: string
    seedText: string
    seedFontSize: number
    seedFont: any | null
    seedFontName: string
    targetFps: number
}

let _pauseSnapshots: PauseSnapshot[] = [];

export function pushPauseSnapshot(snap: PauseSnapshot) {
    _pauseSnapshots.push(snap);
    if (_pauseSnapshots.length > 50) {
        _pauseSnapshots.shift();
    }
    store.hasPauseSnapshot = _pauseSnapshots.length > 0;
    store.pauseIterations = _pauseSnapshots.map(s => s.iteration);
}

export function popPauseSnapshot(): PauseSnapshot | null {
    if (_pauseSnapshots.length === 0) return null;
    const snap = _pauseSnapshots.pop() ?? null;
    store.hasPauseSnapshot = _pauseSnapshots.length > 0;
    store.pauseIterations = _pauseSnapshots.map(s => s.iteration);
    return snap;
}

export function clearPauseSnapshots() {
    _pauseSnapshots = [];
    store.hasPauseSnapshot = false;
    store.pauseIterations = [];
}


// Use an object wrapper so all state is mutable from outside the module
class SimStore {
    params: SimParams = $state({ ...PRESETS['coral'] })
    baselineParams: SimParams = $state({ ...PRESETS['coral'] })
    activeColormapId: string = $state('blackwhite')
    customColorHex: string = $state('#000000')
    customGradientHexes: string[] = $state(['#000000', '#ff4d00', '#ffd400', '#ffffff'])
    customGradientStops: GradientStop[] = $state([
        { color: '#000000', position: 0.0 },
        { color: '#ff4d00', position: 0.35 },
        { color: '#ffd400', position: 0.7 },
        { color: '#ffffff', position: 1.0 },
    ])
    resolution: { width: number; height: number } = $state({ width: 512, height: 512 })
    resolutionLocked: boolean = $state(false)
    aspectMode: AspectMode = $state('free')
    useParamMaps: boolean = $state(false)
    activePreset: string = $state('coral')
    userPresets: Record<string, SimParams> = $state({})
    isRunning: boolean = $state(true)
    seedText: string = $state('A')
    seedFontSize: number = $state(200)
    // Keep as plain field (non-$state) to avoid proxying third-party class instances.
    seedFont: any | null = null
    seedFontName: string = $state('')
    iterationCount: number = $state(0)
    fps: number = $state(0)
    targetFps: number = $state(0)
    hasPauseSnapshot: boolean = $state(false)
    pauseIterations: number[] = $state([])
}

export const store = new SimStore()
