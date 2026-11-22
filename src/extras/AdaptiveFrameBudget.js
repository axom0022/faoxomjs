class AdaptiveFrameBudget {
    constructor(options) {
        options = options || {};
        this.targetFps = options.targetFps || 60;
        this.frameBudgetMs = 1000 / this.targetFps;
        this.renderer = options.renderer || null;
        this.pipeline = options.pipeline || null;
        this.perfGovernor = options.perfGovernor || null;
        this.sampleCount = Math.max(30, options.sampleCount || 180);
        this.samples = new Float32Array(this.sampleCount);
        this.gpusamples = new Float32Array(this.sampleCount);
        this.samplecursor = 0;
        this.samplelength = 0;
        this.ema = 0;
        this.gpuema = 0;
        this.alpha = options.alpha || .08;
        this.degradeFrames = options.degradeFrames || 8;
        this.upgradeFrames = options.upgradeFrames || 120;
        this.cooldownFrames = options.cooldownFrames || 45;
        this.cooldown = 0;
        this.overframes = 0;
        this.underframes = 0;
        this.profile = options.profile || AdaptiveFrameBudget.detectProfile();
        this.levels = options.levels || AdaptiveFrameBudget.levels(this.profile);
        this.level = options.level !== undefined ? Math.max(0, Math.min(this.levels.length - 1, options.level | 0)) : this.levels.length - 1;
        this.basePixelRatio = options.basePixelRatio || this.renderer && this.renderer.pixelRatio || 1;
        this.onChange = typeof options.onChange === "function" ? options.onChange : null;
        this.stats = {
            frames: 0,
            changes: 0,
            downgrades: 0,
            upgrades: 0,
            frameMs: 0,
            gpuMs: 0,
            p95Ms: 0,
            fps: 0,
            pressure: 0,
            triangles: 0,
            drawCalls: 0
        };
        this.apply("initial");
    }
    static detectProfile() {
        var memory = typeof navigator !== "undefined" && navigator.deviceMemory ? navigator.deviceMemory : 8;
        var cores = typeof navigator !== "undefined" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 8;
        var mobile = memory <= 4 || cores <= 4;
        var high = memory >= 12 && cores >= 12;
        return {
            memoryGb: memory,
            cores: cores,
            mobile: mobile,
            className: mobile ? "mobile" : high ? "high" : "desktop",
            baseTriangles: mobile ? 1500000 : high ? 16000000 : 7000000,
            baseDrawCalls: mobile ? 350 : high ? 2400 : 1200
        };
    }
    static levels(profile) {
        var triangles = profile.baseTriangles;
        var calls = profile.baseDrawCalls;
        return [
            { resolutionScale: .5, lodBias: 2.4, triangleBudget: Math.round(triangles * .18), drawCallBudget: Math.round(calls * .3), shadowScale: .25, postFxLevel: 0, anisotropy: 1 },
            { resolutionScale: .625, lodBias: 1.9, triangleBudget: Math.round(triangles * .32), drawCallBudget: Math.round(calls * .45), shadowScale: .4, postFxLevel: 1, anisotropy: 2 },
            { resolutionScale: .75, lodBias: 1.5, triangleBudget: Math.round(triangles * .52), drawCallBudget: Math.round(calls * .65), shadowScale: .55, postFxLevel: 2, anisotropy: 4 },
            { resolutionScale: .875, lodBias: 1.2, triangleBudget: Math.round(triangles * .75), drawCallBudget: Math.round(calls * .82), shadowScale: .75, postFxLevel: 3, anisotropy: 8 },
            { resolutionScale: 1, lodBias: 1, triangleBudget: triangles, drawCallBudget: calls, shadowScale: 1, postFxLevel: 4, anisotropy: 16 }
        ];
    }
    current() {
        return this.levels[this.level];
    }
    percentile(value) {
        if (!this.samplelength) return 0;
        var copy = Array.prototype.slice.call(this.samples, 0, this.samplelength);
        copy.sort(function(a, b) { return a - b; });
        var index = Math.max(0, Math.min(copy.length - 1, Math.ceil(copy.length * value) - 1));
        return copy[index];
    }
    sample(metrics) {
        metrics = metrics || {};
        var framems = metrics.frameMs || metrics.cpuMs || 0;
        var gpums = metrics.gpuMs || 0;
        if (!(framems > 0) || !isFinite(framems)) return this;
        this.samples[this.samplecursor] = framems;
        this.gpusamples[this.samplecursor] = gpums;
        this.samplecursor = (this.samplecursor + 1) % this.sampleCount;
        if (this.samplelength < this.sampleCount) this.samplelength++;
        this.ema = this.ema ? this.ema + this.alpha * (framems - this.ema) : framems;
        this.gpuema = this.gpuema ? this.gpuema + this.alpha * (gpums - this.gpuema) : gpums;
        var level = this.current();
        var framepressure = this.ema / this.frameBudgetMs;
        var gpupressure = this.gpuema > 0 ? this.gpuema / this.frameBudgetMs : 0;
        var trianglepressure = metrics.triangles > 0 ? metrics.triangles / level.triangleBudget : 0;
        var callpressure = metrics.drawCalls > 0 ? metrics.drawCalls / level.drawCallBudget : 0;
        var pressure = Math.max(framepressure, gpupressure, trianglepressure, callpressure);
        this.stats.frames++;
        this.stats.frameMs = this.ema;
        this.stats.gpuMs = this.gpuema;
        this.stats.fps = 1000 / this.ema;
        this.stats.pressure = pressure;
        this.stats.triangles = metrics.triangles || 0;
        this.stats.drawCalls = metrics.drawCalls || 0;
        if ((this.stats.frames & 15) === 0) this.stats.p95Ms = this.percentile(.95);
        if (this.perfGovernor && typeof this.perfGovernor.update === "function") this.perfGovernor.update(framems);
        if (this.cooldown > 0) {
            this.cooldown--;
            return this;
        }
        if (pressure > 1.04) {
            this.overframes++;
            this.underframes = 0;
            if (this.overframes >= this.degradeFrames && this.level > 0) this.setLevel(this.level - 1, "frame-pressure");
        } else if (pressure < .72 && this.stats.p95Ms < this.frameBudgetMs * .85) {
            this.underframes++;
            this.overframes = 0;
            if (this.underframes >= this.upgradeFrames && this.level < this.levels.length - 1) this.setLevel(this.level + 1, "frame-headroom");
        } else {
            this.overframes = 0;
            this.underframes = 0;
        }
        return this;
    }
    sampleRenderer(frameMs, gpuMs) {
        var info = this.renderer && this.renderer.info ? this.renderer.info : {};
        var render = info.render || {};
        return this.sample({
            frameMs: frameMs,
            gpuMs: gpuMs || info.gpuFrameMs || 0,
            triangles: render.triangles || info.triangles || 0,
            drawCalls: render.calls || info.drawCalls || 0
        });
    }
    samplePipeline(frameMs, gpuMs) {
        var stats = this.pipeline && this.pipeline.stats || {};
        return this.sample({
            frameMs: frameMs,
            gpuMs: gpuMs || 0,
            triangles: stats.triangles > -1 ? stats.triangles : stats.budgetTriangles || 0,
            drawCalls: stats.budgetDrawCalls || stats.batches || 0
        });
    }
    setLevel(level, reason) {
        level = Math.max(0, Math.min(this.levels.length - 1, level | 0));
        if (level === this.level) return this;
        var previous = this.level;
        this.level = level;
        this.cooldown = this.cooldownFrames;
        this.overframes = 0;
        this.underframes = 0;
        this.stats.changes++;
        if (level < previous) this.stats.downgrades++; else this.stats.upgrades++;
        this.apply(reason || "manual");
        if (this.onChange) this.onChange(this.current(), previous, level, reason || "manual", this);
        return this;
    }
    apply(reason) {
        var level = this.current();
        if (this.renderer) {
            if (typeof this.renderer.setPixelRatio === "function") this.renderer.setPixelRatio(this.basePixelRatio * level.resolutionScale);
            this.renderer.lodBias = level.lodBias;
            this.renderer.triangleBudget = level.triangleBudget;
            this.renderer.drawCallBudget = level.drawCallBudget;
            this.renderer.shadowScale = level.shadowScale;
            this.renderer.postFxLevel = level.postFxLevel;
            this.renderer.maxAnisotropyBudget = level.anisotropy;
        }
        if (this.pipeline) {
            this.pipeline.triangleBudget = level.triangleBudget;
            this.pipeline.drawCallBudget = level.drawCallBudget;
            this.pipeline.lodBias = level.lodBias;
            this.pipeline.targetPerRegion = Math.max(4, Math.round(12 / level.lodBias));
        }
        if (this.perfGovernor && typeof this.perfGovernor.setResolutionScale === "function") this.perfGovernor.setResolutionScale(level.resolutionScale, reason || "adaptive-budget");
        return this;
    }
    report() {
        return {
            targetFps: this.targetFps,
            frameBudgetMs: this.frameBudgetMs,
            profile: Object.assign({}, this.profile),
            level: this.level,
            quality: Object.assign({}, this.current()),
            stats: Object.assign({}, this.stats)
        };
    }
    reset() {
        this.samplecursor = 0;
        this.samplelength = 0;
        this.ema = 0;
        this.gpuema = 0;
        this.overframes = 0;
        this.underframes = 0;
        this.cooldown = 0;
        this.samples.fill(0);
        this.gpusamples.fill(0);
        return this;
    }
}

