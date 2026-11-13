import { Color, Matrix4 } from "../math/index.js";
import { InstancedMesh, Line, LineLoop, LineSegments, Mesh, Points } from "../objects/index.js";
import { BasicMaterial, LineBasicMaterial, LineMaterial, PointsMaterial } from "../materials/index.js";
import { CubeTexture } from "../textures/index.js";
import { HiZBuffer } from "./HiZBuffer.js";
import { HiZOcclusion, gdrwgsl } from "./HiZOcclusion.js";

class GPUDrivenPipeline {
    constructor(renderer) {
        this.renderer = renderer;
        this.device = renderer.device;
        this.enabled = true;
        this.occlusion = true;
        this.bias = 0.00005;
        this.twoPhase = false;
        this.regions = true;
        this.targetPerRegion = 8;
        this.hysteresis = 0.0005;
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
        this.prevviewproj = new Matrix4();
        this.lastprojection = new Matrix4();
        this.scratchm1 = new Matrix4();
        this.scratchm2 = new Matrix4();
        this.frames = 0;
        this.stats = { frames: 0, batches: 0, instances: 0, visible: -1, triangles: -1, perbatch: [], occluders: -1, regions: 0, regionsVisible: -1, regionSkipped: -1 };
    }
    iseligible(object) {
        if (!(object instanceof Mesh)) return false;
        if (object instanceof Points || object instanceof Line || object instanceof LineSegments || object instanceof LineLoop) return false;
        if (object.skeleton) return false;
        var geometry = object.geometry;
        if (!geometry || !geometry.index || !geometry.attributes || !geometry.attributes.position) return false;
        if (geometry.morphAttributes) {
            var keys = Object.keys(geometry.morphAttributes);
            for (var i = 0; i < keys.length; i++) {
                var list = geometry.morphAttributes[keys[i]];
                if (list && list.length) return false;
            }
        }
        if (!geometry.boundingSphere && geometry.computeBoundingSphere) geometry.computeBoundingSphere();
        if (!geometry.boundingSphere) return false;
        var material = object.material;
        if (!material) return false;
        if (material.transparent) return false;
        if (material.depthWrite === false) return false;
        return true;
    }
    ensurecullpipeline() {
        if (this.cullpipeline) return;
        this.cullpipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: gdrwgsl }), entryPoint: "cullmain" } });
        this.culluniform = this.device.createBuffer({ size: 288, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        if (!this.occ) this.occ = new HiZOcclusion(this.renderer);
    }
    buildBatches(items) {
        var leftover = [];
        var bygeo = new Map();
        for (var i = 0; i < items.length; i++) {
            var object = items[i];
            if (!this.iseligible(object)) { leftover.push(object); continue; }
            var bymat = bygeo.get(object.geometry);
            if (!bymat) { bymat = new Map(); bygeo.set(object.geometry, bymat); }
            var batch = bymat.get(object.material);
            if (!batch) { batch = { geometry: object.geometry, material: object.material, sample: object, objects: [], count: 0, compoffset: 0, argsoffset: 0, indexcount: 0 }; bymat.set(object.material, batch); }
            batch.objects.push(object);
            batch.count += object instanceof InstancedMesh ? Math.max(1, object.count | 0) : 1;
        }
        this.batches = [];
        var geokeys = bygeo.keys();
        for (var g = geokeys.next(); !g.done; g = geokeys.next()) {
            var matmap = bygeo.get(g.value);
            var matkeys = matmap.keys();
            for (var mt = matkeys.next(); !mt.done; mt = matkeys.next()) this.batches.push(matmap.get(mt.value));
        }
        var total = 0;
        var compoffset = 0;
        this.currentindexcounts = [];
        for (var b = 0; b < this.batches.length; b++) {
            var bt = this.batches[b];
            bt.indexcount = bt.geometry.index.length ? bt.geometry.index.length : bt.geometry.index.array.length;
            this.currentindexcounts.push(bt.indexcount);
            bt.compoffset = compoffset;
            bt.argsoffset = b * 20;
            compoffset = ((compoffset + bt.count * 64 + 255) / 256 | 0) * 256;
            total += bt.count;
        }
        this.currentbatchcount = this.batches.length;
        this.stats.batches = this.batches.length;
        this.stats.instances = total;
        this.totalInstances = total;
        this.compactedneeded = compoffset;
        this.currentRegions = 0;
        if (this.batches.length === 0 || total === 0) return leftover;
        var needed = total * 96;
        if (!this.instancedata || this.instancedata.byteLength < needed) this.instancedata = new ArrayBuffer(needed);
        if (!this.instancebuffer || this.instancebuffer.size < needed) {
            if (this.instancebuffer) this.instancebuffer.destroy();
            this.instancebuffer = this.device.createBuffer({ size: Math.max(256, needed), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        }
        if (this.compactedcapacity < compoffset) {
            if (this.compactedbuffer) this.compactedbuffer.destroy();
            this.compactedcapacity = compoffset;
            this.compactedbuffer = this.device.createBuffer({ size: Math.max(256, compoffset), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        }
        var argsneeded = this.batches.length * 20;
        if (this.argscapacity < argsneeded) {
            if (this.argsbuffer) this.argsbuffer.destroy();
            this.argscapacity = argsneeded;
            this.argsbuffer = this.device.createBuffer({ size: Math.max(256, argsneeded), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        }
        var modelneeded = this.batches.length * 512;
        if (this.modelcapacity < modelneeded) {
            if (this.modelbuffer) this.modelbuffer.destroy();
            this.modelcapacity = modelneeded;
            this.modelbuffer = this.device.createBuffer({ size: modelneeded, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        }
        var f32 = new Float32Array(this.instancedata, 0, total * 24);
        var u32 = new Uint32Array(this.instancedata, 0, total * 24);
        var rec = 0;
        for (var b2 = 0; b2 < this.batches.length; b2++) {
            var bt2 = this.batches[b2];
            var compvec4 = bt2.compoffset / 16;
            for (var o = 0; o < bt2.objects.length; o++) {
                var obj = bt2.objects[o];
                var world = obj.matrixWorld;
                var sphere = bt2.geometry.boundingSphere;
                var n = obj instanceof InstancedMesh ? Math.max(1, obj.count | 0) : 1;
                for (var k = 0; k < n; k++) {
                    var e = null;
                    if (obj instanceof InstancedMesh) {
                        obj.getMatrixAt(k, this.scratchm1);
                        this.scratchm2.multiplyMatrices(world, this.scratchm1);
                        e = this.scratchm2.elements;
                    } else {
                        e = world.elements;
                    }
                    var base = rec * 24;
                    for (var q = 0; q < 16; q++) f32[base + q] = e[q];
                    var cx = sphere.center.x, cy = sphere.center.y, cz = sphere.center.z;
                    f32[base + 16] = e[0] * cx + e[4] * cy + e[8] * cz + e[12];
                    f32[base + 17] = e[1] * cx + e[5] * cy + e[9] * cz + e[13];
                    f32[base + 18] = e[2] * cx + e[6] * cy + e[10] * cz + e[14];
                    var c0 = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
                    var c1 = e[4] * e[4] + e[5] * e[5] + e[6] * e[6];
                    var c2 = e[8] * e[8] + e[9] * e[9] + e[10] * e[10];
                    var ms = c0 > c1 ? c0 : c1;
                    if (c2 > ms) ms = c2;
                    f32[base + 19] = sphere.radius * Math.sqrt(ms);
                    u32[base + 20] = b2;
                    u32[base + 21] = compvec4;
                    u32[base + 22] = 0;
                    rec++;
                }
            }
        }
        var args = new Uint32Array(this.batches.length * 5);
        for (var a = 0; a < this.batches.length; a++) {
            args[a * 5] = this.currentindexcounts[a];
            args[a * 5 + 1] = 0;
            args[a * 5 + 2] = 0;
            args[a * 5 + 3] = 0;
            args[a * 5 + 4] = 0;
        }
        this.device.queue.writeBuffer(this.argsbuffer, 0, args);
        return leftover;
    }
    uploadInstances() {
        if (this.instancebuffer && this.instancedata && this.totalInstances > 0) this.device.queue.writeBuffer(this.instancebuffer, 0, this.instancedata, 0, this.totalInstances * 96);
    }
    buildRegions() {
        var total = this.totalInstances;
        var f = new Float32Array(this.instancedata, 0, total * 24);
        var u = new Uint32Array(this.instancedata, 0, total * 24);
        var minx = Infinity, miny = Infinity, minz = Infinity, maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
        for (var i = 0; i < total; i++) {
            var cx = f[i * 24 + 16], cy = f[i * 24 + 17], cz = f[i * 24 + 18];
            if (cx < minx) minx = cx;
            if (cy < miny) miny = cy;
            if (cz < minz) minz = cz;
            if (cx > maxx) maxx = cx;
            if (cy > maxy) maxy = cy;
            if (cz > maxz) maxz = cz;
        }
        var ext = Math.max(maxx - minx, Math.max(maxy - miny, maxz - minz));
        var res = Math.max(1, Math.min(24, Math.ceil(Math.pow(total / Math.max(1, this.targetPerRegion), 1 / 3))));
        var cell = ext > 1e-9 ? ext / res : 1;
        var map = new Map();
        var regionof = new Uint32Array(total);
        var regions = [];
        for (var i2 = 0; i2 < total; i2++) {
            var cx2 = f[i2 * 24 + 16], cy2 = f[i2 * 24 + 17], cz2 = f[i2 * 24 + 18];
            var ix = Math.min(res - 1, Math.max(0, Math.floor((cx2 - minx) / cell)));
            var iy = Math.min(res - 1, Math.max(0, Math.floor((cy2 - miny) / cell)));
            var iz = Math.min(res - 1, Math.max(0, Math.floor((cz2 - minz) / cell)));
            var key = ix + iy * res + iz * res * res;
            var idx = map.get(key);
            if (idx === undefined) { idx = regions.length; map.set(key, idx); regions.push({ minx: Infinity, miny: Infinity, minz: Infinity, maxx: -Infinity, maxy: -Infinity, maxz: -Infinity, count: 0 }); }
            var rg = regions[idx];
            if (cx2 < rg.minx) rg.minx = cx2;
            if (cy2 < rg.miny) rg.miny = cy2;
            if (cz2 < rg.minz) rg.minz = cz2;
            if (cx2 > rg.maxx) rg.maxx = cx2;
            if (cy2 > rg.maxy) rg.maxy = cy2;
            if (cz2 > rg.maxz) rg.maxz = cz2;
            rg.count++;
            regionof[i2] = idx;
        }
        var data = new ArrayBuffer(regions.length * 32);
        var df = new Float32Array(data);
        var du = new Uint32Array(data);
        for (var r = 0; r < regions.length; r++) {
            var rg2 = regions[r];
            df[r * 8] = (rg2.minx + rg2.maxx) * 0.5;
            df[r * 8 + 1] = (rg2.miny + rg2.maxy) * 0.5;
            df[r * 8 + 2] = (rg2.minz + rg2.maxz) * 0.5;
            du[r * 8 + 4] = rg2.count;
        }
        for (var i3 = 0; i3 < total; i3++) {
            var r2 = regionof[i3];
            var cx3 = f[i3 * 24 + 16], cy3 = f[i3 * 24 + 17], cz3 = f[i3 * 24 + 18], rad = f[i3 * 24 + 19];
            var dx = cx3 - df[r2 * 8], dy = cy3 - df[r2 * 8 + 1], dz = cz3 - df[r2 * 8 + 2];
            var d = Math.sqrt(dx * dx + dy * dy + dz * dz) + rad;
            if (d > df[r2 * 8 + 3]) df[r2 * 8 + 3] = d;
            u[i3 * 24 + 22] = r2;
        }
        var grew = this.occ.ensureRegionBuffers(regions.length);
        if (regions.length > 0) this.device.queue.writeBuffer(this.occ.regiondata, 0, data);
        this.currentRegions = regions.length;
        if (grew) return 0;
        return regions.length;
    }
    writeCullUniform(renderer, camera, projection, mode, stamp, prevstamp, regioncount, occon) {
        var uni = new ArrayBuffer(288);
        var uf = new Float32Array(uni);
        var uu = new Uint32Array(uni);
        var pe = projection.elements;
        var planes = [
            pe[3] + pe[0], pe[7] + pe[4], pe[11] + pe[8], pe[15] + pe[12],
            pe[3] - pe[0], pe[7] - pe[4], pe[11] - pe[8], pe[15] - pe[12],
            pe[3] + pe[1], pe[7] + pe[5], pe[11] + pe[9], pe[15] + pe[13],
            pe[3] - pe[1], pe[7] - pe[5], pe[11] - pe[9], pe[15] - pe[13],
            pe[2], pe[6], pe[10], pe[14],
            pe[3] - pe[2], pe[7] - pe[6], pe[11] - pe[10], pe[15] - pe[14]
        ];
        for (var pl = 0; pl < 6; pl++) {
            var ln = Math.sqrt(planes[pl * 4] * planes[pl * 4] + planes[pl * 4 + 1] * planes[pl * 4 + 1] + planes[pl * 4 + 2] * planes[pl * 4 + 2]) || 1;
            planes[pl * 4] /= ln; planes[pl * 4 + 1] /= ln; planes[pl * 4 + 2] /= ln; planes[pl * 4 + 3] /= ln;
        }
        for (var pv = 0; pv < 16; pv++) uf[pv] = pe[pv];
        var pve = this.prevviewproj.elements;
        for (var pw = 0; pw < 16; pw++) uf[16 + pw] = pve[pw];
        for (var pp = 0; pp < 24; pp++) uf[32 + pp] = planes[pp];
        var hizlevels = mode === 1 ? (this.occ && this.occ.hiz ? this.occ.hiz.levels : 1) : (this.hiz ? this.hiz.levels : 1);
        uf[56] = renderer.width;
        uf[57] = renderer.height;
        uf[58] = hizlevels;
        uf[59] = this.bias;
        uu[60] = this.totalInstances;
        uu[61] = this.currentbatchcount;
        uu[62] = mode === 1 ? (occon ? 1 : 0) : (this.occlusion && this.hiz && this.hiz.ready ? 1 : 0);
        uu[63] = mode;
        var pje = camera.projectionMatrix.elements;
        uf[64] = pje[14] !== 0 ? -pje[14] * 0.5 : 0;
        uf[65] = stamp;
        uf[66] = mode === 1 ? this.hysteresis : 0;
        uf[67] = regioncount > 0 ? 1 : 0;
        uu[68] = regioncount;
        uu[69] = prevstamp;
        uu[70] = 0;
        uu[71] = 0;
        this.device.queue.writeBuffer(this.culluniform, 0, uni);
    }
    cullBind() {
        var hizview = this.twoPhase && this.occ && this.occ.hiz && this.occ.hiz.ready ? this.occ.hiz.fullview : this.hiz.fullview;
        return this.device.createBindGroup({ layout: this.cullpipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.culluniform } },
            { binding: 1, resource: { buffer: this.instancebuffer } },
            { binding: 2, resource: { buffer: this.argsbuffer } },
            { binding: 3, resource: { buffer: this.compactedbuffer } },
            { binding: 4, resource: hizview },
            { binding: 5, resource: { buffer: this.occ.visibility } },
            { binding: 6, resource: { buffer: this.occ.regionvisible } },
            { binding: 7, resource: { buffer: this.occ.skipcounter } }
        ] });
    }
    dispatchCull(pass) {
        pass.setPipeline(this.cullpipeline);
        pass.setBindGroup(0, this.cullBind());
        pass.dispatchWorkgroups(Math.ceil(this.totalInstances / 64));
    }
    beginFrame(renderer, scene, camera, projection) {
        this.stashedLeftover = [];
        if (!this.enabled) return;
        this.ensurecullpipeline();
        if (!this.hiz) this.hiz = new HiZBuffer(this.device, renderer.width, renderer.height);
        else this.hiz.resize(renderer.width, renderer.height);
        var opaque = [], transparent = [];
        scene.traverseVisible(function (object) {
            if (!(object instanceof Mesh) || !object.geometry || !object.geometry.attributes || !object.geometry.attributes.position) return;
            if (object.material && object.material.transparent) transparent.push(object); else opaque.push(object);
        });
        this.stashedLeftover = this.buildBatches(opaque);
        if (this.batches.length === 0 || this.totalInstances === 0) return;
        this.occ.resize(renderer.width, renderer.height);
        this.occ.ensureAuxBuffers(this.totalInstances);
        var regioncount = 0;
        if (this.regions) regioncount = this.buildRegions();
        this.uploadInstances();
        var stamp = this.occ.nextStamp();
        if (this.occlusion) {
            this.occ.ensureOccluderBuffers(this.compactedneeded, this.currentbatchcount);
            this.occ.writeOccluderArgs(this.currentindexcounts);
        }
        this.occ.writeSkipCounter();
        this.writeCullUniform(renderer, camera, projection, 1, stamp, this.occ.prevstamp, regioncount, this.occlusion ? 1 : 0);
        var encoder = this.device.createCommandEncoder();
        if (this.occlusion) {
            this.occ.dispatchOccluderBuild(encoder, this);
            this.occ.renderOccluders(encoder, renderer, this.batches);
            this.occ.buildPyramid(encoder);
        }
        var pass = encoder.beginComputePass();
        if (regioncount > 0) this.occ.dispatchRegions(pass, this, regioncount);
        this.dispatchCull(pass);
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.frames++;
        this.stats.frames = this.frames;
        this.lastprojection.copy(projection);
    }
    prepare(encoder, items, renderer, camera, projection) {
        if (this.twoPhase) return this.stashedLeftover || [];
        var leftover = [];
        if (!this.enabled) return items;
        this.ensurecullpipeline();
        if (!this.hiz) this.hiz = new HiZBuffer(this.device, renderer.width, renderer.height);
        else this.hiz.resize(renderer.width, renderer.height);
        leftover = this.buildBatches(items);
        if (this.batches.length === 0 || this.totalInstances === 0) return leftover;
        this.occ.ensureAuxBuffers(this.totalInstances);
        this.occ.writeSkipCounter();
        this.uploadInstances();
        this.writeCullUniform(renderer, camera, projection, 0, 0, 0, 0, 0);
        var cullencoder = this.device.createCommandEncoder();
        var pass = cullencoder.beginComputePass();
        this.dispatchCull(pass);
        pass.end();
        this.device.queue.submit([cullencoder.finish()]);
        this.frames++;
        this.stats.frames = this.frames;
        this.lastprojection.copy(projection);
        return leftover;
    }
    draw(pass, renderer) {
        if (!this.enabled || this.batches.length === 0) return;
        var modeldata = new Float32Array(this.batches.length * 128);
        for (var b = 0; b < this.batches.length; b++) {
            var batch = this.batches[b];
            var material = batch.material;
            var md = b * 128;
            modeldata[md] = 1; modeldata[md + 5] = 1; modeldata[md + 10] = 1; modeldata[md + 15] = 1;
            modeldata[md + 16] = 1; modeldata[md + 21] = 1; modeldata[md + 26] = 1; modeldata[md + 31] = 1;
            var color2 = material && material.color ? material.color : new Color(0xffffff);
            modeldata[md + 32] = color2.r; modeldata[md + 33] = color2.g; modeldata[md + 34] = color2.b;
            modeldata[md + 35] = material && material.opacity !== undefined ? material.opacity : 1;
            modeldata[md + 36] = material && material.metalness !== undefined ? material.metalness : 0;
            modeldata[md + 37] = material && material.roughness !== undefined ? material.roughness : 0.5;
            modeldata[md + 38] = material && material.clearcoat !== undefined ? material.clearcoat : 0;
            modeldata[md + 39] = material && material.transmission !== undefined ? material.transmission : 0;
            var emissive = material && material.emissive ? material.emissive : new Color(0);
            modeldata[md + 40] = emissive.r; modeldata[md + 41] = emissive.g; modeldata[md + 42] = emissive.b;
            modeldata[md + 43] = 1;
            modeldata[md + 44] = material && material.sheen !== undefined ? material.sheen : 0;
            modeldata[md + 45] = material && material.iridescence !== undefined ? material.iridescence : 0;
            modeldata[md + 46] = material && material.anisotropy !== undefined ? material.anisotropy : 0;
            modeldata[md + 47] = material && material.normalScale ? material.normalScale.x : 0.15;
            modeldata[md + 48] = 0;
            modeldata[md + 49] = 0;
            modeldata[md + 50] = 1;
            var environmentMap = material && material.envMap;
            modeldata[md + 51] = environmentMap ? 1 : 0;
            modeldata[md + 52] = 0; modeldata[md + 53] = 0; modeldata[md + 54] = 0; modeldata[md + 55] = 0;
            var unlit = material instanceof BasicMaterial && !(material instanceof LineMaterial) || material instanceof PointsMaterial || material instanceof LineBasicMaterial ? 1 : 0;
            modeldata[md + 56] = unlit;
            modeldata[md + 57] = material && material.vertexColors ? 1 : 0;
            modeldata[md + 58] = material && material.alphaTest ? 1 : 0;
            modeldata[md + 59] = material && material.alphaCutoff !== undefined ? material.alphaCutoff : 0.5;
            modeldata[md + 60] = material && material.envMapIntensity !== undefined ? material.envMapIntensity : 1;
            modeldata[md + 61] = material && material.emissiveStrength !== undefined ? material.emissiveStrength : 1;
            modeldata[md + 62] = material && material.clearcoatRoughness !== undefined ? material.clearcoatRoughness : 0.03;
            var thicknessrange = material && material.iridescenceThicknessRange ? material.iridescenceThicknessRange : [100, 400];
            modeldata[md + 63] = (thicknessrange[0] + thicknessrange[1]) * 0.5; modeldata[md + 64] = material && material.anisotropyRotation !== undefined ? material.anisotropyRotation : 0;
        }
        this.device.queue.writeBuffer(this.modelbuffer, 0, modeldata);
        for (var d = 0; d < this.batches.length; d++) {
            var bt = this.batches[d];
            var sample = bt.sample;
            var material2 = bt.material;
            var pipeline = renderer.pipelineFor(material2, "triangle-list");
            var camerabind = renderer.cameraBindFor(pipeline);
            var position = renderer.attribute(sample, "position", 3, [0, 0, 0]);
            var normal = renderer.attribute(sample, "normal", 3, [0, 1, 0]);
            var uv = renderer.attribute(sample, "uv", 2, [0, 0]);
            var color = renderer.attribute(sample, "color", 3, [1, 1, 1]);
            var positionbuffer = renderer.resourceManager.buffer(position, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var normalBuffer = renderer.resourceManager.buffer(normal, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var uvBuffer = renderer.resourceManager.buffer(uv, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var colorBuffer = renderer.resourceManager.buffer(color, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var vertexcount = position.array.length / position.itemSize;
            var skinpack = renderer.skinPackFor(bt.geometry, bt.geometry.attributes.skinIndex, bt.geometry.attributes.skinWeight, vertexcount);
            var skinresource = renderer.resourceManager.buffer(skinpack, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var morphpack = renderer.morphPackFor(bt.geometry, vertexcount);
            var morphresource = renderer.resourceManager.buffer(morphpack, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
            var map = material2 && (material2.diffuseMap || material2.map);
            var normalmap = material2 && material2.normalmap;
            var roughnessmap = material2 && material2.roughnessmap;
            var metalnessmap = material2 && material2.metalnessmap;
            var aomap = material2 && material2.aomap;
            var emissivemap = material2 && material2.emissivemap;
            var environmentmap2 = material2 && material2.envMap;
            var baseresource = map ? renderer.resourceManager.texture(map, [255, 255, 255, 255]) : renderer.resourceManager.defaultTextureResource("white", [255, 255, 255, 255]);
            var normalresource = normalmap ? renderer.resourceManager.texture(normalmap) : renderer.resourceManager.defaultTextureResource("normal", [128, 128, 255, 255]);
            var roughnessresource = roughnessmap ? renderer.resourceManager.texture(roughnessmap) : renderer.resourceManager.defaultTextureResource("roughness", [0, 255, 0, 255]);
            var metalnessresource = metalnessmap ? renderer.resourceManager.texture(metalnessmap) : renderer.resourceManager.defaultTextureResource("metalness", [0, 0, 255, 255]);
            var aoresource = aomap ? renderer.resourceManager.texture(aomap) : renderer.resourceManager.defaultTextureResource("ao", [255, 255, 255, 255]);
            var emissiveresource = emissivemap ? renderer.resourceManager.texture(emissivemap) : renderer.resourceManager.defaultTextureResource("emissive", [0, 0, 0, 255]);
            var environmentresource = environmentmap2 && environmentmap2.resource ? environmentmap2.resource : environmentmap2 && environmentmap2 instanceof CubeTexture ? renderer.resourceManager.cubeTexture(environmentmap2) : renderer.resourceManager.defaultCubeResource();
            var modelbind = this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(1), entries: [
                { binding: 0, resource: { buffer: this.modelbuffer, offset: d * 512, size: 272 } },
                { binding: 1, resource: baseresource.view },
                { binding: 2, resource: baseresource.sampler },
                { binding: 3, resource: normalresource.view },
                { binding: 4, resource: normalresource.sampler },
                { binding: 5, resource: roughnessresource.view },
                { binding: 6, resource: roughnessresource.sampler },
                { binding: 7, resource: metalnessresource.view },
                { binding: 8, resource: metalnessresource.sampler },
                { binding: 9, resource: aoresource.view },
                { binding: 10, resource: aoresource.sampler },
                { binding: 11, resource: emissiveresource.view },
                { binding: 12, resource: emissiveresource.sampler },
                { binding: 13, resource: environmentresource.view },
                { binding: 14, resource: environmentresource.sampler }
            ] });
            var boneresource = renderer.resourceManager.boneResource(null);
            var bonebind = this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(2), entries: [{ binding: 0, resource: { buffer: boneresource.buffer } }] });
            var index = bt.geometry.index;
            var indexbuffer = renderer.resourceManager.buffer({ array: index }, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, camerabind);
            pass.setBindGroup(1, modelbind);
            pass.setBindGroup(2, bonebind);
            pass.setVertexBuffer(0, positionbuffer);
            pass.setVertexBuffer(1, normalBuffer);
            pass.setVertexBuffer(2, uvBuffer);
            pass.setVertexBuffer(3, skinresource);
            pass.setVertexBuffer(4, morphresource);
            pass.setVertexBuffer(5, colorBuffer);
            pass.setVertexBuffer(6, this.compactedbuffer, bt.compoffset);
            pass.setIndexBuffer(indexbuffer, index instanceof Uint32Array ? "uint32" : "uint16");
            pass.drawIndexedIndirect(this.argsbuffer, bt.argsoffset);
            renderer.info.render.calls++;
            renderer.info.render.triangles += Math.floor(bt.indexcount / 3) * bt.count;
        }
    }
    afterRender(encoder, renderer, depthview) {
        if (!this.enabled || !this.hiz) return;
        if (this.twoPhase) return;
        this.hiz.build(encoder, depthview);
        this.prevviewproj.copy(this.lastprojection);
    }
    readStats() {
        var self = this;
        if (!this.argsbuffer || !this.currentbatchcount) return Promise.resolve(this.stats);
        var batches = this.currentbatchcount;
        var regions = this.currentRegions || 0;
        var twophase = this.twoPhase && this.occ && this.occ.occluderargs;
        var total = batches * 20 + (twophase ? batches * 20 + regions * 4 + 16 : 0);
        if (!this.statsreadback || this.statsreadback.size < total) {
            if (this.statsreadback) this.statsreadback.destroy();
            this.statsreadback = this.device.createBuffer({ size: Math.max(256, total), usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        }
        var enc = this.device.createCommandEncoder();
        enc.copyBufferToBuffer(this.argsbuffer, 0, this.statsreadback, 0, batches * 20);
        if (twophase) {
            enc.copyBufferToBuffer(this.occ.occluderargs, 0, this.statsreadback, batches * 20, batches * 20);
            if (regions > 0) enc.copyBufferToBuffer(this.occ.regionvisible, 0, this.statsreadback, batches * 40, regions * 4);
            enc.copyBufferToBuffer(this.occ.skipcounter, 0, this.statsreadback, batches * 40 + regions * 4, 16);
        }
        this.device.queue.submit([enc.finish()]);
        var stamp = this.occ ? this.occ.stamp : 0;
        return this.device.queue.onSubmittedWorkDone().then(function () {
            return self.statsreadback.mapAsync(GPUMapMode.READ).then(function () {
                var arr = new Uint32Array(self.statsreadback.getMappedRange());
                var per = [];
                var total2 = 0;
                for (var i = 0; i < batches; i++) { per.push(arr[i * 5 + 1]); total2 += arr[i * 5 + 1]; }
                var tris = 0;
                for (var j = 0; j < per.length; j++) tris += per[j] * Math.floor(self.currentindexcounts[j] / 3);
                self.stats.visible = total2;
                self.stats.triangles = tris;
                self.stats.perbatch = per;
                if (twophase) {
                    var occluders = 0;
                    for (var k = 0; k < batches; k++) occluders += arr[batches * 5 + k * 5 + 1];
                    self.stats.occluders = occluders;
                    self.stats.regions = regions;
                    var regionsvisible = 0;
                    for (var r = 0; r < regions; r++) if (arr[batches * 10 + r] === stamp) regionsvisible++;
                    self.stats.regionsVisible = regionsvisible;
                    self.stats.regionSkipped = arr[batches * 10 + regions];
                }
                self.statsreadback.unmap();
                return self.stats;
            });
        });
    }
    readVisibility() {
        var self = this;
        if (!this.occ || !this.occ.visibility || !this.totalInstances) return Promise.resolve(new Uint32Array(0));
        var readback = this.device.createBuffer({ size: Math.max(16, this.totalInstances * 4), usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        var enc = this.device.createCommandEncoder();
        enc.copyBufferToBuffer(this.occ.visibility, 0, readback, 0, this.totalInstances * 4);
        this.device.queue.submit([enc.finish()]);
        return this.device.queue.onSubmittedWorkDone().then(function () {
            return readback.mapAsync(GPUMapMode.READ).then(function () {
                var arr = new Uint32Array(readback.getMappedRange().slice(0));
                readback.unmap();
                readback.destroy();
                return arr;
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
