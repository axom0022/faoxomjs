import { FileLoader } from "./FileLoader.js";

var zamta = .28209479177387814;

var zamtb = Math.SQRT2 / 2;

async function zamtc(zamta) {
    if (typeof DecompressionStream !== "undefined") {
        var zamtb = new Blob([ zamta ]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Uint8Array(await new Response(zamtb).arrayBuffer());
    }
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        var zamtc = await (import("node:zlib"));
        return new Uint8Array(zamtc.inflateRawSync(zamta));
    }
    throw new Error("ZIP deflate entries require DecompressionStream or Node zlib");
}

function zamtd(zamta) {
    var zamtb = new DataView(zamta.buffer, zamta.byteOffset, zamta.byteLength);
    var zamtd = -1;
    for (var zamte = zamta.length - 22; zamte >= 0 && zamte >= zamta.length - 22 - 65536; zamte--) {
        if (zamtb.getUint32(zamte, true) === 101010256) {
            zamtd = zamte;
            break;
        }
    }
    if (zamtd < 0) throw new Error("Invalid SOG archive: missing ZIP end of central directory");
    var zamtf = zamtb.getUint16(zamtd + 10, true);
    var zamtg = zamtb.getUint32(zamtd + 16, true);
    if (zamtf === 65535 || zamtg === 4294967295) throw new Error("ZIP64 SOG archives are not supported");
    var zamth = {};
    var zamti = zamtg;
    for (var zamtj = 0; zamtj < zamtf; zamtj++) {
        if (zamti + 46 > zamta.length || zamtb.getUint32(zamti, true) !== 33639248) throw new Error("Invalid SOG archive: corrupt central directory");
        var zamtk = zamtb.getUint16(zamti + 10, true);
        var zamtl = zamtb.getUint32(zamti + 20, true);
        var zamtm = zamtb.getUint16(zamti + 28, true);
        var zamtn = zamtb.getUint16(zamti + 30, true);
        var zamto = zamtb.getUint16(zamti + 32, true);
        var zamtp = zamtb.getUint32(zamti + 42, true);
        var zamtq = "";
        for (var zamtr = 0; zamtr < zamtm; zamtr++) zamtq += String.fromCharCode(zamta[zamti + 46 + zamtr]);
        if (zamtp + 30 > zamta.length || zamtb.getUint32(zamtp, true) !== 67324752) throw new Error("Invalid SOG archive: corrupt local header");
        var zamts = zamtb.getUint16(zamtp + 26, true);
        var zamtt = zamtb.getUint16(zamtp + 28, true);
        var zamtu = zamtp + 30 + zamts + zamtt;
        if (zamtu + zamtl > zamta.length) throw new Error("Invalid SOG archive: entry data out of bounds");
        var zamtv = zamta.subarray(zamtu, zamtu + zamtl);
        zamth[zamtq] = zamtk === 0 ? new Uint8Array(zamtv) : zamtk === 8 ? zamtc(zamtv) : null;
        zamti += 46 + zamtm + zamtn + zamto;
    }
    var zamtw = false;
    for (var zamtx in zamth) if (zamth[zamtx] && typeof zamth[zamtx].then === "function") zamtw = true;
    if (!zamtw) return zamth;
    var zamty = Object.keys(zamth);
    return Promise.all(zamty.map(function(zamta) {
        return zamth[zamta];
    })).then(function(zamta) {
        var zamtb = {};
        for (var zamtc = 0; zamtc < zamty.length; zamtc++) zamtb[zamty[zamtc]] = zamta[zamtc];
        return zamtb;
    });
}

async function zamte(zamta) {
    if (typeof DecompressionStream !== "undefined") {
        var zamtb = new Blob([ zamta ]).stream().pipeThrough(new DecompressionStream("deflate"));
        return new Uint8Array(await new Response(zamtb).arrayBuffer());
    }
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        var zamtc = await (import("node:zlib"));
        return new Uint8Array(zamtc.inflateSync(zamta));
    }
    throw new Error("PNG decoding requires DecompressionStream or Node zlib");
}

