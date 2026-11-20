import { faoxomvalue } from "../math/index.js";

import { AnimationClip } from "./AnimationClip.js";

import { AnimationTrack } from "./AnimationTrack.js";

class AnimationRetargeter {
    constructor(zaaza, zaazb) {
        this.mapping = zaaza || {};
        zaazb = zaazb || {};
        this.positionScale = faoxomvalue(zaazb.positionScale, 1);
        this.preserveRoot = zaazb.preserveRoot !== false;
    }
    retarget(zaaza, zaazb, zaazc) {
        zaazb = zaazb || this.mapping;
        zaazc = zaazc || {};
        var zaazd = faoxomvalue(zaazc.positionScale, this.positionScale);
        var zaaze = [];
        for (var zaazf = 0; zaazf < zaaza.tracks.length; zaazf++) {
            var zaazg = zaaza.tracks[zaazf];
            var zaazh = zaazg.name.split(".")[0];
            var zaazi = zaazb[zaazg.name] || zaazb[zaazh] || zaazg.name;
            var zaazj = Array.prototype.slice.call(zaazg.values);
            if (zaazd !== 1 && (zaazg.valueType === "vector3" || zaazg.valueType === "vector2") && (zaazi.indexOf("position") !== -1 || zaazi.indexOf("translation") !== -1)) for (var zaazk = 0; zaazk < zaazj.length; zaazk++) zaazj[zaazk] *= zaazd;
            zaaze.push(new AnimationTrack(zaazi, Array.prototype.slice.call(zaazg.times), zaazj, zaazg.valueType, zaazg.interpolation));
        }
        return new AnimationClip(zaazc.name || zaaza.name, zaaza.duration, zaaze, (zaaza.events || []).slice());
    }
}

export { AnimationRetargeter };
