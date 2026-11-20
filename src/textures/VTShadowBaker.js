import { Matrix4, Vector2, Vector3 } from "../math/index.js";

class VTShadowBaker {
    constructor(zavga, zavgb, zavgc) {
        zavgc = zavgc || {};
        this.renderer = zavga;
        if (!zavga || !zavga.device) throw new Error("VTShadowBaker requires an initialized WebGPU renderer");
        if (!zavgb || !zavgb.pageSize) throw new Error("VTShadowBaker requires a VirtualTexture");
        this.shadowVT = zavgb;
        this.lightDirection = zavgc.lightDirection instanceof Vector3 ? zavgc.lightDirection.clone().normalize() : new Vector3(-.5, -1, -.3).normalize();
        this.lightExtent = zavgc.lightExtent === undefined ? 8 : zavgc.lightExtent;
        var zavgd = zavga.device;
        this.basisBuffer = zavgd.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.bakeTarget = zavgd.createTexture({
            size: [ this.shadowVT.pageSize, this.shadowVT.pageSize, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        var zavge = this.shadowVT.pageSize * 4;
        this.bakeBuffer = zavgd.createBuffer({
            size: zavge * this.shadowVT.pageSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        this.shader = zavgd.createShaderModule({
            code: "struct Basis { pageProjection: mat4x4<f32> }; @group(0) @binding(0) var<uniform> basis: Basis; struct VOut { @builtin(position) position: vec4<f32> }; @vertex fn vertexMain(@location(0) position: vec3<f32>) -> VOut { var output: VOut; let world = position; output.position = basis.pageProjection * vec4<f32>(world, 1.0); output.position.z = output.position.z * 0.5 + output.position.w * 0.5; return output; } @fragment fn fragmentMain(input: VOut) -> @location(0) vec4<f32> { return vec4<f32>(1.0, 1.0, 1.0, 1.0); }"
        });
        this.pipeline = zavgd.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.shader,
                entryPoint: "vertexMain",
                buffers: [ {
                    arrayStride: 12,
                    attributes: [ {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    } ]
                } ]
            },
            fragment: {
                module: this.shader,
                entryPoint: "fragmentMain",
                targets: [ {
                    format: "rgba8unorm"
                } ]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            }
        });
        this.bindGroup = zavgd.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.basisBuffer
                }
            } ]
        });
        this.blockers = [];
    }
    lightBasisMatrix() {
        var zavga = this.lightDirection.clone().normalize();
        var zavgb = zavga.clone().negate();
        var zavgc = Math.abs(zavgb.y) > .9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
        var zavgd = (new Vector3).crossVectors(zavgc, zavgb).normalize();
        var zavge = (new Vector3).crossVectors(zavgb, zavgd).normalize();
        var zavgf = (new Vector3).copy(zavgb).multiplyScalar(20);
        var zavgg = (new Matrix4).lookAt(zavgf, new Vector3(0, 0, 0), zavge).invert();
        var zavgh = this.lightExtent;
        var zavgi = (new Matrix4).makeOrthographic(-zavgh, zavgh, zavgh, -zavgh, .1, 40);
        return (new Matrix4).multiplyMatrices(zavgi, zavgg);
    }
    pageProjection(zavga, zavgb, zavgc) {
        var zavgd = this.shadowVT.tableSide(zavga);
        var zavge = 2 * this.lightExtent / zavgd;
        var zavgf = this.lightExtent / zavgd;
        var zavgg = new Vector2(-this.lightExtent + (zavgb + .5) * zavge, this.lightExtent - (zavgc + .5) * zavge);
        var zavgh = this.lightDirection.clone().normalize();
        var zavgi = zavgh.clone().negate();
        var zavgj = Math.abs(zavgi.y) > .9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
        var zavgk = (new Vector3).crossVectors(zavgj, zavgi).normalize();
        var zavgl = (new Vector3).crossVectors(zavgi, zavgk).normalize();
        var zavgm = (new Vector3).copy(zavgi).multiplyScalar(20).add((new Vector3).copy(zavgk).multiplyScalar(zavgg.x)).add((new Vector3).copy(zavgl).multiplyScalar(zavgg.y));
        var zavgn = (new Matrix4).lookAt(zavgm, (new Vector3).copy(zavgm).addScaledVector(zavgi, -20), zavgl).invert();
        var zavgo = (new Matrix4).makeOrthographic(-zavgf, zavgf, zavgf, -zavgf, .1, 40);
        return (new Matrix4).multiplyMatrices(zavgo, zavgn);
    }
    addBlocker(zavga) {
        this.blockers.push(zavga);
        return this;
    }
    clearBlockers() {
        this.blockers = [];
        return this;
    }
    uploadBlockerGeometry(zavga) {
        var zavgb = this.renderer.device;
        var zavgc = zavga.geometry.attributes.position.array;
        if (!zavga.buffer || zavga.bufferVersion !== zavga.geometry.version) {
            if (zavga.buffer) zavga.buffer.destroy();
            zavga.buffer = zavgb.createBuffer({
                size: Math.max(16, zavgc.byteLength),
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            zavgb.queue.writeBuffer(zavga.buffer, 0, zavgc);
            zavga.bufferVersion = zavga.geometry.version || 0;
            zavga.vertexCount = zavgc.length / 3;
            var zavgd = zavga.geometry.index;
            zavga.indexBuffer = null;
            zavga.indexCount = 0;
            if (zavgd && zavgd.length) {
                var zavge = zavgd instanceof Uint32Array ? zavgd : new Uint32Array(zavgd instanceof Uint16Array ? zavgd : new Uint16Array(zavgd));
                zavga.indexBuffer = zavgb.createBuffer({
                    size: Math.max(16, zavge.byteLength),
                    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
                });
                zavgb.queue.writeBuffer(zavga.indexBuffer, 0, zavge);
                zavga.indexCount = zavge.length;
            }
        }
        return zavga;
    }
    async bakePage(zavga, zavgb, zavgc) {
        var zavgd = this.renderer.device;
        var zavge = this.shadowVT;
        var zavgf = zavge.tableSide(zavga);
        if (zavgb < 0 || zavgc < 0 || zavgb >= zavgf || zavgc >= zavgf) throw new Error("VTShadowBaker.bakePage page out of range");
        var zavgg = this.pageProjection(zavga, zavgb, zavgc);
        var zavgh = new Float32Array(16);
        zavgh.set(zavgg.elements, 0);
        zavgd.queue.writeBuffer(this.basisBuffer, 0, zavgh, 0, 16);
        var zavgi = zavgd.createCommandEncoder();
        var zavgj = zavgi.beginRenderPass({
            colorAttachments: [ {
                view: this.bakeTarget.createView(),
                clearValue: {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 1
                },
                loadOp: "clear",
                storeOp: "store"
            } ]
        });
        zavgj.setPipeline(this.pipeline);
        zavgj.setBindGroup(0, this.bindGroup);
        for (var zavgk = 0; zavgk < this.blockers.length; zavgk++) {
            var zavgl = this.uploadBlockerGeometry(this.blockers[zavgk]);
            if (!zavgl.vertexCount) continue;
            zavgj.setVertexBuffer(0, zavgl.buffer);
            if (zavgl.indexBuffer) {
                zavgj.setIndexBuffer(zavgl.indexBuffer, "uint32");
                zavgj.drawIndexed(zavgl.indexCount);
            } else zavgj.draw(zavgl.vertexCount);
        }
        zavgj.end();
        var zavgm = zavge.pageSize;
        zavgi.copyTextureToBuffer({
            texture: this.bakeTarget
        }, {
            buffer: this.bakeBuffer,
            bytesPerRow: zavgm * 4,
            rowsPerImage: zavgm
        }, [ zavgm, zavgm, 1 ]);
        zavgd.queue.submit([ zavgi.finish() ]);
        await zavgd.queue.onSubmittedWorkDone();
        await this.bakeBuffer.mapAsync(GPUMapMode.READ);
        var zavgn = new Uint8Array(this.bakeBuffer.getMappedRange()).slice();
        this.bakeBuffer.unmap();
        var zavgo = zavge.allocateTile();
        if (zavgo === null) {
            var zavgp = zavge.evictLRU(1);
            zavgo = zavgp > 0 ? zavge.allocateTile() : null;
        }
        if (zavgo === null) throw new Error("VTShadowBaker could not allocate a tile");
        zavge.uploadTile(zavgo, zavgn);
        zavge.setPage(zavga, 0, zavgb, zavgc, zavgo);
        zavge.flushTable();
        return zavgn;
    }
    async bakeAll(zavga) {
        var zavgb = zavga === undefined ? this.shadowVT.maxMip : Math.min(Math.floor(zavga), this.shadowVT.maxMip);
        for (var zavgc = 0; zavgc < this.shadowVT.layers; zavgc++) {
            for (var zavgd = 0; zavgd <= zavgb; zavgd++) {
                var zavge = this.shadowVT.tableSide(zavgd);
                for (var zavgf = 0; zavgf < zavge; zavgf++) for (var zavgg = 0; zavgg < zavge; zavgg++) await this.bakePage(zavgd, zavgg, zavgf);
            }
        }
        return this;
    }
    dispose() {
        if (this.basisBuffer) this.basisBuffer.destroy();
        if (this.bakeTarget) this.bakeTarget.destroy();
        if (this.bakeBuffer) this.bakeBuffer.destroy();
        this.basisBuffer = null;
        this.bakeTarget = null;
        this.bakeBuffer = null;
        return this;
    }
}

export { VTShadowBaker };
