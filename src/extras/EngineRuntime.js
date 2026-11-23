import { AdaptiveFrameBudget, FrameTaskScheduler } from "./AdaptiveFrameBudget.js";

import { RuntimeQualityContract } from "./RuntimeQualityContract.js";

class FrameContext {
    constructor(options) {
        options = options || {};
        this.frame = 0;
        this.simulationTick = 0;
        this.time = 0;
        this.simulationTime = 0;
        this.delta = 0;
        this.fixedDelta = options.fixedDelta || 1 / 60;
        this.alpha = 0;
        this.cpuBudget = options.cpuBudget || 1000 / 60;
        this.gpuBudget = options.gpuBudget || 1000 / 60;
        this.cpuMs = 0;
        this.gpuMs = 0;
        this.quality = options.quality || null;
        this.camera = options.camera || null;
        this.visibility = options.visibility || null;
        this.input = options.input || null;
        this.networkTime = 0;
        this.renderer = options.renderer || null;
        this.scene = options.scene || null;
        this.world = options.world || null;
        this.suspended = false;
        this.metadata = options.metadata || Object.create(null);
    }
    begin(time, delta) {
        this.frame++;
        this.time = time;
        this.delta = delta;
        this.cpuMs = 0;
        this.gpuMs = 0;
        return this;
    }
    fixed(tick, time) {
        this.simulationTick = tick;
        this.simulationTime = time;
        return this;
    }
    copy(source) {
        var keys = Object.keys(source || {});
        for (var index = 0; index < keys.length; index++) if (keys[index] in this) this[keys[index]] = source[keys[index]];
        return this;
    }
    snapshot() {
        return {
            frame: this.frame,
            simulationTick: this.simulationTick,
            time: this.time,
            simulationTime: this.simulationTime,
            delta: this.delta,
            fixedDelta: this.fixedDelta,
            alpha: this.alpha,
            cpuBudget: this.cpuBudget,
            gpuBudget: this.gpuBudget,
            cpuMs: this.cpuMs,
            gpuMs: this.gpuMs,
            networkTime: this.networkTime,
            suspended: this.suspended
        };
    }
}

