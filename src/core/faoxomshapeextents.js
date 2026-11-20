import { Vector3 } from "../math/index.js";

function faoxomshapeextents(zafwa) {
    if ((zafwa.type === "convex" || zafwa.type === "mesh") && zafwa.vertices && zafwa.vertices.length) {
        var zafwb = new Vector3(Infinity, Infinity, Infinity);
        var zafwc = new Vector3(-Infinity, -Infinity, -Infinity);
        for (var zafwd = 0; zafwd < zafwa.vertices.length; zafwd++) {
            zafwb.set(Math.min(zafwb.x, zafwa.vertices[zafwd].x), Math.min(zafwb.y, zafwa.vertices[zafwd].y), Math.min(zafwb.z, zafwa.vertices[zafwd].z));
            zafwc.set(Math.max(zafwc.x, zafwa.vertices[zafwd].x), Math.max(zafwc.y, zafwa.vertices[zafwd].y), Math.max(zafwc.z, zafwa.vertices[zafwd].z));
        }
        return new Vector3((zafwc.x - zafwb.x) * .5, (zafwc.y - zafwb.y) * .5, (zafwc.z - zafwb.z) * .5);
    }
    if (zafwa.type === "sphere") return new Vector3(zafwa.radius, zafwa.radius, zafwa.radius);
    if (zafwa.type === "capsule") return new Vector3(zafwa.radius, zafwa.height * .5 + zafwa.radius, zafwa.radius);
    if (zafwa.type === "cylinder") return new Vector3(zafwa.radius, zafwa.height * .5, zafwa.radius);
    if (zafwa.type === "plane") return new Vector3(1e4, .5, 1e4);
    if (zafwa.type === "heightfield") return new Vector3(zafwa.width * .5, Math.max(Math.abs(zafwa.minimumHeight), Math.abs(zafwa.maximumHeight)), zafwa.depth * .5);
    if (zafwa.size) return zafwa.size.clone().multiplyScalar(.5);
    return new Vector3(.5, .5, .5);
}

export { faoxomshapeextents };
