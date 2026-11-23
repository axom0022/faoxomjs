import { Matrix4 } from "../math/index.js";

const virtualGeometryHierarchyWGSL = `
struct Uniforms {
    viewProjection: mat4x4<f32>,
    planes: array<vec4<f32>, 6>,
    misc: vec4<f32>,
    viewport: vec4<f32>,
    camera: vec4<f32>,
    selection: vec4<f32>,
    hierarchy: vec4<u32>,
};
struct Cluster {
    sphere: vec4<f32>,
    cone: vec4<f32>,
    lod: vec4<f32>,
    draw: vec4<u32>,
    state: vec4<u32>,
};
struct DrawIndirect { vertexCount: u32, instanceCount: u32, firstVertex: u32, firstInstance: u32 };
struct Metadata { cluster: u32, material: u32, instance: u32, level: u32, translation: vec4<f32> };
struct Counters {
    visible: atomic<u32>, frustumCulled: atomic<u32>, coneCulled: atomic<u32>, occlusionCulled: atomic<u32>,
    triangles: atomic<u32>, budgetCulled: atomic<u32>, pageRequests: atomic<u32>, padding: atomic<u32>,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> clusters: array<Cluster>;
@group(0) @binding(2) var<storage, read> instances: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> emitted: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> history: array<u32>;
@group(0) @binding(5) var<storage, read_write> requests: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> commands: array<DrawIndirect>;
@group(0) @binding(7) var<storage, read_write> metadata: array<Metadata>;
@group(0) @binding(8) var<storage, read_write> counters: Counters;
@group(0) @binding(9) var hierarchyDepth: texture_2d<f32>;
fn projectedError(cluster: Cluster, translation: vec3<f32>) -> f32 {
    let center = cluster.sphere.xyz + translation;
    let distance = max(0.001, length(uniforms.camera.xyz - center) - cluster.sphere.w);
    let projectionScale = uniforms.viewport.y / max(0.001, 2.0 * tan(uniforms.viewport.z * 0.5));
    return cluster.lod.x * projectionScale / distance;
}
fn frustumVisible(cluster: Cluster, translation: vec3<f32>) -> bool {
    let center = cluster.sphere.xyz + translation;
    for (var plane = 0u; plane < 6u; plane++) {
        if (dot(uniforms.planes[plane].xyz, center) + uniforms.planes[plane].w < -cluster.sphere.w) { return false; }
    }
    return true;
}
fn coneVisible(cluster: Cluster, translation: vec3<f32>) -> bool {
    if (uniforms.misc.y < 0.5 || cluster.lod.w < 0.5) { return true; }
    let center = cluster.sphere.xyz + translation;
    var direction = uniforms.camera.xyz - center;
    let distance = max(length(direction), 0.000001); direction /= distance;
    let cosine = dot(direction, cluster.cone.xyz);
    let sine = sqrt(max(0.0, 1.0 - cosine * cosine));
    let coneSine = sqrt(max(0.0, 1.0 - cluster.cone.w * cluster.cone.w));
    let bound = cosine * cluster.cone.w + sine * coneSine;
    return !(cosine < cluster.cone.w && bound < -0.000001 && distance * -bound >= cluster.sphere.w);
}
fn occlusionVisible(cluster: Cluster, translation: vec3<f32>) -> bool {
    if (uniforms.misc.z < 0.5) { return true; }
    let center = cluster.sphere.xyz + translation;
    let clip = uniforms.viewProjection * vec4<f32>(center, 1.0);
    if (clip.w <= 0.000001) { return true; }
    let ndc = clip.xyz / clip.w;
    let uv = ndc.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);
    if (any(uv < vec2<f32>(0.0)) || any(uv > vec2<f32>(1.0))) { return true; }
    let radiusPixels = max(1.0, cluster.sphere.w * uniforms.viewport.y * 0.5 / abs(clip.w));
    let mip = u32(clamp(floor(log2(radiusPixels * 2.0)), 0.0, max(0.0, uniforms.misc.w - 1.0)));
    let dimensions = textureDimensions(hierarchyDepth, i32(mip));
    let pixel = clamp(vec2<i32>(uv * vec2<f32>(dimensions)), vec2<i32>(0), vec2<i32>(dimensions) - vec2<i32>(1));
    let depth = textureLoad(hierarchyDepth, pixel, i32(mip)).r;
    let depthRadius = cluster.sphere.w / abs(clip.w);
    if (uniforms.viewport.w > 0.5) { return ndc.z + depthRadius >= depth - uniforms.camera.w; }
    return ndc.z - depthRadius <= depth + uniforms.camera.w;
}
fn reserveDraw() -> u32 {
    let limit = u32(uniforms.selection.y);
    loop {
        let current = atomicLoad(&counters.visible);
        if (current >= limit) { return limit; }
        let result = atomicCompareExchangeWeak(&counters.visible, current, current + 1u);
        if (result.exchanged) { return current; }
    }
}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
    let nodeCount = uniforms.hierarchy.x;
    let total = nodeCount * uniforms.hierarchy.y;
    if (invocation.x >= total) { return; }
    let instanceIndex = invocation.x / nodeCount;
    let originalNode = invocation.x - instanceIndex * nodeCount;
    let translation = instances[instanceIndex].xyz;
    let cluster = clusters[originalNode];
    let previous = history[invocation.x] != 0u;
    let hysteresis = uniforms.selection.w;
    let threshold = uniforms.selection.x * select(1.0 + hysteresis, 1.0 - hysteresis, previous);
    let acceptable = projectedError(cluster, translation) <= threshold;
    var parentAcceptable = false;
    let parentValue = i32(cluster.lod.y);
    if (parentValue >= 0) { parentAcceptable = projectedError(clusters[u32(parentValue)], translation) <= threshold; }
    let desired = acceptable && (parentValue < 0 || !parentAcceptable);
    history[invocation.x] = select(0u, 1u, desired);
    if (!desired) { return; }
    var selectedNode = originalNode;
    if (clusters[selectedNode].state.z == 0u) {
        let page = clusters[selectedNode].state.x;
        if (atomicExchange(&requests[page], 1u) == 0u) { atomicAdd(&counters.pageRequests, 1u); }
        loop {
            let parent = i32(clusters[selectedNode].lod.y);
            if (parent < 0) { return; }
            selectedNode = u32(parent);
            if (clusters[selectedNode].state.z != 0u) { break; }
        }
    }
    let emitIndex = instanceIndex * nodeCount + selectedNode;
    if (atomicExchange(&emitted[emitIndex], 1u) != 0u) { return; }
    let selected = clusters[selectedNode];
    if (!frustumVisible(selected, translation)) { atomicAdd(&counters.frustumCulled, 1u); return; }
    if (!coneVisible(selected, translation)) { atomicAdd(&counters.coneCulled, 1u); return; }
    if (!occlusionVisible(selected, translation)) { atomicAdd(&counters.occlusionCulled, 1u); return; }
    let triangleCount = selected.state.y;
    let oldTriangles = atomicAdd(&counters.triangles, triangleCount);
    if (oldTriangles + triangleCount > u32(uniforms.selection.z)) { atomicSub(&counters.triangles, triangleCount); atomicAdd(&counters.budgetCulled, 1u); return; }
    let output = reserveDraw();
    if (output >= u32(uniforms.selection.y)) { atomicSub(&counters.triangles, triangleCount); atomicAdd(&counters.budgetCulled, 1u); return; }
    commands[output].vertexCount = selected.draw.x;
    commands[output].instanceCount = 1u;
    commands[output].firstVertex = selected.draw.y;
    commands[output].firstInstance = output;
    metadata[output].cluster = selected.draw.w;
    metadata[output].material = selected.draw.z;
    metadata[output].instance = u32(instances[instanceIndex].w);
    metadata[output].level = u32(selected.lod.z);
    metadata[output].translation = vec4<f32>(translation, 1.0);
}`;

