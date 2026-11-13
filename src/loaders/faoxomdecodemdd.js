import { AnimationClip, AnimationTrack } from "../animation/index.js";
import { BufferAttribute } from "../core/index.js";

function faoxomdecodemdd(data) {
    var bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 8) throw new Error("Invalid MDD file");
    var totalFrames = view.getUint32(0, false);
    var totalPoints = view.getUint32(4, false);
    var offset = 8;
    if (totalFrames < 1 || totalPoints < 1 || bytes.length < 8 + totalFrames * 4 + totalFrames * totalPoints * 12) throw new Error("Invalid MDD file");
    var times = new Float32Array(totalFrames);
    for (var t = 0; t < totalFrames; t++) { times[t] = view.getFloat32(offset, false); offset += 4; }
    var morphTargets = [];
    for (var f = 0; f < totalFrames; f++) {
        var framePositions = new Float32Array(totalPoints * 3);
        for (var p = 0; p < totalPoints * 3; p++) { framePositions[p] = view.getFloat32(offset, false); offset += 4; }
        var attribute = new BufferAttribute(framePositions, 3);
        attribute.name = "morph_" + f;
        morphTargets.push(attribute);
    }
    var values = [];
    for (var vf = 0; vf < totalFrames; vf++) for (var vs = 0; vs < totalFrames; vs++) values.push(vs === vf ? 1 : 0);
    var clip = new AnimationClip("default", times[totalFrames - 1], [new AnimationTrack("weights", times, values, "array")]);
    return { morphTargets: morphTargets, clip: clip, times: times, totalPoints: totalPoints, totalFrames: totalFrames };
}

export { faoxomdecodemdd };
