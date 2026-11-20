import { BufferAttribute, faoxomarray, faoxomidnext } from "../core/index.js";

import { Box3, Matrix4, Sphere, Vector3 } from "../math/index.js";

class Geometry {
    constructor() {
        this.isBufferGeometry = true;
        this.type = "BufferGeometry";
        this.id = faoxomidnext();
        this.refCount = 0;
        this.attributes = {};
        this.index = null;
        this.boundingBox = null;
        this.boundingSphere = null;
        this.disposed = false;
        this.groups = [];
        this.morphAttributes = {
            position: [],
            normal: [],
            tangent: []
        };
        this.userData = {};
    }
    setAttribute(zakga, zakgb, zakgc, zakgd) {
        var zakge = zakgb && zakgb.array ? typeof zakgb.getX === "function" ? zakgb : new BufferAttribute(zakgb.array, zakgb.itemSize || zakgc || 3, zakgb.normalized === undefined ? zakgd : zakgb.normalized) : new BufferAttribute(faoxomarray(zakgb), zakgc || 3, zakgd);
        if (zakge.needsUpdate === undefined) zakge.needsUpdate = true;
        if (zakge.version === undefined) zakge.version = 0;
        this.attributes[zakga] = zakge;
        if (zakga === "position") {
            this.computeBoundingBox();
            this.computeBoundingSphere();
        }
        return this;
    }
    setFromPoints(zakga) {
        var zakgb = [];
        for (var zakgc = 0; zakgc < (zakga || []).length; zakgc++) zakgb.push(zakga[zakgc].x, zakga[zakgc].y, zakga[zakgc].z || 0);
        return this.setAttribute("position", new Float32Array(zakgb), 3);
    }
    normalizeNormals() {
        var zakga = this.attributes.normal;
        if (!zakga) return this;
        for (var zakgb = 0; zakgb < zakga.array.length; zakgb += zakga.itemSize) {
            var zakgc = new Vector3(zakga.array[zakgb], zakga.array[zakgb + 1], zakga.array[zakgb + 2]).normalize();
            zakga.array[zakgb] = zakgc.x;
            zakga.array[zakgb + 1] = zakgc.y;
            zakga.array[zakgb + 2] = zakgc.z;
        }
        zakga.needsUpdate = true;
        return this;
    }
    getAttribute(zakga) {
        return this.attributes[zakga];
    }
    setMorphAttribute(zakga, zakgb) {
        this.morphAttributes[zakga] = zakgb || [];
        return this;
    }
    deleteAttribute(zakga) {
        delete this.attributes[zakga];
        if (zakga === "position") {
            this.boundingBox = null;
            this.boundingSphere = null;
        }
        return this;
    }
    computeBounds() {
        this.computeBoundingBox();
        this.computeBoundingSphere();
        return this;
    }
    setIndex(zakga) {
        var zakgb = zakga && zakga.array ? zakga.array : zakga;
        if (zakgb && !zakgb.buffer) {
            var zakgc = 0;
            for (var zakgd = 0; zakgd < zakgb.length; zakgd++) if (zakgb[zakgd] > zakgc) zakgc = zakgb[zakgd];
            zakgb = zakgc > 65535 ? new Uint32Array(zakgb) : new Uint16Array(zakgb);
        }
        this.index = zakgb;
        return this;
    }
    addGroup(zakga, zakgb, zakgc) {
        this.groups.push({
            start: zakga,
            count: zakgb,
            materialIndex: zakgc || 0
        });
        return this;
    }
    rotateX(zakga) {
        return this.applyMatrix4((new Matrix4).makeRotationX(zakga));
    }
    rotateY(zakga) {
        return this.applyMatrix4((new Matrix4).makeRotationY(zakga));
    }
    rotateZ(zakga) {
        return this.applyMatrix4((new Matrix4).makeRotationZ(zakga));
    }
    translate(zakga, zakgb, zakgc) {
        return this.applyMatrix4((new Matrix4).makeTranslation(zakga, zakgb, zakgc));
    }
    scale(zakga, zakgb, zakgc) {
        return this.applyMatrix4((new Matrix4).makeScale(zakga, zakgb, zakgc));
    }
    applyMatrix4(zakga) {
        var zakgb = this.attributes.position;
        if (zakgb) for (var zakgc = 0; zakgc < zakgb.array.length; zakgc += zakgb.itemSize) new Vector3(zakgb.array[zakgc], zakgb.array[zakgc + 1], zakgb.array[zakgc + 2]).applyMatrix4(zakga).toArray(zakgb.array, zakgc);
        var zakgd = this.attributes.normal;
        if (zakgd) for (var zakge = 0; zakge < zakgd.array.length; zakge += zakgd.itemSize) new Vector3(zakgd.array[zakge], zakgd.array[zakge + 1], zakgd.array[zakge + 2]).transformDirection(zakga).toArray(zakgd.array, zakge);
        var zakgf = this.attributes.tangent;
        if (zakgf) for (var zakgg = 0; zakgg < zakgf.array.length; zakgg += zakgf.itemSize) new Vector3(zakgf.array[zakgg], zakgf.array[zakgg + 1], zakgf.array[zakgg + 2]).transformDirection(zakga).toArray(zakgf.array, zakgg);
        for (var zakgh in this.attributes) {
            this.attributes[zakgh].needsUpdate = true;
            this.attributes[zakgh].version = (this.attributes[zakgh].version || 0) + 1;
        }
        return this.computeBounds();
    }
    applyQuaternion(zakga) {
        return this.applyMatrix4((new Matrix4).makeRotationFromQuaternion(zakga));
    }
    center() {
        this.computeBoundingBox();
        var zakga = this.boundingBox.getCenter(new Vector3);
        return this.translate(-zakga.x, -zakga.y, -zakga.z);
    }
    toNonIndexed() {
        if (!this.index) return this.clone();
        var zakga = new Geometry;
        var zakgb = this.index;
        for (var zakgc in this.attributes) {
            var zakgd = this.attributes[zakgc], zakge = new zakgd.array.constructor(zakgb.length * zakgd.itemSize);
            for (var zakgf = 0; zakgf < zakgb.length; zakgf++) for (var zakgg = 0; zakgg < zakgd.itemSize; zakgg++) zakge[zakgf * zakgd.itemSize + zakgg] = zakgd.array[zakgb[zakgf] * zakgd.itemSize + zakgg];
            zakga.setAttribute(zakgc, zakge, zakgd.itemSize, zakgd.normalized);
        }
        for (var zakgh in this.morphAttributes) {
            zakga.morphAttributes[zakgh] = (this.morphAttributes[zakgh] || []).map(function(zakga) {
                var zakgc = new zakga.array.constructor(zakgb.length * zakga.itemSize);
                for (var zakgd = 0; zakgd < zakgb.length; zakgd++) for (var zakge = 0; zakge < zakga.itemSize; zakge++) zakgc[zakgd * zakga.itemSize + zakge] = zakga.array[zakgb[zakgd] * zakga.itemSize + zakge];
                return {
                    array: zakgc,
                    itemSize: zakga.itemSize,
                    normalized: zakga.normalized
                };
            });
        }
        zakga.computeBounds();
        return zakga;
    }
    copy(zakga) {
        this.attributes = {};
        for (var zakgb in zakga.attributes) {
            var zakgc = zakga.attributes[zakgb];
            this.setAttribute(zakgb, new zakgc.array.constructor(zakgc.array), zakgc.itemSize, zakgc.normalized);
        }
        this.index = zakga.index ? new zakga.index.constructor(zakga.index) : null;
        this.groups = zakga.groups.map(function(zakga) {
            return {
                start: zakga.start,
                count: zakga.count,
                materialIndex: zakga.materialIndex
            };
        });
        this.morphAttributes = {};
        for (var zakgd in zakga.morphAttributes) this.morphAttributes[zakgd] = (zakga.morphAttributes[zakgd] || []).map(function(zakga) {
            return {
                array: new zakga.array.constructor(zakga.array),
                itemSize: zakga.itemSize,
                normalized: zakga.normalized
            };
        });
        this.computeBounds();
        return this;
    }
    getIndex() {
        return this.index;
    }
    hasAttribute(zakga) {
        return !!this.attributes[zakga];
    }
    setDrawRange(zakga, zakgb) {
        this.drawRange = {
            start: Math.max(0, zakga || 0),
            count: zakgb === undefined ? Infinity : Math.max(0, zakgb)
        };
        return this;
    }
    computeVertexNormals() {
        var zakga = this.attributes.position;
        if (!zakga) return this;
        var zakgb = zakga.array;
        var zakgc = new Float32Array(zakgb.length);
        var zakgd = this.index;
        var zakge = zakgd ? zakgd.length : zakgb.length / 3;
        var zakgf = function(zakga, zakgd, zakge) {
            var zakgf = zakgb[zakga * 3], zakgg = zakgb[zakga * 3 + 1], zakgh = zakgb[zakga * 3 + 2];
            var zakgi = zakgb[zakgd * 3], zakgj = zakgb[zakgd * 3 + 1], zakgk = zakgb[zakgd * 3 + 2];
            var zakgl = zakgb[zakge * 3], zakgm = zakgb[zakge * 3 + 1], zakgn = zakgb[zakge * 3 + 2];
            var zakgo = zakgi - zakgf, zakgp = zakgj - zakgg, zakgq = zakgk - zakgh;
            var zakgr = zakgl - zakgf, zakgs = zakgm - zakgg, zakgt = zakgn - zakgh;
            var zakgu = zakgp * zakgt - zakgq * zakgs;
            var zakgv = zakgq * zakgr - zakgo * zakgt;
            var zakgw = zakgo * zakgs - zakgp * zakgr;
            zakgc[zakga * 3] += zakgu;
            zakgc[zakga * 3 + 1] += zakgv;
            zakgc[zakga * 3 + 2] += zakgw;
            zakgc[zakgd * 3] += zakgu;
            zakgc[zakgd * 3 + 1] += zakgv;
            zakgc[zakgd * 3 + 2] += zakgw;
            zakgc[zakge * 3] += zakgu;
            zakgc[zakge * 3 + 1] += zakgv;
            zakgc[zakge * 3 + 2] += zakgw;
        };
        for (var zakgg = 0; zakgg < zakge; zakgg += 3) zakgf(zakgd ? zakgd[zakgg] : zakgg, zakgd ? zakgd[zakgg + 1] : zakgg + 1, zakgd ? zakgd[zakgg + 2] : zakgg + 2);
        for (var zakgh = 0; zakgh < zakgc.length; zakgh += 3) {
            var zakgi = Math.sqrt(zakgc[zakgh] * zakgc[zakgh] + zakgc[zakgh + 1] * zakgc[zakgh + 1] + zakgc[zakgh + 2] * zakgc[zakgh + 2]) || 1;
            zakgc[zakgh] /= zakgi;
            zakgc[zakgh + 1] /= zakgi;
            zakgc[zakgh + 2] /= zakgi;
        }
        this.attributes.normal = {
            array: zakgc,
            itemSize: 3,
            normalized: false,
            needsUpdate: true,
            version: 0
        };
        return this;
    }
    computeTangents() {
        var zakga = this.attributes.position;
        var zakgb = this.attributes.uv;
        var zakgc = this.attributes.normal;
        if (!zakga || !zakgb || !zakgc) return this;
        var zakgd = zakga.array.length / zakga.itemSize;
        var zakge = new Array(zakgd);
        var zakgf = new Array(zakgd);
        for (var zakgg = 0; zakgg < zakgd; zakgg++) {
            zakge[zakgg] = new Vector3;
            zakgf[zakgg] = new Vector3;
        }
        var zakgh = this.index;
        var zakgi = zakgh ? zakgh.length : zakgd;
        for (var zakgj = 0; zakgj < zakgi; zakgj += 3) {
            var zakgk = zakgh ? zakgh[zakgj] : zakgj;
            var zakgl = zakgh ? zakgh[zakgj + 1] : zakgj + 1;
            var zakgm = zakgh ? zakgh[zakgj + 2] : zakgj + 2;
            var zakgn = new Vector3(zakga.array[zakgk * zakga.itemSize], zakga.array[zakgk * zakga.itemSize + 1], zakga.array[zakgk * zakga.itemSize + 2]);
            var zakgo = new Vector3(zakga.array[zakgl * zakga.itemSize], zakga.array[zakgl * zakga.itemSize + 1], zakga.array[zakgl * zakga.itemSize + 2]);
            var zakgp = new Vector3(zakga.array[zakgm * zakga.itemSize], zakga.array[zakgm * zakga.itemSize + 1], zakga.array[zakgm * zakga.itemSize + 2]);
            var zakgq = zakgb.array[zakgl * zakgb.itemSize] - zakgb.array[zakgk * zakgb.itemSize];
            var zakgr = zakgb.array[zakgl * zakgb.itemSize + 1] - zakgb.array[zakgk * zakgb.itemSize + 1];
            var zakgs = zakgb.array[zakgm * zakgb.itemSize] - zakgb.array[zakgk * zakgb.itemSize];
            var zakgt = zakgb.array[zakgm * zakgb.itemSize + 1] - zakgb.array[zakgk * zakgb.itemSize + 1];
            var zakgu = zakgq * zakgt - zakgs * zakgr;
            var zakgv = zakgu === 0 ? 1 : 1 / zakgu;
            var zakgw = zakgo.sub(zakgn);
            var zakgx = zakgp.sub(new Vector3(zakga.array[zakgk * zakga.itemSize], zakga.array[zakgk * zakga.itemSize + 1], zakga.array[zakgk * zakga.itemSize + 2]));
            var zakgy = zakgw.multiplyScalar(zakgt).sub(zakgx.clone().multiplyScalar(zakgr)).multiplyScalar(zakgv);
            var zakgz = zakgx.multiplyScalar(zakgq).sub(zakgw.clone().multiplyScalar(zakgs)).multiplyScalar(zakgv);
            zakge[zakgk].add(zakgy);
            zakge[zakgl].add(zakgy);
            zakge[zakgm].add(zakgy);
            zakgf[zakgk].add(zakgz);
            zakgf[zakgl].add(zakgz);
            zakgf[zakgm].add(zakgz);
        }
        var zakgaa = new Float32Array(zakgd * 4);
        var zakgab = typeof Map !== "undefined" ? new Map : null;
        var zakgac = [];
        for (var zakgad = 0; zakgad < zakgd; zakgad++) {
            var zakgae = Math.round(zakga.array[zakgad * zakga.itemSize] * 1e4) + "," + Math.round(zakga.array[zakgad * zakga.itemSize + 1] * 1e4) + "," + Math.round(zakga.array[zakgad * zakga.itemSize + 2] * 1e4);
            var zakgaf = zakgab ? zakgab.get(zakgae) : undefined;
            if (zakgaf === undefined) {
                zakgaf = zakgac.length;
                zakgac.push([]);
                if (zakgab) zakgab.set(zakgae, zakgaf);
            }
            zakgac[zakgaf].push(zakgad);
        }
        for (var zakgag = 0; zakgag < zakgac.length; zakgag++) {
            var zakgah = zakgac[zakgag];
            var zakgai = new Vector3;
            var zakgaj = new Vector3;
            for (var zakgak = 0; zakgak < zakgah.length; zakgak++) {
                zakgai.add(zakge[zakgah[zakgak]]);
                zakgaj.add(zakgf[zakgah[zakgak]]);
            }
            var zakgal = zakgah[0];
            var zakgam = new Vector3(zakgc.array[zakgal * zakgc.itemSize], zakgc.array[zakgal * zakgc.itemSize + 1], zakgc.array[zakgal * zakgc.itemSize + 2]).normalize();
            var zakgan = zakgai.clone().sub(zakgam.clone().multiplyScalar(zakgam.dot(zakgai)));
            if (zakgan.lengthSq() > 0) zakgan.normalize();
            var zakgao = (new Vector3).crossVectors(zakgam, zakgan).dot(zakgaj) < 0 ? -1 : 1;
            for (var zakgap = 0; zakgap < zakgah.length; zakgap++) {
                var zakgaq = zakgah[zakgap];
                zakgaa[zakgaq * 4] = zakgan.x;
                zakgaa[zakgaq * 4 + 1] = zakgan.y;
                zakgaa[zakgaq * 4 + 2] = zakgan.z;
                zakgaa[zakgaq * 4 + 3] = zakgao;
            }
        }
        this.attributes.tangent = {
            array: zakgaa,
            itemSize: 4,
            normalized: false,
            needsUpdate: true,
            version: 0
        };
        return this;
    }
    computeBoundingBox() {
        var zakga = this.attributes.position;
        if (!zakga) return this;
        var zakgb = new Box3;
        for (var zakgc = 0; zakgc < zakga.array.length; zakgc += zakga.itemSize) zakgb.expandByPoint(new Vector3(zakga.array[zakgc], zakga.array[zakgc + 1], zakga.array[zakgc + 2]));
        this.boundingBox = zakgb;
        return this;
    }
    computeBoundingSphere() {
        if (!this.boundingBox) this.computeBoundingBox();
        var zakga = this.boundingBox.getCenter(new Vector3);
        var zakgb = 0;
        var zakgc = this.attributes.position;
        for (var zakgd = 0; zakgd < zakgc.array.length; zakgd += zakgc.itemSize) zakgb = Math.max(zakgb, zakga.distanceToSquared(new Vector3(zakgc.array[zakgd], zakgc.array[zakgd + 1], zakgc.array[zakgd + 2])));
        this.boundingSphere = new Sphere(zakga, Math.sqrt(zakgb));
        return this;
    }
    static merge(zakga, zakgb) {
        if (typeof zakgb === "boolean") zakgb = {
            useGroups: zakgb
        };
        zakgb = zakgb || {};
        var zakgc = zakga || [], zakgd = new Geometry, zakge = {}, zakgf = 0, zakgg = [];
        for (var zakgh = 0; zakgh < zakgc.length; zakgh++) {
            var zakgi = zakgc[zakgh] && zakgc[zakgh].geometry ? zakgc[zakgh].geometry : zakgc[zakgh];
            if (!zakgi || !zakgi.attributes.position) continue;
            zakgg.push({
                geometry: zakgi,
                start: zakgf,
                matrix: zakgc[zakgh] && zakgc[zakgh].matrix ? zakgc[zakgh].matrix : zakgc[zakgh] && zakgc[zakgh].matrixWorld ? zakgc[zakgh].matrixWorld : null
            });
            zakgf += zakgi.attributes.position.array.length / zakgi.attributes.position.itemSize;
            for (var zakgj in zakgi.attributes) zakge[zakgj] = true;
        }
        var zakgk = {}, zakgl = {};
        for (var zakgm in zakge) {
            var zakgn = 3;
            for (var zakgo = 0; zakgo < zakgg.length; zakgo++) if (zakgg[zakgo].geometry.attributes[zakgm]) {
                zakgn = zakgg[zakgo].geometry.attributes[zakgm].itemSize;
                break;
            }
            zakgl[zakgm] = zakgn;
            var zakgp = zakgm === "skinIndex" ? Uint16Array : Float32Array;
            zakgk[zakgm] = new zakgp(zakgf * zakgn);
        }
        var zakgq = [], zakgr = 0;
        for (var zakgs = 0; zakgs < zakgg.length; zakgs++) {
            var zakgt = zakgg[zakgs], zakgu = zakgt.geometry, zakgv = zakgu.attributes.position.array.length / zakgu.attributes.position.itemSize;
            for (var zakgw = 0; zakgw < zakgv; zakgw++) {
                for (var zakgx in zakge) {
                    var zakgy = zakgk[zakgx], zakgz = zakgl[zakgx], zakgaa = zakgu.attributes[zakgx];
                    if (zakgaa) {
                        if (zakgt.matrix && (zakgx === "position" || zakgx === "normal") && zakgaa.itemSize >= 3) {
                            var zakgab = new Vector3(zakgaa.array[zakgw * zakgaa.itemSize], zakgaa.array[zakgw * zakgaa.itemSize + 1], zakgaa.array[zakgw * zakgaa.itemSize + 2]);
                            if (zakgx === "position") zakgab.applyMatrix4(zakgt.matrix); else zakgab.transformDirection(zakgt.matrix);
                            zakgy[(zakgr + zakgw) * zakgz] = zakgab.x;
                            zakgy[(zakgr + zakgw) * zakgz + 1] = zakgab.y;
                            zakgy[(zakgr + zakgw) * zakgz + 2] = zakgab.z;
                            for (var zakgac = 3; zakgac < zakgz; zakgac++) zakgy[(zakgr + zakgw) * zakgz + zakgac] = zakgaa.array[zakgw * zakgaa.itemSize + zakgac] || 0;
                        } else for (var zakgad = 0; zakgad < zakgz; zakgad++) zakgy[(zakgr + zakgw) * zakgz + zakgad] = zakgaa.array[zakgw * zakgaa.itemSize + zakgad] || 0;
                    } else if (zakgx === "normal" && zakgz >= 3) zakgy[(zakgr + zakgw) * zakgz + 1] = 1; else if (zakgx === "color") for (var zakgae = 0; zakgae < zakgz; zakgae++) zakgy[(zakgr + zakgw) * zakgz + zakgae] = 1;
                }
            }
            var zakgaf = zakgu.index || new (zakgv > 65535 ? Uint32Array : Uint16Array)(Array.from({
                length: zakgv
            }, function(zakga, zakgb) {
                return zakgb;
            }));
            for (var zakgag = 0; zakgag < zakgaf.length; zakgag++) zakgq.push(zakgaf[zakgag] + zakgr);
            if (zakgb.useGroups) {
                if (zakgu.groups && zakgu.groups.length) for (var zakgah = 0; zakgah < zakgu.groups.length; zakgah++) zakgd.addGroup(zakgr + zakgu.groups[zakgah].start, zakgu.groups[zakgah].count, zakgu.groups[zakgah].materialIndex); else zakgd.addGroup(zakgr, zakgaf.length, 0);
            }
            zakgr += zakgv;
        }
        for (var zakgai in zakge) zakgd.setAttribute(zakgai, zakgk[zakgai], zakgl[zakgai]);
        if (zakgq.length) zakgd.setIndex(zakgq.length > 65535 ? new Uint32Array(zakgq) : new Uint16Array(zakgq));
        zakgd.computeBounds();
        return zakgd;
    }
    clone() {
        var zakga = new Geometry;
        zakga.copy(this);
        zakga.morphTargetsRelative = !!this.morphTargetsRelative;
        zakga.userData = Object.assign({}, this.userData || {});
        zakga.drawRange = this.drawRange ? {
            start: this.drawRange.start,
            count: this.drawRange.count
        } : undefined;
        return zakga;
    }
    quantize(zakga) {
        zakga = zakga || {};
        var zakgb = zakga.attributes || [ "position", "normal", "uv" ];
        var zakgc = Math.max(8, Math.min(16, Math.floor(zakga.bits || 16))), zakgd = Math.pow(2, zakgc) - 1, zakge = {
            version: 1,
            bits: zakgc,
            attributes: {},
            index: this.index ? new this.index.constructor(this.index) : null,
            groups: this.groups.map(function(zakga) {
                return {
                    start: zakga.start,
                    count: zakga.count,
                    materialIndex: zakga.materialIndex
                };
            })
        }, zakgf = zakge.index ? zakge.index.byteLength : 0;
        for (var zakgg in this.attributes) {
            var zakgh = this.attributes[zakgg], zakgi = zakgh.array, zakgj = zakgb.indexOf(zakgg) !== -1 && zakgi && zakgi.length;
            if (!zakgj) {
                zakge.attributes[zakgg] = {
                    kind: "raw",
                    array: new zakgi.constructor(zakgi),
                    itemSize: zakgh.itemSize,
                    normalized: !!zakgh.normalized
                };
                zakgf += zakgi.byteLength;
                continue;
            }
            var zakgk = zakgh.itemSize, zakgl = new Float32Array(zakgk), zakgm = new Float32Array(zakgk);
            for (var zakgn = 0; zakgn < zakgk; zakgn++) {
                zakgl[zakgn] = Infinity;
                zakgm[zakgn] = -Infinity;
            }
            for (var zakgo = 0; zakgo < zakgi.length; zakgo += zakgk) for (var zakgp = 0; zakgp < zakgk; zakgp++) {
                var zakgq = zakgi[zakgo + zakgp];
                if (zakgq < zakgl[zakgp]) zakgl[zakgp] = zakgq;
                if (zakgq > zakgm[zakgp]) zakgm[zakgp] = zakgq;
            }
            var zakgr = new Uint16Array(zakgi.length);
            for (var zakgs = 0; zakgs < zakgi.length; zakgs++) {
                var zakgt = zakgs % zakgk, zakgu = zakgm[zakgt] - zakgl[zakgt];
                zakgr[zakgs] = zakgu > 1e-12 ? Math.round((zakgi[zakgs] - zakgl[zakgt]) / zakgu * zakgd) : 0;
            }
            zakge.attributes[zakgg] = {
                kind: "quantized",
                array: zakgr,
                itemSize: zakgk,
                min: zakgl,
                max: zakgm,
                normalized: false
            };
            zakgf += zakgr.byteLength + zakgl.byteLength + zakgm.byteLength;
        }
        zakge.byteLength = zakgf;
        zakge.sourceByteLength = Object.keys(this.attributes).reduce(function(zakga, zakgb) {
            return zakga + (this.attributes[zakgb].array ? this.attributes[zakgb].array.byteLength : 0);
        }.bind(this), this.index ? this.index.byteLength : 0);
        return zakge;
    }
    dispose() {
        this.disposed = true;
        this.attributes = {};
        this.index = null;
    }
}

