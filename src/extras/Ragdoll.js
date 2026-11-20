import { Matrix4, Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

import { DistanceConstraint } from "./DistanceConstraint.js";

import { RigidBody } from "./RigidBody.js";

class Ragdoll {
    constructor(zaina, zainb) {
        zainb = zainb || {};
        this.world = zainb.world || null;
        this.bodies = [];
        this.constraints = [];
        this.bindings = [];
        this.skeleton = zainb.skeleton || null;
        this.blendWeight = faoxomclamp(faoxomvalue(zainb.blendWeight, 1), 0, 1);
        this.mode = zainb.mode || "physical";
        zaina = zaina || [];
        for (var zainc = 0; zainc < zaina.length; zainc++) {
            var zaind = zaina[zainc] || {};
            var zaine = zaind.body || new RigidBody(zaind);
            zaine.userData.ragdollPart = zaind.name || zainc;
            this.bodies.push(zaine);
            if (zaind.bone || zaind.boneName || zaind.boneIndex !== undefined) this.bindings.push({
                body: zaine,
                bone: zaind.bone || zaind.boneName || zaind.boneIndex,
                offset: zaind.offset || new Matrix4
            });
            if (this.world) this.world.addBody(zaine);
        }
        for (var zainf = 0; zainf < zaina.length; zainf++) {
            var zaing = zaina[zainf] && zaina[zainf].joint;
            if (!zaing || !this.bodies[zainf]) continue;
            var zainh = this.bodies[zaing.bodyIndex];
            if (!zainh) continue;
            var zaini = new DistanceConstraint(this.bodies[zainf], zainh, zaing.distance, zaing);
            this.constraints.push(zaini);
            if (this.world) this.world.addConstraint(zaini);
        }
        if (this.world) this.world.addRagdoll(this);
        if (this.skeleton) this.bindSkeleton(this.skeleton, zainb.mappings);
    }
    bindSkeleton(zaina, zainb) {
        this.skeleton = zaina;
        var zainc = zainb || {};
        for (var zaind = 0; zaind < this.bindings.length; zaind++) {
            var zaine = this.bindings[zaind];
            if (!zaine) continue;
            var zainf = zaine.bone;
            var zaing = typeof zainf === "number" ? zaina.bones[zainf] : typeof zainf === "string" ? zaina.getBoneByName(zainf) : zainf;
            if (!zaing && typeof zainf === "string") zaing = zainc[zainf] ? typeof zainc[zainf] === "number" ? zaina.bones[zainc[zainf]] : zaina.getBoneByName(zainc[zainf]) : undefined;
            zaine.bone = zaing || null;
        }
        return this;
    }
    addBinding(zaina, zainb, zainc) {
        this.bindings.push({
            body: zaina,
            bone: zainb,
            offset: zainc || new Matrix4
        });
        return this;
    }
    setBlendWeight(zaina) {
        this.blendWeight = faoxomclamp(zaina, 0, 1);
        this.mode = this.blendWeight >= .999 ? "physical" : this.mode;
        return this;
    }
    setPhysical(zaina) {
        this.mode = zaina ? "physical" : "animated";
        this.blendWeight = zaina ? 1 : 0;
        return this;
    }
    setAnimated(zaina) {
        return this.setPhysical(!zaina);
    }
    preStep() {
        if (this.mode === "physical" && this.blendWeight >= .999) return;
        for (var zaina = 0; zaina < this.bindings.length; zaina++) {
            var zainb = this.bindings[zaina];
            if (!zainb.bone || !zainb.body) continue;
            zainb.bone.updateMatrixWorld(true);
            var zainc = (new Vector3).setFromMatrixPosition(zainb.bone.matrixWorld);
            var zaind = new Quaternion;
            zainb.bone.matrixWorld.decompose(new Vector3, zaind, new Vector3);
            var zaine = 1 - this.blendWeight;
            zainb.body.position.lerp(zainc, zaine);
            zainb.body.rotation.slerp(zaind, zaine);
            if (zaine > .5) zainb.body.velocity.multiplyScalar(this.blendWeight);
            zainb.body.wake();
        }
    }
    postStep() {
        if (this.mode === "animated" || this.blendWeight <= 0) return;
        for (var zaina = 0; zaina < this.bindings.length; zaina++) {
            var zainb = this.bindings[zaina];
            if (!zainb.bone || !zainb.body) continue;
            var zainc = (new Matrix4).compose(zainb.body.position, zainb.body.rotation, new Vector3(1, 1, 1));
            if (zainb.bone.parent) zainc.premultiply(zainb.bone.parent.matrixWorld.clone().invert());
            var zaind = new Vector3;
            var zaine = new Quaternion;
            var zainf = new Vector3;
            zainc.decompose(zaind, zaine, zainf);
            zainb.bone.position.lerp(zaind, this.blendWeight);
            zainb.bone.quaternion.slerp(zaine, this.blendWeight);
            zainb.bone.updateMatrixWorld(true);
        }
        if (this.skeleton) this.skeleton.update();
    }
    addBody(zaina) {
        this.bodies.push(zaina);
        if (this.world) this.world.addBody(zaina);
        return zaina;
    }
    destroy() {
        if (this.world) {
            for (var zaina = 0; zaina < this.bodies.length; zaina++) this.world.removeBody(this.bodies[zaina]);
            for (var zainb = 0; zainb < this.constraints.length; zainb++) this.world.removeConstraint(this.constraints[zainb]);
            this.world.removeRagdoll(this);
        }
        this.bindings = [];
    }
}

export { Ragdoll };
