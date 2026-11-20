import { Matrix4 } from "../math/index.js";

class Skeleton {
    constructor(zarza, zarzb) {
        this.bones = zarza || [];
        this.boneInverses = zarzb || [];
        this.boneMatrices = new Float32Array(this.bones.length * 16);
        this.boneTexture = null;
        this.boneTextureSize = 0;
        this.calculateInverses();
    }
    calculateInverses() {
        if (!this.boneInverses.length) for (var zarza = 0; zarza < this.bones.length; zarza++) this.boneInverses.push(this.bones[zarza].matrixWorld.clone().invert());
        return this;
    }
    pose() {
        for (var zarza = 0; zarza < this.bones.length; zarza++) {
            var zarzb = this.bones[zarza];
            zarzb.matrixWorld.copy(this.boneInverses[zarza]).invert();
            if (zarzb.parent) zarzb.matrixWorld.premultiply(zarzb.parent.matrixWorld);
        }
        return this;
    }
    update() {
        for (var zarza = 0; zarza < this.bones.length; zarza++) {
            var zarzb = (new Matrix4).multiplyMatrices(this.bones[zarza].matrixWorld, this.boneInverses[zarza]);
            zarzb.toArray(this.boneMatrices, zarza * 16);
        }
        return this;
    }
    getBoneByName(zarza) {
        for (var zarzb = 0; zarzb < this.bones.length; zarzb++) if (this.bones[zarzb].name === zarza) return this.bones[zarzb];
        return undefined;
    }
}

export { Skeleton };
