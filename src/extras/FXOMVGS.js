import { Matrix4 } from "../math/index.js";

import { Geometry } from "../geometries/Geometry.js";

import { MeshletSet } from "./MeshletSet.js";

import { GeometryPageCodec, RuntimeGeometryCache } from "./CompressedGeometryPage.js";

import { GPUResidencyManager2 } from "./GPUResidencyManager2.js";

const zahea = `struct fxparams {\n    viewpos: vec4<f32>,\n    planes: array<vec4<f32>, 6>,\n    misc: vec4<f32>,\n    misc2: vec4<f32>,\n};\nstruct fxcluster {\n    a: vec4<f32>,\n    b: vec4<f32>,\n    c: vec4<f32>,\n};\n@group(0) @binding(0) var<uniform> params: fxparams;\n@group(0) @binding(1) var<storage, read> clusters: array<fxcluster>;\n@group(0) @binding(2) var<storage, read_write> sel: array<u32>;\n@group(0) @binding(3) var<storage, read_write> flags: array<atomic<u32>>;\n@group(0) @binding(4) var<storage, read> resident: array<u32>;\nfn fxscreenerr(i: u32) -> f32 {\n    let c = clusters[i];\n    var d = length(params.viewpos.xyz - c.a.xyz) - c.a.w;\n    if (d < 0.001) { d = 0.001; }\n    return c.c.x * params.viewpos.w / d;\n}\nfn fxvisible(i: u32) -> u32 {\n    let c = clusters[i];\n    var vis = 1u;\n    if (params.misc.y > 0.5 && c.c.w > 0.5) {\n        var u = params.viewpos.xyz - c.a.xyz;\n        var r = length(u);\n        if (r < 0.000001) {\n            u = vec3<f32>(0.0, 1.0, 0.0);\n            r = 1.0;\n        } else {\n            u = u / r;\n        }\n        let cosb = dot(u, c.b.xyz);\n        let sinb = sqrt(max(0.0, 1.0 - cosb * cosb));\n        let sintheta = sqrt(max(0.0, 1.0 - c.b.w * c.b.w));\n        let bbound = cosb * c.b.w + sinb * sintheta;\n        if (cosb < c.b.w && bbound < -1.0e-6 && r * (-bbound) >= c.a.w) {\n            vis = 0u;\n        }\n    }\n    if (vis == 1u) {\n        var p = 0;\n        loop {\n            if (p >= 6) {\n                break;\n            }\n            var dist = dot(params.planes[p].xyz, c.a.xyz) + params.planes[p].w;\n            if (dist < -c.a.w) {\n                vis = 0u;\n            }\n            p = p + 1;\n        }\n    }\n    return vis;\n}\n@compute @workgroup_size(64)\nfn fxmain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    if (gid.x >= u32(params.misc.x)) {\n        return;\n    }\n    let i = u32(params.misc.w) + gid.x;\n    let c = clusters[i];\n    let want = fxscreenerr(i) <= params.misc.z;\n    var parentwanted = false;\n    if (c.c.y >= 0.0) {\n        parentwanted = fxscreenerr(u32(c.c.y)) <= params.misc.z;\n    }\n    let desired = fxvisible(i) == 1u && want && (c.c.y < 0.0 || !parentwanted);\n    let fb = atomicLoad(&flags[i]);\n    var res = 1u;\n    if (params.misc2.x > 0.5) {\n        res = resident[i];\n    }\n    if (res == 1u) {\n        var outv = 0u;\n        if (desired || fb > 0u) {\n            outv = 1u;\n        }\n        sel[i] = outv;\n    } else {\n        sel[i] = 0u;\n        if (desired || fb > 0u) {\n            if (c.c.y >= 0.0) {\n                atomicOr(&flags[u32(c.c.y)], 1u);\n            }\n        }\n    }\n}`;

function zaheb(zahea, zaheb, zahec, zahed, zahee, zahef, zaheg) {
    var zaheh = zahea[0], zahei = zahea[1], zahej = zahea[2], zahek = zahea[3];
    var zahel = zahea[4], zahem = zahea[5], zahen = zahea[6];
    var zaheo = zahea[7], zahep = zahea[8], zaheq = zahea[9];
    var zaher = zaheh, zahes = zahei, zahet = zahej;
    var zaheu = zahei, zahev = zahel, zahew = zahem;
    var zahex = zahej, zahey = zahem, zahez = zaheo;
    var zaheaa = -zahek, zaheab = -zahen, zaheac = -zahep;
    var zahead = zaher * (zahev * zahez - zahew * zahey) - zahes * (zaheu * zahez - zahew * zahex) + zahet * (zaheu * zahey - zahev * zahex);
    var zaheae = (zaheb + zahee) * .5, zaheaf = (zahec + zahef) * .5, zaheag = (zahed + zaheg) * .5;
    if (Math.abs(zahead) > 1e-10) {
        var zaheah = zaheaa * (zahev * zahez - zahew * zahey) - zahes * (zaheab * zahez - zahew * zaheac) + zahet * (zaheab * zahey - zahev * zaheac);
        var zaheai = zaher * (zaheab * zahez - zahew * zaheac) - zaheaa * (zaheu * zahez - zahew * zahex) + zahet * (zaheu * zaheac - zaheab * zahex);
        var zaheaj = zaher * (zahev * zaheac - zaheab * zahey) - zahes * (zaheu * zaheac - zaheab * zahex) + zaheaa * (zaheu * zahey - zahev * zahex);
        zaheae = zaheah / zahead;
        zaheaf = zaheai / zahead;
        zaheag = zaheaj / zahead;
        if (!isFinite(zaheae) || !isFinite(zaheaf) || !isFinite(zaheag)) {
            zaheae = (zaheb + zahee) * .5;
            zaheaf = (zahec + zahef) * .5;
            zaheag = (zahed + zaheg) * .5;
        }
    }
    var zaheak = zaheae, zaheal = zaheaf, zaheam = zaheag, zahean = 1;
    var zaheao = zaheh * zaheak * zaheak + 2 * zahei * zaheak * zaheal + 2 * zahej * zaheak * zaheam + 2 * zahek * zaheak * zahean + zahel * zaheal * zaheal + 2 * zahem * zaheal * zaheam + 2 * zahen * zaheal * zahean + zaheo * zaheam * zaheam + 2 * zahep * zaheam * zahean + zaheq * zahean * zahean;
    if (!isFinite(zaheao)) zaheao = 1e30;
    if (zaheao < 0) zaheao = 0;
    return {
        x: zaheae,
        y: zaheaf,
        z: zaheag,
        cost: zaheao
    };
}

