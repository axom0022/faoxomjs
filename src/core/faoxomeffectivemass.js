import { Vector3 } from "../math/index.js";
import { faoxominverseinertia } from "./faoxominverseinertia.js";

function faoxomeffectivemass(body, direction, point) { if (body.isStatic) return 0; var r = new Vector3().subVectors(point, body.position); var angular = faoxominverseinertia(body, new Vector3().crossVectors(r, direction)); return body.inverseMass + new Vector3().crossVectors(angular, r).dot(direction); }

export { faoxomeffectivemass };
