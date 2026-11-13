import { Vector3 } from "../math/index.js";

class FixedSimulation {
    constructor(options) {
        options = options || {};
        this.timeStep = options.timeStep || 1 / 60;
        this.maxSubSteps = Math.max(1, Math.floor(options.maxSubSteps === undefined ? 8 : options.maxSubSteps));
        this.accumulator = 0;
        this.tick = 0;
        this.time = 0;
        this.world = options.world || null;
        this.onTick = options.onTick || null;
        this.onSnapshot = options.onSnapshot || null;
        this.onRestore = options.onRestore || null;
        this.inputDelay = Math.max(0, Math.floor(options.inputDelay || 0));
        this.defaultInput = options.defaultInput === undefined ? null : options.defaultInput;
        this.inputs = {};
    }
    pushInput(tick, input) {
        this.inputs[tick] = input;
        return this;
    }
    inputAt(tick) {
        var source = tick - this.inputDelay;
        if (source < 0 || this.inputs[source] === undefined) return this.defaultInput;
        return this.inputs[source];
    }
    currentInput() {
        return this.inputAt(this.tick);
    }
    advance(frameDelta) {
        this.accumulator += Math.min(Math.max(frameDelta || 0, 0), 0.25);
        var steps = 0;
        while (this.accumulator >= this.timeStep && steps < this.maxSubSteps) {
            this.stepOnce();
            this.accumulator -= this.timeStep;
            steps++;
        }
        if (steps === this.maxSubSteps) this.accumulator = 0;
        return steps;
    }
    stepOnce() {
        var input = this.currentInput();
        if (this.onTick) this.onTick(this.tick, input, this);
        if (this.world) this.world.singleStep(this.timeStep);
        this.tick++;
        this.time += this.timeStep;
        return this;
    }
    snapshot() {
        var state = { tick: this.tick, time: this.time, accumulator: this.accumulator, world: this.world ? this.world.snapshot() : null, extra: this.onSnapshot ? this.onSnapshot() : null };
        return state;
    }
    restore(state) {
        if (!state) return this;
        this.tick = state.tick;
        this.time = state.time;
        this.accumulator = state.accumulator;
        if (state.world && this.world) this.world.restore(state.world);
        if (this.onRestore && state.extra !== null && state.extra !== undefined) this.onRestore(state.extra, this);
        return this;
    }
    interpolatedPosition(body, alpha, target) {
        var t = Math.min(Math.max(alpha, 0), 1);
        return (target || new Vector3()).copy(body.previousPosition).lerp(body.position, t);
    }
    applyInterpolation(alpha) {
        if (!this.world) return this;
        var bodies = this.world.bodies;
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];
            if (!body.object) continue;
            this.interpolatedPosition(body, alpha, body.object.position);
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
