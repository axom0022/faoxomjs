import { Object3D, DoubleSide } from "../core/index.js";

import { Vector3, faoxomvalue } from "../math/index.js";

import { Geometry } from "../geometries/index.js";

import { Mesh } from "../objects/index.js";

import { BasicMaterial } from "../materials/index.js";

import { PerspectiveCamera } from "../camera/index.js";

import { Scene } from "../scenes/index.js";

import { DataTexture } from "../textures/index.js";

var bayer8 = [ [ 0, 32, 8, 40, 2, 34, 10, 42 ], [ 48, 16, 56, 24, 50, 18, 58, 26 ], [ 12, 44, 4, 36, 14, 46, 6, 38 ], [ 60, 28, 52, 20, 62, 30, 54, 22 ], [ 3, 35, 11, 43, 1, 33, 9, 41 ], [ 51, 19, 59, 27, 49, 17, 57, 25 ], [ 15, 47, 7, 39, 13, 45, 5, 37 ], [ 63, 31, 55, 23, 61, 29, 53, 21 ] ];

function ditherThreshold(zagha, zaghb) {
    return bayer8[(zaghb % 8 + 8) % 8][(zagha % 8 + 8) % 8];
}

function ditheredOpacity(zagha) {
    var zaghb = faoxomvalue(zagha, 0);
    if (!(zaghb > 0)) return 0;
    if (zaghb >= 1) return 1;
    var zaghc = zaghb * 64;
    var zaghd = 0;
    for (var zaghe = 0; zaghe < 8; zaghe++) for (var zaghf = 0; zaghf < 8; zaghf++) if (bayer8[zaghe][zaghf] < zaghc) zaghd++;
    return zaghd / 64;
}

function zagha(zagha, zaghb) {
    return zagha.e < zaghb.e || zagha.e === zaghb.e && zagha.s < zaghb.s;
}

function zaghb(zaghb, zaghc) {
    zaghb.push(zaghc);
    var zaghd = zaghb.length - 1;
    while (zaghd > 0) {
        var zaghe = zaghd - 1 >> 1;
        if (zagha(zaghb[zaghe], zaghc)) break;
        zaghb[zaghd] = zaghb[zaghe];
        zaghd = zaghe;
    }
    zaghb[zaghd] = zaghc;
}

function zaghc(zaghb) {
    var zaghc = zaghb[0];
    var zaghd = zaghb.pop();
    if (zaghb.length > 0) {
        zaghb[0] = zaghd;
        var zaghe = 0;
        for (;;) {
            var zaghf = zaghe * 2 + 1, zaghg = zaghf + 1, zaghh = zaghe;
            if (zaghf < zaghb.length && zagha(zaghb[zaghf], zaghb[zaghh])) zaghh = zaghf;
            if (zaghg < zaghb.length && zagha(zaghb[zaghg], zaghb[zaghh])) zaghh = zaghg;
            if (zaghh === zaghe) break;
            var zaghi = zaghb[zaghe];
            zaghb[zaghe] = zaghb[zaghh];
            zaghb[zaghh] = zaghi;
            zaghe = zaghh;
        }
    }
    return zaghc;
}

function zaghd(zagha, zaghb, zaghc, zaghd, zaghe) {
    var zaghf = zagha[zaghb], zaghg = zagha[zaghb + 1], zaghh = zagha[zaghb + 2], zaghi = zagha[zaghb + 3];
    var zaghj = zagha[zaghb + 4], zaghk = zagha[zaghb + 5], zaghl = zagha[zaghb + 6], zaghm = zagha[zaghb + 7];
    var zaghn = zagha[zaghb + 8], zagho = zagha[zaghb + 9];
    return zaghf * zaghc * zaghc + 2 * zaghg * zaghc * zaghd + 2 * zaghh * zaghc * zaghe + 2 * zaghi * zaghc + zaghj * zaghd * zaghd + 2 * zaghk * zaghd * zaghe + 2 * zaghl * zaghd + zaghm * zaghe * zaghe + 2 * zaghn * zaghe + zagho;
}

