var zatsa = {
    r8unorm: 1,
    r8snorm: 1,
    r8uint: 1,
    r8sint: 1,
    rg8unorm: 2,
    rg8snorm: 2,
    rg8uint: 2,
    rg8sint: 2,
    rgba8unorm: 4,
    "rgba8unorm-srgb": 4,
    rgba8snorm: 4,
    rgba8uint: 4,
    rgba8sint: 4,
    bgra8unorm: 4,
    "bgra8unorm-srgb": 4,
    rgb9e5ufloat: 4,
    rgb10a2uint: 4,
    rgb10a2unorm: 4,
    rg11b10ufloat: 4,
    r16uint: 2,
    r16sint: 2,
    r16float: 2,
    rg16uint: 4,
    rg16sint: 4,
    rg16float: 4,
    rgba16uint: 8,
    rgba16sint: 8,
    rgba16float: 8,
    r32uint: 4,
    r32sint: 4,
    r32float: 4,
    rg32uint: 8,
    rg32sint: 8,
    rg32float: 8,
    rgba32uint: 16,
    rgba32sint: 16,
    rgba32float: 16,
    stencil8: 1,
    depth16unorm: 2,
    depth24plus: 4,
    "depth24plus-stencil8": 4,
    depth32float: 4,
    "depth32float-stencil8": 5
};

var zatsb = {
    "bc1-rgba-unorm": 8,
    "bc1-rgba-unorm-srgb": 8,
    "bc2-rgba-unorm": 16,
    "bc2-rgba-unorm-srgb": 16,
    "bc3-rgba-unorm": 16,
    "bc3-rgba-unorm-srgb": 16,
    "bc4-r-unorm": 8,
    "bc4-r-snorm": 8,
    "bc5-rg-unorm": 16,
    "bc5-rg-snorm": 16,
    "bc6h-rgb-ufloat": 16,
    "bc6h-rgb-float": 16,
    "bc7-rgba-unorm": 16,
    "bc7-rgba-unorm-srgb": 16,
    "etc2-rgb8unorm": 8,
    "etc2-rgb8unorm-srgb": 8,
    "etc2-rgba8unorm": 16,
    "etc2-rgba8unorm-srgb": 16,
    "eac-r11unorm": 8,
    "eac-r11snorm": 8,
    "eac-rg11unorm": 16,
    "eac-rg11snorm": 16,
    "astc-4x4-unorm": 16,
    "astc-4x4-unorm-srgb": 16
};

function zatsc(zatsa, zatsb) {
    if (typeof zatsa === "number") return zatsb === "width" ? zatsa : zatsb === "height" ? 1 : 1;
    if (!zatsa) return 1;
    var zatsc = zatsa[zatsb];
    return typeof zatsc === "number" ? zatsc : 1;
}

