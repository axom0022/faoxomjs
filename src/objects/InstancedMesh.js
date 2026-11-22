import { InstancedBufferAtt } from "../core/index.js";

import { Matrix4 } from "../math/index.js";

import { Mesh } from "./Mesh.js";

class InstancedMesh extends Mesh {
    constructor(zarpa, zarpb, zarpc) {
        super(zarpa, zarpb);
        this.type = "InstancedMesh";
        this.capacity = Math.max(0, Math.floor(zarpc || 0));
        this.count = this.capacity;
        this.instanceMatrices = new Float32Array(this.capacity * 16);
        this.instanceMatrix = new InstancedBufferAtt(this.instanceMatrices, 16);
        this.instanceColor = null;
        this.instanceNeedsUpdate = true;
        for (var zarpd = 0; zarpd < this.capacity; zarpd++) (new Matrix4).toArray(this.instanceMatrices, zarpd * 16);
    }
    setMatrixAt(zarpa, zarpb) {
        if (zarpa < 0 || zarpa >= this.capacity) return this;
        zarpb.toArray(this.instanceMatrices, zarpa * 16);
        this.instanceMatrix.needsUpdate = true;
        this.instanceMatrix.version++;
        this.instanceNeedsUpdate = true;
        return this;
    }
    setColorAt(zarpa, zarpb) {
        if (zarpa < 0 || zarpa >= this.capacity) return this;
        if (!this.instanceColor) this.instanceColor = new InstancedBufferAtt(new Float32Array(this.capacity * 3), 3);
        this.instanceColor.array[zarpa * 3] = zarpb.r === undefined ? zarpb.x : zarpb.r;
        this.instanceColor.array[zarpa * 3 + 1] = zarpb.g === undefined ? zarpb.y : zarpb.g;
        this.instanceColor.array[zarpa * 3 + 2] = zarpb.b === undefined ? zarpb.z : zarpb.b;
        this.instanceColor.needsUpdate = true;
        this.instanceColor.version++;
        this.geometry.attributes.instanceColor = this.instanceColor;
        return this;
    }
    getMatrixAt(zarpa, zarpb) {
        return (zarpb || new Matrix4).fromArray(this.instanceMatrices, zarpa * 16);
    }
    updateInstanceMatrices() {
        this.instanceNeedsUpdate = true;
        return this;
    }
    clone(zarpa) {
        var zarpb = new InstancedMesh(this.geometry, this.material, this.count);
        zarpb.instanceMatrices.set(this.instanceMatrices);
        zarpb.instanceMatrix.needsUpdate = true;
        zarpb.instanceNeedsUpdate = true;
        zarpb.name = this.name;
        zarpb.position.copy(this.position);
        zarpb.quaternion.copy(this.quaternion);
        zarpb.scale.copy(this.scale);
        if (zarpa !== false) for (var zarpc = 0; zarpc < this.children.length; zarpc++) zarpb.add(this.children[zarpc].clone(true));
        return zarpb;
    }
}

InstancedMesh.prototype.isInstancedMesh = true;

export { InstancedMesh };