function zamtf(zamta, zamtb, zamtc) {
    var zamtd = zamta + zamtb - zamtc, zamte = Math.abs(zamtd - zamta), zamtf = Math.abs(zamtd - zamtb), zamtg = Math.abs(zamtd - zamtc);
    return zamte <= zamtf && zamte <= zamtg ? zamta : zamtf <= zamtg ? zamtb : zamtc;
}

async function zamtg(zamta) {
    if (zamta.length < 8 || zamta[0] !== 137 || zamta[1] !== 80 || zamta[2] !== 78 || zamta[3] !== 71) return null;
    var zamtb = new DataView(zamta.buffer, zamta.byteOffset, zamta.byteLength);
    var zamtc = 8, zamtd = 0, zamtg = 0, zamth = 0, zamti = -1, zamtj = 0, zamtk = [];
    while (zamtc + 8 <= zamta.length) {
        var zamtl = zamtb.getUint32(zamtc);
        var zamtm = String.fromCharCode(zamta[zamtc + 4], zamta[zamtc + 5], zamta[zamtc + 6], zamta[zamtc + 7]);
        var zamtn = zamta.subarray(zamtc + 8, zamtc + 8 + zamtl);
        if (zamtm === "IHDR") {
            zamtd = zamtb.getUint32(zamtc + 8);
            zamtg = zamtb.getUint32(zamtc + 12);
            zamth = zamtn[8];
            zamti = zamtn[9];
            zamtj = zamtn[12];
        } else if (zamtm === "IDAT") {
            zamtk.push(zamtn);
        } else if (zamtm === "IEND") {
            break;
        }
        zamtc += 12 + zamtl;
    }
    if (zamth !== 8 || zamtj !== 0) return null;
    var zamto = zamti === 6 ? 4 : zamti === 2 ? 3 : zamti === 4 ? 2 : zamti === 0 ? 1 : 0;
    if (!zamto || !zamtd || !zamtg) return null;
    var zamtp = 0;
    for (var zamtq = 0; zamtq < zamtk.length; zamtq++) zamtp += zamtk[zamtq].length;
    var zamtr = new Uint8Array(zamtp), zamts = 0;
    for (var zamtt = 0; zamtt < zamtk.length; zamtt++) {
        zamtr.set(zamtk[zamtt], zamts);
        zamts += zamtk[zamtt].length;
    }
    var zamtu = await zamte(zamtr);
    var zamtv = zamtd * zamto;
    if (zamtu.length < zamtg * (zamtv + 1)) throw new Error("Corrupt PNG stream in SOG image");
    var zamtw = new Uint8Array(zamtd * zamtg * 4);
    var zamtx = new Uint8Array(zamtv), zamty = new Uint8Array(zamtv);
    for (var zamtz = 0; zamtz < zamtg; zamtz++) {
        var zamtaa = zamtu[zamtz * (zamtv + 1)];
        var zamtab = zamtu.subarray(zamtz * (zamtv + 1) + 1, (zamtz + 1) * (zamtv + 1));
        for (var zamtac = 0; zamtac < zamtv; zamtac++) {
            var zamtad = zamtac >= zamto ? zamty[zamtac - zamto] : 0, zamtae = zamtx[zamtac], zamtaf = zamtac >= zamto ? zamtx[zamtac - zamto] : 0;
            var zamtag = zamtab[zamtac];
            if (zamtaa === 1) zamtag = zamtag + zamtad; else if (zamtaa === 2) zamtag = zamtag + zamtae; else if (zamtaa === 3) zamtag = zamtag + (zamtad + zamtae >> 1); else if (zamtaa === 4) zamtag = zamtag + zamtf(zamtad, zamtae, zamtaf);
            zamty[zamtac] = zamtag & 255;
        }
        for (var zamtah = 0; zamtah < zamtd; zamtah++) {
            var zamtai = (zamtz * zamtd + zamtah) * 4, zamtaj = zamtah * zamto;
            if (zamto === 4) {
                zamtw[zamtai] = zamty[zamtaj];
                zamtw[zamtai + 1] = zamty[zamtaj + 1];
                zamtw[zamtai + 2] = zamty[zamtaj + 2];
                zamtw[zamtai + 3] = zamty[zamtaj + 3];
            } else if (zamto === 3) {
                zamtw[zamtai] = zamty[zamtaj];
                zamtw[zamtai + 1] = zamty[zamtaj + 1];
                zamtw[zamtai + 2] = zamty[zamtaj + 2];
                zamtw[zamtai + 3] = 255;
            } else if (zamto === 2) {
                zamtw[zamtai] = zamty[zamtaj];
                zamtw[zamtai + 1] = zamty[zamtaj];
                zamtw[zamtai + 2] = zamty[zamtaj];
                zamtw[zamtai + 3] = zamty[zamtaj + 1];
            } else {
                zamtw[zamtai] = zamty[zamtaj];
                zamtw[zamtai + 1] = zamty[zamtaj];
                zamtw[zamtai + 2] = zamty[zamtaj];
                zamtw[zamtai + 3] = 255;
            }
        }
        var zamtak = zamtx;
        zamtx = zamty;
        zamty = zamtak;
    }
    return {
        data: zamtw,
        width: zamtd,
        height: zamtg
    };
}

