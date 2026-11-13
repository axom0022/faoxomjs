// faoxom-worker.js - the worker side of the worker-first offscreen
// architecture (roadmap item 43). Receives a transferred OffscreenCanvas,
// initializes a real WebGPURenderer on it, loads .faox scenes, and renders
// deterministically to an internal offscreen target (never presenting, so it
// is safe in headless/CI environments too), reporting pixel hashes, PNG
// bytes and draw stats back to the main thread.
//
// Registration is guarded so bundling this module into a page build is a
// no-op - the message handler only installs inside a worker global scope.

import { Scene } from "../scenes/index.js";
import { PerspectiveCamera } from "../camera/index.js";
import { WebGPURenderer } from "../renderers/WebGPURenderer.js";
import { FaoxLoader } from "./Faox.js";
import { PNGCodec } from "./PNGCodec.js";

var workerScope = (typeof WorkerGlobalScope !== "undefined" && typeof self !== "undefined" && self instanceof WorkerGlobalScope) ? self : null;

function createWorkerEngine(scope) {
    var state = {
        renderer: null,
        scene: null,
        camera: null,
        width: 256,
        height: 256,
        colorTexture: null,
        colorView: null,
        depthTexture: null,
        loader: null,
        frames: 0
    };

    function ensureTarget() {
        var device = state.renderer.device;
        if (state.colorTexture) {
            try { state.colorTexture.destroy(); } catch (destroyError) { /* gone */ }
            try { state.depthTexture.destroy(); } catch (depthDestroyError) { /* gone */ }
        }
        state.colorTexture = device.createTexture({
            size: [state.width, state.height, 1],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        state.colorView = state.colorTexture.createView();
        state.depthTexture = device.createTexture({
            size: [state.width, state.height, 1],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    function readPixels() {
        var device = state.renderer.device;
        var bytesPerRow = Math.ceil(state.width * 4 / 256) * 256;
        var staging = device.createBuffer({ size: bytesPerRow * state.height, usage: 0x1 | 0x8 });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: state.colorTexture }, { buffer: staging, bytesPerRow: bytesPerRow, rowsPerImage: state.height }, [state.width, state.height, 1]);
        device.queue.submit([encoder.finish()]);
        return staging.mapAsync(0x1).then(function () {
            var mapped = new Uint8Array(staging.getMappedRange());
            var out = new Uint8Array(state.width * state.height * 4);
            for (var row = 0; row < state.height; row++) {
                var source = row * bytesPerRow;
                out.set(mapped.subarray(source, source + state.width * 4), row * state.width * 4);
            }
            staging.unmap();
            staging.destroy();
            return out;
        });
    }

    function countObjects(object) {
        var count = 0;
        object.traverse(function () { count++; });
        return count;
    }

    function applyCamera(settings) {
        if (!state.camera) return;
        if (settings.fov) state.camera.fov = settings.fov;
        if (settings.aspect) state.camera.aspect = settings.aspect;
        if (settings.position) state.camera.position.set(settings.position[0], settings.position[1], settings.position[2]);
        var target = settings.target || [0, 0, 0];
        state.camera.lookAt(target[0], target[1], target[2]);
        state.camera.updateProjectionMatrix();
        state.camera.updateMatrixWorld(true);
    }

    function renderOnce() {
        if (!state.renderer || !state.scene || !state.camera) throw new Error("worker engine not ready (init + load required)");
        state.renderer.renderToView(state.scene, state.camera, state.colorView, state.depthTexture.createView(), "rgba8unorm");
        state.frames++;
        return {
            draws: state.renderer.info.render.calls,
            triangles: state.renderer.info.render.triangles,
            frames: state.frames
        };
    }

    async function handleMessage(event) {
        var message = event.data;
        if (!message || !message.type) return;
        try {
            if (message.type === "init") {
                state.width = message.width || 256;
                state.height = message.height || 256;
                var renderer = new WebGPURenderer({ canvas: message.canvas, pixelRatio: 1, clearColor: message.background || 0x000000 });
                await renderer.init();
                state.renderer = renderer;
                state.camera = new PerspectiveCamera(message.fov || 60, state.width / state.height, 0.1, 1000);
                state.camera.position.set(0, 0, 5);
                state.camera.lookAt(0, 0, 0);
                state.camera.updateMatrixWorld(true);
                renderer.resize(state.width, state.height);
                ensureTarget();
                scope.postMessage({ type: "ready", width: state.width, height: state.height, format: renderer.format });
            } else if (message.type === "load") {
                if (!state.renderer) throw new Error("init required before load");
                if (!state.loader) state.loader = new FaoxLoader();
                var bytes = message.bytes instanceof Uint8Array ? message.bytes : new Uint8Array(message.bytes || new ArrayBuffer(0));
                var loaded = state.loader.parse(bytes);
                state.scene = loaded.scene;
                var wrapped = new Scene();
                var kids = loaded.scene.children.slice();
                for (var k = 0; k < kids.length; k++) wrapped.add(kids[k]);
                state.scene = wrapped;
                scope.postMessage({ type: "loaded", objects: countObjects(loaded.scene), faoxHash: loaded.hash, byteLength: bytes.length });
            } else if (message.type === "camera") {
                applyCamera(message);
                scope.postMessage({ type: "camera-updated", position: message.position || null });
            } else if (message.type === "render") {
                var stats = renderOnce();
                var pixels = await readPixels();
                scope.postMessage({ type: "rendered", hash: PNGCodec.hashPixels(pixels), draws: stats.draws, triangles: stats.triangles, frames: stats.frames });
            } else if (message.type === "png") {
                var pngStats = renderOnce();
                var pngPixels = await readPixels();
                var png = PNGCodec.encode(state.width, state.height, pngPixels);
                scope.postMessage({ type: "png", hash: PNGCodec.hashPixels(pngPixels), byteLength: png.length, draws: pngStats.draws, png: png }, [png.buffer]);
            } else if (message.type === "resize") {
                state.width = message.width || state.width;
                state.height = message.height || state.height;
                if (state.renderer) {
                    state.renderer.resize(state.width, state.height);
                    if (state.camera) {
                        state.camera.aspect = state.width / state.height;
                        state.camera.updateProjectionMatrix();
                    }
                    ensureTarget();
                }
                scope.postMessage({ type: "resized", width: state.width, height: state.height });
            } else if (message.type === "ping") {
                scope.postMessage({ type: "pong", frames: state.frames });
            } else if (message.type === "dispose") {
                if (state.renderer) {
                    try { state.renderer.dispose(); } catch (disposeError) { /* gone */ }
                }
                state.renderer = null;
                state.scene = null;
                state.colorTexture = null;
                state.colorView = null;
                state.depthTexture = null;
                scope.postMessage({ type: "disposed" });
            } else {
                scope.postMessage({ type: "error", message: "unknown command: " + message.type });
            }
        } catch (error) {
            scope.postMessage({ type: "error", message: String(error && error.message || error), command: message.type });
        }
    }

    return { handleMessage: handleMessage };
}

if (workerScope) {
    var engine = createWorkerEngine(workerScope);
    workerScope.onmessage = engine.handleMessage;
}

export { createWorkerEngine };
