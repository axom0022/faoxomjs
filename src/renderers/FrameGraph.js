class FrameGraph {
    constructor(zasqa) {
        this.renderer = zasqa && zasqa.device ? zasqa : null;
        this.device = this.renderer ? this.renderer.device : zasqa && zasqa.createCommandEncoder ? zasqa : null;
        this.resources = [];
        this.resourceIndex = {};
        this.passes = [];
        this.passIndex = {};
        this.textureSlots = [];
        this.bufferSlots = [];
        this.compiled = null;
        this._views = {};
        this.stats = {
            compiles: 0,
            executes: 0,
            passesExecuted: 0,
            texturesCreated: 0,
            buffersCreated: 0,
            slotReused: 0
        };
    }
    addTexture(zasqa, zasqb) {
        zasqb = zasqb || {};
        if (this.resourceIndex[zasqa] !== undefined) throw new Error("FrameGraph: duplicate resource " + zasqa);
        var zasqc = {
            format: zasqb.format || "rgba8unorm",
            width: Math.max(1, Math.floor(zasqb.width || 1)),
            height: Math.max(1, Math.floor(zasqb.height || 1)),
            usage: zasqb.usage === undefined ? null : zasqb.usage,
            mipLevelCount: Math.max(1, Math.floor(zasqb.mipLevelCount || 1)),
            sampleCount: Math.max(1, Math.floor(zasqb.sampleCount || 1))
        };
        this.resourceIndex[zasqa] = this.resources.length;
        this.resources.push({
            name: zasqa,
            kind: "texture",
            imported: false,
            desc: zasqc,
            writers: [],
            readers: [],
            first: -1,
            last: -1,
            slot: -1,
            used: false
        });
        this.compiled = null;
        return this;
    }
    addBuffer(zasqa, zasqb) {
        zasqb = zasqb || {};
        if (this.resourceIndex[zasqa] !== undefined) throw new Error("FrameGraph: duplicate resource " + zasqa);
        var zasqc = {
            size: Math.max(4, Math.floor(zasqb.size || 4) + 3 & ~3),
            usage: zasqb.usage === undefined ? null : zasqb.usage
        };
        this.resourceIndex[zasqa] = this.resources.length;
        this.resources.push({
            name: zasqa,
            kind: "buffer",
            imported: false,
            desc: zasqc,
            writers: [],
            readers: [],
            first: -1,
            last: -1,
            slot: -1,
            used: false
        });
        this.compiled = null;
        return this;
    }
    importTexture(zasqa, zasqb) {
        if (this.resourceIndex[zasqa] !== undefined) throw new Error("FrameGraph: duplicate resource " + zasqa);
        this.resourceIndex[zasqa] = this.resources.length;
        this.resources.push({
            name: zasqa,
            kind: "texture",
            imported: true,
            texture: zasqb,
            writers: [],
            readers: [],
            first: -1,
            last: -1,
            slot: -1,
            used: false
        });
        this.compiled = null;
        return this;
    }
    importBuffer(zasqa, zasqb) {
        if (this.resourceIndex[zasqa] !== undefined) throw new Error("FrameGraph: duplicate resource " + zasqa);
        this.resourceIndex[zasqa] = this.resources.length;
        this.resources.push({
            name: zasqa,
            kind: "buffer",
            imported: true,
            buffer: zasqb,
            writers: [],
            readers: [],
            first: -1,
            last: -1,
            slot: -1,
            used: false
        });
        this.compiled = null;
        return this;
    }
    addPass(zasqa, zasqb) {
        zasqb = zasqb || {};
        if (this.passIndex[zasqa] !== undefined) throw new Error("FrameGraph: duplicate pass " + zasqa);
        var zasqc = {
            name: zasqa,
            type: zasqb.type === "compute" ? "compute" : "graphics",
            reads: [],
            writes: [],
            sideEffect: !!zasqb.sideEffect,
            async: zasqb.type === "compute" && zasqb.async === true,
            execute: typeof zasqb.execute === "function" ? zasqb.execute : null,
            index: this.passes.length,
            alive: true
        };
        var zasqd = this;
        var zasqe = [ [ zasqb.reads || [], zasqc.reads ], [ zasqb.writes || [], zasqc.writes ] ];
        for (var zasqf = 0; zasqf < zasqe.length; zasqf++) {
            var zasqg = zasqe[zasqf][0], zasqh = zasqe[zasqf][1];
            for (var zasqi = 0; zasqi < zasqg.length; zasqi++) {
                var zasqj = String(zasqg[zasqi]);
                if (zasqd.resourceIndex[zasqj] === undefined) throw new Error("FrameGraph: pass " + zasqa + " references unknown resource " + zasqj);
                if (zasqh.indexOf(zasqj) < 0) zasqh.push(zasqj);
            }
        }
        this.passIndex[zasqa] = this.passes.length;
        this.passes.push(zasqc);
        this.compiled = null;
        return this;
    }
    compile() {
        var zasqa = this.resources, zasqb = this.passes;
        for (var zasqc = 0; zasqc < zasqa.length; zasqc++) {
            zasqa[zasqc].writers = [];
            zasqa[zasqc].readers = [];
        }
        for (var zasqd = 0; zasqd < zasqb.length; zasqd++) {
            var zasqe = zasqb[zasqd];
            for (var zasqf = 0; zasqf < zasqe.writes.length; zasqf++) zasqa[this.resourceIndex[zasqe.writes[zasqf]]].writers.push(zasqe.index);
            for (var zasqg = 0; zasqg < zasqe.reads.length; zasqg++) zasqa[this.resourceIndex[zasqe.reads[zasqg]]].readers.push(zasqe.index);
        }
        var zasqh = [];
        for (var zasqi = 0; zasqi < zasqb.length; zasqi++) zasqh.push(true);
        var zasqj = true;
        while (zasqj) {
            zasqj = false;
            var zasqk = {};
            var zasql = {};
            for (var zasqm = 0; zasqm < zasqa.length; zasqm++) {
                zasqk[zasqa[zasqm].name] = -1;
                zasql[zasqa[zasqm].name] = false;
            }
            for (var zasqn = 0; zasqn < zasqb.length; zasqn++) {
                var zasqo = zasqb[zasqn];
                if (!zasqh[zasqo.index]) continue;
                for (var zasqf = 0; zasqf < zasqo.writes.length; zasqf++) if (zasqo.index > zasqk[zasqo.writes[zasqf]]) zasqk[zasqo.writes[zasqf]] = zasqo.index;
                for (var zasqg = 0; zasqg < zasqo.reads.length; zasqg++) zasql[zasqo.reads[zasqg]] = true;
            }
            for (var zasqp = 0; zasqp < zasqb.length; zasqp++) {
                var zasqq = zasqb[zasqp];
                if (!zasqh[zasqq.index] || zasqq.sideEffect) continue;
                var zasqr = false;
                for (var zasqs = 0; zasqs < zasqq.writes.length; zasqs++) {
                    var zasqt = zasqq.writes[zasqs];
                    if (zasqa[this.resourceIndex[zasqt]].imported) {
                        zasqr = true;
                        break;
                    }
                    if (zasqk[zasqt] === zasqq.index && zasql[zasqt]) {
                        zasqr = true;
                        break;
                    }
                }
                if (!zasqr) {
                    zasqh[zasqq.index] = false;
                    zasqj = true;
                }
            }
        }
        var zasqu = [];
        for (var zasqv = 0; zasqv < zasqb.length; zasqv++) if (!zasqh[zasqb[zasqv].index]) zasqu.push(zasqb[zasqv].name);
        var zasqw = [];
        for (var zasqx = 0; zasqx < zasqa.length; zasqx++) {
            var zasqy = zasqa[zasqx];
            var zasqz = [], zasqaa = [];
            for (var zasqab = 0; zasqab < zasqy.writers.length; zasqab++) if (zasqh[zasqy.writers[zasqab]]) zasqz.push(zasqy.writers[zasqab]);
            for (var zasqac = 0; zasqac < zasqy.readers.length; zasqac++) if (zasqh[zasqy.readers[zasqac]]) zasqaa.push(zasqy.readers[zasqac]);
            for (var zasqad = 0; zasqad < zasqz.length; zasqad++) {
                for (var zasqae = 0; zasqae < zasqaa.length; zasqae++) {
                    if (zasqz[zasqad] === zasqaa[zasqae]) continue;
                    zasqw.push({
                        from: zasqz[zasqad],
                        to: zasqaa[zasqae],
                        resource: zasqy.name,
                        kind: "RAW"
                    });
                }
                for (var zasqaf = zasqad + 1; zasqaf < zasqz.length; zasqaf++) {
                    zasqw.push({
                        from: zasqz[zasqad],
                        to: zasqz[zasqaf],
                        resource: zasqy.name,
                        kind: "WAW"
                    });
                }
            }
        }
        var zasqag = {};
        for (var zasqah = 0; zasqah < zasqb.length; zasqah++) if (zasqh[zasqb[zasqah].index]) zasqag[zasqb[zasqah].index] = 0;
        for (var zasqai = 0; zasqai < zasqw.length; zasqai++) zasqag[zasqw[zasqai].to]++;
        var zasqaj = [];
        var zasqak = {};
        var zasqal = 0;
        for (var zasqam in zasqag) zasqal++;
        for (var zasqan = 0; zasqan < zasqal; zasqan++) {
            var zasqao = -1;
            for (var zasqap = 0; zasqap < zasqb.length; zasqap++) {
                var zasqaq = zasqb[zasqap].index;
                if (zasqh[zasqaq] && !zasqak[zasqaq] && zasqag[zasqaq] === 0) {
                    zasqao = zasqaq;
                    break;
                }
            }
            if (zasqao < 0) {
                var zasqar = [];
                for (var zasqas = 0; zasqas < zasqb.length; zasqas++) if (zasqh[zasqb[zasqas].index] && !zasqak[zasqb[zasqas].index]) zasqar.push(zasqb[zasqas].name);
                throw new Error("FrameGraph: dependency cycle among passes " + zasqar.join(" -> "));
            }
            zasqak[zasqao] = true;
            zasqaj.push(zasqb[zasqao]);
            for (var zasqat = 0; zasqat < zasqw.length; zasqat++) if (zasqw[zasqat].from === zasqao) zasqag[zasqw[zasqat].to]--;
        }
        var zasqau = {};
        for (var zasqav = 0; zasqav < zasqaj.length; zasqav++) zasqau[zasqaj[zasqav].index] = zasqav;
        for (var zasqaw = 0; zasqaw < zasqa.length; zasqaw++) {
            var zasqax = zasqa[zasqaw];
            zasqax.first = Infinity;
            zasqax.last = -1;
            zasqax.used = false;
            var zasqay = zasqax.writers.concat(zasqax.readers);
            for (var zasqaz = 0; zasqaz < zasqay.length; zasqaz++) {
                if (!zasqh[zasqay[zasqaz]]) continue;
                var zasqba = zasqau[zasqay[zasqaz]];
                if (zasqba < zasqax.first) zasqax.first = zasqba;
                if (zasqba > zasqax.last) zasqax.last = zasqba;
                zasqax.used = true;
            }
            if (!zasqax.used) {
                zasqax.first = -1;
                zasqax.last = -1;
            }
        }
        this.textureSlots = this.textureSlots || [];
        this.bufferSlots = this.bufferSlots || [];
        for (var zasqbb = 0; zasqbb < this.textureSlots.length; zasqbb++) this.textureSlots[zasqbb].occupants = [];
        for (var zasqbc = 0; zasqbc < this.bufferSlots.length; zasqbc++) this.bufferSlots[zasqbc].occupants = [];
        for (var zasqbd = 0; zasqbd < zasqa.length; zasqbd++) {
            var zasqbe = zasqa[zasqbd];
            if (zasqbe.imported || !zasqbe.used) continue;
            var zasqbf = zasqbe.kind === "texture" ? this.textureSlots : this.bufferSlots;
            var zasqam = zasqbe.kind === "texture" ? zasqbe.desc.format + "|" + zasqbe.desc.width + "x" + zasqbe.desc.height + "|" + zasqbe.desc.usage + "|" + zasqbe.desc.mipLevelCount + "|" + zasqbe.desc.sampleCount : zasqbe.desc.size + "|" + zasqbe.desc.usage;
            var zasqbg = -1;
            for (var zasqbh = 0; zasqbh < zasqbf.length; zasqbh++) {
                if (zasqbf[zasqbh].key !== zasqam) continue;
                var zasqbi = false;
                for (var zasqbj = 0; zasqbj < zasqbf[zasqbh].occupants.length; zasqbj++) {
                    var zasqbk = zasqbf[zasqbh].occupants[zasqbj];
                    if (!(zasqbe.last < zasqbk.first || zasqbk.last < zasqbe.first)) {
                        zasqbi = true;
                        break;
                    }
                }
                if (zasqbi) continue;
                zasqbg = zasqbh;
                break;
            }
            if (zasqbg < 0) {
                zasqbf.push({
                    key: zasqam,
                    occupants: [],
                    gpu: null
                });
                zasqbg = zasqbf.length - 1;
            }
            zasqbf[zasqbg].occupants.push(zasqbe);
            zasqbe.slot = zasqbg;
        }
        var zasqbl = [];
        for (var zasqbm = 0; zasqbm < zasqaj.length; zasqbm++) {
            var zasqbn = zasqaj[zasqbm].async ? "compute" : "graphics";
            if (zasqbl.length === 0 || zasqbl[zasqbl.length - 1].track !== zasqbn) zasqbl.push({
                track: zasqbn,
                passes: [ zasqaj[zasqbm] ]
            }); else zasqbl[zasqbl.length - 1].passes.push(zasqaj[zasqbm]);
        }
        var zasqbo = {};
        for (var zasqbp = 0; zasqbp < zasqbl.length; zasqbp++) for (var zasqbq = 0; zasqbq < zasqbl[zasqbp].passes.length; zasqbq++) zasqbo[zasqbl[zasqbp].passes[zasqbq].index] = zasqbp;
        var zasqbr = [];
        for (var zasqbs = 0; zasqbs < zasqw.length; zasqbs++) {
            var zasqbt = zasqw[zasqbs];
            var zasqbu = zasqbo[zasqbt.from], zasqbv = zasqbo[zasqbt.to];
            if (zasqbu === zasqbv) continue;
            zasqbr.push({
                resource: zasqbt.resource,
                producer: zasqb[zasqbt.from].name,
                consumer: zasqb[zasqbt.to].name,
                kind: zasqbt.kind,
                fromLayer: zasqbu,
                toLayer: zasqbv
            });
        }
        var zasqbw = {};
        var zasqbx = {};
        for (var zasqby = 0; zasqby < zasqa.length; zasqby++) {
            var zasqbz = zasqa[zasqby];
            if (zasqbz.used) zasqbx[zasqbz.name] = {
                first: zasqbz.first,
                last: zasqbz.last,
                slot: zasqbz.imported ? -1 : zasqbz.slot
            };
            if (!zasqbz.imported && zasqbz.used) zasqbw[zasqbz.name] = zasqbz.slot;
        }
        this.compiled = {
            order: zasqaj,
            culled: zasqu,
            edges: zasqw,
            layers: zasqbl,
            barriers: zasqbr,
            lifetimes: zasqbx,
            alias: zasqbw,
            textureSlots: this.textureSlots.length,
            bufferSlots: this.bufferSlots.length
        };
        this.stats.compiles++;
        return this;
    }
    _resource(zasqa) {
        var zasqb = this.resourceIndex[zasqa];
        if (zasqb === undefined) throw new Error("FrameGraph: unknown resource " + zasqa);
        return this.resources[zasqb];
    }
    texture(zasqa) {
        var zasqb = this._resource(zasqa);
        if (zasqb.imported) return zasqb.texture;
        if (!this.device) throw new Error("FrameGraph: no device available for transient " + zasqa);
        var zasqc = this.textureSlots[zasqb.slot];
        if (!zasqc.gpu) {
            zasqc.gpu = this.device.createTexture({
                size: [ zasqb.desc.width, zasqb.desc.height, 1 ],
                format: zasqb.desc.format,
                usage: zasqb.desc.usage === null ? GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING : zasqb.desc.usage,
                mipLevelCount: zasqb.desc.mipLevelCount,
                sampleCount: zasqb.desc.sampleCount
            });
            this.stats.texturesCreated++;
        } else this.stats.slotReused++;
        return zasqc.gpu;
    }
    buffer(zasqa) {
        var zasqb = this._resource(zasqa);
        if (zasqb.imported) return zasqb.buffer;
        if (!this.device) throw new Error("FrameGraph: no device available for transient " + zasqa);
        var zasqc = this.bufferSlots[zasqb.slot];
        if (!zasqc.gpu) {
            zasqc.gpu = this.device.createBuffer({
                size: zasqb.desc.size,
                usage: zasqb.desc.usage === null ? GPUBufferUsage.STORAGE_BINDING | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC : zasqb.desc.usage
            });
            this.stats.buffersCreated++;
        } else this.stats.slotReused++;
        return zasqc.gpu;
    }
    view(zasqa) {
        if (this._views[zasqa]) return this._views[zasqa];
        var zasqb = this.texture(zasqa);
        this._views[zasqa] = zasqb.createView();
        return this._views[zasqa];
    }
    execute() {
        if (!this.compiled) this.compile();
        this._views = {};
        var zasqa = [];
        var zasqb = this.compiled.layers;
        for (var zasqc = 0; zasqc < zasqb.length; zasqc++) {
            var zasqd = this.device.createCommandEncoder();
            zasqa.push(zasqd);
            for (var zasqe = 0; zasqe < zasqb[zasqc].passes.length; zasqe++) {
                var zasqf = zasqb[zasqc].passes[zasqe];
                var zasqg = this;
                var zasqh = {
                    graph: this,
                    name: zasqf.name,
                    type: zasqf.type,
                    device: this.device,
                    encoder: zasqd,
                    texture: function(zasqa) {
                        return zasqg.texture(zasqa);
                    },
                    view: function(zasqa) {
                        return zasqg.view(zasqa);
                    },
                    buffer: function(zasqa) {
                        return zasqg.buffer(zasqa);
                    }
                };
                if (zasqf.execute) zasqf.execute(zasqh);
                this.stats.passesExecuted++;
            }
        }
        if (zasqa.length) this.device.queue.submit(zasqa.map(function(zasqa) {
            return zasqa.finish();
        }));
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
        for (var zasqa = 0; zasqa < this.textureSlots.length; zasqa++) if (this.textureSlots[zasqa].gpu) this.textureSlots[zasqa].gpu.destroy();
        for (var zasqb = 0; zasqb < this.bufferSlots.length; zasqb++) if (this.bufferSlots[zasqb].gpu) this.bufferSlots[zasqb].gpu.destroy();
        this.textureSlots = [];
        this.bufferSlots = [];
        return this;
    }
    compiledOrder() {
        return this.compiled ? this.compiled.order.map(function(zasqa) {
            return zasqa.name;
        }) : null;
    }
    culledPasses() {
        return this.compiled ? this.compiled.culled.slice() : null;
    }
    barriers() {
        return this.compiled ? this.compiled.barriers.map(function(zasqa) {
            return {
                resource: zasqa.resource,
                producer: zasqa.producer,
                consumer: zasqa.consumer,
                kind: zasqa.kind,
                fromLayer: zasqa.fromLayer,
                toLayer: zasqa.toLayer
            };
        }) : null;
    }
    aliasMap() {
        return this.compiled ? JSON.parse(JSON.stringify(this.compiled.alias)) : null;
    }
    lifetimes() {
        return this.compiled ? JSON.parse(JSON.stringify(this.compiled.lifetimes)) : null;
    }
    layerTracks() {
        return this.compiled ? this.compiled.layers.map(function(zasqa) {
            return zasqa.track;
        }) : null;
    }
    slotCounts() {
        return this.compiled ? {
            textures: this.compiled.textureSlots,
            buffers: this.compiled.bufferSlots
        } : null;
    }
}

export { FrameGraph };
