import { DoubleSide } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

import { BasicMaterial } from "../materials/index.js";

import { Color, Matrix3, Path, ShapePath, Vector2 } from "../math/index.js";

import { DataTexture } from "../textures/DataTexture.js";

var zamxa = /^\s*url\(\s*(?:["']\s*)?#([^)'"\s]+)(?:\s*["'])?\s*\)\s*$/;

var zamxb = {
    pt: 1 / 72,
    pc: 1 / 6,
    mm: 1 / 25.4,
    cm: 1 / 2.54,
    in: 1
};

var zamxc = 1 - .551915024494;

var zamxd = Math.PI * 2;

function zamxe(zamxa) {
    var zamxb = [];
    var zamxc = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
    var zamxd;
    while (zamxd = zamxc.exec(zamxa)) zamxb.push(parseFloat(zamxd[0]));
    return zamxb;
}

function zamxf(zamxa, zamxc, zamxd) {
    if (zamxa === null || zamxa === undefined) return 0;
    var zamxe = String(zamxa).trim();
    var zamxf = "px";
    for (var zamxg in zamxb) {
        if (zamxe.endsWith(zamxg)) {
            zamxf = zamxg;
            zamxe = zamxe.slice(0, -zamxg.length);
            break;
        }
    }
    var zamxh = parseFloat(zamxe);
    if (isNaN(zamxh)) return 0;
    if (zamxf === "px" && zamxd === "px") return zamxh;
    var zamxi = zamxf === "px" ? 1 / zamxc : zamxb[zamxf];
    var zamxj = zamxd === "px" ? zamxi * zamxc : zamxi / zamxb[zamxd];
    return zamxj * zamxh;
}

function zamxg(zamxa, zamxb, zamxc, zamxd) {
    var zamxe = Math.sqrt(zamxa * zamxa + zamxb * zamxb) * Math.sqrt(zamxc * zamxc + zamxd * zamxd);
    var zamxf = Math.acos(Math.max(-1, Math.min(1, (zamxa * zamxc + zamxb * zamxd) / zamxe)));
    return zamxa * zamxd - zamxb * zamxc < 0 ? -zamxf : zamxf;
}

function zamxh(zamxa) {
    var zamxb = new Matrix3;
    var zamxc = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
    var zamxd;
    while (zamxd = zamxc.exec(zamxa)) {
        var zamxf = zamxd[1];
        var zamxg = zamxe(zamxd[2]);
        var zamxh = new Matrix3;
        if (zamxf === "translate" && zamxg.length >= 1) zamxh.makeTranslation(zamxg[0], zamxg.length >= 2 ? zamxg[1] : 0); else if (zamxf === "scale" && zamxg.length >= 1) zamxh.makeScale(zamxg[0], zamxg.length >= 2 ? zamxg[1] : zamxg[0]); else if (zamxf === "rotate" && zamxg.length >= 1) {
            var zamxi = zamxg[0] * Math.PI / 180;
            if (zamxg.length >= 3) {
                var zamxj = (new Matrix3).makeTranslation(zamxg[1], zamxg[2]);
                var zamxk = (new Matrix3).makeRotation(zamxi);
                var zamxl = (new Matrix3).makeTranslation(-zamxg[1], -zamxg[2]);
                zamxh.multiplyMatrices(zamxj, zamxk).multiply(zamxl);
            } else zamxh.makeRotation(zamxi);
        } else if (zamxf === "skewX" && zamxg.length === 1) zamxh.set(1, Math.tan(zamxg[0] * Math.PI / 180), 0, 0, 1, 0, 0, 0, 1); else if (zamxf === "skewY" && zamxg.length === 1) zamxh.set(1, 0, 0, Math.tan(zamxg[0] * Math.PI / 180), 1, 0, 0, 0, 1); else if (zamxf === "matrix" && zamxg.length >= 6) zamxh.set(zamxg[0], zamxg[2], zamxg[4], zamxg[1], zamxg[3], zamxg[5], 0, 0, 1);
        zamxb.multiply(zamxh);
    }
    return zamxb;
}

function zamxi(zamxa, zamxb, zamxc) {
    var zamxd = .5 * Math.atan2(2 * zamxb, zamxa - zamxc);
    var zamxe = Math.cos(zamxd), zamxf = Math.sin(zamxd);
    var zamxg = zamxa * zamxe * zamxe + 2 * zamxb * zamxe * zamxf + zamxc * zamxf * zamxf;
    var zamxh = zamxa * zamxf * zamxf - 2 * zamxb * zamxe * zamxf + zamxc * zamxe * zamxe;
    if (zamxa > zamxc ? zamxe > 0 : zamxf < 0) {
        zamxe = -zamxe;
        zamxf = -zamxf;
    }
    return {
        lambda1: zamxg,
        lambda2: zamxh,
        axis1: [ zamxe, zamxf ],
        axis2: [ -zamxf, zamxe ]
    };
}

function zamxj(zamxa, zamxb, zamxc) {
    var zamxd = zamxa.elements;
    return {
        x: zamxd[0] * zamxb + zamxd[3] * zamxc + zamxd[6],
        y: zamxd[1] * zamxb + zamxd[4] * zamxc + zamxd[7]
    };
}

function zamxk(zamxa, zamxb, zamxc) {
    var zamxd = zamxa.elements;
    return [ zamxd[0] * zamxb + zamxd[3] * zamxc, zamxd[1] * zamxb + zamxd[4] * zamxc ];
}

function zamxl(zamxa) {
    var zamxb = zamxa.elements;
    return Math.sqrt(Math.abs(zamxb[0] * zamxb[4] - zamxb[1] * zamxb[3]));
}

function zamxm(zamxa) {
    var zamxb = zamxa.elements;
    return zamxb[0] * zamxb[4] - zamxb[1] * zamxb[3] < 0;
}

function zamxn(zamxa) {
    var zamxb = zamxa.elements;
    var zamxc = zamxb[0] * zamxb[3] + zamxb[1] * zamxb[4];
    if (zamxc === 0) return false;
    var zamxd = Math.sqrt(zamxb[0] * zamxb[0] + zamxb[1] * zamxb[1]), zamxe = Math.sqrt(zamxb[3] * zamxb[3] + zamxb[4] * zamxb[4]);
    return Math.abs(zamxc / (zamxd * zamxe)) > 1e-6;
}

function zamxo(zamxa, zamxb) {
    function zamxc(zamxa) {
        var zamxc = zamxj(zamxb, zamxa.x, zamxa.y);
        zamxa.set(zamxc.x, zamxc.y);
    }
    function zamxe(zamxa) {
        var zamxc = Math.cos(zamxa.rotation), zamxe = Math.sin(zamxa.rotation);
        var zamxf = zamxk(zamxb, zamxc * zamxa.xRadius, zamxe * zamxa.xRadius);
        var zamxg = zamxk(zamxb, -zamxe * zamxa.yRadius, zamxc * zamxa.yRadius);
        var zamxh = zamxf[0], zamxj = zamxf[1], zamxl = zamxg[0], zamxn = zamxg[1];
        var zamxo = zamxh * zamxn - zamxl * zamxj;
        if (Math.abs(zamxo) < 1e-14) {
            zamxa.xRadius = 0;
            zamxa.yRadius = 0;
            return;
        }
        var zamxp = zamxn / zamxo, zamxq = -zamxl / zamxo, zamxr = -zamxj / zamxo, zamxs = zamxh / zamxo;
        var zamxt = zamxp * zamxp + zamxr * zamxr;
        var zamxu = zamxp * zamxq + zamxr * zamxs;
        var zamxv = zamxq * zamxq + zamxs * zamxs;
        var zamxw = zamxi(zamxt, zamxu, zamxv);
        var zamxx = 1 / Math.sqrt(Math.max(zamxw.lambda1, 1e-14));
        var zamxy = 1 / Math.sqrt(Math.max(zamxw.lambda2, 1e-14));
        zamxa.xRadius = zamxx;
        zamxa.yRadius = zamxy;
        zamxa.rotation = Math.atan2(zamxw.axis1[1], zamxw.axis1[0]);
        var zamxz = (zamxa.endAngle - zamxa.startAngle) % zamxd < Number.EPSILON;
        if (!zamxz) {
            function zamxaa(zamxa) {
                var zamxb = [ zamxh * Math.cos(zamxa) + zamxl * Math.sin(zamxa), zamxj * Math.cos(zamxa) + zamxn * Math.sin(zamxa) ];
                var zamxc = zamxw.axis1[0] * zamxb[0] + zamxw.axis1[1] * zamxb[1];
                var zamxd = zamxw.axis2[0] * zamxb[0] + zamxw.axis2[1] * zamxb[1];
                return Math.atan2(zamxd / zamxy, zamxc / zamxx);
            }
            zamxa.startAngle = zamxaa(zamxa.startAngle);
            zamxa.endAngle = zamxaa(zamxa.endAngle);
            if (zamxm(zamxb)) zamxa.clockwise = !zamxa.clockwise;
        }
    }
    function zamxf(zamxa) {
        var zamxc = zamxb.elements;
        var zamxd = Math.sqrt(zamxc[0] * zamxc[0] + zamxc[1] * zamxc[1]), zamxe = Math.sqrt(zamxc[3] * zamxc[3] + zamxc[4] * zamxc[4]);
        zamxa.xRadius *= zamxd;
        zamxa.yRadius *= zamxe;
        zamxa.rotation += zamxd > Number.EPSILON ? Math.atan2(zamxc[1], zamxc[0]) : Math.atan2(-zamxc[3], zamxc[4]);
        if (zamxm(zamxb)) {
            zamxa.startAngle *= -1;
            zamxa.endAngle *= -1;
            zamxa.clockwise = !zamxa.clockwise;
        }
    }
    for (var zamxg = 0; zamxg < zamxa.subPaths.length; zamxg++) {
        var zamxh = zamxa.subPaths[zamxg].curves;
        for (var zamxl = 0; zamxl < zamxh.length; zamxl++) {
            var zamxo = zamxh[zamxl];
            if (zamxo.type === "line") {
                zamxc(zamxo.v1);
                zamxc(zamxo.v2);
            } else if (zamxo.type === "quadratic") {
                zamxc(zamxo.v0);
                zamxc(zamxo.v1);
                zamxc(zamxo.v2);
            } else if (zamxo.type === "bezier") {
                zamxc(zamxo.v0);
                zamxc(zamxo.v1);
                zamxc(zamxo.v2);
                zamxc(zamxo.v3);
            } else if (zamxo.type === "arc") {
                var zamxp = zamxj(zamxb, zamxo.cx, zamxo.cy);
                zamxo.cx = zamxp.x;
                zamxo.cy = zamxp.y;
                if (zamxn(zamxb)) zamxe(zamxo); else zamxf(zamxo);
            }
        }
    }
}

function zamxp(zamxa, zamxb, zamxc, zamxe, zamxf, zamxh, zamxi, zamxj) {
    if (zamxe === 0 || zamxf === 0) {
        zamxa.lineTo(zamxc.x, zamxc.y);
        return;
    }
    zamxe = Math.abs(zamxe);
    zamxf = Math.abs(zamxf);
    var zamxk = zamxh * Math.PI / 180;
    var zamxl = Math.cos(zamxk), zamxm = Math.sin(zamxk);
    var zamxn = (zamxb.x - zamxc.x) / 2, zamxo = (zamxb.y - zamxc.y) / 2;
    var zamxp = zamxl * zamxn + zamxm * zamxo;
    var zamxq = -zamxm * zamxn + zamxl * zamxo;
    var zamxr = Math.sqrt(Math.max(0, zamxp * zamxp / (zamxe * zamxe) + zamxq * zamxq / (zamxf * zamxf)));
    if (zamxr > 1) {
        zamxe *= zamxr;
        zamxf *= zamxr;
    }
    var zamxs = zamxe * zamxe * zamxf * zamxf - zamxe * zamxe * zamxq * zamxq - zamxf * zamxf * zamxp * zamxp;
    var zamxt = zamxe * zamxe * zamxq * zamxq + zamxf * zamxf * zamxp * zamxp;
    var zamxu = Math.sqrt(Math.max(0, zamxs / zamxt));
    if (zamxi === zamxj) zamxu = -zamxu;
    var zamxv = zamxu * zamxe * zamxq / zamxf;
    var zamxw = -zamxu * zamxf * zamxp / zamxe;
    var zamxx = zamxl * zamxv - zamxm * zamxw + (zamxb.x + zamxc.x) / 2;
    var zamxy = zamxm * zamxv + zamxl * zamxw + (zamxb.y + zamxc.y) / 2;
    var zamxz = (zamxp - zamxv) / zamxe, zamxaa = (zamxq - zamxw) / zamxf;
    var zamxab = (-zamxp - zamxv) / zamxe, zamxac = (-zamxq - zamxw) / zamxf;
    var zamxad = zamxg(1, 0, zamxz, zamxaa);
    var zamxae = zamxg(zamxz, zamxaa, zamxab, zamxac) % zamxd;
    if (!zamxa.currentPath) zamxa.moveTo(zamxb.x, zamxb.y);
    zamxa.currentPath.absellipse(zamxx, zamxy, zamxe, zamxf, zamxad, zamxad + zamxae, zamxj === 0, zamxk);
}

var zamxq = {
    M: 2,
    L: 2,
    T: 2,
    S: 4,
    Q: 4,
    C: 6,
    A: 7,
    H: 1,
    V: 1
};

function zamxr(zamxa) {
    if (zamxa === "" || zamxa === "none" || zamxa === null || zamxa === undefined) return null;
    var zamxb = new ShapePath;
    var zamxc = new Vector2;
    var zamxd = new Vector2;
    var zamxe = new Vector2;
    var zamxf = true;
    var zamxg = 0;
    var zamxh = zamxa.length;
    var zamxi = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
    function zamxj() {
        while (zamxg < zamxh && (zamxa[zamxg] === " " || zamxa[zamxg] === "\t" || zamxa[zamxg] === "\r" || zamxa[zamxg] === "\n" || zamxa[zamxg] === ",")) zamxg++;
    }
    function zamxk() {
        zamxj();
        zamxi.lastIndex = zamxg;
        var zamxb = zamxi.exec(zamxa);
        if (!zamxb) return null;
        zamxg = zamxi.lastIndex;
        return parseFloat(zamxb[0]);
    }
    function zamxl() {
        zamxj();
        var zamxb = zamxa[zamxg];
        if (zamxb === "0" || zamxb === "1") {
            zamxg++;
            return zamxb === "1" ? 1 : 0;
        }
        return null;
    }
    function zamxm(zamxa, zamxb) {
        if (zamxf) {
            zamxe.set(zamxa, zamxb);
            zamxf = false;
        }
    }
    while (zamxg < zamxh) {
        zamxj();
        if (zamxg >= zamxh) break;
        var zamxn = zamxa[zamxg];
        if (!/[a-zA-Z]/.test(zamxn)) {
            zamxg++;
            continue;
        }
        zamxg++;
        if (zamxn === "Z" || zamxn === "z") {
            if (zamxb.currentPath) {
                zamxb.currentPath.autoClose = true;
                if (zamxb.currentPath.curves.length > 0) {
                    zamxc.copy(zamxe);
                    zamxb.currentPath.currentPoint.copy(zamxc);
                    zamxf = true;
                }
            }
            continue;
        }
        var zamxo = zamxq[zamxn.toUpperCase()];
        if (!zamxo) {
            console.warn("SVGLoader: unknown path command " + zamxn);
            continue;
        }
        var zamxr = zamxn.toLowerCase() === zamxn;
        var zamxs = 0;
        while (true) {
            var zamxt = [];
            var zamxu = true;
            for (var zamxv = 0; zamxv < zamxo; zamxv++) {
                if (zamxo === 7 && (zamxv === 3 || zamxv === 4)) {
                    var zamxw = zamxl();
                    if (zamxw === null) {
                        zamxu = false;
                        break;
                    }
                    zamxt.push(zamxw);
                } else {
                    var zamxx = zamxk();
                    if (zamxx === null) {
                        zamxu = false;
                        break;
                    }
                    zamxt.push(zamxx);
                }
            }
            if (!zamxu) break;
            switch (zamxn) {
              case "M":
              case "m":
                {
                    var zamxy = zamxr ? zamxc.x + zamxt[0] : zamxt[0];
                    var zamxz = zamxr ? zamxc.y + zamxt[1] : zamxt[1];
                    if (zamxs === 0) zamxb.moveTo(zamxy, zamxz); else zamxb.lineTo(zamxy, zamxz);
                    zamxc.set(zamxy, zamxz);
                    zamxd.copy(zamxc);
                    zamxe.set(zamxy, zamxz);
                    zamxf = false;
                    break;
                }

              case "L":
              case "l":
                {
                    var zamxaa = zamxr ? zamxc.x + zamxt[0] : zamxt[0];
                    var zamxab = zamxr ? zamxc.y + zamxt[1] : zamxt[1];
                    zamxb.lineTo(zamxaa, zamxab);
                    zamxc.set(zamxaa, zamxab);
                    zamxd.copy(zamxc);
                    zamxm(zamxaa, zamxab);
                    break;
                }

              case "H":
              case "h":
                {
                    var zamxac = zamxr ? zamxc.x + zamxt[0] : zamxt[0];
                    zamxb.lineTo(zamxac, zamxc.y);
                    zamxc.x = zamxac;
                    zamxd.copy(zamxc);
                    zamxm(zamxac, zamxc.y);
                    break;
                }

              case "V":
              case "v":
                {
                    var zamxad = zamxr ? zamxc.y + zamxt[0] : zamxt[0];
                    zamxb.lineTo(zamxc.x, zamxad);
                    zamxc.y = zamxad;
                    zamxd.copy(zamxc);
                    zamxm(zamxc.x, zamxad);
                    break;
                }

              case "C":
              case "c":
                {
                    var zamxae = zamxr ? zamxc.x + zamxt[0] : zamxt[0];
                    var zamxaf = zamxr ? zamxc.y + zamxt[1] : zamxt[1];
                    var zamxag = zamxr ? zamxc.x + zamxt[2] : zamxt[2];
                    var zamxah = zamxr ? zamxc.y + zamxt[3] : zamxt[3];
                    var zamxai = zamxr ? zamxc.x + zamxt[4] : zamxt[4];
                    var zamxaj = zamxr ? zamxc.y + zamxt[5] : zamxt[5];
                    zamxb.bezierCurveTo(zamxae, zamxaf, zamxag, zamxah, zamxai, zamxaj);
                    zamxd.set(zamxag, zamxah);
                    zamxc.set(zamxai, zamxaj);
                    zamxm(zamxai, zamxaj);
                    break;
                }

              case "S":
              case "s":
                {
                    var zamxak = 2 * zamxc.x - zamxd.x;
                    var zamxal = 2 * zamxc.y - zamxd.y;
                    var zamxam = zamxr ? zamxc.x + zamxt[0] : zamxt[0];
                    var zamxan = zamxr ? zamxc.y + zamxt[1] : zamxt[1];
                    var zamxao = zamxr ? zamxc.x + zamxt[2] : zamxt[2];
                    var zamxap = zamxr ? zamxc.y + zamxt[3] : zamxt[3];
                    zamxb.bezierCurveTo(zamxak, zamxal, zamxam, zamxan, zamxao, zamxap);
                    zamxd.set(zamxam, zamxan);
                    zamxc.set(zamxao, zamxap);
                    zamxm(zamxao, zamxap);
                    break;
                }

              case "Q":
              case "q":
                {
                    var zamxaq = zamxr ? zamxc.x + zamxt[0] : zamxt[0];
                    var zamxar = zamxr ? zamxc.y + zamxt[1] : zamxt[1];
                    var zamxas = zamxr ? zamxc.x + zamxt[2] : zamxt[2];
                    var zamxat = zamxr ? zamxc.y + zamxt[3] : zamxt[3];
                    zamxb.quadraticCurveTo(zamxaq, zamxar, zamxas, zamxat);
                    zamxd.set(zamxaq, zamxar);
                    zamxc.set(zamxas, zamxat);
                    zamxm(zamxas, zamxat);
                    break;
                }

              case "T":
              case "t":
                {
                    var zamxau = 2 * zamxc.x - zamxd.x;
                    var zamxav = 2 * zamxc.y - zamxd.y;
                    var zamxaw = zamxr ? zamxc.x + zamxt[0] : zamxt[0];
                    var zamxax = zamxr ? zamxc.y + zamxt[1] : zamxt[1];
                    zamxb.quadraticCurveTo(zamxau, zamxav, zamxaw, zamxax);
                    zamxd.set(zamxau, zamxav);
                    zamxc.set(zamxaw, zamxax);
                    zamxm(zamxaw, zamxax);
                    break;
                }

              case "A":
              case "a":
                {
                    var zamxay = zamxr ? zamxc.x + zamxt[5] : zamxt[5];
                    var zamxaz = zamxr ? zamxc.y + zamxt[6] : zamxt[6];
                    if (zamxr ? zamxt[5] === 0 && zamxt[6] === 0 : zamxay === zamxc.x && zamxaz === zamxc.y) break;
                    var zamxba = zamxc.clone();
                    zamxc.set(zamxay, zamxaz);
                    zamxd.copy(zamxc);
                    zamxp(zamxb, zamxba, zamxc, zamxt[0], zamxt[1], zamxt[2], zamxt[3], zamxt[4]);
                    zamxm(zamxay, zamxaz);
                    break;
                }
            }
            zamxs++;
        }
    }
    if (!zamxb.subPaths.length) return null;
    return zamxb;
}

function zamxs(zamxa, zamxb) {
    if (!zamxa || !zamxa.length) return [ 0, 0, 0, 1 ];
    var zamxc = zamxa[0], zamxd = zamxa[zamxa.length - 1];
    for (var zamxe = 0; zamxe < zamxa.length; zamxe++) {
        if (zamxa[zamxe].offset <= zamxb + 1e-9) zamxc = zamxa[zamxe];
        if (zamxa[zamxe].offset >= zamxb - 1e-9) {
            zamxd = zamxa[zamxe];
            break;
        }
    }
    if (zamxb <= zamxc.offset) {
        var zamxf = (new Color).setStyle(zamxc.color, "srgb");
        return [ zamxf.r, zamxf.g, zamxf.b, zamxc.opacity ];
    }
    if (zamxb >= zamxd.offset) {
        var zamxg = (new Color).setStyle(zamxd.color, "srgb");
        return [ zamxg.r, zamxg.g, zamxg.b, zamxd.opacity ];
    }
    var zamxh = zamxd.offset - zamxc.offset;
    var zamxi = zamxh > 0 ? (zamxb - zamxc.offset) / zamxh : 0;
    var zamxj = (new Color).setStyle(zamxc.color, "srgb");
    var zamxk = (new Color).setStyle(zamxd.color, "srgb");
    return [ zamxj.r + (zamxk.r - zamxj.r) * zamxi, zamxj.g + (zamxk.g - zamxj.g) * zamxi, zamxj.b + (zamxk.b - zamxj.b) * zamxi, zamxc.opacity + (zamxd.opacity - zamxc.opacity) * zamxi ];
}

function zamxt(zamxa, zamxb) {
    var zamxc = zamxb ? (new Matrix3).copy(zamxb).invert() : null;
    var zamxd = Infinity, zamxe = Infinity, zamxf = -Infinity, zamxg = -Infinity;
    for (var zamxh = 0; zamxh < zamxa.subPaths.length; zamxh++) {
        var zamxi = zamxa.subPaths[zamxh].getPoints();
        for (var zamxk = 0; zamxk < zamxi.length; zamxk++) {
            var zamxl = zamxi[zamxk].x, zamxm = zamxi[zamxk].y;
            if (zamxc) {
                var zamxn = zamxj(zamxc, zamxl, zamxm);
                zamxl = zamxn.x;
                zamxm = zamxn.y;
            }
            if (zamxl < zamxd) zamxd = zamxl;
            if (zamxl > zamxf) zamxf = zamxl;
            if (zamxm < zamxe) zamxe = zamxm;
            if (zamxm > zamxg) zamxg = zamxm;
        }
    }
    if (zamxd === Infinity) return null;
    return {
        minX: zamxd,
        minY: zamxe,
        width: zamxf - zamxd,
        height: zamxg - zamxe
    };
}

function zamxu(zamxa, zamxb, zamxc) {
    if (!zamxa || !Array.isArray(zamxa.stops) || zamxa.stops.length === 0) return null;
    zamxc = zamxc || 256;
    var zamxd = zamxb.userData.transform;
    var zamxe = zamxa.gradientUnits === "objectBoundingBox";
    var zamxf = null;
    if (zamxe) {
        zamxf = zamxt(zamxb, zamxd);
        if (zamxf === null) return null;
    }
    function zamxg(zamxb, zamxc) {
        var zamxg = {
            x: zamxb,
            y: zamxc
        };
        if (zamxa.gradientTransform) zamxg = zamxj(zamxa.gradientTransform, zamxg.x, zamxg.y);
        if (zamxe) zamxg = {
            x: zamxf.minX + zamxg.x * zamxf.width,
            y: zamxf.minY + zamxg.y * zamxf.height
        };
        if (zamxd) zamxg = zamxj(zamxd, zamxg.x, zamxg.y);
        return zamxg;
    }
    function zamxh(zamxa) {
        return [ Math.round(Math.min(1, Math.max(0, zamxa[0])) * 255), Math.round(Math.min(1, Math.max(0, zamxa[1])) * 255), Math.round(Math.min(1, Math.max(0, zamxa[2])) * 255), Math.round(Math.min(1, Math.max(0, zamxa[3])) * 255) ];
    }
    var zamxi, zamxk, zamxl, zamxm;
    if (zamxa.type === "linearGradient") {
        zamxi = zamxc;
        zamxk = 1;
        zamxl = new Uint8Array(zamxi * 4);
        for (var zamxn = 0; zamxn < zamxi; zamxn++) {
            var zamxo = zamxh(zamxs(zamxa.stops, zamxn / (zamxc - 1)));
            zamxl[zamxn * 4] = zamxo[0];
            zamxl[zamxn * 4 + 1] = zamxo[1];
            zamxl[zamxn * 4 + 2] = zamxo[2];
            zamxl[zamxn * 4 + 3] = zamxo[3];
        }
        var zamxp = zamxg(zamxa.x1, zamxa.y1);
        var zamxq = zamxg(zamxa.x2, zamxa.y2);
        var zamxr = zamxq.x - zamxp.x, zamxu = zamxq.y - zamxp.y;
        var zamxv = zamxr * zamxr + zamxu * zamxu || 1e-20;
        var zamxw = zamxr / zamxv, zamxx = zamxu / zamxv;
        zamxm = (new Matrix3).set(zamxw, zamxx, -(zamxw * zamxp.x + zamxx * zamxp.y), 0, 0, .5, 0, 0, 1);
    } else {
        var zamxy = zamxa.cx, zamxz = zamxa.cy, zamxaa = zamxa.fx, zamxab = zamxa.fy, zamxac = zamxa.r;
        if (zamxa.gradientTransform) {
            var zamxad = zamxj(zamxa.gradientTransform, zamxy, zamxz);
            var zamxae = zamxj(zamxa.gradientTransform, zamxaa, zamxab);
            zamxy = zamxad.x;
            zamxz = zamxad.y;
            zamxaa = zamxae.x;
            zamxab = zamxae.y;
        }
        if (zamxe) {
            zamxy = zamxf.minX + zamxy * zamxf.width;
            zamxz = zamxf.minY + zamxz * zamxf.height;
            zamxaa = zamxf.minX + zamxaa * zamxf.width;
            zamxab = zamxf.minY + zamxab * zamxf.height;
            zamxac = zamxac * Math.sqrt((zamxf.width * zamxf.width + zamxf.height * zamxf.height) / 2);
        }
        if (zamxac <= 0) return null;
        var zamxaf = zamxaa - zamxy, zamxag = zamxab - zamxz;
        var zamxah = Math.sqrt(zamxaf * zamxaf + zamxag * zamxag);
        if (zamxah >= zamxac) {
            var zamxai = (zamxac - 1e-6) / zamxah;
            zamxaa = zamxy + zamxaf * zamxai;
            zamxab = zamxz + zamxag * zamxai;
        }
        zamxi = zamxc;
        zamxk = zamxc;
        zamxl = new Uint8Array(zamxi * zamxk * 4);
        var zamxaj = zamxy - zamxac, zamxak = zamxz - zamxac, zamxal = 2 * zamxac;
        for (var zamxam = 0; zamxam < zamxk; zamxam++) {
            for (var zamxan = 0; zamxan < zamxi; zamxan++) {
                var zamxao = zamxaj + zamxan / (zamxc - 1) * zamxal;
                var zamxap = zamxak + zamxam / (zamxc - 1) * zamxal;
                var zamxaq = zamxao - zamxaa, zamxar = zamxap - zamxab;
                var zamxas = 0;
                var zamxat = zamxaq * zamxaq + zamxar * zamxar;
                if (zamxat > 0) {
                    var zamxau = zamxaa - zamxy, zamxav = zamxab - zamxz;
                    var zamxaw = zamxau * zamxaq + zamxav * zamxar;
                    var zamxax = zamxau * zamxau + zamxav * zamxav - zamxac * zamxac;
                    var zamxay = zamxaw * zamxaw - zamxat * zamxax;
                    if (zamxay <= 0) zamxas = 1; else zamxas = zamxat / (-zamxaw + Math.sqrt(zamxay));
                    if (zamxas < 0) zamxas = 0;
                    if (zamxas > 1) zamxas = 1;
                }
                var zamxaz = zamxh(zamxs(zamxa.stops, zamxas));
                var zamxba = (zamxam * zamxi + zamxan) * 4;
                zamxl[zamxba] = zamxaz[0];
                zamxl[zamxba + 1] = zamxaz[1];
                zamxl[zamxba + 2] = zamxaz[2];
                zamxl[zamxba + 3] = zamxaz[3];
            }
        }
        var zamxbb = zamxd ? (new Matrix3).copy(zamxd).invert() : new Matrix3;
        var zamxbc = (new Matrix3).set(1 / zamxal, 0, -zamxaj / zamxal, 0, 1 / zamxal, -zamxak / zamxal, 0, 0, 1);
        zamxm = zamxbc.multiply(zamxbb);
    }
    var zamxbd = new DataTexture(zamxl, zamxi, zamxk, {
        minFilter: "linear",
        magFilter: "linear",
        colorSpace: "srgb"
    });
    zamxbd.matrixAutoUpdate = false;
    zamxbd.matrix = zamxm;
    zamxbd.wrapS = zamxa.spreadMethod === "reflect" ? "mirror" : zamxa.spreadMethod === "repeat" ? "repeat" : "clamp";
    zamxbd.wrapT = zamxbd.wrapS;
    return zamxbd;
}

class SVGLoader {
    constructor(zamxa) {
        this.manager = zamxa;
        this.defaultDPI = 90;
        this.defaultUnit = "px";
    }
    parse(zamxa) {
        var zamxb = this;
        var zamxg = (new DOMParser).parseFromString(zamxa, "image/svg+xml");
        var zamxi = {};
        var zamxj = {};
        var zamxk = [];
        var zamxm = [ new Matrix3 ];
        var zamxn = [ [ "fill", "fill", null ], [ "fill-opacity", "fillOpacity", "fraction" ], [ "fill-rule", "fillRule", null ], [ "opacity", "opacity", "fraction" ], [ "stroke", "stroke", null ], [ "stroke-opacity", "strokeOpacity", "fraction" ], [ "stroke-width", "strokeWidth", "positive" ], [ "stroke-linejoin", "strokeLineJoin", null ], [ "stroke-linecap", "strokeLineCap", null ], [ "stroke-miterlimit", "strokeMiterLimit", "positive" ], [ "visibility", "visibility", null ] ];
        function zamxp(zamxa, zamxc) {
            if (zamxc === "fraction") return Math.max(0, Math.min(1, zamxf(zamxa, zamxb.defaultDPI, zamxb.defaultUnit)));
            if (zamxc === "positive") return Math.max(0, zamxf(zamxa, zamxb.defaultDPI, zamxb.defaultUnit));
            return zamxa;
        }
        function zamxq(zamxa) {
            var zamxb = zamxa.getElementsByTagName("style");
            for (var zamxc = 0; zamxc < zamxb.length; zamxc++) {
                var zamxd = zamxb[zamxc].sheet;
                if (!zamxd || !zamxd.cssRules) continue;
                for (var zamxe = 0; zamxe < zamxd.cssRules.length; zamxe++) {
                    var zamxf = zamxd.cssRules[zamxe];
                    if (zamxf.type !== 1 || !zamxf.selectorText || !zamxf.style) continue;
                    var zamxg = zamxf.selectorText.split(",").map(function(zamxa) {
                        return zamxa.trim();
                    }).filter(Boolean);
                    for (var zamxh = 0; zamxh < zamxg.length; zamxh++) {
                        if (!zamxj[zamxg[zamxh]]) zamxj[zamxg[zamxh]] = {};
                        var zamxi = {};
                        for (var zamxk in zamxf.style) {
                            var zamxl = zamxf.style[zamxk];
                            if (zamxl !== "") zamxi[zamxk] = zamxl;
                        }
                        Object.assign(zamxj[zamxg[zamxh]], zamxi);
                    }
                }
            }
        }
        function zamxs(zamxa, zamxb) {
            var zamxc = Object.assign({}, zamxb);
            var zamxd = {};
            if (zamxa.hasAttribute("class")) {
                var zamxe = zamxa.getAttribute("class").split(/\s+/).filter(Boolean);
                for (var zamxf = 0; zamxf < zamxe.length; zamxf++) Object.assign(zamxd, zamxj["." + zamxe[zamxf]] || {});
            }
            if (zamxa.hasAttribute("id")) Object.assign(zamxd, zamxj["#" + zamxa.getAttribute("id")] || {});
            for (var zamxg = 0; zamxg < zamxn.length; zamxg++) {
                var zamxh = zamxn[zamxg][0], zamxi = zamxn[zamxg][1], zamxk = zamxn[zamxg][2];
                if (zamxa.hasAttribute(zamxh)) zamxc[zamxi] = zamxp(zamxa.getAttribute(zamxh), zamxk);
                if (zamxd[zamxi] !== undefined) zamxc[zamxi] = zamxp(zamxd[zamxi], zamxk);
                var zamxl = zamxa.style ? zamxa.style.getPropertyValue(zamxh) : "";
                if (zamxl !== "") zamxc[zamxi] = zamxp(zamxl, zamxk);
            }
            return zamxc;
        }
        function zamxt(zamxa) {
            var zamxc = {};
            var zamxd = [ "linearGradient", "radialGradient" ];
            for (var zamxe = 0; zamxe < zamxd.length; zamxe++) {
                var zamxg = zamxa.getElementsByTagName(zamxd[zamxe]);
                for (var zamxj = 0; zamxj < zamxg.length; zamxj++) {
                    var zamxk = zamxg[zamxj];
                    var zamxl = zamxk.getAttribute("id");
                    if (!zamxl) continue;
                    var zamxm = {
                        type: zamxd[zamxe],
                        attrs: {},
                        stops: null,
                        parentId: null
                    };
                    var zamxn = zamxk.getAttributeNS && zamxk.getAttributeNS("http://www.w3.org/1999/xlink", "href") || zamxk.getAttribute("href") || "";
                    if (zamxn.charAt(0) === "#") zamxm.parentId = zamxn.slice(1);
                    var zamxo = [ "x1", "y1", "x2", "y2", "cx", "cy", "r", "fx", "fy", "gradientUnits", "gradientTransform", "spreadMethod" ];
                    for (var zamxp = 0; zamxp < zamxo.length; zamxp++) if (zamxk.hasAttribute(zamxo[zamxp])) zamxm.attrs[zamxo[zamxp]] = zamxk.getAttribute(zamxo[zamxp]);
                    var zamxq = zamxk.getElementsByTagName("stop");
                    if (zamxq.length) {
                        zamxm.stops = [];
                        for (var zamxr = 0; zamxr < zamxq.length; zamxr++) {
                            var zamxs = zamxq[zamxr];
                            var zamxt = zamxs.getAttribute("stop-color");
                            if ((zamxt === null || zamxt === "") && zamxs.style) zamxt = zamxs.style["stop-color"];
                            if (zamxt === null || zamxt === "") zamxt = "#000";
                            var zamxu = zamxs.getAttribute("stop-opacity");
                            if ((zamxu === null || zamxu === "") && zamxs.style) zamxu = zamxs.style["stop-opacity"];
                            var zamxv = zamxu === null || zamxu === "" || zamxu === undefined ? 1 : Math.max(0, Math.min(1, parseFloat(zamxu)));
                            var zamxw = zamxs.getAttribute("offset") || "0";
                            var zamxx = zamxw.indexOf("%") !== -1 ? parseFloat(zamxw) / 100 : parseFloat(zamxw);
                            zamxm.stops.push({
                                offset: Math.max(0, Math.min(1, zamxx)),
                                color: zamxt,
                                opacity: zamxv
                            });
                        }
                    }
                    zamxc[zamxl] = zamxm;
                }
            }
            function zamxy(zamxa, zamxb) {
                var zamxd = zamxc[zamxa];
                if (!zamxd || zamxb.indexOf(zamxa) !== -1) return zamxd;
                zamxb.push(zamxa);
                if (zamxd.parentId && zamxc[zamxd.parentId]) {
                    var zamxe = zamxy(zamxd.parentId, zamxb);
                    if (zamxe) {
                        if (!zamxd.stops) zamxd.stops = zamxe.stops;
                        for (var zamxf in zamxe.attrs) if (!(zamxf in zamxd.attrs)) zamxd.attrs[zamxf] = zamxe.attrs[zamxf];
                    }
                }
                return zamxd;
            }
            for (var zamxl in zamxc) zamxy(zamxl, []);
            function zamxz(zamxa) {
                if (typeof zamxa !== "string") return 0;
                if (zamxa.charAt(zamxa.length - 1) === "%") return parseFloat(zamxa) / 100;
                return zamxf(zamxa, zamxb.defaultDPI, zamxb.defaultUnit);
            }
            for (var zamxaa in zamxc) {
                var zamxm = zamxc[zamxaa];
                var zamxab = zamxm.attrs;
                var zamxac = zamxab.gradientUnits === "userSpaceOnUse" ? "userSpaceOnUse" : "objectBoundingBox";
                var zamxad = zamxab.spreadMethod === "reflect" || zamxab.spreadMethod === "repeat" ? zamxab.spreadMethod : "pad";
                var zamxae = {
                    type: zamxm.type,
                    gradientUnits: zamxac,
                    spreadMethod: zamxad,
                    gradientTransform: null,
                    stops: (zamxm.stops || []).slice().sort(function(zamxa, zamxb) {
                        return zamxa.offset - zamxb.offset;
                    })
                };
                if (zamxab.gradientTransform) zamxae.gradientTransform = zamxh(zamxab.gradientTransform);
                if (zamxm.type === "linearGradient") {
                    zamxae.x1 = zamxab.x1 !== undefined ? zamxz(zamxab.x1) : 0;
                    zamxae.y1 = zamxab.y1 !== undefined ? zamxz(zamxab.y1) : 0;
                    zamxae.x2 = zamxab.x2 !== undefined ? zamxz(zamxab.x2) : zamxac === "objectBoundingBox" ? 1 : 0;
                    zamxae.y2 = zamxab.y2 !== undefined ? zamxz(zamxab.y2) : 0;
                } else {
                    var zamxaf = zamxac === "objectBoundingBox" ? .5 : 0;
                    zamxae.cx = zamxab.cx !== undefined ? zamxz(zamxab.cx) : zamxaf;
                    zamxae.cy = zamxab.cy !== undefined ? zamxz(zamxab.cy) : zamxaf;
                    zamxae.r = zamxab.r !== undefined ? zamxz(zamxab.r) : zamxaf;
                    zamxae.fx = zamxab.fx !== undefined ? zamxz(zamxab.fx) : zamxae.cx;
                    zamxae.fy = zamxab.fy !== undefined ? zamxz(zamxab.fy) : zamxae.cy;
                }
                zamxi[zamxaa] = zamxae;
            }
        }
        function zamxu(zamxa) {
            var zamxc = zamxa.nodeName === "use" && (zamxa.hasAttribute("x") || zamxa.hasAttribute("y"));
            var zamxd = zamxa.hasAttribute("transform");
            if (!zamxc && !zamxd) return null;
            var zamxe = new Matrix3;
            if (zamxc) zamxe.makeTranslation(zamxf(zamxa.getAttribute("x") || 0, zamxb.defaultDPI, zamxb.defaultUnit), zamxf(zamxa.getAttribute("y") || 0, zamxb.defaultDPI, zamxb.defaultUnit));
            if (zamxd) zamxe.premultiply(zamxh(zamxa.getAttribute("transform")));
            return zamxe;
        }
        function zamxv(zamxa) {
            var zamxd = zamxf(zamxa.getAttribute("x") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxe = zamxf(zamxa.getAttribute("y") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxg = zamxf(zamxa.getAttribute("width"), zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxh = zamxf(zamxa.getAttribute("height"), zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxi = zamxf(zamxa.getAttribute("rx") || zamxa.getAttribute("ry") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxj = zamxf(zamxa.getAttribute("ry") || zamxa.getAttribute("rx") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            zamxi = Math.min(zamxi, zamxg / 2);
            zamxj = Math.min(zamxj, zamxh / 2);
            var zamxk = new ShapePath;
            zamxk.moveTo(zamxd + zamxi, zamxe);
            zamxk.lineTo(zamxd + zamxg - zamxi, zamxe);
            if (zamxi !== 0 || zamxj !== 0) zamxk.bezierCurveTo(zamxd + zamxg - zamxi * zamxc, zamxe, zamxd + zamxg, zamxe + zamxj * zamxc, zamxd + zamxg, zamxe + zamxj);
            zamxk.lineTo(zamxd + zamxg, zamxe + zamxh - zamxj);
            if (zamxi !== 0 || zamxj !== 0) zamxk.bezierCurveTo(zamxd + zamxg, zamxe + zamxh - zamxj * zamxc, zamxd + zamxg - zamxi * zamxc, zamxe + zamxh, zamxd + zamxg - zamxi, zamxe + zamxh);
            zamxk.lineTo(zamxd + zamxi, zamxe + zamxh);
            if (zamxi !== 0 || zamxj !== 0) zamxk.bezierCurveTo(zamxd + zamxi * zamxc, zamxe + zamxh, zamxd, zamxe + zamxh - zamxj * zamxc, zamxd, zamxe + zamxh - zamxj);
            zamxk.lineTo(zamxd, zamxe + zamxj);
            if (zamxi !== 0 || zamxj !== 0) zamxk.bezierCurveTo(zamxd, zamxe + zamxj * zamxc, zamxd + zamxi * zamxc, zamxe, zamxd + zamxi, zamxe);
            return zamxk;
        }
        function zamxw(zamxa) {
            var zamxc = zamxf(zamxa.getAttribute("cx") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxe = zamxf(zamxa.getAttribute("cy") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxg = zamxf(zamxa.getAttribute("r") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxh = new Path;
            zamxh.absarc(zamxc, zamxe, zamxg, 0, zamxd);
            var zamxi = new ShapePath;
            zamxi.subPaths.push(zamxh);
            return zamxi;
        }
        function zamxx(zamxa) {
            var zamxc = zamxf(zamxa.getAttribute("cx") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxe = zamxf(zamxa.getAttribute("cy") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxg = zamxf(zamxa.getAttribute("rx") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxh = zamxf(zamxa.getAttribute("ry") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxi = new Path;
            zamxi.absellipse(zamxc, zamxe, zamxg, zamxh, 0, zamxd);
            var zamxj = new ShapePath;
            zamxj.subPaths.push(zamxi);
            return zamxj;
        }
        function zamxy(zamxa) {
            var zamxc = zamxf(zamxa.getAttribute("x1") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxd = zamxf(zamxa.getAttribute("y1") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxe = zamxf(zamxa.getAttribute("x2") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxg = zamxf(zamxa.getAttribute("y2") || 0, zamxb.defaultDPI, zamxb.defaultUnit);
            var zamxh = new ShapePath;
            zamxh.moveTo(zamxc, zamxd);
            zamxh.lineTo(zamxe, zamxg);
            if (zamxh.currentPath) zamxh.currentPath.autoClose = false;
            return zamxh;
        }
        function zamxz(zamxa, zamxb) {
            var zamxc = zamxe(zamxa.getAttribute("points") || "");
            var zamxd = new ShapePath;
            for (var zamxf = 0; zamxf + 1 < zamxc.length; zamxf += 2) {
                if (zamxf === 0) zamxd.moveTo(zamxc[zamxf], zamxc[zamxf + 1]); else zamxd.lineTo(zamxc[zamxf], zamxc[zamxf + 1]);
            }
            if (zamxd.currentPath) zamxd.currentPath.autoClose = zamxb;
            return zamxd;
        }
        function zamxaa(zamxa, zamxb) {
            if (zamxa.nodeType !== 1) return;
            if (zamxa.hasAttribute("filter")) console.warn("SVGLoader: Filters are not supported.");
            var zamxc = zamxa.nodeName;
            var zamxd = zamxu(zamxa);
            var zamxe = zamxm[zamxm.length - 1];
            if (zamxd) {
                zamxe = (new Matrix3).copy(zamxm[zamxm.length - 1]).multiply(zamxd);
                zamxm.push(zamxe);
            }
            var zamxf = zamxb;
            var zamxh = null;
            if (zamxc === "svg" || zamxc === "g") zamxf = zamxs(zamxa, zamxf); else if (zamxc === "path") {
                zamxf = zamxs(zamxa, zamxf);
                if (zamxa.hasAttribute("d")) zamxh = zamxr(zamxa.getAttribute("d"));
            } else if (zamxc === "rect") {
                zamxf = zamxs(zamxa, zamxf);
                zamxh = zamxv(zamxa);
            } else if (zamxc === "circle") {
                zamxf = zamxs(zamxa, zamxf);
                zamxh = zamxw(zamxa);
            } else if (zamxc === "ellipse") {
                zamxf = zamxs(zamxa, zamxf);
                zamxh = zamxx(zamxa);
            } else if (zamxc === "line") {
                zamxf = zamxs(zamxa, zamxf);
                zamxh = zamxy(zamxa);
            } else if (zamxc === "polygon") {
                zamxf = zamxs(zamxa, zamxf);
                zamxh = zamxz(zamxa, true);
            } else if (zamxc === "polyline") {
                zamxf = zamxs(zamxa, zamxf);
                zamxh = zamxz(zamxa, false);
            } else if (zamxc === "use") {
                zamxf = zamxs(zamxa, zamxf);
                var zamxj = zamxa.getAttributeNS && zamxa.getAttributeNS("http://www.w3.org/1999/xlink", "href") || zamxa.getAttribute("href") || "";
                var zamxn = null;
                if (zamxj.charAt(0) === "#") {
                    var zamxp = zamxa.viewportElement || zamxa.ownerDocument || zamxg;
                    zamxn = zamxp.getElementById ? zamxp.getElementById(zamxj.slice(1)) : null;
                }
                if (zamxn) zamxaa(zamxn, zamxf); else console.warn("SVGLoader: 'use node' references non-existent node id: " + zamxj.slice(1));
            }
            if (zamxh) {
                if (zamxf.fill !== undefined && zamxf.fill !== "none" && zamxf.fill.indexOf("url") !== 0) zamxh.color.setStyle(zamxf.fill, "srgb");
                zamxo(zamxh, zamxe);
                var zamxq = Object.assign({}, zamxf);
                zamxq.strokeWidth = zamxf.strokeWidth * zamxl(zamxe);
                zamxh.userData = {
                    node: zamxa,
                    style: zamxq,
                    transform: zamxe.clone(),
                    gradients: zamxi
                };
                zamxk.push(zamxh);
            }
            if (zamxc === "defs") {
                var zamxt = zamxa.childNodes;
                for (var zamxab = 0; zamxab < zamxt.length; zamxab++) {
                    var zamxac = zamxt[zamxab].nodeName;
                    if (zamxac === "style" || zamxac === "defs") zamxaa(zamxt[zamxab], zamxf);
                }
            } else {
                var zamxad = zamxa.childNodes;
                for (var zamxae = 0; zamxae < zamxad.length; zamxae++) zamxaa(zamxad[zamxae], zamxf);
            }
            if (zamxd) zamxm.pop();
        }
        zamxq(zamxg);
        zamxt(zamxg);
        zamxaa(zamxg.documentElement, {
            fill: "#000",
            fillOpacity: 1,
            strokeOpacity: 1,
            strokeWidth: 1,
            strokeLineJoin: "miter",
            strokeLineCap: "butt",
            strokeMiterLimit: 4
        });
        return {
            paths: zamxk,
            gradients: zamxi,
            xml: zamxg.documentElement
        };
    }
    static createShapes(zamxa) {
        return zamxa.toShapes();
    }
    static createFillMaterial(zamxb) {
        var zamxc = zamxb.userData.style;
        if (!zamxc || zamxc.fill === undefined || zamxc.fill === "none") return null;
        var zamxd = new BasicMaterial({
            opacity: zamxc.fillOpacity * (zamxc.opacity || 1),
            transparent: true,
            side: DoubleSide,
            depthWrite: false
        });
        var zamxe = zamxa.exec(zamxc.fill);
        if (zamxe) {
            var zamxf = zamxb.userData.gradients && zamxb.userData.gradients[zamxe[1]];
            var zamxg = zamxu(zamxf, zamxb);
            if (zamxg) {
                zamxd.diffuseMap = zamxg;
                return zamxd;
            }
        }
        zamxd.color = zamxb.color;
        return zamxd;
    }
    static createStrokeMaterial(zamxb) {
        var zamxc = zamxb.userData.style;
        if (!zamxc || zamxc.stroke === undefined || zamxc.stroke === "none") return null;
        if (zamxa.test(zamxc.stroke)) console.warn("SVGLoader: Gradient strokes are not supported.");
        var zamxd = new BasicMaterial({
            opacity: zamxc.strokeOpacity * (zamxc.opacity || 1),
            transparent: true,
            side: DoubleSide,
            depthWrite: false
        });
        zamxd.color = (new Color).setStyle(zamxc.stroke, "srgb");
        return zamxd;
    }
    static getStrokeStyle(zamxa, zamxb, zamxc, zamxd, zamxe) {
        return {
            strokeColor: zamxb !== undefined ? zamxb : "#000",
            strokeWidth: zamxa !== undefined ? zamxa : 1,
            strokeLineJoin: zamxc !== undefined ? zamxc : "miter",
            strokeLineCap: zamxd !== undefined ? zamxd : "butt",
            strokeMiterLimit: zamxe !== undefined ? zamxe : 4
        };
    }
    static pointsToStroke(zamxa, zamxb, zamxc, zamxd) {
        var zamxe = [], zamxf = [], zamxg = [];
        if (SVGLoader.pointsToStrokeWithBuffers(zamxa, zamxb, zamxc, zamxd, zamxe, zamxf, zamxg, 0) === 0) return null;
        var zamxh = new Geometry;
        zamxh.setAttribute("position", new Float32Array(zamxe), 3);
        zamxh.setAttribute("normal", new Float32Array(zamxf), 3);
        zamxh.setAttribute("uv", new Float32Array(zamxg), 2);
        return zamxh;
    }
    static pointsToStrokeWithBuffers(zamxa, zamxb, zamxc, zamxd, zamxe, zamxf, zamxg, zamxh) {
        zamxc = zamxc !== undefined ? zamxc : 12;
        zamxd = zamxd !== undefined ? zamxd : .001;
        zamxh = zamxh !== undefined ? zamxh : 0;
        if (!zamxa || zamxa.length < 2) return 0;
        var zamxi = [ zamxa[0] ];
        for (var zamxj = 1; zamxj < zamxa.length - 1; zamxj++) {
            if (zamxa[zamxj].distanceTo(zamxi[zamxi.length - 1]) >= zamxd) zamxi.push(zamxa[zamxj]);
        }
        zamxi.push(zamxa[zamxa.length - 1]);
        var zamxk = zamxi.length;
        if (zamxk < 2) return 0;
        var zamxl = zamxi[0].equals(zamxi[zamxk - 1]);
        var zamxm = zamxb.strokeWidth / 2;
        var zamxn = zamxb.strokeMiterLimit;
        var zamxo = [];
        var zamxp = [];
        function zamxq(zamxa, zamxb, zamxc, zamxd, zamxe, zamxf, zamxg, zamxh, zamxi, zamxj, zamxk, zamxl) {
            var zamxm = (zamxe - zamxa) * (zamxj - zamxb) - (zamxf - zamxb) * (zamxi - zamxa);
            if (zamxm < 0) {
                var zamxn = zamxe, zamxq = zamxf, zamxr = zamxg, zamxs = zamxh;
                zamxe = zamxi;
                zamxf = zamxj;
                zamxg = zamxk;
                zamxh = zamxl;
                zamxi = zamxn;
                zamxj = zamxq;
                zamxk = zamxr;
                zamxl = zamxs;
            }
            zamxo.push(zamxa, zamxb, 0, zamxe, zamxf, 0, zamxi, zamxj, 0);
            zamxp.push(zamxc, zamxd, zamxg, zamxh, zamxk, zamxl);
        }
        function zamxr(zamxa, zamxb, zamxd, zamxe, zamxf, zamxg) {
            var zamxh = Math.max(1, zamxc - 1);
            var zamxi = Math.atan2(zamxe - zamxb, zamxd - zamxa);
            var zamxj = zamxd, zamxk = zamxe;
            for (var zamxl = 1; zamxl <= zamxh; zamxl++) {
                var zamxn = zamxi + zamxf * (zamxl / zamxh);
                var zamxo = zamxa + Math.cos(zamxn) * zamxm;
                var zamxp = zamxb + Math.sin(zamxn) * zamxm;
                zamxq(zamxa, zamxb, zamxg, .5, zamxj, zamxk, zamxg, .5, zamxo, zamxp, zamxg, .5);
                zamxj = zamxo;
                zamxk = zamxp;
            }
        }
        function zamxs(zamxa, zamxb, zamxc, zamxd) {
            var zamxe = zamxb[0] * zamxd[1] - zamxb[1] * zamxd[0];
            if (Math.abs(zamxe) < 1e-12) return null;
            var zamxf = ((zamxc.x - zamxa.x) * zamxd[1] - (zamxc.y - zamxa.y) * zamxd[0]) / zamxe;
            return {
                x: zamxa.x + zamxb[0] * zamxf,
                y: zamxa.y + zamxb[1] * zamxf
            };
        }
        var zamxt = [], zamxu = [], zamxv = [], zamxw = [], zamxx = [];
        for (var zamxy = 0; zamxy < zamxk - 1; zamxy++) {
            var zamxz = zamxi[zamxy + 1].x - zamxi[zamxy].x, zamxaa = zamxi[zamxy + 1].y - zamxi[zamxy].y;
            var zamxab = Math.sqrt(zamxz * zamxz + zamxaa * zamxaa) || 1;
            var zamxac = -zamxaa / zamxab, zamxad = zamxz / zamxab;
            zamxx.push([ zamxz / zamxab, zamxaa / zamxab ]);
            zamxt.push({
                x: zamxi[zamxy].x + zamxac * zamxm,
                y: zamxi[zamxy].y + zamxad * zamxm
            });
            zamxu.push({
                x: zamxi[zamxy].x - zamxac * zamxm,
                y: zamxi[zamxy].y - zamxad * zamxm
            });
            zamxv.push({
                x: zamxi[zamxy + 1].x + zamxac * zamxm,
                y: zamxi[zamxy + 1].y + zamxad * zamxm
            });
            zamxw.push({
                x: zamxi[zamxy + 1].x - zamxac * zamxm,
                y: zamxi[zamxy + 1].y - zamxad * zamxm
            });
        }
        for (var zamxae = 1; zamxae < zamxk - 1; zamxae++) {
            var zamxaf = zamxx[zamxae - 1], zamxag = zamxx[zamxae];
            var zamxah = zamxaf[0] * zamxag[1] - zamxaf[1] * zamxag[0];
            if (Math.abs(zamxah) < 1e-12) continue;
            var zamxai = zamxah > 0;
            var zamxaj = zamxai ? zamxv[zamxae - 1] : zamxw[zamxae - 1];
            var zamxak = zamxai ? zamxt[zamxae] : zamxu[zamxae];
            var zamxal = zamxai ? zamxw[zamxae - 1] : zamxv[zamxae - 1];
            var zamxam = zamxai ? zamxu[zamxae] : zamxt[zamxae];
            var zamxan = [ -zamxaf[0], -zamxaf[1] ];
            var zamxao = zamxs(zamxaj, zamxan, zamxak, zamxag);
            if (zamxao) {
                var zamxap = (zamxao.x - zamxi[zamxae].x) * -zamxaf[0] + (zamxao.y - zamxi[zamxae].y) * -zamxaf[1];
                var zamxaq = (zamxao.x - zamxi[zamxae].x) * zamxag[0] + (zamxao.y - zamxi[zamxae].y) * zamxag[1];
                var zamxar = Math.sqrt(Math.pow(zamxi[zamxae].x - zamxi[zamxae - 1].x, 2) + Math.pow(zamxi[zamxae].y - zamxi[zamxae - 1].y, 2));
                var zamxas = Math.sqrt(Math.pow(zamxi[zamxae + 1].x - zamxi[zamxae].x, 2) + Math.pow(zamxi[zamxae + 1].y - zamxi[zamxae].y, 2));
                if (zamxap < zamxar * 2 && zamxaq < zamxas * 2) {
                    if (zamxai) {
                        zamxv[zamxae - 1] = zamxao;
                        zamxt[zamxae] = zamxao;
                    } else {
                        zamxw[zamxae - 1] = zamxao;
                        zamxu[zamxae] = zamxao;
                    }
                }
            }
            var zamxat = zamxb.strokeLineJoin;
            var zamxau = zamxae / (zamxk - 1);
            if (zamxat === "round") {
                var zamxav = Math.atan2(zamxah, zamxaf[0] * zamxag[0] + zamxaf[1] * zamxag[1]);
                zamxr(zamxi[zamxae].x, zamxi[zamxae].y, zamxal.x, zamxal.y, zamxav, zamxau);
            } else if (zamxat === "bevel") {
                zamxq(zamxi[zamxae].x, zamxi[zamxae].y, zamxau, .5, zamxal.x, zamxal.y, zamxau, .5, zamxam.x, zamxam.y, zamxau, .5);
            } else {
                var zamxaw = zamxs(zamxal, zamxan, zamxam, zamxag);
                var zamxax = zamxaw ? Math.sqrt(Math.pow(zamxaw.x - zamxi[zamxae].x, 2) + Math.pow(zamxaw.y - zamxi[zamxae].y, 2)) : Infinity;
                if (zamxaw && zamxax <= zamxn * zamxm) {
                    if (zamxai) {
                        zamxw[zamxae - 1] = zamxaw;
                        zamxu[zamxae] = zamxaw;
                    } else {
                        zamxv[zamxae - 1] = zamxaw;
                        zamxt[zamxae] = zamxaw;
                    }
                } else if (zamxat === "miter-clip" && zamxaw) {
                    var zamxay = zamxn * zamxm / zamxax;
                    var zamxaz = {
                        x: zamxi[zamxae].x + (zamxaw.x - zamxi[zamxae].x) * zamxay,
                        y: zamxi[zamxae].y + (zamxaw.y - zamxi[zamxae].y) * zamxay
                    };
                    if (zamxai) {
                        zamxw[zamxae - 1] = zamxaz;
                        zamxu[zamxae] = zamxaz;
                    } else {
                        zamxv[zamxae - 1] = zamxaz;
                        zamxt[zamxae] = zamxaz;
                    }
                    zamxq(zamxal.x, zamxal.y, zamxau, 1, zamxaz.x, zamxaz.y, zamxau, .5, zamxam.x, zamxam.y, zamxau, 1);
                } else {
                    zamxq(zamxi[zamxae].x, zamxi[zamxae].y, zamxau, .5, zamxal.x, zamxal.y, zamxau, .5, zamxam.x, zamxam.y, zamxau, .5);
                }
            }
        }
        for (var zamxba = 0; zamxba < zamxk - 1; zamxba++) {
            var zamxbb = zamxba / (zamxk - 1), zamxbc = (zamxba + 1) / (zamxk - 1);
            zamxq(zamxt[zamxba].x, zamxt[zamxba].y, zamxbb, 1, zamxu[zamxba].x, zamxu[zamxba].y, zamxbb, 0, zamxv[zamxba].x, zamxv[zamxba].y, zamxbc, 1);
            zamxq(zamxu[zamxba].x, zamxu[zamxba].y, zamxbb, 0, zamxw[zamxba].x, zamxw[zamxba].y, zamxbc, 0, zamxv[zamxba].x, zamxv[zamxba].y, zamxbc, 1);
        }
        if (!zamxl) {
            var zamxbd = zamxb.strokeLineCap;
            if (zamxbd === "round") {
                zamxr(zamxi[0].x, zamxi[0].y, zamxt[0].x, zamxt[0].y, Math.PI, 0);
                zamxr(zamxi[zamxk - 1].x, zamxi[zamxk - 1].y, zamxw[zamxk - 2].x, zamxw[zamxk - 2].y, Math.PI, 1);
            } else if (zamxbd === "square") {
                var zamxbe = -zamxx[0][0] * zamxm, zamxbf = -zamxx[0][1] * zamxm;
                zamxq(zamxt[0].x, zamxt[0].y, 0, 1, zamxu[0].x, zamxu[0].y, 0, 0, zamxt[0].x + zamxbe, zamxt[0].y + zamxbf, 0, 1);
                zamxq(zamxu[0].x, zamxu[0].y, 0, 0, zamxu[0].x + zamxbe, zamxu[0].y + zamxbf, 0, 0, zamxt[0].x + zamxbe, zamxt[0].y + zamxbf, 0, 1);
                var zamxbg = zamxx[zamxk - 2];
                var zamxbh = zamxbg[0] * zamxm, zamxbi = zamxbg[1] * zamxm;
                var zamxbj = zamxv[zamxk - 2], zamxbk = zamxw[zamxk - 2];
                zamxq(zamxbj.x, zamxbj.y, 1, 1, zamxbk.x, zamxbk.y, 1, 0, zamxbj.x + zamxbh, zamxbj.y + zamxbi, 1, 1);
                zamxq(zamxbk.x, zamxbk.y, 1, 0, zamxbk.x + zamxbh, zamxbk.y + zamxbi, 1, 0, zamxbj.x + zamxbh, zamxbj.y + zamxbi, 1, 1);
            }
        }
        var zamxbl = zamxo.length;
        if (zamxe) {
            var zamxbm = zamxh * 3;
            for (var zamxbn = 0; zamxbn < zamxbl; zamxbn++) zamxe[zamxbm + zamxbn] = zamxo[zamxbn];
            if (zamxf) for (var zamxbo = 0; zamxbo < zamxbl; zamxbo++) zamxf[zamxbm + zamxbo] = zamxbo % 3 === 2 ? 1 : 0;
            if (zamxg) {
                var zamxbp = zamxh * 2;
                for (var zamxbq = 0; zamxbq < zamxp.length; zamxbq++) zamxg[zamxbp + zamxbq] = zamxp[zamxbq];
            }
        }
        return zamxbl;
    }
}

export { SVGLoader };