class VisibilityBudget {
    constructor(options) {
        options = options || {};
        this.triangleBudget = options.triangleBudget || 7000000;
        this.drawCallBudget = options.drawCallBudget || 1200;
        this.bucketCount = Math.max(8, options.bucketCount || 32);
        this.hysteresisFrames = options.hysteresisFrames || 8;
        this.history = new WeakMap;
        this.frame = 0;
        this.stats = { candidates: 0, selected: 0, triangles: 0, rejectedTriangles: 0, drawCalls: 0 };
    }
    triangles(object) {
        var geometry = object && object.geometry;
        if (!geometry) return 0;
        var index = geometry.index;
        if (index) return Math.floor((index.count || index.length || index.array && index.array.length || 0) / 3);
        var position = geometry.attributes && geometry.attributes.position;
        return position ? Math.floor((position.count || position.array.length / (position.itemSize || 3)) / 3) : 0;
    }
    select(objects, camera, applyVisibility) {
        objects = objects || [];
        var buckets = new Array(this.bucketCount);
        for (var index = 0; index < buckets.length; index++) buckets[index] = [];
        var cameraPosition = camera && camera.position ? camera.position : { x: 0, y: 0, z: 0 };
        for (var objectIndex = 0; objectIndex < objects.length; objectIndex++) {
            var object = objects[objectIndex];
            if (!object || object.frustumCulled === false && object.visible === false) continue;
            var position = object.position || { x: 0, y: 0, z: 0 };
            var dx = position.x - cameraPosition.x;
            var dy = position.y - cameraPosition.y;
            var dz = position.z - cameraPosition.z;
            var distance2 = dx * dx + dy * dy + dz * dz;
            var triangles = this.triangles(object);
            var importance = object.userData && object.userData.importance !== undefined ? object.userData.importance : 1;
            var recent = this.history.get(object) || -1000;
            var sticky = this.frame - recent <= this.hysteresisFrames ? 1.35 : 1;
            var score = importance * sticky / Math.max(1, Math.sqrt(distance2));
            var bucket = Math.max(0, Math.min(this.bucketCount - 1, Math.floor(Math.log2(1 + score * 4096))));
            buckets[bucket].push({ object: object, triangles: triangles, score: score });
        }
        var selected = [];
        var total = 0;
        var calls = 0;
        var rejected = 0;
        for (var bucketIndex = buckets.length - 1; bucketIndex >= 0; bucketIndex--) {
            var entries = buckets[bucketIndex];
            entries.sort(function(a, b) { return b.score - a.score; });
            for (var entryIndex = 0; entryIndex < entries.length; entryIndex++) {
                var entry = entries[entryIndex];
                if (calls >= this.drawCallBudget || total + entry.triangles > this.triangleBudget) {
                    rejected += entry.triangles;
                    if (applyVisibility) entry.object.visible = false;
                    continue;
                }
                selected.push(entry.object);
                total += entry.triangles;
                calls++;
                this.history.set(entry.object, this.frame);
                if (applyVisibility) entry.object.visible = true;
            }
        }
        this.frame++;
        this.stats.candidates = objects.length;
        this.stats.selected = selected.length;
        this.stats.triangles = total;
        this.stats.rejectedTriangles = rejected;
        this.stats.drawCalls = calls;
        return selected;
    }
    applyFrameBudget(budget) {
        var level = budget.current ? budget.current() : budget;
        this.triangleBudget = level.triangleBudget || this.triangleBudget;
        this.drawCallBudget = level.drawCallBudget || this.drawCallBudget;
        return this;
    }
}

