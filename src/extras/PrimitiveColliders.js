import { CollisionShape } from "./CollisionShape.js";

import { Vector3 } from "../math/index.js";

class BoxCollider extends CollisionShape {
    constructor(zaila, zailb, zailc, zaild) {
        if (zaila && typeof zaila === "object") {
            zaild = zailb;
            zailb = zaila.height !== undefined ? zaila.height : zaila.y;
            zailc = zaila.depth !== undefined ? zaila.depth : zaila.z;
            zaila = zaila.width !== undefined ? zaila.width : zaila.x;
        }
        super("box", Object.assign({}, zaild || {}, {
            width: zaila !== undefined ? zaila : 1,
            height: zailb !== undefined ? zailb : 1,
            depth: zailc !== undefined ? zailc : 1
        }));
    }
}

class SphereCollider extends CollisionShape {
    constructor(zaila, zailb) {
        if (zaila && typeof zaila === "object") {
            zailb = zaila;
            zaila = zailb.radius;
        }
        super("sphere", Object.assign({}, zailb || {}, {
            radius: zaila !== undefined ? zaila : .5
        }));
    }
}

class CapsuleCollider extends CollisionShape {
    constructor(zaila, zailb, zailc) {
        if (zaila && typeof zaila === "object") {
            zailc = zaila;
            zailb = zailc.height;
            zaila = zailc.radius;
        }
        super("capsule", Object.assign({}, zailc || {}, {
            radius: zaila !== undefined ? zaila : .5,
            height: zailb !== undefined ? zailb : 1
        }));
    }
}

class PlaneCollider extends CollisionShape {
    constructor(zaila, zailb, zailc) {
        if (zaila && typeof zaila === "object" && !(zaila instanceof Vector3)) {
            zailc = zaila;
            zailb = zailc.constant;
            zaila = zailc.normal;
        }
        super("plane", zailc);
        this.normal = zaila instanceof Vector3 ? zaila.clone().normalize() : new Vector3(0, 1, 0);
        this.constant = typeof zailb === "number" ? zailb : 0;
    }
}

export { BoxCollider, SphereCollider, CapsuleCollider, PlaneCollider };
