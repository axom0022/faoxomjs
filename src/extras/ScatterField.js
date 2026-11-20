import { StandardMaterial } from "../materials/index.js";

import { Matrix4 } from "../math/index.js";

import { Quaternion } from "../math/index.js";

import { Vector3 } from "../math/index.js";

import { Group } from "../objects/index.js";

import { InstancedMesh } from "../objects/index.js";

import { PCGRandom } from "./PCGToolkit.js";

import { faoxomvalue } from "../math/index.js";

function zaiwa(zaiwa) {
    if (typeof zaiwa === "function") return {
        heightAt: function(zaiwb, zaiwc) {
            return zaiwa(zaiwb, zaiwc);
        }
    };
    if (zaiwa && typeof zaiwa.heightAt === "function") return zaiwa;
    if (zaiwa && typeof zaiwa.getHeight === "function") return {
        heightAt: function(zaiwb, zaiwc) {
            return zaiwa.getHeight(zaiwb, zaiwc);
        },
        slopeAt: zaiwa.slopeAt,
        zoneAt: zaiwa.zoneAt
    };
    throw new Error("ScatterField source must be a function or expose heightAt/getHeight");
}

function zaiwb(zaiwa, zaiwb, zaiwc) {
    var zaiwd = (zaiwa | 0) ^ Math.imul(zaiwb | 0, 374761393) ^ Math.imul(zaiwc | 0, 668265263);
    zaiwd = zaiwd ^ zaiwd >>> 13;
    zaiwd = Math.imul(zaiwd, 1274126177);
    zaiwd = zaiwd ^ zaiwd >>> 16;
    return zaiwd | 0;
}

