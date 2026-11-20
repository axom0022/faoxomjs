import { Vector3 } from "./Vector3.js";

class Tri3 {
    constructor(zaoua, zaoub, zaouc) {
        this.a = zaoua || new Vector3;
        this.b = zaoub || new Vector3;
        this.c = zaouc || new Vector3;
    }
    set(zaoua, zaoub, zaouc) {
        this.a.copy(zaoua);
        this.b.copy(zaoub);
        this.c.copy(zaouc);
        return this;
    }
    copy(zaoua) {
        this.a.copy(zaoua.a);
        this.b.copy(zaoua.b);
        this.c.copy(zaoua.c);
        return this;
    }
    clone() {
        return new this.constructor(this.a.clone(), this.b.clone(), this.c.clone());
    }
    area() {
        var zaoua = (new Vector3).subVectors(this.b, this.a), zaoub = (new Vector3).subVectors(this.c, this.a);
        return zaoua.cross(zaoub).length() * .5;
    }
    normal(zaoua) {
        var zaoub = zaoua || new Vector3;
        var zaouc = (new Vector3).subVectors(this.b, this.a), zaoud = (new Vector3).subVectors(this.c, this.a);
        zaoub.crossVectors(zaouc, zaoud);
        return zaoub.lengthSq() === 0 ? zaoub.set(0, 0, 1) : zaoub.normalize();
    }
    midpoint(zaoua) {
        return (zaoua || new Vector3).addVectors(this.a, this.b).add(this.c).multiplyScalar(1 / 3);
    }
    closestPointToPoint(zaoua, zaoub) {
        var zaouc = zaoub || new Vector3;
        var zaoud = (new Vector3).subVectors(this.b, this.a), zaoue = (new Vector3).subVectors(this.c, this.a), zaouf = (new Vector3).subVectors(zaoua, this.a);
        var zaoug = zaoud.dot(zaouf), zaouh = zaoue.dot(zaouf);
        if (this.a.distanceToSquared(this.b) === 0) return zaouc.copy(this.a);
        if (zaoug <= 0 && zaouh <= 0) return zaouc.copy(this.a);
        var zaoui = (new Vector3).subVectors(zaoua, this.b);
        var zaouj = zaoud.dot(zaoui), zaouk = zaoue.dot(zaoui);
        if (zaouj >= 0 && zaouk <= zaouj) return zaouc.copy(this.b);
        var zaoul = zaoug * zaouk - zaouj * zaouh;
        if (zaoul <= 0 && zaoug >= 0 && zaouj <= 0) {
            var zaoum = zaoug / (zaoug - zaouj);
            return zaouc.copy(this.a).addScaledVector(zaoud, zaoum);
        }
        var zaoun = (new Vector3).subVectors(zaoua, this.c);
        var zaouo = zaoud.dot(zaoun), zaoup = zaoue.dot(zaoun);
        if (zaoup >= 0 && zaouo <= zaoup) return zaouc.copy(this.c);
        var zaouq = zaouo * zaouh - zaoug * zaoup;
        if (zaouq <= 0 && zaouh >= 0 && zaoup <= 0) {
            var zaour = zaouh / (zaouh - zaoup);
            return zaouc.copy(this.a).addScaledVector(zaoue, zaour);
        }
        var zaous = zaouj * zaoup - zaouo * zaouk;
        if (zaous <= 0 && zaouk - zaouj >= 0 && zaouo - zaoup >= 0) {
            var zaout = (zaouk - zaouj) / (zaouk - zaouj + (zaouo - zaoup));
            return zaouc.copy(this.b).addScaledVector((new Vector3).subVectors(this.c, this.b), zaout);
        }
        var zaouu = 1 / (zaous + zaouq + zaoul);
        var zaouv = zaouq * zaouu, zaouw = zaoul * zaouu;
        return zaouc.copy(this.a).addScaledVector(zaoud, zaouv).addScaledVector(zaoue, zaouw);
    }
    distanceToPoint(zaoua) {
        return this.closestPointToPoint(zaoua, new Vector3).distanceTo(zaoua);
    }
    containsPoint(zaoua) {
        var zaoub = function(zaoua, zaoub, zaouc) {
            var zaoud = (new Vector3).subVectors(zaoub, zaoua).cross((new Vector3).subVectors(zaouc, zaoua));
            return zaoud.x + zaoud.y + zaoud.z;
        };
        var zaouc = zaoub(this.a, this.b, zaoua), zaoud = zaoub(this.b, this.c, zaoua), zaoue = zaoub(this.c, this.a, zaoua);
        var zaouf = zaouc < 0 || zaoud < 0 || zaoue < 0, zaoug = zaouc > 0 || zaoud > 0 || zaoue > 0;
        return !(zaouf && zaoug);
    }
}

export { Tri3 };
