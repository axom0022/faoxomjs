import { CollisionShape } from "./CollisionShape.js";

class MeshCollisionShape extends CollisionShape { constructor(vertices, indices, options) { options = options || {}; options.vertices = vertices || options.vertices || []; options.indices = indices || options.indices || null; super("mesh", options); } }

export { MeshCollisionShape };
