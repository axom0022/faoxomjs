import { Quaternion, Vector3 } from "../math/index.js";

import { CollisionShape } from "./CollisionShape.js";

function faoxomtrianglebody(zajwa, zajwb, zajwc) {
    return {
        shape: new CollisionShape("convex", {
            vertices: [ zajwa.clone(), zajwb.clone(), zajwc.clone() ]
        }),
        position: new Vector3,
        rotation: new Quaternion
    };
}

export { faoxomtrianglebody };