class FrameTaskScheduler {
    constructor(options) {
        options = options || {};
        this.budgetMs = options.budgetMs || 2;
        this.maxTasks = options.maxTasks || 64;
        this.queue = [];
        this.sequence = 0;
        this.stats = { frames: 0, executed: 0, deferred: 0, elapsedMs: 0 };
    }
    add(task, options) {
        options = options || {};
        if (typeof task !== "function") throw new Error("FrameTaskScheduler.add requires a function");
        this.queue.push({ task: task, priority: options.priority || 0, deadline: options.deadline || Infinity, sequence: this.sequence++ });
        return this;
    }
    run(budgetMs) {
        var now = typeof performance !== "undefined" ? performance.now.bind(performance) : Date.now;
        var started = now();
        var budget = budgetMs !== undefined ? budgetMs : this.budgetMs;
        this.queue.sort(function(a, b) {
            if (a.deadline !== b.deadline) return a.deadline - b.deadline;
            if (a.priority !== b.priority) return b.priority - a.priority;
            return a.sequence - b.sequence;
        });
        var executed = 0;
        while (this.queue.length && executed < this.maxTasks && now() - started < budget) {
            var entry = this.queue.shift();
            var again = entry.task();
            executed++;
            if (typeof again === "function") this.add(again, entry);
        }
        this.stats.frames++;
        this.stats.executed += executed;
        this.stats.deferred = this.queue.length;
        this.stats.elapsedMs = now() - started;
        return executed;
    }
    clear() {
        this.queue.length = 0;
        return this;
    }
}

