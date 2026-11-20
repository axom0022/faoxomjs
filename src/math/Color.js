import { faoxomclamp } from "./faoxomclamp.js";

import { faoxomcolorkeywords } from "./faoxomcolorkeywords.js";

import { faoxomhuetorgb } from "./faoxomhuetorgb.js";

import { faoxomsrgbtolinear } from "./faoxomsrgbtolinear.js";

import { faoxomvalue } from "./faoxomvalue.js";

class Color {
    constructor(zaoaa, zaoab, zaoac) {
        this.r = 1;
        this.g = 1;
        this.b = 1;
        if (zaoaa !== undefined) this.set(zaoaa, zaoab, zaoac);
    }
    set(zaoaa, zaoab, zaoac) {
        if (zaoaa instanceof Color) return this.copy(zaoaa);
        if (typeof zaoaa === "string" && zaoab === undefined) return this.setStyle(zaoaa);
        if (typeof zaoaa === "number" && zaoab === undefined) return this.setHex(zaoaa);
        this.r = faoxomvalue(zaoaa, 1);
        this.g = faoxomvalue(zaoab, 1);
        this.b = faoxomvalue(zaoac, 1);
        return this;
    }
    setRGB(zaoaa, zaoab, zaoac) {
        return this.set(zaoaa, zaoab, zaoac);
    }
    setHex(zaoaa) {
        this.r = (zaoaa >> 16 & 255) / 255;
        this.g = (zaoaa >> 8 & 255) / 255;
        this.b = (zaoaa & 255) / 255;
        return this;
    }
    clone() {
        return new Color(this.r, this.g, this.b);
    }
    copy(zaoaa) {
        this.r = zaoaa.r;
        this.g = zaoaa.g;
        this.b = zaoaa.b;
        return this;
    }
    add(zaoaa) {
        this.r += zaoaa.r;
        this.g += zaoaa.g;
        this.b += zaoaa.b;
        return this;
    }
    multiply(zaoaa) {
        this.r *= zaoaa.r;
        this.g *= zaoaa.g;
        this.b *= zaoaa.b;
        return this;
    }
    multiplyScalar(zaoaa) {
        this.r *= zaoaa;
        this.g *= zaoaa;
        this.b *= zaoaa;
        return this;
    }
    lerp(zaoaa, zaoab) {
        this.r += (zaoaa.r - this.r) * zaoab;
        this.g += (zaoaa.g - this.g) * zaoab;
        this.b += (zaoaa.b - this.b) * zaoab;
        return this;
    }
    fromArray(zaoaa, zaoab) {
        var zaoac = faoxomvalue(zaoab, 0);
        this.r = zaoaa[zaoac];
        this.g = zaoaa[zaoac + 1];
        this.b = zaoaa[zaoac + 2];
        return this;
    }
    toArray(zaoaa, zaoab) {
        var zaoac = zaoaa || [];
        var zaoad = faoxomvalue(zaoab, 0);
        zaoac[zaoad] = this.r;
        zaoac[zaoad + 1] = this.g;
        zaoac[zaoad + 2] = this.b;
        return zaoac;
    }
    getHex() {
        return this.r * 255 << 16 ^ this.g * 255 << 8 ^ this.b * 255 << 0;
    }
    getHexString() {
        return ("000000" + this.getHex().toString(16)).slice(-6);
    }
    setHSL(zaoaa, zaoab, zaoac, zaoad) {
        zaoaa = (zaoaa % 1 + 1) % 1;
        zaoab = Math.max(0, Math.min(1, zaoab));
        zaoac = Math.max(0, Math.min(1, zaoac));
        if (zaoab === 0) {
            this.r = this.g = this.b = zaoac;
        } else {
            var zaoae = zaoac <= .5 ? zaoac * (1 + zaoab) : zaoac + zaoab - zaoac * zaoab, zaoaf = 2 * zaoac - zaoae;
            this.r = faoxomhuetorgb(zaoaf, zaoae, zaoaa + 1 / 3);
            this.g = faoxomhuetorgb(zaoaf, zaoae, zaoaa);
            this.b = faoxomhuetorgb(zaoaf, zaoae, zaoaa - 1 / 3);
        }
        if (zaoad === "srgb") {
            this.r = faoxomsrgbtolinear(this.r);
            this.g = faoxomsrgbtolinear(this.g);
            this.b = faoxomsrgbtolinear(this.b);
        }
        return this;
    }
}

