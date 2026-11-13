// ResourceLedger - GPU resource accounting and leak detection (roadmap item 36).
// Tracks every resource created through an instrumented GPUDevice handle:
// buffers, textures, shader modules, pipelines, bind groups and samplers, with
// byte estimates, live/disposed counters, destroy interception and a leak
// report at dispose time.

var FORMAT_BYTES = {
    "r8unorm": 1, "r8snorm": 1, "r8uint": 1, "r8sint": 1,
    "rg8unorm": 2, "rg8snorm": 2, "rg8uint": 2, "rg8sint": 2,
    "rgba8unorm": 4, "rgba8unorm-srgb": 4, "rgba8snorm": 4, "rgba8uint": 4, "rgba8sint": 4,
    "bgra8unorm": 4, "bgra8unorm-srgb": 4,
    "rgb9e5ufloat": 4, "rgb10a2uint": 4, "rgb10a2unorm": 4,
    "rg11b10ufloat": 4,
    "r16uint": 2, "r16sint": 2, "r16float": 2,
    "rg16uint": 4, "rg16sint": 4, "rg16float": 4,
    "rgba16uint": 8, "rgba16sint": 8, "rgba16float": 8,
    "r32uint": 4, "r32sint": 4, "r32float": 4,
    "rg32uint": 8, "rg32sint": 8, "rg32float": 8,
    "rgba32uint": 16, "rgba32sint": 16, "rgba32float": 16,
    "stencil8": 1,
    "depth16unorm": 2,
    "depth24plus": 4, "depth24plus-stencil8": 4, "depth32float": 4, "depth32float-stencil8": 5
};

var BLOCK_FORMATS = {
    "bc1-rgba-unorm": 8, "bc1-rgba-unorm-srgb": 8,
    "bc2-rgba-unorm": 16, "bc2-rgba-unorm-srgb": 16,
    "bc3-rgba-unorm": 16, "bc3-rgba-unorm-srgb": 16,
    "bc4-r-unorm": 8, "bc4-r-snorm": 8,
    "bc5-rg-unorm": 16, "bc5-rg-snorm": 16,
    "bc6h-rgb-ufloat": 16, "bc6h-rgb-float": 16,
    "bc7-rgba-unorm": 16, "bc7-rgba-unorm-srgb": 16,
    "etc2-rgb8unorm": 8, "etc2-rgb8unorm-srgb": 8,
    "etc2-rgba8unorm": 16, "etc2-rgba8unorm-srgb": 16,
    "eac-r11unorm": 8, "eac-r11snorm": 8,
    "eac-rg11unorm": 16, "eac-rg11snorm": 16,
    "astc-4x4-unorm": 16, "astc-4x4-unorm-srgb": 16
};

function dimensionValue(size, key) {
    if (typeof size === "number") return key === "width" ? size : key === "height" ? 1 : 1;
    if (!size) return 1;
    var value = size[key];
    return typeof value === "number" ? value : 1;
}

class ResourceLedger {
    constructor(options) {
        options = options || {};
        this.label = options.label || "ledger";
        this.enabled = options.enabled !== false;
        this._resources = typeof Map !== "undefined" ? new Map() : null;
        this._live = { buffer: 0, texture: 0, shaderModule: 0, renderPipeline: 0, computePipeline: 0, bindGroup: 0, sampler: 0 };
        this._liveBytes = { buffer: 0, texture: 0, shaderModule: 0, renderPipeline: 0, computePipeline: 0, bindGroup: 0, sampler: 0 };
        this._created = { buffer: 0, texture: 0, shaderModule: 0, renderPipeline: 0, computePipeline: 0, bindGroup: 0, sampler: 0 };
        this._destroyed = { buffer: 0, texture: 0, shaderModule: 0, renderPipeline: 0, computePipeline: 0, bindGroup: 0, sampler: 0 };
        this._deviceProxy = null;
        this._disposed = false;
        this.stats = { created: 0, destroyed: 0, leaked: 0, totalBytesCreated: 0 };
    }

    static formatBytesPerPixel(format) {
        if (typeof format !== "string") return 4;
        var key = format.toLowerCase();
        if (FORMAT_BYTES[key] !== undefined) return FORMAT_BYTES[key];
        if (BLOCK_FORMATS[key] !== undefined) return BLOCK_FORMATS[key];
        if (key.indexOf("astc-") === 0) return 16; // block formats: conservative
        return 4;
    }

    static isBlockCompressed(format) {
        return typeof format === "string" && BLOCK_FORMATS[format.toLowerCase()] !== undefined;
    }

    static textureByteSize(descriptor) {
        if (!descriptor || !descriptor.size) return 0;
        var width = dimensionValue(descriptor.size, "width");
        var height = dimensionValue(descriptor.size, "height");
        var depth = dimensionValue(descriptor.size, "depthOrArrayLayers") || 1;
        var format = descriptor.format || "rgba8unorm";
        var mips = descriptor.mipLevelCount || 1;
        var block = ResourceLedger.isBlockCompressed(format);
        var blockBytes = block ? ResourceLedger.formatBytesPerPixel(format) : 0;
        var bytesPerPixel = block ? 0 : ResourceLedger.formatBytesPerPixel(format);
        var sampleCount = descriptor.sampleCount && descriptor.sampleCount > 1 ? descriptor.sampleCount : 1;
        var total = 0;
        for (var level = 0; level < mips; level++) {
            var w = Math.max(1, Math.floor(width / Math.pow(2, level)));
            var h = Math.max(1, Math.floor(height / Math.pow(2, level)));
            var levelBytes = block
                ? Math.ceil(w / 4) * Math.ceil(h / 4) * blockBytes
                : w * h * bytesPerPixel;
            total += levelBytes;
        }
        total *= depth * sampleCount;
        return total;
    }

