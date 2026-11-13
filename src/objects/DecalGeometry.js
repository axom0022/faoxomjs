import { Geometry } from "../geometries/index.js";
import { Vector3 } from "../math/index.js";

class DecalGeometry extends Geometry {
    constructor(position, normal, size) { super(); position = position || new Vector3(); normal = (normal || new Vector3(0, 1, 0)).clone().normalize(); size = size || new Vector3(1, 1, 1); var up = Math.abs(normal.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0); var tangent = new Vector3().crossVectors(up, normal).normalize().multiplyScalar(size.x * 0.5); var bitangent = new Vector3().crossVectors(normal, tangent).normalize().multiplyScalar(size.y * 0.5); var center = position.clone().addScaledVector(normal, 0.001); var points = [center.clone().sub(tangent).sub(bitangent), center.clone().add(tangent).sub(bitangent), center.clone().add(tangent).add(bitangent), center.clone().sub(tangent).add(bitangent)]; this.setAttribute("position", new Float32Array([points[0].x, points[0].y, points[0].z, points[1].x, points[1].y, points[1].z, points[2].x, points[2].y, points[2].z, points[3].x, points[3].y, points[3].z]), 3); this.setAttribute("normal", new Float32Array([normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z]), 3); this.setAttribute("uv", new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2); this.setIndex(new Uint16Array([0, 1, 2, 0, 2, 3])); this.computeBounds(); }
}

export { DecalGeometry };