Geometry.fromQuantized = function(zakga) {
    if (!zakga || !zakga.attributes) throw new Error("Invalid quantized geometry packet");
    var zakgb = new Geometry;
    for (var zakgc in zakga.attributes) {
        var zakgd = zakga.attributes[zakgc];
        if (zakgd.kind === "quantized") {
            var zakge = new Float32Array(zakgd.array.length), zakgf = Math.pow(2, zakga.bits || 16) - 1;
            for (var zakgg = 0; zakgg < zakgd.array.length; zakgg++) {
                var zakgh = zakgg % zakgd.itemSize, zakgi = zakgd.max[zakgh] - zakgd.min[zakgh];
                zakge[zakgg] = zakgi > 1e-12 ? zakgd.min[zakgh] + zakgd.array[zakgg] / zakgf * zakgi : zakgd.min[zakgh];
            }
            zakgb.setAttribute(zakgc, zakge, zakgd.itemSize, false);
        } else zakgb.setAttribute(zakgc, new zakgd.array.constructor(zakgd.array), zakgd.itemSize, zakgd.normalized);
    }
    if (zakga.index) zakgb.setIndex(new zakga.index.constructor(zakga.index));
    zakgb.groups = (zakga.groups || []).map(function(zakga) {
        return {
            start: zakga.start,
            count: zakga.count,
            materialIndex: zakga.materialIndex
        };
    });
    zakgb.computeBounds();
    return zakgb;
};

