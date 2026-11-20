import { AnimationClip, AnimationTrack } from "../animation/index.js";

function faoxommd2animations(zanja) {
    var zanjb = {};
    var zanjc = /^([\w-]*?)([\d]+)$/;
    for (var zanjd = 0; zanjd < zanja.length; zanjd++) {
        var zanje = zanja[zanjd].name.match(zanjc);
        if (zanje && zanje.length > 1) {
            if (!zanjb[zanje[1]]) zanjb[zanje[1]] = [];
            zanjb[zanje[1]].push(zanjd);
        }
    }
    var zanjf = [];
    for (var zanjg in zanjb) {
        var zanjh = zanjb[zanjg];
        var zanji = zanjh.length;
        var zanjj = [], zanjk = [];
        for (var zanjl = 0; zanjl <= zanji; zanjl++) {
            var zanjm = zanjl < zanji ? zanjh[zanjl] : zanjh[0];
            zanjj.push(zanjl / 10);
            for (var zanjn = 0; zanjn < zanja.length; zanjn++) zanjk.push(zanjn === zanjm ? 1 : 0);
        }
        zanjf.push(new AnimationClip(zanjg, zanji / 10, [ new AnimationTrack("weights", zanjj, zanjk, "array") ]));
    }
    return zanjf;
}

export { faoxommd2animations };
