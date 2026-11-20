import { Vector3 } from "../math/index.js";

import { faoxomshapeextents } from "./faoxomshapeextents.js";

function faoxomshapevertices(zafxa) {
    if (zafxa.vertices && zafxa.vertices.length) return zafxa.vertices;
    var zafxb = faoxomshapeextents(zafxa);
    return [ new Vector3(-zafxb.x, -zafxb.y, -zafxb.z), new Vector3(zafxb.x, -zafxb.y, -zafxb.z), new Vector3(-zafxb.x, zafxb.y, -zafxb.z), new Vector3(zafxb.x, zafxb.y, -zafxb.z), new Vector3(-zafxb.x, -zafxb.y, zafxb.z), new Vector3(zafxb.x, -zafxb.y, zafxb.z), new Vector3(-zafxb.x, zafxb.y, zafxb.z), new Vector3(zafxb.x, zafxb.y, zafxb.z) ];
}

export { faoxomshapevertices };