class CapabilityProfile {
    constructor(values) {
        values = values || {};
        this.name = values.name || "compatibility";
        this.score = values.score || 0;
        this.confidence = values.confidence || 0;
        this.renderer = values.renderer || "webgl2";
        this.memoryMb = values.memoryMb || 512;
        this.workerCount = values.workerCount || 1;
        this.targetFps = values.targetFps || 60;
        this.resolutionScale = values.resolutionScale || 1;
        this.triangleBudget = values.triangleBudget || 1000000;
        this.drawCallBudget = values.drawCallBudget || 300;
        this.shadowSystem = values.shadowSystem || "standard";
        this.textureFormats = values.textureFormats ? values.textureFormats.slice() : [];
        this.compute = !!values.compute;
        this.rayQuery = !!values.rayQuery;
        this.sharedMemory = !!values.sharedMemory;
        this.webgpu = !!values.webgpu;
        this.webgl2 = values.webgl2 !== false;
        this.xr = !!values.xr;
        this.reasons = values.reasons ? values.reasons.slice() : [];
        this.limits = Object.assign({}, values.limits || {});
    }
    static classify(values) {
        var memory = values.memoryGb || 4;
        var cores = values.cores || 4;
        var webgpu = !!values.webgpu;
        var xr = !!values.xr;
        var score = memory * 8 + cores * 4 + (webgpu ? 30 : 0) + (values.sharedMemory ? 8 : 0);
        var name = "compatibility";
        if (xr) name = "xr";
        else if (memory <= 2 || cores <= 2) name = "mobile-low";
        else if (memory <= 6 && cores <= 8) name = "mobile-high";
        else if (!webgpu || memory < 8) name = "desktop-integrated";
        else if (memory < 16 || cores < 12) name = "desktop-discrete";
        else if (memory < 32) name = "workstation";
        else name = "workstation";
        var table = {
            compatibility: [ 512, 1, .625, 800000, 250, "standard" ],
            "mobile-low": [ 768, 2, .625, 1200000, 300, "standard" ],
            "mobile-high": [ 1536, 4, .75, 3000000, 600, "cascaded" ],
            "desktop-integrated": [ 2048, 6, .8, 5000000, 900, "cascaded" ],
            "desktop-discrete": [ 4096, 8, 1, 12000000, 1800, "virtual" ],
            workstation: [ 8192, 12, 1, 24000000, 3000, "virtual" ],
            xr: [ 3072, 6, .8, 6000000, 1000, "cascaded" ]
        };
        var preset = table[name];
        return new CapabilityProfile({
            name: name,
            score: score,
            confidence: values.confidence || 70,
            renderer: webgpu ? "webgpu" : "webgl2",
            memoryMb: preset[0],
            workerCount: Math.max(1, Math.min(preset[1], cores - 1)),
            targetFps: xr ? 90 : 60,
            resolutionScale: preset[2],
            triangleBudget: preset[3],
            drawCallBudget: preset[4],
            shadowSystem: preset[5],
            textureFormats: values.textureFormats || [],
            compute: webgpu,
            rayQuery: !!values.rayQuery,
            sharedMemory: !!values.sharedMemory,
            webgpu: webgpu,
            webgl2: values.webgl2 !== false,
            xr: xr,
            reasons: values.reasons || [],
            limits: values.limits || {}
        });
    }
    static async detect(options) {
        options = options || {};
        var nav = typeof navigator !== "undefined" ? navigator : {};
        var memory = Number(nav.deviceMemory || options.memoryGb || 4);
        var cores = Number(nav.hardwareConcurrency || options.cores || 4);
        var shared = typeof SharedArrayBuffer !== "undefined" && (typeof crossOriginIsolated === "undefined" || crossOriginIsolated === true);
        var webgpu = false;
        var limits = {};
        var reasons = [];
        if (nav.gpu && options.webgpu !== false) {
            try {
                var adapter = await nav.gpu.requestAdapter({ powerPreference: options.powerPreference || "high-performance" });
                if (adapter) {
                    webgpu = true;
                    if (adapter.limits) {
                        var names = [ "maxBufferSize", "maxStorageBufferBindingSize", "maxTextureDimension2D", "maxBindGroups", "maxComputeWorkgroupSizeX", "maxComputeInvocationsPerWorkgroup" ];
                        for (var index = 0; index < names.length; index++) if (adapter.limits[names[index]] !== undefined) limits[names[index]] = Number(adapter.limits[names[index]]);
                    }
                } else reasons.push("webgpu-adapter-unavailable");
            } catch (error) {
                reasons.push("webgpu-probe-failed");
            }
        } else reasons.push("webgpu-unavailable");
        var xr = !!(nav.xr && options.xr !== false);
        return CapabilityProfile.classify({
            memoryGb: memory,
            cores: cores,
            webgpu: webgpu,
            webgl2: true,
            sharedMemory: shared,
            xr: xr,
            rayQuery: false,
            confidence: webgpu ? 90 : 75,
            reasons: reasons,
            limits: limits,
            textureFormats: webgpu ? [ "bc", "etc2", "astc" ] : [ "etc2" ]
        });
    }
    toJSON() {
        return {
            name: this.name,
            score: this.score,
            confidence: this.confidence,
            renderer: this.renderer,
            memoryMb: this.memoryMb,
            workerCount: this.workerCount,
            targetFps: this.targetFps,
            resolutionScale: this.resolutionScale,
            triangleBudget: this.triangleBudget,
            drawCallBudget: this.drawCallBudget,
            shadowSystem: this.shadowSystem,
            textureFormats: this.textureFormats.slice(),
            compute: this.compute,
            rayQuery: this.rayQuery,
            sharedMemory: this.sharedMemory,
            webgpu: this.webgpu,
            webgl2: this.webgl2,
            xr: this.xr,
            reasons: this.reasons.slice(),
            limits: Object.assign({}, this.limits)
        };
    }
}