Geometry.prototype.computeWeightedNormals = function() {
    return this.computeVertexNormals();
};

Geometry.prototype.subdivide = function(zakga) {
    var zakgb = this, zakgc = Math.max(1, Math.floor(zakga || 1));
    for (var zakgd = 0; zakgd < zakgc; zakgd++) {
        var zakge = zakgb, zakgf = zakge.index || new (zakge.attributes.position.array.length / zakge.attributes.position.itemSize > 65535 ? Uint32Array : Uint16Array)(Array.from({
            length: zakge.attributes.position.array.length / zakge.attributes.position.itemSize
        }, function(zakga, zakgb) {
            return zakgb;
        })), zakgg = Object.keys(zakge.attributes), zakgh = {};
        for (var zakgi = 0; zakgi < zakgg.length; zakgi++) zakgh[zakgg[zakgi]] = [];
        var zakgj = function(zakga) {
            for (var zakgb = 0; zakgb < zakgg.length; zakgb++) {
                var zakgc = zakgg[zakgb], zakgd = zakge.attributes[zakgc], zakgf = zakgd.itemSize, zakgi = zakga * zakgf;
                for (var zakgj = 0; zakgj < zakgf; zakgj++) zakgh[zakgc].push(zakgd.array[zakgi + zakgj]);
            }
            return zakgh.position.length / zakge.attributes.position.itemSize - 1;
        };
        for (var zakgk = 0; zakgk < zakge.attributes.position.array.length / zakge.attributes.position.itemSize; zakgk++) zakgj(zakgk);
        var zakgl = {};
        var zakgm = function(zakga, zakgb) {
            var zakgc = zakga < zakgb ? zakga + ":" + zakgb : zakgb + ":" + zakga;
            if (zakgl[zakgc] !== undefined) return zakgl[zakgc];
            var zakgd = zakgh.position.length / zakge.attributes.position.itemSize;
            for (var zakgf = 0; zakgf < zakgg.length; zakgf++) {
                var zakgi = zakgg[zakgf], zakgj = zakge.attributes[zakgi], zakgk = zakgj.itemSize, zakgm = zakga * zakgk, zakgn = zakgb * zakgk;
                for (var zakgo = 0; zakgo < zakgk; zakgo++) zakgh[zakgi].push(zakgi === "skinIndex" ? zakgj.array[zakgm + zakgo] : (zakgj.array[zakgm + zakgo] + zakgj.array[zakgn + zakgo]) * .5);
            }
            zakgl[zakgc] = zakgd;
            return zakgd;
        };
        var zakgn = [];
        for (var zakgo = 0; zakgo + 2 < zakgf.length; zakgo += 3) {
            var zakgp = zakgf[zakgo], zakgq = zakgf[zakgo + 1], zakgr = zakgf[zakgo + 2], zakgs = zakgm(zakgp, zakgq), zakgt = zakgm(zakgq, zakgr), zakgu = zakgm(zakgr, zakgp);
            if (!zakgh.position.length) {
                zakgj(zakgp);
                zakgj(zakgq);
                zakgj(zakgr);
            }
            zakgn.push(zakgp, zakgs, zakgu, zakgs, zakgq, zakgt, zakgu, zakgt, zakgr, zakgs, zakgt, zakgu);
        }
        var zakgv = new Geometry;
        for (var zakgw = 0; zakgw < zakgg.length; zakgw++) {
            var zakgx = zakgg[zakgw], zakgy = zakge.attributes[zakgx], zakgz = zakgx === "skinIndex" ? Uint16Array : Float32Array;
            zakgv.setAttribute(zakgx, new zakgz(zakgh[zakgx]), zakgy.itemSize, zakgy.normalized);
        }
        zakgv.setIndex(zakgn.length > 65535 ? new Uint32Array(zakgn) : new Uint16Array(zakgn));
        zakgv.computeBounds();
        if (zakgv.attributes.normal) zakgv.normalizeNormals();
        zakgb = zakgv;
    }
    return zakgb;
};