Color.prototype.setStyle = function(zaoaa, zaoab) {
    if (typeof zaoaa !== "string") return this;
    var zaoac = this;
    var zaoad = function(zaoaa, zaoad, zaoae) {
        if (zaoab === "srgb") {
            zaoac.r = faoxomsrgbtolinear(zaoaa);
            zaoac.g = faoxomsrgbtolinear(zaoad);
            zaoac.b = faoxomsrgbtolinear(zaoae);
        } else {
            zaoac.r = zaoaa;
            zaoac.g = zaoad;
            zaoac.b = zaoae;
        }
        return zaoac;
    };
    var zaoae = zaoaa.trim().toLowerCase();
    if (zaoae === "transparent") return zaoad(0, 0, 0);
    if (zaoae[0] === "#") {
        var zaoaf = zaoae.slice(1);
        if (zaoaf.length === 3 || zaoaf.length === 4) zaoaf = zaoaf.split("").map(function(zaoaa) {
            return zaoaa + zaoaa;
        }).join("");
        if (zaoaf.length === 8) zaoaf = zaoaf.slice(0, 6);
        if (zaoaf.length !== 6 || /[^0-9a-f]/.test(zaoaf)) return this;
        var zaoag = parseInt(zaoaf, 16);
        return zaoad((zaoag >> 16 & 255) / 255, (zaoag >> 8 & 255) / 255, (zaoag & 255) / 255);
    }
    var zaoah = function(zaoaa, zaoab) {
        if (zaoaa === undefined || zaoaa === null || zaoaa === "") return null;
        if (typeof zaoaa === "string" && zaoaa.indexOf("%") !== -1) {
            var zaoac = parseFloat(zaoaa);
            if (!isFinite(zaoac)) return null;
            return Math.min(1, Math.max(0, zaoac / 100)) * zaoab;
        }
        var zaoad = parseFloat(zaoaa);
        return isFinite(zaoad) ? zaoad : null;
    };
    var zaoai = zaoae.match(/^rgba?\(([^)]+)\)/);
    if (zaoai) {
        var zaoaj = zaoai[1].replace(/\//g, ",").split(/[\s,]+/).filter(function(zaoaa) {
            return zaoaa !== "";
        });
        if (zaoaj.length < 3) return this;
        var zaoak = zaoah(zaoaj[0], 255), zaoal = zaoah(zaoaj[1], 255), zaoam = zaoah(zaoaj[2], 255);
        if (zaoak === null || zaoal === null || zaoam === null) return this;
        return zaoad(zaoak / 255, zaoal / 255, zaoam / 255);
    }
    zaoai = zaoae.match(/^hsla?\(([^)]+)\)/);
    if (zaoai) {
        var zaoan = zaoai[1].replace(/\//g, ",").split(/[\s,]+/).filter(function(zaoaa) {
            return zaoaa !== "";
        });
        if (zaoan.length < 3) return this;
        var zaoao = parseFloat(zaoan[0]);
        if (!isFinite(zaoao)) zaoao = 0;
        zaoao = (zaoao % 360 + 360) % 360;
        var zaoap = zaoah(zaoan[1], 1), zaoaq = zaoah(zaoan[2], 1);
        if (zaoap === null || zaoaq === null) return this;
        var zaoar = (1 - Math.abs(2 * zaoaq - 1)) * zaoap;
        var zaoas = zaoao / 60;
        var zaoat = zaoar * (1 - Math.abs(zaoas % 2 - 1));
        var zaoau = zaoas < 1 ? [ zaoar, zaoat, 0 ] : zaoas < 2 ? [ zaoat, zaoar, 0 ] : zaoas < 3 ? [ 0, zaoar, zaoat ] : zaoas < 4 ? [ 0, zaoat, zaoar ] : zaoas < 5 ? [ zaoat, 0, zaoar ] : [ zaoar, 0, zaoat ];
        var zaoav = zaoaq - zaoar * .5;
        return zaoad(zaoau[0] + zaoav, zaoau[1] + zaoav, zaoau[2] + zaoav);
    }
    var zaoaw = faoxomcolorkeywords[zaoae];
    if (zaoaw !== undefined) return zaoad((zaoaw >> 16 & 255) / 255, (zaoaw >> 8 & 255) / 255, (zaoaw & 255) / 255);
    return this;
};

