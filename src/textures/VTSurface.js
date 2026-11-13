import { Matrix4, Vector3 } from "../math/index.js";

class VTSurface {
    constructor(renderer, options) {
        options = options || {};
        this.renderer = renderer;
        if (!renderer || !renderer.device) throw new Error("VTSurface requires an initialized WebGPU renderer");
        var device = renderer.device;
        this.vt = options.virtualTexture || null;
        this.shadowVT = options.shadowTexture || null;
        this.lightDirection = options.lightDirection instanceof Vector3 ? options.lightDirection.clone().normalize() : new Vector3(-0.5, -1, -0.3).normalize();
        this.shadowStrength = options.shadowStrength === undefined ? 0.8 : options.shadowStrength;
        this.lightExtent = options.lightExtent === undefined ? 8 : options.lightExtent;
        this.width = Math.max(1, Math.floor(options.width || 192));
        this.height = Math.max(1, Math.floor(options.height || 192));
        this.geometry = null;
        this.vertexCount = 0;
        this.feedbackWords = this.vt ? Math.ceil(this.vt.totalPages / 32) : 1;
        this.cameraBuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.feedbackBuffer = device.createBuffer({ size: this.feedbackWords * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.feedbackStaging = device.createBuffer({ size: this.feedbackWords * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        this.feedbackTarget = device.createTexture({ size: [this.width, this.height, 1], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT });
        this.feedbackDepth = device.createTexture({ size: [this.width, this.height, 1], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
        this.buildPipelines();
    }
    buildPipelines() {
        var device = this.renderer.device;
        var vt = this.vt;
        var tableSize = vt ? vt.tableSize : 1;
        var maxMip = vt ? vt.maxMip : 0;
        var virtualSize = vt ? vt.virtualSize : 1;
        var pageSize = vt ? vt.pageSize : 1;
        var totalPages = vt ? vt.totalPages : 1;
        var pagesPerLayer = vt ? vt.pagesPerLayer : 1;
        var mipBases = vt ? vt.mipBases.join(",") : "0";
        var albedoSample = vt ? vt.sampleWGSL("albedo", "albedoTable", "albedoTableSampler", "albedoAtlas", "albedoAtlasSampler", "vec4<f32>(0.5, 0.5, 0.5, 1.0)") : "";
        var shadowSample = this.shadowVT ? this.shadowVT.sampleWGSL("shadow", "shadowTable", "shadowTableSampler", "shadowAtlas", "shadowAtlasSampler", "vec4<f32>(0.0)") : "";
        var shadowBlock = this.shadowVT ? shadowSample + " " : "";
        var shadowBindings = this.shadowVT ? "@group(0) @binding(5) var shadowTable: texture_2d_array<f32>; @group(0) @binding(6) var shadowTableSampler: sampler; @group(0) @binding(7) var shadowAtlas: texture_2d<f32>; @group(0) @binding(8) var shadowAtlasSampler: sampler; " : "";
        var shadowLogic = this.shadowVT ? "if (camera.params.x > 0.5) { let lightClip = camera.lightBasis * vec4<f32>(input.world, 1.0); let lightUv = vec2<f32>(lightClip.x * 0.5 + 0.5, 0.5 - lightClip.y * 0.5); let occlusion = shadowPage(lightUv, 0.0, 0.0); shade = shade * (1.0 - clamp(occlusion.r, 0.0, 1.0) * camera.params.y); } " : "";
        var shader = "struct Camera { viewProjection: mat4x4<f32>, lightDirection: vec4<f32>, lightBasis: mat4x4<f32>, params: vec4<f32> }; @group(0) @binding(0) var<uniform> camera: Camera; @group(0) @binding(1) var albedoTable: texture_2d_array<f32>; @group(0) @binding(2) var albedoTableSampler: sampler; @group(0) @binding(3) var albedoAtlas: texture_2d<f32>; @group(0) @binding(4) var albedoAtlasSampler: sampler; " + shadowBindings + "struct VOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) world: vec3<f32> }; " + albedoSample + " " + shadowBlock + " @vertex fn vertexMain(@location(0) position: vec3<f32>, @location(1) uv: vec2<f32>) -> VOut { var output: VOut; output.position = camera.viewProjection * vec4<f32>(position, 1.0); output.position.z = output.position.z * 0.5 + output.position.w * 0.5; output.uv = uv; output.world = position; return output; } @fragment fn fragmentMain(input: VOut) -> @location(0) vec4<f32> { var shade = 0.25; let dx = dpdx(input.world); let dy = dpdy(input.world); var n = cross(dx, dy); let nlen = length(n); if (nlen > 0.0000001) { n = n / nlen; let l = normalize(-camera.lightDirection.xyz); shade = 0.25 + 0.75 * max(dot(n, l), 0.0); } let tableMip = albedoTableMip(input.uv, " + virtualSize.toFixed(1) + ", " + pageSize.toFixed(1) + ", " + maxMip.toFixed(1) + "); var albedo = albedoPage(input.uv, 0.0, tableMip); " + shadowLogic + " return vec4<f32>(albedo.rgb * shade, 1.0); }";
        this.shaderModule = device.createShaderModule({ code: shader });
        this.pipeline = device.createRenderPipeline({ layout: "auto", vertex: { module: this.shaderModule, entryPoint: "vertexMain", buffers: [{ arrayStride: 20, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }, { shaderLocation: 1, offset: 12, format: "float32x2" }] }] }, fragment: { module: this.shaderModule, entryPoint: "fragmentMain", targets: [{ format: this.renderer.format }] }, primitive: { topology: "triangle-list", cullMode: "none" }, depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" } });
        var feedbackShader = "struct Camera { viewProjection: mat4x4<f32>, lightDirection: vec4<f32>, lightBasis: mat4x4<f32>, params: vec4<f32> }; @group(0) @binding(0) var<uniform> camera: Camera; @group(0) @binding(1) var<storage, read_write> feedback: array<atomic<u32>>; struct VOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) world: vec3<f32> }; @vertex fn vertexMain(@location(0) position: vec3<f32>, @location(1) uv: vec2<f32>) -> VOut { var output: VOut; output.position = camera.viewProjection * vec4<f32>(position, 1.0); output.position.z = output.position.z * 0.5 + output.position.w * 0.5; output.uv = uv; output.world = position; return output; } @fragment fn feedbackMain(input: VOut) -> @location(0) vec4<f32> { let dx = abs(dpdx(input.uv).x); let dy = abs(dpdy(input.uv).y); let density = max(max(dx, dy) * " + virtualSize.toFixed(1) + " / " + pageSize.toFixed(1) + ", 0.000001); let m = clamp(floor(log2(density) + 0.5), 0.0, " + maxMip.toFixed(1) + "); let side = max(floor(" + tableSize.toFixed(1) + " / pow(2.0, m)), 1.0); let scaled = input.uv * vec2<f32>(side, side); let px = u32(clamp(floor(scaled.x), 0.0, side - 1.0)); let py = u32(clamp(floor(scaled.y), 0.0, side - 1.0)); let mipBases = array<u32, " + Math.max(1, (vt ? vt.mipCount : 1)) + ">(" + mipBases + "); let mb = mipBases[u32(m)]; let id = 0u * " + pagesPerLayer + "u + mb + py * u32(side) + px; atomicOr(&feedback[id / 32u], 1u << (id % 32u)); return vec4<f32>(0.0, 0.0, 0.0, 0.0); }";
        this.feedbackModule = device.createShaderModule({ code: feedbackShader });
        this.feedbackPipeline = device.createRenderPipeline({ layout: "auto", vertex: { module: this.feedbackModule, entryPoint: "vertexMain", buffers: [{ arrayStride: 20, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }, { shaderLocation: 1, offset: 12, format: "float32x2" }] }] }, fragment: { module: this.feedbackModule, entryPoint: "feedbackMain", targets: [{ format: "rgba8unorm", writeMask: 0 }] }, primitive: { topology: "triangle-list", cullMode: "none" }, depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" } });
        this.bindGroup = null;
        this.feedbackBindGroup = null;
    }
    setGeometry(geometry) {
        var device = this.renderer.device;
        var position = geometry.attributes.position, uv = geometry.attributes.uv;
        if (!position || !position.array || !uv || !uv.array) throw new Error("VTSurface geometry needs position and uv attributes");
        var interleaved = new Float32Array(position.array.length / 3 * 5);
        var count = position.array.length / 3;
        for (var i = 0; i < count; i++) {
            interleaved[i * 5] = position.array[i * 3];
            interleaved[i * 5 + 1] = position.array[i * 3 + 1];
            interleaved[i * 5 + 2] = position.array[i * 3 + 2];
            interleaved[i * 5 + 3] = uv.array[i * 2];
            interleaved[i * 5 + 4] = uv.array[i * 2 + 1];
        }
        this.geometry = geometry;
        this.vertexCount = count;
        this.vertexBuffer = device.createBuffer({ size: Math.max(16, interleaved.byteLength), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(this.vertexBuffer, 0, interleaved);
        if (geometry.index && geometry.index.length) {
            var indexArray = geometry.index instanceof Uint32Array || geometry.index instanceof Uint16Array ? geometry.index : new Uint16Array(geometry.index);
            var asU32 = indexArray instanceof Uint32Array ? indexArray : new Uint32Array(indexArray);
            this.indexCount = asU32.length;
            this.indexBuffer = device.createBuffer({ size: Math.max(16, asU32.byteLength), usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(this.indexBuffer, 0, asU32);
        } else { this.indexBuffer = null; this.indexCount = 0; }
        return this;
    }
    lightBasisMatrix() {
        var light = this.lightDirection.clone().normalize();
        var forward = light.clone().negate();
        var upGuess = Math.abs(forward.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
        var right = new Vector3().crossVectors(upGuess, forward).normalize();
        var up = new Vector3().crossVectors(forward, right).normalize();
        var center = new Vector3(0, 0, 0);
        var eye = center.clone().addScaledVector(forward, 20);
        var view = new Matrix4().lookAt(eye, center, up).invert();
        var e = this.lightExtent;
        var projection = new Matrix4().makeOrthographic(-e, e, e, -e, 0.1, 40);
        return new Matrix4().multiplyMatrices(projection, view);
    }
    writeCamera(camera) {
        var data = new Float32Array(64);
        var viewProjection = camera.isMatrix4 ? camera : (camera.viewProjection ? camera.viewProjection : new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        data.set(viewProjection.elements, 0);
        data[16] = this.lightDirection.x; data[17] = this.lightDirection.y; data[18] = this.lightDirection.z; data[19] = 0;
        data.set(this.lightBasisMatrix().elements, 20);
        data[36] = this.shadowVT ? 1 : 0;
        data[37] = this.shadowStrength;
        this.renderer.device.queue.writeBuffer(this.cameraBuffer, 0, data);
        return this;
    }
    ensureBindGroups() {
        var device = this.renderer.device;
        if (this.bindGroup || !this.vt) return this;
        var entries = [{ binding: 0, resource: { buffer: this.cameraBuffer } }, { binding: 1, resource: this.vt.tableView }, { binding: 2, resource: this.vt.tableSampler }, { binding: 3, resource: this.vt.atlasView }, { binding: 4, resource: this.vt.atlasSampler }];
        if (this.shadowVT) entries.push({ binding: 5, resource: this.shadowVT.tableView }, { binding: 6, resource: this.shadowVT.tableSampler }, { binding: 7, resource: this.shadowVT.atlasView }, { binding: 8, resource: this.shadowVT.atlasSampler });
        this.bindGroup = device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: entries });
        this.feedbackBindGroup = device.createBindGroup({ layout: this.feedbackPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.cameraBuffer } }, { binding: 1, resource: { buffer: this.feedbackBuffer } }] });
        return this;
    }
    setShadowTexture(vt) {
        this.shadowVT = vt || null;
        this.bindGroup = null;
        this.buildPipelines();
        return this;
    }
    renderToTexture(camera) {
        var device = this.renderer.device;
        var color = device.createTexture({ size: [this.width, this.height, 1], format: this.renderer.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
        var depth = device.createTexture({ size: [this.width, this.height, 1], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
        this.ensureBindGroups();
        this.writeCamera(camera);
        var encoder = device.createCommandEncoder();
        var pass = encoder.beginRenderPass({ colorAttachments: [{ view: color.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }], depthStencilAttachment: { view: depth.createView(), depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" } });
        this.encodeDraw(pass);
        pass.end();
        device.queue.submit([encoder.finish()]);
        depth.destroy();
        return color;
    }
    encodeDraw(pass) {
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.setVertexBuffer(0, this.vertexBuffer);
        if (this.indexBuffer) { pass.setIndexBuffer(this.indexBuffer, "uint32"); pass.drawIndexed(this.indexCount); }
        else pass.draw(this.vertexCount);
        return this;
    }
    async readPixels(texture) {
        var device = this.renderer.device;
        var bpr = Math.ceil(this.width * 4 / 256) * 256;
        var buffer = device.createBuffer({ size: bpr * this.height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: texture }, { buffer: buffer, bytesPerRow: bpr, rowsPerImage: this.height }, [this.width, this.height, 1]);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await buffer.mapAsync(GPUMapMode.READ);
        var mapped = new Uint8Array(buffer.getMappedRange()).slice();
        buffer.unmap();
        buffer.destroy();
        return mapped;
    }
    collectFeedback(camera) {
        var device = this.renderer.device;
        this.ensureBindGroups();
        this.writeCamera(camera);
        device.queue.writeBuffer(this.feedbackBuffer, 0, new Uint32Array(this.feedbackWords));
        var encoder = device.createCommandEncoder();
        var pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.feedbackTarget.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }], depthStencilAttachment: { view: this.feedbackDepth.createView(), depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" } });
        pass.setPipeline(this.feedbackPipeline);
        pass.setBindGroup(0, this.feedbackBindGroup);
        pass.setVertexBuffer(0, this.vertexBuffer);
        if (this.indexBuffer) { pass.setIndexBuffer(this.indexBuffer, "uint32"); pass.drawIndexed(this.indexCount); }
        else pass.draw(this.vertexCount);
        pass.end();
        encoder.copyBufferToBuffer(this.feedbackBuffer, 0, this.feedbackStaging, 0, this.feedbackWords * 4);
        device.queue.submit([encoder.finish()]);
        return this;
    }
    async readFeedback() {
        var device = this.renderer.device;
        await device.queue.onSubmittedWorkDone();
        await this.feedbackStaging.mapAsync(GPUMapMode.READ);
        var words = new Uint32Array(this.feedbackStaging.getMappedRange()).slice();
        this.feedbackStaging.unmap();
        return words;
    }
    dispose() {
        if (this.cameraBuffer) this.cameraBuffer.destroy();
        if (this.feedbackBuffer) this.feedbackBuffer.destroy();
        if (this.feedbackStaging) this.feedbackStaging.destroy();
        if (this.feedbackTarget) this.feedbackTarget.destroy();
        if (this.feedbackDepth) this.feedbackDepth.destroy();
        this.cameraBuffer = null;
        this.feedbackBuffer = null;
        this.feedbackStaging = null;
        this.feedbackTarget = null;
        this.feedbackDepth = null;
        return this;
    }
}

export { VTSurface };