Geometry.prototype.mirror = function(zakga, zakgb) {
    zakgb = zakgb || {};
    var zakgc = this.clone(), zakgd = zakga === "x" || zakga === 0 ? 0 : zakga === "y" || zakga === 1 ? 1 : 2, zakge = zakgb.origin === undefined ? 0 : zakgb.origin, zakgf = zakgc.attributes.position, zakgg = zakgc.attributes.normal, zakgh = zakgc.attributes.tangent;
    if (zakgf) for (var zakgi = zakgd; zakgi < zakgf.array.length; zakgi += zakgf.itemSize) zakgf.array[zakgi] = zakge - (zakgf.array[zakgi] - zakge);
    if (zakgg) for (var zakgj = zakgd; zakgj < zakgg.array.length; zakgj += zakgg.itemSize) zakgg.array[zakgj] = -zakgg.array[zakgj];
    if (zakgh) for (var zakgk = zakgd; zakgk < zakgh.array.length; zakgk += zakgh.itemSize) zakgh.array[zakgk] = -zakgh.array[zakgk];
    if (zakgc.index && zakgb.flipWinding !== false) for (var zakgl = 0; zakgl < zakgc.index.length; zakgl += 3) {
        var zakgm = zakgc.index[zakgl + 1];
        zakgc.index[zakgl + 1] = zakgc.index[zakgl + 2];
        zakgc.index[zakgl + 2] = zakgm;
    }
    zakgc.computeBounds();
    return zakgc;
};

