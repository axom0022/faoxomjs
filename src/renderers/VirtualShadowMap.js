import { Matrix4, Vector3 } from "../math/index.js";

const virtualShadowFeedbackWGSL = `
struct FeedbackUniforms {
    inverseViewProjection: mat4x4<f32>,
    clipMatrices: array<mat4x4<f32>, 8>,
    misc: vec4<u32>,
    depth: vec4<f32>,
};
@group(0) @binding(0) var<uniform> uniforms: FeedbackUniforms;
@group(0) @binding(1) var cameraDepth: texture_depth_2d;
@group(0) @binding(2) var<storage, read_write> requests: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> weights: array<atomic<u32>>;
fn requestPage(level: u32, page: vec2<u32>, weight: u32) {
    let side = uniforms.misc.y;
    let index = level * side * side + page.y * side + page.x;
    atomicStore(&requests[index], 1u);
    atomicMax(&weights[index], weight);
}
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
    let dimensions = textureDimensions(cameraDepth);
    let stride = max(1u, uniforms.misc.z);
    let pixel = invocation.xy * stride;
    if (pixel.x >= dimensions.x || pixel.y >= dimensions.y) { return; }
    let depth = textureLoad(cameraDepth, vec2<i32>(pixel), 0);
    if ((uniforms.misc.w == 0u && depth >= 0.999999) || (uniforms.misc.w != 0u && depth <= 0.000001)) { return; }
    let uv = (vec2<f32>(pixel) + vec2<f32>(0.5)) / vec2<f32>(dimensions);
    let clip = vec4<f32>(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, depth * 2.0 - 1.0, 1.0);
    let worldH = uniforms.inverseViewProjection * clip;
    let world = worldH.xyz / worldH.w;
    let levels = min(uniforms.misc.x, 8u);
    for (var level = 0u; level < levels; level++) {
        let shadowH = uniforms.clipMatrices[level] * vec4<f32>(world, 1.0);
        let shadow = shadowH.xyz / shadowH.w;
        if (all(abs(shadow.xy) <= vec2<f32>(1.0)) && shadow.z >= -1.0 && shadow.z <= 1.0) {
            let shadowUV = shadow.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);
            let side = uniforms.misc.y;
            let page = min(vec2<u32>(shadowUV * f32(side)), vec2<u32>(side - 1u));
            let center = vec2<f32>(page) + vec2<f32>(0.5);
            let local = abs(shadowUV * f32(side) - center);
            let centerWeight = u32(max(0.0, 1024.0 - dot(local, local) * 512.0));
            let levelWeight = select((levels - level) * 4096u, 65535u, level + 1u == levels);
            requestPage(level, page, levelWeight + centerWeight);
            if (uniforms.depth.x > 0.5) {
                if (page.x > 0u) { requestPage(level, page - vec2<u32>(1u, 0u), 256u); }
                if (page.y > 0u) { requestPage(level, page - vec2<u32>(0u, 1u), 256u); }
                if (page.x + 1u < side) { requestPage(level, page + vec2<u32>(1u, 0u), 256u); }
                if (page.y + 1u < side) { requestPage(level, page + vec2<u32>(0u, 1u), 256u); }
            }
        }
    }
}`;

const virtualShadowCasterWGSL = `
struct PageUniform { pageProjection: mat4x4<f32> };
@group(0) @binding(0) var<uniform> page: PageUniform;
@group(1) @binding(0) var<storage, read> models: array<mat4x4<f32>>;
struct VertexOutput { @builtin(position) position: vec4<f32> };
@vertex
fn vertexMain(@location(0) position: vec3<f32>, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    var output: VertexOutput;
    output.position = page.pageProjection * models[instanceIndex] * vec4<f32>(position, 1.0);
    output.position.z = output.position.z * 0.5 + output.position.w * 0.5;
    return output;
}`;

