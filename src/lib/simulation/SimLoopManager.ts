import { store } from "$lib/store/simStore.svelte";
import { replay } from "$lib/store/replayStore.svelte";
import { simController } from "$lib/store/simController";
import type { GrayScott } from "./GrayScott";
import type { SimParams } from "$lib/simulation/presets";

const MAX_STEPS_PER_FRAME = 16;

export class SimLoopManager {
    private animFrameId = 0;
    private sim: GrayScott | null = null;
    private isLooping = false;

    // FPS tracking
    private lastFrameTime = 0;
    private frameCount = 0;
    private fpsAccumulator = 0;
    private simAccumulatorMs = 0;
    private captureAccumulatorMs = 0;

    // Cached param values for change detection (only allocated when params change)
    private lastParams: SimParams = {
        feed: 0,
        kill: 0,
        da: 0,
        db: 0,
        dt: 0,
        stepsPerFrame: 0,
    };

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

    private paramsChanged(): boolean {
        const p = store.params;
        return (
            p.feed !== this.lastParams.feed ||
            p.kill !== this.lastParams.kill ||
            p.da !== this.lastParams.da ||
            p.db !== this.lastParams.db ||
            p.dt !== this.lastParams.dt ||
            Math.round(p.stepsPerFrame) !== Math.round(this.lastParams.stepsPerFrame)
        );
    }

    private saveParams() {
        const p = store.params;
        this.lastParams = { ...p, stepsPerFrame: Math.round(p.stepsPerFrame) };
    }

    private captureReplayFrame(timestamp: number) {
        if (!this.sim) return;
        replay.addFrame({
            tMs: timestamp,
            iteration: store.iterationCount,
            width: this.sim.getWidth(),
            height: this.sim.getHeight(),
            params: { ...store.params },
            state: this.sim.readStateFloat(),
        });
    }

    private loop = (timestamp: number) => {
        if (!this.sim) return;

        this.updateFps(timestamp);

        const targetFps = Math.max(0, Math.round(store.targetFps));
        const simInterval = targetFps > 0 ? 1000 / targetFps : 0;
        const paramsChanged = this.paramsChanged();
        const shouldSimStep = simInterval === 0 || this.simAccumulatorMs >= simInterval;

        let didSimAdvance = false;

        if (store.isRunning && (shouldSimStep || paramsChanged)) {
            if (simInterval > 0) {
                this.simAccumulatorMs = shouldSimStep
                    ? Math.max(0, this.simAccumulatorMs - simInterval)
                    : 0;
            }
            const clampedSteps = Math.max(
                1,
                Math.min(
                    MAX_STEPS_PER_FRAME,
                    Math.round(store.params.stepsPerFrame),
                ),
            );

            // Advance simulation — pass pre-clamped step count to avoid redundant clamping in step()
            this.sim.step(store.params, clampedSteps);
            didSimAdvance = true;
            store.iterationCount += clampedSteps;

            if (
                store.targetIteration > 0 &&
                store.iterationCount >= store.targetIteration
            ) {
                simController.handleTargetReached();
            }
        }

        if (paramsChanged) this.saveParams();

        this.sim.render();

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

    private updateFps(timestamp: number) {
        if (this.lastFrameTime > 0) {
            const delta = timestamp - this.lastFrameTime;
            this.fpsAccumulator += delta;
            this.simAccumulatorMs += delta;
            this.captureAccumulatorMs += delta;
            this.frameCount++;
            if (this.fpsAccumulator >= 1000) {
                store.fps = Math.round(
                    (this.frameCount * 1000) / this.fpsAccumulator,
                );
                this.frameCount = 0;
                this.fpsAccumulator = 0;
            }
        }
        this.lastFrameTime = timestamp;
    }
}
