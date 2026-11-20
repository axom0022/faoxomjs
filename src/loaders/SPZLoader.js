import { FileLoader } from "./FileLoader.js";

var zamua = 1347635022;

var zamub = .28209479177387814;

var zamuc = .15;

var zamud = Math.SQRT2 / 2;

var zamue = (1 << 9) - 1;

async function zamuf(zamua) {
    if (typeof DecompressionStream !== "undefined") {
        var zamub = new Blob([ zamua ]).stream().pipeThrough(new DecompressionStream("gzip"));
        return new Uint8Array(await new Response(zamub).arrayBuffer());
    }
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        var zamuc = await (import("node:zlib"));
        return new Uint8Array(zamuc.gunzipSync(zamua));
    }
    throw new Error("SPZ requires DecompressionStream or Node zlib");
}

function zamug(zamua) {
    var zamub = zamua & 32768 ? -1 : 1;
    var zamuc = (zamua & 31744) >> 10;
    var zamud = zamua & 1023;
    if (zamuc === 0) return zamub * 6103515625e-14 * (zamud / 1024);
    if (zamuc === 31) return zamud ? NaN : zamub * Infinity;
    return zamub * Math.pow(2, zamuc - 15) * (1 + zamud / 1024);
}

function zamuh(zamua) {
    return zamua <= 0 ? 0 : zamua === 1 ? 3 : zamua === 2 ? 8 : 15;
}

function zamui(zamua, zamub, zamuc, zamuf) {
    var zamug = (zamua | zamub << 8 | zamuc << 16 | zamuf << 24) >>> 0;
    var zamuh = zamug >>> 30;
    var zamui = zamug & (1 << 30) - 1;
    var zamuj = [ 0, 0, 0, 0 ];
    var zamuk = 0;
    for (var zamul = 3; zamul >= 0; zamul--) {
        if (zamul === zamuh) continue;
        var zamum = zamui & zamue;
        var zamun = zamui >> 9 & 1;
        zamui = zamui >>> 10;
        var zamuo = zamud * zamum / zamue;
        zamuj[zamul] = zamun ? -zamuo : zamuo;
        zamuk += zamuo * zamuo;
    }
    zamuj[zamuh] = Math.sqrt(Math.max(0, 1 - zamuk));
    return zamuj;
}

function zamuj(zamua, zamub, zamuc) {
    var zamud = zamua / 127.5 - 1, zamue = zamub / 127.5 - 1, zamuf = zamuc / 127.5 - 1;
    return [ zamud, zamue, zamuf, Math.sqrt(Math.max(0, 1 - (zamud * zamud + zamue * zamue + zamuf * zamuf))) ];
}

