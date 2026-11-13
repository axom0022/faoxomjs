import { faoxomvalue } from "../math/index.js";
import { AnimationClip } from "./AnimationClip.js";
import { AnimationTrack } from "./AnimationTrack.js";

class AnimationRetargeter {
    constructor(mapping, options) { this.mapping = mapping || {}; options = options || {}; this.positionScale = faoxomvalue(options.positionScale, 1); this.preserveRoot = options.preserveRoot !== false; }
    retarget(clip, mapping, options) { mapping = mapping || this.mapping; options = options || {}; var scale = faoxomvalue(options.positionScale, this.positionScale); var tracks = []; for (var i = 0; i < clip.tracks.length; i++) { var source = clip.tracks[i]; var leaf = source.name.split(".")[0]; var targetName = mapping[source.name] || mapping[leaf] || source.name; var values = Array.prototype.slice.call(source.values); if (scale !== 1 && (source.valueType === "vector3" || source.valueType === "vector2") && (targetName.indexOf("position") !== -1 || targetName.indexOf("translation") !== -1)) for (var j = 0; j < values.length; j++) values[j] *= scale; tracks.push(new AnimationTrack(targetName, Array.prototype.slice.call(source.times), values, source.valueType, source.interpolation)); } return new AnimationClip(options.name || clip.name, clip.duration, tracks, (clip.events || []).slice()); }
}

export { AnimationRetargeter };
