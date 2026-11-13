import { CollisionShape } from "./CollisionShape.js";

class ConvexCollisionShape extends CollisionShape { constructor(points, options) { options = options || {}; options.vertices = points || options.vertices || []; super("convex", options); } }

export { ConvexCollisionShape };
