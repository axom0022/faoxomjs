import { PlaneGeometry } from "../geometries/index.js";
import { BasicMaterial, Material } from "../materials/index.js";
import { Quaternion, Vector2, Vector3 } from "../math/index.js";
import { Mesh } from "./Mesh.js";

class Sprite extends Mesh {
    constructor(material) {
        var isMaterialInstance = material && material instanceof Material;
        var settings = Object.assign({ color: 0xffffff, transparent: true, depthWrite: false }, isMaterialInstance ? {} : (material || {}));
        if (!isMaterialInstance && settings.map !== undefined && settings.diffuseMap === undefined) settings.diffuseMap = settings.map;
        super(new PlaneGeometry(1, 1), isMaterialInstance ? material : new BasicMaterial(settings));
        this.type = "Sprite";
        this.anchor = new Vector2(0.5, 0.5);
        this.spin = 0;
        this.sizeAttenuation = true;
        this.sizeScale = new Vector3(1, 1, 1);
        var position = this.geometry.attributes.position;
        this.spriteBase = position ? position.array.slice() : null;
        this.applyAnchor();
    }
    applyAnchor() { var position = this.geometry.attributes.position; if (!position || !this.spriteBase) return this; var offsetX = 0.5 - this.anchor.x, offsetY = 0.5 - this.anchor.y; for (var i = 0; i < position.array.length; i += 3) { position.array[i] = this.spriteBase[i] + offsetX; position.array[i + 1] = this.spriteBase[i + 1] + offsetY; position.array[i + 2] = this.spriteBase[i + 2]; } this.geometry.computeBounds(); position.needsUpdate = true; return this; }
    setAnchor(anchor) { if (anchor) this.anchor.copy(anchor); this.applyAnchor(); return this; }
    faceCamera(camera) {
        camera.getWorldQuaternion(this.quaternion);
        if (this.spin) this.quaternion.multiply(Sprite._spin.setFromAxisAngle(Sprite._axis, this.spin));
        this.scale.copy(this.sizeScale);
        if (!this.sizeAttenuation) { var worldPosition = this.getWorldPosition(Sprite._vector); var distance = Math.max(worldPosition.distanceTo(camera.position), 1e-4); this.scale.x *= distance; this.scale.y *= distance; }
        return this;
    }
}
Sprite._vector = new Vector3();
Sprite._axis = new Vector3(0, 0, 1);
Sprite._spin = new Quaternion();

export { Sprite };
