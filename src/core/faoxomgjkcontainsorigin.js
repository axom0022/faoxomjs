import { Vector3 } from "../math/index.js";
import { faoxomgjksimplex } from "./faoxomgjksimplex.js";
import { faoxomminkowskisupport } from "./faoxomminkowskisupport.js";

function faoxomgjkcontainsorigin(a, b) { var direction = new Vector3().subVectors(b.position, a.position); if (direction.lengthSq() < 1e-8) direction.set(1, 0, 0); var simplex = [faoxomminkowskisupport(a, b, direction)]; direction.copy(simplex[0]).negate(); for (var iteration = 0; iteration < 32; iteration++) { var point = faoxomminkowskisupport(a, b, direction); if (point.dot(direction) < 0) return false; simplex.push(point); if (faoxomgjksimplex(simplex, direction)) return true; } return false; }

export { faoxomgjkcontainsorigin };
