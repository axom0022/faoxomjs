import { Geometry, faoxomgeometry } from "../geometries/index.js";

import { StandardMaterial } from "../materials/index.js";

import { Mesh } from "../objects/index.js";

import { Group } from "../objects/index.js";

import { faoxomvalue } from "../math/index.js";

function zajfa(zajfa) {
    if (typeof zajfa === "function") return {
        heightAt: function(zajfb, zajfc) {
            return zajfa(zajfb, zajfc);
        }
    };
    if (zajfa && typeof zajfa.heightAt === "function") return zajfa;
    if (zajfa && typeof zajfa.getHeight === "function") return {
        heightAt: function(zajfb, zajfc) {
            return zajfa.getHeight(zajfb, zajfc);
        },
        slopeAt: zajfa.slopeAt,
        zoneAt: zajfa.zoneAt
    };
    throw new Error("TerrainClipmap sampler must be a function or expose heightAt/getHeight");
}

class TerrainClipmap extends Group {
    constructor(zajfb, zajfc) {
        super();
        zajfc = zajfc || {};
        this.type = "TerrainClipmap";
        this.sampler = zajfa(zajfb);
        this.levels = Math.max(1, Math.floor(faoxomvalue(zajfc.levels, 6)));
        var zajfd = Math.floor(faoxomvalue(zajfc.ringRadius, 16));
        if (zajfd < 2) zajfd = 2;
        if (zajfd % 2 === 1) zajfd = zajfd + 1;
        this.ringRadius = zajfd;
        this.spacing = Math.max(1e-4, faoxomvalue(zajfc.spacing, 1));
        this.material = zajfc.material || new StandardMaterial;
        this.skirtDepth = faoxomvalue(zajfc.skirtDepth, 0);
        this.origin = {
            x: zajfc.origin && zajfc.origin.x !== undefined ? zajfc.origin.x : 0,
            z: zajfc.origin && zajfc.origin.z !== undefined ? zajfc.origin.z : 0
        };
        this.maxUpdatesPerFrame = Math.max(0, faoxomvalue(zajfc.maxUpdatesPerFrame, 0));
        this.uvScale = Math.max(1e-4, faoxomvalue(zajfc.uvScale, .1));
        this.stats = {
            levels: this.levels,
            vertices: 0,
            triangles: 0,
            rebuilds: 0,
            lastUpdated: [],
            samplerCalls: 0
        };
        this.leveldata = [];
        for (var zajfe = 0; zajfe < this.levels; zajfe++) {
            var zajff = this.spacing * Math.pow(2, zajfe);
            this.leveldata.push({
                level: zajfe,
                spacing: zajff,
                half: zajfd * zajff,
                mesh: null,
                center: null,
                dirty: true,
                holeHalf: zajfe === 0 ? 0 : zajfd * zajff / 2 - zajff,
                skirt: this.skirtDepth > 0 ? this.skirtDepth : 2 * zajff
            });
        }
        this.update({
            x: this.origin.x,
            z: this.origin.z
        });
    }
    heightAt(zajfa, zajfb) {
        return this.sampler.heightAt(zajfa, zajfb);
    }
    normalAt(zajfa, zajfb, zajfc) {
        var zajfd = this.sampler;
        var zajfe = this.spacing * .5;
        var zajff = zajfd.heightAt(zajfa + zajfe, zajfb) - zajfd.heightAt(zajfa - zajfe, zajfb);
        var zajfg = zajfd.heightAt(zajfa, zajfb + zajfe) - zajfd.heightAt(zajfa, zajfb - zajfe);
        var zajfh = -zajff, zajfi = 2 * zajfe, zajfj = -zajfg;
        var zajfk = Math.sqrt(zajfh * zajfh + zajfi * zajfi + zajfj * zajfj) || 1;
        var zajfl = zajfc || {
            x: 0,
            y: 1,
            z: 0
        };
        zajfl.x = zajfh / zajfk;
        zajfl.y = zajfi / zajfk;
        zajfl.z = zajfj / zajfk;
        return zajfl;
    }
    snapCenter(zajfa, zajfb, zajfc) {
        var zajfd = zajfc * 2;
        return {
            x: this.origin.x + Math.round((zajfa - this.origin.x) / zajfd) * zajfd,
            z: this.origin.z + Math.round((zajfb - this.origin.z) / zajfd) * zajfd
        };
    }
    update(zajfa) {
        var zajfb = zajfa && zajfa.position ? zajfa.position : zajfa || {
            x: this.origin.x,
            z: this.origin.z
        };
        var zajfc = faoxomvalue(zajfb.x, this.origin.x), zajfd = faoxomvalue(zajfb.z, this.origin.z);
        var zajfe = this.maxUpdatesPerFrame;
        var zajff = [];
        for (var zajfg = 0; zajfg < this.leveldata.length; zajfg++) {
            var zajfh = this.leveldata[zajfg];
            var zajfi = this.snapCenter(zajfc, zajfd, zajfh.spacing);
            if (!zajfh.center || zajfh.center.x !== zajfi.x || zajfh.center.z !== zajfi.z) {
                zajfh.center = zajfi;
                zajfh.dirty = true;
            }
            if (zajfh.dirty && (zajfe === 0 || zajff.length < zajfe || zajfg === 0)) {
                this.rebuildLevel(zajfh);
                zajff.push(zajfg);
            }
        }
        this.stats.lastUpdated = zajff;
        return {
            updated: zajff,
            pending: this.leveldata.filter(function(zajfa) {
                return zajfa.dirty;
            }).length
        };
    }
    buildLevelGeometry(zajfa) {
        var zajfb = this.ringRadius, zajfc = zajfa.spacing, zajfd = zajfa.holeHalf;
        var zajfe = 2 * zajfb + 1;
        var zajff = zajfa.center.x, zajfg = zajfa.center.z;
        var zajfh = [], zajfi = [], zajfj = [], zajfk = [];
        var zajfl = new Int32Array(zajfe * zajfe);
        var zajfm = new Float32Array(zajfe * zajfe * 3);
        var zajfn = new Float32Array(zajfe * zajfe * 3);
        var zajfo = new Float32Array(zajfe * zajfe * 2);
        var zajfp = 0;
        var zajfq = this.sampler.heightAt;
        for (var zajfr = 0; zajfr < zajfe; zajfr++) {
            for (var zajfs = 0; zajfs < zajfe; zajfs++) {
                var zajft = (zajfs - zajfb) * zajfc, zajfu = (zajfr - zajfb) * zajfc;
                var zajfv = zajff + zajft, zajfw = zajfg + zajfu;
                var zajfx = zajfq(zajfv, zajfw);
                zajfp++;
                var zajfy = zajfc;
                var zajfz = zajfq(zajfv + zajfy, zajfw) - zajfq(zajfv - zajfy, zajfw);
                zajfp += 2;
                var zajfaa = zajfq(zajfv, zajfw + zajfy) - zajfq(zajfv, zajfw - zajfy);
                zajfp += 2;
                var zajfab = -zajfz, zajfac = 2 * zajfy, zajfad = -zajfaa;
                var zajfae = Math.sqrt(zajfab * zajfab + zajfac * zajfac + zajfad * zajfad) || 1;
                var zajfaf = zajfr * zajfe + zajfs;
                zajfl[zajfaf] = zajfaf;
                zajfm[zajfaf * 3] = zajft;
                zajfm[zajfaf * 3 + 1] = zajfx;
                zajfm[zajfaf * 3 + 2] = zajfu;
                zajfn[zajfaf * 3] = zajfab / zajfae;
                zajfn[zajfaf * 3 + 1] = zajfac / zajfae;
                zajfn[zajfaf * 3 + 2] = zajfad / zajfae;
                zajfo[zajfaf * 2] = zajfv * this.uvScale;
                zajfo[zajfaf * 2 + 1] = zajfw * this.uvScale;
            }
        }
        var zajfag = new Int32Array(zajfe * zajfe);
        var zajfah = [];
        function zajfai(zajfa, zajfb) {
            var zajfc = zajfa * zajfe + zajfb;
            if (zajfag[zajfc] === 0) {
                zajfag[zajfc] = zajfh.length / 3 + 1;
                zajfah.push(zajfc);
            }
            return zajfag[zajfc] - 1;
        }
        function zajfaj(zajfa, zajfb) {
            zajfh.push(zajfm[zajfa * 3], zajfm[zajfa * 3 + 1] - zajfb, zajfm[zajfa * 3 + 2]);
            zajfi.push(zajfn[zajfa * 3], zajfn[zajfa * 3 + 1], zajfn[zajfa * 3 + 2]);
            zajfj.push(zajfo[zajfa * 2], zajfo[zajfa * 2 + 1]);
            return zajfh.length / 3 - 1;
        }
        for (var zajfak = 0; zajfak < zajfe; zajfak++) {
            for (var zajfal = 0; zajfal < zajfe; zajfal++) {
                var zajfam = zajfak * zajfe + zajfal;
                zajfaj(zajfam, 0);
            }
        }
        for (var zajfan = 0; zajfan < 2 * zajfb; zajfan++) {
            for (var zajfao = 0; zajfao < 2 * zajfb; zajfao++) {
                var zajfap = (zajfao - zajfb) * zajfc, zajfaq = (zajfao + 1 - zajfb) * zajfc;
                var zajfar = (zajfan - zajfb) * zajfc, zajfas = (zajfan + 1 - zajfb) * zajfc;
                var zajfat = zajfd > 0 && !(zajfap >= zajfd || zajfaq <= -zajfd || zajfar >= zajfd || zajfas <= -zajfd);
                if (zajfat) continue;
                var zajfau = zajfl[zajfan * zajfe + zajfao], zajfav = zajfl[zajfan * zajfe + zajfao + 1];
                var zajfaw = zajfl[(zajfan + 1) * zajfe + zajfao], zajfax = zajfl[(zajfan + 1) * zajfe + zajfao + 1];
                zajfk.push(zajfau, zajfaw, zajfav, zajfav, zajfaw, zajfax);
            }
        }
        var zajfay = zajfa.skirt;
        var zajfaz = [ {
            fixed: "z",
            value: 0
        }, {
            fixed: "z",
            value: zajfe - 1
        }, {
            fixed: "x",
            value: 0
        }, {
            fixed: "x",
            value: zajfe - 1
        } ];
        for (var zajfba = 0; zajfba < zajfaz.length; zajfba++) {
            var zajfbb = zajfaz[zajfba];
            for (var zajfbc = 0; zajfbc < 2 * zajfb; zajfbc++) {
                var zajfbd, zajfbe, zajfbf, zajfbg;
                if (zajfbb.fixed === "z") {
                    zajfbd = zajfbb.value;
                    zajfbe = zajfbc;
                    zajfbf = zajfbb.value;
                    zajfbg = zajfbc + 1;
                } else {
                    zajfbd = zajfbc;
                    zajfbe = zajfbb.value;
                    zajfbf = zajfbc + 1;
                    zajfbg = zajfbb.value;
                }
                var zajfbh = zajfl[zajfbd * zajfe + zajfbe], zajfbi = zajfl[zajfbf * zajfe + zajfbg];
                var zajfbj = zajfai(zajfbd, zajfbe), zajfbk = zajfai(zajfbf, zajfbg);
                zajfk.push(zajfbh, zajfbi, zajfbj, zajfbj, zajfbi, zajfbk);
                zajfk.push(zajfbh, zajfbj, zajfbi, zajfbi, zajfbj, zajfbk);
            }
        }
        for (var zajfbl = 0; zajfbl < zajfah.length; zajfbl++) {
            zajfaj(zajfah[zajfbl], zajfay);
        }
        this.stats.samplerCalls += zajfp;
        return {
            position: zajfh,
            normal: zajfi,
            uv: zajfj,
            index: zajfk,
            calls: zajfp
        };
    }
    rebuildLevel(zajfa) {
        if (!zajfa.center) zajfa.center = this.snapCenter(this.origin.x, this.origin.z, zajfa.spacing);
        var zajfb = this.buildLevelGeometry(zajfa);
        var zajfc = new Geometry;
        var zajfd = faoxomgeometry(zajfb.position, zajfb.normal, zajfb.uv, zajfb.index);
        zajfc.attributes = zajfd.attributes;
        zajfc.index = zajfd.index instanceof Uint32Array ? zajfd.index : new Uint32Array(zajfd.index);
        zajfc.computeBoundingBox();
        zajfc.computeBoundingSphere();
        if (zajfa.mesh) {
            zajfa.mesh.geometry.dispose();
            zajfa.mesh.geometry = zajfc;
            zajfa.mesh.position.set(zajfa.center.x, 0, zajfa.center.z);
        } else {
            zajfa.mesh = new Mesh(zajfc, this.material);
            zajfa.mesh.type = "TerrainClipmapLevel";
            zajfa.mesh.frustumCulled = true;
            zajfa.mesh.position.set(zajfa.center.x, 0, zajfa.center.z);
            this.add(zajfa.mesh);
        }
        zajfa.dirty = false;
        this.stats.rebuilds++;
        return zajfa.mesh;
    }
    setSampler(zajfb) {
        this.sampler = zajfa(zajfb);
        for (var zajfc = 0; zajfc < this.leveldata.length; zajfc++) this.leveldata[zajfc].dirty = true;
        return this;
    }
    levelInfo(zajfa) {
        var zajfb = this.leveldata[zajfa];
        if (!zajfb) return null;
        return {
            level: zajfa,
            spacing: zajfb.spacing,
            half: zajfb.half,
            holeHalf: zajfb.holeHalf,
            center: zajfb.center ? {
                x: zajfb.center.x,
                z: zajfb.center.z
            } : null,
            vertices: zajfb.mesh ? zajfb.mesh.geometry.attributes.position.array.length / 3 : 0,
            triangles: zajfb.mesh ? zajfb.mesh.geometry.index.length / 3 : 0,
            dirty: zajfb.dirty
        };
    }
    covers(zajfa, zajfb) {
        for (var zajfc = 0; zajfc < this.leveldata.length; zajfc++) {
            var zajfd = this.leveldata[zajfc];
            if (!zajfd.center) continue;
            var zajfe = Math.abs(zajfa - zajfd.center.x), zajff = Math.abs(zajfb - zajfd.center.z);
            if (zajfe <= zajfd.half && zajff <= zajfd.half && (zajfd.holeHalf === 0 || zajfe >= zajfd.holeHalf || zajff >= zajfd.holeHalf)) return true;
        }
        return false;
    }
    dispose() {
        for (var zajfa = 0; zajfa < this.leveldata.length; zajfa++) {
            var zajfb = this.leveldata[zajfa];
            if (zajfb.mesh) {
                zajfb.mesh.geometry.dispose();
                this.remove(zajfb.mesh);
                zajfb.mesh = null;
            }
            zajfb.center = null;
            zajfb.dirty = true;
        }
        return this;
    }
}

export { TerrainClipmap };
