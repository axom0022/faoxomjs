import { Vector3 } from "../math/index.js";
import { faoxomshapeextents } from "./faoxomshapeextents.js";

function faoxomshapevertices(shape) { if (shape.vertices && shape.vertices.length) return shape.vertices; var e = faoxomshapeextents(shape); return [new Vector3(-e.x, -e.y, -e.z), new Vector3(e.x, -e.y, -e.z), new Vector3(-e.x, e.y, -e.z), new Vector3(e.x, e.y, -e.z), new Vector3(-e.x, -e.y, e.z), new Vector3(e.x, -e.y, e.z), new Vector3(-e.x, e.y, e.z), new Vector3(e.x, e.y, e.z)]; }

export { faoxomshapevertices };
