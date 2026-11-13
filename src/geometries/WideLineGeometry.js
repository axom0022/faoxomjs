import { Vector3, faoxomvalue } from "../math/index.js";
import { Geometry } from "./Geometry.js";

class WideLineGeometry extends Geometry {
    constructor(points, width) { super(); this.setPoints(points || [], width); }
    setPoints(points, width) { width = faoxomvalue(width, 0.05); var positions = []; var indices = []; var uvs = []; for (var i = 0; i < points.length - 1; i++) { var a = points[i]; var b = points[i + 1]; var direction = new Vector3().subVectors(b, a).normalize(); var side = new Vector3().crossVectors(direction, new Vector3(0, 1, 0)); if (side.lengthSq() < 1e-8) side.crossVectors(direction, new Vector3(1, 0, 0)); side.normalize().multiplyScalar(width * 0.5); var base = positions.length / 3; positions.push(a.x + side.x, a.y + side.y, a.z + side.z, a.x - side.x, a.y - side.y, a.z - side.z, b.x + side.x, b.y + side.y, b.z + side.z, b.x - side.x, b.y - side.y, b.z - side.z); uvs.push(0, 0, 0, 1, 1, 0, 1, 1); indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3); } this.attributes = {}; this.setAttribute("position", new Float32Array(positions), 3); this.setAttribute("uv", new Float32Array(uvs), 2); this.setIndex(indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)); this.computeVertexNormals(); this.computeBounds(); return this; }
}

export { WideLineGeometry };
