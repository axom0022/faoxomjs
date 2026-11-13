import { Ray, Vector3 } from "../math/index.js";
import { RenderLayers } from "./RenderLayers.js";

class Raycaster {
    constructor(origin, direction, near, far) { this.ray = new Ray(origin, direction); this.near = near || 0; this.far = far === undefined ? Infinity : far; this.camera = null; this.renderLayers = new RenderLayers(); this.layers = this.renderLayers; }
    set(origin, direction) { this.ray.set(origin, direction); return this; }
    setFromCamera(coords, camera) { this.camera = camera; if (camera.isPerspectiveCamera) { this.ray.origin.copy(camera.getWorldPosition(new Vector3())); this.ray.direction.set(coords.x, coords.y, -1).unproject(camera).sub(this.ray.origin).normalize(); } else { this.ray.origin.set(coords.x, coords.y, 0).unproject(camera); this.ray.direction.set(0, 0, -1).transformDirection(camera.matrixWorld); } return this; }
    intersectObject(object, recursive, target) { var hits = target || []; if (!object || !object.visible) return hits; if (object.raycast) { var result = object.raycast(this, hits); if (Array.isArray(result)) hits.push.apply(hits, result); } if (recursive) for (var i = 0; i < object.children.length; i++) this.intersectObject(object.children[i], true, hits); return hits.sort(function(a, b) { return a.distance - b.distance; }); }
    intersectObjects(objects, recursive, target) { var hits = target || []; for (var i = 0; i < objects.length; i++) this.intersectObject(objects[i], recursive, hits); return hits.sort(function(a, b) { return a.distance - b.distance; }); }
}

export { Raycaster };
