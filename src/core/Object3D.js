import { Box3, Euler, Matrix4, Quaternion, Vector3 } from "../math/index.js";
import { RenderLayers } from "./RenderLayers.js";
import { faoxomidnext } from "./faoxomidnext.js";

class Object3D {
    constructor() { this.id = faoxomidnext(); this.uuid = String(this.id); this.name = ""; this.type = "Object3D"; this.parent = null; this.children = []; this.position = new Vector3(); this.rotation = new Euler(0, 0, 0, "XYZ"); this.quaternion = new Quaternion(); this.scale = new Vector3(1, 1, 1); this.matrix = new Matrix4(); this.matrixWorld = new Matrix4(); this.matrixWorldNeedsUpdate = true; this.matrixAutoUpdate = true; this.visible = true; this.renderLayers = new RenderLayers(); this.castShadow = false; this.receiveShadow = false; this.renderOrder = 0; this.userData = {}; this._listeners = {}; this._syncingRotation = false; this._rotationSnapshot = { x: 0, y: 0, z: 0, order: "XYZ" }; this._transformVersion = 0; this._transformSnapshot = { px: 0, py: 0, pz: 0, qx: 0, qy: 0, qz: 0, qw: 1, sx: 1, sy: 1, sz: 1 }; var self = this; this.rotation.onChange = function() { if (!self._syncingRotation) { self._syncingRotation = true; self.quaternion.setFromEuler(self.rotation); self._syncingRotation = false; } self._rotationSnapshot.x = self.rotation.x; self._rotationSnapshot.y = self.rotation.y; self._rotationSnapshot.z = self.rotation.z; self._rotationSnapshot.order = self.rotation.order; self.matrixWorldNeedsUpdate = true; }; this.quaternion.onChange = function() { if (!self._syncingRotation) { self._syncingRotation = true; self.rotation.setFromQuaternion(self.quaternion, self.rotation.order); self._syncingRotation = false; } self.matrixWorldNeedsUpdate = true; }; }
    setRotation(x, y, z, order) { this.rotation.set(x, y, z, order); return this; }
    freezeTransform() { this.updateMatrixWorld(true); this.matrixAutoUpdate = false; this.userData.static = true; return this; }
    unfreezeTransform() { this.matrixAutoUpdate = true; this.userData.static = false; this.matrixWorldNeedsUpdate = true; return this; }
    add() { for (var i = 0; i < arguments.length; i++) { var object = arguments[i]; if (!object || object === this) continue; if (object.parent) object.parent.remove(object); object.parent = this; this.children.push(object); } return this; }
    addMany(objects) { if (!objects) return this; for (var i = 0; i < objects.length; i++) this.add(objects[i]); return this; }
    remove() { for (var i = 0; i < arguments.length; i++) { var object = arguments[i]; var index = this.children.indexOf(object); if (index !== -1) { object.parent = null; this.children.splice(index, 1); } } return this; }
    removeMany(objects) { if (!objects) return this; for (var i = 0; i < objects.length; i++) this.remove(objects[i]); return this; }
    touchesFrustum(volume) {
        if (!volume || !volume.intersectsBox) return false;
        this.updateMatrixWorld(true);
        var bounds = new Box3().makeEmpty();
        var expand = function(object) {
            if (object.geometry && object.geometry.attributes && object.geometry.attributes.position) {
                if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
                if (object.geometry.boundingBox && !object.geometry.boundingBox.isEmpty()) bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
            }
            for (var i = 0; i < object.children.length; i++) expand(object.children[i]);
        };
        expand(this);
        if (bounds.isEmpty()) return false;
        return volume.intersectsBox(bounds);
    }
    release() {
        this.traverse(function(object) {
            if (object.geometry && object.geometry.dispose) object.geometry.dispose();
            var material = object.material;
            if (!material) return;
            var materials = Array.isArray(material) ? material : [material];
            for (var i = 0; i < materials.length; i++) if (materials[i] && materials[i].dispose) materials[i].dispose();
        });
        return this;
    }
    attach(object) { if (object.parent) object.parent.remove(object); var inv = this.matrixWorld.clone().invert(); object.applyMatrix4(inv); this.add(object); return this; }
    applyMatrix4(m) { this.matrix.premultiply(m); this.matrix.decompose(this.position, this.quaternion, this.scale); this.rotation.setFromQuaternion(this.quaternion, this.rotation.order); this.matrixWorldNeedsUpdate = true; return this; }
    rotateOnAxis(axis, angle) { this.quaternion.multiply(new Quaternion().setFromAxisAngle(axis, angle)); return this; }
    rotateX(angle) { return this.rotateOnAxis(new Vector3(1, 0, 0), angle); }
    rotateY(angle) { return this.rotateOnAxis(new Vector3(0, 1, 0), angle); }
    rotateZ(angle) { return this.rotateOnAxis(new Vector3(0, 0, 1), angle); }
    translateOnAxis(axis, distance) { this.position.add(axis.clone().applyQuaternion(this.quaternion).multiplyScalar(distance)); this.matrixWorldNeedsUpdate = true; return this; }
    translateX(distance) { return this.translateOnAxis(new Vector3(1, 0, 0), distance); }
    translateY(distance) { return this.translateOnAxis(new Vector3(0, 1, 0), distance); }
    translateZ(distance) { return this.translateOnAxis(new Vector3(0, 0, 1), distance); }
    lookAt(x, y, z) { var targetVector; if (x !== undefined && typeof x === "number") { targetVector = new Vector3(x, y !== undefined ? y : 0, z !== undefined ? z : 0); } else if (x && x.x !== undefined) { targetVector = x; } else if (x && x.elements) { targetVector = new Vector3().setFromMatrixPosition(x); } else { targetVector = new Vector3(); } this.updateMatrixWorld(true); var position = new Vector3().setFromMatrixPosition(this.matrixWorld); var delta = new Vector3().subVectors(targetVector, position); if (delta.lengthSq() > 1e-8) { if (this.isCamera) this.quaternion.setFromUnitVectors(new Vector3(0, 0, -1), delta.normalize()); else this.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), delta.negate().normalize()); if (this.parent && this.parent.matrixWorld) { var parentQuat = new Quaternion().setFromRotationMatrix(this.parent.matrixWorld).invert(); this.quaternion.premultiply(parentQuat); } this.rotation.setFromQuaternion(this.quaternion, this.rotation ? this.rotation.order : "XYZ"); } return this; }
    getWorldPosition(target) { this.updateMatrixWorld(true); return (target || new Vector3()).setFromMatrixPosition(this.matrixWorld); }
    getWorldQuaternion(target) { this.updateMatrixWorld(true); return (target || new Quaternion()).setFromRotationMatrix(this.matrixWorld); }
    getWorldScale(target) { this.updateMatrixWorld(true); return (target || new Vector3()).setFromMatrixScale ? target.setFromMatrixScale(this.matrixWorld) : this.matrixWorld.decompose(new Vector3(), new Quaternion(), target || new Vector3()); }
    localToWorld(vector) { this.updateMatrixWorld(true); return vector.applyMatrix4(this.matrixWorld); }
    worldToLocal(vector) { this.updateMatrixWorld(true); return vector.applyMatrix4(this.matrixWorld.clone().invert()); }
    updateWorldMatrix(updateParents, updateChildren) { if (updateParents && this.parent) this.parent.updateWorldMatrix(true, false); if (this.matrixAutoUpdate) this.updateMatrix(); if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); else this.matrixWorld.copy(this.matrix); this.matrixWorldNeedsUpdate = false; if (updateChildren) for (var childIndex = 0; childIndex < this.children.length; childIndex++) this.children[childIndex].updateWorldMatrix(false, true); return this; }
    raycast() { return null; }

    updateMatrix() { var rotationChanged = this.rotation.x !== this._rotationSnapshot.x || this.rotation.y !== this._rotationSnapshot.y || this.rotation.z !== this._rotationSnapshot.z || this.rotation.order !== this._rotationSnapshot.order; if (rotationChanged) { this.quaternion.setFromEuler(this.rotation); this._rotationSnapshot.x = this.rotation.x; this._rotationSnapshot.y = this.rotation.y; this._rotationSnapshot.z = this.rotation.z; this._rotationSnapshot.order = this.rotation.order; } var snapshot = this._transformSnapshot, position = this.position, quaternion = this.quaternion, scale = this.scale; var changed = rotationChanged || position.x !== snapshot.px || position.y !== snapshot.py || position.z !== snapshot.pz || quaternion.x !== snapshot.qx || quaternion.y !== snapshot.qy || quaternion.z !== snapshot.qz || quaternion.w !== snapshot.qw || scale.x !== snapshot.sx || scale.y !== snapshot.sy || scale.z !== snapshot.sz; if (changed) { this.matrix.compose(position, quaternion, scale); snapshot.px = position.x; snapshot.py = position.y; snapshot.pz = position.z; snapshot.qx = quaternion.x; snapshot.qy = quaternion.y; snapshot.qz = quaternion.z; snapshot.qw = quaternion.w; snapshot.sx = scale.x; snapshot.sy = scale.y; snapshot.sz = scale.z; this._transformVersion++; this.matrixWorldNeedsUpdate = true; } return this; }
    updateMatrixWorld(force) { if (this.matrixAutoUpdate) this.updateMatrix(); if (this.matrixWorldNeedsUpdate || force) { if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); else this.matrixWorld.copy(this.matrix); this.matrixWorldNeedsUpdate = false; force = true; } for (var i = 0; i < this.children.length; i++) this.children[i].updateMatrixWorld(force); return this; }
    traverse(callback) { callback(this); for (var i = 0; i < this.children.length; i++) this.children[i].traverse(callback); }
    traverseVisible(callback) { if (!this.visible) return; callback(this); for (var i = 0; i < this.children.length; i++) this.children[i].traverseVisible(callback); }
    getObjectById(id) { if (this.id === id) return this; for (var i = 0; i < this.children.length; i++) { var found = this.children[i].getObjectById(id); if (found) return found; } return undefined; }
    getObjectByName(name) { if (this.name === name) return this; for (var i = 0; i < this.children.length; i++) { var found = this.children[i].getObjectByName(name); if (found) return found; } return undefined; }
    setMaterialVariant(name) { var count = 0; this.traverse(function(obj) { if (obj.isMesh && obj.setMaterialVariant && obj.setMaterialVariant(name)) count++; }); return count; }
    getAvailableMaterialVariants() { var variants = {}; this.traverse(function(obj) { if (obj.isMesh && obj.getAvailableMaterialVariants) { var list = obj.getAvailableMaterialVariants(); for (var i = 0; i < list.length; i++) variants[list[i]] = true; } }); return Object.keys(variants); }
    clone(recursive) { var object = new Object3D(); object.name = this.name; object.position.copy(this.position); object.quaternion.copy(this.quaternion); object.scale.copy(this.scale); object.visible = this.visible; object.userData = JSON.parse(JSON.stringify(this.userData || {})); if (recursive !== false) for (var i = 0; i < this.children.length; i++) object.add(this.children[i].clone(true)); return object; }
    addEventListener(type, listener) { if (!type || typeof listener !== "function") return this; (this._listeners[type] || (this._listeners[type] = [])).push(listener); return this; }
    removeEventListener(type, listener) { var list = this._listeners[type]; if (!list) return this; var index = list.indexOf(listener); if (index >= 0) list.splice(index, 1); return this; }
    dispatchEvent(event) { if (!event || !event.type) return this; var list = this._listeners[event.type]; if (!list) return this; event.target = event.target || this; for (var listenerIndex = 0; listenerIndex < list.length; listenerIndex++) list[listenerIndex].call(this, event); return this; }
    destroy() { while (this.children.length) this.children.pop().destroy(); if (this.parent) this.parent.remove(this); this.userData = {}; this._listeners = {}; }
}
Object3D.prototype.getWorldDirection = function(target) { this.updateMatrixWorld(true); return (target || new Vector3()).set(0, 0, -1).transformDirection(this.matrixWorld); };
Object3D.prototype.removeFromParent = function() { return this.parent ? this.parent.remove(this) : this; };
Object3D.prototype.clear = function() { return this.remove.apply(this, this.children.slice()); };
Object3D.prototype.traverseAncestors = function(callback) { if (this.parent) { callback(this.parent); this.parent.traverseAncestors(callback); } return this; };
Object3D.prototype.getObjectByProperty = function(property, value) { if (this[property] === value) return this; for (var i = 0; i < this.children.length; i++) { var found = this.children[i].getObjectByProperty(property, value); if (found) return found; } return undefined; };
Object3D.prototype.isObject3D = true;

export { Object3D };
