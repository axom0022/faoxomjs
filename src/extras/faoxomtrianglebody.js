import { Quaternion, Vector3 } from "../math/index.js";
import { CollisionShape } from "./CollisionShape.js";

function faoxomtrianglebody(a, b, c) { return { shape: new CollisionShape("convex", { vertices: [a.clone(), b.clone(), c.clone()] }), position: new Vector3(), rotation: new Quaternion() }; }

export { faoxomtrianglebody };