async function zamth(zamta) {
    var zamtb = await zamtg(zamta);
    if (zamtb) return zamtb;
    if (typeof createImageBitmap !== "undefined" && typeof OffscreenCanvas !== "undefined") {
        var zamtc = await createImageBitmap(new Blob([ zamta ]));
        var zamtd = zamtc.width, zamte = zamtc.height;
        var zamtf = new OffscreenCanvas(zamtd, zamte);
        var zamth = zamtf.getContext("2d");
        zamth.drawImage(zamtc, 0, 0);
        var zamti = zamth.getImageData(0, 0, zamtd, zamte).data;
        zamtc.close();
        return {
            data: zamti,
            width: zamtd,
            height: zamte
        };
    }
    throw new Error("SOG image decoding requires createImageBitmap and OffscreenCanvas");
}

function zamti(zamta) {
    if (zamta === 1) return 3;
    if (zamta === 2) return 8;
    if (zamta === 3) return 15;
    throw new Error("SOG shN bands must be between 1 and 3");
}

async function zamtj(zamtb) {
    var zamtc = zamtb["meta.json"];
    if (!zamtc) throw new Error("SOG archive is missing meta.json");
    var zamtd = "";
    for (var zamte = 0; zamte < zamtc.length; zamte++) zamtd += String.fromCharCode(zamtc[zamte]);
    var zamtf = JSON.parse(zamtd);
    if (zamtf.version !== 2) throw new Error("Unsupported SOG version: " + zamtf.version + " (expected 2)");
    var zamtg = zamtf.count;
    if (!Number.isInteger(zamtg) || zamtg <= 0) throw new Error("SOG meta count must be a positive integer");
    if (!zamtf.means || !zamtf.means.files || zamtf.means.files.length !== 2) throw new Error("SOG meta requires means.files with two entries");
    if (!zamtf.scales || !zamtf.scales.codebook || zamtf.scales.codebook.length !== 256) throw new Error("SOG meta requires a 256-entry scales codebook");
    if (!zamtf.quats || !zamtf.quats.files || zamtf.quats.files.length !== 1) throw new Error("SOG meta requires quats.files");
    if (!zamtf.sh0 || !zamtf.sh0.codebook || zamtf.sh0.codebook.length !== 256) throw new Error("SOG meta requires a 256-entry sh0 codebook");
    var zamtj = await zamth(zamtb[zamtf.means.files[0]]);
    var zamtk = await zamth(zamtb[zamtf.means.files[1]]);
    var zamtl = await zamth(zamtb[zamtf.quats.files[0]]);
    var zamtm = await zamth(zamtb[zamtf.scales.files[0]]);
    var zamtn = await zamth(zamtb[zamtf.sh0.files[0]]);
    if (zamtj.width !== zamtk.width || zamtj.height !== zamtk.height) throw new Error("SOG means images must share dimensions");
    if (zamtj.width !== zamtl.width || zamtj.height !== zamtl.height || zamtj.width !== zamtm.width || zamtj.height !== zamtm.height || zamtj.width !== zamtn.width || zamtj.height !== zamtn.height) throw new Error("SOG property images must share dimensions");
    if (zamtj.width * zamtj.height < zamtg) throw new Error("SOG images are too small for the declared count");
    var zamto = null, zamtp = 0, zamtq = null, zamtr = null;
    if (zamtf.shN) {
        var zamts = zamtf.shN.bands;
        if (!Number.isInteger(zamts) || zamts < 1 || zamts > 3) throw new Error("SOG shN bands must be between 1 and 3");
        if (!zamtf.shN.codebook || zamtf.shN.codebook.length !== 256) throw new Error("SOG shN requires a 256-entry codebook");
        if (!zamtf.shN.files || zamtf.shN.files.length !== 2) throw new Error("SOG shN requires centroids and labels files");
        if (!Number.isInteger(zamtf.shN.count) || zamtf.shN.count <= 0) throw new Error("SOG shN count must be a positive integer");
        zamtp = zamti(zamts);
        zamtq = await zamth(zamtb[zamtf.shN.files[0]]);
        zamtr = await zamth(zamtb[zamtf.shN.files[1]]);
        if (zamtq.width !== 64 * zamtp) throw new Error("SOG shN centroids width must be 64 * coefficients");
        if (zamtq.height < Math.ceil(zamtf.shN.count / 64)) throw new Error("SOG shN centroids image is too small");
        zamto = {
            degree: zamts,
            coefficients: new Float32Array(zamtg * zamtp * 3)
        };
    }
    var zamtt = zamtj.width;
    var zamtu = new Float32Array(zamtg * 3);
    var zamtv = new Float32Array(zamtg * 3);
    var zamtw = new Float32Array(zamtg * 4);
    var zamtx = new Float32Array(zamtg * 4);
    var zamty = zamtf.means.mins, zamtz = zamtf.means.maxs;
    var zamtaa = function(zamta) {
        return Math.sign(zamta) * (Math.exp(Math.abs(zamta)) - 1);
    };
    var zamtab = function(zamta) {
        return (zamta / 255 - .5) * 2 / Math.SQRT2;
    };
    for (var zamtac = 0; zamtac < zamtg; zamtac++) {
        var zamtad = zamtac * 4, zamtae = zamtac * 3, zamtaf = zamtac * 4;
        var zamtag = zamtk.data[zamtad] << 8 | zamtj.data[zamtad];
        var zamtah = zamtk.data[zamtad + 1] << 8 | zamtj.data[zamtad + 1];
        var zamtai = zamtk.data[zamtad + 2] << 8 | zamtj.data[zamtad + 2];
        zamtu[zamtae] = zamtaa(zamty[0] + (zamtz[0] - zamty[0]) * zamtag / 65535);
        zamtu[zamtae + 1] = zamtaa(zamty[1] + (zamtz[1] - zamty[1]) * zamtah / 65535);
        zamtu[zamtae + 2] = zamtaa(zamty[2] + (zamtz[2] - zamty[2]) * zamtai / 65535);
        zamtv[zamtae] = Math.exp(zamtf.scales.codebook[zamtm.data[zamtad]]);
        zamtv[zamtae + 1] = Math.exp(zamtf.scales.codebook[zamtm.data[zamtad + 1]]);
        zamtv[zamtae + 2] = Math.exp(zamtf.scales.codebook[zamtm.data[zamtad + 2]]);
        var zamtaj = zamtab(zamtl.data[zamtad]), zamtak = zamtab(zamtl.data[zamtad + 1]), zamtal = zamtab(zamtl.data[zamtad + 2]);
        var zamtam = zamtl.data[zamtad + 3] - 252;
        if (zamtam < 0 || zamtam > 3) throw new Error("SOG quaternion alpha channel must be in 252..255");
        var zamtan = Math.sqrt(Math.max(0, 1 - (zamtaj * zamtaj + zamtak * zamtak + zamtal * zamtal)));
        var zamtao = zamtam === 0 ? zamtan : zamtaj, zamtap = zamtam === 1 ? zamtan : zamtam === 0 ? zamtaj : zamtak, zamtaq = zamtam === 2 ? zamtan : zamtam === 3 ? zamtal : zamtak, zamtar = zamtam === 3 ? zamtan : zamtal;
        zamtw[zamtaf] = zamtap;
        zamtw[zamtaf + 1] = zamtaq;
        zamtw[zamtaf + 2] = zamtar;
        zamtw[zamtaf + 3] = zamtao;
        zamtx[zamtaf] = .5 + zamta * zamtf.sh0.codebook[zamtn.data[zamtad]];
        zamtx[zamtaf + 1] = .5 + zamta * zamtf.sh0.codebook[zamtn.data[zamtad + 1]];
        zamtx[zamtaf + 2] = .5 + zamta * zamtf.sh0.codebook[zamtn.data[zamtad + 2]];
        zamtx[zamtaf + 3] = zamtn.data[zamtad + 3] / 255;
        if (zamto) {
            var zamtas = zamtr.data[zamtad] + (zamtr.data[zamtad + 1] << 8);
            if (zamtas >= zamtf.shN.count) throw new Error("SOG shN label out of range");
            var zamtat = Math.floor(zamtas / 64), zamtau = zamtas % 64 * zamtp;
            for (var zamtav = 0; zamtav < zamtp; zamtav++) {
                var zamtaw = (zamtat * zamtq.width + zamtau + zamtav) * 4;
                zamto.coefficients[zamtac * zamtp * 3 + zamtav * 3] = zamtf.shN.codebook[zamtq.data[zamtaw]];
                zamto.coefficients[zamtac * zamtp * 3 + zamtav * 3 + 1] = zamtf.shN.codebook[zamtq.data[zamtaw + 1]];
                zamto.coefficients[zamtac * zamtp * 3 + zamtav * 3 + 2] = zamtf.shN.codebook[zamtq.data[zamtaw + 2]];
            }
        }
    }
    return {
        count: zamtg,
        positions: zamtu,
        scales: zamtv,
        rotations: zamtw,
        colors: zamtx,
        sh: zamto,
        version: zamtf.version
    };
}

class SOGLoader {
    constructor(zamta) {
        this.manager = zamta;
    }
    load(zamta, zamtb, zamtc, zamtd) {
        var zamte = this;
        var zamtf = new FileLoader(this.manager);
        zamtf.setResponseType("arraybuffer");
        zamtf.load(zamta, function(zamta) {
            zamte.parse(zamta).then(function(zamta) {
                if (zamtb) zamtb(zamta);
            }, function(zamta) {
                if (zamtd) zamtd(zamta);
            });
        }, zamtc, zamtd);
        return this;
    }
    async parse(zamta) {
        var zamtb = zamta instanceof Uint8Array ? zamta : new Uint8Array(zamta);
        var zamtc = await zamtd(zamtb);
        return zamtj(zamtc);
    }
    async parseFiles(zamta) {
        return zamtj(zamta);
    }
}

export { SOGLoader };
