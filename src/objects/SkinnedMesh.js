import { Matrix4 } from "../math/index.js";
import { Mesh } from "./Mesh.js";

class SkinnedMesh extends Mesh {
    constructor(geometry, material) { super(geometry, material); this.type = "SkinnedMesh"; this.bindMode = "attached"; this.bindMatrix = new Matrix4(); this.bindMatrixInverse = new Matrix4(); this.skeleton = null; }
    bind(skeleton, bindMatrix) { this.skeleton = skeleton; this.bindMatrix.copy(bindMatrix || this.matrixWorld); this.bindMatrixInverse.copy(this.bindMatrix).invert(); skeleton.update(); return this; }
    normalizeSkinWeights() { var skin = this.geometry.getAttribute("skinWeight"); if (!skin) return this; for (var i = 0; i < skin.array.length; i += 4) { var sum = skin.array[i] + skin.array[i + 1] + skin.array[i + 2] + skin.array[i + 3] || 1; skin.array[i] /= sum; skin.array[i + 1] /= sum; skin.array[i + 2] /= sum; skin.array[i + 3] /= sum; } return this; }
}

export { SkinnedMesh };
