import { Vector3, faoxomvalue } from "../math/index.js";

import { CollisionShape } from "./CollisionShape.js";

import { DistanceConstraint } from "./DistanceConstraint.js";

import { FixedConstraint } from "./FixedConstraint.js";

import { RigidBody } from "./RigidBody.js";

class SoftBody {
    constructor(zaiza) {
        zaiza = zaiza || {};
        this.world = zaiza.world || null;
        this.particles = [];
        this.constraints = [];
        this.damping = faoxomvalue(zaiza.damping, .02);
        this.stiffness = faoxomvalue(zaiza.stiffness, .8);
        this.gravity = zaiza.gravity || null;
        this.geometry = zaiza.geometry || null;
        this.positions = [];
        this.wind = zaiza.wind ? zaiza.wind.clone() : new Vector3;
        this.collisionRadius = faoxomvalue(zaiza.collisionRadius, .05);
    }
    addParticle(zaiza, zaizb) {
        var zaizc = zaizb === undefined ? 1 : zaizb;
        var zaizd = new RigidBody({
            mass: zaizc,
            position: zaiza,
            shape: new CollisionShape("sphere", {
                radius: this.collisionRadius,
                mass: zaizc
            }),
            linearDamping: this.damping,
            restitution: 0,
            friction: .7
        });
        this.particles.push(zaizd);
        if (this.world) this.world.addBody(zaizd);
        return zaizd;
    }
    connect(zaiza, zaizb, zaizc, zaizd) {
        var zaize = new DistanceConstraint(zaiza, zaizb, zaizc === undefined ? zaiza.position.distanceTo(zaizb.position) : zaizc, {
            stiffness: zaizd === undefined ? this.stiffness : zaizd
        });
        this.constraints.push(zaize);
        if (this.world) this.world.addConstraint(zaize);
        return zaize;
    }
    addAnchor(zaiza, zaizb, zaizc) {
        var zaizd = new FixedConstraint(zaiza, zaizb, {
            stiffness: 1
        });
        zaizd.offset = zaizc ? zaizc.clone() : (new Vector3).subVectors(zaiza.position, zaizb.position);
        this.constraints.push(zaizd);
        if (this.world) this.world.addConstraint(zaizd);
        return zaizd;
    }
    setWind(zaiza) {
        this.wind.copy(zaiza || new Vector3);
        return this;
    }
    preStep(zaiza) {
        if (!this.wind.lengthSq()) return;
        for (var zaizb = 0; zaizb < this.particles.length; zaizb++) this.particles[zaizb].applyForce(this.wind, this.particles[zaizb].position);
    }
    updateGeometry() {
        if (!this.geometry || !this.geometry.attributes.position) return;
        var zaiza = this.geometry.attributes.position.array;
        for (var zaizb = 0; zaizb < this.particles.length && zaizb * 3 + 2 < zaiza.length; zaizb++) {
            zaiza[zaizb * 3] = this.particles[zaizb].position.x;
            zaiza[zaizb * 3 + 1] = this.particles[zaizb].position.y;
            zaiza[zaizb * 3 + 2] = this.particles[zaizb].position.z;
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.position.version = (this.geometry.attributes.position.version || 0) + 1;
        this.geometry.computeVertexNormals();
    }
    destroy() {
        if (this.world) {
            for (var zaiza = 0; zaiza < this.particles.length; zaiza++) this.world.removeBody(this.particles[zaiza]);
            for (var zaizb = 0; zaizb < this.constraints.length; zaizb++) this.world.removeConstraint(this.constraints[zaizb]);
            this.world.removeSoftBody(this);
        }
    }
}

export { SoftBody };