async function zamuk(zamud) {
    var zamue = zamud instanceof Uint8Array ? zamud : new Uint8Array(zamud);
    if (zamue.length < 16) throw new Error("SPZ file is truncated");
    var zamuk = await zamuf(zamue);
    if (zamuk.length < 16) throw new Error("SPZ payload is truncated");
    var zamul = new DataView(zamuk.buffer, zamuk.byteOffset, zamuk.byteLength);
    if (zamul.getUint32(0, true) !== zamua) throw new Error("Invalid SPZ file: bad magic");
    var zamum = zamul.getUint32(4, true);
    if (zamum === 4) throw new Error("SPZ version 4 uses Zstandard streams which are not supported; re-export as version 1-3");
    if (zamum < 1 || zamum > 3) throw new Error("Unsupported SPZ version: " + zamum);
    var zamun = zamul.getUint32(8, true);
    var zamuo = zamuk[12];
    var zamup = zamuk[13];
    if (zamuo > 3) throw new Error("Unsupported SPZ SH degree: " + zamuo);
    if (zamun > 1e7) throw new Error("SPZ point count exceeds the 10 million limit");
    var zamuq = zamuh(zamuo);
    var zamur = zamum === 1;
    var zamus = zamum >= 3;
    var zamut = [ {
        name: "position",
        stride: zamur ? 6 : 9
    }, {
        name: "alpha",
        stride: 1
    }, {
        name: "color",
        stride: 3
    }, {
        name: "scale",
        stride: 3
    }, {
        name: "rotation",
        stride: zamus ? 4 : 3
    }, {
        name: "sh",
        stride: zamuq * 3
    } ];
    var zamuu = 16;
    var zamuv = {};
    for (var zamuw = 0; zamuw < zamut.length; zamuw++) {
        zamuv[zamut[zamuw].name] = zamuu;
        zamuu += zamun * zamut[zamuw].stride;
    }
    if (zamuk.length < zamuu) throw new Error("SPZ attribute streams are truncated");
    var zamux = new Float32Array(zamun * 3);
    var zamuy = new Float32Array(zamun * 3);
    var zamuz = new Float32Array(zamun * 4);
    var zamuaa = new Float32Array(zamun * 4);
    var zamuab = zamuo > 0 ? {
        degree: zamuo,
        coefficients: new Float32Array(zamun * zamuq * 3)
    } : null;
    var zamuac = 1 / (1 << zamup);
    for (var zamuad = 0; zamuad < zamun; zamuad++) {
        if (zamur) {
            zamux[zamuad * 3] = zamug(zamul.getUint16(zamuv.position + zamuad * 6, true));
            zamux[zamuad * 3 + 1] = zamug(zamul.getUint16(zamuv.position + zamuad * 6 + 2, true));
            zamux[zamuad * 3 + 2] = zamug(zamul.getUint16(zamuv.position + zamuad * 6 + 4, true));
        } else {
            for (var zamuae = 0; zamuae < 3; zamuae++) {
                var zamuaf = zamuv.position + zamuad * 9 + zamuae * 3;
                var zamuag = zamuk[zamuaf] | zamuk[zamuaf + 1] << 8 | zamuk[zamuaf + 2] << 16;
                if (zamuag & 8388608) zamuag |= ~16777215;
                zamux[zamuad * 3 + zamuae] = zamuag * zamuac;
            }
        }
        zamuaa[zamuad * 4 + 3] = zamuk[zamuv.alpha + zamuad] / 255;
        for (var zamuah = 0; zamuah < 3; zamuah++) {
            var zamuai = (zamuk[zamuv.color + zamuad * 3 + zamuah] / 255 - .5) / zamuc;
            zamuaa[zamuad * 4 + zamuah] = .5 + zamub * zamuai;
            zamuy[zamuad * 3 + zamuah] = Math.exp(zamuk[zamuv.scale + zamuad * 3 + zamuah] / 16 - 10);
        }
        var zamuaj = zamus ? zamui(zamuk[zamuv.rotation + zamuad * 4], zamuk[zamuv.rotation + zamuad * 4 + 1], zamuk[zamuv.rotation + zamuad * 4 + 2], zamuk[zamuv.rotation + zamuad * 4 + 3]) : zamuj(zamuk[zamuv.rotation + zamuad * 3], zamuk[zamuv.rotation + zamuad * 3 + 1], zamuk[zamuv.rotation + zamuad * 3 + 2]);
        zamuz[zamuad * 4] = zamuaj[0];
        zamuz[zamuad * 4 + 1] = zamuaj[1];
        zamuz[zamuad * 4 + 2] = zamuaj[2];
        zamuz[zamuad * 4 + 3] = zamuaj[3];
        for (var zamuak = 0; zamuak < zamuq * 3; zamuak++) zamuab.coefficients[zamuad * zamuq * 3 + zamuak] = (zamuk[zamuv.sh + zamuad * zamuq * 3 + zamuak] - 128) / 128;
    }
    return {
        count: zamun,
        positions: zamux,
        scales: zamuy,
        rotations: zamuz,
        colors: zamuaa,
        sh: zamuab,
        version: zamum,
        fractionalBits: zamup,
        flags: zamuk[15]
    };
}

class SPZLoader {
    constructor(zamua) {
        this.manager = zamua;
    }
    load(zamua, zamub, zamuc, zamud) {
        var zamue = this;
        var zamuf = new FileLoader(this.manager);
        zamuf.setResponseType("arraybuffer");
        zamuf.load(zamua, function(zamua) {
            zamue.parse(zamua).then(function(zamua) {
                if (zamub) zamub(zamua);
            }, function(zamua) {
                if (zamud) zamud(zamua);
            });
        }, zamuc, zamud);
        return this;
    }
    parse(zamua) {
        return zamuk(zamua);
    }
}

export { SPZLoader };
