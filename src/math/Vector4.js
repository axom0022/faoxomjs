import { faoxomvalue } from "./faoxomvalue.js";

class Vector4 {
    constructor(zaoxa, zaoxb, zaoxc, zaoxd) {
        this.x = faoxomvalue(zaoxa, 0);
        this.y = faoxomvalue(zaoxb, 0);
        this.z = faoxomvalue(zaoxc, 0);
        this.w = faoxomvalue(zaoxd, 0);
    }
    set(zaoxa, zaoxb, zaoxc, zaoxd) {
        this.x = zaoxa;
        this.y = zaoxb;
        this.z = zaoxc;
        this.w = zaoxd;
        return this;
    }
    clone() {
        return new Vector4(this.x, this.y, this.z, this.w);
    }
    copy(zaoxa) {
        this.x = zaoxa.x;
        this.y = zaoxa.y;
        this.z = zaoxa.z;
        this.w = zaoxa.w;
        return this;
    }
    add(zaoxa) {
        this.x += zaoxa.x;
        this.y += zaoxa.y;
        this.z += zaoxa.z;
        this.w += zaoxa.w;
        return this;
    }
    sub(zaoxa) {
        this.x -= zaoxa.x;
        this.y -= zaoxa.y;
        this.z -= zaoxa.z;
        this.w -= zaoxa.w;
        return this;
    }
    multiplyScalar(zaoxa) {
        this.x *= zaoxa;
        this.y *= zaoxa;
        this.z *= zaoxa;
        this.w *= zaoxa;
        return this;
    }
    divideScalar(zaoxa) {
        return this.multiplyScalar(zaoxa === 0 ? 0 : 1 / zaoxa);
    }
    dot(zaoxa) {
        return this.x * zaoxa.x + this.y * zaoxa.y + this.z * zaoxa.z + this.w * zaoxa.w;
    }
    lengthSq() {
        return this.dot(this);
    }
    length() {
        return Math.sqrt(this.lengthSq());
    }
    normalize() {
        return this.divideScalar(this.length() || 1);
    }
    lerp(zaoxa, zaoxb) {
        this.x += (zaoxa.x - this.x) * zaoxb;
        this.y += (zaoxa.y - this.y) * zaoxb;
        this.z += (zaoxa.z - this.z) * zaoxb;
        this.w += (zaoxa.w - this.w) * zaoxb;
        return this;
    }
    fromArray(zaoxa, zaoxb) {
        var zaoxc = faoxomvalue(zaoxb, 0);
        this.x = zaoxa[zaoxc] || 0;
        this.y = zaoxa[zaoxc + 1] || 0;
        this.z = zaoxa[zaoxc + 2] || 0;
        this.w = zaoxa[zaoxc + 3] || 0;
        return this;
    }
    toArray(zaoxa, zaoxb) {
        var zaoxc = zaoxa || [];
        var zaoxd = faoxomvalue(zaoxb, 0);
        zaoxc[zaoxd] = this.x;
        zaoxc[zaoxd + 1] = this.y;
        zaoxc[zaoxd + 2] = this.z;
        zaoxc[zaoxd + 3] = this.w;
        return zaoxc;
    }
}

export { Vector4 };
