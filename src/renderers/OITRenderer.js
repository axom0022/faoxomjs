import { Color, Matrix4 } from "../math/index.js";

class OITRenderer {
    constructor(renderer, options) {
        options = options || {};
        this.renderer = renderer;
        if (!renderer || !renderer.device) throw new Error("OITRenderer requires an initialized WebGPU renderer");
        var device = renderer.device;
        this.width = Math.max(1, Math.floor(options.width === undefined ? 192 : options.width));
        this.height = Math.max(1, Math.floor(options.height === undefined ? 192 : options.height));
        this.nodeCapacity = Math.max(8, Math.floor(options.nodeCapacity === undefined ? 65536 : options.nodeCapacity));
        this.far = Math.max(1, options.far === undefined ? 100 : options.far);
        this.SENTINEL = 4294967295;
        this.objects = [];
        this.stats = { fragments: 0, overflow: 0, coveredPixels: 0 };
        this.nodeStride = 32;
        this.nodeBuffer = device.createBuffer({ size: this.nodeCapacity * this.nodeStride, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
        this.headBuffer = device.createBuffer({ size: this.width * this.height * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.counterBuffer = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.counterStaging = device.createBuffer({ size: 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        this.cameraBuffer = device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.sentinelFill = new Uint32Array(this.width * this.height).fill(this.SENTINEL);
        this.internalDepth = device.createTexture({ size: [this.width, this.height, 1], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
        this.compositeTexture = device.createTexture({ size: [this.width, this.height, 1], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING });
        this.opaqueSampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
        this.depthCompareSampler = device.createSampler({ compare: "less", magFilter: "nearest", minFilter: "nearest" });
        this.dummyDepth = device.createTexture({ size: [1, 1, 1], format: "depth32float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
        var dummyEncoder = device.createCommandEncoder();
        var dummyPass = dummyEncoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this.dummyDepth.createView(), depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" } });
        dummyPass.end();
        device.queue.submit([dummyEncoder.finish()]);
        this.buildPipelines();
    }
    buildPipelines() {
        var device = this.renderer.device;
        var insertShader = "struct Camera { viewProjection: mat4x4<f32>, view: mat4x4<f32>, params: vec4<f32> }; struct Model { model: mat4x4<f32>, color: vec4<f32> }; struct FragmentNode { color: vec4<f32>, viewZ: f32, next: u32, aux: u32 }; @group(0) @binding(0) var<uniform> camera: Camera; @group(0) @binding(1) var<storage, read_write> nodes: array<FragmentNode>; @group(0) @binding(2) var<storage, read_write> heads: array<atomic<u32>>; @group(0) @binding(3) var<storage, read_write> counter: atomic<u32>; @group(0) @binding(4) var sceneDepth: texture_depth_2d; @group(0) @binding(5) var depthCompareSampler: sampler_comparison; @group(1) @binding(0) var<uniform> modelData: Model; struct VOut { @builtin(position) position: vec4<f32>, @location(0) viewZ: f32, @location(1) depth01: f32 }; @vertex fn insertVertex(@location(0) position: vec3<f32>) -> VOut { var output: VOut; let world = modelData.model * vec4<f32>(position, 1.0); let viewPosition = camera.view * world; output.viewZ = viewPosition.z; var clip = camera.viewProjection * world; clip.z = clip.z * 0.5 + clip.w * 0.5; output.depth01 = clip.z / clip.w; output.position = clip; return output; } @fragment fn insertFragment(input: VOut) { let alpha = clamp(modelData.color.a, 0.0, 1.0); if (alpha <= 0.0) { discard; } let depthUv = input.position.xy / vec2<f32>(camera.params.x, camera.params.y); let depthVisible = textureSampleCompareLevel(sceneDepth, depthCompareSampler, depthUv, input.depth01); if (depthVisible < 0.5) { discard; } let pixel = u32(input.position.x) + u32(input.position.y) * u32(camera.params.x); let node = atomicAdd(&counter, 1u); if (node >= u32(camera.params.w)) { discard; } nodes[node].color = vec4<f32>(modelData.color.rgb * alpha, alpha); nodes[node].viewZ = input.viewZ; nodes[node].aux = 0u; nodes[node].next = atomicExchange(&heads[pixel], node); }";
        this.insertModule = device.createShaderModule({ code: insertShader });
        this.insertPipeline = device.createRenderPipeline({ layout: "auto", vertex: { module: this.insertModule, entryPoint: "insertVertex", buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }] }, fragment: { module: this.insertModule, entryPoint: "insertFragment", targets: [] }, primitive: { topology: "triangle-list", cullMode: "none" }, depthStencil: { format: "depth24plus", depthWriteEnabled: false, depthCompare: "less" } });
        var resolveShader = "struct Camera { viewProjection: mat4x4<f32>, view: mat4x4<f32>, params: vec4<f32> }; struct FragmentNode { color: vec4<f32>, viewZ: f32, next: u32, aux: u32 }; @group(0) @binding(0) var<uniform> camera: Camera; @group(0) @binding(1) var<storage, read> nodes: array<FragmentNode>; @group(0) @binding(2) var<storage, read> heads: array<u32>; @group(0) @binding(3) var opaqueTexture: texture_2d<f32>; @group(0) @binding(4) var opaqueSampler: sampler; struct ROut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; @vertex fn resolveVertex(@builtin(vertex_index) vertexIndex: u32) -> ROut { var output: ROut; var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0)); let p = positions[vertexIndex]; output.position = vec4<f32>(p, 0.0, 1.0); output.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); return output; } @fragment fn resolveFragment(input: ROut) -> @location(0) vec4<f32> { let pixel = u32(input.position.x) + u32(input.position.y) * u32(camera.params.x); let opaque = textureSampleLevel(opaqueTexture, opaqueSampler, input.uv, 0.0); var sumColor = vec3<f32>(0.0, 0.0, 0.0); var sumWeight = 0.0; var revealage = 1.0; var idx = heads[pixel]; var guard = 0u; while (idx != 4294967295u && guard <= u32(camera.params.w)) { let node = nodes[idx]; let depth01 = clamp(-node.viewZ / camera.params.z, 0.0, 1.0); let weight = max(0.0001, pow(1.0 - depth01, 8.0)); sumColor = sumColor + node.color.rgb * weight; sumWeight = sumWeight + node.color.a * weight; revealage = revealage * (1.0 - node.color.a); idx = node.next; guard = guard + 1u; } if (sumWeight <= 0.0) { return opaque; } let avgColor = sumColor / sumWeight; let outColor = opaque.rgb * revealage + avgColor * (1.0 - revealage); return vec4<f32>(outColor, 1.0); }";
        this.resolveModule = device.createShaderModule({ code: resolveShader });
        this.resolvePipeline = device.createRenderPipeline({ layout: "auto", vertex: { module: this.resolveModule, entryPoint: "resolveVertex" }, fragment: { module: this.resolveModule, entryPoint: "resolveFragment", targets: [{ format: "rgba8unorm" }] }, primitive: { topology: "triangle-list" } });
        this.resolveLayout = this.resolvePipeline.getBindGroupLayout(0);
        this.insertLayout = this.insertPipeline.getBindGroupLayout(0);
    }
    add(object) {
        if (!object || !object.geometry || !object.geometry.attributes || !object.geometry.attributes.position) throw new Error("OITRenderer.add requires an object with a position attribute");
        var record = { source: object, geometry: object.geometry, matrix: object.matrixWorld instanceof Matrix4 ? object.matrixWorld : null, color: new Color(object.color !== undefined ? object.color : object.material && object.material.color !== undefined ? object.material.color : 0xffffff), opacity: object.opacity !== undefined ? object.opacity : object.material && object.material.opacity !== undefined ? object.material.opacity : 1, buffer: null, vertexBuffer: null, indexBuffer: null, vertexCount: 0, indexCount: 0, version: -1, bindGroup: null };
        this.objects.push(record);
        return this;
    }
    remove(object) {
        for (var i = 0; i < this.objects.length; i++) if (this.objects[i].source === object || this.objects[i] === object) { this.objects.splice(i, 1); return this; }
        return this;
    }
    clear() {
        this.objects = [];
        return this;
    }
    resize(width, height) {
        var w = Math.max(1, Math.floor(width)), h = Math.max(1, Math.floor(height));
        if (w === this.width && h === this.height) return this;
        this.width = w;
        this.height = h;
        var device = this.renderer.device;
        this.headBuffer.destroy();
        this.headBuffer = device.createBuffer({ size: this.width * this.height * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.sentinelFill = new Uint32Array(this.width * this.height).fill(this.SENTINEL);
        this.internalDepth.destroy();
        this.internalDepth = device.createTexture({ size: [this.width, this.height, 1], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
        this.compositeTexture.destroy();
        this.compositeTexture = device.createTexture({ size: [this.width, this.height, 1], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING });
        return this;
    }
    uploadObject(device, record) {
        var geometry = record.geometry;
        var version = geometry.version === undefined ? 0 : geometry.version;
        if (record.version === version && record.vertexBuffer) return record;
        var position = geometry.attributes.position.array;
        if (record.vertexBuffer) record.vertexBuffer.destroy();
        if (record.indexBuffer) { record.indexBuffer.destroy(); record.indexBuffer = null; }
        record.vertexBuffer = device.createBuffer({ size: Math.max(16, position.byteLength), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(record.vertexBuffer, 0, position);
        record.vertexCount = position.length / 3;
        record.indexCount = 0;
        if (geometry.index && geometry.index.length) {
            var index = geometry.index instanceof Uint32Array || geometry.index instanceof Uint16Array ? geometry.index : new Uint16Array(geometry.index);
            var asU32 = index instanceof Uint32Array ? index : new Uint32Array(index);
            record.indexBuffer = device.createBuffer({ size: Math.max(16, asU32.byteLength), usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(record.indexBuffer, 0, asU32);
            record.indexCount = asU32.length;
        }
        if (!record.buffer) record.buffer = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        record.version = version;
        return record;
    }
    writeModel(record) {
        var data = new Float32Array(20);
        if (record.matrix) data.set(record.matrix.elements, 0);
        else { data[0] = 1; data[5] = 1; data[10] = 1; data[15] = 1; }
        data[16] = record.color.r;
        data[17] = record.color.g;
        data[18] = record.color.b;
        data[19] = record.opacity === undefined ? 1 : record.opacity;
        this.renderer.device.queue.writeBuffer(record.buffer, 0, data);
        return this;
    }
    render(opaqueTexture, opaqueDepthTexture, camera) {
        var device = this.renderer.device;
        if (!camera || !camera.projectionMatrix || !camera.matrixWorldInverse) throw new Error("OITRenderer.render requires a camera");
        var sceneDepthView = opaqueDepthTexture ? (opaqueDepthTexture instanceof GPUTexture ? opaqueDepthTexture.createView() : opaqueDepthTexture) : this.dummyDepth.createView();
        var viewProjection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        var cameraData = new Float32Array(36);
        cameraData.set(viewProjection.elements, 0);
        cameraData.set(camera.matrixWorldInverse.elements, 16);
        cameraData[32] = this.width;
        cameraData[33] = this.height;
        cameraData[34] = this.far;
        cameraData[35] = this.nodeCapacity;
        device.queue.writeBuffer(this.cameraBuffer, 0, cameraData);
        device.queue.writeBuffer(this.headBuffer, 0, this.sentinelFill);
        device.queue.writeBuffer(this.counterBuffer, 0, new Uint32Array(1));
        var insertBindGroup = device.createBindGroup({ layout: this.insertLayout, entries: [{ binding: 0, resource: { buffer: this.cameraBuffer } }, { binding: 1, resource: { buffer: this.nodeBuffer } }, { binding: 2, resource: { buffer: this.headBuffer } }, { binding: 3, resource: { buffer: this.counterBuffer } }, { binding: 4, resource: sceneDepthView }, { binding: 5, resource: this.depthCompareSampler }] });
        var encoder = device.createCommandEncoder();
        var insertPass = encoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this.internalDepth.createView(), depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" } });
        insertPass.setPipeline(this.insertPipeline);
        insertPass.setBindGroup(0, insertBindGroup);
        for (var i = 0; i < this.objects.length; i++) {
            var record = this.uploadObject(device, this.objects[i]);
            if (!record.vertexCount) continue;
            this.writeModel(record);
            if (!record.bindGroup) record.bindGroup = device.createBindGroup({ layout: this.insertPipeline.getBindGroupLayout(1), entries: [{ binding: 0, resource: { buffer: record.buffer } }] });
            insertPass.setBindGroup(1, record.bindGroup);
            insertPass.setVertexBuffer(0, record.vertexBuffer);
            if (record.indexBuffer) { insertPass.setIndexBuffer(record.indexBuffer, "uint32"); insertPass.drawIndexed(record.indexCount); }
            else insertPass.draw(record.vertexCount);
        }
        insertPass.end();
        var resolveBindGroup = device.createBindGroup({ layout: this.resolveLayout, entries: [{ binding: 0, resource: { buffer: this.cameraBuffer } }, { binding: 1, resource: { buffer: this.nodeBuffer } }, { binding: 2, resource: { buffer: this.headBuffer } }, { binding: 3, resource: opaqueTexture instanceof GPUTexture ? opaqueTexture.createView() : opaqueTexture }, { binding: 4, resource: this.opaqueSampler }] });
        var resolvePass = encoder.beginRenderPass({ colorAttachments: [{ view: this.compositeTexture.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }] });
        resolvePass.setPipeline(this.resolvePipeline);
        resolvePass.setBindGroup(0, resolveBindGroup);
        resolvePass.draw(3);
        resolvePass.end();
        device.queue.submit([encoder.finish()]);
        return this.compositeTexture;
    }
    async readStats() {
        var device = this.renderer.device;
        var encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.counterBuffer, 0, this.counterStaging, 0, 4);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await this.counterStaging.mapAsync(GPUMapMode.READ);
        var counter = new Uint32Array(this.counterStaging.getMappedRange())[0];
        this.counterStaging.unmap();
        this.stats.fragments = Math.min(counter, this.nodeCapacity);
        this.stats.overflow = counter > this.nodeCapacity ? counter - this.nodeCapacity : 0;
        return this.stats;
    }
    async readbackState() {
        var device = this.renderer.device;
        var nodeBytes = this.nodeCapacity * this.nodeStride;
        var headBytes = this.width * this.height * 4;
        var staging = device.createBuffer({ size: nodeBytes + headBytes + 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.nodeBuffer, 0, staging, 0, nodeBytes);
        encoder.copyBufferToBuffer(this.headBuffer, 0, staging, nodeBytes, headBytes);
        encoder.copyBufferToBuffer(this.counterBuffer, 0, staging, nodeBytes + headBytes, 4);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await staging.mapAsync(GPUMapMode.READ);
        var raw = new Uint8Array(staging.getMappedRange()).slice();
        staging.unmap();
        staging.destroy();
        var counter = new Uint32Array(raw.buffer, nodeBytes + headBytes, 1)[0];
        this.stats.fragments = Math.min(counter, this.nodeCapacity);
        this.stats.overflow = counter > this.nodeCapacity ? counter - this.nodeCapacity : 0;
        var words = new Uint32Array(raw.buffer, 0, this.nodeCapacity * 8);
        var wordFloat = new Float32Array(raw.buffer, 0, this.nodeCapacity * 8);
        var colors = new Float32Array(this.nodeCapacity * 4);
        var viewZ = new Float32Array(this.nodeCapacity);
        var next = new Uint32Array(this.nodeCapacity);
        for (var i = 0; i < this.nodeCapacity; i++) {
            colors[i * 4] = wordFloat[i * 8];
            colors[i * 4 + 1] = wordFloat[i * 8 + 1];
            colors[i * 4 + 2] = wordFloat[i * 8 + 2];
            colors[i * 4 + 3] = wordFloat[i * 8 + 3];
            viewZ[i] = wordFloat[i * 8 + 4];
            next[i] = words[i * 8 + 5];
        }
        var heads = new Uint32Array(raw.buffer, nodeBytes, this.width * this.height);
        var coveredPixels = 0;
        for (var p = 0; p < heads.length; p++) if (heads[p] !== this.SENTINEL) coveredPixels++;
        this.stats.coveredPixels = coveredPixels;
        return { counter: counter, colors: colors, viewZ: viewZ, next: next, heads: heads, stats: this.stats };
    }
    async readPixels(texture) {
        var device = this.renderer.device;
        var target = texture || this.compositeTexture;
        var bpr = Math.ceil(this.width * 4 / 256) * 256;
        var buffer = device.createBuffer({ size: bpr * this.height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: target }, { buffer: buffer, bytesPerRow: bpr, rowsPerImage: this.height }, [this.width, this.height, 1]);
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        await buffer.mapAsync(GPUMapMode.READ);
        var mapped = new Uint8Array(buffer.getMappedRange());
        var result = new Uint8Array(this.width * 4 * this.height);
        for (var row = 0; row < this.height; row++) result.set(mapped.subarray(row * bpr, row * bpr + this.width * 4), row * this.width * 4);
        buffer.unmap();
        buffer.destroy();
        return result;
    }
    dispose() {
        if (this.nodeBuffer) this.nodeBuffer.destroy();
        if (this.headBuffer) this.headBuffer.destroy();
        if (this.counterBuffer) this.counterBuffer.destroy();
        if (this.counterStaging) this.counterStaging.destroy();
        if (this.cameraBuffer) this.cameraBuffer.destroy();
        if (this.internalDepth) this.internalDepth.destroy();
        if (this.dummyDepth) this.dummyDepth.destroy();
        if (this.compositeTexture) this.compositeTexture.destroy();
        for (var i = 0; i < this.objects.length; i++) {
            var record = this.objects[i];
            if (record.buffer) record.buffer.destroy();
            if (record.vertexBuffer) record.vertexBuffer.destroy();
            if (record.indexBuffer) record.indexBuffer.destroy();
        }
        this.nodeBuffer = null;
        this.headBuffer = null;
        this.counterBuffer = null;
        this.counterStaging = null;
        this.cameraBuffer = null;
        this.internalDepth = null;
        this.dummyDepth = null;
        this.compositeTexture = null;
        this.objects = [];
        return this;
    }
}

export { OITRenderer };
