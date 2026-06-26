import { DEFAULT_PRESETS, type PresetEntry, type SimParams } from '$lib/simulation/presets'
import type { Font } from 'opentype.js'

export type AspectMode = 'free' | '1:1' | '4:3' | '16:9' | 'custom'
export type BoundaryMode = 'clamp' | 'repeat' | 'mirror'

export interface GradientStop {
    color: string
    position: number // normalized 0..1
}

/**
 * Fields that are shared between persisted app state and pause snapshots.
 * Kept as a single source of truth so the two shapes do not drift.
 */
interface SnapshotState {
    params: SimParams
    activeColormapId: string
    customColorHex: string
    customSeedSourceId: string | null
    customGradientStops: GradientStop[]
    resolution: { width: number; height: number }
    resolutionLocked: boolean
    aspectMode: AspectMode
    useParamMaps: boolean
    activePresetId: string
    seedText: string
    seedFontSize: number
    targetFps: number
    targetIteration: number
    boundaryMode: BoundaryMode
}

export interface PauseSnapshot extends SnapshotState {
    state: Float32Array
    iteration: number
    width: number
    height: number
    seedFont: Font | null
    seedFontName: string
}

interface StoredState extends SnapshotState {
    customAspectRatio: number | null
    mapOpen: boolean
    advancedOpen: boolean
    singleKeyShortcutsEnabled: boolean
}

// --- Bounded stack for pause snapshots -------------------------------------

class BoundedStack<T> {
    private items: T[] = []
    constructor(private readonly maxSize: number) {}

    push(item: T) {
        this.items.push(item)
        if (this.items.length > this.maxSize) this.items.shift()
    }

    pop(): T | null {
        return this.items.pop() ?? null
    }

    clear() {
        this.items = []
    }

    get size() {
        return this.items.length
    }

    snapshot(): T[] {
        return [...this.items]
    }
}

const pauseSnapshots = new BoundedStack<PauseSnapshot>(50)

export function pushPauseSnapshot(snap: PauseSnapshot) {
    pauseSnapshots.push(snap)
    store.hasPauseSnapshot = pauseSnapshots.size > 0
    store.pauseIterations = pauseSnapshots.snapshot().map(s => s.iteration)
}

export function popPauseSnapshot(): PauseSnapshot | null {
    const snap = pauseSnapshots.pop()
    store.hasPauseSnapshot = pauseSnapshots.size > 0
    store.pauseIterations = pauseSnapshots.snapshot().map(s => s.iteration)
    return snap
}

export function clearPauseSnapshots() {
    pauseSnapshots.clear()
    store.hasPauseSnapshot = false
    store.pauseIterations = []
}

// --- Undo/redo stack for parameter-only history ----------------------------

class UndoStack<T> {
    private past: T[] = []
    private future: T[] = []
    constructor(private readonly maxSize: number) {}

    push(item: T, clearFuture = true) {
        this.past.push(item)
        if (this.past.length > this.maxSize) this.past.shift()
        if (clearFuture) this.future = []
    }

    pop(): T | null {
        return this.past.pop() ?? null
    }

    clear() {
        this.past = []
        this.future = []
    }

    pushFuture(item: T) {
        this.future.push(item)
    }

    popFuture(): T | null {
        return this.future.pop() ?? null
    }

    clearFuture() {
        this.future = []
    }

    get canUndo() {
        return this.past.length > 0
    }

    get canRedo() {
        return this.future.length > 0
    }
}

// Lightweight param-only history (for map-driven changes, avoids GPU readback)
const paramHistory = new UndoStack<SimParams>(20)

export function pushParamHistory(params: SimParams, clearRedo = true) {
    paramHistory.push({ ...params }, clearRedo)
    store.hasParamHistory = paramHistory.canUndo
    store.hasRedoParamHistory = paramHistory.canRedo
}

export function popParamHistory(): SimParams | null {
    const p = paramHistory.pop()
    store.hasParamHistory = paramHistory.canUndo
    return p
}

export function clearParamHistory() {
    paramHistory.clear()
    store.hasParamHistory = false
    store.hasRedoParamHistory = false
}

export function pushRedoParamHistory(params: SimParams) {
    paramHistory.pushFuture({ ...params })
    store.hasRedoParamHistory = paramHistory.canRedo
}

export function popRedoParamHistory(): SimParams | null {
    const p = paramHistory.popFuture()
    store.hasRedoParamHistory = paramHistory.canRedo
    return p
}

export function clearRedoParamHistory() {
    paramHistory.clearFuture()
    store.hasRedoParamHistory = false
}

// --- LocalStorage loading --------------------------------------------------

let defaultState: StoredState | null = null
if (typeof window !== "undefined") {
    try {
        const saved = window.localStorage.getItem("nabla-type-state")
        if (saved) defaultState = JSON.parse(saved)
    } catch(e) { console.warn('Failed to load saved state from localStorage:', e) }
}

// --- Global reactive store -------------------------------------------------

// Use an object wrapper so all state is mutable from outside the module
class SimStore {
    params: SimParams = $state(defaultState?.params ?? { ...DEFAULT_PRESETS[0].params })
    baselineParams: SimParams = $state({ ...(defaultState?.params ?? DEFAULT_PRESETS[0].params) })
    activeColormapId: string = $state(defaultState?.activeColormapId ?? 'blackwhite')
    customColorHex: string = $state(defaultState?.customColorHex ?? '#000000')
    customSeedSourceId: string | null = $state(defaultState?.customSeedSourceId ?? null)
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
    seedText: string = $state(defaultState?.seedText ?? 'e')
    seedFontSize: number = $state(defaultState?.seedFontSize ?? 200)
    // Keep as plain field (non-$state) to avoid proxying third-party class instances.
    seedFont: Font | null = null
    seedFontName: string = $state('')
    iterationCount: number = $state(0)
    fps: number = $state(0)
    targetFps: number = $state(defaultState?.targetFps ?? 0)
    targetIteration: number = $state(defaultState?.targetIteration ?? 0)
    boundaryMode: BoundaryMode = $state(defaultState?.boundaryMode ?? 'repeat')
    /** Live preview resolution during canvas resize drag; null when not dragging. */
    resizingResolution: { width: number; height: number } | null = $state(null)
    hasPauseSnapshot: boolean = $state(false)
    pauseIterations: number[] = $state([])
    mapOpen: boolean = $state(defaultState?.mapOpen ?? true)
    advancedOpen: boolean = $state(defaultState?.advancedOpen ?? false)
    hasParamHistory: boolean = $state(false)
    hasRedoParamHistory: boolean = $state(false)
    singleKeyShortcutsEnabled: boolean = $state(defaultState?.singleKeyShortcutsEnabled ?? true)
    commandPaletteOpen: boolean = $state(false)
    keyboardHelpOpen: boolean = $state(false)
}

export const store = new SimStore()

// --- Persistence -----------------------------------------------------------

export function initStorePersistence() {
    if (typeof window === "undefined") return () => {};
    const cleanup = $effect.root(() => {
        $effect(() => {
            const state: StoredState = {
                params: store.params,
                activeColormapId: store.activeColormapId,
                customColorHex: store.customColorHex,
                customSeedSourceId: store.customSeedSourceId,
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
                targetIteration: store.targetIteration,
                boundaryMode: store.boundaryMode,
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