function zahec(zahea, zahec, zahed, zahee, zahef, zaheg, zaheh) {
    var zahei = zahea.length / 3;
    var zahej = zahee.length / 3;
    var zahek = new Uint8Array(zahei);
    var zahel = new Uint8Array(zahej);
    for (var zahem = 0; zahem < zahei; zahem++) zahek[zahem] = 1;
    for (var zahen = 0; zahen < zahej; zahen++) zahel[zahen] = 1;
    var zaheo = zahej;
    var zahep = new Float64Array(zaheg);
    var zaheq = 0;
    var zaher = zahei * 4 + 16;
    while (zaheo > zaheh && zaheq < zaher) {
        zaheq++;
        var zahes = new Float64Array(zahei * 10);
        for (var zahet = 0; zahet < zahej; zahet++) {
            if (!zahel[zahet]) continue;
            var zaheu = zahee[zahet * 3], zahev = zahee[zahet * 3 + 1], zahew = zahee[zahet * 3 + 2];
            var zahex = zahea[zaheu * 3], zahey = zahea[zaheu * 3 + 1], zahez = zahea[zaheu * 3 + 2];
            var zaheaa = zahea[zahev * 3], zaheab = zahea[zahev * 3 + 1], zaheac = zahea[zahev * 3 + 2];
            var zahead = zahea[zahew * 3], zaheae = zahea[zahew * 3 + 1], zaheaf = zahea[zahew * 3 + 2];
            var zaheag = zaheaa - zahex, zaheah = zaheab - zahey, zaheai = zaheac - zahez;
            var zaheaj = zahead - zahex, zaheak = zaheae - zahey, zaheal = zaheaf - zahez;
            var zaheam = zaheah * zaheal - zaheai * zaheak, zahean = zaheai * zaheaj - zaheag * zaheal, zaheao = zaheag * zaheak - zaheah * zaheaj;
            var zaheap = Math.sqrt(zaheam * zaheam + zahean * zahean + zaheao * zaheao);
            if (zaheap < 1e-12) continue;
            zaheam /= zaheap;
            zahean /= zaheap;
            zaheao /= zaheap;
            var zaheaq = zaheap * .5;
            var zahear = -(zaheam * zahex + zahean * zahey + zaheao * zahez);
            var zaheas = zaheaq;
            var zaheat = [ zaheu, zahev, zahew ];
            for (var zaheau = 0; zaheau < 3; zaheau++) {
                var zaheav = zaheat[zaheau] * 10;
                zahes[zaheav] += zaheam * zaheam * zaheas;
                zahes[zaheav + 1] += zaheam * zahean * zaheas;
                zahes[zaheav + 2] += zaheam * zaheao * zaheas;
                zahes[zaheav + 3] += zaheam * zahear * zaheas;
                zahes[zaheav + 4] += zahean * zahean * zaheas;
                zahes[zaheav + 5] += zahean * zaheao * zaheas;
                zahes[zaheav + 6] += zahean * zahear * zaheas;
                zahes[zaheav + 7] += zaheao * zaheao * zaheas;
                zahes[zaheav + 8] += zaheao * zahear * zaheas;
                zahes[zaheav + 9] += zahear * zahear * zaheas;
            }
        }
        var zaheaw = [];
        var zaheax = [];
        var zaheay = [];
        var zaheaz = [];
        var zaheba = new Map;
        for (var zahebb = 0; zahebb < zahej; zahebb++) {
            if (!zahel[zahebb]) continue;
            for (var zahebc = 0; zahebc < 3; zahebc++) {
                var zahebd = zahee[zahebb * 3 + zahebc];
                var zahebe = zahee[zahebb * 3 + (zahebc + 1) % 3];
                var zahebf = zahebd < zahebe ? zahebd : zahebe;
                var zahebg = zahebd < zahebe ? zahebe : zahebd;
                var zahebh = zahebf * zahei + zahebg;
                var zahebi = zaheba.get(zahebh);
                if (zahebi === undefined) {
                    zahebi = zaheaw.length;
                    zaheba.set(zahebh, zahebi);
                    zaheax.push(zahebf);
                    zaheay.push(zahebg);
                    zaheaz.push([]);
                    zaheaw.push(zahebh);
                }
                zaheaz[zahebi].push(zahebb);
            }
        }
        for (var zahebj = 0; zahebj < zaheaw.length; zahebj++) {
            if (zaheaz[zahebj].length !== 1) continue;
            var zahebk = zaheaz[zahebj][0];
            var zahebl = zaheax[zahebj], zahebm = zaheay[zahebj];
            var zahebn = zahea[zahebl * 3], zahebo = zahea[zahebl * 3 + 1], zahebp = zahea[zahebl * 3 + 2];
            var zahebq = zahea[zahebm * 3], zahebr = zahea[zahebm * 3 + 1], zahebs = zahea[zahebm * 3 + 2];
            var zahebt = zahee[zahebk * 3], zahebu = zahee[zahebk * 3 + 1], zahebv = zahee[zahebk * 3 + 2];
            var zahebw = zahea[zahebt * 3], zahebx = zahea[zahebt * 3 + 1], zaheby = zahea[zahebt * 3 + 2];
            var zahebz = zahea[zahebu * 3], zaheca = zahea[zahebu * 3 + 1], zahecb = zahea[zahebu * 3 + 2];
            var zahecc = zahea[zahebv * 3], zahecd = zahea[zahebv * 3 + 1], zahece = zahea[zahebv * 3 + 2];
            var zahecf = (zaheca - zahebx) * (zahece - zaheby) - (zahecb - zaheby) * (zahecd - zahebx);
            var zahecg = (zahecb - zaheby) * (zahecc - zahebw) - (zahebz - zahebw) * (zahece - zaheby);
            var zahech = (zahebz - zahebw) * (zahecd - zahebx) - (zaheca - zahebx) * (zahecc - zahebw);
            var zaheci = Math.sqrt(zahecf * zahecf + zahecg * zahecg + zahech * zahech) || 1;
            zahecf /= zaheci;
            zahecg /= zaheci;
            zahech /= zaheci;
            var zahecj = zahebq - zahebn, zaheck = zahebr - zahebo, zahecl = zahebs - zahebp;
            var zahecm = zaheck * zahech - zahecl * zahecg;
            var zahecn = zahecl * zahecf - zahecj * zahech;
            var zaheco = zahecj * zahecg - zaheck * zahecf;
            var zahecp = Math.sqrt(zahecm * zahecm + zahecn * zahecn + zaheco * zaheco);
            if (zahecp < 1e-12) continue;
            zahecm /= zahecp;
            zahecn /= zahecp;
            zaheco /= zahecp;
            var zahecq = -(zahecm * zahebn + zahecn * zahebo + zaheco * zahebp);
            var zahecr = 100;
            var zahecs = [ zahebl, zahebm ];
            for (var zahect = 0; zahect < 2; zahect++) {
                var zahecu = zahecs[zahect] * 10;
                zahes[zahecu] += zahecm * zahecm * zahecr;
                zahes[zahecu + 1] += zahecm * zahecn * zahecr;
                zahes[zahecu + 2] += zahecm * zaheco * zahecr;
                zahes[zahecu + 3] += zahecm * zahecq * zahecr;
                zahes[zahecu + 4] += zahecn * zahecn * zahecr;
                zahes[zahecu + 5] += zahecn * zaheco * zahecr;
                zahes[zahecu + 6] += zahecn * zahecq * zahecr;
                zahes[zahecu + 7] += zaheco * zaheco * zahecr;
                zahes[zahecu + 8] += zaheco * zahecq * zahecr;
                zahes[zahecu + 9] += zahecq * zahecq * zahecr;
            }
        }
        var zahecv = -1, zahecw = Infinity, zahecx = -1, zahecy = null;
        for (var zahecz = 0; zahecz < zaheaw.length; zahecz++) {
            if (zaheaz[zahecz].length !== 2) continue;
            var zaheda = zaheax[zahecz], zahedb = zaheay[zahecz];
            var zahedc = zahes.slice(zaheda * 10, zaheda * 10 + 10);
            var zahedd = zahes.slice(zahedb * 10, zahedb * 10 + 10);
            var zahede = [];
            for (var zahedf = 0; zahedf < 10; zahedf++) zahede.push(zahedc[zahedf] + zahedd[zahedf]);
            var zahedg = zaheb(zahede, zahea[zaheda * 3], zahea[zaheda * 3 + 1], zahea[zaheda * 3 + 2], zahea[zahedb * 3], zahea[zahedb * 3 + 1], zahea[zahedb * 3 + 2]);
            if (!isFinite(zahedg.cost)) continue;
            var zahedh = zaheda * zahei + zahedb;
            if (zahedg.cost < zahecw - 1e-14 || zahedg.cost - zahecw <= 1e-14 && zahedg.cost - zahecw >= -1e-14 && zahedh < zahecx) {
                zahecv = zahecz;
                zahecw = zahedg.cost;
                zahecx = zahedh;
                zahecy = zahedg;
            }
        }
        if (zahecv < 0 || !zahecy) break;
        var zahedi = zaheax[zahecv], zahedj = zaheay[zahecv];
        var zahedk = Math.max(Math.sqrt((zahecy.x - zahea[zahedi * 3]) * (zahecy.x - zahea[zahedi * 3]) + (zahecy.y - zahea[zahedi * 3 + 1]) * (zahecy.y - zahea[zahedi * 3 + 1]) + (zahecy.z - zahea[zahedi * 3 + 2]) * (zahecy.z - zahea[zahedi * 3 + 2])), Math.sqrt((zahecy.x - zahea[zahedj * 3]) * (zahecy.x - zahea[zahedj * 3]) + (zahecy.y - zahea[zahedj * 3 + 1]) * (zahecy.y - zahea[zahedj * 3 + 1]) + (zahecy.z - zahea[zahedj * 3 + 2]) * (zahecy.z - zahea[zahedj * 3 + 2])));
        for (var zahedl = 0; zahedl < zahej; zahedl++) {
            if (!zahel[zahedl]) continue;
            var zahedm = zahee[zahedl * 3], zahedn = zahee[zahedl * 3 + 1], zahedo = zahee[zahedl * 3 + 2];
            var zahedp = zahedm === zahedi || zahedn === zahedi || zahedo === zahedi;
            var zahedq = zahedm === zahedj || zahedn === zahedj || zahedo === zahedj;
            if (!zahedp && !zahedq) continue;
            if (zahep[zahef[zahedl]] < zahedk) zahep[zahef[zahedl]] = zahedk;
            if (zahedp && zahedq) {
                zahel[zahedl] = 0;
                zaheo--;
                continue;
            }
            if (zahedm === zahedj) zahee[zahedl * 3] = zahedi;
            if (zahedn === zahedj) zahee[zahedl * 3 + 1] = zahedi;
            if (zahedo === zahedj) zahee[zahedl * 3 + 2] = zahedi;
        }
        zahea[zahedi * 3] = zahecy.x;
        zahea[zahedi * 3 + 1] = zahecy.y;
        zahea[zahedi * 3 + 2] = zahecy.z;
        if (zahed) {
            zahed[zahedi * 2] = (zahed[zahedi * 2] + zahed[zahedj * 2]) * .5;
            zahed[zahedi * 2 + 1] = (zahed[zahedi * 2 + 1] + zahed[zahedj * 2 + 1]) * .5;
        }
        zahek[zahedj] = 0;
    }
    var zahedr = new Int32Array(zahei);
    for (var zaheds = 0; zaheds < zahei; zaheds++) zahedr[zaheds] = -1;
    var zahedt = [], zahedu = [], zahedv = zahed ? [] : null, zahedw = [];
    var zahedx = 0;
    for (var zahedo = 0; zahedo < zahei; zahedo++) {
        if (!zahek[zahedo]) continue;
        zahedr[zahedo] = zahedx++;
        zahedt.push(zahea[zahedo * 3], zahea[zahedo * 3 + 1], zahea[zahedo * 3 + 2]);
        if (zahedv) zahedv.push(zahed[zahedo * 2], zahed[zahedo * 2 + 1]);
    }
    for (var zahedy = 0; zahedy < zahej; zahedy++) {
        if (!zahel[zahedy]) continue;
        zahedw.push(zahedr[zahee[zahedy * 3]], zahedr[zahee[zahedy * 3 + 1]], zahedr[zahee[zahedy * 3 + 2]]);
    }
    var zahedz = new Float64Array(zahedt.length);
    for (var zaheea = 0; zaheea * 3 < zahedw.length; zaheea++) {
        var zaheeb = zahedw[zaheea * 3], zaheec = zahedw[zaheea * 3 + 1], zaheed = zahedw[zaheea * 3 + 2];
        var zaheee = zahedt[zaheeb * 3], zaheef = zahedt[zaheeb * 3 + 1], zaheeg = zahedt[zaheeb * 3 + 2];
        var zaheeh = zahedt[zaheec * 3], zaheei = zahedt[zaheec * 3 + 1], zaheej = zahedt[zaheec * 3 + 2];
        var zaheek = zahedt[zaheed * 3], zaheel = zahedt[zaheed * 3 + 1], zaheem = zahedt[zaheed * 3 + 2];
        var zaheen = (zaheei - zaheef) * (zaheem - zaheeg) - (zaheej - zaheeg) * (zaheel - zaheef);
        var zaheeo = (zaheej - zaheeg) * (zaheek - zaheee) - (zaheeh - zaheee) * (zaheem - zaheeg);
        var zaheep = (zaheeh - zaheee) * (zaheel - zaheef) - (zaheei - zaheef) * (zaheek - zaheee);
        zahedz[zaheeb * 3] += zaheen;
        zahedz[zaheeb * 3 + 1] += zaheeo;
        zahedz[zaheeb * 3 + 2] += zaheep;
        zahedz[zaheec * 3] += zaheen;
        zahedz[zaheec * 3 + 1] += zaheeo;
        zahedz[zaheec * 3 + 2] += zaheep;
        zahedz[zaheed * 3] += zaheen;
        zahedz[zaheed * 3 + 1] += zaheeo;
        zahedz[zaheed * 3 + 2] += zaheep;
    }
    for (var zaheeq = 0; zaheeq < zahedz.length; zaheeq += 3) {
        var zaheer = Math.sqrt(zahedz[zaheeq] * zahedz[zaheeq] + zahedz[zaheeq + 1] * zahedz[zaheeq + 1] + zahedz[zaheeq + 2] * zahedz[zaheeq + 2]);
        if (zaheer > 1e-12) {
            zahedu.push(zahedz[zaheeq] / zaheer, zahedz[zaheeq + 1] / zaheer, zahedz[zaheeq + 2] / zaheer);
        } else {
            zahedu.push(0, 1, 0);
        }
    }
    return {
        pos: zahedt,
        nrm: zahedu,
        uv: zahedv,
        idx: zahedw,
        pendingErr: zahep,
        collapses: zaheq
    };
}

