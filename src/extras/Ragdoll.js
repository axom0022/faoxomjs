import { Matrix4, Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";
import { DistanceConstraint } from "./DistanceConstraint.js";
import { RigidBody } from "./RigidBody.js";

class Ragdoll {
    constructor(definition, options) {
        options = options || {};
        this.world = options.world || null;
        this.bodies = [];
        this.constraints = [];
        this.bindings = [];
        this.skeleton = options.skeleton || null;
        this.blendWeight = faoxomclamp(faoxomvalue(options.blendWeight, 1), 0, 1);
        this.mode = options.mode || "physical";
        definition = definition || [];
        for (var i = 0; i < definition.length; i++) {
            var part = definition[i] || {};
            var body = part.body || new RigidBody(part);
            body.userData.ragdollPart = part.name || i;
            this.bodies.push(body);
            if (part.bone || part.boneName || part.boneIndex !== undefined) this.bindings.push({ body: body, bone: part.bone || part.boneName || part.boneIndex, offset: part.offset || new Matrix4() });
            if (this.world) this.world.addBody(body);
        }
        for (var j = 0; j < definition.length; j++) {
            var joint = definition[j] && definition[j].joint;
            if (!joint || !this.bodies[j]) continue;
            var other = this.bodies[joint.bodyIndex];
            if (!other) continue;
            var constraint = new DistanceConstraint(this.bodies[j], other, joint.distance, joint);
            this.constraints.push(constraint);
            if (this.world) this.world.addConstraint(constraint);
        }
        if (this.world) this.world.addRagdoll(this);
        if (this.skeleton) this.bindSkeleton(this.skeleton, options.mappings);
    }
    bindSkeleton(skeleton, mappings) {
        this.skeleton = skeleton;
        var map = mappings || {};
        for (var i = 0; i < this.bindings.length; i++) {
            var binding = this.bindings[i];
            if (!binding) continue;
            var key = binding.bone;
            var bone = typeof key === "number" ? skeleton.bones[key] : typeof key === "string" ? skeleton.getBoneByName(key) : key;
            if (!bone && typeof key === "string") bone = map[key] ? (typeof map[key] === "number" ? skeleton.bones[map[key]] : skeleton.getBoneByName(map[key])) : undefined;
            binding.bone = bone || null;
        }
        return this;
    }
    addBinding(body, bone, offset) { this.bindings.push({ body: body, bone: bone, offset: offset || new Matrix4() }); return this; }
    setBlendWeight(weight) { this.blendWeight = faoxomclamp(weight, 0, 1); this.mode = this.blendWeight >= 0.999 ? "physical" : this.mode; return this; }
    setPhysical(active) { this.mode = active ? "physical" : "animated"; this.blendWeight = active ? 1 : 0; return this; }
    setAnimated(active) { return this.setPhysical(!active); }
    preStep() {
        if (this.mode === "physical" && this.blendWeight >= 0.999) return;
        for (var i = 0; i < this.bindings.length; i++) {
            var binding = this.bindings[i];
            if (!binding.bone || !binding.body) continue;
            binding.bone.updateMatrixWorld(true);
            var targetPosition = new Vector3().setFromMatrixPosition(binding.bone.matrixWorld);
            var targetRotation = new Quaternion();
            binding.bone.matrixWorld.decompose(new Vector3(), targetRotation, new Vector3());
            var drive = 1 - this.blendWeight;
            binding.body.position.lerp(targetPosition, drive);
            binding.body.rotation.slerp(targetRotation, drive);
            if (drive > 0.5) binding.body.velocity.multiplyScalar(this.blendWeight);
            binding.body.wake();
        }
    }
    postStep() {
        if (this.mode === "animated" || this.blendWeight <= 0) return;
        for (var i = 0; i < this.bindings.length; i++) {
            var binding = this.bindings[i];
            if (!binding.bone || !binding.body) continue;
            var world = new Matrix4().compose(binding.body.position, binding.body.rotation, new Vector3(1, 1, 1));
            if (binding.bone.parent) world.premultiply(binding.bone.parent.matrixWorld.clone().invert());
            var localPosition = new Vector3();
            var localRotation = new Quaternion();
            var localScale = new Vector3();
            world.decompose(localPosition, localRotation, localScale);
            binding.bone.position.lerp(localPosition, this.blendWeight);
            binding.bone.quaternion.slerp(localRotation, this.blendWeight);
            binding.bone.updateMatrixWorld(true);
        }
        if (this.skeleton) this.skeleton.update();
    }
    addBody(body) { this.bodies.push(body); if (this.world) this.world.addBody(body); return body; }
    destroy() { if (this.world) { for (var i = 0; i < this.bodies.length; i++) this.world.removeBody(this.bodies[i]); for (var j = 0; j < this.constraints.length; j++) this.world.removeConstraint(this.constraints[j]); this.world.removeRagdoll(this); } this.bindings = []; }
}

export { Ragdoll };