function zaghe(zagha, zaghb, zaghc, zaghe, zaghf, zaghg, zaghh, zaghi) {
    var zaghj = zagha[zaghb], zaghk = zagha[zaghb + 1], zaghl = zagha[zaghb + 2], zaghm = zagha[zaghb + 3];
    var zaghn = zagha[zaghb + 4], zagho = zagha[zaghb + 5], zaghp = zagha[zaghb + 6];
    var zaghq = zagha[zaghb + 7], zaghr = zagha[zaghb + 8];
    var zaghs = -zaghm, zaght = -zaghp, zaghu = -zaghr;
    var zaghv = zaghj * (zaghn * zaghq - zagho * zagho) - zaghk * (zaghk * zaghq - zagho * zaghl) + zaghl * (zaghk * zagho - zaghn * zaghl);
    var zaghw = [];
    if (Math.abs(zaghv) > 1e-12) {
        var zaghx = (zaghs * (zaghn * zaghq - zagho * zagho) - zaghk * (zaght * zaghq - zagho * zaghu) + zaghl * (zaght * zagho - zaghn * zaghu)) / zaghv;
        var zaghy = (zaghj * (zaght * zaghq - zagho * zaghu) - zaghs * (zaghk * zaghq - zagho * zaghl) + zaghl * (zaghk * zaghu - zaght * zaghl)) / zaghv;
        var zaghz = (zaghj * (zaghn * zaghu - zaght * zagho) - zaghk * (zaghk * zaghu - zaght * zaghl) + zaghs * (zaghk * zagho - zaghn * zaghl)) / zaghv;
        if (isFinite(zaghx) && isFinite(zaghy) && isFinite(zaghz)) zaghw.push([ zaghx, zaghy, zaghz ]);
    }
    zaghw.push([ (zaghc + zaghg) * .5, (zaghe + zaghh) * .5, (zaghf + zaghi) * .5 ]);
    zaghw.push([ zaghc, zaghe, zaghf ]);
    zaghw.push([ zaghg, zaghh, zaghi ]);
    var zaghaa = null, zaghab = Infinity;
    for (var zaghac = 0; zaghac < zaghw.length; zaghac++) {
        var zaghad = zaghd(zagha, zaghb, zaghw[zaghac][0], zaghw[zaghac][1], zaghw[zaghac][2]);
        if (zaghad < zaghab) {
            zaghab = zaghad;
            zaghaa = zaghw[zaghac];
        }
    }
    return {
        x: zaghaa[0],
        y: zaghaa[1],
        z: zaghaa[2],
        error: Math.max(0, zaghab)
    };
}

