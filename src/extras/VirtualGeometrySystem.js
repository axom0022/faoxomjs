import { MeshletSet } from "./MeshletSet.js";

import { GeometryPageCodec, RuntimeGeometryCache } from "./CompressedGeometryPage.js";

import { GPUResidencyManager2 } from "./GPUResidencyManager2.js";

class VirtualGeometryAsset {
    constructor(id, options) {
        options = options || {};
        this.id = id;
        this.maxVertices = options.maxVertices || 96;
        this.maxTriangles = options.maxTriangles || 192;
        this.levels = [];
        this.nodes = [];
        this.roots = [];
        this.pages = new Map;
        this.built = false;
        this.stats = { levels: 0, nodes: 0, roots: 0, triangles: 0, pages: 0, compressedBytes: 0, sourceBytes: 0 };
    }
    addLevel(geometry, error, options) {
        if (this.built) throw new Error("VirtualGeometryAsset cannot add levels after build");
        options = options || {};
        this.levels.push({ geometry: geometry, error: Math.max(0, error || 0), material: options.material || 0, pageId: options.pageId || this.id + ":" + this.levels.length });
        return this;
    }
    build() {
        if (!this.levels.length) throw new Error("VirtualGeometryAsset requires at least one level");
        this.levels.sort(function(a, b) { return b.error - a.error; });
        this.nodes.length = 0;
        this.pages.clear();
        var levelnodes = [];
        for (var level = 0; level < this.levels.length; level++) {
            var source = this.levels[level];
            var meshlets = new MeshletSet(source.geometry, { maxVertices: this.maxVertices, maxTriangles: this.maxTriangles });
            var page = GeometryPageCodec.encode(meshlets.geometry || source.geometry);
            this.pages.set(source.pageId, { id: source.pageId, level: level, encoded: page, geometry: meshlets.geometry || source.geometry, resident: false, handle: null });
            this.stats.compressedBytes += page.byteLength;
            var positions = source.geometry.attributes.position.array;
            var indices = source.geometry.index && (source.geometry.index.array || source.geometry.index);
            var attributes = Object.keys(source.geometry.attributes);
            for (var attributeindex = 0; attributeindex < attributes.length; attributeindex++) {
                var attribute = source.geometry.attributes[attributes[attributeindex]];
                if (attribute && attribute.array) this.stats.sourceBytes += attribute.array.byteLength;
            }
            if (indices) this.stats.sourceBytes += indices.byteLength;
            var nodes = [];
            for (var index = 0; index < meshlets.meshlets.length; index++) {
                var meshlet = meshlets.meshlets[index];
                var node = {
                    id: this.nodes.length,
                    level: level,
                    meshlet: index,
                    pageId: source.pageId,
                    parent: -1,
                    children: [],
                    center: meshlet.center.slice(),
                    radius: meshlet.radius,
                    axis: meshlet.axis.slice(),
                    cosThetaMax: meshlet.cosThetaMax,
                    cullable: meshlet.cullable,
                    first: meshlet.first,
                    count: meshlet.count,
                    triangles: meshlet.triangles,
                    material: source.material,
                    error: source.error
                };
                this.nodes.push(node);
                nodes.push(node);
                this.stats.triangles += level === this.levels.length - 1 ? node.triangles : 0;
            }
            levelnodes.push(nodes);
        }
        this.roots = levelnodes[0].map(function(node) { return node.id; });
        for (var childlevel = 1; childlevel < levelnodes.length; childlevel++) {
            var parents = levelnodes[childlevel - 1];
            var children = levelnodes[childlevel];
            for (var childindex = 0; childindex < children.length; childindex++) {
                var child = children[childindex];
                var best = null;
                var bestscore = Infinity;
                for (var parentindex = 0; parentindex < parents.length; parentindex++) {
                    var parent = parents[parentindex];
                    var dx = child.center[0] - parent.center[0], dy = child.center[1] - parent.center[1], dz = child.center[2] - parent.center[2];
                    var distance = dx * dx + dy * dy + dz * dz;
                    var containment = Math.sqrt(distance) + child.radius <= parent.radius * 1.25 ? 0 : parent.radius;
                    var score = distance + containment * containment;
                    if (score < bestscore) {
                        bestscore = score;
                        best = parent;
                    }
                }
                if (best) {
                    child.parent = best.id;
                    best.children.push(child.id);
                } else this.roots.push(child.id);
            }
        }
        this.built = true;
        this.stats.levels = this.levels.length;
        this.stats.nodes = this.nodes.length;
        this.stats.roots = this.roots.length;
        this.stats.pages = this.pages.size;
        return this;
    }
    page(id) {
        return this.pages.get(id) || null;
    }
    report() {
        return { id: this.id, built: this.built, stats: Object.assign({}, this.stats) };
    }
}

