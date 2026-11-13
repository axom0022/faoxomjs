import { CollisionShape } from "./CollisionShape.js";
import { Vector3 } from "../math/index.js";

class BoxCollider extends CollisionShape {
    constructor(width, height, depth, options) {
        if (width && typeof width === "object") {
            options = height;
            height = width.height !== undefined ? width.height : width.y;
            depth = width.depth !== undefined ? width.depth : width.z;
            width = width.width !== undefined ? width.width : width.x;
        }
        super("box", Object.assign({}, options || {}, { width: width !== undefined ? width : 1, height: height !== undefined ? height : 1, depth: depth !== undefined ? depth : 1 }));
    }
}

class SphereCollider extends CollisionShape {
    constructor(radius, options) {
        if (radius && typeof radius === "object") { options = radius; radius = options.radius; }
        super("sphere", Object.assign({}, options || {}, { radius: radius !== undefined ? radius : 0.5 }));
    }
}

class CapsuleCollider extends CollisionShape {
    constructor(radius, height, options) {
        if (radius && typeof radius === "object") { options = radius; height = options.height; radius = options.radius; }
        super("capsule", Object.assign({}, options || {}, { radius: radius !== undefined ? radius : 0.5, height: height !== undefined ? height : 1 }));
    }
}

class PlaneCollider extends CollisionShape {
    constructor(normal, constant, options) {
        if (normal && typeof normal === "object" && !(normal instanceof Vector3)) { options = normal; constant = options.constant; normal = options.normal; }
        super("plane", options);
        this.normal = normal instanceof Vector3 ? normal.clone().normalize() : new Vector3(0, 1, 0);
        this.constant = typeof constant === "number" ? constant : 0;
    }
}

export { BoxCollider, SphereCollider, CapsuleCollider, PlaneCollider };
