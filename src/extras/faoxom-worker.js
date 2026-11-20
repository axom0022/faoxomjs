import { Scene } from "../scenes/index.js";

import { PerspectiveCamera } from "../camera/index.js";

import { WebGPURenderer } from "../renderers/WebGPURenderer.js";

import { FaoxLoader } from "./Faox.js";

import { PNGCodec } from "./PNGCodec.js";

var zajta = typeof WorkerGlobalScope !== "undefined" && typeof self !== "undefined" && self instanceof WorkerGlobalScope ? self : null;

function createWorkerEngine(zajta) {
    var zajtb = {
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
    function zajtc() {
        var zajta = zajtb.renderer.device;
        if (zajtb.colorTexture) {
            try {
                zajtb.colorTexture.destroy();
            } catch (zajta) {}
            try {
                zajtb.depthTexture.destroy();
            } catch (zajta) {}
        }
        zajtb.colorTexture = zajta.createTexture({
            size: [ zajtb.width, zajtb.height, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        zajtb.colorView = zajtb.colorTexture.createView();
        zajtb.depthTexture = zajta.createTexture({
            size: [ zajtb.width, zajtb.height, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }
    function zajtd() {
        var zajta = zajtb.renderer.device;
        var zajtc = Math.ceil(zajtb.width * 4 / 256) * 256;
        var zajtd = zajta.createBuffer({
            size: zajtc * zajtb.height,
            usage: 1 | 8
        });
        var zajte = zajta.createCommandEncoder();
        zajte.copyTextureToBuffer({
            texture: zajtb.colorTexture
        }, {
            buffer: zajtd,
            bytesPerRow: zajtc,
            rowsPerImage: zajtb.height
        }, [ zajtb.width, zajtb.height, 1 ]);
        zajta.queue.submit([ zajte.finish() ]);
        return zajtd.mapAsync(1).then(function() {
            var zajta = new Uint8Array(zajtd.getMappedRange());
            var zajte = new Uint8Array(zajtb.width * zajtb.height * 4);
            for (var zajtf = 0; zajtf < zajtb.height; zajtf++) {
                var zajtg = zajtf * zajtc;
                zajte.set(zajta.subarray(zajtg, zajtg + zajtb.width * 4), zajtf * zajtb.width * 4);
            }
            zajtd.unmap();
            zajtd.destroy();
            return zajte;
        });
    }
    function zajte(zajta) {
        var zajtb = 0;
        zajta.traverse(function() {
            zajtb++;
        });
        return zajtb;
    }
    function zajtf(zajta) {
        if (!zajtb.camera) return;
        if (zajta.fov) zajtb.camera.fov = zajta.fov;
        if (zajta.aspect) zajtb.camera.aspect = zajta.aspect;
        if (zajta.position) zajtb.camera.position.set(zajta.position[0], zajta.position[1], zajta.position[2]);
        var zajtc = zajta.target || [ 0, 0, 0 ];
        zajtb.camera.lookAt(zajtc[0], zajtc[1], zajtc[2]);
        zajtb.camera.updateProjectionMatrix();
        zajtb.camera.updateMatrixWorld(true);
    }
    function zajtg() {
        if (!zajtb.renderer || !zajtb.scene || !zajtb.camera) throw new Error("worker engine not ready (init + load required)");
        zajtb.renderer.renderToView(zajtb.scene, zajtb.camera, zajtb.colorView, zajtb.depthTexture.createView(), "rgba8unorm");
        zajtb.frames++;
        return {
            draws: zajtb.renderer.info.render.calls,
            triangles: zajtb.renderer.info.render.triangles,
            frames: zajtb.frames
        };
    }
    async function zajth(zajth) {
        var zajti = zajth.data;
        if (!zajti || !zajti.type) return;
        try {
            if (zajti.type === "init") {
                zajtb.width = zajti.width || 256;
                zajtb.height = zajti.height || 256;
                var zajtj = new WebGPURenderer({
                    canvas: zajti.canvas,
                    pixelRatio: 1,
                    clearColor: zajti.background || 0
                });
                await zajtj.init();
                zajtb.renderer = zajtj;
                zajtb.camera = new PerspectiveCamera(zajti.fov || 60, zajtb.width / zajtb.height, .1, 1e3);
                zajtb.camera.position.set(0, 0, 5);
                zajtb.camera.lookAt(0, 0, 0);
                zajtb.camera.updateMatrixWorld(true);
                zajtj.resize(zajtb.width, zajtb.height);
                zajtc();
                zajta.postMessage({
                    type: "ready",
                    width: zajtb.width,
                    height: zajtb.height,
                    format: zajtj.format
                });
            } else if (zajti.type === "load") {
                if (!zajtb.renderer) throw new Error("init required before load");
                if (!zajtb.loader) zajtb.loader = new FaoxLoader;
                var zajtk = zajti.bytes instanceof Uint8Array ? zajti.bytes : new Uint8Array(zajti.bytes || new ArrayBuffer(0));
                var zajtl = zajtb.loader.parse(zajtk);
                zajtb.scene = zajtl.scene;
                var zajtm = new Scene;
                var zajtn = zajtl.scene.children.slice();
                for (var zajto = 0; zajto < zajtn.length; zajto++) zajtm.add(zajtn[zajto]);
                zajtb.scene = zajtm;
                zajta.postMessage({
                    type: "loaded",
                    objects: zajte(zajtl.scene),
                    faoxHash: zajtl.hash,
                    byteLength: zajtk.length
                });
            } else if (zajti.type === "camera") {
                zajtf(zajti);
                zajta.postMessage({
                    type: "camera-updated",
                    position: zajti.position || null
                });
            } else if (zajti.type === "render") {
                var zajtp = zajtg();
                var zajtq = await zajtd();
                zajta.postMessage({
                    type: "rendered",
                    hash: PNGCodec.hashPixels(zajtq),
                    draws: zajtp.draws,
                    triangles: zajtp.triangles,
                    frames: zajtp.frames
                });
            } else if (zajti.type === "png") {
                var zajtr = zajtg();
                var zajts = await zajtd();
                var zajtt = PNGCodec.encode(zajtb.width, zajtb.height, zajts);
                zajta.postMessage({
                    type: "png",
                    hash: PNGCodec.hashPixels(zajts),
                    byteLength: zajtt.length,
                    draws: zajtr.draws,
                    png: zajtt
                }, [ zajtt.buffer ]);
            } else if (zajti.type === "resize") {
                zajtb.width = zajti.width || zajtb.width;
                zajtb.height = zajti.height || zajtb.height;
                if (zajtb.renderer) {
                    zajtb.renderer.resize(zajtb.width, zajtb.height);
                    if (zajtb.camera) {
                        zajtb.camera.aspect = zajtb.width / zajtb.height;
                        zajtb.camera.updateProjectionMatrix();
                    }
                    zajtc();
                }
                zajta.postMessage({
                    type: "resized",
                    width: zajtb.width,
                    height: zajtb.height
                });
            } else if (zajti.type === "ping") {
                zajta.postMessage({
                    type: "pong",
                    frames: zajtb.frames
                });
            } else if (zajti.type === "dispose") {
                if (zajtb.renderer) {
                    try {
                        zajtb.renderer.dispose();
                    } catch (zajta) {}
                }
                zajtb.renderer = null;
                zajtb.scene = null;
                zajtb.colorTexture = null;
                zajtb.colorView = null;
                zajtb.depthTexture = null;
                zajta.postMessage({
                    type: "disposed"
                });
            } else {
                zajta.postMessage({
                    type: "error",
                    message: "unknown command: " + zajti.type
                });
            }
        } catch (zajtb) {
            zajta.postMessage({
                type: "error",
                message: String(zajtb && zajtb.message || zajtb),
                command: zajti.type
            });
        }
    }
    return {
        handleMessage: zajth
    };
}

if (zajta) {
    var zajtb = createWorkerEngine(zajta);
    zajta.onmessage = zajtb.handleMessage;
}

export { createWorkerEngine };
