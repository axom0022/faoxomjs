import { CollisionShape } from "./CollisionShape.js";

class CylinderCollisionShape extends CollisionShape { constructor(radius, height, options) { options = options || {}; options.radius = radius; options.height = height; super("cylinder", options); } }

export { CylinderCollisionShape };
