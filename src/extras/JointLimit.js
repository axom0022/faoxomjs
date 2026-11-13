import { Vector3, faoxomclamp } from "../math/index.js";

class JointLimit {
    constructor(bone, options) { options = options || {}; this.bone = bone; this.min = options.min ? options.min.clone() : new Vector3(-Math.PI, -Math.PI, -Math.PI); this.max = options.max ? options.max.clone() : new Vector3(Math.PI, Math.PI, Math.PI); }
    apply() { if (!this.bone || !this.bone.rotation) return this; this.bone.rotation.set(faoxomclamp(this.bone.rotation.x, this.min.x, this.max.x), faoxomclamp(this.bone.rotation.y, this.min.y, this.max.y), faoxomclamp(this.bone.rotation.z, this.min.z, this.max.z), this.bone.rotation.order); return this; }
}

export { JointLimit };
