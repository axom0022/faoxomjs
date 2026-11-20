import { BufferAttribute, faoxommd2normals } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

import { faoxommd2animations } from "./faoxommd2animations.js";

function faoxomdecodemd2(zanda) {
    var zandb = zanda instanceof Uint8Array ? zanda : new Uint8Array(zanda);
    var zandc = new DataView(zandb.buffer, zandb.byteOffset, zandb.byteLength);
    var zandd = [ "ident", "version", "skinwidth", "skinheight", "framesize", "numSkins", "numVertices", "numSt", "numTris", "numGlcmds", "numFrames", "offsetSkins", "offsetSt", "offsetTris", "offsetFrames", "offsetGlcmds", "offsetEnd" ];
    var zande = {};
    for (var zandf = 0; zandf < zandd.length; zandf++) zande[zandd[zandf]] = zandc.getInt32(zandf * 4, true);
    if (zande.ident !== 844121161 || zande.version !== 8) throw new Error("Not a valid MD2 file");
    if (zande.offsetEnd !== zandb.length) throw new Error("Corrupted MD2 file");
    var zandg = [];
    var zandh = zande.offsetSt;
    for (var zandi = 0; zandi < zande.numSt; zandi++) {
        var zandj = zandc.getInt16(zandh, true), zandk = zandc.getInt16(zandh + 2, true);
        zandg.push(zandj / zande.skinwidth, 1 - zandk / zande.skinheight);
        zandh += 4;
    }
    var zandl = [], zandm = [];
    zandh = zande.offsetTris;
    for (var zandn = 0; zandn < zande.numTris; zandn++) {
        zandl.push(zandc.getUint16(zandh, true), zandc.getUint16(zandh + 2, true), zandc.getUint16(zandh + 4, true));
        zandm.push(zandc.getUint16(zandh + 6, true), zandc.getUint16(zandh + 8, true), zandc.getUint16(zandh + 10, true));
        zandh += 12;
    }
    var zando = [];
    zandh = zande.offsetFrames;
    for (var zandp = 0; zandp < zande.numFrames; zandp++) {
        var zandq = zandc.getFloat32(zandh, true), zandr = zandc.getFloat32(zandh + 4, true), zands = zandc.getFloat32(zandh + 8, true);
        var zandt = zandc.getFloat32(zandh + 12, true), zandu = zandc.getFloat32(zandh + 16, true), zandv = zandc.getFloat32(zandh + 20, true);
        zandh += 24;
        var zandw = [];
        for (var zandx = 0; zandx < 16; zandx++) {
            var zandy = zandc.getUint8(zandh + zandx);
            if (zandy === 0) break;
            zandw.push(zandy);
        }
        zandh += 16;
        var zandz = {
            name: String.fromCharCode.apply(null, zandw),
            vertices: [],
            normals: []
        };
        for (var zandaa = 0; zandaa < zande.numVertices; zandaa++) {
            var zandab = zandc.getUint8(zandh++), zandac = zandc.getUint8(zandh++), zandad = zandc.getUint8(zandh++);
            var zandae = zandc.getUint8(zandh++) * 3;
            zandz.vertices.push(zandab * zandq + zandt, zandad * zands + zandv, zandac * zandr + zandu);
            zandz.normals.push(faoxommd2normals[zandae], faoxommd2normals[zandae + 2], faoxommd2normals[zandae + 1]);
        }
        zando.push(zandz);
    }
    var zandaf = new Geometry;
    var zandag = [], zandah = [], zandai = [];
    var zandaj = zando[0].vertices, zandak = zando[0].normals;
    for (var zandal = 0; zandal < zandl.length; zandal++) {
        zandag.push(zandaj[zandl[zandal] * 3], zandaj[zandl[zandal] * 3 + 1], zandaj[zandl[zandal] * 3 + 2]);
        zandah.push(zandak[zandl[zandal] * 3], zandak[zandl[zandal] * 3 + 1], zandak[zandl[zandal] * 3 + 2]);
        zandai.push(zandg[zandm[zandal] * 2], zandg[zandm[zandal] * 2 + 1]);
    }
    zandaf.setAttribute("position", new Float32Array(zandag), 3);
    zandaf.setAttribute("normal", new Float32Array(zandah), 3);
    zandaf.setAttribute("uv", new Float32Array(zandai), 2);
    var zandam = [], zandan = [];
    for (var zandao = 0; zandao < zando.length; zandao++) {
        var zandap = zando[zandao];
        var zandaq = [], zandar = [];
        for (var zandas = 0; zandas < zandl.length; zandas++) {
            zandaq.push(zandap.vertices[zandl[zandas] * 3], zandap.vertices[zandl[zandas] * 3 + 1], zandap.vertices[zandl[zandas] * 3 + 2]);
            zandar.push(zandap.normals[zandl[zandas] * 3], zandap.normals[zandl[zandas] * 3 + 1], zandap.normals[zandl[zandas] * 3 + 2]);
        }
        var zandat = new BufferAttribute(new Float32Array(zandaq), 3);
        zandat.name = zandap.name;
        zandam.push(zandat);
        var zandau = new BufferAttribute(new Float32Array(zandar), 3);
        zandau.name = zandap.name;
        zandan.push(zandau);
    }
    zandaf.setMorphAttribute("position", zandam);
    zandaf.setMorphAttribute("normal", zandan);
    zandaf.morphTargetsRelative = false;
    zandaf.animations = faoxommd2animations(zando);
    zandaf.userData.morphTargetDictionary = {};
    for (var zandav = 0; zandav < zandam.length; zandav++) zandaf.userData.morphTargetDictionary[zandam[zandav].name] = zandav;
    zandaf.computeBoundingBox();
    zandaf.computeBoundingSphere();
    return zandaf;
}

export { faoxomdecodemd2 };
