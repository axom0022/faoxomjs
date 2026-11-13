import { Matrix4, Vector2, Vector3 } from "../math/index.js";

class VTShadowBaker {
    constructor(renderer, shadowTexture, options) {
        options = options || {};
        this.renderer = renderer;
        if (!renderer || !renderer.device) throw new Error("VTShadowBaker requires an initialized WebGPU renderer");
        if (!shadowTexture || !shadowTexture.pageSize) throw new Error("VTShadowBaker requires a VirtualTexture");
        this.shadowVT = shadowTexture;
        this.lightDirection = options.lightDirection instanceof Vector3 ? options.lightDirection.clone().normalize() : new Vector3(-0.5, -1, -0.3).normalize();
        this.lightExtent = options.lightExtent === undefined ? 8 : options.lightExtent;
        var device = renderer.device;
        this.basisBuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.bakeTarget = device.createTexture({ size: [this.shadowVT.pageSize, this.shadowVT.pageSize, 1], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
        var bpr = this.shadowVT.pageSize * 4;
        this.bakeBuffer = device.createBuffer({ size: bpr * this.shadowVT.pageSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        this.shader = device.createShaderModule({ code: "struct Basis { pageProjection: mat4x4<f32> }; @group(0) @binding(0) var<uniform> basis: Basis; struct VOut { @builtin(position) position: vec4<f32> }; @vertex fn vertexMain(@location(0) position: vec3<f32>) -> VOut { var output: VOut; let world = position; output.position = basis.pageProjection * vec4<f32>(world, 1.0); output.position.z = output.position.z * 0.5 + output.position.w * 0.5; return output; } @fragment fn fragmentMain(input: VOut) -> @location(0) vec4<f32> { return vec4<f32>(1.0, 1.0, 1.0, 1.0); }" });
        this.pipeline = device.createRenderPipeline({ layout: "auto", vertex: { module: this.shader, entryPoint: "vertexMain", buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }] }, fragment: { module: this.shader, entryPoint: "fragmentMain", targets: [{ format: "rgba8unorm" }] }, primitive: { topology: "triangle-list", cullMode: "none" } });
        this.bindGroup = device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.basisBuffer } }] });
        this.blockers = [];
    }
    lightBasisMatrix() {
        var light = this.lightDirection.clone().normalize();
        var forward = light.clone().negate();
        var upGuess = Math.abs(forward.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
        var right = new Vector3().crossVectors(upGuess, forward).normalize();
        var up = new Vector3().crossVectors(forward, right).normalize();
        var eye = new Vector3().copy(forward).multiplyScalar(20);
        var view = new Matrix4().lookAt(eye, new Vector3(0, 0, 0), up).invert();
        var e = this.lightExtent;
        var projection = new Matrix4().makeOrthographic(-e, e, e, -e, 0.1, 40);
        return new Matrix4().multiplyMatrices(projection, view);
    }
    pageProjection(mip, px, py) {
        var side = this.shadowVT.tableSide(mip);
        var pageWidth = 2 * this.lightExtent / side;
        var pageHalf = this.lightExtent / side;
        var center = new Vector2(-this.lightExtent + (px + 0.5) * pageWidth, this.lightExtent - (py + 0.5) * pageWidth);
        var light = this.lightDirection.clone().normalize();
        var forward = light.clone().negate();
        var upGuess = Math.abs(forward.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
        var right = new Vector3().crossVectors(upGuess, forward).normalize();
        var up = new Vector3().crossVectors(forward, right).normalize();
        var eye = new Vector3().copy(forward).multiplyScalar(20).add(new Vector3().copy(right).multiplyScalar(center.x)).add(new Vector3().copy(up).multiplyScalar(center.y));
        var view = new Matrix4().lookAt(eye, new Vector3().copy(eye).addScaledVector(forward, -20), up).invert();
        var projection = new Matrix4().makeOrthographic(-pageHalf, pageHalf, pageHalf, -pageHalf, 0.1, 40);
        return new Matrix4().multiplyMatrices(projection, view);
    }
    addBlocker(blocker) {
        this.blockers.push(blocker);
        return this;
    }
    clearBlockers() {
        this.blockers = [];
        return this;
    }
    uploadBlockerGeometry(blocker) {
        var device = this.renderer.device;
        var array = blocker.geometry.attributes.position.array;
        if (!blocker.buffer || blocker.bufferVersion !== blocker.geometry.version) {
            if (blocker.buffer) blocker.buffer.destroy();
            blocker.buffer = device.createBuffer({ size: Math.max(16, array.byteLength), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(blocker.buffer, 0, array);
            blocker.bufferVersion = blocker.geometry.version || 0;
            blocker.vertexCount = array.length / 3;
            var index = blocker.geometry.index;
            blocker.indexBuffer = null;
            blocker.indexCount = 0;
            if (index && index.length) {
                var asU32 = index instanceof Uint32Array ? index : new Uint32Array(index instanceof Uint16Array ? index : new Uint16Array(index));
                blocker.indexBuffer = device.createBuffer({ size: Math.max(16, asU32.byteLength), usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
                device.queue.writeBuffer(blocker.indexBuffer, 0, asU32);
                blocker.indexCount = asU32.length;
            }
        }
        return blocker;
    }
    async bakePage(mip, px, py) {
        var device = this.renderer.device;
        var vt = this.shadowVT;
        var side = vt.tableSide(mip);
        if (px < 0 || py < 0 || px >= side || py >= side) throw new Error("VTShadowBaker.bakePage page out of range");
        var projection = this.pageProjection(mip, px, py);
        var data = new Float32Array(16);
        data.set(projection.elements, 0);
        device.queue.writeBuffer(this.basisBuffer, 0, data, 0, 16);
        var encoder = device.createCommandEncoder();
        var pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.bakeTarget.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }] });
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        for (var i = 0; i < this.blockers.length; i++) {
            var blocker = this.uploadBlockerGeometry(this.blockers[i]);
            if (!blocker.vertexCount) continue;
            pass.setVertexBuffer(0, blocker.buffer);
            if (blocker.indexBuffer) { pass.setIndexBuffer(blocker.indexBuffer, "uint32"); pass.drawIndexed(blocker.indexCount); }
            else pass.draw(blocker.vertexCount);
        }
        pass.end();
        var pageSize = vt.pageSize;
        encoder.copyTextureToBuffer({ texture: this.bakeTarget }, { buffer: this.bakeBuffer, bytesPerRow: pageSize * 4, rowsPerImage: pageSize }, [pageSize, pageSize, 1]);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await this.bakeBuffer.mapAsync(GPUMapMode.READ);
        var mapped = new Uint8Array(this.bakeBuffer.getMappedRange()).slice();
        this.bakeBuffer.unmap();
        var tile = vt.allocateTile();
        if (tile === null) { var evicted = vt.evictLRU(1); tile = evicted > 0 ? vt.allocateTile() : null; }
        if (tile === null) throw new Error("VTShadowBaker could not allocate a tile");
        vt.uploadTile(tile, mapped);
        vt.setPage(mip, 0, px, py, tile);
        vt.flushTable();
        return mapped;
    }
    async bakeAll(mips) {
        var maxMip = mips === undefined ? this.shadowVT.maxMip : Math.min(Math.floor(mips), this.shadowVT.maxMip);
        for (var layer = 0; layer < this.shadowVT.layers; layer++) {
            for (var m = 0; m <= maxMip; m++) {
                var side = this.shadowVT.tableSide(m);
                for (var py = 0; py < side; py++) for (var px = 0; px < side; px++) await this.bakePage(m, px, py);
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
