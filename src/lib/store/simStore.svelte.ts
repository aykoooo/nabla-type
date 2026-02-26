import { PRESETS, type SimParams } from '$lib/simulation/presets'

// Use an object wrapper so all state is mutable from outside the module
class SimStore {
    params: SimParams = $state({ ...PRESETS['coral'] })
    activeColormapId: string = $state('blackwhite')
    resolution: { width: number; height: number } = $state({ width: 512, height: 512 })
    useParamMaps: boolean = $state(false)
    activePreset: string = $state('coral')
    isRunning: boolean = $state(true)
    seedText: string = $state('A')
    seedFontSize: number = $state(200)
    iterationCount: number = $state(0)
    fps: number = $state(0)
}

export const store = new SimStore()
