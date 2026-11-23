class RuntimeQualityContract {
    constructor(rules) {
        this.rules = Object.assign({
            targetFps: 60,
            p95FrameMs: 1000 / 60,
            maxDrawCalls: Infinity,
            maxVisibleTriangles: Infinity,
            maxGpuMemoryMb: Infinity,
            maxUploadBytesPerFrame: Infinity,
            maxMainThreadBlockMs: Infinity,
            minResolutionScale: 0,
            maxInputLatencyMs: Infinity
        }, rules || {});
        this.samples = [];
        this.maxSamples = Math.max(30, this.rules.sampleCount || 240);
        this.violations = [];
        this.policies = new Map;
        this.stats = { samples: 0, passes: 0, failures: 0, policyRuns: 0 };
    }
    policy(metric, callback) {
        if (typeof callback !== "function") throw new Error("RuntimeQualityContract policy requires a function");
        this.policies.set(metric, callback);
        return this;
    }
    sample(metrics) {
        metrics = Object.assign({ timestamp: typeof performance !== "undefined" ? performance.now() : Date.now() }, metrics || {});
        this.samples.push(metrics);
        if (this.samples.length > this.maxSamples) this.samples.shift();
        this.stats.samples++;
        return this.evaluate(metrics);
    }
    percentile(name, value) {
        var values = [];
        for (var index = 0; index < this.samples.length; index++) if (typeof this.samples[index][name] === "number" && isFinite(this.samples[index][name])) values.push(this.samples[index][name]);
        if (!values.length) return 0;
        values.sort(function(a, b) { return a - b; });
        return values[Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * value) - 1))];
    }
    evaluate(metrics) {
        var checks = [
            [ "fps", metrics.fps, this.rules.targetFps, "min" ],
            [ "frameMs", this.percentile("frameMs", .95), this.rules.p95FrameMs, "max" ],
            [ "drawCalls", metrics.drawCalls, this.rules.maxDrawCalls, "max" ],
            [ "visibleTriangles", metrics.visibleTriangles, this.rules.maxVisibleTriangles, "max" ],
            [ "gpuMemoryMb", metrics.gpuMemoryMb, this.rules.maxGpuMemoryMb, "max" ],
            [ "uploadBytes", metrics.uploadBytes, this.rules.maxUploadBytesPerFrame, "max" ],
            [ "mainThreadBlockMs", metrics.mainThreadBlockMs, this.rules.maxMainThreadBlockMs, "max" ],
            [ "resolutionScale", metrics.resolutionScale, this.rules.minResolutionScale, "min" ],
            [ "inputLatencyMs", metrics.inputLatencyMs, this.rules.maxInputLatencyMs, "max" ]
        ];
        var current = [];
        for (var index = 0; index < checks.length; index++) {
            var check = checks[index];
            if (typeof check[1] !== "number" || !isFinite(check[1]) || !isFinite(check[2])) continue;
            var failed = check[3] === "max" ? check[1] > check[2] : check[1] < check[2];
            if (!failed) continue;
            var violation = { metric: check[0], value: check[1], limit: check[2], mode: check[3], sample: this.stats.samples };
            current.push(violation);
            this.violations.push(violation);
            var policy = this.policies.get(check[0]);
            if (policy) {
                policy(violation, metrics, this);
                this.stats.policyRuns++;
            }
        }
        if (current.length) this.stats.failures++; else this.stats.passes++;
        return { ok: current.length === 0, violations: current };
    }
    report() {
        return {
            ok: this.violations.length === 0,
            rules: Object.assign({}, this.rules),
            p50FrameMs: this.percentile("frameMs", .5),
            p95FrameMs: this.percentile("frameMs", .95),
            p99FrameMs: this.percentile("frameMs", .99),
            violations: this.violations.slice(),
            stats: Object.assign({}, this.stats)
        };
    }
    reset() {
        this.samples.length = 0;
        this.violations.length = 0;
        this.stats.samples = 0;
        this.stats.passes = 0;
        this.stats.failures = 0;
        this.stats.policyRuns = 0;
        return this;
    }
}

class CounterfactualRenderer {
    constructor(options) {
        options = options || {};
        this.history = [];
        this.maxHistory = options.maxHistory || 240;
        this.minimumSamples = options.minimumSamples || 8;
        this.weights = Object.assign({
            resolutionScale: 1.7,
            triangles: .35,
            drawCalls: .25,
            shadows: .2,
            postFx: .2
        }, options.weights || {});
        this.stats = { observations: 0, predictions: 0, choices: 0 };
    }
    observe(state, frameMs) {
        this.history.push({ state: Object.assign({}, state), frameMs: frameMs });
        if (this.history.length > this.maxHistory) this.history.shift();
        this.stats.observations++;
        return this;
    }
    estimate(base, candidate) {
        var basems = base.frameMs || this.averageFrameMs() || 1000 / 60;
        var ratio = 1;
        if (base.resolutionScale && candidate.resolutionScale) ratio *= Math.pow(candidate.resolutionScale / base.resolutionScale, this.weights.resolutionScale);
        if (base.triangles && candidate.triangles) ratio *= Math.pow(candidate.triangles / base.triangles, this.weights.triangles);
        if (base.drawCalls && candidate.drawCalls) ratio *= Math.pow(candidate.drawCalls / base.drawCalls, this.weights.drawCalls);
        if (base.shadows && candidate.shadows) ratio *= Math.pow(candidate.shadows / base.shadows, this.weights.shadows);
        if (base.postFx && candidate.postFx) ratio *= Math.pow(candidate.postFx / base.postFx, this.weights.postFx);
        this.stats.predictions++;
        return basems * ratio;
    }
    averageFrameMs() {
        if (!this.history.length) return 0;
        var total = 0;
        for (var index = 0; index < this.history.length; index++) total += this.history[index].frameMs;
        return total / this.history.length;
    }
    choose(base, candidates, targetMs, visualCost) {
        if (!candidates || !candidates.length) return null;
        targetMs = targetMs || 1000 / 60;
        visualCost = visualCost || function(candidate) { return candidate.visualCost || 0; };
        var choices = [];
        for (var index = 0; index < candidates.length; index++) choices.push({ candidate: candidates[index], predictedMs: this.estimate(base, candidates[index]), visualCost: visualCost(candidates[index], base) });
        choices.sort(function(a, b) {
            var avalid = a.predictedMs <= targetMs;
            var bvalid = b.predictedMs <= targetMs;
            if (avalid !== bvalid) return avalid ? -1 : 1;
            if (avalid && a.visualCost !== b.visualCost) return a.visualCost - b.visualCost;
            return a.predictedMs - b.predictedMs;
        });
        this.stats.choices++;
        return choices[0];
    }
    report() {
        return { averageFrameMs: this.averageFrameMs(), history: this.history.length, stats: Object.assign({}, this.stats) };
    }
}

export { CounterfactualRenderer, RuntimeQualityContract };