function simplifyQuadric(zagha, zaghd) {
    zaghd = zaghd || {};
    var zaghf = zagha && zagha.attributes ? zagha.attributes.position : null;
    if (!zaghf || !zaghf.array) throw new Error("simplifyQuadric requires a geometry with a position attribute");
    var zaghg = zaghd.targetRatio;
    var zaghh = zaghd.targetTriangles;
    if (zaghg === undefined && zaghh === undefined) zaghg = .5;
    if (zaghg !== undefined && (typeof zaghg !== "number" || !isFinite(zaghg) || zaghg <= 0 || zaghg > 1)) throw new Error("simplifyQuadric targetRatio must be a number in (0, 1]");
    if (zaghh !== undefined && (typeof zaghh !== "number" || !isFinite(zaghh) || Math.floor(zaghh) !== zaghh || zaghh < 1)) throw new Error("simplifyQuadric targetTriangles must be an integer of at least 1");
    var zaghi = zaghd.lockBoundary === true;
    var zaghj = zaghf.itemSize || 3;
    var zaghk = Math.floor(zaghf.array.length / zaghj);
    if (zaghk < 3) throw new Error("simplifyQuadric requires at least 3 vertices");
    var zaghl = zagha.index || null;
    var zaghm = Math.floor((zaghl ? zaghl.length : zaghk) / 3);
    if (zaghh === undefined) zaghh = Math.max(1, Math.floor(zaghm * zaghg));
    if (zaghm <= zaghh) {
        var zaghn = zagha.clone();
        zaghn.userData = zaghn.userData || {};
        zaghn.userData.simplifyError = 0;
        zaghn.userData.simplifyTriangles = zaghm;
        return zaghn;
    }
    var zagho = new Float64Array(zaghk), zaghp = new Float64Array(zaghk), zaghq = new Float64Array(zaghk);
    for (var zaghr = 0; zaghr < zaghk; zaghr++) {
        zagho[zaghr] = zaghf.array[zaghr * zaghj];
        zaghp[zaghr] = zaghf.array[zaghr * zaghj + 1];
        zaghq[zaghr] = zaghf.array[zaghr * zaghj + 2];
    }
    var zaghs = new Int32Array(zaghk);
    for (var zaght = 0; zaght < zaghk; zaght++) zaghs[zaght] = zaght;
    function zaghu(zagha) {
        while (zaghs[zagha] !== zagha) {
            zaghs[zagha] = zaghs[zaghs[zagha]];
            zagha = zaghs[zagha];
        }
        return zagha;
    }
    var zaghv = new Int32Array(zaghm), zaghw = new Int32Array(zaghm), zaghx = new Int32Array(zaghm);
    var zaghy = new Uint8Array(zaghm);
    var zaghz = 0;
    for (var zaghaa = 0; zaghaa < zaghm; zaghaa++) {
        var zaghab = zaghl ? zaghl[zaghaa * 3] : zaghaa * 3;
        var zaghac = zaghl ? zaghl[zaghaa * 3 + 1] : zaghaa * 3 + 1;
        var zaghad = zaghl ? zaghl[zaghaa * 3 + 2] : zaghaa * 3 + 2;
        zaghv[zaghaa] = zaghu(zaghab);
        zaghw[zaghaa] = zaghu(zaghac);
        zaghx[zaghaa] = zaghu(zaghad);
        if (zaghv[zaghaa] === zaghw[zaghaa] || zaghw[zaghaa] === zaghx[zaghaa] || zaghv[zaghaa] === zaghx[zaghaa]) {
            zaghy[zaghaa] = 0;
            continue;
        }
        zaghy[zaghaa] = 1;
        zaghz++;
    }
    var zaghae = new Float64Array(zaghk * 10);
    var zaghaf = new Array(zaghk);
    for (var zaghag = 0; zaghag < zaghk; zaghag++) zaghaf[zaghag] = [];
    for (var zaghah = 0; zaghah < zaghm; zaghah++) {
        if (!zaghy[zaghah]) continue;
        var zaghai = zaghv[zaghah], zaghaj = zaghw[zaghah], zaghak = zaghx[zaghah];
        var zaghal = zagho[zaghaj] - zagho[zaghai], zagham = zaghp[zaghaj] - zaghp[zaghai], zaghan = zaghq[zaghaj] - zaghq[zaghai];
        var zaghao = zagho[zaghak] - zagho[zaghai], zaghap = zaghp[zaghak] - zaghp[zaghai], zaghaq = zaghq[zaghak] - zaghq[zaghai];
        var zaghar = zagham * zaghaq - zaghan * zaghap, zaghas = zaghan * zaghao - zaghal * zaghaq, zaghat = zaghal * zaghap - zagham * zaghao;
        var zaghau = Math.sqrt(zaghar * zaghar + zaghas * zaghas + zaghat * zaghat);
        if (zaghau < 1e-12) continue;
        zaghar /= zaghau;
        zaghas /= zaghau;
        zaghat /= zaghau;
        var zaghav = -(zaghar * zagho[zaghai] + zaghas * zaghp[zaghai] + zaghat * zaghq[zaghai]);
        var zaghaw = [ zaghai, zaghaj, zaghak ];
        for (var zaghax = 0; zaghax < 3; zaghax++) {
            var zaghay = zaghaw[zaghax] * 10;
            zaghae[zaghay] += zaghar * zaghar;
            zaghae[zaghay + 1] += zaghar * zaghas;
            zaghae[zaghay + 2] += zaghar * zaghat;
            zaghae[zaghay + 3] += zaghar * zaghav;
            zaghae[zaghay + 4] += zaghas * zaghas;
            zaghae[zaghay + 5] += zaghas * zaghat;
            zaghae[zaghay + 6] += zaghas * zaghav;
            zaghae[zaghay + 7] += zaghat * zaghat;
            zaghae[zaghay + 8] += zaghat * zaghav;
            zaghae[zaghay + 9] += zaghav * zaghav;
        }
        zaghaf[zaghai].push(zaghah);
        zaghaf[zaghaj].push(zaghah);
        zaghaf[zaghak].push(zaghah);
    }
    var zaghaz = null;
    if (zaghi) {
        zaghaz = new Uint8Array(zaghk);
        var zaghba = {};
        for (var zaghbb = 0; zaghbb < zaghm; zaghbb++) {
            if (!zaghy[zaghbb]) continue;
            var zaghbc = [ [ zaghv[zaghbb], zaghw[zaghbb] ], [ zaghw[zaghbb], zaghx[zaghbb] ], [ zaghv[zaghbb], zaghx[zaghbb] ] ];
            for (var zaghbd = 0; zaghbd < 3; zaghbd++) {
                var zaghbe = Math.min(zaghbc[zaghbd][0], zaghbc[zaghbd][1]), zaghbf = Math.max(zaghbc[zaghbd][0], zaghbc[zaghbd][1]);
                var zaghbg = zaghbe + "_" + zaghbf;
                zaghba[zaghbg] = (zaghba[zaghbg] || 0) + 1;
            }
        }
        for (var zaghbh in zaghba) {
            if (zaghba[zaghbh] !== 1) continue;
            var zaghbi = zaghbh.split("_");
            zaghaz[parseInt(zaghbi[0], 10)] = 1;
            zaghaz[parseInt(zaghbi[1], 10)] = 1;
        }
    }
    var zaghbj = [];
    var zaghbk = 0;
    function zaghbl(zagha, zaghc) {
        if (zagha === zaghc) return;
        if (zaghaz && (zaghaz[zagha] || zaghaz[zaghc])) return;
        var zaghd = new Float64Array(10);
        for (var zaghf = 0; zaghf < 10; zaghf++) zaghd[zaghf] = zaghae[zagha * 10 + zaghf] + zaghae[zaghc * 10 + zaghf];
        var zaghg = zaghe(zaghd, 0, zagho[zagha], zaghp[zagha], zaghq[zagha], zagho[zaghc], zaghp[zaghc], zaghq[zaghc]);
        zaghb(zaghbj, {
            e: zaghg.error,
            a: zagha,
            b: zaghc,
            x: zaghg.x,
            y: zaghg.y,
            z: zaghg.z,
            s: zaghbk++
        });
    }
    var zaghbm = {};
    for (var zaghbn = 0; zaghbn < zaghm; zaghbn++) {
        if (!zaghy[zaghbn]) continue;
        var zaghbo = [ [ zaghv[zaghbn], zaghw[zaghbn] ], [ zaghw[zaghbn], zaghx[zaghbn] ], [ zaghv[zaghbn], zaghx[zaghbn] ] ];
        for (var zaghbp = 0; zaghbp < 3; zaghbp++) {
            var zaghbq = Math.min(zaghbo[zaghbp][0], zaghbo[zaghbp][1]), zaghbr = Math.max(zaghbo[zaghbp][0], zaghbo[zaghbp][1]);
            var zaghbs = zaghbq + "_" + zaghbr;
            if (zaghbm[zaghbs]) continue;
            zaghbm[zaghbs] = true;
            zaghbl(zaghbq, zaghbr);
        }
    }
    function zaghbt(zagha, zaghb) {
        var zaghc = zaghaf[zagha].length <= zaghaf[zaghb].length ? zaghaf[zagha] : zaghaf[zaghb];
        var zaghd = zaghc === zaghaf[zagha] ? zaghb : zagha;
        for (var zaghe = 0; zaghe < zaghc.length; zaghe++) {
            var zaghf = zaghc[zaghe];
            if (!zaghy[zaghf]) continue;
            if ((zaghv[zaghf] === zaghd || zaghw[zaghf] === zaghd || zaghx[zaghf] === zaghd) && (zaghv[zaghf] === zagha || zaghw[zaghf] === zagha || zaghx[zaghf] === zagha)) return true;
        }
        return false;
    }
    var zaghbu = 0;
    var zaghbv = 0;
    while (zaghz > zaghh && zaghbj.length > 0 && zaghbv++ < zaghm * 40) {
        var zaghbw = zaghc(zaghbj);
        var zaghbx = zaghu(zaghbw.a), zaghby = zaghu(zaghbw.b);
        if (zaghbx === zaghby || zaghbx >= zaghk || zaghby >= zaghk) continue;
        if (zaghaz && (zaghaz[zaghbx] || zaghaz[zaghby])) continue;
        if (!zaghbt(zaghbx, zaghby)) continue;
        var zaghbz = new Float64Array(10);
        for (var zaghca = 0; zaghca < 10; zaghca++) zaghbz[zaghca] = zaghae[zaghbx * 10 + zaghca] + zaghae[zaghby * 10 + zaghca];
        var zaghcb = zaghe(zaghbz, 0, zagho[zaghbx], zaghp[zaghbx], zaghq[zaghbx], zagho[zaghby], zaghp[zaghby], zaghq[zaghby]);
        if (zaghcb.error > zaghbw.e * 1.000001 + 1e-12) {
            zaghb(zaghbj, {
                e: zaghcb.error,
                a: zaghbx,
                b: zaghby,
                x: zaghcb.x,
                y: zaghcb.y,
                z: zaghcb.z,
                s: zaghbk++
            });
            continue;
        }
        if (zaghcb.error > zaghbu) zaghbu = zaghcb.error;
        for (var zaghcc = 0; zaghcc < 10; zaghcc++) zaghae[zaghbx * 10 + zaghcc] = zaghbz[zaghcc];
        zagho[zaghbx] = zaghcb.x;
        zaghp[zaghbx] = zaghcb.y;
        zaghq[zaghbx] = zaghcb.z;
        var zaghcd = zaghaf[zaghby];
        for (var zaghce = 0; zaghce < zaghcd.length; zaghce++) {
            var zaghcf = zaghcd[zaghce];
            if (!zaghy[zaghcf]) continue;
            if (zaghv[zaghcf] === zaghby) zaghv[zaghcf] = zaghbx;
            if (zaghw[zaghcf] === zaghby) zaghw[zaghcf] = zaghbx;
            if (zaghx[zaghcf] === zaghby) zaghx[zaghcf] = zaghbx;
            if (zaghv[zaghcf] === zaghw[zaghcf] || zaghw[zaghcf] === zaghx[zaghcf] || zaghv[zaghcf] === zaghx[zaghcf]) {
                zaghy[zaghcf] = 0;
                zaghz--;
                continue;
            }
            zaghaf[zaghbx].push(zaghcf);
        }
        zaghaf[zaghby] = [];
        zaghs[zaghby] = zaghbx;
        var zaghcg = {};
        var zaghch = zaghaf[zaghbx];
        for (var zaghci = 0; zaghci < zaghch.length; zaghci++) {
            var zaghcj = zaghch[zaghci];
            if (!zaghy[zaghcj]) continue;
            zaghcg[zaghv[zaghcj]] = 1;
            zaghcg[zaghw[zaghcj]] = 1;
            zaghcg[zaghx[zaghcj]] = 1;
        }
        for (var zaghck in zaghcg) zaghbl(zaghbx, parseInt(zaghck, 10));
    }
    var zaghcl = new Int32Array(zaghk);
    for (var zaghcm = 0; zaghcm < zaghk; zaghcm++) zaghcl[zaghcm] = -1;
    var zaghcn = [];
    var zaghco = [];
    for (var zaghcp = 0; zaghcp < zaghm; zaghcp++) {
        if (!zaghy[zaghcp]) continue;
        var zaghcq = zaghu(zaghv[zaghcp]), zaghcr = zaghu(zaghw[zaghcp]), zaghcs = zaghu(zaghx[zaghcp]);
        if (zaghcq === zaghcr || zaghcr === zaghcs || zaghcq === zaghcs) continue;
        if (zaghcl[zaghcq] === -1) {
            zaghcl[zaghcq] = zaghcn.length;
            zaghcn.push(zaghcq);
        }
        if (zaghcl[zaghcr] === -1) {
            zaghcl[zaghcr] = zaghcn.length;
            zaghcn.push(zaghcr);
        }
        if (zaghcl[zaghcs] === -1) {
            zaghcl[zaghcs] = zaghcn.length;
            zaghcn.push(zaghcs);
        }
        zaghco.push(zaghcl[zaghcq], zaghcl[zaghcr], zaghcl[zaghcs]);
    }
    var zaghct = new Geometry;
    for (var zaghcu in zagha.attributes) {
        var zaghcv = zagha.attributes[zaghcu];
        var zaghcw = zaghcv.itemSize || 1;
        var zaghcx = new zaghcv.array.constructor(zaghcn.length * zaghcw);
        for (var zaghcy = 0; zaghcy < zaghcn.length; zaghcy++) {
            var zaghcz = zaghcn[zaghcy];
            if (zaghcu === "position") {
                zaghcx[zaghcy * zaghcw] = zagho[zaghcz];
                if (zaghcw > 1) zaghcx[zaghcy * zaghcw + 1] = zaghp[zaghcz];
                if (zaghcw > 2) zaghcx[zaghcy * zaghcw + 2] = zaghq[zaghcz];
            } else {
                for (var zaghda = 0; zaghda < zaghcw && zaghda < 3; zaghda++) zaghcx[zaghcy * zaghcw + zaghda] = zaghcv.array[zaghcz * zaghcw + zaghda];
            }
        }
        zaghct.setAttribute(zaghcu, zaghcx, zaghcw, !!zaghcv.normalized);
    }
    zaghct.setIndex(zaghcn.length > 65535 ? new Uint32Array(zaghco) : new Uint16Array(zaghco));
    if (zaghct.attributes.normal) zaghct.computeVertexNormals();
    zaghct.computeBounds();
    zaghct.userData = {
        simplifyError: zaghbu,
        simplifyTriangles: zaghco.length / 3
    };
    return zaghct;
}