class ResourceLedger {
    constructor(zatsa) {
        zatsa = zatsa || {};
        this.label = zatsa.label || "ledger";
        this.enabled = zatsa.enabled !== false;
        this._resources = typeof Map !== "undefined" ? new Map : null;
        this._live = {
            buffer: 0,
            texture: 0,
            shaderModule: 0,
            renderPipeline: 0,
            computePipeline: 0,
            bindGroup: 0,
            sampler: 0
        };
        this._liveBytes = {
            buffer: 0,
            texture: 0,
            shaderModule: 0,
            renderPipeline: 0,
            computePipeline: 0,
            bindGroup: 0,
            sampler: 0
        };
        this._created = {
            buffer: 0,
            texture: 0,
            shaderModule: 0,
            renderPipeline: 0,
            computePipeline: 0,
            bindGroup: 0,
            sampler: 0
        };
        this._destroyed = {
            buffer: 0,
            texture: 0,
            shaderModule: 0,
            renderPipeline: 0,
            computePipeline: 0,
            bindGroup: 0,
            sampler: 0
        };
        this._deviceProxy = null;
        this._disposed = false;
        this.stats = {
            created: 0,
            destroyed: 0,
            leaked: 0,
            totalBytesCreated: 0
        };
    }
    static formatBytesPerPixel(zatsc) {
        if (typeof zatsc !== "string") return 4;
        var zatsd = zatsc.toLowerCase();
        if (zatsa[zatsd] !== undefined) return zatsa[zatsd];
        if (zatsb[zatsd] !== undefined) return zatsb[zatsd];
        if (zatsd.indexOf("astc-") === 0) return 16;
        return 4;
    }
    static isBlockCompressed(zatsa) {
        return typeof zatsa === "string" && zatsb[zatsa.toLowerCase()] !== undefined;
    }
    static textureByteSize(zatsa) {
        if (!zatsa || !zatsa.size) return 0;
        var zatsb = zatsc(zatsa.size, "width");
        var zatsd = zatsc(zatsa.size, "height");
        var zatse = zatsc(zatsa.size, "depthOrArrayLayers") || 1;
        var zatsf = zatsa.format || "rgba8unorm";
        var zatsg = zatsa.mipLevelCount || 1;
        var zatsh = ResourceLedger.isBlockCompressed(zatsf);
        var zatsi = zatsh ? ResourceLedger.formatBytesPerPixel(zatsf) : 0;
        var zatsj = zatsh ? 0 : ResourceLedger.formatBytesPerPixel(zatsf);
        var zatsk = zatsa.sampleCount && zatsa.sampleCount > 1 ? zatsa.sampleCount : 1;
        var zatsl = 0;
        for (var zatsm = 0; zatsm < zatsg; zatsm++) {
            var zatsn = Math.max(1, Math.floor(zatsb / Math.pow(2, zatsm)));
            var zatso = Math.max(1, Math.floor(zatsd / Math.pow(2, zatsm)));
            var zatsp = zatsh ? Math.ceil(zatsn / 4) * Math.ceil(zatso / 4) * zatsi : zatsn * zatso * zatsj;
            zatsl += zatsp;
        }
        zatsl *= zatse * zatsk;
        return zatsl;
    }
    track(zatsa, zatsb, zatsc) {
        if (!this.enabled || this._disposed || !zatsb || !this._resources) return zatsb;
        zatsc = zatsc || {};
        var zatsd = zatsc.bytes || 0;
        this._resources.set(zatsb, {
            type: zatsa,
            bytes: zatsd,
            label: zatsc.label || "",
            at: this.stats.created
        });
        if (this._live[zatsa] === undefined) {
            this._live[zatsa] = 0;
            this._liveBytes[zatsa] = 0;
            this._created[zatsa] = 0;
            this._destroyed[zatsa] = 0;
        }
        this._live[zatsa]++;
        this._liveBytes[zatsa] += zatsd;
        this._created[zatsa]++;
        this.stats.created++;
        this.stats.totalBytesCreated += zatsd;
        this._watchDestroy(zatsb);
        return zatsb;
    }
    _watchDestroy(zatsa) {
        var zatsb = this;
        try {
            if (typeof zatsa.destroy !== "function" || zatsa.__ledgerWatched) return;
            var zatsc = zatsa.destroy;
            Object.defineProperty(zatsa, "destroy", {
                value: function() {
                    zatsb.forget(zatsa);
                    return zatsc.call(zatsa);
                },
                configurable: true,
                writable: true
            });
            try {
                Object.defineProperty(zatsa, "__ledgerWatched", {
                    value: true,
                    configurable: true
                });
            } catch (zatsa) {}
        } catch (zatsa) {}
    }
    forget(zatsa) {
        if (!this._resources) return false;
        var zatsb = this._resources.get(zatsa);
        if (!zatsb) return false;
        this._resources.delete(zatsa);
        this._live[zatsb.type]--;
        this._liveBytes[zatsb.type] -= zatsb.bytes;
        this._destroyed[zatsb.type]++;
        this.stats.destroyed++;
        return true;
    }
    attach(zatsa) {
        if (!zatsa) throw new Error("ResourceLedger.attach requires a device");
        if (this._deviceProxy) return this._deviceProxy;
        var zatsb = this;
        var zatsc = {
            createBuffer: function(zatsc) {
                var zatsd = zatsa.createBuffer(zatsc);
                return zatsb.track("buffer", zatsd, {
                    bytes: zatsc && zatsc.size || 0,
                    label: zatsc && zatsc.label
                });
            },
            createTexture: function(zatsc) {
                var zatsd = zatsa.createTexture(zatsc);
                return zatsb.track("texture", zatsd, {
                    bytes: ResourceLedger.textureByteSize(zatsc),
                    label: zatsc && zatsc.label
                });
            },
            createShaderModule: function(zatsc) {
                var zatsd = zatsa.createShaderModule(zatsc);
                return zatsb.track("shaderModule", zatsd, {
                    bytes: zatsc && zatsc.code ? zatsc.code.length : 0,
                    label: zatsc && zatsc.label
                });
            },
            createRenderPipeline: function(zatsc) {
                var zatsd = zatsa.createRenderPipeline(zatsc);
                return zatsb.track("renderPipeline", zatsd, {
                    bytes: 0,
                    label: zatsc && zatsc.label
                });
            },
            createComputePipeline: function(zatsc) {
                var zatsd = zatsa.createComputePipeline(zatsc);
                return zatsb.track("computePipeline", zatsd, {
                    bytes: 0,
                    label: zatsc && zatsc.label
                });
            },
            createBindGroup: function(zatsc) {
                var zatsd = zatsa.createBindGroup(zatsc);
                return zatsb.track("bindGroup", zatsd, {
                    bytes: 0,
                    label: zatsc && zatsc.label
                });
            },
            createSampler: function(zatsc) {
                var zatsd = zatsa.createSampler(zatsc);
                return zatsb.track("sampler", zatsd, {
                    bytes: 0,
                    label: zatsc && zatsc.label
                });
            }
        };
        this._deviceProxy = new Proxy(zatsa, {
            get: function(zatsa, zatsb) {
                if (Object.prototype.hasOwnProperty.call(zatsc, zatsb)) return zatsc[zatsb];
                var zatsd = zatsa[zatsb];
                return typeof zatsd === "function" ? zatsd.bind(zatsa) : zatsd;
            }
        });
        return this._deviceProxy;
    }
    attachRenderer(zatsa) {
        if (!zatsa || !zatsa.device) throw new Error("ResourceLedger.attachRenderer requires an initialized renderer");
        var zatsb = this.attach(zatsa.device);
        zatsa.device = zatsb;
        if (zatsa.resourceManager && zatsa.resourceManager.device) zatsa.resourceManager.device = zatsb;
        zatsa.ledger = this;
        return this;
    }
    snapshot() {
        var zatsa = {}, zatsb = {}, zatsc = 0;
        for (var zatsd in this._live) {
            zatsa[zatsd] = this._live[zatsd];
            zatsb[zatsd] = this._liveBytes[zatsd];
            zatsc += this._liveBytes[zatsd];
        }
        return {
            live: zatsa,
            bytes: zatsb,
            totalBytes: zatsc,
            created: this._created,
            destroyed: this._destroyed,
            tracked: this._resources ? this._resources.size : 0,
            stats: {
                created: this.stats.created,
                destroyed: this.stats.destroyed,
                totalBytesCreated: this.stats.totalBytesCreated
            }
        };
    }
    leakReport() {
        var zatsa = [];
        if (this._resources) {
            this._resources.forEach(function(zatsb, zatsc) {
                zatsa.push({
                    type: zatsb.type,
                    bytes: zatsb.bytes,
                    label: zatsb.label
                });
            });
        }
        var zatsb = 0;
        for (var zatsc = 0; zatsc < zatsa.length; zatsc++) zatsb += zatsa[zatsc].bytes;
        return {
            count: zatsa.length,
            bytes: zatsb,
            leaks: zatsa
        };
    }
    dispose() {
        var zatsa = this.leakReport();
        this.stats.leaked = zatsa.count;
        if (this._resources) this._resources.clear();
        this._deviceProxy = null;
        this._disposed = true;
        return zatsa;
    }
}

export { ResourceLedger };
