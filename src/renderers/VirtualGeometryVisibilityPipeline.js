import { Matrix4 } from "../math/index.js";

import { VirtualGeometryGPUHierarchy } from "./VirtualGeometryGPUHierarchy.js";

const virtualGeometryCullWGSL = `
struct Uniforms {
    viewProjection: mat4x4<f32>,
    planes: array<vec4<f32>, 6>,
    misc: vec4<f32>,
    viewport: vec4<f32>,
    camera: vec4<f32>,
};
struct Candidate {
    sphere: vec4<f32>,
    cone: vec4<f32>,
    draw: vec4<u32>,
    instance: vec4<f32>,
};
struct DrawIndirect {
    vertexCount: u32,
    instanceCount: u32,
    firstVertex: u32,
    firstInstance: u32,
};
struct Metadata {
    cluster: u32,
    material: u32,
    instance: u32,
    level: u32,
    translation: vec4<f32>,
};
struct Counters {
    visible: atomic<u32>,
    frustumCulled: atomic<u32>,
    coneCulled: atomic<u32>,
    occlusionCulled: atomic<u32>,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> candidates: array<Candidate>;
@group(0) @binding(2) var<storage, read_write> commands: array<DrawIndirect>;
@group(0) @binding(3) var<storage, read_write> metadata: array<Metadata>;
@group(0) @binding(4) var<storage, read_write> counters: Counters;
@group(0) @binding(5) var hierarchyDepth: texture_2d<f32>;

fn frustumVisible(center: vec3<f32>, radius: f32) -> bool {
    for (var plane = 0u; plane < 6u; plane++) {
        if (dot(uniforms.planes[plane].xyz, center) + uniforms.planes[plane].w < -radius) { return false; }
    }
    return true;
}
fn coneVisible(candidate: Candidate, center: vec3<f32>) -> bool {
    if (uniforms.misc.y < 0.5 || candidate.instance.w < 0.5) { return true; }
    var direction = uniforms.camera.xyz - center;
    let distance = max(length(direction), 0.000001);
    direction /= distance;
    let cosine = dot(direction, candidate.cone.xyz);
    let sine = sqrt(max(0.0, 1.0 - cosine * cosine));
    let coneSine = sqrt(max(0.0, 1.0 - candidate.cone.w * candidate.cone.w));
    let bound = cosine * candidate.cone.w + sine * coneSine;
    return !(cosine < candidate.cone.w && bound < -0.000001 && distance * -bound >= candidate.sphere.w);
}
fn occlusionVisible(center: vec3<f32>, radius: f32) -> bool {
    if (uniforms.misc.z < 0.5) { return true; }
    let clip = uniforms.viewProjection * vec4<f32>(center, 1.0);
    if (clip.w <= 0.000001) { return true; }
    let ndc = clip.xyz / clip.w;
    let uv = ndc.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);
    if (any(uv < vec2<f32>(0.0)) || any(uv > vec2<f32>(1.0))) { return true; }
    let radiusPixels = max(1.0, radius * uniforms.viewport.y * 0.5 / abs(clip.w));
    let levels = max(1.0, uniforms.misc.w);
    let mip = u32(clamp(floor(log2(radiusPixels * 2.0)), 0.0, levels - 1.0));
    let dimensions = textureDimensions(hierarchyDepth, i32(mip));
    let pixel = clamp(vec2<i32>(uv * vec2<f32>(dimensions)), vec2<i32>(0), vec2<i32>(dimensions) - vec2<i32>(1));
    let depth = textureLoad(hierarchyDepth, pixel, i32(mip)).r;
    let depthRadius = radius / abs(clip.w);
    if (uniforms.viewport.w > 0.5) { return ndc.z + depthRadius >= depth - uniforms.viewport.z; }
    return ndc.z - depthRadius <= depth + uniforms.viewport.z;
}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
    let index = invocation.x;
    if (index >= u32(uniforms.misc.x)) { return; }
    let candidate = candidates[index];
    let center = candidate.sphere.xyz + candidate.instance.xyz;
    if (!frustumVisible(center, candidate.sphere.w)) { atomicAdd(&counters.frustumCulled, 1u); return; }
    if (!coneVisible(candidate, center)) { atomicAdd(&counters.coneCulled, 1u); return; }
    if (!occlusionVisible(center, candidate.sphere.w)) { atomicAdd(&counters.occlusionCulled, 1u); return; }
    let output = atomicAdd(&counters.visible, 1u);
    commands[output].vertexCount = candidate.draw.x;
    commands[output].instanceCount = 1u;
    commands[output].firstVertex = candidate.draw.y;
    commands[output].firstInstance = output;
    metadata[output].cluster = candidate.draw.w;
    metadata[output].material = candidate.draw.z & 65535u;
    metadata[output].level = (candidate.draw.z >> 16u) & 255u;
    metadata[output].instance = candidate.draw.z >> 24u;
    metadata[output].translation = vec4<f32>(candidate.instance.xyz, 1.0);
}`;

