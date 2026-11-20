import { Vector3 } from "../math/index.js";

class FixedSimulation {
    constructor(zahja) {
        zahja = zahja || {};
        this.timeStep = zahja.timeStep || 1 / 60;
        this.maxSubSteps = Math.max(1, Math.floor(zahja.maxSubSteps === undefined ? 8 : zahja.maxSubSteps));
        this.accumulator = 0;
        this.tick = 0;
        this.time = 0;
        this.world = zahja.world || null;
        this.onTick = zahja.onTick || null;
        this.onSnapshot = zahja.onSnapshot || null;
        this.onRestore = zahja.onRestore || null;
        this.inputDelay = Math.max(0, Math.floor(zahja.inputDelay || 0));
        this.defaultInput = zahja.defaultInput === undefined ? null : zahja.defaultInput;
        this.inputs = {};
    }
    pushInput(zahja, zahjb) {
        this.inputs[zahja] = zahjb;
        return this;
    }
    inputAt(zahja) {
        var zahjb = zahja - this.inputDelay;
        if (zahjb < 0 || this.inputs[zahjb] === undefined) return this.defaultInput;
        return this.inputs[zahjb];
    }
    currentInput() {
        return this.inputAt(this.tick);
    }
    advance(zahja) {
        this.accumulator += Math.min(Math.max(zahja || 0, 0), .25);
        var zahjb = 0;
        while (this.accumulator >= this.timeStep && zahjb < this.maxSubSteps) {
            this.stepOnce();
            this.accumulator -= this.timeStep;
            zahjb++;
        }
        if (zahjb === this.maxSubSteps) this.accumulator = 0;
        return zahjb;
    }
    stepOnce() {
        var zahja = this.currentInput();
        if (this.onTick) this.onTick(this.tick, zahja, this);
        if (this.world) this.world.singleStep(this.timeStep);
        this.tick++;
        this.time += this.timeStep;
        return this;
    }
    snapshot() {
        var zahja = {
            tick: this.tick,
            time: this.time,
            accumulator: this.accumulator,
            world: this.world ? this.world.snapshot() : null,
            extra: this.onSnapshot ? this.onSnapshot() : null
        };
        return zahja;
    }
    restore(zahja) {
        if (!zahja) return this;
        this.tick = zahja.tick;
        this.time = zahja.time;
        this.accumulator = zahja.accumulator;
        if (zahja.world && this.world) this.world.restore(zahja.world);
        if (this.onRestore && zahja.extra !== null && zahja.extra !== undefined) this.onRestore(zahja.extra, this);
        return this;
    }
    interpolatedPosition(zahja, zahjb, zahjc) {
        var zahjd = Math.min(Math.max(zahjb, 0), 1);
        return (zahjc || new Vector3).copy(zahja.previousPosition).lerp(zahja.position, zahjd);
    }
    applyInterpolation(zahja) {
        if (!this.world) return this;
        var zahjb = this.world.bodies;
        for (var zahjc = 0; zahjc < zahjb.length; zahjc++) {
            var zahjd = zahjb[zahjc];
            if (!zahjd.object) continue;
            this.interpolatedPosition(zahjd, zahja, zahjd.object.position);
        }
        return this;
    }
    reset() {
        this.accumulator = 0;
        this.tick = 0;
        this.time = 0;
        this.inputs = {};
        return this;
    }
}

export { FixedSimulation };
