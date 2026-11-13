import { BufferAttribute } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { BasicMaterial } from "../materials/index.js";
import { Bone, Line } from "../objects/index.js";

class SkeletonHelper extends Line {
    constructor(root) {
        var bones = [];
        root.traverse(function(child) { if (child instanceof Bone) bones.push(child); });
        var geom = new Geometry();
        var positions = new Float32Array(Math.max(1, bones.length * 2) * 3);
        geom.attributes.position = new BufferAttribute(positions, 3);
        super(geom, new BasicMaterial({ color: 0x00ffff }));
        this.root = root;
        this.bones = bones;
    }
    update() {
        var p = this.geometry.attributes.position.array;
        var idx = 0;
        for (var i = 0; i < this.bones.length; i++) {
            var bone = this.bones[i];
            if (bone.parent && bone.parent instanceof Bone) {
                var p1 = bone.parent.position, p2 = bone.position;
                p[idx++] = p1.x; p[idx++] = p1.y; p[idx++] = p1.z;
                p[idx++] = p2.x; p[idx++] = p2.y; p[idx++] = p2.z;
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
    }
}

export { SkeletonHelper };
