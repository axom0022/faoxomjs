import { DataTexture } from "../textures/index.js";

import { LTC_BAKED_SIZE, LTC_BAKED_MAT, LTC_BAKED_AMP } from "./LTCData.js";

var zalna = Math.PI;

function zalnb(zalna) {
    var zalnb = Math.hypot(zalna[0], zalna[1], zalna[2]);
    return [ zalna[0] / zalnb, zalna[1] / zalnb, zalna[2] / zalnb ];
}

function zalnc(zalna, zalnb) {
    return [ zalna[0] * zalnb[0] + zalna[1] * zalnb[1] + zalna[2] * zalnb[2], zalna[3] * zalnb[0] + zalna[4] * zalnb[1] + zalna[5] * zalnb[2], zalna[6] * zalnb[0] + zalna[7] * zalnb[1] + zalna[8] * zalnb[2] ];
}

function zalnd(zalna) {
    return zalna[0] * (zalna[4] * zalna[8] - zalna[5] * zalna[7]) - zalna[1] * (zalna[3] * zalna[8] - zalna[5] * zalna[6]) + zalna[2] * (zalna[3] * zalna[7] - zalna[4] * zalna[6]);
}

function zalne(zalna) {
    var zalnb = zalnd(zalna) || 1e-12;
    return [ (zalna[4] * zalna[8] - zalna[5] * zalna[7]) / zalnb, (zalna[2] * zalna[7] - zalna[1] * zalna[8]) / zalnb, (zalna[1] * zalna[5] - zalna[2] * zalna[4]) / zalnb, (zalna[5] * zalna[6] - zalna[3] * zalna[8]) / zalnb, (zalna[0] * zalna[8] - zalna[2] * zalna[6]) / zalnb, (zalna[2] * zalna[3] - zalna[0] * zalna[5]) / zalnb, (zalna[3] * zalna[7] - zalna[4] * zalna[6]) / zalnb, (zalna[1] * zalna[6] - zalna[0] * zalna[7]) / zalnb, (zalna[0] * zalna[4] - zalna[1] * zalna[3]) / zalnb ];
}

function zalnf(zalna) {
    return [ zalna[0], 0, zalna[2], 0, zalna[1], 0, zalna[2], 0, zalna[3] ];
}

function zalng(zalnc, zalnd, zalne) {
    var zalnf = Math.sqrt(Math.max(0, 1 - zalnd * zalnd));
    var zalng = [ zalnf, 0, zalnd ];
    var zalnh = zalnc * zalnc, zalni = (zalnc + 1) * (zalnc + 1) / 8;
    var zalnj = function(zalna, zalnb) {
        return zalna / (zalna * (1 - zalni) + zalni) * (zalnb / (zalnb * (1 - zalni) + zalni));
    };
    var zalnk = [], zalnl = [];
    var zalnm = zalna * (3 - Math.sqrt(5));
    for (var zalnn = 0; zalnn < zalne; zalnn++) {
        var zalno = (zalnn + .5) / zalne, zalnp = Math.sqrt(1 - zalno * zalno), zalnq = zalnm * zalnn;
        var zalnr = [ zalnp * Math.cos(zalnq), zalnp * Math.sin(zalnq), zalno ];
        var zalns = zalnb([ zalng[0] + zalnr[0], zalng[1] + zalnr[1], zalng[2] + zalnr[2] ]);
        var zalnt = Math.max(0, zalns[2]), zalnu = zalnt * zalnt * (zalnh - 1) + 1;
        var zalnv = zalnh / (zalna * zalnu * zalnu);
        var zalnw = zalnr[2];
        zalnk.push(zalnr);
        zalnl.push(zalnw > 0 ? zalnv * zalnj(zalnd, zalnw) / (4 * Math.max(zalnd, 1e-4) * zalnw) : 0);
    }
    return {
        dirs: zalnk,
        vals: zalnl
    };
}

function zalnh(zalna, zalnb) {
    var zalng = zalnf(zalna), zalnh = zalne(zalng);
    var zalni = zalnc(zalnh, zalnb);
    var zalnj = Math.hypot(zalni[0], zalni[1], zalni[2]);
    if (zalnj < 1e-9) return 0;
    var zalnk = zalni[2] / zalnj;
    if (zalnk <= 0) return 0;
    return zalna[4] * Math.abs(1 / zalnd(zalng)) * (zalnk / Math.pow(zalnj, 3));
}

