import { PRESETS, type SimParams } from '$lib/simulation/presets'

const STORAGE_KEY = 'nabla.userPresets.v1'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

function safeClone(params: SimParams): SimParams {
    return {
        feed: params.feed,
        kill: params.kill,
        da: params.da,
        db: params.db,
        dt: params.dt,
        stepsPerFrame: params.stepsPerFrame,
    }
}

export function loadUserPresets(): Record<string, SimParams> {
    if (!isClient()) return {}
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return {}
        const output: Record<string, SimParams> = {}
        for (const [k, v] of Object.entries(parsed)) {
            if (!v || typeof v !== 'object') continue
            const p = v as Partial<SimParams>
            if (
                typeof p.feed === 'number' &&
                typeof p.kill === 'number' &&
                typeof p.da === 'number' &&
                typeof p.db === 'number' &&
                typeof p.dt === 'number' &&
                typeof p.stepsPerFrame === 'number'
            ) {
                output[k] = {
                    feed: p.feed,
                    kill: p.kill,
                    da: p.da,
                    db: p.db,
                    dt: p.dt,
                    stepsPerFrame: p.stepsPerFrame,
                }
            }
        }
        return output
    } catch {
        return {}
    }
}

export function persistUserPresets(userPresets: Record<string, SimParams>): void {
    if (!isClient()) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets))
}

export function getAllPresetNames(userPresets: Record<string, SimParams>): string[] {
    return [...Object.keys(PRESETS), ...Object.keys(userPresets)]
}

export function getPresetByName(name: string, userPresets: Record<string, SimParams>): SimParams | null {
    const preset = PRESETS[name] ?? userPresets[name]
    return preset ? safeClone(preset) : null
}

export function saveUserPreset(name: string, params: SimParams, userPresets: Record<string, SimParams>): Record<string, SimParams> {
    const trimmed = name.trim()
    if (!trimmed) return userPresets
    if (PRESETS[trimmed]) {
        // Do not overwrite built-in presets
        return userPresets
    }
    const next = {
        ...userPresets,
        [trimmed]: safeClone(params),
    }
    persistUserPresets(next)
    return next
}

export function round4(v: number): number {
    return Math.round(v * 10000) / 10000
}

export function paramsEqualRounded(a: SimParams, b: SimParams): boolean {
    return (
        round4(a.feed) === round4(b.feed) &&
        round4(a.kill) === round4(b.kill) &&
        round4(a.da) === round4(b.da) &&
        round4(a.db) === round4(b.db) &&
        round4(a.dt) === round4(b.dt) &&
        Math.round(a.stepsPerFrame) === Math.round(b.stepsPerFrame)
    )
}

export function cloneParams(params: SimParams): SimParams {
    return safeClone(params)
}