class FeatureManifest {
    constructor(options) {
        options = options || {};
        this.features = new Map;
        this.loaders = new Map;
        this.instances = new Map;
        this.enabled = new Set;
        this.loading = new Map;
        this.strict = options.strict !== false;
        this.stats = { registered: 0, loaded: 0, failed: 0, bytes: 0 };
    }
    register(name, descriptor, loader) {
        name = String(name);
        if (!name) throw new Error("FeatureManifest.register requires a name");
        if (this.features.has(name)) throw new Error("FeatureManifest duplicate feature " + name);
        descriptor = descriptor || {};
        this.features.set(name, {
            name: name,
            version: descriptor.version || "1",
            dependencies: (descriptor.dependencies || []).slice().sort(),
            optional: (descriptor.optional || []).slice().sort(),
            conflicts: (descriptor.conflicts || []).slice().sort(),
            capabilities: (descriptor.capabilities || []).slice().sort(),
            estimatedBytes: descriptor.estimatedBytes || 0,
            lazy: descriptor.lazy !== false,
            metadata: Object.assign({}, descriptor.metadata || {})
        });
        if (loader) this.loaders.set(name, loader);
        this.stats.registered++;
        return this;
    }
    has(name) {
        return this.features.has(name);
    }
    resolve(names) {
        names = Array.isArray(names) ? names : [ names ];
        var ordered = [];
        var visiting = new Set;
        var visited = new Set;
        var self = this;
        function visit(name) {
            if (visited.has(name)) return;
            if (visiting.has(name)) throw new Error("FeatureManifest dependency cycle at " + name);
            var descriptor = self.features.get(name);
            if (!descriptor) {
                if (self.strict) throw new Error("FeatureManifest unknown feature " + name);
                return;
            }
            visiting.add(name);
            for (var index = 0; index < descriptor.dependencies.length; index++) visit(descriptor.dependencies[index]);
            visiting.delete(name);
            visited.add(name);
            ordered.push(name);
        }
        for (var index = 0; index < names.length; index++) visit(String(names[index]));
        var selected = new Set(ordered);
        for (var order = 0; order < ordered.length; order++) {
            var descriptor = this.features.get(ordered[order]);
            for (var conflict = 0; conflict < descriptor.conflicts.length; conflict++) if (selected.has(descriptor.conflicts[conflict])) throw new Error("FeatureManifest conflict " + descriptor.name + " and " + descriptor.conflicts[conflict]);
        }
        return ordered;
    }
    async load(names, context) {
        var ordered = this.resolve(names);
        var loaded = [];
        for (var index = 0; index < ordered.length; index++) loaded.push(await this.loadOne(ordered[index], context));
        return loaded;
    }
    async loadOne(name, context) {
        if (this.instances.has(name)) return this.instances.get(name);
        if (this.loading.has(name)) return this.loading.get(name);
        var descriptor = this.features.get(name);
        if (!descriptor) throw new Error("FeatureManifest unknown feature " + name);
        var promise = (async () => {
            for (var index = 0; index < descriptor.dependencies.length; index++) await this.loadOne(descriptor.dependencies[index], context);
            var loader = this.loaders.get(name);
            var instance = loader ? await loader(context || {}, descriptor, this) : descriptor;
            this.instances.set(name, instance);
            this.enabled.add(name);
            this.stats.loaded++;
            this.stats.bytes += descriptor.estimatedBytes;
            this.loading.delete(name);
            return instance;
        })().catch(error => {
            this.loading.delete(name);
            this.stats.failed++;
            throw error;
        });
        this.loading.set(name, promise);
        return promise;
    }
    disable(name) {
        this.enabled.delete(name);
        return this;
    }
    enable(name) {
        if (!this.instances.has(name)) throw new Error("FeatureManifest feature is not loaded " + name);
        this.enabled.add(name);
        return this;
    }
    status(name) {
        return {
            registered: this.features.has(name),
            loaded: this.instances.has(name),
            enabled: this.enabled.has(name),
            loading: this.loading.has(name),
            descriptor: this.features.get(name) || null
        };
    }
    toJSON() {
        var features = [];
        this.features.forEach(function(value) {
            features.push(Object.assign({}, value, { metadata: Object.assign({}, value.metadata) }));
        });
        features.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
        return { features: features, enabled: Array.from(this.enabled).sort(), stats: Object.assign({}, this.stats) };
    }
}