function zahed(zahea, zaheb) {
    var zahec = 1e30, zahed = 1e30, zahee = 1e30, zahef = -1e30, zaheg = -1e30, zaheh = -1e30;
    var zahei = {};
    for (var zahej = 0; zahej < zaheb.length; zahej++) zahei[zaheb[zahej]] = 1;
    var zahek = 0, zahel = 0, zahem = 0, zahen = 0;
    for (var zaheo in zahei) {
        var zahep = zaheo | 0;
        var zaheq = zahea[zahep * 3], zaher = zahea[zahep * 3 + 1], zahes = zahea[zahep * 3 + 2];
        if (zaheq < zahec) zahec = zaheq;
        if (zaher < zahed) zahed = zaher;
        if (zahes < zahee) zahee = zahes;
        if (zaheq > zahef) zahef = zaheq;
        if (zaher > zaheg) zaheg = zaher;
        if (zahes > zaheh) zaheh = zahes;
        zahek += zaheq;
        zahel += zaher;
        zahem += zahes;
        zahen++;
    }
    if (zahen === 0) {
        zahec = zahed = zahee = zahef = zaheg = zaheh = 0;
        zahek = zahel = zahem = 0;
        zahen = 1;
    }
    var zahet = zahek / zahen, zaheu = zahel / zahen, zahev = zahem / zahen;
    var zahew = 0;
    for (var zahex in zahei) {
        var zahey = zahex | 0;
        var zahez = zahea[zahey * 3] - zahet, zaheaa = zahea[zahey * 3 + 1] - zaheu, zaheab = zahea[zahey * 3 + 2] - zahev;
        var zaheac = zahez * zahez + zaheaa * zaheaa + zaheab * zaheab;
        if (zaheac > zahew) zahew = zaheac;
    }
    zahew = Math.sqrt(zahew);
    var zahead = 0, zaheae = 0, zaheaf = 0;
    for (var zaheag = 0; zaheag * 3 < zaheb.length; zaheag++) {
        var zaheah = zaheb[zaheag * 3], zaheai = zaheb[zaheag * 3 + 1], zaheaj = zaheb[zaheag * 3 + 2];
        var zaheak = zahea[zaheai * 3] - zahea[zaheah * 3], zaheal = zahea[zaheai * 3 + 1] - zahea[zaheah * 3 + 1], zaheam = zahea[zaheai * 3 + 2] - zahea[zaheah * 3 + 2];
        var zahean = zahea[zaheaj * 3] - zahea[zaheah * 3], zaheao = zahea[zaheaj * 3 + 1] - zahea[zaheah * 3 + 1], zaheap = zahea[zaheaj * 3 + 2] - zahea[zaheah * 3 + 2];
        var zaheaq = zaheal * zaheap - zaheam * zaheao, zahear = zaheam * zahean - zaheak * zaheap, zaheas = zaheak * zaheao - zaheal * zahean;
        zahead += zaheaq;
        zaheae += zahear;
        zaheaf += zaheas;
    }
    var zaheat = Math.sqrt(zahead * zahead + zaheae * zaheae + zaheaf * zaheaf);
    var zaheau = [ 0, 1, 0 ], zaheav = -1, zaheaw = 0;
    if (zaheat > 1e-6) {
        zaheau = [ zahead / zaheat, zaheae / zaheat, zaheaf / zaheat ];
        var zaheax = 1;
        for (var zaheay = 0; zaheay * 3 < zaheb.length; zaheay++) {
            var zaheaz = zaheb[zaheay * 3], zaheba = zaheb[zaheay * 3 + 1], zahebb = zaheb[zaheay * 3 + 2];
            var zahebc = zahea[zaheba * 3] - zahea[zaheaz * 3], zahebd = zahea[zaheba * 3 + 1] - zahea[zaheaz * 3 + 1], zahebe = zahea[zaheba * 3 + 2] - zahea[zaheaz * 3 + 2];
            var zahebf = zahea[zahebb * 3] - zahea[zaheaz * 3], zahebg = zahea[zahebb * 3 + 1] - zahea[zaheaz * 3 + 1], zahebh = zahea[zahebb * 3 + 2] - zahea[zaheaz * 3 + 2];
            var zahebi = zahebd * zahebh - zahebe * zahebg, zahebj = zahebe * zahebf - zahebc * zahebh, zahebk = zahebc * zahebg - zahebd * zahebf;
            var zahebl = zahebi * zaheau[0] + zahebj * zaheau[1] + zahebk * zaheau[2];
            if (zahebl < zaheax) zaheax = zahebl;
        }
        zaheav = zaheax;
        if (zaheax > -.98) zaheaw = 1;
    }
    return {
        center: [ zahet, zaheu, zahev ],
        radius: zahew,
        min: [ zahec, zahed, zahee ],
        max: [ zahef, zaheg, zaheh ],
        axis: zaheau,
        cosThetaMax: zaheav,
        cullable: zaheaw
    };
}

