import { CollisionShape } from "./CollisionShape.js";

class HeightfieldShape extends CollisionShape { constructor(width, depth, segmentsX, segmentsZ, heights, options) { options = options || {}; options.width = width; options.depth = depth; options.segmentsX = segmentsX; options.segmentsZ = segmentsZ; options.heights = heights; super("heightfield", options); } }

export { HeightfieldShape };