class GeometryPageResidency {
    constructor(options) {
        options = options || {};
        this.manager = options.manager || new GPUResidencyManager2({ budgetBytes: options.budgetBytes || 512 * 1024 * 1024 });
        this.cache = options.cache || new RuntimeGeometryCache({ maxBytes: options.cacheBytes || 256 * 1024 * 1024 });
        this.uploadPage = typeof options.uploadPage === "function" ? options.uploadPage : null;
        this.pages = new Map;
        this.stats = { registered: 0, requests: 0, decoded: 0, uploaded: 0, misses: 0 };
    }
    registerAsset(asset) {
        var self = this;
        asset.pages.forEach(function(page) {
            if (self.pages.has(page.id)) throw new Error("GeometryPageResidency duplicate page " + page.id);
            self.pages.set(page.id, page);
            self.manager.register(page.id, {
                category: "geometry-page",
                bytes: page.encoded.byteLength,
                importance: 1,
                load: async function(context) {
                    var decoded = await self.cache.getOrCreate(page.id, function() { return GeometryPageCodec.decode(page.encoded); });
                    self.stats.decoded++;
                    var handle = self.uploadPage ? await self.uploadPage(decoded, page, context) : decoded;
                    if (self.uploadPage) self.stats.uploaded++;
                    page.resident = true;
                    page.handle = handle;
                    return handle;
                },
                unload: function(handle) {
                    if (handle && typeof handle.dispose === "function") handle.dispose();
                    if (handle && typeof handle.destroy === "function") handle.destroy();
                    page.resident = false;
                    page.handle = null;
                }
            });
            self.stats.registered++;
        });
        return this;
    }
    resident(id) {
        var page = this.pages.get(id);
        return !!(page && page.resident);
    }
    request(id, context) {
        if (!this.pages.has(id)) {
            this.stats.misses++;
            return Promise.resolve(null);
        }
        this.stats.requests++;
        return this.manager.makeResident(id, context);
    }
    touch(id, values) {
        return this.manager.touch(id, values);
    }
    update() {
        this.manager.update();
        return this;
    }
    report() {
        return { pages: this.pages.size, residency: this.manager.report(), cache: this.cache.report(), stats: Object.assign({}, this.stats) };
    }
}

