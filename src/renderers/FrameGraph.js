class FrameGraph {
    constructor(renderer) {
        this.renderer = renderer && renderer.device ? renderer : null;
        this.device = this.renderer ? this.renderer.device : (renderer && renderer.createCommandEncoder ? renderer : null);
        this.resources = [];
        this.resourceIndex = {};
        this.passes = [];
        this.passIndex = {};
        this.textureSlots = [];
        this.bufferSlots = [];
        this.compiled = null;
        this._views = {};
        this.stats = { compiles: 0, executes: 0, passesExecuted: 0, texturesCreated: 0, buffersCreated: 0, slotReused: 0 };
    }
    addTexture(name, options) {
        options = options || {};
        if (this.resourceIndex[name] !== undefined) throw new Error("FrameGraph: duplicate resource " + name);
        var desc = {
            format: options.format || "rgba8unorm",
            width: Math.max(1, Math.floor(options.width || 1)),
            height: Math.max(1, Math.floor(options.height || 1)),
            usage: options.usage === undefined ? null : options.usage,
            mipLevelCount: Math.max(1, Math.floor(options.mipLevelCount || 1)),
            sampleCount: Math.max(1, Math.floor(options.sampleCount || 1))
        };
        this.resourceIndex[name] = this.resources.length;
        this.resources.push({ name: name, kind: "texture", imported: false, desc: desc, writers: [], readers: [], first: -1, last: -1, slot: -1, used: false });
        this.compiled = null;
        return this;
    }
    addBuffer(name, options) {
        options = options || {};
        if (this.resourceIndex[name] !== undefined) throw new Error("FrameGraph: duplicate resource " + name);
        var desc = {
            size: Math.max(4, (Math.floor(options.size || 4) + 3) & ~3),
            usage: options.usage === undefined ? null : options.usage
        };
        this.resourceIndex[name] = this.resources.length;
        this.resources.push({ name: name, kind: "buffer", imported: false, desc: desc, writers: [], readers: [], first: -1, last: -1, slot: -1, used: false });
        this.compiled = null;
        return this;
    }
    importTexture(name, gpuTexture) {
        if (this.resourceIndex[name] !== undefined) throw new Error("FrameGraph: duplicate resource " + name);
        this.resourceIndex[name] = this.resources.length;
        this.resources.push({ name: name, kind: "texture", imported: true, texture: gpuTexture, writers: [], readers: [], first: -1, last: -1, slot: -1, used: false });
        this.compiled = null;
        return this;
    }
    importBuffer(name, gpuBuffer) {
        if (this.resourceIndex[name] !== undefined) throw new Error("FrameGraph: duplicate resource " + name);
        this.resourceIndex[name] = this.resources.length;
        this.resources.push({ name: name, kind: "buffer", imported: true, buffer: gpuBuffer, writers: [], readers: [], first: -1, last: -1, slot: -1, used: false });
        this.compiled = null;
        return this;
    }
    addPass(name, options) {
        options = options || {};
        if (this.passIndex[name] !== undefined) throw new Error("FrameGraph: duplicate pass " + name);
        var pass = {
            name: name,
            type: options.type === "compute" ? "compute" : "graphics",
            reads: [],
            writes: [],
            sideEffect: !!options.sideEffect,
            async: options.type === "compute" && options.async === true,
            execute: typeof options.execute === "function" ? options.execute : null,
            index: this.passes.length,
            alive: true
        };
        var self = this;
        var sources = [[options.reads || [], pass.reads], [options.writes || [], pass.writes]];
        for (var s = 0; s < sources.length; s++) {
            var list = sources[s][0], target = sources[s][1];
            for (var i = 0; i < list.length; i++) {
                var rname = String(list[i]);
                if (self.resourceIndex[rname] === undefined) throw new Error("FrameGraph: pass " + name + " references unknown resource " + rname);
                if (target.indexOf(rname) < 0) target.push(rname);
            }
        }
        this.passIndex[name] = this.passes.length;
        this.passes.push(pass);
        this.compiled = null;
        return this;
    }
    compile() {
        var resources = this.resources, passes = this.passes;
        for (var r = 0; r < resources.length; r++) { resources[r].writers = []; resources[r].readers = []; }
        for (var p = 0; p < passes.length; p++) {
            var pass = passes[p];
            for (var w = 0; w < pass.writes.length; w++) resources[this.resourceIndex[pass.writes[w]]].writers.push(pass.index);
            for (var rd = 0; rd < pass.reads.length; rd++) resources[this.resourceIndex[pass.reads[rd]]].readers.push(pass.index);
        }
        var alive = [];
        for (var p2 = 0; p2 < passes.length; p2++) alive.push(true);
        var changed = true;
        while (changed) {
            changed = false;
            var lastWriter = {};
            var hasAliveReader = {};
            for (var r0 = 0; r0 < resources.length; r0++) { lastWriter[resources[r0].name] = -1; hasAliveReader[resources[r0].name] = false; }
            for (var p3 = 0; p3 < passes.length; p3++) {
                var ps = passes[p3];
                if (!alive[ps.index]) continue;
                for (var w = 0; w < ps.writes.length; w++) if (ps.index > lastWriter[ps.writes[w]]) lastWriter[ps.writes[w]] = ps.index;
                for (var rd = 0; rd < ps.reads.length; rd++) hasAliveReader[ps.reads[rd]] = true;
            }
            for (var p4 = 0; p4 < passes.length; p4++) {
                var ps2 = passes[p4];
                if (!alive[ps2.index] || ps2.sideEffect) continue;
                var keep = false;
                for (var w2 = 0; w2 < ps2.writes.length; w2++) {
                    var rname = ps2.writes[w2];
                    if (resources[this.resourceIndex[rname]].imported) { keep = true; break; }
                    if (lastWriter[rname] === ps2.index && hasAliveReader[rname]) { keep = true; break; }
                }
                if (!keep) { alive[ps2.index] = false; changed = true; }
            }
        }
        var culled = [];
        for (var p44 = 0; p44 < passes.length; p44++) if (!alive[passes[p44].index]) culled.push(passes[p44].name);
        var edges = [];
        for (var r2 = 0; r2 < resources.length; r2++) {
            var resource = resources[r2];
            var ws = [], rs2 = [];
            for (var a = 0; a < resource.writers.length; a++) if (alive[resource.writers[a]]) ws.push(resource.writers[a]);
            for (var b = 0; b < resource.readers.length; b++) if (alive[resource.readers[b]]) rs2.push(resource.readers[b]);
            for (var i2 = 0; i2 < ws.length; i2++) {
                for (var j = 0; j < rs2.length; j++) {
                    if (ws[i2] === rs2[j]) continue;
                    edges.push({ from: ws[i2], to: rs2[j], resource: resource.name, kind: "RAW" });
                }
                for (var j2 = i2 + 1; j2 < ws.length; j2++) {
                    edges.push({ from: ws[i2], to: ws[j2], resource: resource.name, kind: "WAW" });
                }
            }
        }
        var indegree = {};
        for (var p5 = 0; p5 < passes.length; p5++) if (alive[passes[p5].index]) indegree[passes[p5].index] = 0;
        for (var e = 0; e < edges.length; e++) indegree[edges[e].to]++;
        var order = [];
        var placed = {};
        var liveCount = 0;
        for (var key in indegree) liveCount++;
        for (var step = 0; step < liveCount; step++) {
            var pick = -1;
            for (var p6 = 0; p6 < passes.length; p6++) {
                var idx = passes[p6].index;
                if (alive[idx] && !placed[idx] && indegree[idx] === 0) { pick = idx; break; }
            }
            if (pick < 0) {
                var stuck = [];
                for (var p7 = 0; p7 < passes.length; p7++) if (alive[passes[p7].index] && !placed[passes[p7].index]) stuck.push(passes[p7].name);
                throw new Error("FrameGraph: dependency cycle among passes " + stuck.join(" -> "));
            }
            placed[pick] = true;
            order.push(passes[pick]);
            for (var e2 = 0; e2 < edges.length; e2++) if (edges[e2].from === pick) indegree[edges[e2].to]--;
        }
        var position = {};
        for (var o = 0; o < order.length; o++) position[order[o].index] = o;
        for (var r3 = 0; r3 < resources.length; r3++) {
            var res3 = resources[r3];
            res3.first = Infinity;
            res3.last = -1;
            res3.used = false;
            var users = res3.writers.concat(res3.readers);
            for (var u = 0; u < users.length; u++) {
                if (!alive[users[u]]) continue;
                var pos = position[users[u]];
                if (pos < res3.first) res3.first = pos;
                if (pos > res3.last) res3.last = pos;
                res3.used = true;
            }
            if (!res3.used) { res3.first = -1; res3.last = -1; }
        }
        this.textureSlots = this.textureSlots || [];
        this.bufferSlots = this.bufferSlots || [];
        for (var ts = 0; ts < this.textureSlots.length; ts++) this.textureSlots[ts].occupants = [];
        for (var bs = 0; bs < this.bufferSlots.length; bs++) this.bufferSlots[bs].occupants = [];
        for (var r4 = 0; r4 < resources.length; r4++) {
            var res4 = resources[r4];
            if (res4.imported || !res4.used) continue;
            var slots = res4.kind === "texture" ? this.textureSlots : this.bufferSlots;
            var key = res4.kind === "texture"
                ? res4.desc.format + "|" + res4.desc.width + "x" + res4.desc.height + "|" + res4.desc.usage + "|" + res4.desc.mipLevelCount + "|" + res4.desc.sampleCount
                : res4.desc.size + "|" + res4.desc.usage;
            var assigned = -1;
            for (var s2 = 0; s2 < slots.length; s2++) {
                if (slots[s2].key !== key) continue;
                var overlap = false;
                for (var occ = 0; occ < slots[s2].occupants.length; occ++) {
                    var other = slots[s2].occupants[occ];
                    if (!(res4.last < other.first || other.last < res4.first)) { overlap = true; break; }
                }
                if (overlap) continue;
                assigned = s2;
                break;
            }
            if (assigned < 0) {
                slots.push({ key: key, occupants: [], gpu: null });
                assigned = slots.length - 1;
            }
            slots[assigned].occupants.push(res4);
            res4.slot = assigned;
        }
        var layers = [];
        for (var o2 = 0; o2 < order.length; o2++) {
            var track = order[o2].async ? "compute" : "graphics";
            if (layers.length === 0 || layers[layers.length - 1].track !== track) layers.push({ track: track, passes: [order[o2]] });
            else layers[layers.length - 1].passes.push(order[o2]);
        }
        var layerOf = {};
        for (var l = 0; l < layers.length; l++) for (var lp = 0; lp < layers[l].passes.length; lp++) layerOf[layers[l].passes[lp].index] = l;
        var barriers = [];
        for (var e3 = 0; e3 < edges.length; e3++) {
            var edge = edges[e3];
            var fl = layerOf[edge.from], tl = layerOf[edge.to];
            if (fl === tl) continue;
            barriers.push({ resource: edge.resource, producer: passes[edge.from].name, consumer: passes[edge.to].name, kind: edge.kind, fromLayer: fl, toLayer: tl });
        }
        var alias = {};
        var lifetimes = {};
        for (var r5 = 0; r5 < resources.length; r5++) {
            var res5 = resources[r5];
            if (res5.used) lifetimes[res5.name] = { first: res5.first, last: res5.last, slot: res5.imported ? -1 : res5.slot };
            if (!res5.imported && res5.used) alias[res5.name] = res5.slot;
        }
        this.compiled = { order: order, culled: culled, edges: edges, layers: layers, barriers: barriers, lifetimes: lifetimes, alias: alias, textureSlots: this.textureSlots.length, bufferSlots: this.bufferSlots.length };
        this.stats.compiles++;
        return this;
    }
    _resource(name) {
        var index = this.resourceIndex[name];
        if (index === undefined) throw new Error("FrameGraph: unknown resource " + name);
        return this.resources[index];
    }
    texture(name) {
        var resource = this._resource(name);
        if (resource.imported) return resource.texture;
        if (!this.device) throw new Error("FrameGraph: no device available for transient " + name);
        var slot = this.textureSlots[resource.slot];
        if (!slot.gpu) {
            slot.gpu = this.device.createTexture({ size: [resource.desc.width, resource.desc.height, 1], format: resource.desc.format, usage: resource.desc.usage === null ? GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING : resource.desc.usage, mipLevelCount: resource.desc.mipLevelCount, sampleCount: resource.desc.sampleCount });
            this.stats.texturesCreated++;
        } else this.stats.slotReused++;
        return slot.gpu;
    }
    buffer(name) {
        var resource = this._resource(name);
        if (resource.imported) return resource.buffer;
        if (!this.device) throw new Error("FrameGraph: no device available for transient " + name);
        var slot = this.bufferSlots[resource.slot];
        if (!slot.gpu) {
            slot.gpu = this.device.createBuffer({ size: resource.desc.size, usage: resource.desc.usage === null ? GPUBufferUsage.STORAGE_BINDING | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC : resource.desc.usage });
            this.stats.buffersCreated++;
        } else this.stats.slotReused++;
        return slot.gpu;
    }
    view(name) {
        if (this._views[name]) return this._views[name];
        var tex = this.texture(name);
        this._views[name] = tex.createView();
        return this._views[name];
    }
    execute() {
        if (!this.compiled) this.compile();
        this._views = {};
        var encoders = [];
        var layers = this.compiled.layers;
        for (var l = 0; l < layers.length; l++) {
            var encoder = this.device.createCommandEncoder();
            encoders.push(encoder);
            for (var p = 0; p < layers[l].passes.length; p++) {
                var pass = layers[l].passes[p];
                var self = this;
                var ctx = {
                    graph: this,
                    name: pass.name,
                    type: pass.type,
                    device: this.device,
                    encoder: encoder,
                    texture: function(n) { return self.texture(n); },
                    view: function(n) { return self.view(n); },
                    buffer: function(n) { return self.buffer(n); }
                };
                if (pass.execute) pass.execute(ctx);
                this.stats.passesExecuted++;
            }
        }
        if (encoders.length) this.device.queue.submit(encoders.map(function(e) { return e.finish(); }));
        this.stats.executes++;
        return this;
    }
    clear() {
        this.resources = [];
        this.resourceIndex = {};
        this.passes = [];
        this.passIndex = {};
        this.compiled = null;
        this._views = {};
        return this;
    }
    dispose() {
        for (var t = 0; t < this.textureSlots.length; t++) if (this.textureSlots[t].gpu) this.textureSlots[t].gpu.destroy();
        for (var b = 0; b < this.bufferSlots.length; b++) if (this.bufferSlots[b].gpu) this.bufferSlots[b].gpu.destroy();
        this.textureSlots = [];
        this.bufferSlots = [];
        return this;
    }
    compiledOrder() { return this.compiled ? this.compiled.order.map(function(p) { return p.name; }) : null; }
    culledPasses() { return this.compiled ? this.compiled.culled.slice() : null; }
    barriers() { return this.compiled ? this.compiled.barriers.map(function(b) { return { resource: b.resource, producer: b.producer, consumer: b.consumer, kind: b.kind, fromLayer: b.fromLayer, toLayer: b.toLayer }; }) : null; }
    aliasMap() { return this.compiled ? JSON.parse(JSON.stringify(this.compiled.alias)) : null; }
    lifetimes() { return this.compiled ? JSON.parse(JSON.stringify(this.compiled.lifetimes)) : null; }
    layerTracks() { return this.compiled ? this.compiled.layers.map(function(l) { return l.track; }) : null; }
    slotCounts() { return this.compiled ? { textures: this.compiled.textureSlots, buffers: this.compiled.bufferSlots } : null; }
}

export { FrameGraph };