class FXOMVertexPullingStore {
    constructor(device, options) {
        options = options || {};
        this.device = device || null;
        this.vertexCapacity = Math.max(1024, options.vertexCapacity || 65536);
        this.indexCapacity = Math.max(1024, options.indexCapacity || 196608);
        this.positions = new Float32Array(this.vertexCapacity * 3);
        this.normals = new Float32Array(this.vertexCapacity * 3);
        this.uvs = new Float32Array(this.vertexCapacity * 2);
        this.indices = new Uint32Array(this.indexCapacity);
        this.vertexCount = 0;
        this.indexCount = 0;
        this.pages = new Map;
        this.buffers = Object.create(null);
        this.dirty = false;
        this.stats = { pages: 0, vertices: 0, indices: 0, uploads: 0, uploadedBytes: 0, resizes: 0, compactions: 0 };
    }
    ensure(vertices, indices) {
        var resized = false;
        if (vertices > this.vertexCapacity) {
            var vertexCapacity = this.vertexCapacity;
            while (vertexCapacity < vertices) vertexCapacity *= 2;
            var positions = new Float32Array(vertexCapacity * 3), normals = new Float32Array(vertexCapacity * 3), uvs = new Float32Array(vertexCapacity * 2);
            positions.set(this.positions); normals.set(this.normals); uvs.set(this.uvs);
            this.positions = positions; this.normals = normals; this.uvs = uvs; this.vertexCapacity = vertexCapacity; resized = true;
        }
        if (indices > this.indexCapacity) {
            var indexCapacity = this.indexCapacity;
            while (indexCapacity < indices) indexCapacity *= 2;
            var indexArray = new Uint32Array(indexCapacity); indexArray.set(this.indices);
            this.indices = indexArray; this.indexCapacity = indexCapacity; resized = true;
        }
        if (resized) { this.destroyBuffers(); this.stats.resizes++; }
    }
    addPage(id, decoded) {
        if (this.pages.has(id)) return this.pages.get(id);
        var positions = decoded.attributes.position, normals = decoded.attributes.normal, uvs = decoded.attributes.uv, indices = decoded.index;
        this.ensure(this.vertexCount + decoded.vertexCount, this.indexCount + indices.length);
        var record = { id: id, vertexOffset: this.vertexCount, vertexCount: decoded.vertexCount, indexOffset: this.indexCount, indexCount: indices.length, active: true };
        this.positions.set(positions, record.vertexOffset * 3);
        if (normals) this.normals.set(normals, record.vertexOffset * 3);
        if (uvs) this.uvs.set(uvs, record.vertexOffset * 2);
        for (var index = 0; index < indices.length; index++) this.indices[record.indexOffset + index] = indices[index] + record.vertexOffset;
        this.vertexCount += decoded.vertexCount; this.indexCount += indices.length; this.pages.set(id, record); this.dirty = true;
        this.stats.pages = this.pages.size; this.stats.vertices = this.vertexCount; this.stats.indices = this.indexCount;
        return record;
    }
    removePage(id) { var record = this.pages.get(id); if (!record) return false; record.active = false; this.pages.delete(id); this.stats.pages = this.pages.size; return true; }
    compact(decodedPages) {
        var ids = Array.from(this.pages.keys()).sort(); this.vertexCount = 0; this.indexCount = 0; this.pages.clear();
        for (var index = 0; index < ids.length; index++) { var decoded = decodedPages.get(ids[index]); if (decoded) this.addPage(ids[index], decoded); }
        this.stats.compactions++; return this;
    }
    usage() { var usage = typeof GPUBufferUsage !== "undefined" ? GPUBufferUsage : null; return usage ? usage.STORAGE | usage.VERTEX | usage.INDEX | usage.COPY_DST : 172; }
    ensureBuffers() {
        if (!this.device || !this.device.createBuffer) return;
        var arrays = { positions: this.positions, normals: this.normals, uvs: this.uvs, indices: this.indices }, names = Object.keys(arrays);
        for (var index = 0; index < names.length; index++) { var name = names[index]; if (!this.buffers[name] || this.buffers[name].size < arrays[name].byteLength) { if (this.buffers[name] && this.buffers[name].destroy) this.buffers[name].destroy(); this.buffers[name] = this.device.createBuffer({ size: arrays[name].byteLength, usage: this.usage() }); } }
    }
    upload() {
        if (!this.dirty || !this.device || !this.device.queue) return 0;
        this.ensureBuffers();
        var views = { positions: this.positions.subarray(0, this.vertexCount * 3), normals: this.normals.subarray(0, this.vertexCount * 3), uvs: this.uvs.subarray(0, this.vertexCount * 2), indices: this.indices.subarray(0, this.indexCount) };
        var names = Object.keys(views), bytes = 0;
        for (var index = 0; index < names.length; index++) { this.device.queue.writeBuffer(this.buffers[names[index]], 0, views[names[index]]); bytes += views[names[index]].byteLength; }
        this.dirty = false; this.stats.uploads++; this.stats.uploadedBytes += bytes; return bytes;
    }
    shaderLayout() { return { position: { binding: 0, stride: 12, format: "float32x3" }, normal: { binding: 1, stride: 12, format: "float32x3" }, uv: { binding: 2, stride: 8, format: "float32x2" }, index: { binding: 3, stride: 4, format: "uint32" } }; }
    report() { return { vertexCapacity: this.vertexCapacity, indexCapacity: this.indexCapacity, vertexCount: this.vertexCount, indexCount: this.indexCount, cpuBytes: this.positions.byteLength + this.normals.byteLength + this.uvs.byteLength + this.indices.byteLength, stats: Object.assign({}, this.stats) }; }
    destroyBuffers() { var names = Object.keys(this.buffers); for (var index = 0; index < names.length; index++) if (this.buffers[names[index]] && this.buffers[names[index]].destroy) this.buffers[names[index]].destroy(); this.buffers = Object.create(null); }
    dispose() { this.destroyBuffers(); this.pages.clear(); return this; }
}

class FXOMIndirectCommandStream {
    constructor(options) { options = options || {}; this.maxCommands = options.maxCommands || 65536; this.commands = new Uint32Array(this.maxCommands * 5); this.metadata = new Uint32Array(this.maxCommands * 4); this.count = 0; this.stats = { commands: 0, triangles: 0, rejected: 0, materialGroups: 0 }; }
    build(entries, pageRecords, triangleBudget, drawBudget) {
        triangleBudget = triangleBudget === undefined ? Infinity : triangleBudget; drawBudget = drawBudget === undefined ? this.maxCommands : Math.min(this.maxCommands, drawBudget);
        this.count = 0; this.stats.triangles = 0; this.stats.rejected = 0; var materials = new Set;
        var sorted = entries.slice().sort(function(a, b) { return a.material - b.material || String(a.pageId).localeCompare(String(b.pageId)) || a.pageFirst - b.pageFirst || a.instance - b.instance; });
        for (var index = 0; index < sorted.length; index++) {
            var entry = sorted[index], page = pageRecords.get(entry.pageId);
            if (!page || this.count >= drawBudget || this.stats.triangles + entry.triangles > triangleBudget) { this.stats.rejected++; continue; }
            var command = this.count * 5; this.commands[command] = entry.count; this.commands[command + 1] = 1; this.commands[command + 2] = page.indexOffset + entry.pageFirst; this.commands[command + 3] = 0; this.commands[command + 4] = entry.instance;
            var metadata = this.count * 4; this.metadata[metadata] = entry.material; this.metadata[metadata + 1] = entry.id; this.metadata[metadata + 2] = page.vertexOffset; this.metadata[metadata + 3] = entry.level;
            this.count++; this.stats.triangles += entry.triangles; materials.add(entry.material);
        }
        this.stats.commands = this.count; this.stats.materialGroups = materials.size;
        return { commands: this.commands.subarray(0, this.count * 5), metadata: this.metadata.subarray(0, this.count * 4), count: this.count, stats: Object.assign({}, this.stats) };
    }
}

