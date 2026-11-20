import { faoxomidnext, faoxominverseinertia } from "../core/index.js";

import { Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

import { CollisionShape } from "./CollisionShape.js";

class RigidBody {
    static shapeFromObject(zaita) {
        if (!zaita || !zaita.geometry || !zaita.geometry.attributes || !zaita.geometry.attributes.position) return null;
        var zaitb = zaita.geometry;
        if (!zaitb.boundingBox) {
            if (zaitb.computeBoundingBox) zaitb.computeBoundingBox(); else return null;
        }
        if (!zaitb.boundingBox || !isFinite(zaitb.boundingBox.min.x) || !isFinite(zaitb.boundingBox.max.x)) return null;
        var zaitc = zaitb.boundingBox.min, zaitd = zaitb.boundingBox.max;
        var zaite = zaita.scale ? Math.abs(zaita.scale.x) || 1 : 1;
        var zaitf = zaita.scale ? Math.abs(zaita.scale.y) || 1 : 1;
        var zaitg = zaita.scale ? Math.abs(zaita.scale.z) || 1 : 1;
        var zaith = (zaitd.x - zaitc.x) * zaite, zaiti = (zaitd.y - zaitc.y) * zaitf, zaitj = (zaitd.z - zaitc.z) * zaitg;
        if (!isFinite(zaith) || !isFinite(zaiti) || !isFinite(zaitj) || zaith <= 0 || zaiti <= 0 || zaitj <= 0) return null;
        return new CollisionShape("box", {
            width: zaith,
            height: zaiti,
            depth: zaitj
        });
    }
    constructor(zaita) {
        zaita = zaita || {};
        this.id = faoxomidnext();
        this.object = zaita.object || null;
        this.shape = zaita.shape || RigidBody.shapeFromObject(zaita.object) || new CollisionShape("box");
        this.mass = faoxomvalue(zaita.mass, 1);
        this.inverseMass = this.mass > 0 ? 1 / this.mass : 0;
        this.position = zaita.position ? zaita.position.clone() : this.object ? this.object.position.clone() : new Vector3;
        this.rotation = zaita.rotation ? zaita.rotation.clone() : this.object ? this.object.quaternion.clone() : new Quaternion;
        this.velocity = zaita.velocity ? zaita.velocity.clone() : new Vector3;
        this.angularVelocity = zaita.angularVelocity ? zaita.angularVelocity.clone() : new Vector3;
        this.force = new Vector3;
        this.torque = new Vector3;
        this.restitution = faoxomclamp(faoxomvalue(zaita.restitution, .2), 0, 1);
        this.friction = Math.max(0, faoxomvalue(zaita.friction, .5));
        this.linearDamping = Math.max(0, faoxomvalue(zaita.linearDamping, .01));
        this.angularDamping = Math.max(0, faoxomvalue(zaita.angularDamping, .01));
        this.isStatic = !!zaita.isStatic || this.mass === 0;
        this.inertia = zaita.inertia ? zaita.inertia.clone() : this.shape.inertia.clone();
        this.inverseInertiaLocal = new Vector3(this.inertia.x > 0 ? 1 / this.inertia.x : 0, this.inertia.y > 0 ? 1 / this.inertia.y : 0, this.inertia.z > 0 ? 1 / this.inertia.z : 0);
        this.previousPosition = this.position.clone();
        this.previousRotation = this.rotation.clone();
        this.ccd = !!zaita.ccd || !!zaita.continuous;
        this.ccdMotionThreshold = faoxomvalue(zaita.ccdMotionThreshold, .5);
        this.sleeping = false;
        this.sleepTime = 0;
        this.sleepThreshold = faoxomvalue(zaita.sleepThreshold, .03);
        this.onCollision = null;
        this.userData = zaita.userData || {};
        this.syncObject();
    }
    wake() {
        this.sleeping = false;
        this.sleepTime = 0;
        return this;
    }
    sleep() {
        this.sleeping = true;
        this.velocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        return this;
    }
    applyForce(zaita, zaitb) {
        if (this.isStatic) return this;
        this.wake();
        this.force.add(zaita);
        if (zaitb) this.torque.add((new Vector3).crossVectors((new Vector3).subVectors(zaitb, this.position), zaita));
        return this;
    }
    applyTorque(zaita) {
        if (!this.isStatic) {
            this.wake();
            this.torque.add(zaita);
        }
        return this;
    }
    applyImpulse(zaita, zaitb, zaitc) {
        if (this.isStatic) return this;
        if (zaitc !== false) this.wake();
        this.velocity.addScaledVector(zaita, this.inverseMass);
        if (zaitb) {
            var zaitd = (new Vector3).subVectors(zaitb, this.position);
            this.angularVelocity.add(faoxominverseinertia(this, (new Vector3).crossVectors(zaitd, zaita)));
        }
        return this;
    }
    getVelocityAtPoint(zaita, zaitb) {
        var zaitc = (new Vector3).subVectors(zaita, this.position);
        return (zaitb || new Vector3).copy(this.velocity).add((new Vector3).crossVectors(this.angularVelocity, zaitc));
    }
    integrate(zaita, zaitb) {
        if (this.isStatic || this.sleeping) return;
        this.previousPosition.copy(this.position);
        this.previousRotation.copy(this.rotation);
        this.velocity.addScaledVector(zaitb, zaita);
        this.velocity.addScaledVector(this.force, this.inverseMass * zaita);
        this.velocity.multiplyScalar(Math.max(0, 1 - this.linearDamping * zaita));
        this.angularVelocity.addScaledVector(faoxominverseinertia(this, this.torque), zaita);
        this.angularVelocity.multiplyScalar(Math.max(0, 1 - this.angularDamping * zaita));
        this.position.addScaledVector(this.velocity, zaita);
        var zaitc = new Quaternion(this.angularVelocity.x * zaita * .5, this.angularVelocity.y * zaita * .5, this.angularVelocity.z * zaita * .5, 1);
        this.rotation.multiplyQuaternions(zaitc, this.rotation).normalize();
        this.force.set(0, 0, 0);
        this.torque.set(0, 0, 0);
        this.syncObject();
    }
    syncObject() {
        if (this.object) {
            this.object.position.copy(this.position);
            this.object.quaternion.copy(this.rotation);
        }
    }
}

export { RigidBody };
