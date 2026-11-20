import { Vector3, faoxomvalue } from "../math/index.js";

import { AnimationClip } from "./AnimationClip.js";

import { AnimationTrack } from "./AnimationTrack.js";

var zabga = [ [ "hips", "pelvis", "root" ], [ "spine", "spine01" ], [ "head", "neck01" ], [ "leftarm", "upperarml" ], [ "rightarm", "upperarmr" ], [ "leftforearm", "lowerarml" ], [ "rightforearm", "lowerarmr" ], [ "lefthand", "handl" ], [ "righthand", "handr" ], [ "leftupleg", "thighl" ], [ "rightupleg", "thighr" ], [ "leftleg", "calfl" ], [ "rightleg", "calfr" ], [ "leftfoot", "footl" ], [ "rightfoot", "footr" ] ];

function zabgb(zabga) {
    return String(zabga || "").toLowerCase().replace(/[\s_\-.:]+/g, "");
}

function zabgc(zabgb) {
    for (var zabgc = 0; zabgc < zabga.length; zabgc++) if (zabga[zabgc].indexOf(zabgb) >= 0) return zabgc;
    return -1;
}

function zabgd(zabga) {
    var zabgb = {};
    zabga.traverse(function(zabgc) {
        if (!zabgc.name || !zabgc.position) return;
        if (!zabgc.parent || zabgc.parent === zabga) return;
        zabgb[zabgc.name] = zabgc.position.length() || 0;
    });
    return zabgb;
}

class SkeletonRetargeter {
    constructor(zabga, zabgb, zabgc) {
        zabgc = zabgc || {};
        if (!zabga || !zabgb) throw new Error("SkeletonRetargeter requires source and target roots");
        this.sourceRoot = zabga;
        this.targetRoot = zabgb;
        this.positionScale = faoxomvalue(zabgc.positionScale, 1);
        this.aliases = {};
        if (zabgc.aliases) for (var zabgd in zabgc.aliases) this.aliases[zabgd] = zabgc.aliases[zabgd];
        this.preserveRootScale = zabgc.preserveRootScale !== false;
        this._mapping = null;
        this._ratios = null;
        this._build();
    }
    _build() {
        var zabga = [], zabge = [];
        this.sourceRoot.traverse(function(zabgb) {
            if (zabgb.name) zabga.push(zabgb.name);
        });
        this.targetRoot.traverse(function(zabga) {
            if (zabga.name) zabge.push(zabga.name);
        });
        var zabgf = {}, zabgg = {};
        for (var zabgh = 0; zabgh < zabge.length; zabgh++) {
            var zabgi = zabgb(zabge[zabgh]);
            if (zabgf[zabgi] === undefined) zabgf[zabgi] = zabge[zabgh];
            var zabgj = zabgc(zabgi);
            if (zabgj >= 0 && zabgg[zabgj] === undefined) zabgg[zabgj] = zabge[zabgh];
        }
        var zabgk = {}, zabgl = [], zabgm = [];
        for (var zabgn = 0; zabgn < zabga.length; zabgn++) {
            var zabgo = zabga[zabgn], zabgp = this.aliases[zabgo], zabgq = null;
            if (zabgp) {
                zabgq = zabge.indexOf(zabgp) >= 0 ? zabgp : zabgf[zabgb(zabgp)] || null;
            }
            if (!zabgq) zabgq = zabgf[zabgb(zabgo)] || null;
            if (!zabgq) {
                var zabgr = zabgc(zabgb(zabgo));
                if (zabgr >= 0) zabgq = zabgg[zabgr] || null;
            }
            if (zabgq) {
                zabgk[zabgo] = zabgq;
                zabgl.push(zabgo);
            } else zabgm.push(zabgo);
        }
        var zabgs = zabgd(this.sourceRoot);
        var zabgt = zabgd(this.targetRoot);
        var zabgu = {};
        for (var zabgv = 0; zabgv < zabgl.length; zabgv++) {
            var zabgw = zabgl[zabgv];
            var zabgx = zabgs[zabgw], zabgy = zabgt[zabgk[zabgw]];
            zabgu[zabgw] = zabgx && zabgx > 1e-6 && zabgy !== undefined ? zabgy / zabgx : this.positionScale;
        }
        this._mapping = zabgk;
        this._ratios = zabgu;
        this._matched = zabgl;
        this._unmatched = zabgm;
        this._targetNames = zabge;
        return this;
    }
    rebuild() {
        return this._build();
    }
    mapBoneName(zabga) {
        return this._mapping[zabga] || null;
    }
    ratioFor(zabga) {
        return this._ratios[zabga] !== undefined ? this._ratios[zabga] : this.positionScale;
    }
    report() {
        return {
            matched: this._matched.slice(),
            unmatched: this._unmatched.slice(),
            targetBones: this._targetNames.slice(),
            ratios: function(zabga) {
                var zabgb = {};
                for (var zabgc in zabga) zabgb[zabgc] = zabga[zabgc];
                return zabgb;
            }(this._ratios)
        };
    }
    retarget(zabga, zabgb) {
        zabgb = zabgb || {};
        if (!zabga) throw new Error("retarget requires an AnimationClip");
        var zabgc = zabgb.name || zabga.name;
        var zabgd = [];
        for (var zabge = 0; zabge < zabga.tracks.length; zabge++) {
            var zabgf = zabga.tracks[zabge];
            var zabgg = zabgf.name.lastIndexOf(".");
            if (zabgg <= 0) {
                zabgd.push(zabgf);
                continue;
            }
            var zabgh = zabgf.name.slice(0, zabgg);
            var zabgi = zabgf.name.slice(zabgg + 1);
            var zabgj = this._mapping[zabgh];
            if (!zabgj) {
                zabgd.push(zabgf);
                continue;
            }
            var zabgk = zabgi === "position" || zabgi === "translation";
            var zabgl = zabgk ? this.preserveRootScale && this._isRoot(zabgh, zabgj) ? this.positionScale : this._ratios[zabgh] !== undefined ? this._ratios[zabgh] : this.positionScale : 1;
            var zabgm = zabgf.values;
            var zabgn = zabgm;
            if (zabgl !== 1) {
                zabgn = new Array(zabgm.length);
                for (var zabgo = 0; zabgo < zabgm.length; zabgo++) zabgn[zabgo] = zabgm[zabgo] * zabgl;
            }
            zabgd.push(new AnimationTrack(zabgj + "." + zabgi, Array.prototype.slice.call(zabgf.times), zabgn, zabgf.valueType, zabgf.interpolation));
        }
        return new AnimationClip(zabgc, zabga.duration, zabgd, (zabga.events || []).slice());
    }
    _isRoot(zabga, zabgb) {
        var zabgc = this.targetRoot.getObjectByName ? this.targetRoot.getObjectByName(zabgb) : null;
        return !!zabgc && (!zabgc.parent || zabgc.parent === this.targetRoot);
    }
}

export { SkeletonRetargeter };
