import { Vector3, faoxomvalue } from "../math/index.js";

class VehicleWheel {
    constructor(options) { options = options || {}; this.position = options.position ? options.position.clone() : new Vector3(); this.radius = faoxomvalue(options.radius, 0.35); this.suspensionRestLength = faoxomvalue(options.suspensionRestLength, 0.45); this.suspensionStiffness = faoxomvalue(options.suspensionStiffness, 180); this.suspensionDamping = faoxomvalue(options.suspensionDamping, 18); this.friction = faoxomvalue(options.friction, 1.2); this.steering = 0; this.drive = 0; this.brake = 0; this.grounded = false; this.contact = null; }
}

export { VehicleWheel };
