// HeadlessRenderer - deterministic offscreen WebGPU rendering without a
// canvas (roadmap item 38). Renders a scene into an offscreen texture, reads
// the pixels back, and produces PNG bytes / deterministic pixel fingerprints
// for CI golden-image comparison. Works anywhere navigator.gpu exists
// (Node 22+ with Dawn, browsers, workers). The underlying WebGPURenderer is
// driven through its render-target override, so every engine feature
// (shadows, instancing, materials) runs identically to the on-screen path.

import { PerspectiveCamera } from "../camera/index.js";
import { WebGPURenderer } from "../renderers/WebGPURenderer.js";
import { WebGPUResourceManager } from "../renderers/WebGPUResourceManager.js";
import { ResourceLedger } from "../renderers/ResourceLedger.js";
import { FaoxLoader } from "./Faox.js";
import { PNGCodec } from "./PNGCodec.js";

class HeadlessRenderer {
    constructor(options) {
        options = options || {};
        this.options = options;
        this.width = Math.max(1, Math.floor(options.width || 256));
        this.height = Math.max(1, Math.floor(options.height || 256));
        this.format = options.format || "rgba8unorm";
        this.clearColor = options.clearColor || 0x000000;
        this.adapter = options.adapter || null;
        this.device = options.device || null;
        this.ownsDevice = !options.device;
        this.ledger = options.ledger ? (options.ledger instanceof ResourceLedger ? options.ledger : new ResourceLedger({ label: "headless" })) : null;
        this.renderer = null;
        this.targetTexture = null;
        this.targetView = null;
        this.lastPixels = null;
        this.stats = { frames: 0, readbacks: 0, renders: 0 };
        this.initialized = false;
        this._loader = null;
    }

    static async create(options) {
        var instance = new HeadlessRenderer(options);
        await instance.init();
        return instance;
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
            size: [this.width, this.height, 1],
            format: this.format,
            usage: typeof GPUTextureUsage !== "undefined" ? GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC : 0x22
        });
        this.targetView = this.targetTexture.createView();
        var renderer = new WebGPURenderer({ clearColor: this.clearColor, pixelRatio: 1 });
        renderer.adapter = this.adapter;
        renderer.device = this.device;
        renderer.format = this.format;
        renderer.resourceManager = new WebGPUResourceManager(this.device);
        renderer.initialized = true;
        renderer.resize(this.width, this.height);
        renderer._targetView = this.targetView;
        renderer._targetDepthView = renderer.depthView;
        this.renderer = renderer;
        this.initialized = true;
        return this;
    }

    render(scene, camera) {
        if (!this.initialized) throw new Error("HeadlessRenderer: not initialized");
        if (!camera) camera = this.defaultCamera(scene);
        this.renderer.render(scene, camera);
        this.stats.renders++;
        this.stats.frames++;
        return this;
    }

    // Synthesizes a camera looking at the origin (or a provided target).
    defaultCamera(scene, options) {
        options = options || {};
        var aspect = this.width / this.height;
        var camera = new PerspectiveCamera(options.fov || 50, aspect, options.near !== undefined ? options.near : 0.1, options.far !== undefined ? options.far : 1000);
        var position = options.position || [0, 0, 5];
        camera.position.set(position[0], position[1], position[2]);
        var target = options.target || [0, 0, 0];
        camera.lookAt(target[0], target[1], target[2]);
        camera.updateMatrixWorld(true);
        return camera;
    }

    // Renders once and returns the raw RGBA pixels of the offscreen target.
    async renderAndRead(scene, camera) {
        this.render(scene, camera);
        return this.readPixels();
    }

    async readPixels() {
        if (!this.initialized) throw new Error("HeadlessRenderer: not initialized");
        var bytesPerRow = Math.ceil(this.width * 4 / 256) * 256;
        var staging = this.device.createBuffer({ size: bytesPerRow * this.height, usage: 0x1 | 0x8 }); // MAP_READ | COPY_DST
        var encoder = this.device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: this.targetTexture }, { buffer: staging, bytesPerRow: bytesPerRow, rowsPerImage: this.height }, [this.width, this.height, 1]);
        this.device.queue.submit([encoder.finish()]);
        await staging.mapAsync(0x1); // READ
        var mapped = new Uint8Array(staging.getMappedRange());
        var out = new Uint8Array(this.width * this.height * 4);
        for (var row = 0; row < this.height; row++) {
            var source = row * bytesPerRow;
            out.set(mapped.subarray(source, source + this.width * 4), row * this.width * 4);
        }
        staging.unmap();
        staging.destroy();
        this.lastPixels = out;
        this.stats.readbacks++;
        return out;
    }

    async renderToPNG(scene, camera) {
        var pixels = await this.renderAndRead(scene, camera);
        return PNGCodec.encode(this.width, this.height, pixels);
    }

    pixelHash(rgba) {
        return PNGCodec.hashPixels(rgba || this.lastPixels);
    }

    async renderAndHash(scene, camera) {
        var pixels = await this.renderAndRead(scene, camera);
        return this.pixelHash(pixels);
    }

    // Loads a .faox scene container (ArrayBuffer/Uint8Array in, or a URL).
    async loadScene(source) {
        if (!this._loader) this._loader = new FaoxLoader();
        if (typeof source === "string") return this._loader.load(source);
        var bytes = source instanceof Uint8Array ? source : new Uint8Array(source.buffer || source);
        return this._loader.parse(bytes);
    }

    snapshot() {
        return { width: this.width, height: this.height, format: this.format, frames: this.stats.frames, readbacks: this.stats.readbacks, ledger: this.ledger ? this.ledger.snapshot() : null };
    }

    dispose() {
        var safeDestroy = function(resource) { try { if (resource && typeof resource.destroy === "function") resource.destroy(); } catch (error) { /* already gone */ } };
        if (this.renderer) {
            this.renderer._targetView = null;
            this.renderer._targetDepthView = null;
            if (typeof this.renderer.invalidateGpuState === "function") this.renderer.invalidateGpuState();
            this.renderer = null;
        }
        safeDestroy(this.targetTexture);
        this.targetTexture = null;
        this.targetView = null;
        if (this.ledger) this.ledger.dispose();
        this.initialized = false;
        return this;
    }
}

export { HeadlessRenderer };