class FXOMVGS {
    constructor(zahea, zaheb) {
        zaheb = zaheb || {};
        this.source = zahea;
        this.maxVertices = Math.max(3, zaheb.maxVertices || 96);
        this.maxTriangles = Math.max(3, zaheb.maxTriangles || 192);
        this.groupSize = Math.max(2, zaheb.groupSize || 4);
        this.maxLevels = Math.min(24, Math.max(2, zaheb.maxLevels || 16));
        this.renderer = zaheb.renderer || null;
        this.device = this.renderer ? this.renderer.device : null;
        this.clusters = [];
        this.levelRanges = [];
        this.clusterIndices = [];
        this.positions = [];
        this.normals = [];
        this.uvs = null;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.clusterbuffer = null;
        this.selbuffer = null;
        this.flagsbuffer = null;
        this.residentbuffer = null;
        this.readbackbuffer = null;
        this.bind = null;
        this.residentMask = null;
        this.lastUsed = null;
        this.memoryBudget = Infinity;
        this.frame = 0;
        this.id = zaheb.id || "fxomvgs-" + FXOMVGS.nextId++;
        this.material = zaheb.material || 0;
        this.pixelError = zaheb.pixelError === undefined ? 2 : zaheb.pixelError;
        this.hysteresis = zaheb.hysteresis === undefined ? .15 : Math.max(0, zaheb.hysteresis);
        this.pages = new Map;
        this.pageRecords = new Map;
        this.instances = [ { id: 0, position: { x: 0, y: 0, z: 0 }, importance: 1, visible: true } ];
        this.cache = zaheb.cache || new RuntimeGeometryCache({ maxBytes: zaheb.cacheBytes || 256 * 1024 * 1024 });
        this.residency = zaheb.residency || new GPUResidencyManager2({ budgetBytes: zaheb.budgetBytes || 512 * 1024 * 1024 });
        this.store = new FXOMVertexPullingStore(this.device, zaheb);
        this.commandStream = new FXOMIndirectCommandStream(zaheb);
        this.pendingRequests = new Map;
        this.selectionHistory = new Map;
        this.visibilityPipeline = zaheb.visibilityPipeline || null;
        this.gpuHierarchyFrame = 0;
        this.gpuFeedbackPromise = null;
        if (this.visibilityPipeline && this.visibilityPipeline.setGeometry) this.visibilityPipeline.setGeometry(this);
        this.runtimeStats = { pages: 0, compressedBytes: 0, sourceBytes: 0, requests: 0, decoded: 0, uploaded: 0, evicted: 0, selectedClusters: 0, selectedTriangles: 0, commands: 0, uploadBytes: 0, backend: "cpu" };
        this.lastSelection = null;
        this.stats = {
            levels: 0,
            clusters: 0,
            levelClusters: [],
            levelTriangles: [],
            vertices: 0,
            buildms: 0,
            simplifyms: 0,
            selected: 0,
            selectedTriangles: 0,
            selectms: 0,
            resident: 0
        };
        this.build();
        this._buildStreamingData();
    }
    build() {
        var zahea = typeof performance !== "undefined" ? performance.now() : Date.now();
        var zaheb = this.source;
        if (!zaheb || !zaheb.attributes || !zaheb.attributes.position) return this;
        var zahee = !!zaheb.attributes.normal;
        var zahef = !!zaheb.attributes.uv;
        var zaheg = new MeshletSet(zaheb, {
            maxVertices: this.maxVertices,
            maxTriangles: this.maxTriangles
        });
        var zaheh = zaheb.attributes.position.array;
        var zahei = zahee ? zaheb.attributes.normal.array : null;
        var zahej = zahef ? zaheb.attributes.uv.array : null;
        for (var zahek = 0; zahek < zaheh.length; zahek++) this.positions.push(zaheh[zahek]);
        if (zahei) {
            for (var zahel = 0; zahel < zahei.length; zahel++) this.normals.push(zahei[zahel]);
        } else {
            for (var zahem = 0; zahem < zaheh.length / 3; zahem++) this.normals.push(0, 1, 0);
        }
        if (zahej) {
            this.uvs = [];
            for (var zahen = 0; zahen < zahej.length; zahen++) this.uvs.push(zahej[zahen]);
        }
        var zaheo = zaheg.geometry.index;
        for (var zahep = 0; zahep < zaheg.meshlets.length; zahep++) {
            var zaheq = zaheg.meshlets[zahep];
            var zaher = this.clusterIndices.length;
            for (var zahes = 0; zahes < zaheq.count; zahes++) this.clusterIndices.push(zaheo[zaheq.first * 3 + zahes]);
            this.clusters.push({
                level: 0,
                first: zaher,
                count: zaheq.count,
                center: zaheq.center,
                radius: zaheq.radius,
                axis: zaheq.axis,
                cosThetaMax: zaheq.cosThetaMax,
                cullable: zaheq.cullable,
                min: zaheq.min,
                max: zaheq.max,
                err: 0,
                parent: -1,
                triangles: zaheq.triangles
            });
        }
        this.levelRanges.push({
            start: 0,
            count: this.clusters.length
        });
        var zahet = 0;
        var zaheu = 1;
        while (zaheu < this.maxLevels) {
            var zahev = this.levelRanges[this.levelRanges.length - 1];
            if (zahev.count <= 1) break;
            var zahew = this.clusters.length;
            for (var zahex = zahev.start; zahex < zahev.start + zahev.count; zahex += this.groupSize) {
                var zahey = Math.min(zahex + this.groupSize, zahev.start + zahev.count);
                var zahez = new Map;
                var zaheaa = [], zaheab = [], zaheac = this.uvs ? [] : null;
                var zahead = [];
                var zaheae = [];
                var zaheaf = [];
                var zaheag = 0;
                for (var zaheah = zahex; zaheah < zahey; zaheah++) {
                    var zaheai = this.clusters[zaheah];
                    if (zaheai.err > zaheag) zaheag = zaheai.err;
                    var zaheaj = zaheaf.length;
                    zaheaf.push(zaheah);
                    for (var zaheak = 0; zaheak < zaheai.count; zaheak += 3) {
                        for (var zaheal = 0; zaheal < 3; zaheal++) {
                            var zaheam = this.clusterIndices[zaheai.first + zaheak + zaheal];
                            var zahean = zahez.get(zaheam);
                            if (zahean === undefined) {
                                zahean = zaheaa.length / 3;
                                zahez.set(zaheam, zahean);
                                zaheaa.push(this.positions[zaheam * 3], this.positions[zaheam * 3 + 1], this.positions[zaheam * 3 + 2]);
                                zaheab.push(this.normals[zaheam * 3], this.normals[zaheam * 3 + 1], this.normals[zaheam * 3 + 2]);
                                if (zaheac) zaheac.push(this.uvs[zaheam * 2], this.uvs[zaheam * 2 + 1]);
                            }
                            zahead.push(zahean);
                        }
                        zaheae.push(zaheaj);
                    }
                }
                var zaheao = zaheae.length;
                var zaheap = Math.max(4, Math.min(Math.floor(this.maxTriangles * .9), Math.floor(zaheao * .55)));
                var zaheaq = typeof performance !== "undefined" ? performance.now() : Date.now();
                var zahear = zahec(zaheaa, zaheab, zaheac, zahead, zaheae, zaheaf.length, zaheap);
                zahet += (typeof performance !== "undefined" ? performance.now() : Date.now()) - zaheaq;
                var zaheas = zaheag;
                for (var zaheat = 0; zaheat < zahear.pendingErr.length; zaheat++) {
                    if (zahear.pendingErr[zaheat] > zaheas) zaheas = zahear.pendingErr[zaheat];
                }
                var zaheau = this.positions.length / 3;
                for (var zaheav = 0; zaheav < zahear.pos.length; zaheav++) this.positions.push(zahear.pos[zaheav]);
                for (var zaheaw = 0; zaheaw < zahear.nrm.length; zaheaw++) this.normals.push(zahear.nrm[zaheaw]);
                if (this.uvs) {
                    for (var zaheax = 0; zaheax < zahear.uv.length; zaheax++) this.uvs.push(zahear.uv[zaheax]);
                }
                var zaheay = this.clusterIndices.length;
                for (var zaheaz = 0; zaheaz < zahear.idx.length; zaheaz++) this.clusterIndices.push(zahear.idx[zaheaz] + zaheau);
                var zaheba = zahed(zahear.pos, zahear.idx);
                var zahebb = this.clusters.length;
                this.clusters.push({
                    level: zaheu,
                    first: zaheay,
                    count: zahear.idx.length,
                    center: zaheba.center,
                    radius: zaheba.radius,
                    axis: zaheba.axis,
                    cosThetaMax: zaheba.cosThetaMax,
                    cullable: zaheba.cullable,
                    min: zaheba.min,
                    max: zaheba.max,
                    err: zaheas,
                    parent: -1,
                    triangles: zahear.idx.length / 3
                });
                for (var zahebc = zahex; zahebc < zahey; zahebc++) this.clusters[zahebc].parent = zahebb;
            }
            var zahebd = this.clusters.length - zahew;
            if (zahebd === 0) break;
            this.levelRanges.push({
                start: zahew,
                count: zahebd
            });
            if (zahebd >= zahev.count) break;
            zaheu++;
        }
        this.stats.levels = this.levelRanges.length;
        this.stats.clusters = this.clusters.length;
        this.stats.vertices = this.positions.length / 3;
        for (var zahebe = 0; zahebe < this.levelRanges.length; zahebe++) {
            var zahebf = this.levelRanges[zahebe];
            var zahebg = 0, zahebh = 0;
            for (var zahebi = zahebf.start; zahebi < zahebf.start + zahebf.count; zahebi++) {
                zahebg += this.clusters[zahebi].triangles;
                zahebh++;
            }
            this.stats.levelClusters.push(zahebh);
            this.stats.levelTriangles.push(zahebg);
        }
        this.stats.buildms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - zahea;
        this.stats.simplifyms = zahet;
        return this;
    }
    _buildStreamingData() {
        var self = this;
        this.pages.clear();
        for (var clusterIndex = 0; clusterIndex < this.clusters.length; clusterIndex++) this.clusters[clusterIndex].children = [];
        for (var childIndex = 0; childIndex < this.clusters.length; childIndex++) {
            var parent = this.clusters[childIndex].parent;
            if (parent >= 0 && this.clusters[parent]) this.clusters[parent].children.push(childIndex);
        }
        for (var level = 0; level < this.levelRanges.length; level++) {
            var range = this.levelRanges[level], remap = new Map, pagePositions = [], pageNormals = [], pageUVs = this.uvs ? [] : null, pageIndices = [];
            for (var index = range.start; index < range.start + range.count; index++) {
                var cluster = this.clusters[index];
                cluster.id = index; cluster.material = this.material; cluster.pageId = this.id + ":level:" + level; cluster.pageFirst = pageIndices.length;
                for (var offset = 0; offset < cluster.count; offset++) {
                    var sourceIndex = this.clusterIndices[cluster.first + offset], localIndex = remap.get(sourceIndex);
                    if (localIndex === undefined) {
                        localIndex = remap.size; remap.set(sourceIndex, localIndex);
                        pagePositions.push(this.positions[sourceIndex * 3], this.positions[sourceIndex * 3 + 1], this.positions[sourceIndex * 3 + 2]);
                        pageNormals.push(this.normals[sourceIndex * 3], this.normals[sourceIndex * 3 + 1], this.normals[sourceIndex * 3 + 2]);
                        if (pageUVs) pageUVs.push(this.uvs[sourceIndex * 2], this.uvs[sourceIndex * 2 + 1]);
                    }
                    pageIndices.push(localIndex);
                }
            }
            var geometry = new Geometry;
            geometry.setAttribute("position", new Float32Array(pagePositions), 3);
            geometry.setAttribute("normal", new Float32Array(pageNormals), 3);
            if (pageUVs) geometry.setAttribute("uv", new Float32Array(pageUVs), 2);
            geometry.setIndex(remap.size > 65535 ? new Uint32Array(pageIndices) : new Uint16Array(pageIndices));
            var encoded = GeometryPageCodec.encode(geometry), pageId = this.id + ":level:" + level;
            var page = { id: pageId, level: level, encoded: encoded, resident: false, handle: null, pinned: level === this.levelRanges.length - 1 };
            this.pages.set(pageId, page);
            this.runtimeStats.compressedBytes += encoded.byteLength;
            this.runtimeStats.sourceBytes += pagePositions.length * 4 + pageNormals.length * 4 + (pageUVs ? pageUVs.length * 4 : 0) + pageIndices.length * (remap.size > 65535 ? 4 : 2);
            this.residency.register(pageId, {
                category: "geometry-page", bytes: encoded.byteLength, importance: page.pinned ? 1000 : 1, pinned: page.pinned,
                load: async function(context, resource) {
                    var current = self.pages.get(resource.id);
                    var decoded = await self.cache.getOrCreate(resource.id, function() { return GeometryPageCodec.decode(current.encoded); });
                    self.runtimeStats.decoded++;
                    current.resident = true; current.handle = decoded;
                    self.pageRecords.set(resource.id, self.store.addPage(resource.id, decoded));
                    return decoded;
                },
                unload: function(handle, reason, resource) {
                    var id = resource.id, current = self.pages.get(id);
                    if (current) { current.resident = false; current.handle = null; }
                    self.store.removePage(id); self.pageRecords.delete(id); self.runtimeStats.evicted++;
                }
            });
        }
        this.runtimeStats.pages = this.pages.size;
        return this;
    }
    resident(pageId) { var page = this.pages.get(pageId); return !!(page && page.resident); }
    requestPage(pageId, context) {
        if (!this.pages.has(pageId)) return Promise.resolve(null);
        if (this.pendingRequests.has(pageId)) return this.pendingRequests.get(pageId);
        this.runtimeStats.requests++;
        var self = this;
        var promise = this.residency.makeResident(pageId, context).then(function(handle) { self.pendingRequests.delete(pageId); return handle; }, function(error) { self.pendingRequests.delete(pageId); throw error; });
        this.pendingRequests.set(pageId, promise); return promise;
    }
    async prepare() {
        var rootRange = this.levelRanges[this.levelRanges.length - 1], requests = [];
        for (var index = rootRange.start; index < rootRange.start + rootRange.count; index++) { var id = this.clusters[index].pageId; if (!this.resident(id)) requests.push(this.requestPage(id, { reason: "root" })); }
        await Promise.all(requests); this.syncPages(); return this;
    }
    syncPages() {
        var self = this;
        this.pages.forEach(function(page, id) {
            if (page.resident && page.handle && !self.pageRecords.has(id)) self.pageRecords.set(id, self.store.addPage(id, page.handle));
            if (!page.resident && self.pageRecords.has(id)) { self.store.removePage(id); self.pageRecords.delete(id); }
        });
        return this;
    }
    addInstance(options) {
        options = options || {};
        var instance = { id: options.id === undefined ? this.instances.length : options.id, position: options.position || { x: 0, y: 0, z: 0 }, importance: options.importance === undefined ? 1 : options.importance, visible: options.visible !== false };
        this.instances.push(instance); return instance;
    }
    removeInstance(id) { for (var index = 0; index < this.instances.length; index++) if (this.instances[index].id === id) { this.instances.splice(index, 1); return true; } return false; }
    _cameraData(camera, viewportHeight) {
        var matrix = camera && camera.projectionMatrix && camera.matrixWorldInverse ? (new Matrix4).multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements : null;
        var planes = null;
        if (matrix) {
            planes = [ matrix[3] + matrix[0], matrix[7] + matrix[4], matrix[11] + matrix[8], matrix[15] + matrix[12], matrix[3] - matrix[0], matrix[7] - matrix[4], matrix[11] - matrix[8], matrix[15] - matrix[12], matrix[3] + matrix[1], matrix[7] + matrix[5], matrix[11] + matrix[9], matrix[15] + matrix[13], matrix[3] - matrix[1], matrix[7] - matrix[5], matrix[11] - matrix[9], matrix[15] - matrix[13], matrix[2], matrix[6], matrix[10], matrix[14], matrix[3] - matrix[2], matrix[7] - matrix[6], matrix[11] - matrix[10], matrix[15] - matrix[14] ];
            for (var plane = 0; plane < 6; plane++) { var length = Math.sqrt(planes[plane * 4] ** 2 + planes[plane * 4 + 1] ** 2 + planes[plane * 4 + 2] ** 2) || 1; for (var component = 0; component < 4; component++) planes[plane * 4 + component] /= length; }
        }
        var position = camera && camera.position ? [ camera.position.x, camera.position.y, camera.position.z ] : Array.isArray(camera) ? camera : [ 0, 0, 0 ];
        var fov = camera && camera.projectionMatrix ? 2 * Math.atan(1 / camera.projectionMatrix.elements[5]) : Math.PI / 3;
        return { position: position, planes: planes, scale: (viewportHeight || 1080) / Math.max(.001, 2 * Math.tan(fov / 2)) };
    }
    _visible(cluster, data, instance, useCone) {
        var x = cluster.center[0] + instance.position.x, y = cluster.center[1] + instance.position.y, z = cluster.center[2] + instance.position.z;
        if (data.planes) for (var plane = 0; plane < 6; plane++) if (data.planes[plane * 4] * x + data.planes[plane * 4 + 1] * y + data.planes[plane * 4 + 2] * z + data.planes[plane * 4 + 3] < -cluster.radius) return false;
        if (useCone !== false && cluster.cullable) {
            var dx = data.position[0] - x, dy = data.position[1] - y, dz = data.position[2] - z, length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1; dx /= length; dy /= length; dz /= length;
            var cosine = dx * cluster.axis[0] + dy * cluster.axis[1] + dz * cluster.axis[2], sine = Math.sqrt(Math.max(0, 1 - cosine * cosine)), coneSine = Math.sqrt(Math.max(0, 1 - cluster.cosThetaMax * cluster.cosThetaMax)), bound = cosine * cluster.cosThetaMax + sine * coneSine;
            if (cosine < cluster.cosThetaMax && bound < -1e-6 && length * -bound >= cluster.radius) return false;
        }
        return true;
    }
    _projectedError(cluster, data, instance) { var dx = data.position[0] - cluster.center[0] - instance.position.x, dy = data.position[1] - cluster.center[1] - instance.position.y, dz = data.position[2] - cluster.center[2] - instance.position.z; return cluster.err * data.scale / Math.max(.001, Math.sqrt(dx * dx + dy * dy + dz * dz) - cluster.radius); }
    _cpuSelection(camera, options) {
        options = options || {}; var data = this._cameraData(camera, options.viewportHeight), entries = [], requests = new Set, maxClusters = options.maxClusters || 65536, maxTriangles = options.maxTriangles === undefined ? Infinity : options.maxTriangles, triangles = 0;
        var rootRange = this.levelRanges[this.levelRanges.length - 1], pixelError = options.pixelError === undefined ? (options.threshold === undefined ? this.pixelError : options.threshold) : options.pixelError;
        for (var instanceIndex = 0; instanceIndex < this.instances.length; instanceIndex++) {
            var instance = this.instances[instanceIndex]; if (!instance.visible) continue;
            var stack = []; for (var root = rootRange.start; root < rootRange.start + rootRange.count; root++) stack.push(root);
            while (stack.length) {
                var id = stack.pop(), cluster = this.clusters[id]; if (!this._visible(cluster, data, instance, options.useCone)) continue;
                var historyKey = instance.id + ":" + id, wasRefined = this.selectionHistory.get(historyKey) === true, threshold = pixelError * (wasRefined ? 1 - this.hysteresis : 1 + this.hysteresis), refine = cluster.children.length && this._projectedError(cluster, data, instance) > threshold;
                if (refine) {
                    var ready = true;
                    for (var check = 0; check < cluster.children.length; check++) { var child = this.clusters[cluster.children[check]]; if (!this.resident(child.pageId)) { ready = false; requests.add(child.pageId); } }
                    if (ready) { this.selectionHistory.set(historyKey, true); for (var childIndex = 0; childIndex < cluster.children.length; childIndex++) stack.push(cluster.children[childIndex]); continue; }
                }
                this.selectionHistory.set(historyKey, false);
                if (!this.resident(cluster.pageId)) { requests.add(cluster.pageId); continue; }
                if (entries.length >= maxClusters || triangles + cluster.triangles > maxTriangles) continue;
                entries.push({ id: id, level: cluster.level, pageId: cluster.pageId, pageFirst: cluster.pageFirst, count: cluster.count, triangles: cluster.triangles, material: cluster.material, instance: instanceIndex }); triangles += cluster.triangles;
            }
        }
        return { entries: entries, requests: requests, triangles: triangles };
    }
    _entriesFromMask(mask, options) {
        options = options || {}; var entries = [], triangles = 0, maxClusters = options.maxClusters || 65536, maxTriangles = options.maxTriangles === undefined ? Infinity : options.maxTriangles;
        for (var id = 0; id < mask.length; id++) if (mask[id]) { var cluster = this.clusters[id]; if (!this.resident(cluster.pageId) || entries.length >= maxClusters || triangles + cluster.triangles > maxTriangles) continue; entries.push({ id: id, level: cluster.level, pageId: cluster.pageId, pageFirst: cluster.pageFirst, count: cluster.count, triangles: cluster.triangles, material: cluster.material, instance: 0 }); triangles += cluster.triangles; }
        return { entries: entries, triangles: triangles };
    }
    _updateGPUResidencyMask() {
        if (!this.device) return;
        this.ensuregpu(); var mask = new Uint32Array(this.clusters.length), count = 0;
        for (var index = 0; index < this.clusters.length; index++) if (this.resident(this.clusters[index].pageId)) { mask[index] = 1; count++; }
        this.residentMask = mask; this.stats.resident = count; this.device.queue.writeBuffer(this.residentbuffer, 0, mask);
    }
    async updateGPUResident(camera, options) {
        options = options || {};
        if (!this.visibilityPipeline || !this.visibilityPipeline.executeGPUHierarchy) throw new Error("FXOMVGS.updateGPUResident requires VirtualGeometryVisibilityPipeline");
        await this.prepare(); this.syncPages(); this.store.upload();
        var selector = this.visibilityPipeline.enableGPUHierarchy(options); selector.setGeometry(this);
        this.visibilityPipeline.executeGPUHierarchy(camera, options);
        this.gpuHierarchyFrame++;
        var feedbackInterval = options.feedbackInterval === undefined ? 4 : Math.max(1, options.feedbackInterval);
        if (this.gpuHierarchyFrame % feedbackInterval === 0 && !this.gpuFeedbackPromise) {
            var self = this;
            this.gpuFeedbackPromise = selector.requestPages({ reason: "gpu-hierarchy", frame: this.gpuHierarchyFrame }).then(function(ids) { self.gpuFeedbackPromise = null; return ids; }, function() { self.gpuFeedbackPromise = null; return []; });
        }
        this.runtimeStats.backend = "gpu-resident";
        return { pipeline: this.visibilityPipeline, hierarchy: selector, feedback: this.gpuFeedbackPromise, stats: Object.assign({}, this.runtimeStats) };
    }
    async update(camera, options) {
        options = options || {}; await this.prepare(); this.syncPages();
        var cpu = this._cpuSelection(camera, options), self = this; cpu.requests.forEach(function(id) { self.requestPage(id, { reason: "refinement" }).catch(function() { return null; }); });
        var useGPU = !!this.device && options.backend !== "cpu" && this.instances.length === 1 && this.instances[0].position.x === 0 && this.instances[0].position.y === 0 && this.instances[0].position.z === 0;
        var selection = cpu;
        if (useGPU) { this._updateGPUResidencyMask(); this.select(camera, { threshold: options.pixelError === undefined ? this.pixelError : options.pixelError, viewportHeight: options.viewportHeight, useCone: options.useCone }); var mask = await this.readback(); selection = this._entriesFromMask(mask, options); this.runtimeStats.backend = "gpu"; } else this.runtimeStats.backend = "cpu";
        var commands = this.commandStream.build(selection.entries, this.pageRecords, options.triangleBudget, options.drawCallBudget), uploaded = this.store.upload();
        this.runtimeStats.selectedClusters = selection.entries.length; this.runtimeStats.selectedTriangles = selection.triangles; this.runtimeStats.commands = commands.count; this.runtimeStats.uploadBytes = uploaded;
        this.residency.update();
        var frameResult = { selected: selection.entries, requests: Array.from(cpu.requests), commands: commands, buffers: this.store.buffers, layout: this.store.shaderLayout(), stats: Object.assign({}, this.runtimeStats) };
        if (this.visibilityPipeline && this.visibilityPipeline.uploadCandidates) this.visibilityPipeline.uploadCandidates(frameResult, this);
        return frameResult;
    }
    setByteBudget(bytes) { this.residency.setBudget(bytes, "geometry-page"); return this; }
    setVisibilityPipeline(pipeline) { this.visibilityPipeline = pipeline || null; if (this.visibilityPipeline && this.visibilityPipeline.setGeometry) this.visibilityPipeline.setGeometry(this); return this; }
    compact() { var decoded = new Map; this.pages.forEach(function(page, id) { if (page.resident && page.handle) decoded.set(id, page.handle); }); this.store.compact(decoded); this.pageRecords.clear(); var self = this; this.store.pages.forEach(function(record, id) { self.pageRecords.set(id, record); }); return this; }
    report() { return { id: this.id, hierarchy: Object.assign({}, this.stats), runtime: Object.assign({}, this.runtimeStats), residency: this.residency.report(), cache: this.cache.report(), store: this.store.report(), commands: Object.assign({}, this.commandStream.stats), instances: this.instances.length }; }

