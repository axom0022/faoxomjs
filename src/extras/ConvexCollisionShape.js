import { CollisionShape } from "./CollisionShape.js";

class ConvexCollisionShape extends CollisionShape {
    constructor(zagua, zagub) {
        zagub = zagub || {};
        zagub.vertices = zagua || zagub.vertices || [];
        super("convex", zagub);
    }
}

export { ConvexCollisionShape };