class VirtualGeometryGPUHierarchy {
    constructor(device, visibility, options) {
        options = options || {};
        this.device = device && device.device ? device.device : device || null;
        this.visibility = visibility || null;
        this.geometry = options.geometry || null;
        this.pipeline = null;
        this.bindGroup = null;
        this.clusterBuffer = null;
        this.instanceBuffer = null;
        this.emittedBuffer = null;
        this.historyBuffer = null;
        this.requestBuffer = null;
        this.requestReadback = null;
        this.nodeCapacity = 0;
        this.invocationCapacity = 0;
        this.pageCapacity = 0;
        this.nodeCount = 0;
        this.instanceCount = 0;
        this.pageIds = [];
        this.signature = "";
        this.feedbackPending = null;
        this.stats = { frames: 0, hierarchyUploads: 0, residencyUploads: 0, uploadedBytes: 0, feedbackReads: 0, requestedPages: 0 };
    }
    setGeometry(geometry) { this.geometry = geometry; this.signature = ""; this.bindGroup = null; return this; }
    setVisibility(visibility) { this.visibility = visibility; this.bindGroup = null; return this; }
    destroyBuffer(name) { if (this[name] && this[name].destroy) this[name].destroy(); this[name] = null; }
    ensureBuffers(nodes, instances, pages, draws) {
        if (!this.device) return;
        var nodeCapacity = Math.max(1, nodes), invocationCapacity = Math.max(1, nodes * instances), pageCapacity = Math.max(1, pages);
        if (nodeCapacity > this.nodeCapacity) {
            this.destroyBuffer("clusterBuffer");
            this.clusterBuffer = this.device.createBuffer({ size: nodeCapacity * 80, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            this.nodeCapacity = nodeCapacity; this.bindGroup = null;
        }
        if (invocationCapacity > this.invocationCapacity) {
            this.destroyBuffer("emittedBuffer"); this.destroyBuffer("historyBuffer");
            this.emittedBuffer = this.device.createBuffer({ size: invocationCapacity * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            this.historyBuffer = this.device.createBuffer({ size: invocationCapacity * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            this.device.queue.writeBuffer(this.historyBuffer, 0, new Uint32Array(invocationCapacity));
            this.invocationCapacity = invocationCapacity; this.bindGroup = null;
        }
        if (!this.instanceBuffer || this.instanceBuffer.size < instances * 16) { this.destroyBuffer("instanceBuffer"); this.instanceBuffer = this.device.createBuffer({ size: Math.max(16, instances * 16), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }); this.bindGroup = null; }
        if (pageCapacity > this.pageCapacity) {
            this.destroyBuffer("requestBuffer"); this.destroyBuffer("requestReadback");
            this.requestBuffer = this.device.createBuffer({ size: pageCapacity * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
            this.requestReadback = this.device.createBuffer({ size: pageCapacity * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
            this.pageCapacity = pageCapacity; this.bindGroup = null;
        }
        this.visibility.ensureCapacity(Math.max(1, draws));
    }
    sync() {
        if (!this.device || !this.geometry || !this.visibility) return this;
        this.geometry.syncPages(); this.geometry.store.upload();
        var geometry = this.geometry, pageIds = Array.from(geometry.pages.keys()).sort(), pageMap = new Map;
        for (var pageIndex = 0; pageIndex < pageIds.length; pageIndex++) pageMap.set(pageIds[pageIndex], pageIndex);
        var instances = [];
        for (var sourceInstance = 0; sourceInstance < geometry.instances.length; sourceInstance++) if (geometry.instances[sourceInstance].visible) instances.push({ instance: geometry.instances[sourceInstance], sourceIndex: sourceInstance });
        this.nodeCount = geometry.clusters.length; this.instanceCount = instances.length; this.pageIds = pageIds;
        var signatureParts = [ this.nodeCount, this.instanceCount ];
        for (var page = 0; page < pageIds.length; page++) { var record = geometry.pageRecords.get(pageIds[page]); signatureParts.push(pageIds[page], record ? record.indexOffset : -1, geometry.resident(pageIds[page]) ? 1 : 0); }
        for (var instanceIndex = 0; instanceIndex < instances.length; instanceIndex++) signatureParts.push(instances[instanceIndex].sourceIndex, instances[instanceIndex].instance.position.x, instances[instanceIndex].instance.position.y, instances[instanceIndex].instance.position.z);
        var signature = signatureParts.join("|");
        var drawCapacity = Math.min(this.visibility.maxCandidates, Math.max(1, this.nodeCount * this.instanceCount));
        this.ensureBuffers(this.nodeCount, this.instanceCount, pageIds.length, drawCapacity);
        if (signature === this.signature) return this;
        var clusterData = new ArrayBuffer(this.nodeCount * 80), floats = new Float32Array(clusterData), uints = new Uint32Array(clusterData);
        for (var index = 0; index < this.nodeCount; index++) {
            var cluster = geometry.clusters[index], base = index * 20, record = geometry.pageRecords.get(cluster.pageId);
            floats[base] = cluster.center[0]; floats[base + 1] = cluster.center[1]; floats[base + 2] = cluster.center[2]; floats[base + 3] = cluster.radius;
            floats[base + 4] = cluster.axis[0]; floats[base + 5] = cluster.axis[1]; floats[base + 6] = cluster.axis[2]; floats[base + 7] = cluster.cosThetaMax;
            floats[base + 8] = cluster.err; floats[base + 9] = cluster.parent; floats[base + 10] = cluster.level; floats[base + 11] = cluster.cullable ? 1 : 0;
            uints[base + 12] = cluster.count; uints[base + 13] = record ? record.indexOffset + cluster.pageFirst : 0; uints[base + 14] = cluster.material; uints[base + 15] = cluster.id;
            uints[base + 16] = pageMap.get(cluster.pageId); uints[base + 17] = cluster.triangles; uints[base + 18] = record && geometry.resident(cluster.pageId) ? 1 : 0; uints[base + 19] = 0;
        }
        var instanceData = new Float32Array(this.instanceCount * 4);
        for (var instance = 0; instance < this.instanceCount; instance++) { instanceData[instance * 4] = instances[instance].instance.position.x; instanceData[instance * 4 + 1] = instances[instance].instance.position.y; instanceData[instance * 4 + 2] = instances[instance].instance.position.z; instanceData[instance * 4 + 3] = instances[instance].sourceIndex; }
        this.device.queue.writeBuffer(this.clusterBuffer, 0, clusterData); this.device.queue.writeBuffer(this.instanceBuffer, 0, instanceData);
        this.stats.hierarchyUploads++; this.stats.residencyUploads++; this.stats.uploadedBytes += clusterData.byteLength + instanceData.byteLength; this.signature = signature; this.bindGroup = null; return this;
    }
    ensurePipeline() {
        if (!this.device || !this.visibility) return;
        this.visibility.ensurePipelines();
        if (!this.pipeline) this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: virtualGeometryHierarchyWGSL }), entryPoint: "main" } });
        if (!this.bindGroup) {
            var depthView = this.visibility.hiz && this.visibility.hiz.fullview || this.visibility.fallbackDepth.createView();
            this.bindGroup = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
                { binding: 0, resource: { buffer: this.visibility.uniformBuffer } }, { binding: 1, resource: { buffer: this.clusterBuffer } },
                { binding: 2, resource: { buffer: this.instanceBuffer } }, { binding: 3, resource: { buffer: this.emittedBuffer } }, { binding: 4, resource: { buffer: this.historyBuffer } },
                { binding: 5, resource: { buffer: this.requestBuffer } }, { binding: 6, resource: { buffer: this.visibility.commandBuffer } }, { binding: 7, resource: { buffer: this.visibility.metadataBuffer } },
                { binding: 8, resource: { buffer: this.visibility.counterBuffer } }, { binding: 9, resource: depthView }
            ] });
        }
    }
    encode(encoder, camera, options) {
        options = options || {}; this.sync(); if (!this.device || !this.nodeCount || !this.instanceCount) return this;
        this.ensurePipeline();
        var data = this.visibility.cameraData(camera, options), fov = camera && camera.projectionMatrix ? 2 * Math.atan(1 / camera.projectionMatrix.elements[5]) : Math.PI / 3;
        data[52] = options.pixelError === undefined ? this.geometry.pixelError : options.pixelError;
        data[53] = Math.min(this.visibility.capacity, options.drawCallBudget || this.visibility.capacity);
        data[54] = options.triangleBudget === undefined ? 4294967040 : Math.min(4294967040, options.triangleBudget);
        data[55] = options.hysteresis === undefined ? this.geometry.hysteresis : options.hysteresis;
        this.visibility.uniformUint[56] = this.nodeCount; this.visibility.uniformUint[57] = this.instanceCount; this.visibility.uniformUint[58] = this.pageIds.length; this.visibility.uniformUint[59] = 0;
        data[42] = options.occlusion !== false && this.visibility.hiz && this.visibility.hiz.ready ? 1 : 0; data[43] = this.visibility.hiz ? this.visibility.hiz.levels : 1; data[46] = fov; data[51] = options.occlusionBias === undefined ? .00005 : options.occlusionBias;
        this.device.queue.writeBuffer(this.visibility.uniformBuffer, 0, data);
        encoder.clearBuffer(this.visibility.commandBuffer); encoder.clearBuffer(this.visibility.metadataBuffer); encoder.clearBuffer(this.visibility.counterBuffer); encoder.clearBuffer(this.emittedBuffer); encoder.clearBuffer(this.requestBuffer);
        var pass = encoder.beginComputePass({ label: "FXOM GPU hierarchy selection" }); pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup); pass.dispatchWorkgroups(Math.ceil(this.nodeCount * this.instanceCount / 64)); pass.end();
        this.visibility.candidateCount = Math.min(this.visibility.capacity, options.drawCallBudget || this.visibility.capacity); this.visibility.stats.candidates = this.nodeCount * this.instanceCount; this.visibility.stats.backend = "webgpu-hierarchy"; this.stats.frames++; return this;
    }
    async readRequests() {
        if (!this.device || !this.requestBuffer || this.feedbackPending) return this.feedbackPending || [];
        var self = this;
        this.feedbackPending = (async function() {
            var encoder = self.device.createCommandEncoder(); encoder.copyBufferToBuffer(self.requestBuffer, 0, self.requestReadback, 0, Math.max(4, self.pageIds.length * 4)); self.device.queue.submit([ encoder.finish() ]); await self.device.queue.onSubmittedWorkDone(); await self.requestReadback.mapAsync(GPUMapMode.READ);
            var flags = new Uint32Array(self.requestReadback.getMappedRange()).slice(), ids = []; self.requestReadback.unmap();
            for (var index = 0; index < self.pageIds.length; index++) if (flags[index]) ids.push(self.pageIds[index]);
            self.stats.feedbackReads++; self.stats.requestedPages += ids.length; self.feedbackPending = null; return ids;
        })();
        return this.feedbackPending;
    }
    async requestPages(context) { var ids = await this.readRequests(), promises = []; for (var index = 0; index < ids.length; index++) promises.push(this.geometry.requestPage(ids[index], context || { reason: "gpu-hierarchy" })); await Promise.all(promises); this.signature = ""; return ids; }
    report() { return { nodes: this.nodeCount, instances: this.instanceCount, pages: this.pageIds.length, stats: Object.assign({}, this.stats) }; }
    dispose() { var names = [ "clusterBuffer", "instanceBuffer", "emittedBuffer", "historyBuffer", "requestBuffer", "requestReadback" ]; for (var index = 0; index < names.length; index++) this.destroyBuffer(names[index]); this.pipeline = this.bindGroup = null; return this; }
}

export { VirtualGeometryGPUHierarchy, virtualGeometryHierarchyWGSL };