function zalni(zalna, zalnb, zalnc, zalnd, zalne) {
    var zalnf = .001;
    var zalng = function(zalna) {
        var zalne = 0;
        for (var zalnf = 0; zalnf < zalnb.length; zalnf++) {
            var zalng = zalnh(zalna, zalnb[zalnf]) - zalnc[zalnf];
            zalne += zalnd[zalnf] * zalng * zalng;
        }
        return zalne;
    };
    var zalni = zalng(zalna);
    for (var zalnj = 0; zalnj < zalne; zalnj++) {
        var zalnk = [], zalnl = [];
        for (var zalnm = 0; zalnm < zalnb.length; zalnm++) {
            zalnk.push([]);
            zalnl.push(Math.sqrt(zalnd[zalnm]) * (zalnh(zalna, zalnb[zalnm]) - zalnc[zalnm]));
        }
        var zalnn = 1e-5;
        for (var zalno = 0; zalno < 5; zalno++) {
            var zalnp = zalna.slice(), zalnq = zalna.slice();
            zalnp[zalno] += zalnn;
            zalnq[zalno] -= zalnn;
            for (var zalnr = 0; zalnr < zalnb.length; zalnr++) zalnk[zalnr][zalno] = Math.sqrt(zalnd[zalnr]) * (zalnh(zalnp, zalnb[zalnr]) - zalnh(zalnq, zalnb[zalnr])) / (2 * zalnn);
        }
        var zalns = [ [ 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0 ] ], zalnt = [ 0, 0, 0, 0, 0 ];
        for (var zalnu = 0; zalnu < zalnb.length; zalnu++) for (var zalnv = 0; zalnv < 5; zalnv++) {
            for (var zalnw = 0; zalnw < 5; zalnw++) zalns[zalnv][zalnw] += zalnk[zalnu][zalnv] * zalnk[zalnu][zalnw];
            zalnt[zalnv] += zalnk[zalnu][zalnv] * zalnl[zalnu];
        }
        for (var zalnx = 0; zalnx < 5; zalnx++) zalns[zalnx][zalnx] *= 1 + zalnf;
        var zalny = [ zalns[0].concat(-zalnt[0]), zalns[1].concat(-zalnt[1]), zalns[2].concat(-zalnt[2]), zalns[3].concat(-zalnt[3]), zalns[4].concat(-zalnt[4]) ];
        for (var zalnz = 0; zalnz < 5; zalnz++) {
            var zalnaa = zalnz;
            for (var zalnab = zalnz + 1; zalnab < 5; zalnab++) if (Math.abs(zalny[zalnab][zalnz]) > Math.abs(zalny[zalnaa][zalnz])) zalnaa = zalnab;
            if (Math.abs(zalny[zalnaa][zalnz]) < 1e-14) continue;
            var zalnac = zalny[zalnz];
            zalny[zalnz] = zalny[zalnaa];
            zalny[zalnaa] = zalnac;
            for (var zalnad = zalnz + 1; zalnad < 5; zalnad++) {
                var zalnae = zalny[zalnad][zalnz] / zalny[zalnz][zalnz];
                for (var zalnaf = zalnz; zalnaf < 6; zalnaf++) zalny[zalnad][zalnaf] -= zalnae * zalny[zalnz][zalnaf];
            }
        }
        var zalnag = [ 0, 0, 0, 0, 0 ];
        for (var zalnah = 4; zalnah >= 0; zalnah--) {
            var zalnai = zalny[zalnah][5];
            for (var zalnaj = zalnah + 1; zalnaj < 5; zalnaj++) zalnai -= zalny[zalnah][zalnaj] * zalnag[zalnaj];
            zalnag[zalnah] = Math.abs(zalny[zalnah][zalnah]) > 1e-14 ? zalnai / zalny[zalnah][zalnah] : 0;
        }
        var zalnak = zalna.map(function(zalna, zalnb) {
            return zalna + zalnag[zalnb];
        });
        zalnak[0] = Math.max(.05, zalnak[0]);
        zalnak[1] = Math.max(.05, zalnak[1]);
        zalnak[3] = Math.max(.1, zalnak[3]);
        zalnak[4] = Math.max(0, zalnak[4]);
        var zalnal = zalng(zalnak);
        if (zalnal < zalni) {
            zalna = zalnak;
            zalni = zalnal;
            zalnf = Math.max(zalnf * .5, 1e-9);
        } else {
            zalnf *= 4;
            if (zalnf > 1e6) break;
        }
    }
    return {
        p: zalna,
        err: zalni
    };
}

