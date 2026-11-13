import { Object3D } from "../core/index.js";
import { Matrix4, Vector3 } from "../math/index.js";

class Camera extends Object3D {
    constructor() { super(); this.type = "Camera"; this.isCamera = true; this.matrixWorldInverse = new Matrix4(); this.projectionMatrix = new Matrix4(); this.projectionMatrixInverse = new Matrix4(); this.up = new Vector3(0, 1, 0); }
    updateMatrixWorld(force) { super.updateMatrixWorld(force); this.matrixWorldInverse.copy(this.matrixWorld).invert(); return this; }
    lookAt(target, y, z) { if (typeof target === "number") target = new Vector3(target, y !== undefined ? y : 0, z !== undefined ? z : 0); var z2 = new Vector3().subVectors(this.position, target).normalize(); if (z2.lengthSq() === 0) z2.z = 1; var x = new Vector3().crossVectors(this.up, z2).normalize(); if (x.lengthSq() === 0) { z2.x += 0.0001; x.crossVectors(this.up, z2).normalize(); } var y2 = new Vector3().crossVectors(z2, x); var m = new Matrix4().set(x.x, y2.x, z2.x, 0, x.y, y2.y, z2.y, 0, x.z, y2.z, z2.z, 0, 0, 0, 0, 1); this.quaternion.setFromRotationMatrix(m); this.rotation.setFromQuaternion(this.quaternion, this.rotation.order); return this; }
    getWorldDirection(target) { var t = target || new Vector3(); this.updateMatrixWorld(true); return t.set(0, 0, -1).transformDirection(this.matrixWorld); }
}
Camera.prototype.isCamera = true;

export { Camera };