    ensuregpu() {
        if (this.pipeline) return;
        if (!this.device) throw new Error("FXOMVGS needs a renderer (pass options.renderer)");
        var zaheb = this.device;
        this.pipeline = zaheb.createComputePipeline({
            layout: "auto",
            compute: {
                module: zaheb.createShaderModule({
                    code: zahea
                }),
                entryPoint: "fxmain"
            }
        });
        this.paramsbuffer = zaheb.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        var zahec = this.clusters.length;
        var zahed = new Float32Array(zahec * 12);
        for (var zahee = 0; zahee < zahec; zahee++) {
            var zahef = this.clusters[zahee];
            var zaheg = zahee * 12;
            zahed[zaheg] = zahef.center[0];
            zahed[zaheg + 1] = zahef.center[1];
            zahed[zaheg + 2] = zahef.center[2];
            zahed[zaheg + 3] = zahef.radius;
            zahed[zaheg + 4] = zahef.axis[0];
            zahed[zaheg + 5] = zahef.axis[1];
            zahed[zaheg + 6] = zahef.axis[2];
            zahed[zaheg + 7] = zahef.cosThetaMax;
            zahed[zaheg + 8] = zahef.err;
            zahed[zaheg + 9] = zahef.parent;
            zahed[zaheg + 10] = zahef.level;
            zahed[zaheg + 11] = zahef.cullable;
        }
        this.clusterbuffer = zaheb.createBuffer({
            size: Math.max(16, zahec * 48),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        zaheb.queue.writeBuffer(this.clusterbuffer, 0, zahed);
        this.selbuffer = zaheb.createBuffer({
            size: Math.max(16, zahec * 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.flagsbuffer = zaheb.createBuffer({
            size: Math.max(16, zahec * 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        var zaheh = new Uint32Array(zahec);
        zaheb.queue.writeBuffer(this.flagsbuffer, 0, zaheh);
        this.residentbuffer = zaheb.createBuffer({
            size: Math.max(16, zahec * 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        var zahei = new Uint32Array(zahec);
        for (var zahej = 0; zahej < zahec; zahej++) zahei[zahej] = 1;
        zaheb.queue.writeBuffer(this.residentbuffer, 0, zahei);
        this.readbackbuffer = zaheb.createBuffer({
            size: Math.max(16, zahec * 4),
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        this.bind = zaheb.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.paramsbuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.clusterbuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.selbuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.flagsbuffer
                }
            }, {
                binding: 4,
                resource: {
                    buffer: this.residentbuffer
                }
            } ]
        });
    }
    select(zahea, zaheb) {
        zaheb = zaheb || {};
        if (!this.device) {
            var cpuselection = this._cpuSelection(zahea, { threshold: zaheb.threshold, viewportHeight: zaheb.viewportHeight, useCone: zaheb.useCone, maxClusters: zaheb.maxClusters, maxTriangles: zaheb.maxTriangles });
            var cpumask = new Uint32Array(this.clusters.length);
            for (var cpuindex = 0; cpuindex < cpuselection.entries.length; cpuindex++) cpumask[cpuselection.entries[cpuindex].id] = 1;
            this.lastSelection = cpumask;
            this.stats.selected = cpuselection.entries.length;
            this.stats.selectedTriangles = cpuselection.triangles;
            this.runtimeStats.backend = "cpu";
            return this;
        }
        this.ensuregpu();
        var zahec = zaheb.threshold !== undefined ? zaheb.threshold : 2;
        var zahed = zaheb.viewportHeight !== undefined ? zaheb.viewportHeight : 600;
        var zahee = zaheb.useCone !== false;
        var zahef = this.residentMask ? 1 : 0;
        var zaheg = (new Matrix4).multiplyMatrices(zahea.projectionMatrix, zahea.matrixWorldInverse);
        var zaheh = zaheg.elements;
        var zahei = [ zaheh[3] + zaheh[0], zaheh[7] + zaheh[4], zaheh[11] + zaheh[8], zaheh[15] + zaheh[12], zaheh[3] - zaheh[0], zaheh[7] - zaheh[4], zaheh[11] - zaheh[8], zaheh[15] - zaheh[12], zaheh[3] + zaheh[1], zaheh[7] + zaheh[5], zaheh[11] + zaheh[9], zaheh[15] + zaheh[13], zaheh[3] - zaheh[1], zaheh[7] - zaheh[5], zaheh[11] - zaheh[9], zaheh[15] - zaheh[13], zaheh[2], zaheh[6], zaheh[10], zaheh[14], zaheh[3] - zaheh[2], zaheh[7] - zaheh[6], zaheh[11] - zaheh[10], zaheh[15] - zaheh[14] ];
        for (var zahej = 0; zahej < 6; zahej++) {
            var zahek = Math.sqrt(zahei[zahej * 4] * zahei[zahej * 4] + zahei[zahej * 4 + 1] * zahei[zahej * 4 + 1] + zahei[zahej * 4 + 2] * zahei[zahej * 4 + 2]) || 1;
            zahei[zahej * 4] /= zahek;
            zahei[zahej * 4 + 1] /= zahek;
            zahei[zahej * 4 + 2] /= zahek;
            zahei[zahej * 4 + 3] /= zahek;
        }
        var zahel = 2 * Math.atan(1 / zahea.projectionMatrix.elements[5]);
        var zahem = zahed / (2 * Math.tan(zahel / 2));
        var zahen = this.clusters.length;
        var zaheo = new Uint32Array(zahen);
        this.device.queue.writeBuffer(this.flagsbuffer, 0, zaheo);
        var zahep = new Float32Array(36);
        zahep[0] = zahea.position.x;
        zahep[1] = zahea.position.y;
        zahep[2] = zahea.position.z;
        zahep[3] = zahem;
        for (var zaheq = 0; zaheq < 24; zaheq++) zahep[4 + zaheq] = zahei[zaheq];
        zahep[32] = zahef;
        var zaher = typeof performance !== "undefined" ? performance.now() : Date.now();
        for (var zahes = 0; zahes < this.levelRanges.length; zahes++) {
            var zahet = this.levelRanges[zahes];
            zahep[28] = zahet.count;
            zahep[29] = zahee ? 1 : 0;
            zahep[30] = zahec;
            zahep[31] = zahet.start;
            this.device.queue.writeBuffer(this.paramsbuffer, 0, zahep);
            var zaheu = this.device.createCommandEncoder();
            var zahev = zaheu.beginComputePass();
            zahev.setPipeline(this.pipeline);
            zahev.setBindGroup(0, this.bind);
            zahev.dispatchWorkgroups(Math.ceil(zahet.count / 64));
            zahev.end();
            this.device.queue.submit([ zaheu.finish() ]);
        }
        this.stats.selectms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - zaher;
        return this;
    }
    readback() {
        var zahea = this;
        if (!this.device) return Promise.resolve(this.lastSelection ? this.lastSelection.slice() : new Uint32Array(this.clusters.length));
        this.ensuregpu();
        var zaheb = this.clusters.length;
        var zahec = this.device.createCommandEncoder();
        zahec.copyBufferToBuffer(this.selbuffer, 0, this.readbackbuffer, 0, Math.max(16, zaheb * 4));
        this.device.queue.submit([ zahec.finish() ]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return zahea.readbackbuffer.mapAsync(GPUMapMode.READ).then(function() {
                var zahec = new Uint32Array(zahea.readbackbuffer.getMappedRange()).slice();
                zahea.readbackbuffer.unmap();
                var zahed = 0, zahee = 0;
                for (var zahef = 0; zahef < zaheb; zahef++) {
                    if (zahec[zahef]) {
                        zahed++;
                        zahee += zahea.clusters[zahef].triangles;
                    }
                }
                zahea.stats.selected = zahed;
                zahea.stats.selectedTriangles = zahee;
                zahea.lastSelection = zahec;
                return zahec;
            });
        });
    }
    selectedIndices(zahea) {
        var zaheb = zahea || this.lastSelection;
        if (!zaheb) return new Uint32Array(0);
        var zahec = 0;
        for (var zahed = 0; zahed < this.clusters.length; zahed++) {
            if (zaheb[zahed]) zahec += this.clusters[zahed].count;
        }
        var zahee = new Uint32Array(zahec);
        var zahef = 0;
        for (var zaheg = 0; zaheg < this.clusters.length; zaheg++) {
            if (!zaheb[zaheg]) continue;
            var zaheh = this.clusters[zaheg];
            for (var zahei = 0; zahei < zaheh.count; zahei++) zahee[zahef++] = this.clusterIndices[zaheh.first + zahei];
        }
        return zahee;
    }
    selectionGeometry(zahea) {
        var zaheb = new Geometry;
        zaheb.setAttribute("position", new Float32Array(this.positions), 3);
        zaheb.setAttribute("normal", new Float32Array(this.normals), 3);
        if (this.uvs) zaheb.setAttribute("uv", new Float32Array(this.uvs), 2);
        zaheb.setIndex(this.selectedIndices(zahea));
        zaheb.computeBounds();
        return zaheb;
    }
    setMemoryBudget(zahea) {
        this.memoryBudget = zahea;
        if (!this.residentMask && this.renderer) {
            var zaheb = this.clusters.length;
            this.residentMask = new Uint32Array(zaheb);
            this.lastUsed = new Int32Array(zaheb);
            for (var zahec = 0; zahec < zaheb; zahec++) this.residentMask[zahec] = 1;
            for (var zahed = 0; zahed < zaheb; zahed++) this.lastUsed[zahed] = -1;
            this.ensuregpu();
        }
        return this;
    }
    updateResidency(zahea, zaheb) {
        if (!this.residentMask) return this;
        var zahec = this.clusters.length;
        var zahed = zaheb !== undefined ? zaheb : this.frame;
        this.frame = zahed + 1;
        var zahee = zahea || this.lastSelection;
        if (zahee) {
            for (var zahef = 0; zahef < zahec; zahef++) {
                if (zahee[zahef]) this.lastUsed[zahef] = zahed;
            }
        }
        var zaheg = [];
        for (var zaheh = 0; zaheh < zahec; zaheh++) zaheg.push(zaheh);
        var zahei = this;
        zaheg.sort(function(zahea, zaheb) {
            if (zahei.lastUsed[zahea] !== zahei.lastUsed[zaheb]) return zahei.lastUsed[zaheb] - zahei.lastUsed[zahea];
            return zahea - zaheb;
        });
        var zahej = Math.min(this.memoryBudget, zahec);
        var zahek = new Uint32Array(zahec);
        for (var zahel = 0; zahel < zahej; zahel++) zahek[zaheg[zahel]] = 1;
        zahek[zahec - 1] = 1;
        var zahem = 0;
        for (var zahen = 0; zahen < zahec; zahen++) {
            this.residentMask[zahen] = zahek[zahen];
            if (zahek[zahen]) zahem++;
        }
        this.stats.resident = zahem;
        this.device.queue.writeBuffer(this.residentbuffer, 0, this.residentMask);
        return this;
    }
    dispose() {
        this.store.dispose();
        var self = this;
        this.pages.forEach(function(page, id) { var resource = self.residency.resources.get(id); if (resource) resource.pinned = false; self.residency.unregister(id); });
        this.pages.clear();
        this.pageRecords.clear();
        this.pendingRequests.clear();
        if (this.clusterbuffer) this.clusterbuffer.destroy();
        if (this.selbuffer) this.selbuffer.destroy();
        if (this.flagsbuffer) this.flagsbuffer.destroy();
        if (this.residentbuffer) this.residentbuffer.destroy();
        if (this.readbackbuffer) this.readbackbuffer.destroy();
        if (this.paramsbuffer) this.paramsbuffer.destroy();
        this.clusterbuffer = null;
        this.selbuffer = null;
        this.flagsbuffer = null;
        this.residentbuffer = null;
        this.readbackbuffer = null;
        this.paramsbuffer = null;
        this.pipeline = null;
        this.bind = null;
    }
}

FXOMVGS.nextId = 0;

export { FXOMVGS };
