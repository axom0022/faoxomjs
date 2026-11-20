import { CollisionShape } from "./CollisionShape.js";

class CylinderCollisionShape extends CollisionShape {
    constructor(zagxa, zagxb, zagxc) {
        zagxc = zagxc || {};
        zagxc.radius = zagxa;
        zagxc.height = zagxb;
        super("cylinder", zagxc);
    }
}

export { CylinderCollisionShape };
