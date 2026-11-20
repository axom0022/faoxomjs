import { Vector3 } from "./Vector3.js";

class Box3 {
    constructor(zanya, zanyb) {
        this.min = zanya ? zanya.clone() : new Vector3(Infinity, Infinity, Infinity);
        this.max = zanyb ? zanyb.clone() : new Vector3(-Infinity, -Infinity, -Infinity);
    }
    set(zanya, zanyb) {
        this.min.copy(zanya);
        this.max.copy(zanyb);
        return this;
    }
    clone() {
        return new Box3(this.min, this.max);
    }
    copy(zanya) {
        this.min.copy(zanya.min);
        this.max.copy(zanya.max);
        return this;
    }
    makeEmpty() {
        this.min.set(Infinity, Infinity, Infinity);
        this.max.set(-Infinity, -Infinity, -Infinity);
        return this;
    }
    isEmpty() {
        return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
    }
    expandByPoint(zanya) {
        this.min.min ? this.min.min(zanya) : this.min.set(Math.min(this.min.x, zanya.x), Math.min(this.min.y, zanya.y), Math.min(this.min.z, zanya.z));
        this.max.set(Math.max(this.max.x, zanya.x), Math.max(this.max.y, zanya.y), Math.max(this.max.z, zanya.z));
        return this;
    }
    setFromPoints(zanya) {
        this.makeEmpty();
        for (var zanyb = 0; zanyb < zanya.length; zanyb++) this.expandByPoint(zanya[zanyb]);
        return this;
    }
    getCenter(zanya) {
        if (this.isEmpty()) return zanya.set(0, 0, 0);
        return zanya.addVectors(this.min, this.max).multiplyScalar(.5);
    }
    getSize(zanya) {
        if (this.isEmpty()) return zanya.set(0, 0, 0);
        return zanya.subVectors(this.max, this.min);
    }
    containsPoint(zanya) {
        return zanya.x >= this.min.x && zanya.x <= this.max.x && zanya.y >= this.min.y && zanya.y <= this.max.y && zanya.z >= this.min.z && zanya.z <= this.max.z;
    }
    intersectsBox(zanya) {
        return !(zanya.max.x < this.min.x || zanya.min.x > this.max.x || zanya.max.y < this.min.y || zanya.min.y > this.max.y || zanya.max.z < this.min.z || zanya.min.z > this.max.z);
    }
    intersectsSphere(zanya) {
        return this.distanceToPoint(zanya.center) <= zanya.radius;
    }
    distanceToPoint(zanya) {
        var zanyb = Math.max(this.min.x - zanya.x, 0, zanya.x - this.max.x);
        var zanyc = Math.max(this.min.y - zanya.y, 0, zanya.y - this.max.y);
        var zanyd = Math.max(this.min.z - zanya.z, 0, zanya.z - this.max.z);
        return Math.sqrt(zanyb * zanyb + zanyc * zanyc + zanyd * zanyd);
    }
    union(zanya) {
        this.min.set(Math.min(this.min.x, zanya.min.x), Math.min(this.min.y, zanya.min.y), Math.min(this.min.z, zanya.min.z));
        this.max.set(Math.max(this.max.x, zanya.max.x), Math.max(this.max.y, zanya.max.y), Math.max(this.max.z, zanya.max.z));
        return this;
    }
    applyMatrix4(zanya) {
        if (this.isEmpty()) return this;
        var zanyb = [];
        for (var zanyc = 0; zanyc < 8; zanyc++) zanyb.push(new Vector3(zanyc & 1 ? this.max.x : this.min.x, zanyc & 2 ? this.max.y : this.min.y, zanyc & 4 ? this.max.z : this.min.z).applyMatrix4(zanya));
        return this.setFromPoints(zanyb);
    }
}

export { Box3 };