const virtualGeometryVisibilityWGSL = `
struct Uniforms {
    viewProjection: mat4x4<f32>,
    planes: array<vec4<f32>, 6>,
    misc: vec4<f32>,
    viewport: vec4<f32>,
    camera: vec4<f32>,
};
struct Metadata {
    cluster: u32,
    material: u32,
    instance: u32,
    level: u32,
    translation: vec4<f32>,
};
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) @interpolate(flat) drawIndex: u32,
    @location(1) @interpolate(flat) primitiveIndex: u32,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> metadata: array<Metadata>;
@group(0) @binding(3) var<storage, read> indices: array<u32>;
@vertex
fn vertexMain(@builtin(vertex_index) vertexInvocation: u32, @builtin(instance_index) drawIndex: u32) -> VertexOutput {
    let vertexIndex = indices[vertexInvocation];
    let base = vertexIndex * 3u;
    let local = vec3<f32>(positions[base], positions[base + 1u], positions[base + 2u]);
    var output: VertexOutput;
    output.position = uniforms.viewProjection * vec4<f32>(local + metadata[drawIndex].translation.xyz, 1.0);
    output.drawIndex = drawIndex;
    output.primitiveIndex = vertexInvocation / 3u;
    return output;
}
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<u32> {
    let record = metadata[input.drawIndex];
    return vec4<u32>(record.cluster, record.material, input.primitiveIndex, record.instance);
}`;

