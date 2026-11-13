import { Quaternion, Vector3 } from "../math/index.js";
import { CollisionShape } from "./CollisionShape.js";

class CompoundCollisionShape extends CollisionShape { constructor(children, options) { options = options || {}; options.children = children || []; super("compound", options); } addChild(shape, position, quaternion) { this.children.push({ shape: shape, position: position ? position.clone() : new Vector3(), quaternion: quaternion ? quaternion.clone() : new Quaternion() }); return this; } }

export { CompoundCollisionShape };
