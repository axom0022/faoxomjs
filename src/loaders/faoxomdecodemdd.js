import { AnimationClip, AnimationTrack } from "../animation/index.js";

import { BufferAttribute } from "../core/index.js";

function faoxomdecodemdd(zanea) {
    var zaneb = zanea instanceof Uint8Array ? zanea : new Uint8Array(zanea);
    var zanec = new DataView(zaneb.buffer, zaneb.byteOffset, zaneb.byteLength);
    if (zaneb.length < 8) throw new Error("Invalid MDD file");
    var zaned = zanec.getUint32(0, false);
    var zanee = zanec.getUint32(4, false);
    var zanef = 8;
    if (zaned < 1 || zanee < 1 || zaneb.length < 8 + zaned * 4 + zaned * zanee * 12) throw new Error("Invalid MDD file");
    var zaneg = new Float32Array(zaned);
    for (var zaneh = 0; zaneh < zaned; zaneh++) {
        zaneg[zaneh] = zanec.getFloat32(zanef, false);
        zanef += 4;
    }
    var zanei = [];
    for (var zanej = 0; zanej < zaned; zanej++) {
        var zanek = new Float32Array(zanee * 3);
        for (var zanel = 0; zanel < zanee * 3; zanel++) {
            zanek[zanel] = zanec.getFloat32(zanef, false);
            zanef += 4;
        }
        var zanem = new BufferAttribute(zanek, 3);
        zanem.name = "morph_" + zanej;
        zanei.push(zanem);
    }
    var zanen = [];
    for (var zaneo = 0; zaneo < zaned; zaneo++) for (var zanep = 0; zanep < zaned; zanep++) zanen.push(zanep === zaneo ? 1 : 0);
    var zaneq = new AnimationClip("default", zaneg[zaned - 1], [ new AnimationTrack("weights", zaneg, zanen, "array") ]);
    return {
        morphTargets: zanei,
        clip: zaneq,
        times: zaneg,
        totalPoints: zanee,
        totalFrames: zaned
    };
}

export { faoxomdecodemdd };
