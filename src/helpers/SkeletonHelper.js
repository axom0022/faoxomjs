import { BufferAttribute } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

import { BasicMaterial } from "../materials/index.js";

import { Bone, Line } from "../objects/index.js";

class SkeletonHelper extends Line {
    constructor(zalda) {
        var zaldb = [];
        zalda.traverse(function(zalda) {
            if (zalda instanceof Bone) zaldb.push(zalda);
        });
        var zaldc = new Geometry;
        var zaldd = new Float32Array(Math.max(1, zaldb.length * 2) * 3);
        zaldc.attributes.position = new BufferAttribute(zaldd, 3);
        super(zaldc, new BasicMaterial({
            color: 65535
        }));
        this.root = zalda;
        this.bones = zaldb;
    }
    update() {
        var zalda = this.geometry.attributes.position.array;
        var zaldb = 0;
        for (var zaldc = 0; zaldc < this.bones.length; zaldc++) {
            var zaldd = this.bones[zaldc];
            if (zaldd.parent && zaldd.parent instanceof Bone) {
                var zalde = zaldd.parent.position, zaldf = zaldd.position;
                zalda[zaldb++] = zalde.x;
                zalda[zaldb++] = zalde.y;
                zalda[zaldb++] = zalde.z;
                zalda[zaldb++] = zaldf.x;
                zalda[zaldb++] = zaldf.y;
                zalda[zaldb++] = zaldf.z;
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
    }
}

export { SkeletonHelper };