class VirtualGeometrySelector {
    constructor(options) {
        options = options || {};
        this.pixelError = options.pixelError === undefined ? 1 : options.pixelError;
        this.maxClusters = options.maxClusters || 65536;
        this.maxTriangles = options.maxTriangles || Infinity;
        this.hysteresis = options.hysteresis || .15;
        this.last = new Map;
        this.selected = [];
        this.requests = [];
        this.stats = { visited: 0, selected: 0, triangles: 0, frustumCulled: 0, coneCulled: 0, budgetCulled: 0, pageRequests: 0 };
    }
    sphereVisible(node, planes) {
        if (!planes) return true;
        for (var index = 0; index < 6; index++) if (planes[index * 4] * node.center[0] + planes[index * 4 + 1] * node.center[1] + planes[index * 4 + 2] * node.center[2] + planes[index * 4 + 3] < -node.radius) return false;
        return true;
    }
    coneVisible(node, camera) {
        if (!node.cullable) return true;
        var dx = camera[0] - node.center[0], dy = camera[1] - node.center[1], dz = camera[2] - node.center[2];
        var length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dx /= length;
        dy /= length;
        dz /= length;
        var cosine = dx * node.axis[0] + dy * node.axis[1] + dz * node.axis[2];
        var sine = Math.sqrt(Math.max(0, 1 - cosine * cosine));
        var conesine = Math.sqrt(Math.max(0, 1 - node.cosThetaMax * node.cosThetaMax));
        var bound = cosine * node.cosThetaMax + sine * conesine;
        return !(cosine < node.cosThetaMax && bound < -1e-6 && length * -bound >= node.radius);
    }
    projectedError(node, camera, viewportHeight, fov) {
        var dx = camera[0] - node.center[0], dy = camera[1] - node.center[1], dz = camera[2] - node.center[2];
        var distance = Math.max(node.radius, Math.sqrt(dx * dx + dy * dy + dz * dz));
        var scale = viewportHeight / Math.max(.001, 2 * Math.tan(fov * Math.PI / 360));
        return node.error * scale / distance;
    }
    select(asset, options) {
        if (!asset.built) asset.build();
        options = options || {};
        var camera = options.camera || [ 0, 0, 0 ];
        if (camera.position) camera = [ camera.position.x, camera.position.y, camera.position.z ];
        var planes = options.planes || null;
        var viewportHeight = options.viewportHeight || 1080;
        var fov = options.fov || 60;
        var residency = options.residency || null;
        var pixelError = options.pixelError === undefined ? this.pixelError : options.pixelError;
        var stack = asset.roots.slice();
        this.selected.length = 0;
        this.requests.length = 0;
        this.stats.visited = 0;
        this.stats.selected = 0;
        this.stats.triangles = 0;
        this.stats.frustumCulled = 0;
        this.stats.coneCulled = 0;
        this.stats.budgetCulled = 0;
        this.stats.pageRequests = 0;
        while (stack.length) {
            var id = stack.pop();
            var node = asset.nodes[id];
            this.stats.visited++;
            if (!this.sphereVisible(node, planes)) {
                this.stats.frustumCulled++;
                continue;
            }
            if (!this.coneVisible(node, camera)) {
                this.stats.coneCulled++;
                continue;
            }
            var projected = this.projectedError(node, camera, viewportHeight, fov);
            var wasrefined = this.last.get(id) === true;
            var threshold = pixelError * (wasrefined ? 1 - this.hysteresis : 1 + this.hysteresis);
            var refine = node.children.length > 0 && projected > threshold;
            if (refine) {
                var childrenready = true;
                for (var childcheck = 0; childcheck < node.children.length; childcheck++) {
                    var child = asset.nodes[node.children[childcheck]];
                    if (residency && !residency.resident(child.pageId)) {
                        childrenready = false;
                        if (this.requests.indexOf(child.pageId) < 0) this.requests.push(child.pageId);
                    }
                }
                if (childrenready) {
                    this.last.set(id, true);
                    for (var childindex = 0; childindex < node.children.length; childindex++) stack.push(node.children[childindex]);
                    continue;
                }
            }
            this.last.set(id, false);
            if (residency && !residency.resident(node.pageId)) {
                if (this.requests.indexOf(node.pageId) < 0) this.requests.push(node.pageId);
                continue;
            }
            if (this.selected.length >= this.maxClusters || this.stats.triangles + node.triangles > this.maxTriangles) {
                this.stats.budgetCulled++;
                continue;
            }
            this.selected.push(node);
            this.stats.triangles += node.triangles;
        }
        this.stats.selected = this.selected.length;
        this.stats.pageRequests = this.requests.length;
        return { selected: this.selected, requests: this.requests, stats: this.stats };
    }
    requestPages(residency, context) {
        var promises = [];
        for (var index = 0; index < this.requests.length; index++) promises.push(residency.request(this.requests[index], context));
        return Promise.all(promises);
    }
}