function zalnj(zalna) {
    var zalnb = [ 0, 0, 0 ];
    for (var zalnc = 0; zalnc < zalna.length; zalnc++) {
        var zalnd = zalna[zalnc], zalne = zalna[(zalnc + 1) % zalna.length];
        var zalnf = [ zalnd[1] * zalne[2] - zalnd[2] * zalne[1], zalnd[2] * zalne[0] - zalnd[0] * zalne[2], zalnd[0] * zalne[1] - zalnd[1] * zalne[0] ];
        var zalng = Math.hypot(zalnf[0], zalnf[1], zalnf[2]);
        var zalnh = Math.acos(Math.max(-.9999, Math.min(.9999, zalnd[0] * zalne[0] + zalnd[1] * zalne[1] + zalnd[2] * zalne[2])));
        if (zalng > 1e-12) for (var zalni = 0; zalni < 3; zalni++) zalnb[zalni] += zalnf[zalni] / zalng * zalnh;
    }
    return [ zalnb[0] / 2, zalnb[1] / 2, zalnb[2] / 2 ];
}

function zalnk(zalna) {
    var zalnb = [];
    for (var zalnc = 0; zalnc < zalna.length; zalnc++) {
        var zalnd = zalna[zalnc], zalne = zalna[(zalnc + 1) % zalna.length];
        var zalnf = zalnd[2] >= 0, zalng = zalne[2] >= 0;
        if (zalnf) zalnb.push(zalnd);
        if (zalnf !== zalng) {
            var zalnh = zalnd[2] / (zalnd[2] - zalne[2]);
            zalnb.push([ zalnd[0] + zalnh * (zalne[0] - zalnd[0]), zalnd[1] + zalnh * (zalne[1] - zalnd[1]), 0 ]);
        }
    }
    return zalnb;
}

function zalnl(zalnc, zalnd, zalne, zalnf) {
    var zalng = Math.sqrt(Math.max(0, 1 - zalnd * zalnd));
    var zalnh = [ zalng, 0, zalnd ];
    var zalni = zalnc * zalnc, zalnj = (zalnc + 1) * (zalnc + 1) / 8;
    var zalnk = function(zalna, zalnb) {
        return zalna / (zalna * (1 - zalnj) + zalnj) * (zalnb / (zalnb * (1 - zalnj) + zalnj));
    };
    var zalnl = zalne[0], zalnm = zalne[1], zalnn = zalne[3];
    var zalno = [ zalnm[0] - zalnl[0], zalnm[1] - zalnl[1], zalnm[2] - zalnl[2] ], zalnp = [ zalnn[0] - zalnl[0], zalnn[1] - zalnl[1], zalnn[2] - zalnl[2] ];
    var zalnq = Math.hypot(zalno[0], zalno[1], zalno[2]) * Math.hypot(zalnp[0], zalnp[1], zalnp[2]);
    var zalnr = 0, zalns = 1 / zalnf;
    for (var zalnt = 0; zalnt < zalnf; zalnt++) for (var zalnu = 0; zalnu < zalnf; zalnu++) {
        var zalnv = (zalnt + .5) * zalns, zalnw = (zalnu + .5) * zalns;
        var zalnx = [ zalnl[0] + zalnv * zalno[0] + zalnw * zalnp[0], zalnl[1] + zalnv * zalno[1] + zalnw * zalnp[1], zalnl[2] + zalnv * zalno[2] + zalnw * zalnp[2] ];
        var zalny = Math.hypot(zalnx[0], zalnx[1], zalnx[2]);
        var zalnz = [ zalnx[0] / zalny, zalnx[1] / zalny, zalnx[2] / zalny ];
        var zalnaa = zalnz[2];
        if (zalnaa <= 0) continue;
        var zalnab = zalnb([ zalnh[0] + zalnz[0], zalnh[1] + zalnz[1], zalnh[2] + zalnz[2] ]);
        var zalnac = Math.max(0, zalnab[2]), zalnad = zalnac * zalnac * (zalni - 1) + 1;
        var zalnae = zalni / (zalna * zalnad * zalnad);
        var zalnaf = zalnae * zalnk(zalnd, zalnaa) / (4 * Math.max(zalnd, 1e-4) * zalnaa);
        zalnr += zalnaf * zalnaa * (zalnx[2] / zalny / (zalny * zalny)) * zalnq / (zalnf * zalnf);
    }
    return zalnr;
}

