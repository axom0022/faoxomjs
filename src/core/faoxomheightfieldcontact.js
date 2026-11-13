import { Vector3 } from "../math/index.js";
import { faoxomlocalpoint } from "./faoxomlocalpoint.js";

function faoxomheightfieldcontact(a, b) { var terrainBody = a.shape.type === "heightfield" ? a : b.shape.type === "heightfield" ? b : null; if (!terrainBody) return null; var other = terrainBody === a ? b : a; if (other.isStatic) return null; var terrain = terrainBody.shape; var local = faoxomlocalpoint(terrainBody.position, terrainBody.rotation, other.position); var height = terrain.getHeight(local.x, local.z); if (height === -Infinity) return null; var otherBox = other.shape.getAABB(other.position, null, other.rotation); var terrainWorldHeight = height + terrainBody.position.y; if (otherBox.min.y >= terrainWorldHeight) return null; var normal = terrainBody === a ? new Vector3(0, 1, 0) : new Vector3(0, -1, 0); return { normal: normal, penetration: terrainWorldHeight - otherBox.min.y, point: new Vector3(other.position.x, terrainWorldHeight, other.position.z) }; }

export { faoxomheightfieldcontact };
