import { store } from "$lib/store/simStore.svelte";
import { replay } from "$lib/store/replayStore.svelte";
import type { GrayScott } from "./GrayScott";

export class SimLoopManager {
    private animFrameId: number = 0;
    private sim: GrayScott | null = null;
    private isLooping: boolean = false;

    // FPS tracking
    private lastFrameTime = 0;
    private frameCount = 0;
    private fpsAccumulator = 0;
    private simAccumulatorMs = 0;
    private captureAccumulatorMs = 0;

    // Cached param values for change detection (avoids allocating a string key every frame)
    private _lastFeed = 0;
    private _lastKill = 0;
    private _lastDa = 0;
    private _lastDb = 0;
    private _lastDt = 0;
    private _lastSteps = 0;

    private paramsChanged(): boolean {
        const p = store.params;
        const steps = Math.round(p.stepsPerFrame);
        return (
            p.feed !== this._lastFeed ||
            p.kill !== this._lastKill ||
            p.da !== this._lastDa ||
            p.db !== this._lastDb ||
            p.dt !== this._lastDt ||
            steps !== this._lastSteps
        );
    }

    private saveParams() {
        const p = store.params;
        this._lastFeed = p.feed;
        this._lastKill = p.kill;
        this._lastDa = p.da;
        this._lastDb = p.db;
        this._lastDt = p.dt;
        this._lastSteps = Math.round(p.stepsPerFrame);
    }

    start(sim: GrayScott) {
        this.sim = sim;
        this.isLooping = true;
        this.lastFrameTime = 0;
        this.saveParams();
        this.animFrameId = requestAnimationFrame(this.loop);
    }

    stop() {
        this.isLooping = false;
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    }

    resetAccumulators() {
        this.simAccumulatorMs = 0;
        this.captureAccumulatorMs = 0;
    }

    private captureReplayFrame(timestamp: number) {
        if (!this.sim) return;
        const width = this.sim.getWidth();
        const height = this.sim.getHeight();

        replay.addFrame({
            tMs: timestamp,
            iteration: store.iterationCount,
            width,
            height,
            params: { ...store.params },
            state: this.sim.readStateFloat(),
        });
    }

    private loop = (timestamp: number) => {
        if (!this.sim) return;
        let didSimAdvance = false;

        // FPS calculation
        if (this.lastFrameTime > 0) {
            const delta = timestamp - this.lastFrameTime;
            this.fpsAccumulator += delta;
            this.simAccumulatorMs += delta;
            this.captureAccumulatorMs += delta;
            this.frameCount++;
            if (this.fpsAccumulator >= 1000) {
                store.fps = Math.round((this.frameCount * 1000) / this.fpsAccumulator);
                this.frameCount = 0;
                this.fpsAccumulator = 0;
            }
        }
        this.lastFrameTime = timestamp;

        const targetFps = Math.max(0, Math.round(store.targetFps));
        const simInterval = targetFps > 0 ? 1000 / targetFps : 0;
        const shouldSimStep = simInterval === 0 || this.simAccumulatorMs >= simInterval;
        const paramsChanged = this.paramsChanged();

        if (store.isRunning && (shouldSimStep || paramsChanged)) {
            if (simInterval > 0) {
                this.simAccumulatorMs = shouldSimStep
                    ? Math.max(0, this.simAccumulatorMs - simInterval)
                    : 0;
            }
            const clampedSteps = Math.max(1, Math.min(16, Math.round(store.params.stepsPerFrame)));

            // Advance simulation — pass pre-clamped step count to avoid redundant clamping in step()
            this.sim.step(store.params, clampedSteps);
            didSimAdvance = true;
            store.iterationCount += clampedSteps;
        }

        if (paramsChanged) this.saveParams();

        this.sim.render(store.activeColormapId !== "blackwhite");

        if (!store.isRunning) {
            this.captureAccumulatorMs = 0;
        }

        const captureInterval = 1000 / Math.max(1, replay.captureFps);
        if (didSimAdvance && this.captureAccumulatorMs >= captureInterval) {
            this.captureAccumulatorMs -= captureInterval;
            this.captureReplayFrame(timestamp);
        }

        if (this.isLooping) {
            this.animFrameId = requestAnimationFrame(this.loop);
        }
    }
}
