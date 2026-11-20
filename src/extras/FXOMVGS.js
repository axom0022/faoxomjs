import { Matrix4 } from "../math/index.js";

import { Geometry } from "../geometries/Geometry.js";

import { MeshletSet } from "./MeshletSet.js";

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
        this.ensuregpu();
        zaheb = zaheb || {};
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

export { FXOMVGS };