class VertexPullingStore {
    constructor(device, options) {
        options = options || {};
        this.device = device || null;
        this.vertexCapacity = Math.max(1024, options.vertexCapacity || 65536);
        this.indexCapacity = Math.max(1024, options.indexCapacity || 196608);
        this.positions = new Float32Array(this.vertexCapacity * 3);
        this.normals = new Float32Array(this.vertexCapacity * 3);
        this.uvs = new Float32Array(this.vertexCapacity * 2);
        this.indices = new Uint32Array(this.indexCapacity);
        this.vertexCount = 0;
        this.indexCount = 0;
        this.pages = new Map;
        this.buffers = Object.create(null);
        this.dirty = false;
        this.stats = { pages: 0, vertices: 0, indices: 0, uploads: 0, uploadedBytes: 0, resizes: 0, compactions: 0 };
    }
    ensure(vertices, indices) {
        var resized = false;
        if (vertices > this.vertexCapacity) {
            var vertexcapacity = this.vertexCapacity;
            while (vertexcapacity < vertices) vertexcapacity *= 2;
            var positions = new Float32Array(vertexcapacity * 3), normals = new Float32Array(vertexcapacity * 3), uvs = new Float32Array(vertexcapacity * 2);
            positions.set(this.positions);
            normals.set(this.normals);
            uvs.set(this.uvs);
            this.positions = positions;
            this.normals = normals;
            this.uvs = uvs;
            this.vertexCapacity = vertexcapacity;
            resized = true;
        }
        if (indices > this.indexCapacity) {
            var indexcapacity = this.indexCapacity;
            while (indexcapacity < indices) indexcapacity *= 2;
            var indexarray = new Uint32Array(indexcapacity);
            indexarray.set(this.indices);
            this.indices = indexarray;
            this.indexCapacity = indexcapacity;
            resized = true;
        }
        if (resized) {
            this.destroyBuffers();
            this.stats.resizes++;
        }
    }
    addPage(id, decoded) {
        if (this.pages.has(id)) return this.pages.get(id);
        var positions = decoded.attributes.position;
        var normals = decoded.attributes.normal;
        var uvs = decoded.attributes.uv;
        var indices = decoded.index;
        var vertices = decoded.vertexCount;
        this.ensure(this.vertexCount + vertices, this.indexCount + indices.length);
        var record = { id: id, vertexOffset: this.vertexCount, vertexCount: vertices, indexOffset: this.indexCount, indexCount: indices.length, active: true };
        this.positions.set(positions, record.vertexOffset * 3);
        if (normals) this.normals.set(normals, record.vertexOffset * 3);
        if (uvs) this.uvs.set(uvs, record.vertexOffset * 2);
        for (var index = 0; index < indices.length; index++) this.indices[record.indexOffset + index] = indices[index] + record.vertexOffset;
        this.vertexCount += vertices;
        this.indexCount += indices.length;
        this.pages.set(id, record);
        this.dirty = true;
        this.stats.pages = this.pages.size;
        this.stats.vertices = this.vertexCount;
        this.stats.indices = this.indexCount;
        return record;
    }
    removePage(id) {
        var record = this.pages.get(id);
        if (!record) return false;
        record.active = false;
        this.pages.delete(id);
        this.stats.pages = this.pages.size;
        return true;
    }
    compact(decodedPages) {
        var pages = Array.from(this.pages.keys()).sort();
        var records = [];
        this.vertexCount = 0;
        this.indexCount = 0;
        this.pages.clear();
        for (var index = 0; index < pages.length; index++) {
            var decoded = decodedPages.get(pages[index]);
            if (decoded) records.push(this.addPage(pages[index], decoded));
        }
        this.stats.compactions++;
        return records;
    }
    usage() {
        var usage = typeof GPUBufferUsage !== "undefined" ? GPUBufferUsage : null;
        return usage ? usage.STORAGE | usage.VERTEX | usage.INDEX | usage.COPY_DST : 172;
    }
    ensureBuffers() {
        if (!this.device || !this.device.createBuffer) return;
        var arrays = { positions: this.positions, normals: this.normals, uvs: this.uvs, indices: this.indices };
        var names = Object.keys(arrays);
        for (var index = 0; index < names.length; index++) {
            var name = names[index];
            if (!this.buffers[name] || this.buffers[name].size < arrays[name].byteLength) {
                if (this.buffers[name] && this.buffers[name].destroy) this.buffers[name].destroy();
                this.buffers[name] = this.device.createBuffer({ size: arrays[name].byteLength, usage: this.usage() });
            }
        }
    }
    upload() {
        if (!this.dirty || !this.device || !this.device.queue) return 0;
        this.ensureBuffers();
        var views = {
            positions: this.positions.subarray(0, this.vertexCount * 3),
            normals: this.normals.subarray(0, this.vertexCount * 3),
            uvs: this.uvs.subarray(0, this.vertexCount * 2),
            indices: this.indices.subarray(0, this.indexCount)
        };
        var names = Object.keys(views);
        var bytes = 0;
        for (var index = 0; index < names.length; index++) {
            this.device.queue.writeBuffer(this.buffers[names[index]], 0, views[names[index]]);
            bytes += views[names[index]].byteLength;
        }
        this.dirty = false;
        this.stats.uploads++;
        this.stats.uploadedBytes += bytes;
        return bytes;
    }
    shaderLayout() {
        return {
            position: { binding: 0, stride: 12, format: "float32x3" },
            normal: { binding: 1, stride: 12, format: "float32x3" },
            uv: { binding: 2, stride: 8, format: "float32x2" },
            index: { binding: 3, stride: 4, format: "uint32" }
        };
    }
    report() {
        return { vertexCapacity: this.vertexCapacity, indexCapacity: this.indexCapacity, vertexCount: this.vertexCount, indexCount: this.indexCount, cpuBytes: this.positions.byteLength + this.normals.byteLength + this.uvs.byteLength + this.indices.byteLength, stats: Object.assign({}, this.stats) };
    }
    destroyBuffers() {
        var names = Object.keys(this.buffers);
        for (var index = 0; index < names.length; index++) if (this.buffers[names[index]] && this.buffers[names[index]].destroy) this.buffers[names[index]].destroy();
        this.buffers = Object.create(null);
    }
    dispose() {
        this.destroyBuffers();
        this.pages.clear();
        return this;
    }
}

