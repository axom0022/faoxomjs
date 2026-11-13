import { InstancedBufferAttribute } from "../core/index.js";
import { Matrix4 } from "../math/index.js";
import { Mesh } from "./Mesh.js";

class InstancedMesh extends Mesh {
    constructor(geometry, material, count) { super(geometry, material); this.type = "InstancedMesh"; this.capacity = Math.max(0, Math.floor(count || 0)); this.count = this.capacity; this.instanceMatrices = new Float32Array(this.capacity * 16); this.instanceMatrix = new InstancedBufferAttribute(this.instanceMatrices, 16); this.instanceColor = null; this.instanceNeedsUpdate = true; for (var i = 0; i < this.capacity; i++) new Matrix4().toArray(this.instanceMatrices, i * 16); }
    setMatrixAt(index, matrix) { if (index < 0 || index >= this.capacity) return this; matrix.toArray(this.instanceMatrices, index * 16); this.instanceMatrix.needsUpdate = true; this.instanceMatrix.version++; this.instanceNeedsUpdate = true; return this; }
    setColorAt(index, color) { if (index < 0 || index >= this.capacity) return this; if (!this.instanceColor) this.instanceColor = new InstancedBufferAttribute(new Float32Array(this.capacity * 3), 3); this.instanceColor.array[index * 3] = color.r === undefined ? color.x : color.r; this.instanceColor.array[index * 3 + 1] = color.g === undefined ? color.y : color.g; this.instanceColor.array[index * 3 + 2] = color.b === undefined ? color.z : color.b; this.instanceColor.needsUpdate = true; this.instanceColor.version++; this.geometry.attributes.instanceColor = this.instanceColor; return this; }
    getMatrixAt(index, target) { return (target || new Matrix4()).fromArray(this.instanceMatrices, index * 16); }
    updateInstanceMatrices() { this.instanceNeedsUpdate = true; return this; }
    clone(recursive) { var mesh = new InstancedMesh(this.geometry, this.material, this.count); mesh.instanceMatrices.set(this.instanceMatrices); mesh.instanceMatrix.needsUpdate = true; mesh.instanceNeedsUpdate = true; mesh.name = this.name; mesh.position.copy(this.position); mesh.quaternion.copy(this.quaternion); mesh.scale.copy(this.scale); if (recursive !== false) for (var i = 0; i < this.children.length; i++) mesh.add(this.children[i].clone(true)); return mesh; }
}
InstancedMesh.prototype.isInstancedMesh = true;

export { InstancedMesh };