Geometry.prototype.array = function(zakga, zakgb, zakgc) {
    zakga = Math.max(1, Math.floor(zakga || 1));
    zakgc = zakgc || {};
    var zakgd = zakgb && zakgb.toArray ? zakgb.toArray() : zakgb || [ 1, 0, 0 ], zakge = [];
    for (var zakgf = 0; zakgf < zakga; zakgf++) {
        var zakgg = this.clone();
        zakgg.translate((zakgd[0] || 0) * zakgf, (zakgd[1] || 0) * zakgf, (zakgd[2] || 0) * zakgf);
        zakge.push(zakgg);
    }
    return Geometry.merge(zakge, {
        useGroups: !!zakgc.useGroups
    });
};

Geometry.prototype.displace = function(zakga, zakgb) {
    zakgb = zakgb || {};
    var zakgc = this.attributes.position, zakgd = this.attributes.normal, zakge = zakgb.strength === undefined ? 1 : zakgb.strength, zakgf = zakgb.scale === undefined ? 1 : zakgb.scale, zakgg = zakgb.axis === "x" || zakgb.axis === "y" || zakgb.axis === "z" ? zakgb.axis : null;
    if (!zakgc) return this;
    for (var zakgh = 0; zakgh < zakgc.array.length; zakgh += zakgc.itemSize) {
        var zakgi = zakgc.array[zakgh], zakgj = zakgc.array[zakgh + 1], zakgk = zakgc.array[zakgh + 2], zakgl = typeof zakga === "function" ? zakga(zakgi, zakgj, zakgk, zakgh / zakgc.itemSize, this) : zakga && zakga.data ? zakga.data[Math.max(0, Math.min(zakga.data.length - 1, Math.floor(((zakgi + .5) % 1 + 1) % 1 * zakga.width) + Math.floor(((zakgk + .5) % 1 + 1) % 1 * zakga.height) * zakga.width))] / (zakga.maxValue || 255) : Number(zakga) || 0, zakgm = zakgl * zakge * zakgf;
        if (zakgg === "x") zakgc.array[zakgh] += zakgm; else if (zakgg === "y") zakgc.array[zakgh + 1] += zakgm; else if (zakgg === "z") zakgc.array[zakgh + 2] += zakgm; else if (zakgd) {
            zakgc.array[zakgh] += zakgd.array[zakgh] * zakgm;
            zakgc.array[zakgh + 1] += zakgd.array[zakgh + 1] * zakgm;
            zakgc.array[zakgh + 2] += zakgd.array[zakgh + 2] * zakgm;
        }
    }
    if (zakgd) this.computeVertexNormals();
    this.computeBounds();
    return this;
};