const virtualShadowFXOMWGSL = `
struct PageUniform { pageProjection: mat4x4<f32> };
@group(0) @binding(0) var<uniform> page: PageUniform;
@group(1) @binding(0) var<storage, read> positions: array<f32>;
@group(1) @binding(1) var<storage, read> indices: array<u32>;
@group(1) @binding(2) var<storage, read> translations: array<vec4<f32>>;
struct VertexOutput { @builtin(position) position: vec4<f32> };
@vertex
fn vertexMain(@builtin(vertex_index) invocation: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let vertexIndex = indices[invocation];
    let base = vertexIndex * 3u;
    let position = vec3<f32>(positions[base], positions[base + 1u], positions[base + 2u]) + translations[instanceIndex].xyz;
    var output: VertexOutput;
    output.position = page.pageProjection * vec4<f32>(position, 1.0);
    output.position.z = output.position.z * 0.5 + output.position.w * 0.5;
    return output;
}`;

class VirtualShadowMap {
    constructor(device, options) {
        options = options || {};
        this.device = device && device.device ? device.device : device;
        if (!this.device) throw new Error("VirtualShadowMap requires a WebGPU device or renderer");
        this.pageSize = Math.max(32, options.pageSize || 128);
        this.pagesPerSide = Math.max(4, options.pagesPerSide || 64);
        this.clipLevels = Math.max(1, Math.min(8, options.clipLevels || 4));
        this.physicalPages = Math.max(1, Math.min(options.physicalPages || 128, this.device.limits && this.device.limits.maxTextureArrayLayers || 256));
        this.baseExtent = options.baseExtent || 32;
        this.depthRange = options.depthRange || 512;
        this.maxPagesPerFrame = options.maxPagesPerFrame || 16;
        this.feedbackStride = Math.max(1, options.feedbackStride || 2);
        this.reverseDepth = options.reverseDepth === true;
        this.totalVirtualPages = this.pagesPerSide * this.pagesPerSide * this.clipLevels;
        this.clipMatrices = [];
        this.resident = new Map;
        this.tileOwners = new Array(this.physicalPages).fill(-1);
        this.freeTiles = [];
        for (var tile = this.physicalPages - 1; tile >= 0; tile--) this.freeTiles.push(tile);
        this.tableData = new Uint32Array(this.totalVirtualPages);
        this.frame = 0;
        this.casters = [];
        this.fxomCasters = [];
        this.feedbackPipeline = null;
        this.feedbackBindGroup = null;
        this.feedbackDepthView = null;
        this.casterPipeline = null;
        this.fxomPipeline = null;
        this.feedbackUniform = null;
        this.requestBuffer = null;
        this.weightBuffer = null;
        this.feedbackReadback = null;
        this.pageUniforms = [];
        this.pageBinds = [];
        this.modelBuffer = null;
        this.modelBind = null;
        this.pendingFeedback = null;
        this.stats = { frames: 0, feedbackDispatches: 0, feedbackReads: 0, requested: 0, rendered: 0, allocated: 0, evicted: 0, cacheHits: 0, dirtyPages: 0, casterDraws: 0 };
        this.createResources();
    }
    createResources() {
        var device = this.device;
        this.physicalTexture = device.createTexture({ size: [ this.pageSize, this.pageSize, this.physicalPages ], dimension: "2d", format: "depth32float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
        this.physicalView = this.physicalTexture.createView({ dimension: "2d-array" });
        this.pageTableTexture = device.createTexture({ size: [ this.pagesPerSide, this.pagesPerSide, this.clipLevels ], dimension: "2d", format: "r32uint", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
        this.pageTableView = this.pageTableTexture.createView({ dimension: "2d-array" });
        this.comparisonSampler = device.createSampler({ compare: "less-equal", magFilter: "linear", minFilter: "linear" });
        this.feedbackUniform = device.createBuffer({ size: 640, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.requestBuffer = device.createBuffer({ size: this.totalVirtualPages * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        this.weightBuffer = device.createBuffer({ size: this.totalVirtualPages * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        this.feedbackReadback = device.createBuffer({ size: this.totalVirtualPages * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        for (var slot = 0; slot < this.maxPagesPerFrame; slot++) this.pageUniforms.push(device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
        this.flushPageTable();
    }
    pageId(level, x, y) { return level * this.pagesPerSide * this.pagesPerSide + y * this.pagesPerSide + x; }
    pageFromId(id) { var perLevel = this.pagesPerSide * this.pagesPerSide, level = Math.floor(id / perLevel), local = id - level * perLevel; return { id: id, level: level, x: local % this.pagesPerSide, y: Math.floor(local / this.pagesPerSide) }; }
    resolveLightDirection(light) {
        if (light && light.direction) return (light.direction.clone ? light.direction.clone() : new Vector3(light.direction[0], light.direction[1], light.direction[2])).normalize();
        if (light && light.position) {
            var position = light.position, target = light.target && light.target.position || new Vector3;
            return (new Vector3).subVectors(target, position).normalize();
        }
        return new Vector3(-.5, -1, -.3).normalize();
    }
    configure(camera, light) {
        var direction = this.resolveLightDirection(light), center = camera && camera.position ? camera.position.clone() : new Vector3, up = Math.abs(direction.y) > .95 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
        this.clipMatrices.length = 0;
        for (var level = 0; level < this.clipLevels; level++) {
            var extent = this.baseExtent * Math.pow(2, level), eye = center.clone().addScaledVector(direction, -this.depthRange * .5);
            var view = (new Matrix4).lookAt(eye, center, up).invert();
            var projection = (new Matrix4).makeOrthographic(-extent, extent, extent, -extent, .1, this.depthRange);
            this.clipMatrices.push((new Matrix4).multiplyMatrices(projection, view));
        }
        return this;
    }
    pageProjection(page) {
        var side = this.pagesPerSide, crop = new Matrix4;
        crop.set(side, 0, 0, side - page.x * 2 - 1, 0, side, 0, -side + page.y * 2 + 1, 0, 0, 1, 0, 0, 0, 0, 1);
        return crop.multiply(this.clipMatrices[page.level]);
    }
    ensureFeedback(depthView) {
        if (!this.feedbackPipeline) this.feedbackPipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: virtualShadowFeedbackWGSL }), entryPoint: "main" } });
        if (!this.feedbackBindGroup || this.feedbackDepthView !== depthView) {
            this.feedbackBindGroup = this.device.createBindGroup({ layout: this.feedbackPipeline.getBindGroupLayout(0), entries: [ { binding: 0, resource: { buffer: this.feedbackUniform } }, { binding: 1, resource: depthView }, { binding: 2, resource: { buffer: this.requestBuffer } }, { binding: 3, resource: { buffer: this.weightBuffer } } ] });
            this.feedbackDepthView = depthView;
        }
    }
    encodeFeedback(encoder, cameraDepthView, camera, light, options) {
        options = options || {}; this.configure(camera, light); this.ensureFeedback(cameraDepthView);
        var viewProjection = (new Matrix4).multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), inverse = viewProjection.clone().invert();
        var data = new Float32Array(160), uints = new Uint32Array(data.buffer); data.set(inverse.elements, 0);
        for (var level = 0; level < this.clipLevels; level++) data.set(this.clipMatrices[level].elements, 16 + level * 16);
        uints[144] = this.clipLevels; uints[145] = this.pagesPerSide; uints[146] = options.feedbackStride || this.feedbackStride; uints[147] = options.reverseDepth === undefined ? (this.reverseDepth ? 1 : 0) : options.reverseDepth ? 1 : 0;
        data[148] = options.neighborPages === false ? 0 : 1;
        this.device.queue.writeBuffer(this.feedbackUniform, 0, data);
        encoder.clearBuffer(this.requestBuffer); encoder.clearBuffer(this.weightBuffer);
        var pass = encoder.beginComputePass({ label: "virtual shadow feedback" }); pass.setPipeline(this.feedbackPipeline); pass.setBindGroup(0, this.feedbackBindGroup);
        var width = options.width || cameraDepthView.width || options.viewportWidth || 1, height = options.height || cameraDepthView.height || options.viewportHeight || 1, stride = options.feedbackStride || this.feedbackStride;
        pass.dispatchWorkgroups(Math.ceil(width / stride / 8), Math.ceil(height / stride / 8)); pass.end(); this.stats.feedbackDispatches++; return this;
    }
    feedback(cameraDepthView, camera, light, options) { var encoder = this.device.createCommandEncoder({ label: "virtual shadow feedback" }); this.encodeFeedback(encoder, cameraDepthView, camera, light, options); this.device.queue.submit([ encoder.finish() ]); this.frame++; this.stats.frames++; return this; }
    async readFeedback() {
        if (this.pendingFeedback) return this.pendingFeedback;
        var self = this;
        this.pendingFeedback = (async function() {
            var encoder = self.device.createCommandEncoder(); encoder.copyBufferToBuffer(self.requestBuffer, 0, self.feedbackReadback, 0, self.totalVirtualPages * 4); encoder.copyBufferToBuffer(self.weightBuffer, 0, self.feedbackReadback, self.totalVirtualPages * 4, self.totalVirtualPages * 4); self.device.queue.submit([ encoder.finish() ]);
            await self.device.queue.onSubmittedWorkDone(); await self.feedbackReadback.mapAsync(GPUMapMode.READ);
            var values = new Uint32Array(self.feedbackReadback.getMappedRange()), result = [];
            for (var id = 0; id < self.totalVirtualPages; id++) if (values[id]) result.push(Object.assign(self.pageFromId(id), { weight: values[self.totalVirtualPages + id] }));
            self.feedbackReadback.unmap(); result.sort(function(a, b) { return b.weight - a.weight || a.level - b.level || a.id - b.id; }); self.stats.feedbackReads++; self.stats.requested += result.length; self.pendingFeedback = null; return result;
        })();
        return this.pendingFeedback;
    }
    allocate(page) {
        var existing = this.resident.get(page.id);
        if (existing) { existing.lastUsed = this.frame; existing.weight = page.weight; this.stats.cacheHits++; return existing; }
        var tile = this.freeTiles.length ? this.freeTiles.pop() : -1;
        if (tile < 0) {
            var candidates = Array.from(this.resident.values()).filter(function(entry) { return !entry.pinned; });
            candidates.sort(function(a, b) { return a.lastUsed - b.lastUsed || a.weight - b.weight || a.id - b.id; });
            if (!candidates.length) return null;
            var victim = candidates[0]; tile = victim.tile; this.resident.delete(victim.id); this.tableData[victim.id] = 0; this.stats.evicted++;
        }
        var entry = Object.assign({}, page, { tile: tile, lastUsed: this.frame, dirty: true, pinned: page.pinned === true }); this.resident.set(page.id, entry); this.tileOwners[tile] = page.id; this.tableData[page.id] = tile + 1; this.stats.allocated++; return entry;
    }
    schedule(requests, maxPages) {
        maxPages = maxPages === undefined ? this.maxPagesPerFrame : Math.max(0, maxPages); var pages = [];
        for (var index = 0; index < requests.length; index++) {
            var existing = this.resident.get(requests[index].id);
            if (existing && !existing.dirty) { existing.lastUsed = this.frame; existing.weight = requests[index].weight; this.stats.cacheHits++; continue; }
            if (pages.length >= maxPages) continue;
            var entry = existing || this.allocate(requests[index]); if (entry) pages.push(entry);
        }
        return pages;
    }
    invalidate(bounds) {
        var count = 0, ranges = null;
        if (bounds && bounds.min && bounds.max && this.clipMatrices.length) {
            ranges = [];
            for (var level = 0; level < this.clipLevels; level++) {
                var matrix = this.clipMatrices[level].elements, minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
                for (var corner = 0; corner < 8; corner++) {
                    var x = corner & 1 ? bounds.max.x : bounds.min.x, y = corner & 2 ? bounds.max.y : bounds.min.y, z = corner & 4 ? bounds.max.z : bounds.min.z;
                    var w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15] || 1;
                    var nx = (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w, ny = (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w;
                    var u = nx * .5 + .5, v = .5 - ny * .5; if (u < minx) minx = u; if (u > maxx) maxx = u; if (v < miny) miny = v; if (v > maxy) maxy = v;
                }
                ranges.push({ minx: Math.max(0, Math.floor(minx * this.pagesPerSide)), miny: Math.max(0, Math.floor(miny * this.pagesPerSide)), maxx: Math.min(this.pagesPerSide - 1, Math.floor(maxx * this.pagesPerSide)), maxy: Math.min(this.pagesPerSide - 1, Math.floor(maxy * this.pagesPerSide)) });
            }
        }
        this.resident.forEach(function(entry) {
            if (bounds && bounds.levels && bounds.levels.indexOf(entry.level) < 0) return;
            var range = ranges && ranges[entry.level]; if (range && (entry.x < range.minx || entry.x > range.maxx || entry.y < range.miny || entry.y > range.maxy)) return;
            entry.dirty = true; count++;
        });
        this.stats.dirtyPages += count; return count;
    }
    pin(level, x, y, pinned) { var entry = this.resident.get(this.pageId(level, x, y)); if (!entry) return false; entry.pinned = pinned !== false; return true; }
    flushPageTable() {
        var rowBytes = this.pagesPerSide * 4, padded = Math.ceil(rowBytes / 256) * 256;
        for (var level = 0; level < this.clipLevels; level++) {
            var source = this.tableData.subarray(level * this.pagesPerSide * this.pagesPerSide, (level + 1) * this.pagesPerSide * this.pagesPerSide), upload;
            if (padded === rowBytes) upload = source; else { upload = new Uint8Array(padded * this.pagesPerSide); var bytes = new Uint8Array(source.buffer, source.byteOffset, source.byteLength); for (var row = 0; row < this.pagesPerSide; row++) upload.set(bytes.subarray(row * rowBytes, row * rowBytes + rowBytes), row * padded); }
            this.device.queue.writeTexture({ texture: this.pageTableTexture, origin: { x: 0, y: 0, z: level } }, upload, { bytesPerRow: padded, rowsPerImage: this.pagesPerSide }, [ this.pagesPerSide, this.pagesPerSide, 1 ]);
        }
        return this;
    }
    addCaster(object) { if (this.casters.indexOf(object) < 0) this.casters.push(object); return this; }
    addFXOMCaster(fxom) { if (this.fxomCasters.indexOf(fxom) < 0) this.fxomCasters.push(fxom); return this; }
    removeCaster(object) { var index = this.casters.indexOf(object); if (index >= 0) this.casters.splice(index, 1); index = this.fxomCasters.indexOf(object); if (index >= 0) this.fxomCasters.splice(index, 1); return this; }
    uploadCaster(caster) {
        var geometry = caster.geometry || caster; if (!geometry || !geometry.attributes || !geometry.attributes.position) return null;
        var version = geometry.version || 0;
        if (!caster.__vsm || caster.__vsm.version !== version) {
            if (caster.__vsm) { caster.__vsm.position.destroy(); if (caster.__vsm.index) caster.__vsm.index.destroy(); }
            var positions = geometry.attributes.position.array || geometry.attributes.position, indices = geometry.index && (geometry.index.array || geometry.index);
            var record = { version: version, position: this.device.createBuffer({ size: Math.max(16, positions.byteLength), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST }), index: null, count: indices ? indices.length : positions.length / 3, indexed: !!indices };
            this.device.queue.writeBuffer(record.position, 0, positions);
            if (indices) { var index32 = indices instanceof Uint32Array ? indices : new Uint32Array(indices); record.index = this.device.createBuffer({ size: Math.max(16, index32.byteLength), usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST }); this.device.queue.writeBuffer(record.index, 0, index32); }
            caster.__vsm = record;
        }
        return caster.__vsm;
    }
    ensureCasterPipelines(casterCount) {
        if (!this.casterPipeline) {
            var module = this.device.createShaderModule({ code: virtualShadowCasterWGSL });
            this.casterPipeline = this.device.createRenderPipeline({ layout: "auto", vertex: { module: module, entryPoint: "vertexMain", buffers: [ { arrayStride: 12, attributes: [ { shaderLocation: 0, offset: 0, format: "float32x3" } ] } ] }, primitive: { topology: "triangle-list", cullMode: "back" }, depthStencil: { format: "depth32float", depthWriteEnabled: true, depthCompare: "less" } });
        }
        if (!this.fxomPipeline) { var fxomModule = this.device.createShaderModule({ code: virtualShadowFXOMWGSL }); this.fxomPipeline = this.device.createRenderPipeline({ layout: "auto", vertex: { module: fxomModule, entryPoint: "vertexMain" }, primitive: { topology: "triangle-list", cullMode: "back" }, depthStencil: { format: "depth32float", depthWriteEnabled: true, depthCompare: "less" } }); }
        if (!this.modelBuffer || this.modelBuffer.size < Math.max(64, casterCount * 64)) { if (this.modelBuffer) this.modelBuffer.destroy(); this.modelBuffer = this.device.createBuffer({ size: Math.max(64, casterCount * 64), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }); this.modelBind = null; }
        if (!this.modelBind) this.modelBind = this.device.createBindGroup({ layout: this.casterPipeline.getBindGroupLayout(1), entries: [ { binding: 0, resource: { buffer: this.modelBuffer } } ] });
        if (!this.pageBinds.length) for (var slot = 0; slot < this.pageUniforms.length; slot++) this.pageBinds.push(this.device.createBindGroup({ layout: this.casterPipeline.getBindGroupLayout(0), entries: [ { binding: 0, resource: { buffer: this.pageUniforms[slot] } } ] }));
    }
    renderPages(pages) {
        if (!pages.length) return this;
        this.ensureCasterPipelines(this.casters.length || 1);
        var modelData = new Float32Array(Math.max(16, this.casters.length * 16));
        for (var model = 0; model < this.casters.length; model++) { var matrix = this.casters[model].matrixWorld || this.casters[model].matrix || new Matrix4; modelData.set(matrix.elements || matrix, model * 16); }
        this.device.queue.writeBuffer(this.modelBuffer, 0, modelData);
        var count = Math.min(pages.length, this.pageUniforms.length), encoder = this.device.createCommandEncoder({ label: "virtual shadow page rendering" });
        for (var index = 0; index < count; index++) {
            var page = pages[index], projection = this.pageProjection(page), matrixData = new Float32Array(16); matrixData.set(projection.elements); this.device.queue.writeBuffer(this.pageUniforms[index], 0, matrixData);
            var layerView = this.physicalTexture.createView({ dimension: "2d", baseArrayLayer: page.tile, arrayLayerCount: 1 });
            var pass = encoder.beginRenderPass({ label: "virtual shadow page", colorAttachments: [], depthStencilAttachment: { view: layerView, depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" } });
            if (this.casters.length) { pass.setPipeline(this.casterPipeline); pass.setBindGroup(0, this.pageBinds[index]); pass.setBindGroup(1, this.modelBind); for (var casterIndex = 0; casterIndex < this.casters.length; casterIndex++) { var record = this.uploadCaster(this.casters[casterIndex]); if (!record) continue; pass.setVertexBuffer(0, record.position); if (record.index) { pass.setIndexBuffer(record.index, "uint32"); pass.drawIndexed(record.count, 1, 0, 0, casterIndex); } else pass.draw(record.count, 1, 0, casterIndex); this.stats.casterDraws++; } }
            for (var fxomIndex = 0; fxomIndex < this.fxomCasters.length; fxomIndex++) {
                var fxom = this.fxomCasters[fxomIndex]; fxom.syncPages(); fxom.store.upload();
                var selectedRecord = null;
                for (var level = 0; level < fxom.levelRanges.length; level++) { var candidate = fxom.pageRecords.get(fxom.id + ":level:" + level); if (candidate) { selectedRecord = candidate; break; } }
                if (!selectedRecord || !fxom.store.buffers.positions || !fxom.store.buffers.indices) continue;
                var translations = new Float32Array(Math.max(4, fxom.instances.length * 4)); for (var instance = 0; instance < fxom.instances.length; instance++) { translations[instance * 4] = fxom.instances[instance].position.x; translations[instance * 4 + 1] = fxom.instances[instance].position.y; translations[instance * 4 + 2] = fxom.instances[instance].position.z; translations[instance * 4 + 3] = 1; }
                if (!fxom.__vsmInstances || fxom.__vsmInstances.size < translations.byteLength) { if (fxom.__vsmInstances) fxom.__vsmInstances.destroy(); fxom.__vsmInstances = this.device.createBuffer({ size: Math.max(16, translations.byteLength), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }); fxom.__vsmBind = null; }
                this.device.queue.writeBuffer(fxom.__vsmInstances, 0, translations);
                if (!fxom.__vsmBind) fxom.__vsmBind = this.device.createBindGroup({ layout: this.fxomPipeline.getBindGroupLayout(1), entries: [ { binding: 0, resource: { buffer: fxom.store.buffers.positions } }, { binding: 1, resource: { buffer: fxom.store.buffers.indices } }, { binding: 2, resource: { buffer: fxom.__vsmInstances } } ] });
                var fxomPageBind = this.device.createBindGroup({ layout: this.fxomPipeline.getBindGroupLayout(0), entries: [ { binding: 0, resource: { buffer: this.pageUniforms[index] } } ] });
                pass.setPipeline(this.fxomPipeline); pass.setBindGroup(0, fxomPageBind); pass.setBindGroup(1, fxom.__vsmBind); pass.draw(selectedRecord.indexCount, fxom.instances.length, selectedRecord.indexOffset, 0); this.stats.casterDraws++;
            }
            pass.end(); page.dirty = false; page.lastUsed = this.frame; this.stats.rendered++;
        }
        this.device.queue.submit([ encoder.finish() ]); this.flushPageTable(); return this;
    }
    async updateFromFeedback(maxPages) { var requests = await this.readFeedback(), pages = this.schedule(requests, maxPages); this.renderPages(pages); return { requests: requests, pages: pages }; }
    bindings() { return { pageTable: this.pageTableView, physicalPages: this.physicalView, sampler: this.comparisonSampler, clipMatrices: this.clipMatrices }; }
    sampleWGSL(name) {
        name = name || "virtualShadow";
        return `fn ${name}(world: vec3<f32>, bias: f32) -> f32 { for (var level = 0u; level < ${this.clipLevels}u; level++) { let h = shadowClip[level] * vec4<f32>(world, 1.0); let p = h.xyz / h.w; if (all(abs(p.xy) <= vec2<f32>(1.0))) { let uv = p.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5); let side = ${this.pagesPerSide}u; let page = min(vec2<u32>(uv * f32(side)), vec2<u32>(side - 1u)); let entry = textureLoad(shadowPageTable, vec2<i32>(page), i32(level), 0).r; if (entry != 0u) { let local = fract(uv * f32(side)); return textureSampleCompareLevel(shadowPhysical, shadowSampler, local, i32(entry - 1u), p.z * 0.5 + 0.5 - bias); } } } return 1.0; }`;
    }
    report() { return { pageSize: this.pageSize, pagesPerSide: this.pagesPerSide, clipLevels: this.clipLevels, physicalPages: this.physicalPages, residentPages: this.resident.size, freePages: this.freeTiles.length, stats: Object.assign({}, this.stats) }; }
    dispose() {
        for (var caster = 0; caster < this.casters.length; caster++) if (this.casters[caster].__vsm) { this.casters[caster].__vsm.position.destroy(); if (this.casters[caster].__vsm.index) this.casters[caster].__vsm.index.destroy(); this.casters[caster].__vsm = null; }
        for (var fxom = 0; fxom < this.fxomCasters.length; fxom++) { if (this.fxomCasters[fxom].__vsmInstances) this.fxomCasters[fxom].__vsmInstances.destroy(); this.fxomCasters[fxom].__vsmInstances = null; this.fxomCasters[fxom].__vsmBind = null; }
        this.casters.length = 0; this.fxomCasters.length = 0;
        var buffers = [ "feedbackUniform", "requestBuffer", "weightBuffer", "feedbackReadback", "modelBuffer" ]; for (var index = 0; index < buffers.length; index++) if (this[buffers[index]]) this[buffers[index]].destroy();
        for (var page = 0; page < this.pageUniforms.length; page++) this.pageUniforms[page].destroy(); if (this.physicalTexture) this.physicalTexture.destroy(); if (this.pageTableTexture) this.pageTableTexture.destroy();
        this.physicalTexture = this.pageTableTexture = this.feedbackPipeline = this.casterPipeline = this.fxomPipeline = null; this.resident.clear(); return this;
    }
}

export { VirtualShadowMap, virtualShadowCasterWGSL, virtualShadowFXOMWGSL, virtualShadowFeedbackWGSL };
