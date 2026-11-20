import { Color, Matrix4 } from "../math/index.js";

import { InstancedMesh, Line, LineLoop, LineSegments, Mesh, Points } from "../objects/index.js";

import { BasicMaterial, LineBasicMaterial, LineMaterial, PointsMaterial } from "../materials/index.js";

import { CubeTexture } from "../textures/index.js";

import { HiZBuffer } from "./HiZBuffer.js";

import { HiZOcclusion, gdrwgsl } from "./HiZOcclusion.js";

class GPUDrivenPipeline {
    constructor(zasxa) {
        this.renderer = zasxa;
        this.device = zasxa.device;
        this.enabled = true;
        this.occlusion = true;
        this.bias = 5e-5;
        this.twoPhase = false;
        this.regions = true;
        this.targetPerRegion = 8;
        this.hysteresis = 5e-4;
        this.hiz = null;
        this.occ = null;
        this.cullpipeline = null;
        this.instancebuffer = null;
        this.argsbuffer = null;
        this.compactedbuffer = null;
        this.modelbuffer = null;
        this.culluniform = null;
        this.statsreadback = null;
        this.instancedata = null;
        this.compactedcapacity = 0;
        this.argscapacity = 0;
        this.modelcapacity = 0;
        this.batches = [];
        this.currentbatchcount = 0;
        this.currentindexcounts = [];
        this.currentRegions = 0;
        this.totalInstances = 0;
        this.compactedneeded = 0;
        this.stashedLeftover = null;
        this.prevviewproj = new Matrix4;
        this.lastprojection = new Matrix4;
        this.scratchm1 = new Matrix4;
        this.scratchm2 = new Matrix4;
        this.frames = 0;
        this.stats = {
            frames: 0,
            batches: 0,
            instances: 0,
            visible: -1,
            triangles: -1,
            perbatch: [],
            occluders: -1,
            regions: 0,
            regionsVisible: -1,
            regionSkipped: -1
        };
    }
    iseligible(zasxa) {
        if (!(zasxa instanceof Mesh)) return false;
        if (zasxa instanceof Points || zasxa instanceof Line || zasxa instanceof LineSegments || zasxa instanceof LineLoop) return false;
        if (zasxa.skeleton) return false;
        var zasxb = zasxa.geometry;
        if (!zasxb || !zasxb.index || !zasxb.attributes || !zasxb.attributes.position) return false;
        if (zasxb.morphAttributes) {
            var zasxc = Object.keys(zasxb.morphAttributes);
            for (var zasxd = 0; zasxd < zasxc.length; zasxd++) {
                var zasxe = zasxb.morphAttributes[zasxc[zasxd]];
                if (zasxe && zasxe.length) return false;
            }
        }
        if (!zasxb.boundingSphere && zasxb.computeBoundingSphere) zasxb.computeBoundingSphere();
        if (!zasxb.boundingSphere) return false;
        var zasxf = zasxa.material;
        if (!zasxf) return false;
        if (zasxf.transparent) return false;
        if (zasxf.depthWrite === false) return false;
        return true;
    }
    ensurecullpipeline() {
        if (this.cullpipeline) return;
        this.cullpipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({
                    code: gdrwgsl
                }),
                entryPoint: "cullmain"
            }
        });
        this.culluniform = this.device.createBuffer({
            size: 288,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        if (!this.occ) this.occ = new HiZOcclusion(this.renderer);
    }
    buildBatches(zasxa) {
        var zasxb = [];
        var zasxc = new Map;
        for (var zasxd = 0; zasxd < zasxa.length; zasxd++) {
            var zasxe = zasxa[zasxd];
            if (!this.iseligible(zasxe)) {
                zasxb.push(zasxe);
                continue;
            }
            var zasxf = zasxc.get(zasxe.geometry);
            if (!zasxf) {
                zasxf = new Map;
                zasxc.set(zasxe.geometry, zasxf);
            }
            var zasxg = zasxf.get(zasxe.material);
            if (!zasxg) {
                zasxg = {
                    geometry: zasxe.geometry,
                    material: zasxe.material,
                    sample: zasxe,
                    objects: [],
                    count: 0,
                    compoffset: 0,
                    argsoffset: 0,
                    indexcount: 0
                };
                zasxf.set(zasxe.material, zasxg);
            }
            zasxg.objects.push(zasxe);
            zasxg.count += zasxe instanceof InstancedMesh ? Math.max(1, zasxe.count | 0) : 1;
        }
        this.batches = [];
        var zasxh = zasxc.keys();
        for (var zasxi = zasxh.next(); !zasxi.done; zasxi = zasxh.next()) {
            var zasxj = zasxc.get(zasxi.value);
            var zasxk = zasxj.keys();
            for (var zasxl = zasxk.next(); !zasxl.done; zasxl = zasxk.next()) this.batches.push(zasxj.get(zasxl.value));
        }
        var zasxm = 0;
        var zasxn = 0;
        this.currentindexcounts = [];
        for (var zasxo = 0; zasxo < this.batches.length; zasxo++) {
            var zasxp = this.batches[zasxo];
            zasxp.indexcount = zasxp.geometry.index.length ? zasxp.geometry.index.length : zasxp.geometry.index.array.length;
            this.currentindexcounts.push(zasxp.indexcount);
            zasxp.compoffset = zasxn;
            zasxp.argsoffset = zasxo * 20;
            zasxn = ((zasxn + zasxp.count * 64 + 255) / 256 | 0) * 256;
            zasxm += zasxp.count;
        }
        this.currentbatchcount = this.batches.length;
        this.stats.batches = this.batches.length;
        this.stats.instances = zasxm;
        this.totalInstances = zasxm;
        this.compactedneeded = zasxn;
        this.currentRegions = 0;
        if (this.batches.length === 0 || zasxm === 0) return zasxb;
        var zasxq = zasxm * 96;
        if (!this.instancedata || this.instancedata.byteLength < zasxq) this.instancedata = new ArrayBuffer(zasxq);
        if (!this.instancebuffer || this.instancebuffer.size < zasxq) {
            if (this.instancebuffer) this.instancebuffer.destroy();
            this.instancebuffer = this.device.createBuffer({
                size: Math.max(256, zasxq),
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            });
        }
        if (this.compactedcapacity < zasxn) {
            if (this.compactedbuffer) this.compactedbuffer.destroy();
            this.compactedcapacity = zasxn;
            this.compactedbuffer = this.device.createBuffer({
                size: Math.max(256, zasxn),
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
        }
        var zasxr = this.batches.length * 20;
        if (this.argscapacity < zasxr) {
            if (this.argsbuffer) this.argsbuffer.destroy();
            this.argscapacity = zasxr;
            this.argsbuffer = this.device.createBuffer({
                size: Math.max(256, zasxr),
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            });
        }
        var zasxs = this.batches.length * 512;
        if (this.modelcapacity < zasxs) {
            if (this.modelbuffer) this.modelbuffer.destroy();
            this.modelcapacity = zasxs;
            this.modelbuffer = this.device.createBuffer({
                size: zasxs,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
        }
        var zasxt = new Float32Array(this.instancedata, 0, zasxm * 24);
        var zasxu = new Uint32Array(this.instancedata, 0, zasxm * 24);
        var zasxv = 0;
        for (var zasxw = 0; zasxw < this.batches.length; zasxw++) {
            var zasxx = this.batches[zasxw];
            var zasxy = zasxx.compoffset / 16;
            for (var zasxz = 0; zasxz < zasxx.objects.length; zasxz++) {
                var zasxaa = zasxx.objects[zasxz];
                var zasxab = zasxaa.matrixWorld;
                var zasxac = zasxx.geometry.boundingSphere;
                var zasxad = zasxaa instanceof InstancedMesh ? Math.max(1, zasxaa.count | 0) : 1;
                for (var zasxae = 0; zasxae < zasxad; zasxae++) {
                    var zasxaf = null;
                    if (zasxaa instanceof InstancedMesh) {
                        zasxaa.getMatrixAt(zasxae, this.scratchm1);
                        this.scratchm2.multiplyMatrices(zasxab, this.scratchm1);
                        zasxaf = this.scratchm2.elements;
                    } else {
                        zasxaf = zasxab.elements;
                    }
                    var zasxag = zasxv * 24;
                    for (var zasxah = 0; zasxah < 16; zasxah++) zasxt[zasxag + zasxah] = zasxaf[zasxah];
                    var zasxai = zasxac.center.x, zasxaj = zasxac.center.y, zasxak = zasxac.center.z;
                    zasxt[zasxag + 16] = zasxaf[0] * zasxai + zasxaf[4] * zasxaj + zasxaf[8] * zasxak + zasxaf[12];
                    zasxt[zasxag + 17] = zasxaf[1] * zasxai + zasxaf[5] * zasxaj + zasxaf[9] * zasxak + zasxaf[13];
                    zasxt[zasxag + 18] = zasxaf[2] * zasxai + zasxaf[6] * zasxaj + zasxaf[10] * zasxak + zasxaf[14];
                    var zasxal = zasxaf[0] * zasxaf[0] + zasxaf[1] * zasxaf[1] + zasxaf[2] * zasxaf[2];
                    var zasxam = zasxaf[4] * zasxaf[4] + zasxaf[5] * zasxaf[5] + zasxaf[6] * zasxaf[6];
                    var zasxan = zasxaf[8] * zasxaf[8] + zasxaf[9] * zasxaf[9] + zasxaf[10] * zasxaf[10];
                    var zasxao = zasxal > zasxam ? zasxal : zasxam;
                    if (zasxan > zasxao) zasxao = zasxan;
                    zasxt[zasxag + 19] = zasxac.radius * Math.sqrt(zasxao);
                    zasxu[zasxag + 20] = zasxw;
                    zasxu[zasxag + 21] = zasxy;
                    zasxu[zasxag + 22] = 0;
                    zasxv++;
                }
            }
        }
        var zasxap = new Uint32Array(this.batches.length * 5);
        for (var zasxaq = 0; zasxaq < this.batches.length; zasxaq++) {
            zasxap[zasxaq * 5] = this.currentindexcounts[zasxaq];
            zasxap[zasxaq * 5 + 1] = 0;
            zasxap[zasxaq * 5 + 2] = 0;
            zasxap[zasxaq * 5 + 3] = 0;
            zasxap[zasxaq * 5 + 4] = 0;
        }
        this.device.queue.writeBuffer(this.argsbuffer, 0, zasxap);
        return zasxb;
    }
    uploadInstances() {
        if (this.instancebuffer && this.instancedata && this.totalInstances > 0) this.device.queue.writeBuffer(this.instancebuffer, 0, this.instancedata, 0, this.totalInstances * 96);
    }
    buildRegions() {
        var zasxa = this.totalInstances;
        var zasxb = new Float32Array(this.instancedata, 0, zasxa * 24);
        var zasxc = new Uint32Array(this.instancedata, 0, zasxa * 24);
        var zasxd = Infinity, zasxe = Infinity, zasxf = Infinity, zasxg = -Infinity, zasxh = -Infinity, zasxi = -Infinity;
        for (var zasxj = 0; zasxj < zasxa; zasxj++) {
            var zasxk = zasxb[zasxj * 24 + 16], zasxl = zasxb[zasxj * 24 + 17], zasxm = zasxb[zasxj * 24 + 18];
            if (zasxk < zasxd) zasxd = zasxk;
            if (zasxl < zasxe) zasxe = zasxl;
            if (zasxm < zasxf) zasxf = zasxm;
            if (zasxk > zasxg) zasxg = zasxk;
            if (zasxl > zasxh) zasxh = zasxl;
            if (zasxm > zasxi) zasxi = zasxm;
        }
        var zasxn = Math.max(zasxg - zasxd, Math.max(zasxh - zasxe, zasxi - zasxf));
        var zasxo = Math.max(1, Math.min(24, Math.ceil(Math.pow(zasxa / Math.max(1, this.targetPerRegion), 1 / 3))));
        var zasxp = zasxn > 1e-9 ? zasxn / zasxo : 1;
        var zasxq = new Map;
        var zasxr = new Uint32Array(zasxa);
        var zasxs = [];
        for (var zasxt = 0; zasxt < zasxa; zasxt++) {
            var zasxu = zasxb[zasxt * 24 + 16], zasxv = zasxb[zasxt * 24 + 17], zasxw = zasxb[zasxt * 24 + 18];
            var zasxx = Math.min(zasxo - 1, Math.max(0, Math.floor((zasxu - zasxd) / zasxp)));
            var zasxy = Math.min(zasxo - 1, Math.max(0, Math.floor((zasxv - zasxe) / zasxp)));
            var zasxz = Math.min(zasxo - 1, Math.max(0, Math.floor((zasxw - zasxf) / zasxp)));
            var zasxaa = zasxx + zasxy * zasxo + zasxz * zasxo * zasxo;
            var zasxab = zasxq.get(zasxaa);
            if (zasxab === undefined) {
                zasxab = zasxs.length;
                zasxq.set(zasxaa, zasxab);
                zasxs.push({
                    minx: Infinity,
                    miny: Infinity,
                    minz: Infinity,
                    maxx: -Infinity,
                    maxy: -Infinity,
                    maxz: -Infinity,
                    count: 0
                });
            }
            var zasxac = zasxs[zasxab];
            if (zasxu < zasxac.minx) zasxac.minx = zasxu;
            if (zasxv < zasxac.miny) zasxac.miny = zasxv;
            if (zasxw < zasxac.minz) zasxac.minz = zasxw;
            if (zasxu > zasxac.maxx) zasxac.maxx = zasxu;
            if (zasxv > zasxac.maxy) zasxac.maxy = zasxv;
            if (zasxw > zasxac.maxz) zasxac.maxz = zasxw;
            zasxac.count++;
            zasxr[zasxt] = zasxab;
        }
        var zasxad = new ArrayBuffer(zasxs.length * 32);
        var zasxae = new Float32Array(zasxad);
        var zasxaf = new Uint32Array(zasxad);
        for (var zasxag = 0; zasxag < zasxs.length; zasxag++) {
            var zasxah = zasxs[zasxag];
            zasxae[zasxag * 8] = (zasxah.minx + zasxah.maxx) * .5;
            zasxae[zasxag * 8 + 1] = (zasxah.miny + zasxah.maxy) * .5;
            zasxae[zasxag * 8 + 2] = (zasxah.minz + zasxah.maxz) * .5;
            zasxaf[zasxag * 8 + 4] = zasxah.count;
        }
        for (var zasxai = 0; zasxai < zasxa; zasxai++) {
            var zasxaj = zasxr[zasxai];
            var zasxak = zasxb[zasxai * 24 + 16], zasxal = zasxb[zasxai * 24 + 17], zasxam = zasxb[zasxai * 24 + 18], zasxan = zasxb[zasxai * 24 + 19];
            var zasxao = zasxak - zasxae[zasxaj * 8], zasxap = zasxal - zasxae[zasxaj * 8 + 1], zasxaq = zasxam - zasxae[zasxaj * 8 + 2];
            var zasxar = Math.sqrt(zasxao * zasxao + zasxap * zasxap + zasxaq * zasxaq) + zasxan;
            if (zasxar > zasxae[zasxaj * 8 + 3]) zasxae[zasxaj * 8 + 3] = zasxar;
            zasxc[zasxai * 24 + 22] = zasxaj;
        }
        var zasxas = this.occ.ensureRegionBuffers(zasxs.length);
        if (zasxs.length > 0) this.device.queue.writeBuffer(this.occ.regiondata, 0, zasxad);
        this.currentRegions = zasxs.length;
        if (zasxas) return 0;
        return zasxs.length;
    }
    writeCullUniform(zasxa, zasxb, zasxc, zasxd, zasxe, zasxf, zasxg, zasxh) {
        var zasxi = new ArrayBuffer(288);
        var zasxj = new Float32Array(zasxi);
        var zasxk = new Uint32Array(zasxi);
        var zasxl = zasxc.elements;
        var zasxm = [ zasxl[3] + zasxl[0], zasxl[7] + zasxl[4], zasxl[11] + zasxl[8], zasxl[15] + zasxl[12], zasxl[3] - zasxl[0], zasxl[7] - zasxl[4], zasxl[11] - zasxl[8], zasxl[15] - zasxl[12], zasxl[3] + zasxl[1], zasxl[7] + zasxl[5], zasxl[11] + zasxl[9], zasxl[15] + zasxl[13], zasxl[3] - zasxl[1], zasxl[7] - zasxl[5], zasxl[11] - zasxl[9], zasxl[15] - zasxl[13], zasxl[2], zasxl[6], zasxl[10], zasxl[14], zasxl[3] - zasxl[2], zasxl[7] - zasxl[6], zasxl[11] - zasxl[10], zasxl[15] - zasxl[14] ];
        for (var zasxn = 0; zasxn < 6; zasxn++) {
            var zasxo = Math.sqrt(zasxm[zasxn * 4] * zasxm[zasxn * 4] + zasxm[zasxn * 4 + 1] * zasxm[zasxn * 4 + 1] + zasxm[zasxn * 4 + 2] * zasxm[zasxn * 4 + 2]) || 1;
            zasxm[zasxn * 4] /= zasxo;
            zasxm[zasxn * 4 + 1] /= zasxo;
            zasxm[zasxn * 4 + 2] /= zasxo;
            zasxm[zasxn * 4 + 3] /= zasxo;
        }
        for (var zasxp = 0; zasxp < 16; zasxp++) zasxj[zasxp] = zasxl[zasxp];
        var zasxq = this.prevviewproj.elements;
        for (var zasxr = 0; zasxr < 16; zasxr++) zasxj[16 + zasxr] = zasxq[zasxr];
        for (var zasxs = 0; zasxs < 24; zasxs++) zasxj[32 + zasxs] = zasxm[zasxs];
        var zasxt = zasxd === 1 ? this.occ && this.occ.hiz ? this.occ.hiz.levels : 1 : this.hiz ? this.hiz.levels : 1;
        zasxj[56] = zasxa.width;
        zasxj[57] = zasxa.height;
        zasxj[58] = zasxt;
        zasxj[59] = this.bias;
        zasxk[60] = this.totalInstances;
        zasxk[61] = this.currentbatchcount;
        zasxk[62] = zasxd === 1 ? zasxh ? 1 : 0 : this.occlusion && this.hiz && this.hiz.ready ? 1 : 0;
        zasxk[63] = zasxd;
        var zasxu = zasxb.projectionMatrix.elements;
        zasxj[64] = zasxu[14] !== 0 ? -zasxu[14] * .5 : 0;
        zasxj[65] = zasxe;
        zasxj[66] = zasxd === 1 ? this.hysteresis : 0;
        zasxj[67] = zasxg > 0 ? 1 : 0;
        zasxk[68] = zasxg;
        zasxk[69] = zasxf;
        zasxk[70] = 0;
        zasxk[71] = 0;
        this.device.queue.writeBuffer(this.culluniform, 0, zasxi);
    }
    cullBind() {
        var zasxa = this.twoPhase && this.occ && this.occ.hiz && this.occ.hiz.ready ? this.occ.hiz.fullview : this.hiz.fullview;
        return this.device.createBindGroup({
            layout: this.cullpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.culluniform
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.instancebuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.argsbuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.compactedbuffer
                }
            }, {
                binding: 4,
                resource: zasxa
            }, {
                binding: 5,
                resource: {
                    buffer: this.occ.visibility
                }
            }, {
                binding: 6,
                resource: {
                    buffer: this.occ.regionvisible
                }
            }, {
                binding: 7,
                resource: {
                    buffer: this.occ.skipcounter
                }
            } ]
        });
    }
    dispatchCull(zasxa) {
        zasxa.setPipeline(this.cullpipeline);
        zasxa.setBindGroup(0, this.cullBind());
        zasxa.dispatchWorkgroups(Math.ceil(this.totalInstances / 64));
    }
    beginFrame(zasxa, zasxb, zasxc, zasxd) {
        this.stashedLeftover = [];
        if (!this.enabled) return;
        this.ensurecullpipeline();
        if (!this.hiz) this.hiz = new HiZBuffer(this.device, zasxa.width, zasxa.height); else this.hiz.resize(zasxa.width, zasxa.height);
        var zasxe = [], zasxf = [];
        zasxb.traverseVisible(function(zasxa) {
            if (!(zasxa instanceof Mesh) || !zasxa.geometry || !zasxa.geometry.attributes || !zasxa.geometry.attributes.position) return;
            if (zasxa.material && zasxa.material.transparent) zasxf.push(zasxa); else zasxe.push(zasxa);
        });
        this.stashedLeftover = this.buildBatches(zasxe);
        if (this.batches.length === 0 || this.totalInstances === 0) return;
        this.occ.resize(zasxa.width, zasxa.height);
        this.occ.ensureAuxBuffers(this.totalInstances);
        var zasxg = 0;
        if (this.regions) zasxg = this.buildRegions();
        this.uploadInstances();
        var zasxh = this.occ.nextStamp();
        if (this.occlusion) {
            this.occ.ensureOccluderBuffers(this.compactedneeded, this.currentbatchcount);
            this.occ.writeOccluderArgs(this.currentindexcounts);
        }
        this.occ.writeSkipCounter();
        this.writeCullUniform(zasxa, zasxc, zasxd, 1, zasxh, this.occ.prevstamp, zasxg, this.occlusion ? 1 : 0);
        var zasxi = this.device.createCommandEncoder();
        if (this.occlusion) {
            this.occ.dispatchOccluderBuild(zasxi, this);
            this.occ.renderOccluders(zasxi, zasxa, this.batches);
            this.occ.buildPyramid(zasxi);
        }
        var zasxj = zasxi.beginComputePass();
        if (zasxg > 0) this.occ.dispatchRegions(zasxj, this, zasxg);
        this.dispatchCull(zasxj);
        zasxj.end();
        this.device.queue.submit([ zasxi.finish() ]);
        this.frames++;
        this.stats.frames = this.frames;
        this.lastprojection.copy(zasxd);
    }
    prepare(zasxa, zasxb, zasxc, zasxd, zasxe) {
        if (this.twoPhase) return this.stashedLeftover || [];
        var zasxf = [];
        if (!this.enabled) return zasxb;
        this.ensurecullpipeline();
        if (!this.hiz) this.hiz = new HiZBuffer(this.device, zasxc.width, zasxc.height); else this.hiz.resize(zasxc.width, zasxc.height);
        zasxf = this.buildBatches(zasxb);
        if (this.batches.length === 0 || this.totalInstances === 0) return zasxf;
        this.occ.ensureAuxBuffers(this.totalInstances);
        this.occ.writeSkipCounter();
        this.uploadInstances();
        this.writeCullUniform(zasxc, zasxd, zasxe, 0, 0, 0, 0, 0);
        var zasxg = this.device.createCommandEncoder();
        var zasxh = zasxg.beginComputePass();
        this.dispatchCull(zasxh);
        zasxh.end();
        this.device.queue.submit([ zasxg.finish() ]);
        this.frames++;
        this.stats.frames = this.frames;
        this.lastprojection.copy(zasxe);
        return zasxf;
    }
    draw(zasxa, zasxb) {
        if (!this.enabled || this.batches.length === 0) return;
        var zasxc = new Float32Array(this.batches.length * 128);
        for (var zasxd = 0; zasxd < this.batches.length; zasxd++) {
            var zasxe = this.batches[zasxd];
            var zasxf = zasxe.material;
            var zasxg = zasxd * 128;
            zasxc[zasxg] = 1;
            zasxc[zasxg + 5] = 1;
            zasxc[zasxg + 10] = 1;
            zasxc[zasxg + 15] = 1;
            zasxc[zasxg + 16] = 1;
            zasxc[zasxg + 21] = 1;
            zasxc[zasxg + 26] = 1;
            zasxc[zasxg + 31] = 1;
            var zasxh = zasxf && zasxf.color ? zasxf.color : new Color(16777215);
            zasxc[zasxg + 32] = zasxh.r;
            zasxc[zasxg + 33] = zasxh.g;
            zasxc[zasxg + 34] = zasxh.b;
            zasxc[zasxg + 35] = zasxf && zasxf.opacity !== undefined ? zasxf.opacity : 1;
            zasxc[zasxg + 36] = zasxf && zasxf.metalness !== undefined ? zasxf.metalness : 0;
            zasxc[zasxg + 37] = zasxf && zasxf.roughness !== undefined ? zasxf.roughness : .5;
            zasxc[zasxg + 38] = zasxf && zasxf.clearcoat !== undefined ? zasxf.clearcoat : 0;
            zasxc[zasxg + 39] = zasxf && zasxf.transmission !== undefined ? zasxf.transmission : 0;
            var zasxi = zasxf && zasxf.emissive ? zasxf.emissive : new Color(0);
            zasxc[zasxg + 40] = zasxi.r;
            zasxc[zasxg + 41] = zasxi.g;
            zasxc[zasxg + 42] = zasxi.b;
            zasxc[zasxg + 43] = 1;
            zasxc[zasxg + 44] = zasxf && zasxf.sheen !== undefined ? zasxf.sheen : 0;
            zasxc[zasxg + 45] = zasxf && zasxf.iridescence !== undefined ? zasxf.iridescence : 0;
            zasxc[zasxg + 46] = zasxf && zasxf.anisotropy !== undefined ? zasxf.anisotropy : 0;
            zasxc[zasxg + 47] = zasxf && zasxf.normalScale ? zasxf.normalScale.x : .15;
            zasxc[zasxg + 48] = 0;
            zasxc[zasxg + 49] = 0;
            zasxc[zasxg + 50] = 1;
            var zasxj = zasxf && zasxf.envMap;
            zasxc[zasxg + 51] = zasxj ? 1 : 0;
            zasxc[zasxg + 52] = 0;
            zasxc[zasxg + 53] = 0;
            zasxc[zasxg + 54] = 0;
            zasxc[zasxg + 55] = 0;
            var zasxk = zasxf instanceof BasicMaterial && !(zasxf instanceof LineMaterial) || zasxf instanceof PointsMaterial || zasxf instanceof LineBasicMaterial ? 1 : 0;
            zasxc[zasxg + 56] = zasxk;
            zasxc[zasxg + 57] = zasxf && zasxf.vertexColors ? 1 : 0;
            zasxc[zasxg + 58] = zasxf && zasxf.alphaTest ? 1 : 0;
            zasxc[zasxg + 59] = zasxf && zasxf.alphaCutoff !== undefined ? zasxf.alphaCutoff : .5;
            zasxc[zasxg + 60] = zasxf && zasxf.envMapIntensity !== undefined ? zasxf.envMapIntensity : 1;
            zasxc[zasxg + 61] = zasxf && zasxf.emissiveStrength !== undefined ? zasxf.emissiveStrength : 1;
            zasxc[zasxg + 62] = zasxf && zasxf.clearcoatRoughness !== undefined ? zasxf.clearcoatRoughness : .03;
            var zasxl = zasxf && zasxf.iridescenceThicknessRange ? zasxf.iridescenceThicknessRange : [ 100, 400 ];
            zasxc[zasxg + 63] = (zasxl[0] + zasxl[1]) * .5;
            zasxc[zasxg + 64] = zasxf && zasxf.anisotropyRotation !== undefined ? zasxf.anisotropyRotation : 0;
        }
        this.device.queue.writeBuffer(this.modelbuffer, 0, zasxc);
        for (var zasxm = 0; zasxm < this.batches.length; zasxm++) {
            var zasxn = this.batches[zasxm];
            var zasxo = zasxn.sample;
            var zasxp = zasxn.material;
            var zasxq = zasxb.pipelineFor(zasxp, "triangle-list");
            var zasxr = zasxb.cameraBindFor(zasxq);
            var zasxs = zasxb.attribute(zasxo, "position", 3, [ 0, 0, 0 ]);
            var zasxt = zasxb.attribute(zasxo, "normal", 3, [ 0, 1, 0 ]);
            var zasxu = zasxb.attribute(zasxo, "uv", 2, [ 0, 0 ]);
            var zasxv = zasxb.attribute(zasxo, "color", 3, [ 1, 1, 1 ]);
            var zasxw = zasxb.resourceManager.buffer(zasxs, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zasxx = zasxb.resourceManager.buffer(zasxt, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zasxy = zasxb.resourceManager.buffer(zasxu, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zasxz = zasxb.resourceManager.buffer(zasxv, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zasxaa = zasxs.array.length / zasxs.itemSize;
            var zasxab = zasxb.skinPackFor(zasxn.geometry, zasxn.geometry.attributes.skinIndex, zasxn.geometry.attributes.skinWeight, zasxaa);
            var zasxac = zasxb.resourceManager.buffer(zasxab, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zasxad = zasxb.morphPackFor(zasxn.geometry, zasxaa);
            var zasxae = zasxb.resourceManager.buffer(zasxad, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var zasxaf = zasxp && (zasxp.diffuseMap || zasxp.map);
            var zasxag = zasxp && zasxp.normalmap;
            var zasxah = zasxp && zasxp.roughnessmap;
            var zasxai = zasxp && zasxp.metalnessmap;
            var zasxaj = zasxp && zasxp.aomap;
            var zasxak = zasxp && zasxp.emissivemap;
            var zasxal = zasxp && zasxp.envMap;
            var zasxam = zasxaf ? zasxb.resourceManager.texture(zasxaf, [ 255, 255, 255, 255 ]) : zasxb.resourceManager.defaultTextureResource("white", [ 255, 255, 255, 255 ]);
            var zasxan = zasxag ? zasxb.resourceManager.texture(zasxag) : zasxb.resourceManager.defaultTextureResource("normal", [ 128, 128, 255, 255 ]);
            var zasxao = zasxah ? zasxb.resourceManager.texture(zasxah) : zasxb.resourceManager.defaultTextureResource("roughness", [ 0, 255, 0, 255 ]);
            var zasxap = zasxai ? zasxb.resourceManager.texture(zasxai) : zasxb.resourceManager.defaultTextureResource("metalness", [ 0, 0, 255, 255 ]);
            var zasxaq = zasxaj ? zasxb.resourceManager.texture(zasxaj) : zasxb.resourceManager.defaultTextureResource("ao", [ 255, 255, 255, 255 ]);
            var zasxar = zasxak ? zasxb.resourceManager.texture(zasxak) : zasxb.resourceManager.defaultTextureResource("emissive", [ 0, 0, 0, 255 ]);
            var zasxas = zasxal && zasxal.resource ? zasxal.resource : zasxal && zasxal instanceof CubeTexture ? zasxb.resourceManager.cubeTexture(zasxal) : zasxb.resourceManager.defaultCubeResource();
            var zasxat = this.device.createBindGroup({
                layout: zasxq.getBindGroupLayout(1),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: this.modelbuffer,
                        offset: zasxm * 512,
                        size: 272
                    }
                }, {
                    binding: 1,
                    resource: zasxam.view
                }, {
                    binding: 2,
                    resource: zasxam.sampler
                }, {
                    binding: 3,
                    resource: zasxan.view
                }, {
                    binding: 4,
                    resource: zasxan.sampler
                }, {
                    binding: 5,
                    resource: zasxao.view
                }, {
                    binding: 6,
                    resource: zasxao.sampler
                }, {
                    binding: 7,
                    resource: zasxap.view
                }, {
                    binding: 8,
                    resource: zasxap.sampler
                }, {
                    binding: 9,
                    resource: zasxaq.view
                }, {
                    binding: 10,
                    resource: zasxaq.sampler
                }, {
                    binding: 11,
                    resource: zasxar.view
                }, {
                    binding: 12,
                    resource: zasxar.sampler
                }, {
                    binding: 13,
                    resource: zasxas.view
                }, {
                    binding: 14,
                    resource: zasxas.sampler
                } ]
            });
            var zasxau = zasxb.resourceManager.boneResource(null);
            var zasxav = this.device.createBindGroup({
                layout: zasxq.getBindGroupLayout(2),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: zasxau.buffer
                    }
                } ]
            });
            var zasxaw = zasxn.geometry.index;
            var zasxax = zasxb.resourceManager.buffer({
                array: zasxaw
            }, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
            zasxa.setPipeline(zasxq);
            zasxa.setBindGroup(0, zasxr);
            zasxa.setBindGroup(1, zasxat);
            zasxa.setBindGroup(2, zasxav);
            zasxa.setVertexBuffer(0, zasxw);
            zasxa.setVertexBuffer(1, zasxx);
            zasxa.setVertexBuffer(2, zasxy);
            zasxa.setVertexBuffer(3, zasxac);
            zasxa.setVertexBuffer(4, zasxae);
            zasxa.setVertexBuffer(5, zasxz);
            zasxa.setVertexBuffer(6, this.compactedbuffer, zasxn.compoffset);
            zasxa.setIndexBuffer(zasxax, zasxaw instanceof Uint32Array ? "uint32" : "uint16");
            zasxa.drawIndexedIndirect(this.argsbuffer, zasxn.argsoffset);
            zasxb.info.render.calls++;
            zasxb.info.render.triangles += Math.floor(zasxn.indexcount / 3) * zasxn.count;
        }
    }
    afterRender(zasxa, zasxb, zasxc) {
        if (!this.enabled || !this.hiz) return;
        if (this.twoPhase) return;
        this.hiz.build(zasxa, zasxc);
        this.prevviewproj.copy(this.lastprojection);
    }
    readStats() {
        var zasxa = this;
        if (!this.argsbuffer || !this.currentbatchcount) return Promise.resolve(this.stats);
        var zasxb = this.currentbatchcount;
        var zasxc = this.currentRegions || 0;
        var zasxd = this.twoPhase && this.occ && this.occ.occluderargs;
        var zasxe = zasxb * 20 + (zasxd ? zasxb * 20 + zasxc * 4 + 16 : 0);
        if (!this.statsreadback || this.statsreadback.size < zasxe) {
            if (this.statsreadback) this.statsreadback.destroy();
            this.statsreadback = this.device.createBuffer({
                size: Math.max(256, zasxe),
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            });
        }
        var zasxf = this.device.createCommandEncoder();
        zasxf.copyBufferToBuffer(this.argsbuffer, 0, this.statsreadback, 0, zasxb * 20);
        if (zasxd) {
            zasxf.copyBufferToBuffer(this.occ.occluderargs, 0, this.statsreadback, zasxb * 20, zasxb * 20);
            if (zasxc > 0) zasxf.copyBufferToBuffer(this.occ.regionvisible, 0, this.statsreadback, zasxb * 40, zasxc * 4);
            zasxf.copyBufferToBuffer(this.occ.skipcounter, 0, this.statsreadback, zasxb * 40 + zasxc * 4, 16);
        }
        this.device.queue.submit([ zasxf.finish() ]);
        var zasxg = this.occ ? this.occ.stamp : 0;
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return zasxa.statsreadback.mapAsync(GPUMapMode.READ).then(function() {
                var zasxe = new Uint32Array(zasxa.statsreadback.getMappedRange());
                var zasxf = [];
                var zasxh = 0;
                for (var zasxi = 0; zasxi < zasxb; zasxi++) {
                    zasxf.push(zasxe[zasxi * 5 + 1]);
                    zasxh += zasxe[zasxi * 5 + 1];
                }
                var zasxj = 0;
                for (var zasxk = 0; zasxk < zasxf.length; zasxk++) zasxj += zasxf[zasxk] * Math.floor(zasxa.currentindexcounts[zasxk] / 3);
                zasxa.stats.visible = zasxh;
                zasxa.stats.triangles = zasxj;
                zasxa.stats.perbatch = zasxf;
                if (zasxd) {
                    var zasxl = 0;
                    for (var zasxm = 0; zasxm < zasxb; zasxm++) zasxl += zasxe[zasxb * 5 + zasxm * 5 + 1];
                    zasxa.stats.occluders = zasxl;
                    zasxa.stats.regions = zasxc;
                    var zasxn = 0;
                    for (var zasxo = 0; zasxo < zasxc; zasxo++) if (zasxe[zasxb * 10 + zasxo] === zasxg) zasxn++;
                    zasxa.stats.regionsVisible = zasxn;
                    zasxa.stats.regionSkipped = zasxe[zasxb * 10 + zasxc];
                }
                zasxa.statsreadback.unmap();
                return zasxa.stats;
            });
        });
    }
    readVisibility() {
        var zasxa = this;
        if (!this.occ || !this.occ.visibility || !this.totalInstances) return Promise.resolve(new Uint32Array(0));
        var zasxb = this.device.createBuffer({
            size: Math.max(16, this.totalInstances * 4),
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        var zasxc = this.device.createCommandEncoder();
        zasxc.copyBufferToBuffer(this.occ.visibility, 0, zasxb, 0, this.totalInstances * 4);
        this.device.queue.submit([ zasxc.finish() ]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return zasxb.mapAsync(GPUMapMode.READ).then(function() {
                var zasxa = new Uint32Array(zasxb.getMappedRange().slice(0));
                zasxb.unmap();
                zasxb.destroy();
                return zasxa;
            });
        });
    }
    dispose() {
        if (this.instancebuffer) this.instancebuffer.destroy();
        if (this.argsbuffer) this.argsbuffer.destroy();
        if (this.compactedbuffer) this.compactedbuffer.destroy();
        if (this.modelbuffer) this.modelbuffer.destroy();
        if (this.culluniform) this.culluniform.destroy();
        if (this.statsreadback) this.statsreadback.destroy();
        if (this.hiz) this.hiz.dispose();
        if (this.occ) this.occ.dispose();
        this.instancebuffer = null;
        this.argsbuffer = null;
        this.compactedbuffer = null;
        this.modelbuffer = null;
        this.culluniform = null;
        this.statsreadback = null;
        this.hiz = null;
        this.occ = null;
        this.cullpipeline = null;
        this.compactedcapacity = 0;
        this.argscapacity = 0;
        this.modelcapacity = 0;
        this.batches = [];
    }
}

export { GPUDrivenPipeline };
