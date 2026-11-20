import { Vector3 } from "./Vector3.js";

class Ray {
    constructor(zaooa, zaoob) {
        this.origin = zaooa ? zaooa.clone() : new Vector3;
        this.direction = zaoob ? zaoob.clone().normalize() : new Vector3(0, 0, -1);
    }
    set(zaooa, zaoob) {
        this.origin.copy(zaooa);
        this.direction.copy(zaoob).normalize();
        return this;
    }
    clone() {
        return new Ray(this.origin, this.direction);
    }
    at(zaooa, zaoob) {
        return (zaoob || new Vector3).copy(this.direction).multiplyScalar(zaooa).add(this.origin);
    }
    lookAt(zaooa) {
        this.direction.copy(zaooa).sub(this.origin).normalize();
        return this;
    }
    recast(zaooa) {
        this.origin.copy(this.at(zaooa, new Vector3));
        return this;
    }
    distanceToPoint(zaooa) {
        var zaoob = this.direction.dot((new Vector3).subVectors(zaooa, this.origin));
        var zaooc = this.at(zaoob, new Vector3);
        return zaooc.distanceTo(zaooa);
    }
    intersectSphere(zaooa, zaoob) {
        if (!zaooa || !(zaooa.radius > 0)) return undefined;
        var zaooc = (new Vector3).subVectors(zaooa.center, this.origin);
        var zaood = zaooc.dot(this.direction);
        var zaooe = zaooc.dot(zaooc) - zaood * zaood;
        var zaoof = zaooa.radius * zaooa.radius;
        if (zaooe > zaoof) return undefined;
        var zaoog = Math.sqrt(Math.max(0, zaoof - zaooe));
        var zaooh = zaood - zaoog;
        var zaooi = zaood + zaoog;
        if (zaooi < 0) return undefined;
        return this.at(zaooh < 0 ? zaooi : zaooh, zaoob || new Vector3);
    }
    intersectBox(zaooa, zaoob) {
        var zaooc = 0;
        var zaood = Infinity;
        var zaooe = [ "x", "y", "z" ];
        for (var zaoof = 0; zaoof < 3; zaoof++) {
            var zaoog = zaooe[zaoof];
            var zaooh = this.direction[zaoog];
            var zaooi = this.origin[zaoog];
            if (Math.abs(zaooh) < 1e-12) {
                if (zaooi < zaooa.min[zaoog] || zaooi > zaooa.max[zaoog]) return undefined;
                continue;
            }
            var zaooj = (zaooa.min[zaoog] - zaooi) / zaooh;
            var zaook = (zaooa.max[zaoog] - zaooi) / zaooh;
            if (zaooj > zaook) {
                var zaool = zaooj;
                zaooj = zaook;
                zaook = zaool;
            }
            zaooc = Math.max(zaooc, zaooj);
            zaood = Math.min(zaood, zaook);
            if (zaooc > zaood) return undefined;
        }
        if (zaood < 0) return undefined;
        return this.at(zaooc >= 0 ? zaooc : zaood, zaoob || new Vector3);
    }
    intersectTriangle(zaooa, zaoob, zaooc, zaood, zaooe) {
        var zaoof = (new Vector3).subVectors(zaoob, zaooa);
        var zaoog = (new Vector3).subVectors(zaooc, zaooa);
        var zaooh = (new Vector3).crossVectors(this.direction, zaoog);
        var zaooi = zaoof.dot(zaooh);
        var zaooj = 1e-8;
        if (zaood ? zaooi <= zaooj : Math.abs(zaooi) <= zaooj) return undefined;
        var zaook = 1 / zaooi;
        var zaool = (new Vector3).subVectors(this.origin, zaooa);
        var zaoom = zaool.dot(zaooh) * zaook;
        if (zaoom < 0 || zaoom > 1) return undefined;
        var zaoon = (new Vector3).crossVectors(zaool, zaoof);
        var zaooo = this.direction.dot(zaoon) * zaook;
        if (zaooo < 0 || zaoom + zaooo > 1) return undefined;
        var zaoop = zaoog.dot(zaoon) * zaook;
        if (zaoop < 0) return undefined;
        return this.at(zaoop, zaooe || new Vector3);
    }
    intersectTriangleSealed(zaooa, zaoob, zaooc, zaood, zaooe) {
        var zaoof = this.origin, zaoog = this.direction;
        var zaooh = zaoof.x, zaooi = zaoof.y, zaooj = zaoof.z, zaook = zaoog.x, zaool = zaoog.y, zaoom = zaoog.z;
        var zaoon = zaooa.x, zaooo = zaooa.y, zaoop = zaooa.z, zaooq = zaoob.x, zaoor = zaoob.y, zaoos = zaoob.z, zaoot = zaooc.x, zaoou = zaooc.y, zaoov = zaooc.z;
        var zaoow = Math.abs(zaook), zaoox = Math.abs(zaool), zaooy = Math.abs(zaoom);
        var zaooz, zaooaa, zaooab;
        if (zaoow < zaoox) {
            if (zaoox < zaooy) {
                zaooz = 2;
                zaooaa = 0;
                zaooab = 1;
            } else {
                zaooz = 1;
                zaooaa = 2;
                zaooab = 0;
            }
        } else if (zaoow < zaooy) {
            zaooz = 2;
            zaooaa = 0;
            zaooab = 1;
        } else {
            zaooz = 0;
            zaooaa = 1;
            zaooab = 2;
        }
        var zaooac = zaooz === 0 ? zaook : zaooz === 1 ? zaool : zaoom;
        if (zaooac === 0) return undefined;
        if (zaooac < 0) {
            var zaooad = zaooaa;
            zaooaa = zaooab;
            zaooab = zaooad;
        }
        var zaooae = [ zaoon - zaooh, zaooo - zaooi, zaoop - zaooj ], zaooaf = [ zaooq - zaooh, zaoor - zaooi, zaoos - zaooj ], zaooag = [ zaoot - zaooh, zaoou - zaooi, zaoov - zaooj ];
        var zaooah = zaooaa === 0 ? zaook : zaooaa === 1 ? zaool : zaoom;
        var zaooai = zaooab === 0 ? zaook : zaooab === 1 ? zaool : zaoom;
        var zaooaj = zaooah / zaooac, zaooak = zaooai / zaooac, zaooal = 1 / zaooac;
        var zaooam = zaooae[zaooaa] - zaooaj * zaooae[zaooz], zaooan = zaooae[zaooab] - zaooak * zaooae[zaooz];
        var zaooao = zaooaf[zaooaa] - zaooaj * zaooaf[zaooz], zaooap = zaooaf[zaooab] - zaooak * zaooaf[zaooz];
        var zaooaq = zaooag[zaooaa] - zaooaj * zaooag[zaooz], zaooar = zaooag[zaooab] - zaooak * zaooag[zaooz];
        var zaooas = zaooaq * zaooap - zaooar * zaooao;
        var zaooat = zaooam * zaooar - zaooan * zaooaq;
        var zaooau = zaooao * zaooan - zaooap * zaooam;
        if ((zaooas < 0 || zaooat < 0 || zaooau < 0) && (zaooas > 0 || zaooat > 0 || zaooau > 0)) return undefined;
        var zaooav = zaooas + zaooat + zaooau;
        if (zaooav === 0) return undefined;
        if (zaood && zaooav < 0) return undefined;
        var zaooaw = zaooal * (zaooas * zaooae[zaooz] + zaooat * zaooaf[zaooz] + zaooau * zaooag[zaooz]) / zaooav;
        if (zaooaw < 0 || !isFinite(zaooaw)) return undefined;
        var zaooax = zaooe || new Vector3;
        zaooax.set(zaooh + zaooaw * zaook, zaooi + zaooaw * zaool, zaooj + zaooaw * zaoom);
        return zaooax;
    }
}

export { Ray };
