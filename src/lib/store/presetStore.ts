import { DEFAULT_PRESETS, type PresetEntry, type SimParams } from '$lib/simulation/presets'

const STORAGE_KEY = 'nabla.presets.v2'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

function cloneSimParams(p: SimParams): SimParams {
    return { feed: p.feed, kill: p.kill, da: p.da, db: p.db, dt: p.dt, stepsPerFrame: p.stepsPerFrame }
}

function cloneEntry(e: PresetEntry): PresetEntry {
    return { id: e.id, name: e.name, params: cloneSimParams(e.params), ...(e.builtIn ? { builtIn: true } : {}) }
}

function genId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function validateEntry(v: unknown): PresetEntry | null {
    if (!v || typeof v !== 'object') return null
    const e = v as Record<string, unknown>
    if (typeof e.id !== 'string' || typeof e.name !== 'string') return null
    const p = e.params as Record<string, unknown> | undefined
    if (!p || typeof p !== 'object') return null
    if (
        typeof p.feed !== 'number' ||
        typeof p.kill !== 'number' ||
        typeof p.da !== 'number' ||
        typeof p.db !== 'number' ||
        typeof p.dt !== 'number' ||
        typeof p.stepsPerFrame !== 'number'
    ) return null
    return {
        id: e.id as string,
        name: e.name as string,
        params: cloneSimParams(p as unknown as SimParams),
        ...(e.builtIn ? { builtIn: true } : {}),
    }
}

// ── Load / Persist ──────────────────────────────────────────

export function loadPresets(): PresetEntry[] {
    if (!isClient()) return DEFAULT_PRESETS.map(cloneEntry)
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULT_PRESETS.map(cloneEntry)
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PRESETS.map(cloneEntry)
        const entries: PresetEntry[] = []
        for (const item of parsed) {
            const entry = validateEntry(item)
            if (entry) entries.push(entry)
        }
        return entries.length > 0 ? entries : DEFAULT_PRESETS.map(cloneEntry)
    } catch {
        return DEFAULT_PRESETS.map(cloneEntry)
    }
}

export function persistPresets(list: PresetEntry[]): void {
    if (!isClient()) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

// ── CRUD ────────────────────────────────────────────────────

export function addPreset(list: PresetEntry[], name: string, params: SimParams): PresetEntry[] {
    const trimmed = name.trim()
    if (!trimmed) return list
    const entry: PresetEntry = { id: genId(), name: trimmed, params: cloneSimParams(params) }
    const next = [...list, entry]
    persistPresets(next)
    return next
}

export function deletePreset(list: PresetEntry[], id: string): PresetEntry[] {
    const next = list.filter(e => e.id !== id)
    if (next.length === 0) return list // prevent empty list
    persistPresets(next)
    return next
}

export function renamePreset(list: PresetEntry[], id: string, newName: string): PresetEntry[] {
    const trimmed = newName.trim()
    if (!trimmed) return list
    const next = list.map(e => e.id === id ? { ...e, name: trimmed } : e)
    persistPresets(next)
    return next
}

export function reorderPresets(list: PresetEntry[], fromIdx: number, toIdx: number): PresetEntry[] {
    if (fromIdx === toIdx) return list
    if (fromIdx < 0 || fromIdx >= list.length || toIdx < 0 || toIdx >= list.length) return list
    const next = [...list]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    persistPresets(next)
    return next
}

export function updatePresetParams(list: PresetEntry[], id: string, params: SimParams): PresetEntry[] {
    const next = list.map(e => e.id === id ? { ...e, params: cloneSimParams(params) } : e)
    persistPresets(next)
    return next
}

export function duplicatePreset(list: PresetEntry[], id: string): PresetEntry[] {
    const source = list.find(e => e.id === id)
    if (!source) return list
    const entry: PresetEntry = { id: genId(), name: `${source.name} (copy)`, params: cloneSimParams(source.params) }
    const idx = list.indexOf(source)
    const next = [...list]
    next.splice(idx + 1, 0, entry)
    persistPresets(next)
    return next
}

export function resetToDefaults(): PresetEntry[] {
    const list = DEFAULT_PRESETS.map(cloneEntry)
    persistPresets(list)
    return list
}

// ── Import / Export ─────────────────────────────────────────

export function exportPresets(list: PresetEntry[]): string {
    // Strip builtIn flag for portability
    const exportable = list.map(e => ({ id: e.id, name: e.name, params: cloneSimParams(e.params) }))
    return JSON.stringify(exportable, null, 2)
}

export function importPresets(json: string): PresetEntry[] | null {
    try {
        const parsed = JSON.parse(json)
        if (!Array.isArray(parsed)) return null
        const entries: PresetEntry[] = []
        for (const item of parsed) {
            const entry = validateEntry(item)
            if (entry) {
                // Assign fresh ids to avoid collisions
                entry.id = genId()
                entries.push(entry)
            }
        }
        if (entries.length === 0) return null
        persistPresets(entries)
        return entries
    } catch {
        return null
    }
}

// ── Lookup helpers ──────────────────────────────────────────

export function getPresetById(list: PresetEntry[], id: string): PresetEntry | null {
    return list.find(e => e.id === id) ?? null
}

export function findActiveIndex(list: PresetEntry[], id: string): number {
    return list.findIndex(e => e.id === id)
}

// ── Param comparison helpers (unchanged) ────────────────────

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
    return cloneSimParams(params)
}