class IndirectCommandStream {
    constructor(options) {
        options = options || {};
        this.maxCommands = options.maxCommands || 65536;
        this.commands = new Uint32Array(this.maxCommands * 5);
        this.metadata = new Uint32Array(this.maxCommands * 4);
        this.count = 0;
        this.stats = { commands: 0, triangles: 0, rejected: 0, materialGroups: 0 };
    }
    build(nodes, pageRecords, triangleBudget, drawBudget) {
        triangleBudget = triangleBudget === undefined ? Infinity : triangleBudget;
        drawBudget = drawBudget === undefined ? this.maxCommands : Math.min(this.maxCommands, drawBudget);
        this.count = 0;
        this.stats.triangles = 0;
        this.stats.rejected = 0;
        var materials = new Set;
        var sorted = nodes.slice().sort(function(a, b) { return a.material - b.material || String(a.pageId).localeCompare(String(b.pageId)) || a.first - b.first; });
        for (var index = 0; index < sorted.length; index++) {
            var node = sorted[index];
            var page = pageRecords.get(node.pageId);
            if (!page || this.count >= drawBudget || this.stats.triangles + node.triangles > triangleBudget) {
                this.stats.rejected++;
                continue;
            }
            var command = this.count * 5;
            this.commands[command] = node.count;
            this.commands[command + 1] = 1;
            this.commands[command + 2] = page.indexOffset + node.first * 3;
            this.commands[command + 3] = 0;
            this.commands[command + 4] = 0;
            var metadata = this.count * 4;
            this.metadata[metadata] = node.material;
            this.metadata[metadata + 1] = node.id;
            this.metadata[metadata + 2] = page.vertexOffset;
            this.metadata[metadata + 3] = node.level;
            this.count++;
            this.stats.triangles += node.triangles;
            materials.add(node.material);
        }
        this.stats.commands = this.count;
        this.stats.materialGroups = materials.size;
        return { commands: this.commands.subarray(0, this.count * 5), metadata: this.metadata.subarray(0, this.count * 4), count: this.count, stats: this.stats };
    }
}