Geometry.prototype.generatePlanarUV = function(zakga, zakgb) {
    zakgb = zakgb || {};
    zakga = zakga === "x" || zakga === 0 ? 0 : zakga === "y" || zakga === 1 ? 1 : 2;
    var zakgc = this.attributes.position;
    if (!zakgc) return this;
    this.computeBounds();
    var zakgd = this.boundingBox.min, zakge = this.boundingBox.max, zakgf = zakga === 0 ? 2 : 0, zakgg = zakga === 1 ? 2 : 1, zakgh = Math.max(1e-8, [ zakge.x - zakgd.x, zakge.y - zakgd.y, zakge.z - zakgd.z ][zakgf]), zakgi = Math.max(1e-8, [ zakge.x - zakgd.x, zakge.y - zakgd.y, zakge.z - zakgd.z ][zakgg]), zakgj = new Float32Array(zakgc.array.length / zakgc.itemSize * 2);
    for (var zakgk = 0; zakgk < zakgc.array.length / zakgc.itemSize; zakgk++) {
        var zakgl = zakgk * zakgc.itemSize, zakgm = [ zakgc.array[zakgl], zakgc.array[zakgl + 1], zakgc.array[zakgl + 2] ], zakgn = (zakgm[zakgf] - [ zakgd.x, zakgd.y, zakgd.z ][zakgf]) / zakgh, zakgo = (zakgm[zakgg] - [ zakgd.x, zakgd.y, zakgd.z ][zakgg]) / zakgi;
        zakgj[zakgk * 2] = zakgb.flipU ? 1 - zakgn : zakgn;
        zakgj[zakgk * 2 + 1] = zakgb.flipV ? 1 - zakgo : zakgo;
    }
    this.setAttribute(zakgb.name || "uv", zakgj, 2);
    return this;
};

