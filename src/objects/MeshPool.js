import { Mesh } from "./Mesh.js";
import { ObjectPool } from "./ObjectPool.js";

class MeshPool extends ObjectPool {
    constructor(geometry, material, options) { options = options || {}; super(function() { return new Mesh(geometry, material); }, { maxSize: options.maxSize, reset: options.reset || function(mesh) { mesh.remove.apply(mesh, mesh.children.slice()); mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.scale.set(1, 1, 1); mesh.visible = true; mesh.matrixAutoUpdate = true; mesh.matrixWorldNeedsUpdate = true; mesh.userData = {}; }, onAcquire: options.onAcquire, onRelease: options.onRelease }); this.geometry = geometry; this.material = material; }
    acquire(parent) { var mesh = super.acquire(); if (parent) parent.add(mesh); return mesh; }
}

export { MeshPool };