var zalnm = [ [ [ -1, -1, 3 ], [ 1.3, -1.2, 3 ], [ 1.2, .8, 3.2 ], [ -1.1, .7, 2.8 ] ], [ [ -.4, -1.5, 1.1 ], [ .6, -1.8, 1.4 ], [ .2, 1.6, 1.2 ], [ -.7, 1.4, .9 ] ], [ [ -2, -2, 2 ], [ 2, -2, 2.5 ], [ 2, 2, 2.5 ], [ -2, 2, 2 ] ], [ [ -.5, -1.5, .5 ], [ 1.5, -1.5, 1 ], [ 1.5, -.5, 1 ], [ -.5, -.5, .5 ] ] ];

function zalnn(zalna, zalnd) {
    var zalng = zalne(zalnf(zalna));
    var zalnh = zalnd.map(function(zalna) {
        return zalnb(zalnc(zalng, zalna));
    });
    var zalni = zalnk(zalnh);
    if (zalni.length < 3) return 0;
    return zalna[4] * zalnj(zalni)[2];
}

var zalno = 16;

function zalnp(zalna) {
    var zalnb = zalnp._f32 || (zalnp._f32 = new Float32Array(1), zalnp._i32 = new Int32Array(zalnp._f32.buffer));
    zalnp._f32[0] = zalna;
    var zalnc = zalnp._i32[0];
    var zalnd = zalnc >> 16 & 32768, zalne = zalnc >> 23 & 255, zalnf = zalnc & 8388607;
    if (zalne === 255) return zalnd | 31744 | (zalnf ? 1 : 0);
    var zalng = zalne - 127 + 15;
    if (zalng >= 31) return zalnd | 31744;
    if (zalng <= 0) {
        if (zalng < -10) return zalnd;
        var zalnh = zalnf | 8388608;
        return zalnd | zalnh >> 14 - zalng;
    }
    return zalnd | zalng << 10 | zalnf >> 13;
}