Geometry.prototype.weldVertices = function(zakga) {
    zakga = zakga === undefined ? 1e-5 : Math.max(1e-12, zakga);
    var zakgb = this.attributes.position;
    if (!zakgb) return this.clone();
    var zakgc = this.index || new (zakgb.array.length / zakgb.itemSize > 65535 ? Uint32Array : Uint16Array)(Array.from({
        length: zakgb.array.length / zakgb.itemSize
    }, function(zakga, zakgb) {
        return zakgb;
    })), zakgd = {}, zakge = [], zakgf = [], zakgg = {};
    for (var zakgh in this.attributes) zakgg[zakgh] = [];
    for (var zakgi = 0; zakgi < zakgc.length; zakgi++) {
        var zakgj = zakgc[zakgi], zakgk = Math.round(zakgb.array[zakgj * zakgb.itemSize] / zakga) + ":" + Math.round(zakgb.array[zakgj * zakgb.itemSize + 1] / zakga) + ":" + Math.round(zakgb.array[zakgj * zakgb.itemSize + 2] / zakga);
        if (zakgd[zakgk] === undefined) {
            zakgd[zakgk] = zakgf.length;
            zakgf.push(zakgj);
            for (var zakgl in this.attributes) {
                var zakgm = this.attributes[zakgl], zakgn = zakgj * zakgm.itemSize;
                for (var zakgo = 0; zakgo < zakgm.itemSize; zakgo++) zakgg[zakgl].push(zakgm.array[zakgn + zakgo]);
            }
        }
        zakge.push(zakgd[zakgk]);
    }
    var zakgp = new Geometry;
    for (var zakgq in zakgg) {
        var zakgr = this.attributes[zakgq], zakgs = zakgq === "skinIndex" ? Uint16Array : zakgr.array.constructor;
        zakgp.setAttribute(zakgq, new zakgs(zakgg[zakgq]), zakgr.itemSize, zakgr.normalized);
    }
    zakgp.setIndex(zakge.length > 65535 ? new Uint32Array(zakge) : new Uint16Array(zakge));
    zakgp.computeBounds();
    return zakgp;
};

Geometry.prototype.toFlatShaded = function() {
    var zakga = this.toNonIndexed();
    zakga.deleteAttribute("normal");
    zakga.computeVertexNormals();
    return zakga;
};

Geometry.prototype.twist = function(zakga, zakgb, zakgc) {
    zakgb = zakgb || "y";
    var zakgd = zakgb === "x" ? 0 : zakgb === "y" ? 1 : 2, zakge = zakgb === "x" ? 1 : zakgb === "y" ? 0 : 0, zakgf = zakgb === "x" ? 2 : zakgb === "y" ? 2 : 1, zakgg = this.attributes.position;
    if (!zakgg) return this;
    this.computeBounds();
    var zakgh = this.boundingBox.min[zakgb], zakgi = this.boundingBox.max[zakgb], zakgj = Math.max(1e-6, zakgi - zakgh), zakgk = zakgc !== undefined ? zakgc : zakgh;
    for (var zakgl = 0; zakgl < zakgg.array.length; zakgl += zakgg.itemSize) {
        var zakgm = (zakgg.array[zakgl + zakgd] - zakgk) / zakgj, zakgn = (zakga || 0) * zakgm, zakgo = Math.cos(zakgn), zakgp = Math.sin(zakgn), zakgq = zakgg.array[zakgl + zakge], zakgr = zakgg.array[zakgl + zakgf];
        zakgg.array[zakgl + zakge] = zakgq * zakgo - zakgr * zakgp;
        zakgg.array[zakgl + zakgf] = zakgq * zakgp + zakgr * zakgo;
    }
    this.computeVertexNormals();
    this.computeBounds();
    return this;
};

Geometry.prototype.taper = function(zakga, zakgb, zakgc) {
    zakgb = zakgb || "y";
    zakga = zakga === undefined ? 1 : zakga;
    var zakgd = zakgb === "x" ? 0 : zakgb === "y" ? 1 : 2, zakge = zakgb === "x" ? 1 : zakgb === "y" ? 0 : 0, zakgf = zakgb === "x" ? 2 : zakgb === "y" ? 2 : 1, zakgg = this.attributes.position;
    if (!zakgg) return this;
    this.computeBounds();
    var zakgh = this.boundingBox.min[zakgb], zakgi = this.boundingBox.max[zakgb], zakgj = Math.max(1e-6, zakgi - zakgh), zakgk = zakgc !== undefined ? zakgc : zakgh;
    for (var zakgl = 0; zakgl < zakgg.array.length; zakgl += zakgg.itemSize) {
        var zakgm = (zakgg.array[zakgl + zakgd] - zakgk) / zakgj, zakgn = 1 + (zakga - 1) * zakgm;
        zakgg.array[zakgl + zakge] *= zakgn;
        zakgg.array[zakgl + zakgf] *= zakgn;
    }
    this.computeVertexNormals();
    this.computeBounds();
    return this;
};

Geometry.prototype.bend = function(zakga, zakgb) {
    zakgb = zakgb || "y";
    var zakgc = zakgb === "x" ? 0 : zakgb === "y" ? 1 : 2, zakgd = zakgb === "y" ? 0 : 1, zakge = this.attributes.position;
    if (!zakge || Math.abs(zakga || 0) < 1e-6) return this;
    this.computeBounds();
    var zakgf = this.boundingBox.min[zakgb], zakgg = this.boundingBox.max[zakgb], zakgh = Math.max(1e-6, zakgg - zakgf), zakgi = zakgh / zakga;
    for (var zakgj = 0; zakgj < zakge.array.length; zakgj += zakge.itemSize) {
        var zakgk = zakge.array[zakgj + zakgc] - zakgf, zakgl = zakgk / zakgh * zakga, zakgm = zakge.array[zakgj + zakgd], zakgn = zakgi - zakgm;
        zakge.array[zakgj + zakgc] = zakgf + zakgn * Math.sin(zakgl);
        zakge.array[zakgj + zakgd] = zakgi - zakgn * Math.cos(zakgl);
    }
    this.computeVertexNormals();
    this.computeBounds();
    return this;
};

