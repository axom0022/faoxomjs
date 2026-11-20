import { PerspectiveCamera } from "../camera/index.js";

import { WebGPURenderer } from "../renderers/WebGPURenderer.js";

import { WebGPUResourceManager } from "../renderers/WebGPUResourceManager.js";

import { ResourceLedger } from "../renderers/ResourceLedger.js";

import { FaoxLoader } from "./Faox.js";

import { PNGCodec } from "./PNGCodec.js";

class HeadlessRenderer {
    constructor(zahsa) {
        zahsa = zahsa || {};
        this.options = zahsa;
        this.width = Math.max(1, Math.floor(zahsa.width || 256));
        this.height = Math.max(1, Math.floor(zahsa.height || 256));
        this.format = zahsa.format || "rgba8unorm";
        this.clearColor = zahsa.clearColor || 0;
        this.adapter = zahsa.adapter || null;
        this.device = zahsa.device || null;
        this.ownsDevice = !zahsa.device;
        this.ledger = zahsa.ledger ? zahsa.ledger instanceof ResourceLedger ? zahsa.ledger : new ResourceLedger({
            label: "headless"
        }) : null;
        this.renderer = null;
        this.targetTexture = null;
        this.targetView = null;
        this.lastPixels = null;
        this.stats = {
            frames: 0,
            readbacks: 0,
            renders: 0
        };
        this.initialized = false;
        this._loader = null;
    }
    static async create(zahsa) {
        var zahsb = new HeadlessRenderer(zahsa);
        await zahsb.init();
        return zahsb;
    }
    async init() {
        if (this.initialized) return this;
        if (typeof navigator === "undefined" || !navigator.gpu) throw new Error("HeadlessRenderer requires WebGPU - use Node 22+ (Dawn) or a browser");
        if (!this.adapter) this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) throw new Error("HeadlessRenderer: adapter request failed");
        if (!this.device) this.device = await this.adapter.requestDevice();
        if (this.ledger) {
            this.device = this.ledger.attach(this.device);
            this.ownsDevice = true;
        }
        this.targetTexture = this.device.createTexture({
            size: [ this.width, this.height, 1 ],
            format: this.format,
            usage: typeof GPUTextureUsage !== "undefined" ? GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC : 34
        });
        this.targetView = this.targetTexture.createView();
        var zahsa = new WebGPURenderer({
            clearColor: this.clearColor,
            pixelRatio: 1
        });
        zahsa.adapter = this.adapter;
        zahsa.device = this.device;
        zahsa.format = this.format;
        zahsa.resourceManager = new WebGPUResourceManager(this.device);
        zahsa.initialized = true;
        zahsa.resize(this.width, this.height);
        zahsa._targetView = this.targetView;
        zahsa._targetDepthView = zahsa.depthView;
        this.renderer = zahsa;
        this.initialized = true;
        return this;
    }
    render(zahsa, zahsb) {
        if (!this.initialized) throw new Error("HeadlessRenderer: not initialized");
        if (!zahsb) zahsb = this.defaultCamera(zahsa);
        this.renderer.render(zahsa, zahsb);
        this.stats.renders++;
        this.stats.frames++;
        return this;
    }
    defaultCamera(zahsa, zahsb) {
        zahsb = zahsb || {};
        var zahsc = this.width / this.height;
        var zahsd = new PerspectiveCamera(zahsb.fov || 50, zahsc, zahsb.near !== undefined ? zahsb.near : .1, zahsb.far !== undefined ? zahsb.far : 1e3);
        var zahse = zahsb.position || [ 0, 0, 5 ];
        zahsd.position.set(zahse[0], zahse[1], zahse[2]);
        var zahsf = zahsb.target || [ 0, 0, 0 ];
        zahsd.lookAt(zahsf[0], zahsf[1], zahsf[2]);
        zahsd.updateMatrixWorld(true);
        return zahsd;
    }
    async renderAndRead(zahsa, zahsb) {
        this.render(zahsa, zahsb);
        return this.readPixels();
    }
    async readPixels() {
        if (!this.initialized) throw new Error("HeadlessRenderer: not initialized");
        var zahsa = Math.ceil(this.width * 4 / 256) * 256;
        var zahsb = this.device.createBuffer({
            size: zahsa * this.height,
            usage: 1 | 8
        });
        var zahsc = this.device.createCommandEncoder();
        zahsc.copyTextureToBuffer({
            texture: this.targetTexture
        }, {
            buffer: zahsb,
            bytesPerRow: zahsa,
            rowsPerImage: this.height
        }, [ this.width, this.height, 1 ]);
        this.device.queue.submit([ zahsc.finish() ]);
        await zahsb.mapAsync(1);
        var zahsd = new Uint8Array(zahsb.getMappedRange());
        var zahse = new Uint8Array(this.width * this.height * 4);
        for (var zahsf = 0; zahsf < this.height; zahsf++) {
            var zahsg = zahsf * zahsa;
            zahse.set(zahsd.subarray(zahsg, zahsg + this.width * 4), zahsf * this.width * 4);
        }
        zahsb.unmap();
        zahsb.destroy();
        this.lastPixels = zahse;
        this.stats.readbacks++;
        return zahse;
    }
    async renderToPNG(zahsa, zahsb) {
        var zahsc = await this.renderAndRead(zahsa, zahsb);
        return PNGCodec.encode(this.width, this.height, zahsc);
    }
    pixelHash(zahsa) {
        return PNGCodec.hashPixels(zahsa || this.lastPixels);
    }
    async renderAndHash(zahsa, zahsb) {
        var zahsc = await this.renderAndRead(zahsa, zahsb);
        return this.pixelHash(zahsc);
    }
    async loadScene(zahsa) {
        if (!this._loader) this._loader = new FaoxLoader;
        if (typeof zahsa === "string") return this._loader.load(zahsa);
        var zahsb = zahsa instanceof Uint8Array ? zahsa : new Uint8Array(zahsa.buffer || zahsa);
        return this._loader.parse(zahsb);
    }
    snapshot() {
        return {
            width: this.width,
            height: this.height,
            format: this.format,
            frames: this.stats.frames,
            readbacks: this.stats.readbacks,
            ledger: this.ledger ? this.ledger.snapshot() : null
        };
    }
    dispose() {
        var zahsa = function(zahsa) {
            try {
                if (zahsa && typeof zahsa.destroy === "function") zahsa.destroy();
            } catch (zahsa) {}
        };
        if (this.renderer) {
            this.renderer._targetView = null;
            this.renderer._targetDepthView = null;
            if (typeof this.renderer.invalidateGpuState === "function") this.renderer.invalidateGpuState();
            this.renderer = null;
        }
        zahsa(this.targetTexture);
        this.targetTexture = null;
        this.targetView = null;
        if (this.ledger) this.ledger.dispose();
        this.initialized = false;
        return this;
    }
}

export { HeadlessRenderer };