class VirtualGeometryRuntime {
    constructor(device, options) {
        options = options || {};
        this.device = device || null;
        this.residency = options.residency || new GeometryPageResidency(options);
        this.store = options.store || new VertexPullingStore(device, options);
        this.commandStream = options.commandStream || new IndirectCommandStream(options);
        this.assets = new Map;
        this.selectors = new Map;
        this.instances = [];
        this.pageRecords = new Map;
        this.stats = { assets: 0, instances: 0, selectedClusters: 0, selectedTriangles: 0, pageRequests: 0, commands: 0, uploadBytes: 0 };
    }
    addAsset(asset) {
        if (!asset.built) asset.build();
        if (this.assets.has(asset.id)) throw new Error("VirtualGeometryRuntime duplicate asset " + asset.id);
        this.assets.set(asset.id, asset);
        this.selectors.set(asset.id, new VirtualGeometrySelector);
        this.residency.registerAsset(asset);
        this.stats.assets = this.assets.size;
        return this;
    }
    addInstance(asset, options) {
        options = options || {};
        var assetid = typeof asset === "string" ? asset : asset.id;
        if (!this.assets.has(assetid)) throw new Error("VirtualGeometryRuntime unknown asset " + assetid);
        var instance = {
            id: options.id === undefined ? this.instances.length : options.id,
            asset: assetid,
            position: options.position || { x: 0, y: 0, z: 0 },
            importance: options.importance === undefined ? 1 : options.importance,
            visible: options.visible !== false
        };
        this.instances.push(instance);
        this.stats.instances = this.instances.length;
        return instance;
    }
    async prepare(assetid) {
        var asset = this.assets.get(assetid);
        if (!asset) throw new Error("VirtualGeometryRuntime unknown asset " + assetid);
        var promises = [];
        for (var index = 0; index < asset.roots.length; index++) {
            var pageid = asset.nodes[asset.roots[index]].pageId;
            if (!this.residency.resident(pageid)) promises.push(this.residency.request(pageid, { reason: "root" }));
        }
        await Promise.all(promises);
        this.syncPages();
        return this;
    }
    syncPages() {
        var self = this;
        var existing = Array.from(this.pageRecords.keys());
        for (var index = 0; index < existing.length; index++) {
            var current = this.residency.pages.get(existing[index]);
            if (current && current.resident) continue;
            this.store.removePage(existing[index]);
            this.pageRecords.delete(existing[index]);
        }
        this.residency.pages.forEach(function(page) {
            if (!page.resident || self.pageRecords.has(page.id) || !page.handle || !page.handle.attributes) return;
            self.pageRecords.set(page.id, self.store.addPage(page.id, page.handle));
        });
        return this;
    }
    update(camera, options) {
        options = options || {};
        this.syncPages();
        var selected = [];
        var requests = new Set;
        var cameraposition = camera && camera.position ? camera.position : camera || { x: 0, y: 0, z: 0 };
        this.stats.selectedClusters = 0;
        this.stats.selectedTriangles = 0;
        for (var index = 0; index < this.instances.length; index++) {
            var instance = this.instances[index];
            if (!instance.visible) continue;
            var asset = this.assets.get(instance.asset);
            var selector = this.selectors.get(instance.asset);
            selector.maxClusters = options.maxClusters || selector.maxClusters;
            selector.maxTriangles = options.maxTriangles || selector.maxTriangles;
            var localcamera = [ cameraposition.x - instance.position.x, cameraposition.y - instance.position.y, cameraposition.z - instance.position.z ];
            var result = selector.select(asset, {
                camera: localcamera,
                viewportHeight: options.viewportHeight,
                fov: options.fov,
                pixelError: options.pixelError,
                residency: this.residency
            });
            for (var nodeindex = 0; nodeindex < result.selected.length; nodeindex++) selected.push(result.selected[nodeindex]);
            for (var requestindex = 0; requestindex < result.requests.length; requestindex++) requests.add(result.requests[requestindex]);
            this.stats.selectedClusters += result.stats.selected;
            this.stats.selectedTriangles += result.stats.triangles;
        }
        var self = this;
        requests.forEach(function(pageid) { self.residency.request(pageid, { reason: "refinement" }).catch(function() { return null; }); });
        this.stats.pageRequests = requests.size;
        var commands = this.commandStream.build(selected, this.pageRecords, options.triangleBudget, options.drawCallBudget);
        this.stats.commands = commands.count;
        this.stats.uploadBytes = this.store.upload();
        this.residency.update();
        return { selected: selected, requests: Array.from(requests), commands: commands, stats: Object.assign({}, this.stats) };
    }
    report() {
        return { stats: Object.assign({}, this.stats), residency: this.residency.report(), store: this.store.report(), commands: Object.assign({}, this.commandStream.stats) };
    }
    dispose() {
        this.store.dispose();
        this.assets.clear();
        this.selectors.clear();
        this.instances.length = 0;
        this.pageRecords.clear();
        return this;
    }
}

export { GeometryPageResidency, IndirectCommandStream, VertexPullingStore, VirtualGeometryAsset, VirtualGeometryRuntime, VirtualGeometrySelector };
