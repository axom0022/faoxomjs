import { AnimationClip, AnimationTrack } from "../animation/index.js";

function faoxommd2animations(frames) {
    var groups = {};
    var pattern = /^([\w-]*?)([\d]+)$/;
    for (var i = 0; i < frames.length; i++) {
        var match = frames[i].name.match(pattern);
        if (match && match.length > 1) { if (!groups[match[1]]) groups[match[1]] = []; groups[match[1]].push(i); }
    }
    var clips = [];
    for (var name in groups) {
        var frameIndices = groups[name];
        var count = frameIndices.length;
        var times = [], values = [];
        for (var step = 0; step <= count; step++) {
            var frameIndex = step < count ? frameIndices[step] : frameIndices[0];
            times.push(step / 10);
            for (var slot = 0; slot < frames.length; slot++) values.push(slot === frameIndex ? 1 : 0);
        }
        clips.push(new AnimationClip(name, count / 10, [new AnimationTrack("weights", times, values, "array")]));
    }
    return clips;
}

export { faoxommd2animations };
