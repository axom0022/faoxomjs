import { Vector3, faoxomvalue } from "../math/index.js";
import { Ray } from "../math/index.js";
import { CollisionShape } from "./CollisionShape.js";
import { RigidBody } from "./RigidBody.js";

class CharacterController {
    constructor(options) {
        options = options || {};
        this.world = options.world || null;
        this.object = options.object || null;
        this.radius = faoxomvalue(options.radius, 0.4);
        this.height = faoxomvalue(options.height, 1.8);
        this.speed = faoxomvalue(options.speed, 5);
        this.jumpSpeed = faoxomvalue(options.jumpSpeed, 5);
        this.stepHeight = faoxomvalue(options.stepHeight, 0.35);
        this.slopeLimit = faoxomvalue(options.slopeLimit, Math.PI / 4);
        this.stepUpEnabled = options.stepUpEnabled !== false;
        this.grounded = false;
        this.groundNormal = new Vector3(0, 1, 0);
        this.desired = new Vector3();
        this.jumpQueued = false;
        var position = options.position ? options.position.clone() : this.object ? this.object.position.clone() : new Vector3();
        this.body = options.body || new RigidBody({ object: this.object, shape: options.shape || new CollisionShape("capsule", { radius: this.radius, height: this.height }), mass: faoxomvalue(options.mass, 1), position: position, restitution: 0, friction: faoxomvalue(options.friction, 0.8), linearDamping: faoxomvalue(options.linearDamping, 0.05) });
        var self = this;
        var previousCollision = this.body.onCollision;
        this.body.inverseInertiaLocal.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.onCollision = function (other, normal, penetration) {
            var ny = normal.y;
            if (ny <= -0.35) self.groundNormal.set(-normal.x, -normal.y, -normal.z);
            else if (ny >= 0.35) self.groundNormal.copy(normal);
            if (Math.abs(ny) >= 0.35 && self.body.velocity.y <= 0.5) self.grounded = true;
            if (previousCollision) previousCollision(other, normal, penetration);
        };
        if (this.world) { this.world.addBody(this.body); this.world.addController(this); }
    }
    move(direction, dt) {
        this.desired.copy(direction);
        if (this.desired.lengthSq() > 1) this.desired.normalize();
        if (dt !== undefined) this.body.velocity.x = this.desired.x * this.speed, this.body.velocity.z = this.desired.z * this.speed;
        return this;
    }
    jump() { this.jumpQueued = true; return this; }
    preStep(dt) {
        this.body.angularVelocity.set(0, 0, 0);
        if (this.desired.lengthSq() > 1e-8 || this.jumpQueued) this.body.wake();
        this.body.velocity.x = this.desired.x * this.speed;
        this.body.velocity.z = this.desired.z * this.speed;
        if (this.jumpQueued && this.grounded) { this.body.velocity.y = this.jumpSpeed; this.grounded = false; }
        this.jumpQueued = false;
        if (this.grounded && this.groundNormal.y < Math.cos(this.slopeLimit)) {
            var nx = this.groundNormal.x, nz = this.groundNormal.z;
            var len = Math.sqrt(nx * nx + nz * nz);
            if (len > 1e-8) {
                nx /= len; nz /= len;
                var into = this.body.velocity.x * nx + this.body.velocity.z * nz;
                if (into < 0) { this.body.velocity.x -= nx * into; this.body.velocity.z -= nz * into; }
            }
        }
        this.grounded = false;
    }
    postStep(dt) {
        if (this.body.velocity.y === 0 && this.body.position.y <= this.height * 0.5 + this.radius + this.stepHeight) this.grounded = true;
        if (this.stepUpEnabled && this.grounded && (this.desired.x !== 0 || this.desired.z !== 0)) {
            var expected = Math.sqrt(this.desired.x * this.desired.x + this.desired.z * this.desired.z) * this.speed * dt;
            var movedX = this.body.position.x - this.body.previousPosition.x;
            var movedZ = this.body.position.z - this.body.previousPosition.z;
            var moved = Math.sqrt(movedX * movedX + movedZ * movedZ);
            if (moved < expected * 0.4) {
                var dirX = this.desired.x, dirZ = this.desired.z;
                var dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ);
                if (dirLen > 1e-8) {
                    dirX /= dirLen; dirZ /= dirLen;
                    var probeLength = expected + this.radius + 0.05;
                    var feetOffset = this.height * 0.5 + this.radius;
                    var origin = new Vector3(this.body.position.x, this.body.position.y - feetOffset + this.stepHeight, this.body.position.z);
                    var direction = new Vector3(dirX, 0, dirZ);
                    var hits = this.world ? this.world.raycast(new Ray(origin, direction), probeLength, this.body) : [];
                    if (!hits.length) {
                        this.body.position.y += this.stepHeight;
                        this.body.previousPosition.y += this.stepHeight;
                    }
                }
            }
        }
        if (this.object) this.object.position.copy(this.body.position);
    }
    getPosition(target) { return (target || new Vector3()).copy(this.body.position); }
    reset(position) { this.body.position.copy(position); this.body.velocity.set(0, 0, 0); this.grounded = false; return this; }
    snapshotState() {
        return { grounded: this.grounded, groundNormal: this.groundNormal.toArray(), desired: this.desired.toArray(), jumpQueued: this.jumpQueued };
    }
    restoreState(state) {
        if (!state) return this;
        this.grounded = state.grounded === true;
        this.groundNormal.fromArray(state.groundNormal);
        this.desired.fromArray(state.desired);
        this.jumpQueued = state.jumpQueued === true;
        return this;
    }
    destroy() { if (this.world) { this.world.removeBody(this.body); this.world.removeController(this); } }
}

export { CharacterController };
