import { Object3D } from "../core/index.js";

import { Matrix4, Vector3 } from "../math/index.js";

class Camera extends Object3D {
    constructor() {
        super();
        this.type = "Camera";
        this.isCamera = true;
        this.matrixWorldInverse = new Matrix4;
        this.projectionMatrix = new Matrix4;
        this.projectionMatrixInverse = new Matrix4;
        this.up = new Vector3(0, 1, 0);
    }
    updateMatrixWorld(zabpa) {
        super.updateMatrixWorld(zabpa);
        this.matrixWorldInverse.copy(this.matrixWorld).invert();
        return this;
    }
    lookAt(zabpa, zabpb, zabpc) {
        if (typeof zabpa === "number") zabpa = new Vector3(zabpa, zabpb !== undefined ? zabpb : 0, zabpc !== undefined ? zabpc : 0);
        var zabpd = (new Vector3).subVectors(this.position, zabpa).normalize();
        if (zabpd.lengthSq() === 0) zabpd.z = 1;
        var zabpe = (new Vector3).crossVectors(this.up, zabpd).normalize();
        if (zabpe.lengthSq() === 0) {
            zabpd.x += 1e-4;
            zabpe.crossVectors(this.up, zabpd).normalize();
        }
        var zabpf = (new Vector3).crossVectors(zabpd, zabpe);
        var zabpg = (new Matrix4).set(zabpe.x, zabpf.x, zabpd.x, 0, zabpe.y, zabpf.y, zabpd.y, 0, zabpe.z, zabpf.z, zabpd.z, 0, 0, 0, 0, 1);
        this.quaternion.setFromRotationMatrix(zabpg);
        this.rotation.setFromQuaternion(this.quaternion, this.rotation.order);
        return this;
    }
    getWorldDirection(zabpa) {
        var zabpb = zabpa || new Vector3;
        this.updateMatrixWorld(true);
        return zabpb.set(0, 0, -1).transformDirection(this.matrixWorld);
    }
}

Camera.prototype.isCamera = true;

export { Camera };
