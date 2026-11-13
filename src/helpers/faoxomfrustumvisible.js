import { PerspectiveCamera } from "../camera/index.js";

function faoxomfrustumvisible(object, camera) {
    if (!object.geometry || !object.geometry.boundingSphere) return true;
    var sphere = object.geometry.boundingSphere, e = object.matrixWorld.elements, c = sphere.center, worldX = e[0] * c.x + e[4] * c.y + e[8] * c.z + e[12], worldY = e[1] * c.x + e[5] * c.y + e[9] * c.z + e[13], worldZ = e[2] * c.x + e[6] * c.y + e[10] * c.z + e[14], scaleX = Math.sqrt(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]), scaleY = Math.sqrt(e[4] * e[4] + e[5] * e[5] + e[6] * e[6]), scaleZ = Math.sqrt(e[8] * e[8] + e[9] * e[9] + e[10] * e[10]), radius = sphere.radius * Math.max(scaleX, scaleY, scaleZ), v = camera.matrixWorldInverse.elements, viewX = v[0] * worldX + v[4] * worldY + v[8] * worldZ + v[12], viewY = v[1] * worldX + v[5] * worldY + v[9] * worldZ + v[13], viewZ = v[2] * worldX + v[6] * worldY + v[10] * worldZ + v[14], depth = -viewZ;
    if (camera instanceof PerspectiveCamera) { if (depth + radius < camera.near || depth - radius > camera.far) return false; var halfHeight = Math.tan(camera.fov * Math.PI / 360) * Math.max(depth, camera.near), halfWidth = halfHeight * camera.aspect; return Math.abs(viewX) <= halfWidth + radius && Math.abs(viewY) <= halfHeight + radius; }
    return !(viewX + radius < camera.left || viewX - radius > camera.right || viewY + radius < camera.bottom || viewY - radius > camera.top || depth + radius < camera.near || depth - radius > camera.far);
}

export { faoxomfrustumvisible };