class ScatterField extends Group {
    constructor(zaiwb, zaiwc, zaiwd) {
        super();
        zaiwd = zaiwd || {};
        this.type = "ScatterField";
        this.sampler = zaiwa(zaiwb);
        this.layers = [];
        this.seed = faoxomvalue(zaiwd.seed, 1) | 0;
        this.chunkSize = Math.max(.001, faoxomvalue(zaiwd.chunkSize, 32));
        this.viewChunks = Math.max(0, Math.floor(faoxomvalue(zaiwd.viewChunks, 8)));
        this.maxChunksPerFrame = Math.max(0, faoxomvalue(zaiwd.maxChunksPerFrame, 2));
        this.capacityMargin = Math.max(1, faoxomvalue(zaiwd.capacityMargin, 1.5));
        this.normalEpsilon = Math.max(1e-4, faoxomvalue(zaiwd.normalEpsilon, .5));
        this.centerChunk = null;
        this.chunks = new Map;
        this.queue = [];
        this.stats = {
            chunks: 0,
            pending: 0,
            instances: 0,
            generatedChunks: 0,
            layerInstances: []
        };
        var zaiwe = Array.isArray(zaiwc) ? zaiwc : zaiwc ? [ zaiwc ] : [];
        for (var zaiwf = 0; zaiwf < zaiwe.length; zaiwf++) this.addLayer(zaiwe[zaiwf]);
    }
    addLayer(zaiwa) {
        if (!zaiwa || !zaiwa.geometry) throw new Error("ScatterField layer requires geometry");
        var zaiwb = {
            geometry: zaiwa.geometry,
            material: zaiwa.material || new StandardMaterial,
            density: Math.max(0, faoxomvalue(zaiwa.density, .1)),
            mode: zaiwa.mode === "poisson" ? "poisson" : "jitter",
            minSpacing: Math.max(0, faoxomvalue(zaiwa.minSpacing, 0)),
            maxAttempts: Math.max(1, faoxomvalue(zaiwa.maxAttempts, 30)),
            minHeight: zaiwa.minHeight !== undefined ? zaiwa.minHeight : -Infinity,
            maxHeight: zaiwa.maxHeight !== undefined ? zaiwa.maxHeight : Infinity,
            minSlope: faoxomvalue(zaiwa.minSlope, 0),
            maxSlope: zaiwa.maxSlope !== undefined ? zaiwa.maxSlope : Math.PI,
            zones: Array.isArray(zaiwa.zones) ? zaiwa.zones : null,
            scaleMin: faoxomvalue(zaiwa.scaleMin, 1),
            scaleMax: faoxomvalue(zaiwa.scaleMax, zaiwa.scaleMin !== undefined ? zaiwa.scaleMin : 1),
            rotation: zaiwa.rotation === undefined ? "random" : zaiwa.rotation,
            alignToNormal: Math.min(1, Math.max(0, faoxomvalue(zaiwa.alignToNormal, 0))),
            yOffset: faoxomvalue(zaiwa.yOffset, 0),
            mesh: null,
            capacity: 0
        };
        zaiwb.scaleMax = Math.max(zaiwb.scaleMin, zaiwb.scaleMax);
        this.layers.push(zaiwb);
        return zaiwb;
    }
    ensureLayerMesh(zaiwa, zaiwb) {
        if (zaiwa.mesh && zaiwa.capacity >= zaiwb) {
            zaiwa.mesh.count = zaiwb;
            return zaiwa.mesh;
        }
        var zaiwc = Math.max(64, Math.ceil(zaiwb * this.capacityMargin));
        var zaiwd = new InstancedMesh(zaiwa.geometry, zaiwa.material, zaiwc);
        zaiwd.count = zaiwb;
        zaiwd.frustumCulled = false;
        if (zaiwa.mesh) {
            zaiwd.instanceMatrices.set(zaiwa.mesh.instanceMatrices.subarray(0, Math.min(zaiwa.mesh.count * 16, zaiwd.instanceMatrices.length)));
            this.remove(zaiwa.mesh);
        }
        zaiwa.mesh = zaiwd;
        zaiwa.capacity = zaiwc;
        this.add(zaiwd);
        return zaiwd;
    }
    releaseLayerMeshes() {
        for (var zaiwa = 0; zaiwa < this.layers.length; zaiwa++) {
            var zaiwb = this.layers[zaiwa];
            if (zaiwb.mesh) {
                this.remove(zaiwb.mesh);
                zaiwb.mesh = null;
                zaiwb.capacity = 0;
            }
        }
    }
    slopeAt(zaiwa, zaiwb) {
        if (this.sampler.slopeAt) return this.sampler.slopeAt(zaiwa, zaiwb);
        var zaiwc = this.normalEpsilon, zaiwd = this.sampler.heightAt;
        var zaiwe = (zaiwd(zaiwa + zaiwc, zaiwb) - zaiwd(zaiwa - zaiwc, zaiwb)) / (2 * zaiwc);
        var zaiwf = (zaiwd(zaiwa, zaiwb + zaiwc) - zaiwd(zaiwa, zaiwb - zaiwc)) / (2 * zaiwc);
        return Math.atan(Math.sqrt(zaiwe * zaiwe + zaiwf * zaiwf));
    }
    normalAt(zaiwa, zaiwb, zaiwc) {
        var zaiwd = this.normalEpsilon, zaiwe = this.sampler.heightAt;
        var zaiwf = (zaiwe(zaiwa + zaiwd, zaiwb) - zaiwe(zaiwa - zaiwd, zaiwb)) / (2 * zaiwd);
        var zaiwg = (zaiwe(zaiwa, zaiwb + zaiwd) - zaiwe(zaiwa, zaiwb - zaiwd)) / (2 * zaiwd);
        var zaiwh = -zaiwf, zaiwi = 1, zaiwj = -zaiwg;
        var zaiwk = Math.sqrt(zaiwh * zaiwh + zaiwi * zaiwi + zaiwj * zaiwj) || 1;
        zaiwc = zaiwc || new Vector3;
        zaiwc.set(zaiwh / zaiwk, zaiwi / zaiwk, zaiwj / zaiwk);
        return zaiwc;
    }
    generateChunk(zaiwa, zaiwc) {
        var zaiwd = zaiwa + "," + zaiwc;
        if (this.chunks.has(zaiwd)) return null;
        var zaiwe = {
            cx: zaiwa,
            cz: zaiwc,
            blocks: [],
            count: 0
        };
        var zaiwf = zaiwa * this.chunkSize, zaiwg = zaiwc * this.chunkSize;
        for (var zaiwh = 0; zaiwh < this.layers.length; zaiwh++) {
            var zaiwi = this.layers[zaiwh];
            var zaiwj = new PCGRandom(zaiwb(this.seed ^ Math.imul(zaiwh + 1, 913531), zaiwa, zaiwc));
            var zaiwk = [];
            var zaiwl = this.chunkSize * this.chunkSize;
            if (zaiwi.mode === "poisson" && zaiwi.minSpacing > 0) {
                var zaiwm = zaiwi.minSpacing;
                var zaiwn = zaiwm / Math.SQRT2;
                var zaiwo = Math.max(1, Math.ceil(this.chunkSize / zaiwn));
                var zaiwp = new Int32Array(zaiwo * zaiwo).fill(-1);
                var zaiwq = [];
                var zaiwr = Math.max(1, Math.floor(zaiwi.density * zaiwl));
                var zaiws = 0;
                var zaiwt = {
                    x: zaiwj.range(0, this.chunkSize),
                    z: zaiwj.range(0, this.chunkSize)
                };
                zaiwk.push(zaiwt);
                zaiwp[Math.min(zaiwo - 1, zaiwt.x / zaiwn | 0) + Math.min(zaiwo - 1, zaiwt.z / zaiwn | 0) * zaiwo] = 0;
                zaiwq.push(0);
                while (zaiwq.length > 0 && zaiwk.length < zaiwr && zaiws < zaiwi.maxAttempts * zaiwr) {
                    zaiws++;
                    var zaiwu = zaiwj.int(0, zaiwq.length - 1);
                    var zaiwv = zaiwk[zaiwq[zaiwu]];
                    var zaiww = false;
                    for (var zaiwx = 0; zaiwx < 10 && !zaiww; zaiwx++) {
                        var zaiwy = zaiwj.range(0, Math.PI * 2);
                        var zaiwz = zaiwj.range(zaiwm, zaiwm * 2);
                        var zaiwaa = zaiwv.x + Math.cos(zaiwy) * zaiwz, zaiwab = zaiwv.z + Math.sin(zaiwy) * zaiwz;
                        if (zaiwaa < 0 || zaiwab < 0 || zaiwaa >= this.chunkSize || zaiwab >= this.chunkSize) continue;
                        var zaiwac = Math.min(zaiwo - 1, zaiwaa / zaiwn | 0), zaiwad = Math.min(zaiwo - 1, zaiwab / zaiwn | 0);
                        var zaiwae = true;
                        for (var zaiwaf = -2; zaiwaf <= 2 && zaiwae; zaiwaf++) {
                            for (var zaiwag = -2; zaiwag <= 2 && zaiwae; zaiwag++) {
                                var zaiwah = zaiwac + zaiwag, zaiwai = zaiwad + zaiwaf;
                                if (zaiwah < 0 || zaiwai < 0 || zaiwah >= zaiwo || zaiwai >= zaiwo) continue;
                                var zaiwaj = zaiwp[zaiwai * zaiwo + zaiwah];
                                if (zaiwaj >= 0) {
                                    var zaiwak = zaiwk[zaiwaj];
                                    var zaiwal = zaiwak.x - zaiwaa, zaiwam = zaiwak.z - zaiwab;
                                    if (zaiwal * zaiwal + zaiwam * zaiwam < zaiwm * zaiwm) zaiwae = false;
                                }
                            }
                        }
                        if (!zaiwae) continue;
                        zaiwk.push({
                            x: zaiwaa,
                            z: zaiwab
                        });
                        zaiwp[zaiwad * zaiwo + zaiwac] = zaiwk.length - 1;
                        zaiwq.push(zaiwk.length - 1);
                        zaiww = true;
                    }
                    if (!zaiww) {
                        zaiwq[zaiwu] = zaiwq[zaiwq.length - 1];
                        zaiwq.pop();
                    }
                }
            } else {
                var zaiwan = Math.floor(zaiwi.density * zaiwl + zaiwj.next());
                for (var zaiwao = 0; zaiwao < zaiwan; zaiwao++) {
                    var zaiwap = zaiwj.range(0, this.chunkSize), zaiwaq = zaiwj.range(0, this.chunkSize);
                    if (zaiwi.minSpacing > 0) {
                        var zaiwar = true;
                        for (var zaiwas = 0; zaiwas < zaiwk.length && zaiwar; zaiwas++) {
                            var zaiwat = zaiwk[zaiwas].x - zaiwap, zaiwau = zaiwk[zaiwas].z - zaiwaq;
                            if (zaiwat * zaiwat + zaiwau * zaiwau < zaiwi.minSpacing * zaiwi.minSpacing) zaiwar = false;
                        }
                        if (!zaiwar) continue;
                    }
                    zaiwk.push({
                        x: zaiwap,
                        z: zaiwaq
                    });
                }
            }
            var zaiwav = [];
            var zaiwaw = new Vector3(0, 1, 0);
            var zaiwax = new Vector3;
            var zaiway = new Quaternion;
            var zaiwaz = new Quaternion;
            var zaiwba = new Vector3;
            var zaiwbb = new Vector3;
            var zaiwbc = new Matrix4;
            for (var zaiwbd = 0; zaiwbd < zaiwk.length; zaiwbd++) {
                var zaiwbe = zaiwf + zaiwk[zaiwbd].x, zaiwbf = zaiwg + zaiwk[zaiwbd].z;
                var zaiwbg = this.sampler.heightAt(zaiwbe, zaiwbf);
                if (zaiwbg < zaiwi.minHeight || zaiwbg > zaiwi.maxHeight) continue;
                var zaiwbh = this.slopeAt(zaiwbe, zaiwbf);
                if (zaiwbh < zaiwi.minSlope || zaiwbh > zaiwi.maxSlope) continue;
                if (zaiwi.zones && this.sampler.zoneAt) {
                    var zaiwbi = this.sampler.zoneAt(zaiwbe, zaiwbf);
                    if (zaiwi.zones.indexOf(zaiwbi) === -1) continue;
                }
                var zaiwbj = zaiwj.range(zaiwi.scaleMin, zaiwi.scaleMax);
                var zaiwbk = zaiwi.rotation === "random" ? zaiwj.range(0, Math.PI * 2) : zaiwi.rotation;
                zaiwba.set(zaiwbe, zaiwbg + zaiwi.yOffset, zaiwbf);
                zaiwbb.set(zaiwbj, zaiwbj, zaiwbj);
                zaiway.set(0, 0, 0, 1);
                if (zaiwi.alignToNormal > 0) {
                    this.normalAt(zaiwbe, zaiwbf, zaiwax);
                    zaiwaz.setFromUnitVectors(zaiwaw, zaiwax);
                    var zaiwbl = zaiwi.alignToNormal;
                    zaiway.set(zaiwaz.x * zaiwbl, zaiwaz.y * zaiwbl, zaiwaz.z * zaiwbl, 1 + zaiwbl * (zaiwaz.w - 1));
                    zaiway.normalize();
                }
                zaiwaz.setFromAxisAngle(zaiwaw, zaiwbk);
                zaiway.premultiply(zaiwaz);
                zaiwbc.compose(zaiwba, zaiway, zaiwbb);
                zaiwav.push(zaiwbc.clone());
            }
            zaiwe.blocks.push(zaiwav);
            zaiwe.count += zaiwav.length;
        }
        return zaiwe;
    }
    repack() {
        var zaiwa = [];
        for (var zaiwb = 0; zaiwb < this.layers.length; zaiwb++) zaiwa.push(0);
        this.chunks.forEach(function(zaiwb) {
            for (var zaiwc = 0; zaiwc < zaiwb.blocks.length; zaiwc++) zaiwa[zaiwc] += zaiwb.blocks[zaiwc].length;
        });
        for (var zaiwc = 0; zaiwc < this.layers.length; zaiwc++) this.ensureLayerMesh(this.layers[zaiwc], zaiwa[zaiwc]);
        var zaiwd = [];
        for (var zaiwe = 0; zaiwe < this.layers.length; zaiwe++) zaiwd.push(0);
        var zaiwf = this;
        this.chunks.forEach(function(zaiwa) {
            for (var zaiwb = 0; zaiwb < zaiwa.blocks.length; zaiwb++) {
                var zaiwc = zaiwa.blocks[zaiwb];
                var zaiwe = zaiwf.layers[zaiwb].mesh;
                for (var zaiwg = 0; zaiwg < zaiwc.length; zaiwg++) zaiwe.setMatrixAt(zaiwd[zaiwb] + zaiwg, zaiwc[zaiwg]);
                zaiwd[zaiwb] += zaiwc.length;
            }
        });
        for (var zaiwg = 0; zaiwg < this.layers.length; zaiwg++) {
            var zaiwh = this.layers[zaiwg].mesh;
            zaiwh.count = zaiwa[zaiwg];
            zaiwh.visible = zaiwa[zaiwg] > 0;
            zaiwh.instanceMatrix.needsUpdate = true;
            zaiwh.instanceMatrix.version++;
            zaiwh.instanceNeedsUpdate = true;
        }
        this.stats.instances = 0;
        for (var zaiwi = 0; zaiwi < zaiwa.length; zaiwi++) this.stats.instances += zaiwa[zaiwi];
        this.stats.layerInstances = zaiwa;
        this.stats.chunks = this.chunks.size;
    }
    update(zaiwa) {
        var zaiwb = zaiwa && zaiwa.position ? zaiwa.position : zaiwa || {
            x: 0,
            z: 0
        };
        var zaiwc = Math.floor(faoxomvalue(zaiwb.x, 0) / this.chunkSize);
        var zaiwd = Math.floor(faoxomvalue(zaiwb.z, 0) / this.chunkSize);
        var zaiwe = 0;
        if (!this.centerChunk || this.centerChunk.cx !== zaiwc || this.centerChunk.cz !== zaiwd) {
            this.centerChunk = {
                cx: zaiwc,
                cz: zaiwd
            };
            var zaiwf = [];
            for (var zaiwg = -this.viewChunks; zaiwg <= this.viewChunks; zaiwg++) {
                for (var zaiwh = -this.viewChunks; zaiwh <= this.viewChunks; zaiwh++) {
                    if (zaiwh * zaiwh + zaiwg * zaiwg > this.viewChunks * this.viewChunks + this.viewChunks) continue;
                    zaiwf.push(zaiwc + zaiwh + "," + (zaiwd + zaiwg));
                }
            }
            var zaiwi = new Set(zaiwf);
            var zaiwj = [];
            this.chunks.forEach(function(zaiwa, zaiwb) {
                if (!zaiwi.has(zaiwb)) zaiwj.push(zaiwb);
            });
            zaiwe = zaiwj.length;
            for (var zaiwk = 0; zaiwk < zaiwj.length; zaiwk++) this.chunks.delete(zaiwj[zaiwk]);
            this.queue = [];
            for (var zaiwl = 0; zaiwl < zaiwf.length; zaiwl++) if (!this.chunks.has(zaiwf[zaiwl])) this.queue.push(zaiwf[zaiwl]);
            this.queue.sort(function(zaiwa, zaiwb) {
                var zaiwe = zaiwa.split(","), zaiwf = zaiwb.split(",");
                var zaiwg = +zaiwe[0] - zaiwc, zaiwh = +zaiwe[1] - zaiwd, zaiwi = +zaiwf[0] - zaiwc, zaiwj = +zaiwf[1] - zaiwd;
                return zaiwg * zaiwg + zaiwh * zaiwh - (zaiwi * zaiwi + zaiwj * zaiwj);
            });
        }
        var zaiwm = this.maxChunksPerFrame === 0 ? this.queue.length : this.maxChunksPerFrame;
        var zaiwn = 0;
        while (zaiwn < zaiwm && this.queue.length > 0) {
            var zaiwo = this.queue.shift();
            if (this.chunks.has(zaiwo)) continue;
            var zaiwp = zaiwo.split(",");
            var zaiwq = this.generateChunk(+zaiwp[0], +zaiwp[1]);
            if (zaiwq) {
                this.chunks.set(zaiwo, zaiwq);
                this.stats.generatedChunks++;
                zaiwn++;
            }
        }
        if (zaiwn > 0 || this.stats.chunks !== this.chunks.size) this.repack();
        this.stats.pending = this.queue.length;
        this.stats.chunks = this.chunks.size;
        return {
            added: zaiwn,
            pending: this.queue.length,
            removed: zaiwe
        };
    }
    chunkCount() {
        return this.chunks.size;
    }
    instanceCount() {
        return this.stats.instances;
    }
    clear() {
        this.chunks.clear();
        this.queue = [];
        this.centerChunk = null;
        this.repack();
        return this;
    }
    dispose() {
        this.clear();
        this.releaseLayerMeshes();
        this.layers = [];
        return this;
    }
}

export { ScatterField };
