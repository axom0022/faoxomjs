import { PlaneGeometry } from "../geometries/index.js";

import { BasicMaterial, Material } from "../materials/index.js";

import { Quaternion, Vector2, Vector3 } from "../math/index.js";

import { Mesh } from "./Mesh.js";

class Sprite extends Mesh {
    constructor(zasba) {
        var zasbb = zasba && zasba instanceof Material;
        var zasbc = Object.assign({
            color: 16777215,
            transparent: true,
            depthWrite: false
        }, zasbb ? {} : zasba || {});
        if (!zasbb && zasbc.map !== undefined && zasbc.diffuseMap === undefined) zasbc.diffuseMap = zasbc.map;
        super(new PlaneGeometry(1, 1), zasbb ? zasba : new BasicMaterial(zasbc));
        this.type = "Sprite";
        this.anchor = new Vector2(.5, .5);
        this.spin = 0;
        this.sizeAttenuation = true;
        this.sizeScale = new Vector3(1, 1, 1);
        var zasbd = this.geometry.attributes.position;
        this.spriteBase = zasbd ? zasbd.array.slice() : null;
        this.applyAnchor();
    }
    applyAnchor() {
        var zasba = this.geometry.attributes.position;
        if (!zasba || !this.spriteBase) return this;
        var zasbb = .5 - this.anchor.x, zasbc = .5 - this.anchor.y;
        for (var zasbd = 0; zasbd < zasba.array.length; zasbd += 3) {
            zasba.array[zasbd] = this.spriteBase[zasbd] + zasbb;
            zasba.array[zasbd + 1] = this.spriteBase[zasbd + 1] + zasbc;
            zasba.array[zasbd + 2] = this.spriteBase[zasbd + 2];
        }
        this.geometry.computeBounds();
        zasba.needsUpdate = true;
        return this;
    }
    setAnchor(zasba) {
        if (zasba) this.anchor.copy(zasba);
        this.applyAnchor();
        return this;
    }
    faceCamera(zasba) {
        zasba.getWorldQuaternion(this.quaternion);
        if (this.spin) this.quaternion.multiply(Sprite._spin.setFromAxisAngle(Sprite._axis, this.spin));
        this.scale.copy(this.sizeScale);
        if (!this.sizeAttenuation) {
            var zasbb = this.getWorldPosition(Sprite._vector);
            var zasbc = Math.max(zasbb.distanceTo(zasba.position), 1e-4);
            this.scale.x *= zasbc;
            this.scale.y *= zasbc;
        }
        return this;
    }
}

Sprite._vector = new Vector3;

Sprite._axis = new Vector3(0, 0, 1);

Sprite._spin = new Quaternion;

export { Sprite };