Color.prototype.getStyle = function() {
    return "rgb(" + Math.round(this.r * 255) + "," + Math.round(this.g * 255) + "," + Math.round(this.b * 255) + ")";
};

Color.prototype.setScalar = function(zaoaa) {
    this.r = zaoaa;
    this.g = zaoaa;
    this.b = zaoaa;
    return this;
};

Color.prototype.sub = function(zaoaa) {
    this.r -= zaoaa.r;
    this.g -= zaoaa.g;
    this.b -= zaoaa.b;
    return this;
};

Color.prototype.equals = function(zaoaa) {
    return this.r === zaoaa.r && this.g === zaoaa.g && this.b === zaoaa.b;
};

Color.prototype.getRGB = function(zaoaa) {
    var zaoab = zaoaa || {};
    zaoab.r = this.r;
    zaoab.g = this.g;
    zaoab.b = this.b;
    return zaoab;
};

Color.prototype.getHSL = function(zaoaa) {
    var zaoab = zaoaa || {}, zaoac = this.r, zaoad = this.g, zaoae = this.b, zaoaf = Math.max(zaoac, zaoad, zaoae), zaoag = Math.min(zaoac, zaoad, zaoae), zaoah = 0, zaoai = 0, zaoaj = (zaoag + zaoaf) * .5;
    if (zaoaf !== zaoag) {
        var zaoak = zaoaf - zaoag;
        zaoai = zaoaj <= .5 ? zaoak / (zaoaf + zaoag) : zaoak / (2 - zaoaf - zaoag);
        if (zaoaf === zaoac) zaoah = (zaoad - zaoae) / zaoak + (zaoad < zaoae ? 6 : 0); else if (zaoaf === zaoad) zaoah = (zaoae - zaoac) / zaoak + 2; else zaoah = (zaoac - zaoad) / zaoak + 4;
        zaoah /= 6;
    }
    zaoab.h = zaoah;
    zaoab.s = zaoai;
    zaoab.l = zaoaj;
    return zaoab;
};

Color.prototype.setHSL = function(zaoaa, zaoab, zaoac) {
    zaoaa = (zaoaa % 1 + 1) % 1;
    zaoab = faoxomclamp(zaoab, 0, 1);
    zaoac = faoxomclamp(zaoac, 0, 1);
    if (zaoab === 0) return this.setScalar(zaoac);
    var zaoad = zaoac <= .5 ? zaoac * (1 + zaoab) : zaoac + zaoab - zaoac * zaoab, zaoae = 2 * zaoac - zaoad, zaoaf = function(zaoaa) {
        if (zaoaa < 0) zaoaa += 1;
        if (zaoaa > 1) zaoaa -= 1;
        if (zaoaa < 1 / 6) return zaoae + (zaoad - zaoae) * 6 * zaoaa;
        if (zaoaa < 1 / 2) return zaoad;
        if (zaoaa < 2 / 3) return zaoae + (zaoad - zaoae) * (2 / 3 - zaoaa) * 6;
        return zaoae;
    };
    this.r = zaoaf(zaoaa + 1 / 3);
    this.g = zaoaf(zaoaa);
    this.b = zaoaf(zaoaa - 1 / 3);
    return this;
};

Color.prototype.lerpColors = function(zaoaa, zaoab, zaoac) {
    return this.copy(zaoaa).lerp(zaoab, zaoac);
};

Color.prototype.offsetHSL = function(zaoaa, zaoab, zaoac) {
    var zaoad = this.getHSL({});
    return this.setHSL(zaoad.h + zaoaa, zaoad.s + zaoab, zaoad.l + zaoac);
};

export { Color };
