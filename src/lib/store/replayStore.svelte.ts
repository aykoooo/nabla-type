import type { SimParams } from '$lib/simulation/presets'

export interface ReplayFrame {
    id: number
    tMs: number
    iteration: number
    width: number
    height: number
    params: SimParams
    state: Float32Array
}

class ReplayStore {
    // --- public state (same API as before) ---
    frames: readonly ReplayFrame[] = $state([])
    cursor: number = $state(-1)
    captureFps: number = $state(15)
    maxFramesBack: number = $state(180)

    // --- internal ring buffer ---
    private _ring: ReplayFrame[] = []
    private _head = 0       // index of oldest frame in _ring
    private _count = 0      // number of active frames
    private _nextId = 1

    private _ordered(): ReplayFrame[] {
        const out: ReplayFrame[] = new Array(this._count)
        const cap = this._ring.length
        for (let i = 0; i < this._count; i++) {
            out[i] = this._ring[(this._head + i) % cap]
        }
        return out
    }

    private _setOrdered(ordered: ReplayFrame[]) {
        this.frames = ordered
    }

    clear(): void {
        this._ring = []
        this._head = 0
        this._count = 0
        this._nextId = 1
        this.frames = []
        this.cursor = -1
    }

    truncate(index: number): void {
        if (index < 0 || index >= this._count) return
        const keep = index + 1
        const cap = this._ring.length
        const newRing: ReplayFrame[] = new Array(cap)
        for (let i = 0; i < keep; i++) {
            newRing[i] = this._ring[(this._head + i) % cap]
        }
        this._ring = newRing
        this._head = 0
        this._count = keep
        this._setOrdered(this._ordered())
        this.cursor = this._count - 1
    }

    addFrame(payload: Omit<ReplayFrame, 'id'>): void {
        const cap = this._ring.length
        const max = Math.max(2, Math.round(this.maxFramesBack))

        if (cap !== max) {
            // Resize ring buffer lazily
            const newRing: ReplayFrame[] = new Array(max)
            for (let i = 0; i < this._count; i++) {
                newRing[i] = this._ring[(this._head + i) % Math.max(cap, 1)]
            }
            this._ring = newRing
            this._head = 0
        }

        const wasAtTail = this.isAtLatest()
        const frame: ReplayFrame = { ...payload, id: this._nextId++ }

        if (this._count < this._ring.length) {
            // Append without eviction
            this._ring[(this._head + this._count) % this._ring.length] = frame
            this._count++
        } else {
            // Overwrite oldest
            this._ring[this._head] = frame
            this._head = (this._head + 1) % this._ring.length
        }

        this._setOrdered(this._ordered())

        if (wasAtTail || this.cursor < 0) {
            this.cursor = this._count - 1
        }
    }

    setMaxFramesBack(value: number): void {
        const oldOrdered = this._ordered()
        const max = Math.max(2, Math.round(value))
        this.maxFramesBack = max

        const newRing: ReplayFrame[] = new Array(max)
        const keep = Math.min(oldOrdered.length, max)
        for (let i = 0; i < keep; i++) {
            newRing[i] = oldOrdered[oldOrdered.length - keep + i]
        }

        this._ring = newRing
        this._head = 0
        this._count = keep
        this._setOrdered(this._ordered())

        if (this._count === 0) {
            this.cursor = -1
            return
        }
        this.cursor = Math.max(0, Math.min(this._count - 1, this.cursor))
    }

    setCursor(index: number): void {
        if (this._count === 0) {
            this.cursor = -1
            return
        }
        this.cursor = Math.max(0, Math.min(this._count - 1, Math.round(index)))
    }

    step(delta: number): void {
        this.setCursor(this.cursor + delta)
    }

    isAtLatest(): boolean {
        return this._count > 0 && this.cursor === this._count - 1
    }

    getCurrentFrame(): ReplayFrame | null {
        if (this.cursor < 0 || this.cursor >= this._count) return null
        const cap = this._ring.length
        return this._ring[(this._head + this.cursor) % cap]
    }
}

export const replay = new ReplayStore()
