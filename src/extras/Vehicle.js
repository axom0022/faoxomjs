import { faoxomworldpoint } from "../core/index.js";
import { Ray, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";
import { VehicleWheel } from "./VehicleWheel.js";

class Vehicle {
    constructor(body, options) { options = options || {}; this.body = body; this.world = options.world || null; this.wheels = []; this.steering = 0; this.throttle = 0; this.braking = 0; this.engineForce = faoxomvalue(options.engineForce, 1600); this.maxSteering = faoxomvalue(options.maxSteering, 0.55); if (this.world) this.world.addVehicle(this); }
    addWheel(options) { var wheel = options instanceof VehicleWheel ? options : new VehicleWheel(options); this.wheels.push(wheel); return wheel; }
    setSteering(value) { this.steering = faoxomclamp(value, -1, 1); return this; }
    setThrottle(value) { this.throttle = faoxomclamp(value, -1, 1); return this; }
    setBrake(value) { this.braking = faoxomclamp(value, 0, 1); return this; }
    update(dt) { if (!this.world || !this.body) return; for (var i = 0; i < this.wheels.length; i++) { var wheel = this.wheels[i]; var worldPosition = faoxomworldpoint(this.body.position, this.body.rotation, wheel.position); var down = new Vector3(0, -1, 0); var ray = new Ray(worldPosition, down); var hitList = this.world.raycast(ray, wheel.suspensionRestLength + wheel.radius + 0.25, this.body); var hit = hitList.length ? hitList[0] : null; wheel.contact = hit; wheel.grounded = !!hit; wheel.steering = i < 2 ? this.steering * this.maxSteering : 0; if (!hit) continue; var distance = worldPosition.distanceTo(hit.point) - wheel.radius; var compression = faoxomclamp(wheel.suspensionRestLength - distance, 0, wheel.suspensionRestLength); var pointVelocity = this.body.getVelocityAtPoint(worldPosition); var springVelocity = pointVelocity.dot(new Vector3(0, 1, 0)); var force = compression * wheel.suspensionStiffness - springVelocity * wheel.suspensionDamping; this.body.applyForce(new Vector3(0, Math.max(0, force), 0), worldPosition); var forward = new Vector3(0, 0, 1).applyQuaternion(this.body.rotation); if (wheel.steering) forward.applyAxisAngle ? forward.applyAxisAngle(new Vector3(0, 1, 0), wheel.steering) : forward; var driveForce = forward.multiplyScalar(this.throttle * this.engineForce * (wheel.drive || (i >= 2 ? 1 : 0))); this.body.applyForce(driveForce, worldPosition); var lateral = new Vector3().crossVectors(hit.normal, forward).normalize(); var lateralSpeed = pointVelocity.dot(lateral); this.body.applyForce(lateral.multiplyScalar(-lateralSpeed * wheel.friction * this.body.mass), worldPosition); if (this.braking > 0) this.body.applyForce(pointVelocity.clone().multiplyScalar(-this.braking * 20), worldPosition); } }
}

export { Vehicle };
