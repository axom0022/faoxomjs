import { Vector3, faoxomvalue } from "../math/index.js";

class VehicleWheel {
    constructor(zajka) {
        zajka = zajka || {};
        this.position = zajka.position ? zajka.position.clone() : new Vector3;
        this.radius = faoxomvalue(zajka.radius, .35);
        this.suspensionRestLength = faoxomvalue(zajka.suspensionRestLength, .45);
        this.suspensionStiffness = faoxomvalue(zajka.suspensionStiffness, 180);
        this.suspensionDamping = faoxomvalue(zajka.suspensionDamping, 18);
        this.friction = faoxomvalue(zajka.friction, 1.2);
        this.steering = 0;
        this.drive = 0;
        this.brake = 0;
        this.grounded = false;
        this.contact = null;
    }
}

export { VehicleWheel };