class VirtualGeometryVisibilityPipeline {
    constructor(device, options) {
        options = options || {};
        this.device = device && device.device ? device.device : device || null;
        this.geometry = options.geometry || null;
        this.maxCandidates = Math.max(1, options.maxCandidates || 65536);
        this.colorFormat = options.colorFormat || "rgba32uint";
        this.depthFormat = options.depthFormat || "depth24plus";
        this.reverseDepth = options.reverseDepth === true;
        this.width = 0;
        this.height = 0;
        this.candidateCount = 0;
        this.capacity = 0;
        this.candidateBuffer = null;
        this.commandBuffer = null;
        this.metadataBuffer = null;
        this.counterBuffer = null;
        this.uniformBuffer = null;
        this.statsReadback = null;
        this.cullPipeline = null;
        this.visibilityPipeline = null;
        this.cullBindGroup = null;
        this.visibilityBindGroup = null;
        this.visibilityPositionBuffer = null;
        this.visibilityTexture = null;
        this.visibilityView = null;
        this.depthTexture = null;
        this.depthView = null;
        this.fallbackDepth = null;
        this.hiz = options.hiz || null;
        this.gpuHierarchy = null;
        this.ownsGPUHierarchy = false;
        this.cpuCandidates = null;
        this.uniformData = new Float32Array(60);
        this.uniformUint = new Uint32Array(this.uniformData.buffer);
        this.stats = { frames: 0, candidates: 0, visible: -1, frustumCulled: -1, coneCulled: -1, occlusionCulled: -1, indirectDraws: 0, uploadedBytes: 0, backend: this.device ? "webgpu" : "cpu" };
        if (options.width || options.height) this.resize(options.width || 1, options.height || 1);
    }
    setGeometry(geometry) { this.geometry = geometry; this.visibilityBindGroup = null; if (this.gpuHierarchy) this.gpuHierarchy.setGeometry(geometry); return this; }
    setHiZ(hiz) { this.hiz = hiz || null; this.cullBindGroup = null; if (this.gpuHierarchy) this.gpuHierarchy.bindGroup = null; return this; }
    setGPUHierarchy(selector) { if (this.ownsGPUHierarchy && this.gpuHierarchy) this.gpuHierarchy.dispose(); this.gpuHierarchy = selector || null; this.ownsGPUHierarchy = false; if (this.gpuHierarchy) { this.gpuHierarchy.setVisibility(this); if (this.geometry) this.gpuHierarchy.setGeometry(this.geometry); } return this; }
    enableGPUHierarchy(options) { if (!this.gpuHierarchy) { this.gpuHierarchy = new VirtualGeometryGPUHierarchy(this.device, this, Object.assign({}, options || {}, { geometry: this.geometry })); this.ownsGPUHierarchy = true; } return this.gpuHierarchy; }
    usage(name, fallback) { return typeof globalThis[name] !== "undefined" ? globalThis[name] : fallback; }
    align(value, alignment) { return Math.ceil(value / alignment) * alignment; }
    ensureCapacity(count) {
        if (!this.device || count <= this.capacity) return;
        var capacity = Math.max(64, this.capacity || 64); while (capacity < count) capacity *= 2; capacity = Math.min(this.maxCandidates, capacity);
        if (count > capacity) throw new Error("VirtualGeometryVisibilityPipeline candidate capacity exceeded");
        this.destroyBuffer("candidateBuffer"); this.destroyBuffer("commandBuffer"); this.destroyBuffer("metadataBuffer");
        this.candidateBuffer = this.device.createBuffer({ size: capacity * 64, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.commandBuffer = this.device.createBuffer({ size: capacity * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.metadataBuffer = this.device.createBuffer({ size: capacity * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.capacity = capacity; this.cullBindGroup = null; this.visibilityBindGroup = null;
    }
    ensurePipelines() {
        if (!this.device) return;
        if (!this.uniformBuffer) this.uniformBuffer = this.device.createBuffer({ size: 240, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        if (!this.counterBuffer) this.counterBuffer = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        if (!this.fallbackDepth) {
            this.fallbackDepth = this.device.createTexture({ size: [ 1, 1, 1 ], format: "r32float", mipLevelCount: 1, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
            this.device.queue.writeTexture({ texture: this.fallbackDepth }, new Float32Array([ 1 ]), { bytesPerRow: 4 }, [ 1, 1, 1 ]);
        }
        if (!this.cullPipeline) this.cullPipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: virtualGeometryCullWGSL }), entryPoint: "main" } });
        if (!this.visibilityPipeline) this.visibilityPipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: { module: this.device.createShaderModule({ code: virtualGeometryVisibilityWGSL }), entryPoint: "vertexMain" },
            fragment: { module: this.device.createShaderModule({ code: virtualGeometryVisibilityWGSL }), entryPoint: "fragmentMain", targets: [ { format: this.colorFormat } ] },
            primitive: { topology: "triangle-list", cullMode: "back" },
            depthStencil: { format: this.depthFormat, depthWriteEnabled: true, depthCompare: this.reverseDepth ? "greater" : "less" }
        });
    }
    ensureBindGroups() {
        if (!this.device || !this.geometry || !this.candidateBuffer) return;
        this.ensurePipelines();
        var depthView = this.hiz && this.hiz.fullview || this.fallbackDepth.createView();
        if (!this.cullBindGroup) this.cullBindGroup = this.device.createBindGroup({ layout: this.cullPipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.uniformBuffer } }, { binding: 1, resource: { buffer: this.candidateBuffer } },
            { binding: 2, resource: { buffer: this.commandBuffer } }, { binding: 3, resource: { buffer: this.metadataBuffer } },
            { binding: 4, resource: { buffer: this.counterBuffer } }, { binding: 5, resource: depthView }
        ] });
        var positions = this.geometry.store && this.geometry.store.buffers && this.geometry.store.buffers.positions;
        var indices = this.geometry.store && this.geometry.store.buffers && this.geometry.store.buffers.indices;
        if (!positions || !indices) throw new Error("VirtualGeometryVisibilityPipeline requires uploaded FXOMVGS vertex-pulling buffers");
        if (this.visibilityPositionBuffer !== positions) { this.visibilityPositionBuffer = positions; this.visibilityBindGroup = null; }
        if (!this.visibilityBindGroup) this.visibilityBindGroup = this.device.createBindGroup({ layout: this.visibilityPipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.uniformBuffer } }, { binding: 1, resource: { buffer: positions } }, { binding: 2, resource: { buffer: this.metadataBuffer } }, { binding: 3, resource: { buffer: indices } }
        ] });
    }
    uploadCandidates(result, geometry) {
        if (geometry) this.setGeometry(geometry);
        if (!this.geometry) throw new Error("VirtualGeometryVisibilityPipeline requires an FXOMVGS instance");
        var selected = result && result.selected || result || [];
        this.candidateCount = Math.min(selected.length, this.maxCandidates); this.stats.candidates = this.candidateCount;
        var data = new ArrayBuffer(this.candidateCount * 64), floats = new Float32Array(data), uints = new Uint32Array(data);
        for (var index = 0; index < this.candidateCount; index++) {
            var entry = selected[index], cluster = this.geometry.clusters[entry.id], instance = this.geometry.instances[entry.instance] || this.geometry.instances[0], pageRecord = this.geometry.pageRecords.get(entry.pageId), base = index * 16;
            if (!cluster || !instance || !pageRecord) throw new Error("VirtualGeometryVisibilityPipeline candidate references unavailable geometry");
            floats[base] = cluster.center[0]; floats[base + 1] = cluster.center[1]; floats[base + 2] = cluster.center[2]; floats[base + 3] = cluster.radius;
            floats[base + 4] = cluster.axis[0]; floats[base + 5] = cluster.axis[1]; floats[base + 6] = cluster.axis[2]; floats[base + 7] = cluster.cosThetaMax;
            uints[base + 8] = entry.count; uints[base + 9] = pageRecord.indexOffset + entry.pageFirst; uints[base + 10] = (entry.material & 65535) | (entry.level & 255) << 16 | (entry.instance & 255) << 24; uints[base + 11] = entry.id;
            floats[base + 12] = instance.position.x; floats[base + 13] = instance.position.y; floats[base + 14] = instance.position.z; floats[base + 15] = cluster.cullable ? 1 : 0;
        }
        this.cpuCandidates = data;
        if (this.device && this.candidateCount) { this.ensureCapacity(this.candidateCount); this.device.queue.writeBuffer(this.candidateBuffer, 0, data); this.stats.uploadedBytes += data.byteLength; }
        return this;
    }
    cameraData(camera, options) {
        options = options || {};
        var projection = camera && camera.projectionMatrix && camera.matrixWorldInverse ? (new Matrix4).multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse) : camera && camera.elements ? camera : new Matrix4;
        var elements = projection.elements, data = this.uniformData;
        for (var index = 0; index < 16; index++) data[index] = elements[index];
        var planes = [ elements[3] + elements[0], elements[7] + elements[4], elements[11] + elements[8], elements[15] + elements[12], elements[3] - elements[0], elements[7] - elements[4], elements[11] - elements[8], elements[15] - elements[12], elements[3] + elements[1], elements[7] + elements[5], elements[11] + elements[9], elements[15] + elements[13], elements[3] - elements[1], elements[7] - elements[5], elements[11] - elements[9], elements[15] - elements[13], elements[2], elements[6], elements[10], elements[14], elements[3] - elements[2], elements[7] - elements[6], elements[11] - elements[10], elements[15] - elements[14] ];
        for (var plane = 0; plane < 6; plane++) { var length = Math.sqrt(planes[plane * 4] ** 2 + planes[plane * 4 + 1] ** 2 + planes[plane * 4 + 2] ** 2) || 1; for (var component = 0; component < 4; component++) data[16 + plane * 4 + component] = planes[plane * 4 + component] / length; }
        data[40] = this.candidateCount; data[41] = options.useCone === false ? 0 : 1; data[42] = options.occlusion !== false && this.hiz && this.hiz.ready ? 1 : 0; data[43] = this.hiz ? this.hiz.levels : 1;
        data[44] = options.viewportWidth || this.width || 1; data[45] = options.viewportHeight || this.height || 1;
        data[46] = options.occlusionBias === undefined ? .00005 : options.occlusionBias; data[47] = options.reverseDepth === undefined ? (this.reverseDepth ? 1 : 0) : options.reverseDepth ? 1 : 0;
        data[48] = camera && camera.position ? camera.position.x : 0; data[49] = camera && camera.position ? camera.position.y : 0; data[50] = camera && camera.position ? camera.position.z : 0; data[51] = 0;
        return data;
    }
    encodeCull(encoder, camera, options) {
        if (!this.device || !this.candidateCount) return this;
        this.geometry.store.upload(); this.ensureBindGroups();
        var data = this.cameraData(camera, options);
        this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
        encoder.clearBuffer(this.commandBuffer); encoder.clearBuffer(this.metadataBuffer); encoder.clearBuffer(this.counterBuffer);
        var pass = encoder.beginComputePass({ label: "FXOM virtual geometry visibility cull" }); pass.setPipeline(this.cullPipeline); pass.setBindGroup(0, this.cullBindGroup); pass.dispatchWorkgroups(Math.ceil(this.candidateCount / 64)); pass.end();
        return this;
    }
    encodeVisibility(encoder, options) {
        options = options || {}; if (!this.device || !this.candidateCount) return this;
        if (!this.visibilityView || !this.depthView) throw new Error("VirtualGeometryVisibilityPipeline.resize must be called before rendering");
        this.ensureBindGroups();
        var pass = encoder.beginRenderPass({ label: "FXOM visibility buffer", colorAttachments: [ { view: options.visibilityView || this.visibilityView, clearValue: { r: 4294967295, g: 0, b: 0, a: 0 }, loadOp: options.loadOp || "clear", storeOp: "store" } ], depthStencilAttachment: { view: options.depthView || this.depthView, depthClearValue: options.reverseDepth === undefined ? (this.reverseDepth ? 0 : 1) : options.reverseDepth ? 0 : 1, depthLoadOp: options.depthLoadOp || "clear", depthStoreOp: "store" } });
        pass.setPipeline(this.visibilityPipeline); pass.setBindGroup(0, this.visibilityBindGroup);
        for (var index = 0; index < this.candidateCount; index++) pass.drawIndirect(this.commandBuffer, index * 16);
        pass.end(); this.stats.indirectDraws = this.candidateCount; return this;
    }
    encodeGPUHierarchy(encoder, camera, options) {
        var selector = this.enableGPUHierarchy(options); selector.encode(encoder, camera, options); return this;
    }
    executeGPUHierarchy(camera, options) {
        if (!this.device) { this.stats.frames++; return this; }
        var encoder = this.device.createCommandEncoder({ label: "FXOM GPU-resident hierarchy and visibility" }); this.encodeGPUHierarchy(encoder, camera, options); this.encodeVisibility(encoder, options); this.device.queue.submit([ encoder.finish() ]); this.stats.frames++; return this;
    }
    execute(camera, options) {
        if (!this.device) { this.stats.frames++; return this; }
        var encoder = this.device.createCommandEncoder({ label: "FXOM multi-stage visibility" }); this.encodeCull(encoder, camera, options); this.encodeVisibility(encoder, options); this.device.queue.submit([ encoder.finish() ]); this.stats.frames++; return this;
    }
    resize(width, height) {
        width = Math.max(1, Math.floor(width || 1)); height = Math.max(1, Math.floor(height || 1)); if (!this.device || width === this.width && height === this.height && this.visibilityTexture) return this;
        this.width = width; this.height = height; if (this.visibilityTexture) this.visibilityTexture.destroy(); if (this.depthTexture) this.depthTexture.destroy();
        this.visibilityTexture = this.device.createTexture({ size: [ width, height, 1 ], format: this.colorFormat, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC }); this.visibilityView = this.visibilityTexture.createView();
        this.depthTexture = this.device.createTexture({ size: [ width, height, 1 ], format: this.depthFormat, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING }); this.depthView = this.depthTexture.createView(); return this;
    }
    async readStats() {
        if (!this.device || !this.counterBuffer) return Object.assign({}, this.stats);
        if (!this.statsReadback) this.statsReadback = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        var encoder = this.device.createCommandEncoder(); encoder.copyBufferToBuffer(this.counterBuffer, 0, this.statsReadback, 0, 32); this.device.queue.submit([ encoder.finish() ]); await this.device.queue.onSubmittedWorkDone(); await this.statsReadback.mapAsync(GPUMapMode.READ);
        var counters = new Uint32Array(this.statsReadback.getMappedRange()).slice(); this.statsReadback.unmap(); this.stats.visible = counters[0]; this.stats.frustumCulled = counters[1]; this.stats.coneCulled = counters[2]; this.stats.occlusionCulled = counters[3]; this.stats.triangles = counters[4]; this.stats.budgetCulled = counters[5]; this.stats.pageRequests = counters[6]; return Object.assign({}, this.stats);
    }
    report() { return { width: this.width, height: this.height, capacity: this.capacity, candidateCount: this.candidateCount, colorFormat: this.colorFormat, depthFormat: this.depthFormat, stats: Object.assign({}, this.stats) }; }
    destroyBuffer(name) { if (this[name] && this[name].destroy) this[name].destroy(); this[name] = null; }
    dispose() {
        if (this.ownsGPUHierarchy && this.gpuHierarchy) this.gpuHierarchy.dispose(); this.gpuHierarchy = null;
        var buffers = [ "candidateBuffer", "commandBuffer", "metadataBuffer", "counterBuffer", "uniformBuffer", "statsReadback" ]; for (var index = 0; index < buffers.length; index++) this.destroyBuffer(buffers[index]);
        if (this.visibilityTexture) this.visibilityTexture.destroy(); if (this.depthTexture) this.depthTexture.destroy(); if (this.fallbackDepth) this.fallbackDepth.destroy();
        this.visibilityTexture = this.visibilityView = this.depthTexture = this.depthView = this.fallbackDepth = null; this.cullPipeline = this.visibilityPipeline = this.cullBindGroup = this.visibilityBindGroup = this.visibilityPositionBuffer = null; return this;
    }
}

export { VirtualGeometryVisibilityPipeline, virtualGeometryCullWGSL, virtualGeometryVisibilityWGSL };
