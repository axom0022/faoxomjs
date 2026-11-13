import { Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

function trackInfo(name) {
    var dot = name.lastIndexOf(".");
    if (dot <= 0) return null;
    var bone = name.slice(0, dot);
    var property = name.slice(dot + 1);
    if (property === "translation") property = "position";
    if (property === "rotation" || property === "orientation") property = "quaternion";
    if (property !== "position" && property !== "quaternion" && property !== "scale") return null;
    return { bone: bone, property: property };
}

function poseEntry() {
    return { position: new Vector3(), quaternion: new Quaternion(), scale: new Vector3(1, 1, 1) };
}

function blendInto(target, source, t) {
    if (t <= 0) return target;
    for (var key in source) {
        var entry = target[key];
        if (!entry) {
            target[key] = { position: source[key].position.clone(), quaternion: source[key].quaternion.clone(), scale: source[key].scale.clone() };
            if (t >= 1) continue;
            entry = target[key];
        }
        if (t >= 1) {
            entry.position.copy(source[key].position);
            entry.quaternion.copy(source[key].quaternion);
            entry.scale.copy(source[key].scale);
            continue;
        }
        entry.position.lerp(source[key].position, t);
        entry.quaternion.slerp(source[key].quaternion, t);
        entry.scale.lerp(source[key].scale, t);
    }
    return target;
}

class AnimationGraph {
    constructor(target, options) {
        options = options || {};
        if (!target) throw new Error("AnimationGraph requires a target object");
        this.target = target;
        this.parameters = {};
        this.nodes = {};
        this.root = null;
        this.ik = [];
        this.time = 0;
        this.rootBoneName = options.rootBone || null;
        this.removeRootMotion = options.removeRootMotion === true;
        this.rootMotion = new Vector3();
        this.rootMotionDelta = new Vector3();
        this.stats = { updates: 0, ikSolves: 0 };
        this._bones = null;
        this._prevRoot = new Vector3();
        this._rootSeen = false;
    }

    setParameter(name, value) { this.parameters[name] = value; return this; }
    getParameter(name) { return this.parameters[name]; }
    setParameters(map) { for (var key in map) this.parameters[key] = map[key]; return this; }

    _register(name, node) {
        if (!name || typeof name !== "string") throw new Error("AnimationGraph node requires a name");
        if (this.nodes[name]) throw new Error("AnimationGraph node '" + name + "' already exists");
        this.nodes[name] = node;
        node.name = name;
        return this;
    }

    _resolve(reference) {
        if (typeof reference === "string") {
            var node = this.nodes[reference];
            if (!node) throw new Error("AnimationGraph node '" + reference + "' does not exist");
            return node;
        }
        return reference;
    }

    clip(name, animClip, options) {
        options = options || {};
        if (!animClip) throw new Error("clip node '" + name + "' requires an AnimationClip");
        return this._register(name, {
            type: "clip", clip: animClip, time: faoxomvalue(options.startTime, 0),
            speed: faoxomvalue(options.speed, 1), loop: options.loop !== false,
            start: faoxomvalue(options.start, 0), end: faoxomvalue(options.end, animClip.duration || 0),
            playing: true, stopped: false
        });
    }

    blend1d(name, parameter, children, options) {
        options = options || {};
        if (!parameter) throw new Error("blend1d node '" + name + "' requires a parameter");
        if (!children || children.length < 2) throw new Error("blend1d node '" + name + "' requires at least two children");
        var resolved = children.map(function (child) { return { node: child.node, threshold: child.threshold }; });
        resolved.sort(function (a, b) { return a.threshold - b.threshold; });
        return this._register(name, { type: "blend1d", parameter: parameter, children: resolved, sync: options.sync === true, normalized: 0 });
    }

    blend2d(name, parameterX, parameterY, children) {
        if (!parameterX || !parameterY) throw new Error("blend2d node '" + name + "' requires two parameters");
        if (!children || children.length < 2) throw new Error("blend2d node '" + name + "' requires at least two children");
        return this._register(name, { type: "blend2d", parameterX: parameterX, parameterY: parameterY, children: children.map(function (child) { return { node: child.node, x: child.x, y: child.y }; }) });
    }

    additive(name, base, additiveClip, options) {
        options = options || {};
        return this._register(name, {
            type: "additive", base: base, additive: additiveClip,
            weight: faoxomvalue(options.weight, 1), parameter: options.parameter || null,
            referenceTime: faoxomvalue(options.referenceTime, 0)
        });
    }

    setRoot(node) { this.root = this._resolve(node); return this; }

    addIK(constraint) {
        if (!constraint || !constraint.type) throw new Error("addIK requires a constraint type");
        if (constraint.type === "twoBone") {
            if (!constraint.root || !constraint.middle || !constraint.end) throw new Error("twoBone IK requires root, middle and end bones");
            if (!constraint.target) throw new Error("twoBone IK requires a target");
            this.ik.push({
                type: "twoBone", root: constraint.root, middle: constraint.middle, end: constraint.end,
                target: constraint.target, pole: constraint.pole || null,
                weight: faoxomvalue(constraint.weight, 1)
            });
        } else if (constraint.type === "aim") {
            if (!constraint.bone) throw new Error("aim IK requires a bone");
            if (!constraint.target) throw new Error("aim IK requires a target");
            var axis = constraint.axis;
            if (typeof axis === "string") axis = axis.toLowerCase() === "x" ? new Vector3(1, 0, 0) : axis.toLowerCase() === "y" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
            this.ik.push({ type: "aim", bone: constraint.bone, axis: axis || new Vector3(0, 0, 1), target: constraint.target, weight: faoxomvalue(constraint.weight, 1) });
        } else throw new Error("unknown IK constraint type '" + constraint.type + "'");
        return this;
    }

    clearIK() { this.ik.length = 0; return this; }
    removeIK(index) { if (index >= 0 && index < this.ik.length) this.ik.splice(index, 1); return this; }

    refreshBones() { this._bones = null; return this; }

    bones() {
        if (this._bones) return this._bones;
        var map = {};
        this.target.traverse(function (object) { if (object.name && map[object.name] === undefined) map[object.name] = object; });
        this._bones = map;
        return map;
    }

    _sampleClip(node, time) {
        var pose = {};
        var tracks = node.clip.tracks;
        for (var i = 0; i < tracks.length; i++) {
            var info = trackInfo(tracks[i].name);
            if (!info) continue;
            var entry = pose[info.bone];
            if (!entry) {
                entry = pose[info.bone] = poseEntry();
                var restBone = this.bones()[info.bone];
                if (restBone) {
                    entry.position.copy(restBone.position);
                    entry.quaternion.copy(restBone.quaternion);
                    entry.scale.copy(restBone.scale);
                }
            }
            var value = tracks[i].sample(time);
            if (info.property === "position") entry.position.copy(value);
            else if (info.property === "quaternion") entry.quaternion.copy(value).normalize();
            else entry.scale.copy(value);
        }
        return pose;
    }

    _advanceClip(node, dt) {
        if (!node.playing || node.stopped || dt === 0) return;
        var span = node.end - node.start;
        if (span <= 0) { node.stopped = true; return; }
        node.time += dt * node.speed;
        if (node.time >= node.end) {
            if (node.loop) node.time = node.start + (node.time - node.start) % span;
            else { node.time = node.end; node.stopped = true; }
        }
        if (node.time < node.start) node.time = node.start;
    }

    _evalNode(node, dt) {
        if (!node) throw new Error("AnimationGraph evaluated a missing node");
        if (node.type === "clip") {
            this._advanceClip(node, dt);
            return this._sampleClip(node, node.time);
        }
        if (node.type === "blend1d") {
            var value = faoxomvalue(this.parameters[node.parameter], 0);
            var children = node.children;
            if (node.sync) {
                var firstChild = this._resolve(children[0].node);
                var span = firstChild.end - firstChild.start;
                if (span > 0) {
                    node.normalized += dt * (firstChild.speed || 1) / span;
                    node.normalized = node.normalized - Math.floor(node.normalized);
                }
                for (var s = 0; s < children.length; s++) {
                    var child = this._resolve(children[s].node);
                    var childSpan = child.end - child.start;
                    child.time = child.start + (childSpan > 0 ? node.normalized * childSpan : 0);
                }
                var sample = this._sampleClip(this._resolve(children[0].node), this._resolve(children[0].node).time);
                if (value <= children[0].threshold) return sample;
                if (value >= children[children.length - 1].threshold) return this._sampleClip(this._resolve(children[children.length - 1].node), this._resolve(children[children.length - 1].node).time);
                var idx = 0;
                while (idx < children.length - 2 && value > children[idx + 1].threshold) idx++;
                var u = (value - children[idx].threshold) / (children[idx + 1].threshold - children[idx].threshold || 1);
                var poseA = this._sampleClip(this._resolve(children[idx].node), this._resolve(children[idx].node).time);
                var poseB = this._sampleClip(this._resolve(children[idx + 1].node), this._resolve(children[idx + 1].node).time);
                return blendInto(poseA, poseB, faoxomclamp(u, 0, 1));
            }
            var first = this._evalNode(this._resolve(children[0].node), dt);
            if (value <= children[0].threshold) return first;
            var last = this._evalNode(this._resolve(children[children.length - 1].node), dt);
            if (value >= children[children.length - 1].threshold) return last;
            var i2 = 0;
            while (i2 < children.length - 2 && value > children[i2 + 1].threshold) i2++;
            var u2 = (value - children[i2].threshold) / (children[i2 + 1].threshold - children[i2].threshold || 1);
            var poseA2 = i2 === 0 ? first : this._evalNode(this._resolve(children[i2].node), dt);
            var poseB2 = i2 === children.length - 2 ? last : this._evalNode(this._resolve(children[i2 + 1].node), dt);
            return blendInto(poseA2, poseB2, faoxomclamp(u2, 0, 1));
        }
        if (node.type === "blend2d") {
            var px = faoxomvalue(this.parameters[node.parameterX], 0);
            var py = faoxomvalue(this.parameters[node.parameterY], 0);
            var total = 0;
            var weights = new Array(node.children.length);
            for (var c = 0; c < node.children.length; c++) {
                var dx = px - node.children[c].x, dy = py - node.children[c].y;
                var d2 = dx * dx + dy * dy;
                weights[c] = d2 <= 1e-12 ? 1e12 : 1 / (d2 + 1e-8);
                total += weights[c];
            }
            var pose2 = null;
            var consumed = 0;
            for (var c2 = 0; c2 < node.children.length; c2++) {
                var w = weights[c2] / total;
                if (w <= 0) continue;
                var childPose = this._evalNode(this._resolve(node.children[c2].node), dt);
                if (!pose2) {
                    pose2 = {};
                    for (var key in childPose) pose2[key] = { position: childPose[key].position.clone(), quaternion: childPose[key].quaternion.clone(), scale: childPose[key].scale.clone() };
                    consumed = w;
                    if (w >= 1) break;
                } else {
                    pose2 = blendInto(pose2, childPose, w / (consumed + w));
                    consumed += w;
                }
            }
            return pose2 || {};
        }
        if (node.type === "additive") {
            var basePose = this._evalNode(this._resolve(node.base), dt);
            var addNode = this._resolve(node.additive);
            var weight = node.parameter !== null ? faoxomvalue(this.parameters[node.parameter], 0) : node.weight;
            var savedTime = addNode.time, savedPlaying = addNode.playing;
            addNode.time = node.referenceTime;
            addNode.playing = false;
            var refPose = this._evalNode(addNode, 0);
            addNode.playing = savedPlaying;
            addNode.time = savedTime;
            var addPose = this._evalNode(addNode, dt);
            var out = {};
            for (var bkey in basePose) out[bkey] = { position: basePose[bkey].position.clone(), quaternion: basePose[bkey].quaternion.clone(), scale: basePose[bkey].scale.clone() };
            for (var akey in addPose) {
                var delta = addPose[akey], reference = refPose[akey];
                var target = out[akey];
                if (!target) {
                    target = out[akey] = poseEntry();
                    target.position.copy(this._restPosition(akey));
                }
                if (!reference) reference = poseEntry();
                target.position.addScaledVector(delta.position.clone().sub(reference.position), weight);
                target.scale.addScaledVector(delta.scale.clone().sub(reference.scale), weight);
                var dq = reference.quaternion.clone().invert().multiply(delta.quaternion).normalize();
                var blended = new Quaternion().slerp(dq, faoxomclamp(weight, 0, 1));
                target.quaternion.copy(target.quaternion.clone().multiply(blended).normalize());
            }
            return out;
        }
        throw new Error("unknown AnimationGraph node type '" + node.type + "'");
    }

    _restPosition(boneName) {
        var bone = this.bones()[boneName];
        return bone ? bone.position : new Vector3();
    }

    evaluate(dt) {
        if (!this.root) throw new Error("AnimationGraph has no root node (call setRoot)");
        return this._evalNode(this.root, dt === undefined ? 0 : dt);
    }

    _applyPose(pose) {
        var bones = this.bones();
        for (var name in pose) {
            var bone = bones[name];
            if (!bone) continue;
            bone.position.copy(pose[name].position);
            bone.quaternion.copy(pose[name].quaternion);
            bone.scale.copy(pose[name].scale);
        }
    }

    _applyWorldRotation(bone, worldDelta, weight) {
        bone.updateMatrixWorld(true);
        var position = new Vector3();
        var worldRotation = new Quaternion();
        var scale = new Vector3();
        bone.matrixWorld.decompose(position, worldRotation, scale);
        var partial = new Quaternion().slerp(worldDelta, faoxomclamp(weight, 0, 1));
        var nextWorld = partial.multiply(worldRotation);
        var localRotation = nextWorld;
        if (bone.parent) {
            var parentPosition = new Vector3();
            var parentRotation = new Quaternion();
            var parentScale = new Vector3();
            bone.parent.matrixWorld.decompose(parentPosition, parentRotation, parentScale);
            localRotation = parentRotation.clone().invert().multiply(nextWorld);
        }
        bone.quaternion.copy(localRotation).normalize();
        bone.updateMatrixWorld(true);
    }

    _worldPosition(bone, target) { return (target || new Vector3()).setFromMatrixPosition(bone.matrixWorld); }

    _solveTwoBone(c) {
        var bones = this.bones();
        var root = typeof c.root === "string" ? bones[c.root] : c.root;
        var middle = typeof c.middle === "string" ? bones[c.middle] : c.middle;
        var end = typeof c.end === "string" ? bones[c.end] : c.end;
        if (!root || !middle || !end) return;
        var target = c.target && c.target.x !== undefined ? c.target : null;
        if (!target) return;
        var rootPos = this._worldPosition(root);
        var midPos = this._worldPosition(middle);
        var endPos = this._worldPosition(end);
        var la = midPos.distanceTo(rootPos);
        var lb = endPos.distanceTo(midPos);
        if (la <= 1e-6 || lb <= 1e-6) return;
        var toTarget = new Vector3(target.x, target.y, target.z).sub(rootPos);
        var distance = toTarget.length();
        if (distance < 1e-6) return;
        var dir = toTarget.clone().divideScalar(distance);
        var d = faoxomclamp(distance, Math.abs(la - lb) + 1e-4, la + lb - 1e-4);
        var cosA = (la * la + d * d - lb * lb) / (2 * la * d);
        var angleA = Math.acos(faoxomclamp(cosA, -1, 1));
        var bend = new Vector3();
        if (c.pole && c.pole.x !== undefined) {
            var poleVec = new Vector3(c.pole.x, c.pole.y, c.pole.z).sub(rootPos);
            bend.copy(poleVec).addScaledVector(dir, -poleVec.dot(dir));
            if (bend.lengthSq() < 1e-10) bend.copy(midPos).sub(rootPos).addScaledVector(dir, -midPos.sub(rootPos).dot(dir));
        } else {
            var currentMid = midPos.clone().sub(rootPos);
            bend.copy(currentMid).addScaledVector(dir, -currentMid.dot(dir));
        }
        if (bend.lengthSq() < 1e-10) {
            bend.set(dir.y, dir.z, dir.x).addScaledVector(dir, -(dir.y * dir.x + dir.z * dir.y + dir.x * dir.z));
            if (bend.lengthSq() < 1e-10) return;
        }
        bend.normalize();
        var midDesired = dir.clone().multiplyScalar(Math.cos(angleA)).addScaledVector(bend, Math.sin(angleA)).multiplyScalar(la).add(rootPos);
        var endDesired = dir.clone().multiplyScalar(d).add(rootPos);
        var q1 = new Quaternion().setFromUnitVectors(midPos.clone().sub(rootPos).normalize(), midDesired.clone().sub(rootPos).normalize());
        this._applyWorldRotation(root, q1, c.weight);
        midPos = this._worldPosition(middle);
        endPos = this._worldPosition(end);
        var q2 = new Quaternion().setFromUnitVectors(endPos.clone().sub(midPos).normalize(), endDesired.clone().sub(midPos).normalize());
        this._applyWorldRotation(middle, q2, c.weight);
        this.stats.ikSolves++;
    }

    _solveAim(c) {
        var bones = this.bones();
        var bone = typeof c.bone === "string" ? bones[c.bone] : c.bone;
        if (!bone || !c.target || c.target.x === undefined) return;
        bone.updateMatrixWorld(true);
        var bonePos = this._worldPosition(bone);
        var worldRotation = new Quaternion();
        bone.matrixWorld.decompose(new Vector3(), worldRotation, new Vector3());
        var axis = (c.axis && c.axis.x !== undefined ? c.axis : new Vector3(0, 0, 1)).clone().normalize();
        var currentAxis = axis.clone().applyQuaternion(worldRotation).normalize();
        var desired = new Vector3(c.target.x, c.target.y, c.target.z).sub(bonePos);
        if (desired.lengthSq() < 1e-12) return;
        desired.normalize();
        var delta = new Quaternion().setFromUnitVectors(currentAxis, desired);
        this._applyWorldRotation(bone, delta, c.weight);
        this.stats.ikSolves++;
    }

    update(dt) {
        if (dt === undefined) dt = 0;
        var pose = this.root ? this.evaluate(dt) : {};
        this._applyPose(pose);
        this.target.updateMatrixWorld(true);
        if (this.ik.length) {
            for (var i = 0; i < this.ik.length; i++) {
                var c = this.ik[i];
                if (c.type === "twoBone") this._solveTwoBone(c);
                else if (c.type === "aim") this._solveAim(c);
            }
            this.target.updateMatrixWorld(true);
        }
        this._updateRootMotion();
        this.time += dt;
        this.stats.updates++;
        return this;
    }

    _updateRootMotion() {
        this.rootMotionDelta.set(0, 0, 0);
        if (!this.rootBoneName) return;
        var bone = this.bones()[this.rootBoneName];
        if (!bone) return;
        if (!this._rootSeen) { this._prevRoot.copy(bone.position); this._rootSeen = true; return; }
        this.rootMotionDelta.subVectors(bone.position, this._prevRoot);
        if (this.removeRootMotion) {
            bone.position.sub(this.rootMotionDelta);
            this.target.updateMatrixWorld(true);
            this._prevRoot.copy(bone.position);
        } else this._prevRoot.copy(bone.position);
        this.rootMotion.add(this.rootMotionDelta);
    }

    reset() {
        this.time = 0;
        this.rootMotion.set(0, 0, 0);
        this.rootMotionDelta.set(0, 0, 0);
        this._rootSeen = false;
        for (var name in this.nodes) {
            var node = this.nodes[name];
            if (node.type === "clip") { node.time = faoxomvalue(node.start, 0); node.stopped = false; }
            if (node.type === "blend1d") node.normalized = 0;
        }
        return this;
    }

    dispose() {
        this.nodes = {};
        this.parameters = {};
        this.ik = [];
        this.root = null;
        this._bones = null;
        return this;
    }
}

export { AnimationGraph };