Geometry.prototype.simplifyQuadric = function(zagha) {
    return simplifyQuadric(this, zagha);
};

class AutomaticLOD extends Object3D {
    constructor(zagha, zaghb) {
        super();
        zaghb = zaghb || {};
        if (!zagha || !zagha.geometry || !zagha.geometry.attributes || !zagha.geometry.attributes.position) throw new Error("AutomaticLOD requires a mesh with a positioned geometry");
        this.type = "AutomaticLOD";
        this.mesh = zagha;
        var zaghc = zaghb.schedule === undefined ? null : zaghb.schedule;
        if (zaghc !== null) {
            if (!Array.isArray(zaghc) || zaghc.length === 0) throw new Error("AutomaticLOD schedule must be a non-empty array of {ratio, distance}");
            for (var zaghd = 0; zaghd < zaghc.length; zaghd++) {
                var zaghe = zaghc[zaghd];
                if (!zaghe || typeof zaghe !== "object") throw new Error("AutomaticLOD schedule entries must be objects with ratio and distance");
                if (zaghe.ratio !== undefined && (typeof zaghe.ratio !== "number" || !isFinite(zaghe.ratio) || zaghe.ratio <= 0 || zaghe.ratio > 1)) throw new Error("AutomaticLOD schedule ratio must be a number in (0, 1]");
                if (typeof zaghe.distance !== "number" || !isFinite(zaghe.distance) || zaghe.distance < 0) throw new Error("AutomaticLOD schedule distance must be a non-negative finite number");
                if (zaghd > 0 && !(zaghe.distance > zaghc[zaghd - 1].distance)) throw new Error("AutomaticLOD schedule distances must be strictly increasing");
            }
        }
        this.scheduleOption = zaghc;
        var zaghf = zaghb.fadeFrames === undefined ? 8 : zaghb.fadeFrames;
        if (typeof zaghf !== "number" || !isFinite(zaghf) || Math.floor(zaghf) !== zaghf || zaghf < 1) throw new Error("AutomaticLOD fadeFrames must be an integer of at least 1");
        this.fadeFrames = zaghf;
        var zaghg = zaghb.hysteresis === undefined ? .05 : zaghb.hysteresis;
        if (typeof zaghg !== "number" || !isFinite(zaghg) || zaghg < 0) throw new Error("AutomaticLOD hysteresis must be a non-negative finite number");
        this.hysteresis = zaghg;
        this.lockBoundary = zaghb.lockBoundary === true;
        this.levels = [];
        this.chain = [];
        this.activeLevel = -1;
        this.fade = {
            active: false,
            from: -1,
            to: -1,
            progress: 0
        };
        this.impostor = null;
        this.billboard = null;
        this.boundRadius = 1;
        this.boundCenter = new Vector3;
        this.counters = {
            switches: 0,
            frames: 0
        };
    }
    radius() {
        var zagha = this.mesh.geometry;
        if (!zagha.boundingSphere) zagha.computeBounds();
        var zaghb = zagha.boundingSphere;
        this.boundRadius = zaghb && typeof zaghb.radius === "number" && zaghb.radius > 0 ? zaghb.radius : 1;
        if (zaghb && zaghb.center) this.boundCenter.copy(zaghb.center);
        return this.boundRadius;
    }
    build() {
        if (this.levels.length) return this;
        var zagha = this.radius();
        var zaghb = this.scheduleOption || [ {
            ratio: 1,
            distance: 0
        }, {
            ratio: .5,
            distance: zagha * 6
        }, {
            ratio: .25,
            distance: zagha * 12
        } ];
        for (var zaghc = 0; zaghc < zaghb.length; zaghc++) {
            var zaghd = zaghb[zaghc];
            var zaghe = zaghc === 0 ? this.mesh.geometry : simplifyQuadric(this.mesh.geometry, {
                targetRatio: zaghd.ratio,
                lockBoundary: this.lockBoundary
            });
            var zaghf = this.mesh.material && this.mesh.material.clone ? this.mesh.material.clone() : new BasicMaterial;
            if (this.mesh.material) zaghf.vertexColors = this.mesh.material.vertexColors === true;
            var zaghg = new Mesh(zaghe, zaghf);
            zaghg.visible = false;
            this.add(zaghg);
            var zaghh = zaghe.userData && typeof zaghe.userData.simplifyTriangles === "number" ? zaghe.userData.simplifyTriangles : Math.floor((zaghe.index ? zaghe.index.length : zaghe.attributes.position.array.length / 3) / 3);
            var zaghi = zaghe.userData && typeof zaghe.userData.simplifyError === "number" ? zaghe.userData.simplifyError : 0;
            this.levels.push({
                geometry: zaghe,
                mesh: zaghg,
                material: zaghf,
                ratio: zaghd.ratio === undefined ? 1 : zaghd.ratio,
                distance: zaghd.distance,
                triangles: zaghh,
                error: zaghi,
                originalTransparent: zaghf.transparent === true
            });
        }
        this.chain = this.levels.slice();
        return this;
    }
    levelMaterial(zagha) {
        if (zagha < 0 || zagha >= this.chain.length) return null;
        if (this.chain[zagha].impostor) return this.billboard ? this.billboard.material : null;
        return this.chain[zagha].material;
    }
    setLevelOpacity(zagha, zaghb) {
        var zaghc = this.levelMaterial(zagha);
        if (zaghc) {
            zaghc.opacity = zaghb;
            zaghc.transparent = true;
            zaghc.needsUpdate = true;
        }
    }
    beginSwitch(zagha) {
        if (this.fade.active) this.finishFade();
        var zaghb = this.activeLevel;
        this.activeLevel = zagha;
        this.counters.switches++;
        if (this.fadeFrames >= 2 && zaghb >= 0 && this.levelMaterial(zaghb) && this.levelMaterial(zagha)) {
            this.fade = {
                active: true,
                from: zaghb,
                to: zagha,
                progress: 0
            };
        }
    }
    stepFade() {
        this.fade.progress += 1 / this.fadeFrames;
        if (this.fade.progress >= 1) {
            this.finishFade();
            return;
        }
        var zagha = ditheredOpacity(this.fade.progress);
        this.setLevelOpacity(this.fade.from, 1 - zagha);
        this.setLevelOpacity(this.fade.to, zagha);
    }
    finishFade() {
        if (!this.fade.active) return;
        var zagha = this.fade.from, zaghb = this.fade.to;
        this.setLevelOpacity(zagha, 1);
        this.setLevelOpacity(zaghb, 1);
        if (this.chain[zagha] && !this.chain[zagha].impostor && this.chain[zagha].originalTransparent === false) this.chain[zagha].material.transparent = false;
        if (this.chain[zaghb] && !this.chain[zaghb].impostor && this.chain[zaghb].originalTransparent === false) this.chain[zaghb].material.transparent = false;
        this.fade = {
            active: false,
            from: -1,
            to: -1,
            progress: 0
        };
    }
    show(zagha) {
        if (zagha < 0 || zagha >= this.chain.length) return;
        if (this.chain[zagha].impostor) {
            if (this.billboard) this.billboard.visible = true;
        } else this.chain[zagha].mesh.visible = true;
    }
    applyVisibility() {
        for (var zagha = 0; zagha < this.levels.length; zagha++) this.levels[zagha].mesh.visible = false;
        if (this.billboard) this.billboard.visible = false;
        if (this.fade.active) {
            this.show(this.fade.from);
            this.show(this.fade.to);
        } else if (this.activeLevel >= 0) this.show(this.activeLevel);
    }
    frameForDirection(zagha) {
        var zaghb = this.impostor.views;
        var zaghc = Math.abs(zagha.x), zaghd = Math.abs(zagha.y), zaghe = Math.abs(zagha.z);
        if (zaghb === 4) return zaghc >= zaghe ? zagha.x >= 0 ? 0 : 1 : zagha.z >= 0 ? 2 : 3;
        if (zaghc >= zaghd && zaghc >= zaghe) return zagha.x >= 0 ? 0 : 1;
        if (zaghd >= zaghe) return zagha.y >= 0 ? 2 : 3;
        return zagha.z >= 0 ? 4 : 5;
    }
    updateBillboard(zagha, zaghb, zaghc) {
        if (!this.impostor || !this.billboard || !this.billboard.visible) return;
        this.billboard.lookAt(zagha);
        this.billboard.scale.setScalar(Math.max(1e-6, zaghc * this.impostor.tanHalfFov));
        this.billboard.updateMatrixWorld(true);
        var zaghd = (new Vector3).subVectors(zagha, zaghb);
        if (zaghd.lengthSq() < 1e-12) zaghd.set(0, 0, 1);
        zaghd.normalize();
        var zaghe = this.frameForDirection(zaghd);
        var zaghf = this.impostor.frames[zaghe];
        this.billboard.geometry.attributes.uv = zaghf.uv;
        this.impostor.frame = zaghe;
    }
    update(zagha) {
        if (!zagha || zagha.position === undefined) throw new Error("AutomaticLOD.update requires a camera with a position");
        if (!this.levels.length) this.build();
        this.counters.frames++;
        this.updateMatrixWorld(true);
        zagha.updateMatrixWorld(true);
        var zaghb = this.getWorldPosition(new Vector3);
        var zaghc = zagha.getWorldPosition(new Vector3);
        var zaghd = zaghb.distanceTo(zaghc);
        var zaghe = 0;
        for (var zaghf = this.chain.length - 1; zaghf >= 0; zaghf--) {
            if (zaghd >= this.chain[zaghf].distance) {
                zaghe = zaghf;
                break;
            }
        }
        if (zaghe !== this.activeLevel && this.activeLevel >= 0 && this.hysteresis > 0 && this.chain[zaghe]) {
            var zaghg = this.chain[Math.max(this.activeLevel, zaghe)].distance;
            if (Math.abs(zaghd - zaghg) <= this.hysteresis * Math.max(1e-9, zaghg)) zaghe = this.activeLevel;
        }
        if (zaghe !== this.activeLevel) this.beginSwitch(zaghe);
        if (this.fade.active) this.stepFade();
        this.applyVisibility();
        this.updateBillboard(zaghc, zaghb, zaghd);
        return this.snapshot();
    }
    snapshot() {
        var zagha = [];
        for (var zaghb = 0; zaghb < this.chain.length; zaghb++) zagha.push({
            triangles: this.chain[zaghb].triangles === undefined ? null : this.chain[zaghb].triangles,
            error: this.chain[zaghb].error === undefined ? null : this.chain[zaghb].error,
            distance: this.chain[zaghb].distance,
            impostor: this.chain[zaghb].impostor === true
        });
        return {
            level: this.activeLevel,
            switches: this.counters.switches,
            frames: this.counters.frames,
            fade: {
                active: this.fade.active,
                from: this.fade.from,
                to: this.fade.to,
                progress: this.fade.active ? this.fade.progress : 1
            },
            chain: zagha,
            impostor: this.impostor ? {
                frame: this.impostor.frame === undefined ? -1 : this.impostor.frame,
                views: this.impostor.views,
                size: this.impostor.size
            } : null
        };
    }
    async captureImpostor(zagha, zaghb) {
        if (!zagha || !zagha.device || !zagha.initialized) throw new Error("AutomaticLOD.captureImpostor requires an initialized WebGPU renderer");
        zaghb = zaghb || {};
        if (!this.levels.length) this.build();
        var zaghc = zaghb.size === undefined ? 128 : zaghb.size;
        if (typeof zaghc !== "number" || !isFinite(zaghc) || Math.floor(zaghc) !== zaghc || zaghc < 8) throw new Error("AutomaticLOD captureImpostor size must be an integer of at least 8");
        var zaghd = zaghb.views === undefined ? 6 : zaghb.views;
        if (zaghd !== 4 && zaghd !== 6) throw new Error("AutomaticLOD captureImpostor views must be 4 or 6");
        var zaghe = this.radius();
        var zaghf = this.boundCenter;
        var zaghg = this.chain.length ? this.chain[this.chain.length - 1].distance : 0;
        var zaghh = faoxomvalue(zaghb.distance, Math.max(zaghg * 1.5, zaghe * 6));
        if (typeof zaghh !== "number" || !isFinite(zaghh) || zaghh < 0) throw new Error("AutomaticLOD captureImpostor distance must be a non-negative finite number");
        var zaghi = zagha.device;
        var zaghj = Math.max(zaghe * 3, zaghe + .001);
        var zaghk = Math.asin(Math.min(.999, zaghe / zaghj));
        var zaghl = Math.tan(zaghk);
        var zaghm = zaghk * 360 / Math.PI;
        var zaghn = Math.max(1e-4, zaghj - 2 * zaghe);
        var zagho = zaghj + 2 * zaghe;
        var zaghp = zaghd === 4 ? [ [ 1, 0, 0 ], [ -1, 0, 0 ], [ 0, 0, 1 ], [ 0, 0, -1 ] ] : [ [ 1, 0, 0 ], [ -1, 0, 0 ], [ 0, 1, 0 ], [ 0, -1, 0 ], [ 0, 0, 1 ], [ 0, 0, -1 ] ];
        var zaghq = new Scene;
        var zaghr = new Mesh(this.mesh.geometry, new BasicMaterial({
            vertexColors: true,
            side: DoubleSide
        }));
        zaghq.add(zaghr);
        var zaghs = {
            r: zagha.clearColor.r,
            g: zagha.clearColor.g,
            b: zagha.clearColor.b
        };
        zagha.clearColor.r = 37 / 255;
        zagha.clearColor.g = 201 / 255;
        zagha.clearColor.b = 151 / 255;
        var zaght = Math.ceil(zaghc * 4 / 256) * 256;
        var zaghu = new Uint8Array(zaghd * zaghc * zaghc * 4);
        for (var zaghv = 0; zaghv < zaghd; zaghv++) {
            var zaghw = zaghi.createTexture({
                size: [ zaghc, zaghc, 1 ],
                format: "rgba8unorm",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
            });
            var zaghx = zaghi.createTexture({
                size: [ zaghc, zaghc, 1 ],
                format: "depth24plus",
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
            var zaghy = new PerspectiveCamera(zaghm, 1, zaghn, zagho);
            zaghy.position.set(zaghf.x + zaghp[zaghv][0] * zaghj, zaghf.y + zaghp[zaghv][1] * zaghj, zaghf.z + zaghp[zaghv][2] * zaghj);
            zaghy.lookAt(zaghf);
            zaghy.updateMatrixWorld(true);
            zagha.renderToView(zaghq, zaghy, zaghw.createView(), zaghx.createView(), "rgba8unorm");
            var zaghz = zaghi.createBuffer({
                size: zaght * zaghc,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            var zaghaa = zaghi.createCommandEncoder();
            zaghaa.copyTextureToBuffer({
                texture: zaghw
            }, {
                buffer: zaghz,
                bytesPerRow: zaght,
                rowsPerImage: zaghc
            }, [ zaghc, zaghc, 1 ]);
            zaghi.queue.submit([ zaghaa.finish() ]);
            await zaghz.mapAsync(GPUMapMode.READ);
            var zaghab = new Uint8Array(zaghz.getMappedRange());
            for (var zaghac = 0; zaghac < zaghc; zaghac++) {
                for (var zaghad = 0; zaghad < zaghc; zaghad++) {
                    var zaghae = zaghac * zaght + zaghad * 4;
                    var zaghaf = (zaghac * zaghd * zaghc + zaghv * zaghc + zaghad) * 4;
                    if (zaghab[zaghae] === 37 && zaghab[zaghae + 1] === 201 && zaghab[zaghae + 2] === 151 && zaghab[zaghae + 3] === 255) {
                        zaghu[zaghaf] = 37;
                        zaghu[zaghaf + 1] = 201;
                        zaghu[zaghaf + 2] = 151;
                        zaghu[zaghaf + 3] = 0;
                    } else {
                        zaghu[zaghaf] = zaghab[zaghae];
                        zaghu[zaghaf + 1] = zaghab[zaghae + 1];
                        zaghu[zaghaf + 2] = zaghab[zaghae + 2];
                        zaghu[zaghaf + 3] = zaghab[zaghae + 3];
                    }
                }
            }
            zaghz.unmap();
            zaghz.destroy();
            zaghw.destroy();
            zaghx.destroy();
        }
        zagha.clearColor.r = zaghs.r;
        zagha.clearColor.g = zaghs.g;
        zagha.clearColor.b = zaghs.b;
        var zaghag = new DataTexture(zaghu, zaghd * zaghc, zaghc, {
            minFilter: "linear",
            magFilter: "linear"
        });
        var zaghah = new Geometry;
        zaghah.setAttribute("position", new Float32Array([ -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0 ]), 3);
        zaghah.setAttribute("normal", new Float32Array([ 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1 ]), 3);
        zaghah.setAttribute("uv", new Float32Array([ 0, 0, 1, 0, 1, 1, 0, 1 ]), 2);
        zaghah.setIndex(new Uint16Array([ 0, 1, 2, 0, 2, 3 ]));
        var zaghai = new BasicMaterial({
            map: zaghag,
            transparent: true,
            side: DoubleSide
        });
        var zaghaj = new Mesh(zaghah, zaghai);
        zaghaj.visible = false;
        this.add(zaghaj);
        var zaghak = [];
        for (var zaghal = 0; zaghal < zaghd; zaghal++) {
            var zagham = zaghal / zaghd, zaghan = (zaghal + 1) / zaghd;
            zaghak.push({
                dir: zaghp[zaghal],
                index: zaghal,
                u0: zagham,
                u1: zaghan,
                v0: 0,
                v1: 1,
                uv: {
                    array: new Float32Array([ zagham, 0, zaghan, 0, zaghan, 1, zagham, 1 ]),
                    itemSize: 2
                }
            });
        }
        this.impostor = {
            size: zaghc,
            views: zaghd,
            frames: zaghak,
            data: zaghu,
            texture: zaghag,
            tanHalfFov: zaghl,
            distance: zaghh,
            frame: -1
        };
        this.billboard = zaghaj;
        this.chain = this.levels.concat([ {
            distance: zaghh,
            impostor: true
        } ]);
        return this;
    }
    dispose() {
        if (this.fade.active) this.finishFade();
        for (var zagha = 0; zagha < this.levels.length; zagha++) {
            this.remove(this.levels[zagha].mesh);
            if (zagha > 0 && this.levels[zagha].geometry && this.levels[zagha].geometry.dispose) this.levels[zagha].geometry.dispose();
        }
        if (this.billboard) {
            this.remove(this.billboard);
            this.billboard.material.map = null;
            if (this.billboard.geometry && this.billboard.geometry.dispose) this.billboard.geometry.dispose();
        }
        this.levels = [];
        this.chain = [];
        this.impostor = null;
        this.billboard = null;
        this.activeLevel = -1;
        return this;
    }
}

export { AutomaticLOD, simplifyQuadric, bayer8, ditherThreshold, ditheredOpacity };
