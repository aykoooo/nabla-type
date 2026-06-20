import { DEFAULT_PRESETS, type PresetEntry, type SimParams } from '$lib/simulation/presets'
import type { Font } from 'opentype.js'

export type AspectMode = 'free' | '1:1' | '4:3' | '16:9' | 'custom'

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
    activePresetId: string
    seedText: string
    seedFontSize: number
    seedFont: Font | null
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

// Lightweight param-only history (for map-driven changes, avoids GPU readback)
let _paramHistory: SimParams[] = [];

export function pushParamHistory(params: SimParams, clearRedo = true) {
    _paramHistory.push({ ...params });
    if (_paramHistory.length > 20) {
        _paramHistory.shift();
    }
    store.hasParamHistory = _paramHistory.length > 0;
    if (clearRedo) clearRedoParamHistory();
}

export function popParamHistory(): SimParams | null {
    if (_paramHistory.length === 0) return null;
    const p = _paramHistory.pop() ?? null;
    store.hasParamHistory = _paramHistory.length > 0;
    return p;
}

export function clearParamHistory() {
    _paramHistory = [];
    store.hasParamHistory = false;
    clearRedoParamHistory();
}

// Redo buffer for parameter-only history.
let _redoParamHistory: SimParams[] = [];

export function pushRedoParamHistory(params: SimParams) {
    _redoParamHistory.push({ ...params });
    store.hasRedoParamHistory = _redoParamHistory.length > 0;
}

export function popRedoParamHistory(): SimParams | null {
    if (_redoParamHistory.length === 0) return null;
    const p = _redoParamHistory.pop() ?? null;
    store.hasRedoParamHistory = _redoParamHistory.length > 0;
    return p;
}

export function clearRedoParamHistory() {
    _redoParamHistory = [];
    store.hasRedoParamHistory = false;
}


interface StoredState {
    params: SimParams;
    activeColormapId: string;
    customColorHex: string;
    customGradientHexes: string[];
    customGradientStops: GradientStop[];
    resolution: { width: number; height: number };
    resolutionLocked: boolean;
    aspectMode: AspectMode;
    customAspectRatio: number | null;
    useParamMaps: boolean;
    activePresetId: string;
    seedText: string;
    seedFontSize: number;
    targetFps: number;
    mapOpen: boolean;
    advancedOpen: boolean;
    singleKeyShortcutsEnabled: boolean;
}

let defaultState: StoredState | null = null;
if (typeof window !== "undefined") {
    try {
        const saved = window.localStorage.getItem("nabla-type-state");
        if (saved) defaultState = JSON.parse(saved);
    } catch(e) { console.warn('Failed to load saved state from localStorage:', e) }
}

// Use an object wrapper so all state is mutable from outside the module
class SimStore {
    params: SimParams = $state(defaultState?.params ?? { ...DEFAULT_PRESETS[0].params })
    baselineParams: SimParams = $state({ ...(defaultState?.params ?? DEFAULT_PRESETS[0].params) })
    activeColormapId: string = $state(defaultState?.activeColormapId ?? 'blackwhite')
    customColorHex: string = $state(defaultState?.customColorHex ?? '#000000')
    customGradientHexes: string[] = $state(defaultState?.customGradientHexes ?? ['#000000', '#ff4d00', '#ffd400', '#ffffff'])
    customGradientStops: GradientStop[] = $state(defaultState?.customGradientStops ?? [
        { color: '#000000', position: 0.0 },
        { color: '#ff4d00', position: 0.35 },
        { color: '#ffd400', position: 0.7 },
        { color: '#ffffff', position: 1.0 },
    ])
    resolution: { width: number; height: number } = $state(defaultState?.resolution ?? { width: 512, height: 512 })
    resolutionLocked: boolean = $state(defaultState?.resolutionLocked ?? false)
    aspectMode: AspectMode = $state(defaultState?.aspectMode ?? 'free')
    customAspectRatio: number | null = $state(defaultState?.customAspectRatio ?? null)
    useParamMaps: boolean = $state(defaultState?.useParamMaps ?? false)
    activePresetId: string = $state(defaultState?.activePresetId ?? DEFAULT_PRESETS[0].id)
    presets: PresetEntry[] = $state([])
    isRunning: boolean = $state(true)
    seedText: string = $state(defaultState?.seedText ?? 'A')
    seedFontSize: number = $state(defaultState?.seedFontSize ?? 200)
    // Keep as plain field (non-$state) to avoid proxying third-party class instances.
    seedFont: Font | null = null
    seedFontName: string = $state('')
    iterationCount: number = $state(0)
    fps: number = $state(0)
    targetFps: number = $state(defaultState?.targetFps ?? 0)
    hasPauseSnapshot: boolean = $state(false)
    pauseIterations: number[] = $state([])
    mapOpen: boolean = $state(defaultState?.mapOpen ?? true)
    advancedOpen: boolean = $state(defaultState?.advancedOpen ?? false)
    colorFocused: boolean = $state(false)
    hasParamHistory: boolean = $state(false)
    hasRedoParamHistory: boolean = $state(false)
    singleKeyShortcutsEnabled: boolean = $state(defaultState?.singleKeyShortcutsEnabled ?? true)
    commandPaletteOpen: boolean = $state(false)
    keyboardHelpOpen: boolean = $state(false)
}

export const store = new SimStore()

export function initStorePersistence() {
    if (typeof window === "undefined") return () => {};
    const cleanup = $effect.root(() => {
        $effect(() => {
            const state = {
                params: store.params,
                activeColormapId: store.activeColormapId,
                customColorHex: store.customColorHex,
                customGradientHexes: store.customGradientHexes,
                customGradientStops: store.customGradientStops,
                resolution: store.resolution,
                resolutionLocked: store.resolutionLocked,
                aspectMode: store.aspectMode,
                customAspectRatio: store.customAspectRatio,
                activePresetId: store.activePresetId,
                seedText: store.seedText,
                seedFontSize: store.seedFontSize,
                useParamMaps: store.useParamMaps,
                targetFps: store.targetFps,
                mapOpen: store.mapOpen,
                advancedOpen: store.advancedOpen,
                singleKeyShortcutsEnabled: store.singleKeyShortcutsEnabled,
            };
            try {
                window.localStorage.setItem("nabla-type-state", JSON.stringify(state));
            } catch(e) { console.warn('Failed to persist state to localStorage:', e) }
        });
    });
    return cleanup;
}
