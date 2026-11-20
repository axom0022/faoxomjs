import { faoxomclamp } from "./faoxomclamp.js";

import { faoxomvalue } from "./faoxomvalue.js";

class Vector2 {
    constructor(zaova, zaovb) {
        this.x = faoxomvalue(zaova, 0);
        this.y = faoxomvalue(zaovb, 0);
    }
    set(zaova, zaovb) {
        this.x = zaova;
        this.y = zaovb;
        return this;
    }
    setX(zaova) {
        this.x = zaova;
        return this;
    }
    setY(zaova) {
        this.y = zaova;
        return this;
    }
    clone() {
        return new Vector2(this.x, this.y);
    }
    copy(zaova) {
        this.x = zaova.x;
        this.y = zaova.y;
        return this;
    }
    add(zaova) {
        this.x += zaova.x;
        this.y += zaova.y;
        return this;
    }
    addVectors(zaova, zaovb) {
        this.x = zaova.x + zaovb.x;
        this.y = zaova.y + zaovb.y;
        return this;
    }
    sub(zaova) {
        this.x -= zaova.x;
        this.y -= zaova.y;
        return this;
    }
    subVectors(zaova, zaovb) {
        this.x = zaova.x - zaovb.x;
        this.y = zaova.y - zaovb.y;
        return this;
    }
    multiply(zaova) {
        this.x *= zaova.x;
        this.y *= zaova.y;
        return this;
    }
    multiplyScalar(zaova) {
        this.x *= zaova;
        this.y *= zaova;
        return this;
    }
    divideScalar(zaova) {
        return this.multiplyScalar(zaova === 0 ? 0 : 1 / zaova);
    }
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }
    dot(zaova) {
        return this.x * zaova.x + this.y * zaova.y;
    }
    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }
    length() {
        return Math.sqrt(this.lengthSq());
    }
    normalize() {
        return this.divideScalar(this.length() || 1);
    }
    distanceTo(zaova) {
        return Math.sqrt(this.distanceToSquared(zaova));
    }
    distanceToSquared(zaova) {
        var zaovb = this.x - zaova.x;
        var zaovc = this.y - zaova.y;
        return zaovb * zaovb + zaovc * zaovc;
    }
    lerp(zaova, zaovb) {
        this.x += (zaova.x - this.x) * zaovb;
        this.y += (zaova.y - this.y) * zaovb;
        return this;
    }
    rotateAround(zaova, zaovb) {
        var zaovc = Math.cos(zaovb);
        var zaovd = Math.sin(zaovb);
        var zaove = this.x - zaova.x;
        var zaovf = this.y - zaova.y;
        this.x = zaove * zaovc - zaovf * zaovd + zaova.x;
        this.y = zaove * zaovd + zaovf * zaovc + zaova.y;
        return this;
    }
    fromArray(zaova, zaovb) {
        var zaovc = faoxomvalue(zaovb, 0);
        this.x = zaova[zaovc] || 0;
        this.y = zaova[zaovc + 1] || 0;
        return this;
    }
    toArray(zaova, zaovb) {
        var zaovc = zaova || [];
        var zaovd = faoxomvalue(zaovb, 0);
        zaovc[zaovd] = this.x;
        zaovc[zaovd + 1] = this.y;
        return zaovc;
    }
    equals(zaova) {
        return this.x === zaova.x && this.y === zaova.y;
    }
}

Vector2.prototype.angle = function() {
    return Math.atan2(this.y, this.x);
};

Vector2.prototype.setLength = function(zaova) {
    return this.normalize().multiplyScalar(zaova);
};

Vector2.prototype.clampLength = function(zaova, zaovb) {
    var zaovc = this.length();
    return this.multiplyScalar(zaovc === 0 ? 1 : faoxomclamp(zaovc, zaova, zaovb) / zaovc);
};

Vector2.prototype.addScaledVector = function(zaova, zaovb) {
    this.x += zaova.x * zaovb;
    this.y += zaova.y * zaovb;
    return this;
};

Vector2.prototype.lerpVectors = function(zaova, zaovb, zaovc) {
    this.x = zaova.x + (zaovb.x - zaova.x) * zaovc;
    this.y = zaova.y + (zaovb.y - zaova.y) * zaovc;
    return this;
};

Vector2.prototype.setScalar = function(zaova) {
    this.x = zaova;
    this.y = zaova;
    return this;
};

Vector2.prototype.angleTo = function(zaova) {
    return Math.acos(faoxomclamp(this.dot(zaova) / (this.length() * zaova.length() || 1), -1, 1));
};

Vector2.prototype.cross = function(zaova) {
    return this.x * zaova.y - this.y * zaova.x;
};

Vector2.prototype.min = function(zaova) {
    this.x = Math.min(this.x, zaova.x);
    this.y = Math.min(this.y, zaova.y);
    return this;
};

Vector2.prototype.max = function(zaova) {
    this.x = Math.max(this.x, zaova.x);
    this.y = Math.max(this.y, zaova.y);
    return this;
};

Vector2.prototype.clamp = function(zaova, zaovb) {
    this.x = faoxomclamp(this.x, zaova.x, zaovb.x);
    this.y = faoxomclamp(this.y, zaova.y, zaovb.y);
    return this;
};

Vector2.prototype.setFromBufferAttribute = function(zaova, zaovb) {
    return this.set(zaova.getX ? zaova.getX(zaovb) : zaova.array[zaovb * zaova.itemSize], zaova.getY ? zaova.getY(zaovb) : zaova.array[zaovb * zaova.itemSize + 1]);
};

export { Vector2 };
