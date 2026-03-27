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
    private lastParamsKey = "";

    private buildParamsKey(): string {
        const p = store.params;
        return `${p.feed}|${p.kill}|${p.da}|${p.db}|${p.dt}|${Math.round(p.stepsPerFrame)}`;
    }

    start(sim: GrayScott) {
        this.sim = sim;
        this.isLooping = true;
        this.lastFrameTime = 0;
        this.lastParamsKey = this.buildParamsKey();
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
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

    private loop(timestamp: number) {
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
        const paramsKey = this.buildParamsKey();
        const paramsChanged = paramsKey !== this.lastParamsKey;

        if (store.isRunning && (shouldSimStep || paramsChanged)) {
            if (simInterval > 0) {
                this.simAccumulatorMs = shouldSimStep
                    ? Math.max(0, this.simAccumulatorMs - simInterval)
                    : 0;
            }
            const clampedSteps = Math.max(1, Math.min(16, Math.round(store.params.stepsPerFrame)));

            // Advance simulation
            this.sim.step(store.params);
            didSimAdvance = true;
            store.iterationCount += clampedSteps;
        }

        this.lastParamsKey = paramsKey;

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
            this.animFrameId = requestAnimationFrame(this.loop.bind(this));
        }
    }
}
