import { faoxomvalue } from "../math/index.js";

import { AnimationClip } from "./AnimationClip.js";

import { AnimationTrack } from "./AnimationTrack.js";

class AnimationCompressor {
    static compress(zaaua, zaaub) {
        zaaub = faoxomvalue(zaaub, .001);
        var zaauc = [];
        for (var zaaud = 0; zaaud < zaaua.tracks.length; zaaud++) {
            var zaaue = zaaua.tracks[zaaud];
            if (zaaue.times.length <= 2) {
                zaauc.push(zaaue);
                continue;
            }
            var zaauf = [ 0 ];
            var zaaug = 0;
            for (var zaauh = 1; zaauh < zaaue.times.length - 1; zaauh++) {
                var zaaui = zaaue.getValue(zaaug);
                var zaauj = zaaue.getValue(zaauh);
                var zaauk = typeof zaauj === "number" ? Math.abs(zaauj - zaaui) : zaauj && zaaui && zaauj.distanceTo ? zaauj.distanceTo(zaaui) : 0;
                if (zaauk > zaaub) {
                    zaauf.push(zaauh);
                    zaaug = zaauh;
                }
            }
            zaauf.push(zaaue.times.length - 1);
            var zaaul = [], zaaum = [];
            for (var zaaun = 0; zaaun < zaauf.length; zaaun++) {
                var zaauo = zaauf[zaaun];
                zaaul.push(zaaue.times[zaauo]);
                var zaaup = zaaue.getValue(zaauo);
                if (typeof zaaup === "number") zaaum.push(zaaup); else if (zaaup && zaaup.toArray) zaaup.toArray(zaaum); else for (var zaauq = 0; zaauq < zaaup.length; zaauq++) zaaum.push(zaaup[zaauq]);
            }
            zaauc.push(new AnimationTrack(zaaue.name, zaaul, zaaum, zaaue.valueType, zaaue.interpolation));
        }
        return new AnimationClip(zaaua.name, zaaua.duration, zaauc, (zaaua.events || []).slice());
    }
}

export { AnimationCompressor };
