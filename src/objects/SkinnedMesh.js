import { Matrix4 } from "../math/index.js";

import { Mesh } from "./Mesh.js";

class SkinnedMesh extends Mesh {
    constructor(zasaa, zasab) {
        super(zasaa, zasab);
        this.type = "SkinnedMesh";
        this.bindMode = "attached";
        this.bindMatrix = new Matrix4;
        this.bindMatrixInverse = new Matrix4;
        this.skeleton = null;
    }
    bind(zasaa, zasab) {
        this.skeleton = zasaa;
        this.bindMatrix.copy(zasab || this.matrixWorld);
        this.bindMatrixInverse.copy(this.bindMatrix).invert();
        zasaa.update();
        return this;
    }
    normalizeSkinWeights() {
        var zasaa = this.geometry.getAttribute("skinWeight");
        if (!zasaa) return this;
        for (var zasab = 0; zasab < zasaa.array.length; zasab += 4) {
            var zasac = zasaa.array[zasab] + zasaa.array[zasab + 1] + zasaa.array[zasab + 2] + zasaa.array[zasab + 3] || 1;
            zasaa.array[zasab] /= zasac;
            zasaa.array[zasab + 1] /= zasac;
            zasaa.array[zasab + 2] /= zasac;
            zasaa.array[zasab + 3] /= zasac;
        }
        return this;
    }
}

export { SkinnedMesh };
