import { faoxomexrinterleavescalar } from "./faoxomexrinterleavescalar.js";

import { faoxomexrpredictor } from "./faoxomexrpredictor.js";

import { faoxomexrrledecompress } from "./faoxomexrrledecompress.js";

import { faoxomfbxinflate } from "./faoxomfbxinflate.js";

import { faoxomhalftofloat } from "./faoxomhalftofloat.js";

async function faoxomdecodeexr(zadua) {
    var zadub = zadua instanceof Uint8Array ? zadua : new Uint8Array(zadua);
    var zaduc = new DataView(zadub.buffer, zadub.byteOffset, zadub.byteLength);
    if (zadub.length < 8 || zaduc.getUint32(0, true) !== 20000630) throw new Error("Not an OpenEXR file");
    var zadud = zaduc.getUint32(4, true);
    if (zadud & 512) throw new Error("Tiled EXR files are not supported");
    if (zadud & 1024) throw new Error("Deep EXR files are not supported");
    if (zadud & 4096) throw new Error("Multi-part EXR files are not supported");
    var zadue = function(zadua) {
        var zaduc = zadua;
        while (zaduc < zadub.length && zadub[zaduc] !== 0) zaduc++;
        return {
            text: String.fromCharCode.apply(null, zadub.subarray(zadua, zaduc)),
            next: zaduc + 1
        };
    };
    var zaduf = 8, zadug = null, zaduh = 0, zadui = 0, zaduj = null;
    while (zaduf < zadub.length) {
        var zaduk = zadue(zaduf);
        zaduf = zaduk.next;
        if (!zaduk.text.length) break;
        var zadul = zadue(zaduf);
        zaduf = zadul.next;
        var zadum = zaduc.getUint32(zaduf, true);
        zaduf += 4;
        if (zadul.text === "chlist") {
            zadug = [];
            var zadun = zaduf;
            while (zadun < zaduf + zadum - 1) {
                var zaduo = zadue(zadun);
                zadun = zaduo.next;
                var zadup = zaduc.getInt32(zadun, true);
                zadun += 4;
                zadun += 4;
                var zaduq = zaduc.getInt32(zadun, true);
                zadun += 4;
                var zadur = zaduc.getInt32(zadun, true);
                zadun += 4;
                zadug.push({
                    name: zaduo.text,
                    pixelType: zadup,
                    xSampling: zaduq,
                    ySampling: zadur
                });
            }
        } else if (zadul.text === "compression") zaduh = zadub[zaduf]; else if (zadul.text === "lineOrder") zadui = zadub[zaduf]; else if (zadul.text === "box2i") zaduj = {
            xMin: zaduc.getInt32(zaduf, true),
            yMin: zaduc.getInt32(zaduf + 4, true),
            xMax: zaduc.getInt32(zaduf + 8, true),
            yMax: zaduc.getInt32(zaduf + 12, true)
        };
        zaduf += zadum;
    }
    if (!zadug || !zadug.length) throw new Error("EXR file has no channels");
    if (!zaduj) throw new Error("EXR file has no data window");
    var zadus = zaduj.xMax - zaduj.xMin + 1, zadut = zaduj.yMax - zaduj.yMin + 1;
    if (zadus <= 0 || zadut <= 0) throw new Error("Invalid EXR data window");
    var zaduu = [ "none", "rle", "zips", "zip", "piz", "pxr24", "b44", "b44a", "dwaa", "dwab" ];
    if (zaduh > 3) throw new Error("Unsupported EXR compression " + zaduu[zaduh]);
    var zaduv = {
        R: 0,
        G: 1,
        B: 2,
        A: 3,
        Y: -2,
        RY: -3,
        BY: -3
    };
    var zaduw = zadug.some(function(zadua) {
        return zadua.name === "Y";
    });
    if (zaduw) {
        zaduv.Y = 0;
        zaduv.RY = 1;
        zaduv.BY = 2;
        zaduv.A = 3;
    }
    var zadux = [], zaduy = [], zaduz = [], zaduaa = 0, zaduab = 0;
    for (var zaduac = 0; zaduac < zadug.length; zaduac++) {
        var zaduad = zadug[zaduac];
        if (zaduad.xSampling !== 1 || zaduad.ySampling !== 1) throw new Error("Subsampled EXR channels are not supported");
        if (zaduad.pixelType === 0) throw new Error("UINT EXR channels are not supported");
        var zaduae = zaduv[zaduad.name];
        if (zaduae === undefined || zaduae === -3) {
            zadux.push(-1);
        } else {
            zadux.push(zaduae);
            zaduab++;
        }
        zaduy.push(zaduaa);
        var zaduaf = zaduad.pixelType === 2 ? 4 : 2;
        zaduz.push(zaduaf);
        zaduaa += zaduaf;
    }
    if (!zaduab) throw new Error("EXR file has no supported color channels");
    var zaduag = zadus * zaduaa;
    var zaduah = zaduh === 3 ? 16 : 1;
    var zaduai = Math.ceil(zadut / zaduah);
    var zaduaj = zaduf;
    var zaduak = new Float32Array(zadus * zadut * 4);
    for (var zadual = 3; zadual < zaduak.length; zadual += 4) zaduak[zadual] = 1;
    for (var zaduam = 0; zaduam < zaduai; zaduam++) {
        var zaduan = zaduc.getUint32(zaduaj + zaduam * 8, true) + zaduc.getUint32(zaduaj + zaduam * 8 + 4, true) * 4294967296;
        var zaduao = zaduc.getInt32(zaduan, true) - zaduj.yMin;
        var zaduap = zaduc.getUint32(zaduan + 4, true);
        var zaduaq = zadub.subarray(zaduan + 8, zaduan + 8 + zaduap);
        var zaduar = Math.min(zaduah, zadut - zaduao);
        if (zaduar <= 0) continue;
        var zaduas = zaduar * zaduag;
        var zaduat = zaduaq;
        if (zaduh !== 0 && zaduap < zaduas) {
            zaduat = zaduh === 1 ? faoxomexrrledecompress(zaduaq) : await faoxomfbxinflate(zaduaq);
            var zaduau = new Uint8Array(zaduat.length);
            faoxomexrpredictor(zaduat);
            faoxomexrinterleavescalar(zaduat, zaduau);
            zaduat = zaduau;
        }
        if (zaduat.length < zaduas) throw new Error("Corrupt EXR scanline block");
        var zaduav = new DataView(zaduat.buffer, zaduat.byteOffset, zaduat.byteLength);
        for (var zaduaw = 0; zaduaw < zaduar; zaduaw++) {
            var zaduax = zaduaw * zaduag;
            for (var zaduay = 0; zaduay < zadug.length; zaduay++) {
                var zaduaz = zadux[zaduay];
                if (zaduaz < 0) continue;
                var zaduba = zaduax + zaduy[zaduay] * zadus;
                var zadubb = zaduz[zaduay];
                for (var zadubc = 0; zadubc < zadus; zadubc++) {
                    var zadubd = zadubb === 4 ? zaduav.getFloat32(zaduba + zadubc * 4, true) : faoxomhalftofloat(zaduav.getUint16(zaduba + zadubc * 2, true));
                    zaduak[((zaduao + zaduaw) * zadus + zadubc) * 4 + zaduaz] = zadubd;
                }
            }
        }
    }
    return {
        data: zaduak,
        width: zadus,
        height: zadut,
        channels: zadug.map(function(zadua) {
            return zadua.name;
        }),
        compression: zaduu[zaduh]
    };
}

export { faoxomdecodeexr };