class EngineWorld {
    constructor(name, options) {
        options = options || {};
        this.name = name || "world";
        this.scene = options.scene || null;
        this.camera = options.camera || null;
        this.simulationRate = options.simulationRate || 60;
        this.renderRate = options.renderRate || 0;
        this.enabled = options.enabled !== false;
        this.visible = options.visible !== false;
        this.timeScale = options.timeScale === undefined ? 1 : options.timeScale;
        this.metadata = options.metadata || Object.create(null);
        this.systems = [];
        this.frame = 0;
        this.tick = 0;
    }
    addSystem(system) {
        if (this.systems.indexOf(system) < 0) this.systems.push(system);
        return this;
    }
    removeSystem(system) {
        var index = this.systems.indexOf(system);
        if (index >= 0) this.systems.splice(index, 1);
        return this;
    }
}

class Engine {
    constructor(options) {
        options = options || {};
        this.renderer = options.renderer || null;
        this.scene = options.scene || null;
        this.camera = options.camera || null;
        this.input = options.input || null;
        this.fixedDelta = options.fixedDelta || 1 / 60;
        this.maxDelta = options.maxDelta || .1;
        this.maxSubsteps = options.maxSubsteps || 4;
        this.timeScale = options.timeScale === undefined ? 1 : options.timeScale;
        this.context = options.context || new FrameContext({
            fixedDelta: this.fixedDelta,
            renderer: this.renderer,
            scene: this.scene,
            camera: this.camera,
            input: this.input
        });
        this.profile = options.profile || null;
        this.features = options.features || new FeatureManifest;
        this.scheduler = options.scheduler || new FrameTaskScheduler({ budgetMs: options.taskBudgetMs || 2 });
        this.quality = options.quality || new AdaptiveFrameBudget({
            renderer: this.renderer,
            targetFps: options.targetFps || 60,
            onChange: options.onQualityChange
        });
        this.context.quality = this.quality;
        this.contract = options.contract instanceof RuntimeQualityContract ? options.contract : new RuntimeQualityContract(options.contract || { targetFps: options.targetFps || 60 });
        this.gpuScene = options.gpuScene || null;
        this.materialTable = options.materialTable || null;
        this.residency = options.residency || null;
        this.frameGraph = options.frameGraph || null;
        this.spatial = options.spatial || null;
        this.worldPartition = options.worldPartition || null;
        this.origins = options.origins || null;
        this.virtualGeometry = options.virtualGeometry || null;
        this.systems = new Map;
        this.systemorder = [];
        this.worlds = new Map;
        this.activeworld = null;
        this.running = false;
        this.initialized = false;
        this.suspended = false;
        this.accumulator = 0;
        this.simulationtime = 0;
        this.tick = 0;
        this.lasttime = 0;
        this.animationhandle = 0;
        this.listeners = new Map;
        this.stats = {
            frames: 0,
            ticks: 0,
            droppedTime: 0,
            maxSubstepFrames: 0,
            systemErrors: 0,
            suspends: 0,
            resumes: 0
        };
        if (this.scene || this.camera) this.addWorld("main", { scene: this.scene, camera: this.camera });
    }
    async init() {
        if (this.initialized) return this;
        if (!this.profile) this.profile = await CapabilityProfile.detect();
        var order = this.resolveSystems();
        for (var index = 0; index < order.length; index++) await this.callsystem(order[index], "init", this);
        this.initialized = true;
        this.emit("init", this);
        return this;
    }
    registerSystem(name, system, options) {
        options = options || {};
        if (!name || !system) throw new Error("Engine.registerSystem requires name and system");
        if (this.systems.has(name)) throw new Error("Engine duplicate system " + name);
        this.systems.set(name, {
            name: name,
            system: system,
            dependencies: (options.dependencies || []).slice(),
            priority: options.priority || 0,
            enabled: options.enabled !== false,
            critical: options.critical === true
        });
        this.systemorder.length = 0;
        return this;
    }
    unregisterSystem(name) {
        var entry = this.systems.get(name);
        if (entry && entry.system && typeof entry.system.dispose === "function") entry.system.dispose(this);
        this.systems.delete(name);
        this.systemorder.length = 0;
        return this;
    }
    resolveSystems() {
        if (this.systemorder.length === this.systems.size) return this.systemorder;
        var order = [];
        var visited = new Set;
        var visiting = new Set;
        var self = this;
        function visit(name) {
            if (visited.has(name)) return;
            if (visiting.has(name)) throw new Error("Engine system dependency cycle at " + name);
            var entry = self.systems.get(name);
            if (!entry) throw new Error("Engine missing system dependency " + name);
            visiting.add(name);
            for (var index = 0; index < entry.dependencies.length; index++) visit(entry.dependencies[index]);
            visiting.delete(name);
            visited.add(name);
            order.push(entry);
        }
        var entries = Array.from(this.systems.values());
        entries.sort(function(a, b) { return b.priority - a.priority || (a.name < b.name ? -1 : 1); });
        for (var index = 0; index < entries.length; index++) visit(entries[index].name);
        this.systemorder = order;
        return order;
    }
    addWorld(name, options) {
        if (this.worlds.has(name)) throw new Error("Engine duplicate world " + name);
        var world = options instanceof EngineWorld ? options : new EngineWorld(name, options);
        this.worlds.set(name, world);
        if (!this.activeworld) this.setActiveWorld(name);
        return world;
    }
    removeWorld(name) {
        var world = this.worlds.get(name);
        this.worlds.delete(name);
        if (this.activeworld === world) {
            this.activeworld = null;
            var next = this.worlds.values().next();
            if (!next.done) this.setActiveWorld(next.value.name);
        }
        return world || null;
    }
    setActiveWorld(name) {
        var world = this.worlds.get(name);
        if (!world) throw new Error("Engine unknown world " + name);
        this.activeworld = world;
        this.scene = world.scene;
        this.camera = world.camera;
        this.context.world = world;
        this.context.scene = world.scene;
        this.context.camera = world.camera;
        this.emit("worldchange", world);
        return this;
    }
    async start() {
        await this.init();
        if (this.running) return this;
        this.running = true;
        this.lasttime = 0;
        var order = this.resolveSystems();
        for (var index = 0; index < order.length; index++) await this.callsystem(order[index], "start", this);
        this.schedule();
        this.emit("start", this);
        return this;
    }
    stop() {
        if (!this.running) return this;
        this.running = false;
        if (typeof cancelAnimationFrame === "function" && this.animationhandle) cancelAnimationFrame(this.animationhandle);
        this.animationhandle = 0;
        var order = this.resolveSystems();
        for (var index = order.length - 1; index >= 0; index--) this.callsystem(order[index], "stop", this);
        this.emit("stop", this);
        return this;
    }
    schedule() {
        if (!this.running || this.suspended || typeof requestAnimationFrame !== "function") return;
        var self = this;
        this.animationhandle = requestAnimationFrame(function(time) {
            self.step(time * .001);
            self.schedule();
        });
    }
    step(time) {
        if (this.suspended) return this.context;
        var started = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        if (!this.lasttime) this.lasttime = time;
        var delta = Math.min(this.maxDelta, Math.max(0, time - this.lasttime)) * this.timeScale;
        this.lasttime = time;
        this.context.begin(time, delta);
        this.accumulator += delta;
        var substeps = 0;
        var order = this.resolveSystems();
        while (this.accumulator >= this.fixedDelta && substeps < this.maxSubsteps) {
            this.tick++;
            this.simulationtime += this.fixedDelta;
            this.context.fixed(this.tick, this.simulationtime);
            for (var fixedindex = 0; fixedindex < order.length; fixedindex++) this.callsystem(order[fixedindex], "fixedUpdate", this.context);
            if (this.activeworld) this.updateworld(this.activeworld, "fixedUpdate", this.context);
            this.accumulator -= this.fixedDelta;
            substeps++;
            this.stats.ticks++;
        }
        if (this.accumulator >= this.fixedDelta) {
            this.stats.droppedTime += this.accumulator;
            this.stats.maxSubstepFrames++;
            this.accumulator = this.accumulator % this.fixedDelta;
        }
        this.context.alpha = this.accumulator / this.fixedDelta;
        if (this.worldPartition && this.context.camera && this.context.camera.position && typeof this.worldPartition.update === "function") this.worldPartition.update(
            this.context.camera.position,
            this.context.metadata.cameraVelocity || { x: 0, y: 0, z: 0 },
            this.context.metadata.cameraDirection || { x: 0, y: 0, z: -1 },
            this.context.metadata.streamingIntents || []
        );
        for (var updateindex = 0; updateindex < order.length; updateindex++) this.callsystem(order[updateindex], "update", this.context);
        if (this.activeworld) this.updateworld(this.activeworld, "update", this.context);
        this.scheduler.run();
        var uploadbytes = 0;
        if (this.virtualGeometry && this.context.camera && typeof this.virtualGeometry.update === "function") {
            var qualitylevel = this.quality && this.quality.current ? this.quality.current() : {};
            this.context.metadata.virtualGeometry = this.virtualGeometry.update(this.context.camera, {
                viewportHeight: this.renderer && this.renderer.height || 1080,
                fov: this.context.camera.fov || 60,
                pixelError: qualitylevel.lodBias || 1,
                triangleBudget: qualitylevel.triangleBudget,
                drawCallBudget: qualitylevel.drawCallBudget
            });
            uploadbytes += this.context.metadata.virtualGeometry.stats.uploadBytes || 0;
        }
        if (this.gpuScene && typeof this.gpuScene.upload === "function") uploadbytes += this.gpuScene.upload();
        if (this.materialTable && typeof this.materialTable.upload === "function") uploadbytes += this.materialTable.upload();
        if (this.residency && typeof this.residency.update === "function") this.residency.update();
        this.context.metadata.uploadBytes = uploadbytes;
        for (var renderindex = 0; renderindex < order.length; renderindex++) this.callsystem(order[renderindex], "render", this.context);
        if (this.activeworld) this.updateworld(this.activeworld, "render", this.context);
        else if (this.renderer && this.scene && this.camera && typeof this.renderer.render === "function") this.renderer.render(this.scene, this.camera);
        var ended = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        this.context.cpuMs = ended - started;
        this.stats.frames++;
        if (this.quality) {
            if (this.quality.pipeline) this.quality.samplePipeline(Math.max(.01, this.context.cpuMs), this.context.gpuMs);
            else this.quality.sampleRenderer(Math.max(.01, this.context.cpuMs), this.context.gpuMs);
        }
        if (this.contract) {
            var renderinfo = this.renderer && this.renderer.info && this.renderer.info.render || {};
            this.contract.sample({
                frameMs: this.context.cpuMs,
                fps: this.quality && this.quality.stats ? this.quality.stats.fps : 1000 / Math.max(.01, this.context.cpuMs),
                drawCalls: renderinfo.calls || 0,
                visibleTriangles: renderinfo.triangles || 0,
                uploadBytes: uploadbytes,
                gpuMemoryMb: this.residency && this.residency.residentBytes !== undefined ? this.residency.residentBytes / 1048576 : undefined,
                resolutionScale: this.quality && this.quality.current ? this.quality.current().resolutionScale : 1,
                inputLatencyMs: this.context.inputLatencyMs
            });
        }
        this.emit("frame", this.context);
        return this.context;
    }
    updateworld(world, method, context) {
        if (!world.enabled || method === "render" && !world.visible) return;
        for (var index = 0; index < world.systems.length; index++) {
            var system = world.systems[index];
            if (system && typeof system[method] === "function") system[method](context, world, this);
        }
        if (method === "render" && this.renderer && world.scene && world.camera && typeof this.renderer.render === "function") {
            this.renderer.render(world.scene, world.camera);
            world.frame++;
        }
        if (method === "fixedUpdate") world.tick++;
    }
    callsystem(entry, method, argument) {
        if (!entry || !entry.enabled || !entry.system || typeof entry.system[method] !== "function") return undefined;
        try {
            return entry.system[method](argument, this);
        } catch (error) {
            this.stats.systemErrors++;
            this.emit("systemerror", { system: entry.name, method: method, error: error });
            if (entry.critical) throw error;
            return undefined;
        }
    }
    suspend(reason) {
        if (this.suspended) return this;
        this.suspended = true;
        this.context.suspended = true;
        this.stats.suspends++;
        var order = this.resolveSystems();
        for (var index = order.length - 1; index >= 0; index--) this.callsystem(order[index], "suspend", reason || "manual");
        this.emit("suspend", reason || "manual");
        return this;
    }
    resume(reason) {
        if (!this.suspended) return this;
        this.suspended = false;
        this.context.suspended = false;
        this.lasttime = 0;
        this.stats.resumes++;
        var order = this.resolveSystems();
        for (var index = 0; index < order.length; index++) this.callsystem(order[index], "resume", reason || "manual");
        this.emit("resume", reason || "manual");
        this.schedule();
        return this;
    }
    on(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set);
        this.listeners.get(type).add(listener);
        return this;
    }
    off(type, listener) {
        var listeners = this.listeners.get(type);
        if (listeners) listeners.delete(listener);
        return this;
    }
    emit(type, value) {
        var listeners = this.listeners.get(type);
        if (!listeners) return this;
        listeners.forEach(function(listener) { listener(value); });
        return this;
    }
    report() {
        return {
            initialized: this.initialized,
            running: this.running,
            suspended: this.suspended,
            profile: this.profile && typeof this.profile.toJSON === "function" ? this.profile.toJSON() : this.profile,
            context: this.context.snapshot(),
            quality: this.quality && typeof this.quality.report === "function" ? this.quality.report() : null,
            contract: this.contract && typeof this.contract.report === "function" ? this.contract.report() : null,
            gpuScene: this.gpuScene && typeof this.gpuScene.report === "function" ? this.gpuScene.report() : null,
            materials: this.materialTable && typeof this.materialTable.report === "function" ? this.materialTable.report() : null,
            residency: this.residency && typeof this.residency.report === "function" ? this.residency.report() : null,
            frameGraph: this.frameGraph && typeof this.frameGraph.report === "function" ? this.frameGraph.report() : null,
            spatial: this.spatial && typeof this.spatial.report === "function" ? this.spatial.report() : null,
            worldPartition: this.worldPartition && typeof this.worldPartition.report === "function" ? this.worldPartition.report() : null,
            origins: this.origins && typeof this.origins.report === "function" ? this.origins.report() : null,
            virtualGeometry: this.virtualGeometry && typeof this.virtualGeometry.report === "function" ? this.virtualGeometry.report() : null,
            features: this.features.toJSON(),
            systems: this.resolveSystems().map(function(entry) { return { name: entry.name, enabled: entry.enabled, priority: entry.priority, dependencies: entry.dependencies.slice() }; }),
            worlds: Array.from(this.worlds.keys()),
            stats: Object.assign({}, this.stats)
        };
    }
    async dispose() {
        this.stop();
        var order = this.resolveSystems();
        for (var index = order.length - 1; index >= 0; index--) await this.callsystem(order[index], "dispose", this);
        this.systems.clear();
        this.systemorder.length = 0;
        this.worlds.clear();
        this.listeners.clear();
        if (this.quality && typeof this.quality.dispose === "function") this.quality.dispose();
        return this;
    }
}

export { CapabilityProfile, Engine, EngineWorld, FeatureManifest, FrameContext };
