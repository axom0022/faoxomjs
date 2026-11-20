import { CollisionShape } from "./CollisionShape.js";

class MeshCollisionShape extends CollisionShape {
    constructor(zahza, zahzb, zahzc) {
        zahzc = zahzc || {};
        zahzc.vertices = zahza || zahzc.vertices || [];
        zahzc.indices = zahzb || zahzc.indices || null;
        super("mesh", zahzc);
    }
}

export { MeshCollisionShape };