class RenderBenchmark {
    constructor(options) {
        options = options || {};
        this.renderer = options.renderer;
        this.scene = options.scene;
        this.camera = options.camera;
        this.warmup = options.warmup || 30;
        this.frames = options.frames || 180;
    }
    async run() {
        if (!this.renderer || typeof this.renderer.render !== "function") throw new Error("RenderBenchmark requires a renderer");
        var waits = typeof requestAnimationFrame === "function" ? function() { return new Promise(function(resolve) { requestAnimationFrame(resolve); }); } : function() { return new Promise(function(resolve) { setTimeout(resolve, 0); }); };
        for (var warmup = 0; warmup < this.warmup; warmup++) {
            this.renderer.render(this.scene, this.camera);
            await waits();
        }
        var samples = [];
        var gpums = [];
        for (var frame = 0; frame < this.frames; frame++) {
            var started = typeof performance !== "undefined" ? performance.now() : Date.now();
            this.renderer.render(this.scene, this.camera);
            await waits();
            samples.push((typeof performance !== "undefined" ? performance.now() : Date.now()) - started);
            if (this.renderer.info && this.renderer.info.gpuFrameMs) gpums.push(this.renderer.info.gpuFrameMs);
        }
        samples.sort(function(a, b) { return a - b; });
        gpums.sort(function(a, b) { return a - b; });
        var sum = samples.reduce(function(total, value) { return total + value; }, 0);
        var render = this.renderer.info && this.renderer.info.render || {};
        return {
            frames: samples.length,
            averageMs: sum / samples.length,
            fps: samples.length * 1000 / sum,
            p50Ms: samples[Math.floor(samples.length * .5)] || 0,
            p95Ms: samples[Math.min(samples.length - 1, Math.floor(samples.length * .95))] || 0,
            p99Ms: samples[Math.min(samples.length - 1, Math.floor(samples.length * .99))] || 0,
            gpuP95Ms: gpums.length ? gpums[Math.min(gpums.length - 1, Math.floor(gpums.length * .95))] : null,
            triangles: render.triangles || 0,
            drawCalls: render.calls || 0,
            stable60: samples[Math.min(samples.length - 1, Math.floor(samples.length * .95))] <= 1000 / 60
        };
    }
}

export { AdaptiveFrameBudget, FrameTaskScheduler, RenderBenchmark, VisibilityBudget };
