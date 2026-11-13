import { Matrix4 } from "../math/index.js";

class Skeleton {
    constructor(bones, inverses) { this.bones = bones || []; this.boneInverses = inverses || []; this.boneMatrices = new Float32Array(this.bones.length * 16); this.boneTexture = null; this.boneTextureSize = 0; this.calculateInverses(); }
    calculateInverses() { if (!this.boneInverses.length) for (var i = 0; i < this.bones.length; i++) this.boneInverses.push(this.bones[i].matrixWorld.clone().invert()); return this; }
    pose() { for (var i = 0; i < this.bones.length; i++) { var bone = this.bones[i]; bone.matrixWorld.copy(this.boneInverses[i]).invert(); if (bone.parent) bone.matrixWorld.premultiply(bone.parent.matrixWorld); } return this; }
    update() { for (var i = 0; i < this.bones.length; i++) { var m = new Matrix4().multiplyMatrices(this.bones[i].matrixWorld, this.boneInverses[i]); m.toArray(this.boneMatrices, i * 16); } return this; }
    getBoneByName(name) { for (var i = 0; i < this.bones.length; i++) if (this.bones[i].name === name) return this.bones[i]; return undefined; }
}

export { Skeleton };