    track(type, resource, meta) {
        if (!this.enabled || this._disposed || !resource || !this._resources) return resource;
        meta = meta || {};
        var bytes = meta.bytes || 0;
        this._resources.set(resource, { type: type, bytes: bytes, label: meta.label || "", at: this.stats.created });
        if (this._live[type] === undefined) { this._live[type] = 0; this._liveBytes[type] = 0; this._created[type] = 0; this._destroyed[type] = 0; }
        this._live[type]++;
        this._liveBytes[type] += bytes;
        this._created[type]++;
        this.stats.created++;
        this.stats.totalBytesCreated += bytes;
        this._watchDestroy(resource);
        return resource;
    }

    _watchDestroy(resource) {
        var self = this;
        try {
            if (typeof resource.destroy !== "function" || resource.__ledgerWatched) return;
            var original = resource.destroy;
            Object.defineProperty(resource, "destroy", {
                value: function() { self.forget(resource); return original.call(resource); },
                configurable: true,
                writable: true
            });
            try { Object.defineProperty(resource, "__ledgerWatched", { value: true, configurable: true }); } catch (watchedError) { /* non-fatal */ }
        } catch (error) { /* platform objects may be sealed; explicit forget() still works */ }
    }

    forget(resource) {
        if (!this._resources) return false;
        var meta = this._resources.get(resource);
        if (!meta) return false;
        this._resources.delete(resource);
        this._live[meta.type]--;
        this._liveBytes[meta.type] -= meta.bytes;
        this._destroyed[meta.type]++;
        this.stats.destroyed++;
        return true;
    }

    // Returns a Proxy wrapping `device` that tracks every create* call while
    // transparently forwarding everything else (queue, features, limits, lost,
    // event listeners) to the real device.
    attach(device) {
        if (!device) throw new Error("ResourceLedger.attach requires a device");
        if (this._deviceProxy) return this._deviceProxy;
        var self = this;
        var tracked = {
            createBuffer: function(descriptor) {
                var buffer = device.createBuffer(descriptor);
                return self.track("buffer", buffer, { bytes: (descriptor && descriptor.size) || 0, label: descriptor && descriptor.label });
            },
            createTexture: function(descriptor) {
                var texture = device.createTexture(descriptor);
                return self.track("texture", texture, { bytes: ResourceLedger.textureByteSize(descriptor), label: descriptor && descriptor.label });
            },
            createShaderModule: function(descriptor) {
                var module = device.createShaderModule(descriptor);
                return self.track("shaderModule", module, { bytes: descriptor && descriptor.code ? descriptor.code.length : 0, label: descriptor && descriptor.label });
            },
            createRenderPipeline: function(descriptor) {
                var pipeline = device.createRenderPipeline(descriptor);
                return self.track("renderPipeline", pipeline, { bytes: 0, label: descriptor && descriptor.label });
            },
            createComputePipeline: function(descriptor) {
                var pipeline = device.createComputePipeline(descriptor);
                return self.track("computePipeline", pipeline, { bytes: 0, label: descriptor && descriptor.label });
            },
            createBindGroup: function(descriptor) {
                var bindGroup = device.createBindGroup(descriptor);
                return self.track("bindGroup", bindGroup, { bytes: 0, label: descriptor && descriptor.label });
            },
            createSampler: function(descriptor) {
                var sampler = device.createSampler(descriptor);
                return self.track("sampler", sampler, { bytes: 0, label: descriptor && descriptor.label });
            }
        };
        this._deviceProxy = new Proxy(device, {
            get: function(target, property) {
                if (Object.prototype.hasOwnProperty.call(tracked, property)) return tracked[property];
                var value = target[property];
                return typeof value === "function" ? value.bind(target) : value;
            }
        });
        return this._deviceProxy;
    }

    // Convenience: instrument a renderer's device handle (and its resource
    // manager, which keeps its own device reference).
    attachRenderer(renderer) {
        if (!renderer || !renderer.device) throw new Error("ResourceLedger.attachRenderer requires an initialized renderer");
        var proxy = this.attach(renderer.device);
        renderer.device = proxy;
        if (renderer.resourceManager && renderer.resourceManager.device) renderer.resourceManager.device = proxy;
        renderer.ledger = this;
        return this;
    }

    snapshot() {
        var live = {}, bytes = {}, total = 0;
        for (var type in this._live) {
            live[type] = this._live[type];
            bytes[type] = this._liveBytes[type];
            total += this._liveBytes[type];
        }
        return { live: live, bytes: bytes, totalBytes: total, created: this._created, destroyed: this._destroyed, tracked: this._resources ? this._resources.size : 0, stats: { created: this.stats.created, destroyed: this.stats.destroyed, totalBytesCreated: this.stats.totalBytesCreated } };
    }

    leakReport() {
        var leaks = [];
        if (this._resources) {
            this._resources.forEach(function(meta, resource) {
                leaks.push({ type: meta.type, bytes: meta.bytes, label: meta.label });
            });
        }
        var bytes = 0;
        for (var i = 0; i < leaks.length; i++) bytes += leaks[i].bytes;
        return { count: leaks.length, bytes: bytes, leaks: leaks };
    }

    dispose() {
        var report = this.leakReport();
        this.stats.leaked = report.count;
        if (this._resources) this._resources.clear();
        this._deviceProxy = null;
        this._disposed = true;
        return report;
    }
}

export { ResourceLedger };
