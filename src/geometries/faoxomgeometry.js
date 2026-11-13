import { Geometry } from "./Geometry.js";

function faoxomgeometry(positions, normals, uvs, indices) { var g = new Geometry(); g.setAttribute("position", new Float32Array(positions), 3); if (normals) g.setAttribute("normal", new Float32Array(normals), 3); if (uvs) g.setAttribute("uv", new Float32Array(uvs), 2); if (indices) g.setIndex(indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)); if (!normals) g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g; }

export { faoxomgeometry };
