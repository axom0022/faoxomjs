import { Vector3, faoxomvalue } from "../math/index.js";
import { AnimationClip } from "./AnimationClip.js";
import { AnimationTrack } from "./AnimationTrack.js";

var SYNONYMS = [
    ["hips", "pelvis", "root"],
    ["spine", "spine01"],
    ["head", "neck01"],
    ["leftarm", "upperarml"],
    ["rightarm", "upperarmr"],
    ["leftforearm", "lowerarml"],
    ["rightforearm", "lowerarmr"],
    ["lefthand", "handl"],
    ["righthand", "handr"],
    ["leftupleg", "thighl"],
    ["rightupleg", "thighr"],
    ["leftleg", "calfl"],
    ["rightleg", "calfr"],
    ["leftfoot", "footl"],
    ["rightfoot", "footr"]
];

function normalizeName(name) {
    return String(name || "").toLowerCase().replace(/[\s_\-.:]+/g, "");
}

function synonymClass(normalized) {
    for (var i = 0; i < SYNONYMS.length; i++) if (SYNONYMS[i].indexOf(normalized) >= 0) return i;
    return -1;
}

function boneRestLengths(root) {
    var lengths = {};
    root.traverse(function (object) {
        if (!object.name || !object.position) return;
        if (!object.parent || object.parent === root) return;
        lengths[object.name] = object.position.length() || 0;
    });
    return lengths;
}

class SkeletonRetargeter {
    constructor(sourceRoot, targetRoot, options) {
        options = options || {};
        if (!sourceRoot || !targetRoot) throw new Error("SkeletonRetargeter requires source and target roots");
        this.sourceRoot = sourceRoot;
        this.targetRoot = targetRoot;
        this.positionScale = faoxomvalue(options.positionScale, 1);
        this.aliases = {};
        if (options.aliases) for (var key in options.aliases) this.aliases[key] = options.aliases[key];
        this.preserveRootScale = options.preserveRootScale !== false;
        this._mapping = null;
        this._ratios = null;
        this._build();
    }

    _build() {
        var sourceNames = [], targetNames = [];
        this.sourceRoot.traverse(function (object) { if (object.name) sourceNames.push(object.name); });
        this.targetRoot.traverse(function (object) { if (object.name) targetNames.push(object.name); });
        var targetByNormal = {}, targetByClass = {};
        for (var i = 0; i < targetNames.length; i++) {
            var normalized = normalizeName(targetNames[i]);
            if (targetByNormal[normalized] === undefined) targetByNormal[normalized] = targetNames[i];
            var cls = synonymClass(normalized);
            if (cls >= 0 && targetByClass[cls] === undefined) targetByClass[cls] = targetNames[i];
        }
        var mapping = {}, matched = [], unmatched = [];
        for (var s = 0; s < sourceNames.length; s++) {
            var source = sourceNames[s], alias = this.aliases[source], target = null;
            if (alias) {
                target = targetNames.indexOf(alias) >= 0 ? alias : targetByNormal[normalizeName(alias)] || null;
            }
            if (!target) target = targetByNormal[normalizeName(source)] || null;
            if (!target) {
                var cls2 = synonymClass(normalizeName(source));
                if (cls2 >= 0) target = targetByClass[cls2] || null;
            }
            if (target) { mapping[source] = target; matched.push(source); }
            else unmatched.push(source);
        }
        var sourceLengths = boneRestLengths(this.sourceRoot);
        var targetLengths = boneRestLengths(this.targetRoot);
        var ratios = {};
        for (var m = 0; m < matched.length; m++) {
            var name = matched[m];
            var from = sourceLengths[name], to = targetLengths[mapping[name]];
            ratios[name] = from && from > 1e-6 && to !== undefined ? to / from : this.positionScale;
        }
        this._mapping = mapping;
        this._ratios = ratios;
        this._matched = matched;
        this._unmatched = unmatched;
        this._targetNames = targetNames;
        return this;
    }

    rebuild() { return this._build(); }

    mapBoneName(name) { return this._mapping[name] || null; }
    ratioFor(name) { return this._ratios[name] !== undefined ? this._ratios[name] : this.positionScale; }

    report() {
        return {
            matched: this._matched.slice(),
            unmatched: this._unmatched.slice(),
            targetBones: this._targetNames.slice(),
            ratios: (function (ratios) { var copy = {}; for (var key in ratios) copy[key] = ratios[key]; return copy; })(this._ratios)
        };
    }

    retarget(clip, options) {
        options = options || {};
        if (!clip) throw new Error("retarget requires an AnimationClip");
        var nameOverride = options.name || clip.name;
        var tracks = [];
        for (var i = 0; i < clip.tracks.length; i++) {
            var source = clip.tracks[i];
            var dot = source.name.lastIndexOf(".");
            if (dot <= 0) { tracks.push(source); continue; }
            var bone = source.name.slice(0, dot);
            var property = source.name.slice(dot + 1);
            var targetBone = this._mapping[bone];
            if (!targetBone) {
                tracks.push(source);
                continue;
            }
            var isPosition = property === "position" || property === "translation";
            var scale = isPosition ? (this.preserveRootScale && this._isRoot(bone, targetBone) ? this.positionScale : this._ratios[bone] !== undefined ? this._ratios[bone] : this.positionScale) : 1;
            var values = source.values;
            var outValues = values;
            if (scale !== 1) {
                outValues = new Array(values.length);
                for (var v = 0; v < values.length; v++) outValues[v] = values[v] * scale;
            }
            tracks.push(new AnimationTrack(targetBone + "." + property, Array.prototype.slice.call(source.times), outValues, source.valueType, source.interpolation));
        }
        return new AnimationClip(nameOverride, clip.duration, tracks, (clip.events || []).slice());
    }

    _isRoot(sourceBone, targetBone) {
        var target = this.targetRoot.getObjectByName ? this.targetRoot.getObjectByName(targetBone) : null;
        return !!target && (!target.parent || target.parent === this.targetRoot);
    }
}

export { SkeletonRetargeter };