class LTCLookup {
    static generate(zalna) {
        zalna = zalna || zalno;
        var zalnb = new Float32Array(zalna * zalna * 4);
        var zalnc = new Float32Array(zalna * zalna * 4);
        var zalnd = null;
        var zalnh = new Float32Array(zalna * zalna);
        for (var zalnj = 0; zalnj < zalna; zalnj++) {
            zalnd = null;
            var zalnk = (zalnj + .5) / zalna;
            var zalnp = Math.max(.05, 1 - zalnk * zalnk);
            for (var zalnq = 0; zalnq < zalna; zalnq++) {
                var zalnr = (zalnq + .5) / zalna;
                var zalns = .1 + zalnr * .9;
                var zalnt = zalng(zalns, zalnp, 128);
                var zalnu = 0;
                for (var zalnv = 0; zalnv < zalnt.vals.length; zalnv++) zalnu = Math.max(zalnu, zalnt.vals[zalnv]);
                if (zalnu < 1e-12) zalnu = 1;
                var zalnw = zalnt.dirs.map(function(zalna) {
                    return Math.sqrt(Math.max(zalna[2], .02));
                });
                var zalnx = null, zalny = Infinity;
                var zalnz = [ zalnd, [ 1, 1, 0, 1, zalnu * .5 ], [ .35, .35, 0, 1, zalnu * .8 ] ];
                for (var zalnaa = 0; zalnaa < zalnz.length; zalnaa++) {
                    if (!zalnz[zalnaa]) continue;
                    var zalnab = zalni(zalnz[zalnaa].slice(), zalnt.dirs, zalnt.vals, zalnw, 70);
                    if (zalnab.err < zalny) {
                        zalny = zalnab.err;
                        zalnx = zalnab.p;
                    }
                }
                var zalnac = zalnm.map(function(zalna) {
                    return zalnl(zalns, zalnp, zalna, 12);
                });
                var zalnad = zalnm.map(function(zalna) {
                    return zalnn(zalnx, zalna);
                });
                var zalnae = .05, zalnaf = 3;
                var zalnag = function(zalna) {
                    var zalnb = 0, zalnc = 0;
                    for (var zalnd = 0; zalnd < zalnac.length; zalnd++) {
                        if (zalnac[zalnd] < 1e-7) continue;
                        zalnb += Math.abs(zalnad[zalnd] * zalna - zalnac[zalnd]) / zalnac[zalnd];
                        zalnc++;
                    }
                    return zalnc ? zalnb / zalnc : 0;
                };
                for (var zalnah = 0; zalnah < 30; zalnah++) {
                    var zalnai = zalnae + (zalnaf - zalnae) * .382, zalnaj = zalnae + (zalnaf - zalnae) * .618;
                    if (zalnag(zalnai) < zalnag(zalnaj)) zalnaf = zalnaj; else zalnae = zalnai;
                }
                zalnx[4] *= (zalnae + zalnaf) / 2;
                zalnd = zalnx;
                var zalnak = zalne(zalnf(zalnx));
                var zalnal = Math.sqrt((zalnak[0] * zalnak[0] + 2 * zalnak[2] * zalnak[2] + zalnak[4] * zalnak[4] + zalnak[8] * zalnak[8]) / 4) || 1;
                var zalnam = (zalnj * zalna + zalnq) * 4;
                zalnb[zalnam] = zalnak[0] / zalnal;
                zalnb[zalnam + 1] = zalnak[2] / zalnal;
                zalnb[zalnam + 2] = zalnak[4] / zalnal;
                zalnb[zalnam + 3] = zalnak[8] / zalnal;
                zalnc[zalnam] = zalnx[4];
                var zalnan = 0;
                for (var zalnao = 0; zalnao < zalnm.length; zalnao++) {
                    var zalnap = zalnl(zalns, zalnp, zalnm[zalnao], 16);
                    if (zalnap < 1e-7) continue;
                    var zalnaq = zalnn(zalnx, zalnm[zalnao]);
                    zalnan = Math.max(zalnan, Math.abs(zalnaq - zalnap) / zalnap);
                }
                zalnh[zalnj * zalna + zalnq] = zalnan;
            }
        }
        for (var zalnar = 0; zalnar < 3; zalnar++) {
            var zalnas = 0;
            var zalnat = zalnb.slice(), zalnau = zalnc.slice();
            for (var zalnav = 0; zalnav < zalna; zalnav++) for (var zalnaw = 0; zalnaw < zalna; zalnaw++) {
                if (zalnh[zalnav * zalna + zalnaw] <= .85) continue;
                var zalnax = 0;
                var zalnay = [ 0, 0, 0, 0, 0 ];
                for (var zalnaz = -1; zalnaz <= 1; zalnaz++) for (var zalnba = -1; zalnba <= 1; zalnba++) {
                    var zalnbb = zalnav + zalnaz, zalnbc = zalnaw + zalnba;
                    if (zalnbb < 0 || zalnbb >= zalna || zalnbc < 0 || zalnbc >= zalna || zalnba === 0 && zalnaz === 0) continue;
                    if (zalnh[zalnbb * zalna + zalnbc] > .85) continue;
                    var zalnbd = (zalnbb * zalna + zalnbc) * 4;
                    zalnay[0] += zalnat[zalnbd];
                    zalnay[1] += zalnat[zalnbd + 1];
                    zalnay[2] += zalnat[zalnbd + 2];
                    zalnay[3] += zalnat[zalnbd + 3];
                    zalnay[4] += zalnau[zalnbd];
                    zalnax++;
                }
                if (!zalnax) continue;
                var zalnbe = (zalnav * zalna + zalnaw) * 4;
                for (var zalnbf = 0; zalnbf < 4; zalnbf++) zalnb[zalnbe + zalnbf] = zalnay[zalnbf] / zalnax;
                zalnc[zalnbe] = zalnay[4] / zalnax;
                zalnh[zalnav * zalna + zalnaw] = .85;
                zalnas++;
            }
            if (!zalnas) break;
        }
        return {
            size: zalna,
            mat: zalnb,
            amp: zalnc
        };
    }
    static sample(zalna, zalnb, zalnc) {
        var zalnd = zalna.size;
        var zalne = Math.min(.999, Math.max(0, (Math.max(.15, Math.min(1, zalnb)) - .1) / .9));
        var zalnf = Math.min(.999, Math.max(0, Math.sqrt(Math.max(0, 1 - Math.max(.3, zalnc)))));
        var zalng = zalne * zalnd - .5, zalnh = zalnf * zalnd - .5;
        var zalni = Math.max(0, Math.min(zalnd - 1, Math.floor(zalng))), zalnj = Math.max(0, Math.min(zalnd - 1, Math.floor(zalnh)));
        var zalnk = Math.min(zalnd - 1, zalni + 1), zalnl = Math.min(zalnd - 1, zalnj + 1);
        var zalnm = Math.min(1, Math.max(0, zalng - zalni)), zalnn = Math.min(1, Math.max(0, zalnh - zalnj));
        var zalno = [ 0, 0, 0, 0, 0 ];
        for (var zalnp = 0; zalnp < 4; zalnp++) {
            var zalnq = zalna.mat[(zalnj * zalnd + zalni) * 4 + zalnp], zalnr = zalna.mat[(zalnj * zalnd + zalnk) * 4 + zalnp];
            var zalns = zalna.mat[(zalnl * zalnd + zalni) * 4 + zalnp], zalnt = zalna.mat[(zalnl * zalnd + zalnk) * 4 + zalnp];
            zalno[zalnp] = (zalnq * (1 - zalnm) + zalnr * zalnm) * (1 - zalnn) + (zalns * (1 - zalnm) + zalnt * zalnm) * zalnn;
        }
        var zalnu = zalna.amp[(zalnj * zalnd + zalni) * 4], zalnv = zalna.amp[(zalnj * zalnd + zalnk) * 4];
        var zalnw = zalna.amp[(zalnl * zalnd + zalni) * 4], zalnx = zalna.amp[(zalnl * zalnd + zalnk) * 4];
        zalno[4] = (zalnu * (1 - zalnm) + zalnv * zalnm) * (1 - zalnn) + (zalnw * (1 - zalnm) + zalnx * zalnm) * zalnn;
        return zalno;
    }
    static baked() {
        if (!LTCLookup._baked) {
            LTCLookup._baked = {
                size: LTC_BAKED_SIZE,
                mat: new Float32Array(LTC_BAKED_MAT),
                amp: new Float32Array(LTC_BAKED_AMP)
            };
        }
        return LTCLookup._baked;
    }
    static getTextures(zalna) {
        if (!zalna) return null;
        if (!zalna._ltcTextures) {
            var zalnb = LTCLookup.baked();
            var zalnc = new Uint16Array(zalnb.mat.length), zalnd = new Uint16Array(zalnb.amp.length);
            for (var zalne = 0; zalne < zalnb.mat.length; zalne++) {
                zalnc[zalne] = zalnp(zalnb.mat[zalne]);
                zalnd[zalne] = zalnp(zalnb.amp[zalne]);
            }
            var zalnf = new DataTexture(zalnc, zalnb.size, zalnb.size, {
                type: "halfFloat",
                minFilter: "linear",
                magFilter: "linear"
            });
            var zalng = new DataTexture(zalnd, zalnb.size, zalnb.size, {
                type: "halfFloat",
                minFilter: "linear",
                magFilter: "linear"
            });
            zalnf.wrapS = "clamp";
            zalnf.wrapT = "clamp";
            zalng.wrapS = "clamp";
            zalng.wrapT = "clamp";
            var zalnh = new DataTexture(new Uint8Array([ 255, 255, 255, 255 ]), 1, 1);
            zalna._ltcTextures = {
                matTexture: zalnf,
                ampTexture: zalng,
                whiteTexture: zalnh,
                lut: zalnb
            };
        }
        return zalna._ltcTextures;
    }
    static evaluateSpecular(zalna, zalnd, zalne, zalnf) {
        var zalng = LTCLookup.sample(zalna, zalnd, zalne);
        var zalnh = [ zalng[0], 0, zalng[1], 0, zalng[2], 0, zalng[1], 0, zalng[3] ];
        var zalni = zalnf.map(function(zalna) {
            return zalnb(zalnc(zalnh, zalnb(zalna)));
        });
        var zalnl = zalnk(zalni);
        if (zalnl.length < 3) return 0;
        return zalng[4] * zalnj(zalnl)[2];
    }
    static evaluateDiffuse(zalna) {
        var zalnc = zalnk(zalna.map(zalnb));
        if (zalnc.length < 3) return 0;
        return zalnj(zalnc)[2];
    }
}

LTCLookup.REFERENCE_QUADRATURE = zalnl;

export { LTCLookup };
