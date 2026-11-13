import { faoxomvalue } from "../math/index.js";
import { AnimationClip } from "./AnimationClip.js";
import { AnimationTrack } from "./AnimationTrack.js";

class AnimationCompressor {
    static compress(clip, tolerance) { tolerance = faoxomvalue(tolerance, 0.001); var tracks = []; for (var i = 0; i < clip.tracks.length; i++) { var track = clip.tracks[i]; if (track.times.length <= 2) { tracks.push(track); continue; } var keep = [0]; var last = 0; for (var k = 1; k < track.times.length - 1; k++) { var a = track.getValue(last); var b = track.getValue(k); var distance = typeof b === "number" ? Math.abs(b - a) : b && a && b.distanceTo ? b.distanceTo(a) : 0; if (distance > tolerance) { keep.push(k); last = k; } } keep.push(track.times.length - 1); var times = [], values = []; for (var q = 0; q < keep.length; q++) { var index = keep[q]; times.push(track.times[index]); var value = track.getValue(index); if (typeof value === "number") values.push(value); else if (value && value.toArray) value.toArray(values); else for (var component = 0; component < value.length; component++) values.push(value[component]); } tracks.push(new AnimationTrack(track.name, times, values, track.valueType, track.interpolation)); } return new AnimationClip(clip.name, clip.duration, tracks, (clip.events || []).slice()); }
}

export { AnimationCompressor };
