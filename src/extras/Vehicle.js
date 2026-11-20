import { faoxomworldpoint } from "../core/index.js";

import { Ray, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

import { VehicleWheel } from "./VehicleWheel.js";

class Vehicle {
    constructor(zajja, zajjb) {
        zajjb = zajjb || {};
        this.body = zajja;
        this.world = zajjb.world || null;
        this.wheels = [];
        this.steering = 0;
        this.throttle = 0;
        this.braking = 0;
        this.engineForce = faoxomvalue(zajjb.engineForce, 1600);
        this.maxSteering = faoxomvalue(zajjb.maxSteering, .55);
        if (this.world) this.world.addVehicle(this);
    }
    addWheel(zajja) {
        var zajjb = zajja instanceof VehicleWheel ? zajja : new VehicleWheel(zajja);
        this.wheels.push(zajjb);
        return zajjb;
    }
    setSteering(zajja) {
        this.steering = faoxomclamp(zajja, -1, 1);
        return this;
    }
    setThrottle(zajja) {
        this.throttle = faoxomclamp(zajja, -1, 1);
        return this;
    }
    setBrake(zajja) {
        this.braking = faoxomclamp(zajja, 0, 1);
        return this;
    }
    update(zajja) {
        if (!this.world || !this.body) return;
        for (var zajjb = 0; zajjb < this.wheels.length; zajjb++) {
            var zajjc = this.wheels[zajjb];
            var zajjd = faoxomworldpoint(this.body.position, this.body.rotation, zajjc.position);
            var zajje = new Vector3(0, -1, 0);
            var zajjf = new Ray(zajjd, zajje);
            var zajjg = this.world.raycast(zajjf, zajjc.suspensionRestLength + zajjc.radius + .25, this.body);
            var zajjh = zajjg.length ? zajjg[0] : null;
            zajjc.contact = zajjh;
            zajjc.grounded = !!zajjh;
            zajjc.steering = zajjb < 2 ? this.steering * this.maxSteering : 0;
            if (!zajjh) continue;
            var zajji = zajjd.distanceTo(zajjh.point) - zajjc.radius;
            var zajjj = faoxomclamp(zajjc.suspensionRestLength - zajji, 0, zajjc.suspensionRestLength);
            var zajjk = this.body.getVelocityAtPoint(zajjd);
            var zajjl = zajjk.dot(new Vector3(0, 1, 0));
            var zajjm = zajjj * zajjc.suspensionStiffness - zajjl * zajjc.suspensionDamping;
            this.body.applyForce(new Vector3(0, Math.max(0, zajjm), 0), zajjd);
            var zajjn = new Vector3(0, 0, 1).applyQuaternion(this.body.rotation);
            if (zajjc.steering) zajjn.applyAxisAngle ? zajjn.applyAxisAngle(new Vector3(0, 1, 0), zajjc.steering) : zajjn;
            var zajjo = zajjn.multiplyScalar(this.throttle * this.engineForce * (zajjc.drive || (zajjb >= 2 ? 1 : 0)));
            this.body.applyForce(zajjo, zajjd);
            var zajjp = (new Vector3).crossVectors(zajjh.normal, zajjn).normalize();
            var zajjq = zajjk.dot(zajjp);
            this.body.applyForce(zajjp.multiplyScalar(-zajjq * zajjc.friction * this.body.mass), zajjd);
            if (this.braking > 0) this.body.applyForce(zajjk.clone().multiplyScalar(-this.braking * 20), zajjd);
        }
    }
}

export { Vehicle };
