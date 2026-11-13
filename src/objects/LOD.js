import { Object3D } from "../core/index.js";
import { Vector3 } from "../math/index.js";
import { Mesh } from "./Mesh.js";

class LOD extends Object3D {
    constructor() { super(); this.type = "LOD"; this.levels = []; this.autoUpdate = true; this.currentLevel = -1; }
    addLevel(object, distance) { this.levels.push({ object: object, distance: Math.max(0, distance || 0) }); this.levels.sort(function(a, b) { return a.distance - b.distance; }); this.add(object); return this; }
    update(camera) { if (!camera || !this.levels.length) return this; var worldPosition = new Vector3().setFromMatrixPosition(this.matrixWorld); var distance = worldPosition.distanceTo(camera.position); var selected = 0; for (var i = 1; i < this.levels.length; i++) if (distance >= this.levels[i].distance) selected = i; if (selected !== this.currentLevel) { for (var j = 0; j < this.levels.length; j++) this.levels[j].object.visible = j === selected; this.currentLevel = selected; } return this; }
}
LOD.prototype.generateFromMesh = function(mesh, distances, ratios, options) { options = options || {}; distances = distances || [0, 25, 75, 180]; ratios = ratios || [1, 0.5, 0.25, 0.125]; this.levels = []; while (this.children.length) this.remove(this.children[0]); for (var i = 0; i < Math.min(distances.length, ratios.length); i++) { var geometry = i === 0 ? mesh.geometry : mesh.geometry.simplify({ targetRatio: ratios[i] }); var level = new Mesh(geometry, mesh.material); level.name = mesh.name + "_lod" + i; level.castShadow = mesh.castShadow; level.receiveShadow = mesh.receiveShadow; this.addLevel(level, distances[i]); } return this; };

export { LOD };