Geometry.prototype.smooth = function(zakga, zakgb) {
    zakga = Math.max(1, Math.floor(zakga || 1));
    zakgb = zakgb === undefined ? .5 : Math.max(0, Math.min(1, zakgb));
    var zakgc = this.attributes.position, zakgd = this.index;
    if (!zakgc || !zakgd) return this;
    var zakge = zakgc.array.length / zakgc.itemSize, zakgf = Array.from({
        length: zakge
    }, function() {
        return [];
    });
    for (var zakgg = 0; zakgg < zakgd.length; zakgg += 3) {
        var zakgh = zakgd[zakgg], zakgi = zakgd[zakgg + 1], zakgj = zakgd[zakgg + 2];
        if (zakgf[zakgh].indexOf(zakgi) < 0) zakgf[zakgh].push(zakgi);
        if (zakgf[zakgh].indexOf(zakgj) < 0) zakgf[zakgh].push(zakgj);
        if (zakgf[zakgi].indexOf(zakgh) < 0) zakgf[zakgi].push(zakgh);
        if (zakgf[zakgi].indexOf(zakgj) < 0) zakgf[zakgi].push(zakgj);
        if (zakgf[zakgj].indexOf(zakgh) < 0) zakgf[zakgj].push(zakgh);
        if (zakgf[zakgj].indexOf(zakgi) < 0) zakgf[zakgj].push(zakgi);
    }
    for (var zakgk = 0; zakgk < zakga; zakgk++) {
        var zakgl = new Float32Array(zakgc.array.length);
        for (var zakgm = 0; zakgm < zakge; zakgm++) {
            var zakgn = zakgf[zakgm];
            if (!zakgn.length) {
                zakgl[zakgm * 3] = zakgc.array[zakgm * 3];
                zakgl[zakgm * 3 + 1] = zakgc.array[zakgm * 3 + 1];
                zakgl[zakgm * 3 + 2] = zakgc.array[zakgm * 3 + 2];
                continue;
            }
            var zakgo = 0, zakgp = 0, zakgq = 0;
            for (var zakgr = 0; zakgr < zakgn.length; zakgr++) {
                var zakgs = zakgn[zakgr] * 3;
                zakgo += zakgc.array[zakgs];
                zakgp += zakgc.array[zakgs + 1];
                zakgq += zakgc.array[zakgs + 2];
            }
            zakgo /= zakgn.length;
            zakgp /= zakgn.length;
            zakgq /= zakgn.length;
            zakgl[zakgm * 3] = zakgc.array[zakgm * 3] * (1 - zakgb) + zakgo * zakgb;
            zakgl[zakgm * 3 + 1] = zakgc.array[zakgm * 3 + 1] * (1 - zakgb) + zakgp * zakgb;
            zakgl[zakgm * 3 + 2] = zakgc.array[zakgm * 3 + 2] * (1 - zakgb) + zakgq * zakgb;
        }
        zakgc.array.set(zakgl);
    }
    this.computeVertexNormals();
    this.computeBounds();
    return this;
};

Geometry.prototype.noise = function(zakga, zakgb, zakgc) {
    zakga = zakga || 1;
    zakgb = zakgb === undefined ? .1 : zakgb;
    zakgc = zakgc || 42;
    var zakgd = this.attributes.position, zakge = this.attributes.normal;
    if (!zakgd) return this;
    var zakgf = function(zakga, zakgb, zakgd) {
        var zakge = Math.sin(zakga * 12.9898 + zakgb * 78.233 + zakgd * 37.719 + zakgc) * 43758.5453;
        return zakge - Math.floor(zakge);
    };
    for (var zakgg = 0; zakgg < zakgd.array.length; zakgg += zakgd.itemSize) {
        var zakgh = zakgd.array[zakgg] * zakga, zakgi = zakgd.array[zakgg + 1] * zakga, zakgj = zakgd.array[zakgg + 2] * zakga, zakgk = (zakgf(zakgh, zakgi, zakgj) * 2 - 1) * zakgb;
        if (zakge) {
            zakgd.array[zakgg] += zakge.array[zakgg] * zakgk;
            zakgd.array[zakgg + 1] += zakge.array[zakgg + 1] * zakgk;
            zakgd.array[zakgg + 2] += zakge.array[zakgg + 2] * zakgk;
        } else zakgd.array[zakgg + 1] += zakgk;
    }
    if (zakge) this.computeVertexNormals();
    this.computeBounds();
    return this;
};

Geometry.prototype.applyModifiers = function(zakga) {
    var zakgb = this;
    for (var zakgc = 0; zakgc < (zakga || []).length; zakgc++) {
        var zakgd = zakga[zakgc];
        if (typeof zakgd === "function") zakgb = zakgd(zakgb) || zakgb; else if (!zakgd) continue; else if (zakgd.type === "mirror") zakgb = zakgb.mirror(zakgd.axis, zakgd); else if (zakgd.type === "array") zakgb = zakgb.array(zakgd.count, zakgd.offset, zakgd); else if (zakgd.type === "subdivision" || zakgd.type === "subdivide") zakgb = zakgb.subdivide(zakgd.levels || 1); else if (zakgd.type === "displace") zakgb = zakgb.clone().displace(zakgd.source, zakgd); else if (zakgd.type === "twist") zakgb = zakgb.clone().twist(zakgd.angle, zakgd.axis, zakgd.origin); else if (zakgd.type === "taper") zakgb = zakgb.clone().taper(zakgd.factor, zakgd.axis, zakgd.origin); else if (zakgd.type === "bend") zakgb = zakgb.clone().bend(zakgd.angle, zakgd.axis); else if (zakgd.type === "smooth") zakgb = zakgb.clone().smooth(zakgd.iterations, zakgd.factor); else if (zakgd.type === "noise") zakgb = zakgb.clone().noise(zakgd.scale, zakgd.strength, zakgd.seed); else if (zakgd.type === "weld") zakgb = zakgb.weldVertices(zakgd.tolerance); else if (zakgd.type === "flat") zakgb = zakgb.toFlatShaded(); else if (zakgd.type === "uvPlanar") zakgb = zakgb.clone().generatePlanarUV(zakgd.axis, zakgd);
    }
    return zakgb;
};

Geometry.prototype.generateLOD = function(zakga) {
    var zakgb = [];
    var zakgc = zakga || [ 1, .5, .25, .125 ];
    for (var zakgd = 0; zakgd < zakgc.length; zakgd++) zakgb.push({
        ratio: zakgc[zakgd],
        geometry: zakgc[zakgd] >= 1 ? this.clone() : this.simplify({
            targetRatio: zakgc[zakgd]
        })
    });
    return zakgb;
};

export { Geometry };
