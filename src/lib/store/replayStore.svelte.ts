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
    frames: ReplayFrame[] = $state([])
    cursor: number = $state(-1)
    captureFps: number = $state(15)
    maxFramesBack: number = $state(180)
    private nextId = 1

    private trimToWindow(nextFrames: ReplayFrame[]): ReplayFrame[] {
        const next = [...nextFrames]
        const maxFrames = Math.max(2, Math.round(this.maxFramesBack))
        while (next.length > maxFrames) {
            next.shift()
            if (this.cursor > 0) {
                this.cursor -= 1
            } else if (this.cursor === 0) {
                this.cursor = -1
            }
        }
        return next
    }

    clear(): void {
        this.frames = []
        this.cursor = -1
        this.nextId = 1
    }

    truncate(index: number): void {
        if (index < 0 || index >= this.frames.length) return
        this.frames = this.frames.slice(0, index + 1)
        this.cursor = this.frames.length - 1
    }

    addFrame(payload: Omit<ReplayFrame, 'id'>): void {
        const wasAtTail = this.isAtLatest()
        const frame: ReplayFrame = {
            ...payload,
            id: this.nextId++,
        }

        this.frames = this.trimToWindow([...this.frames, frame])

        if (wasAtTail || this.cursor < 0) {
            this.cursor = this.frames.length - 1
        }
    }

    setMaxFramesBack(value: number): void {
        this.maxFramesBack = Math.max(2, Math.round(value))
        this.frames = this.trimToWindow(this.frames)
        if (this.frames.length === 0) {
            this.cursor = -1
            return
        }
        this.cursor = Math.max(0, Math.min(this.frames.length - 1, this.cursor))
    }

    setCursor(index: number): void {
        if (this.frames.length === 0) {
            this.cursor = -1
            return
        }
        this.cursor = Math.max(0, Math.min(this.frames.length - 1, Math.round(index)))
    }

    step(delta: number): void {
        this.setCursor(this.cursor + delta)
    }

    isAtLatest(): boolean {
        return this.frames.length > 0 && this.cursor === this.frames.length - 1
    }

    getCurrentFrame(): ReplayFrame | null {
        if (this.cursor < 0 || this.cursor >= this.frames.length) return null
        return this.frames[this.cursor]
    }
}

export const replay = new ReplayStore()
