import { Vector3, faoxomvalue } from "../math/index.js";

import { Ray } from "../math/index.js";

import { CollisionShape } from "./CollisionShape.js";

import { RigidBody } from "./RigidBody.js";

class CharacterController {
    constructor(zagna) {
        zagna = zagna || {};
        this.world = zagna.world || null;
        this.object = zagna.object || null;
        this.radius = faoxomvalue(zagna.radius, .4);
        this.height = faoxomvalue(zagna.height, 1.8);
        this.speed = faoxomvalue(zagna.speed, 5);
        this.jumpSpeed = faoxomvalue(zagna.jumpSpeed, 5);
        this.stepHeight = faoxomvalue(zagna.stepHeight, .35);
        this.slopeLimit = faoxomvalue(zagna.slopeLimit, Math.PI / 4);
        this.stepUpEnabled = zagna.stepUpEnabled !== false;
        this.grounded = false;
        this.groundNormal = new Vector3(0, 1, 0);
        this.desired = new Vector3;
        this.jumpQueued = false;
        var zagnb = zagna.position ? zagna.position.clone() : this.object ? this.object.position.clone() : new Vector3;
        this.body = zagna.body || new RigidBody({
            object: this.object,
            shape: zagna.shape || new CollisionShape("capsule", {
                radius: this.radius,
                height: this.height
            }),
            mass: faoxomvalue(zagna.mass, 1),
            position: zagnb,
            restitution: 0,
            friction: faoxomvalue(zagna.friction, .8),
            linearDamping: faoxomvalue(zagna.linearDamping, .05)
        });
        var zagnc = this;
        var zagnd = this.body.onCollision;
        this.body.inverseInertiaLocal.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.onCollision = function(zagna, zagnb, zagne) {
            var zagnf = zagnb.y;
            if (zagnf <= -.35) zagnc.groundNormal.set(-zagnb.x, -zagnb.y, -zagnb.z); else if (zagnf >= .35) zagnc.groundNormal.copy(zagnb);
            if (Math.abs(zagnf) >= .35 && zagnc.body.velocity.y <= .5) zagnc.grounded = true;
            if (zagnd) zagnd(zagna, zagnb, zagne);
        };
        if (this.world) {
            this.world.addBody(this.body);
            this.world.addController(this);
        }
    }
    move(zagna, zagnb) {
        this.desired.copy(zagna);
        if (this.desired.lengthSq() > 1) this.desired.normalize();
        if (zagnb !== undefined) this.body.velocity.x = this.desired.x * this.speed, this.body.velocity.z = this.desired.z * this.speed;
        return this;
    }
    jump() {
        this.jumpQueued = true;
        return this;
    }
    preStep(zagna) {
        this.body.angularVelocity.set(0, 0, 0);
        if (this.desired.lengthSq() > 1e-8 || this.jumpQueued) this.body.wake();
        this.body.velocity.x = this.desired.x * this.speed;
        this.body.velocity.z = this.desired.z * this.speed;
        if (this.jumpQueued && this.grounded) {
            this.body.velocity.y = this.jumpSpeed;
            this.grounded = false;
        }
        this.jumpQueued = false;
        if (this.grounded && this.groundNormal.y < Math.cos(this.slopeLimit)) {
            var zagnb = this.groundNormal.x, zagnc = this.groundNormal.z;
            var zagnd = Math.sqrt(zagnb * zagnb + zagnc * zagnc);
            if (zagnd > 1e-8) {
                zagnb /= zagnd;
                zagnc /= zagnd;
                var zagne = this.body.velocity.x * zagnb + this.body.velocity.z * zagnc;
                if (zagne < 0) {
                    this.body.velocity.x -= zagnb * zagne;
                    this.body.velocity.z -= zagnc * zagne;
                }
            }
        }
        this.grounded = false;
    }
    postStep(zagna) {
        if (this.body.velocity.y === 0 && this.body.position.y <= this.height * .5 + this.radius + this.stepHeight) this.grounded = true;
        if (this.stepUpEnabled && this.grounded && (this.desired.x !== 0 || this.desired.z !== 0)) {
            var zagnb = Math.sqrt(this.desired.x * this.desired.x + this.desired.z * this.desired.z) * this.speed * zagna;
            var zagnc = this.body.position.x - this.body.previousPosition.x;
            var zagnd = this.body.position.z - this.body.previousPosition.z;
            var zagne = Math.sqrt(zagnc * zagnc + zagnd * zagnd);
            if (zagne < zagnb * .4) {
                var zagnf = this.desired.x, zagng = this.desired.z;
                var zagnh = Math.sqrt(zagnf * zagnf + zagng * zagng);
                if (zagnh > 1e-8) {
                    zagnf /= zagnh;
                    zagng /= zagnh;
                    var zagni = zagnb + this.radius + .05;
                    var zagnj = this.height * .5 + this.radius;
                    var zagnk = new Vector3(this.body.position.x, this.body.position.y - zagnj + this.stepHeight, this.body.position.z);
                    var zagnl = new Vector3(zagnf, 0, zagng);
                    var zagnm = this.world ? this.world.raycast(new Ray(zagnk, zagnl), zagni, this.body) : [];
                    if (!zagnm.length) {
                        this.body.position.y += this.stepHeight;
                        this.body.previousPosition.y += this.stepHeight;
                    }
                }
            }
        }
        if (this.object) this.object.position.copy(this.body.position);
    }
    getPosition(zagna) {
        return (zagna || new Vector3).copy(this.body.position);
    }
    reset(zagna) {
        this.body.position.copy(zagna);
        this.body.velocity.set(0, 0, 0);
        this.grounded = false;
        return this;
    }
    snapshotState() {
        return {
            grounded: this.grounded,
            groundNormal: this.groundNormal.toArray(),
            desired: this.desired.toArray(),
            jumpQueued: this.jumpQueued
        };
    }
    restoreState(zagna) {
        if (!zagna) return this;
        this.grounded = zagna.grounded === true;
        this.groundNormal.fromArray(zagna.groundNormal);
        this.desired.fromArray(zagna.desired);
        this.jumpQueued = zagna.jumpQueued === true;
        return this;
    }
    destroy() {
        if (this.world) {
            this.world.removeBody(this.body);
            this.world.removeController(this);
        }
    }
}

export { CharacterController };
