import { faoxombytestotext, faoxomtexttobytes } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

import { faoxomsrgbtolinearalt } from "../math/index.js";

function faoxomdecodevtk(zanha) {
    var zanhb = typeof zanha === "string" ? faoxomtexttobytes(zanha) : zanha instanceof Uint8Array ? zanha : new Uint8Array(zanha);
    var zanhc = new DataView(zanhb.buffer, zanhb.byteOffset, zanhb.byteLength);
    var zanhd = function(zanha) {
        var zanhc = zanha;
        while (zanhc < zanhb.length && zanhb[zanhc] !== 10) zanhc++;
        var zanhd = zanhb.subarray(zanha, zanhc);
        var zanhe = "";
        for (var zanhf = 0; zanhf < zanhd.length; zanhf += 8192) zanhe += String.fromCharCode.apply(null, zanhd.subarray(zanhf, Math.min(zanhf + 8192, zanhd.length)));
        return {
            text: zanhe.trim(),
            next: zanhc + 1
        };
    };
    var zanhe = zanhd(0);
    if (zanhe.text.toLowerCase().indexOf("vtk") < 0) throw new Error("Invalid VTK file");
    zanhe = zanhd(zanhe.next);
    zanhe = zanhd(zanhe.next);
    var zanhf = zanhe.text.split(/\s+/)[0].toUpperCase();
    if (zanhf !== "ASCII" && zanhf !== "BINARY") throw new Error("Invalid VTK file format line");
    var zanhg = zanhf === "BINARY";
    var zanhh = [], zanhi = [], zanhj = [], zanhk = [];
    if (!zanhg) {
        var zanhl = faoxombytestotext(zanhb, zanhe.next);
        var zanhm = zanhl.split("\n");
        var zanhn = /^[^\d.\s-]+/;
        var zanho = /^(\d+)\s+([\s\d]*)/;
        var zanhp = /^POINTS /;
        var zanhq = /^POLYGONS /;
        var zanhr = /^TRIANGLE_STRIPS /;
        var zanhs = /^POINT_DATA[ ]+(\d+)/;
        var zanht = /^CELL_DATA[ ]+(\d+)/;
        var zanhu = /^COLOR_SCALARS[ ]+(\w+)[ ]+3/;
        var zanhv = /^NORMALS[ ]+(\w+)[ ]+(\w+)/;
        var zanhw = false, zanhx = false, zanhy = false, zanhz = false, zanhaa = false, zanhab = false, zanhac = false;
        var zanhad = function(zanha) {
            var zanhb = [], zanhc = zanha.split(/\s+/);
            for (var zanhd = 0; zanhd < zanhc.length; zanhd++) {
                if (zanhc[zanhd] !== "") zanhb.push(parseFloat(zanhc[zanhd]));
            }
            return zanhb;
        };
        for (var zanhae = 0; zanhae < zanhm.length; zanhae++) {
            var zanhaf = zanhm[zanhae].trim();
            if (zanhaf.indexOf("DATASET") === 0) {
                var zanhag = zanhaf.split(" ")[1];
                if (zanhag !== "POLYDATA") throw new Error("Unsupported DATASET type: " + zanhag);
            } else if (zanhw) {
                if (zanhn.exec(zanhaf) === null) {
                    var zanhah = zanhad(zanhaf);
                    for (var zanhai = 0; zanhai + 2 < zanhah.length; zanhai += 3) zanhh.push(zanhah[zanhai], zanhah[zanhai + 1], zanhah[zanhai + 2]);
                }
            } else if (zanhx) {
                var zanhaj = zanho.exec(zanhaf);
                if (zanhaj !== null) {
                    var zanhak = parseInt(zanhaj[1]);
                    var zanhal = zanhaj[2].split(/\s+/);
                    if (zanhak >= 3) {
                        var zanham = parseInt(zanhal[0]);
                        for (var zanhan = 1; zanhan < zanhak - 1; zanhan++) zanhi.push(zanham, parseInt(zanhal[zanhan]), parseInt(zanhal[zanhan + 1]));
                    }
                }
            } else if (zanhy) {
                var zanhao = zanho.exec(zanhaf);
                if (zanhao !== null) {
                    var zanhap = parseInt(zanhao[1]);
                    var zanhaq = zanhao[2].split(/\s+/);
                    if (zanhap >= 3) {
                        for (var zanhar = 0; zanhar < zanhap - 2; zanhar++) {
                            if (zanhar % 2 === 1) zanhi.push(parseInt(zanhaq[zanhar]), parseInt(zanhaq[zanhar + 2]), parseInt(zanhaq[zanhar + 1])); else zanhi.push(parseInt(zanhaq[zanhar]), parseInt(zanhaq[zanhar + 1]), parseInt(zanhaq[zanhar + 2]));
                        }
                    }
                }
            } else if (zanhz || zanhaa) {
                if (zanhab) {
                    if (zanhn.exec(zanhaf) === null) {
                        var zanhas = zanhad(zanhaf);
                        for (var zanhat = 0; zanhat + 2 < zanhas.length; zanhat += 3) zanhk.push(faoxomsrgbtolinearalt(zanhas[zanhat]), faoxomsrgbtolinearalt(zanhas[zanhat + 1]), faoxomsrgbtolinearalt(zanhas[zanhat + 2]));
                    }
                } else if (zanhac) {
                    if (zanhn.exec(zanhaf) === null) {
                        var zanhau = zanhad(zanhaf);
                        for (var zanhav = 0; zanhav + 2 < zanhau.length; zanhav += 3) zanhj.push(zanhau[zanhav], zanhau[zanhav + 1], zanhau[zanhav + 2]);
                    }
                }
            }
            if (zanhq.exec(zanhaf) !== null) {
                zanhx = true;
                zanhw = false;
                zanhy = false;
            } else if (zanhp.exec(zanhaf) !== null) {
                zanhx = false;
                zanhw = true;
                zanhy = false;
            } else if (zanhr.exec(zanhaf) !== null) {
                zanhx = false;
                zanhw = false;
                zanhy = true;
            } else if (zanhs.exec(zanhaf) !== null) {
                zanhz = true;
                zanhw = false;
                zanhx = false;
                zanhy = false;
            } else if (zanht.exec(zanhaf) !== null) {
                zanhaa = true;
                zanhw = false;
                zanhx = false;
                zanhy = false;
            } else if (zanhu.exec(zanhaf) !== null) {
                zanhab = true;
                zanhac = false;
                zanhw = false;
                zanhx = false;
                zanhy = false;
            } else if (zanhv.exec(zanhaf) !== null) {
                zanhac = true;
                zanhab = false;
                zanhw = false;
                zanhx = false;
                zanhy = false;
            }
        }
    } else {
        var zanhaw = zanhe.next;
        while (zanhaw < zanhb.length) {
            var zanhax = zanhd(zanhaw);
            var zanhay = zanhax.text;
            if (zanhay.indexOf("DATASET") === 0) {
                var zanhaz = zanhay.split(" ")[1];
                if (zanhaz !== "POLYDATA") throw new Error("Unsupported DATASET type: " + zanhaz);
            } else if (zanhay.indexOf("POINTS") === 0) {
                var zanhba = parseInt(zanhay.split(" ")[1], 10) || 0;
                var zanhbb = (zanhay.split(" ")[2] || "float").toLowerCase();
                var zanhbc = zanhbb === "double" ? 8 : 4;
                if (zanhax.next + zanhba * 3 * zanhbc > zanhb.length) throw new Error("Corrupt VTK binary data");
                for (var zanhbd = 0; zanhbd < zanhba; zanhbd++) {
                    var zanhbe = zanhax.next + zanhbd * 3 * zanhbc;
                    zanhh.push(zanhbc === 8 ? zanhc.getFloat64(zanhbe, false) : zanhc.getFloat32(zanhbe, false), zanhbc === 8 ? zanhc.getFloat64(zanhbe + zanhbc, false) : zanhc.getFloat32(zanhbe + 4, false), zanhbc === 8 ? zanhc.getFloat64(zanhbe + zanhbc * 2, false) : zanhc.getFloat32(zanhbe + 8, false));
                }
                zanhax.next += zanhba * 3 * zanhbc;
                if (zanhb[zanhax.next] === 10) zanhax.next++;
            } else if (zanhay.indexOf("POLYGONS") === 0 || zanhay.indexOf("TRIANGLE_STRIPS") === 0) {
                var zanhbf = zanhay.indexOf("TRIANGLE_STRIPS") === 0;
                var zanhbg = parseInt(zanhay.split(" ")[1], 10) || 0;
                var zanhbh = zanhax.next;
                for (var zanhbi = 0; zanhbi < zanhbg; zanhbi++) {
                    if (zanhbh + 4 > zanhb.length) throw new Error("Corrupt VTK binary data");
                    var zanhbj = zanhc.getInt32(zanhbh, false);
                    zanhbh += 4;
                    if (zanhbj < 0 || zanhbh + zanhbj * 4 > zanhb.length) throw new Error("Corrupt VTK binary data");
                    var zanhbk = new Array(zanhbj);
                    for (var zanhbl = 0; zanhbl < zanhbj; zanhbl++) {
                        zanhbk[zanhbl] = zanhc.getInt32(zanhbh, false);
                        zanhbh += 4;
                    }
                    if (zanhbj >= 3) {
                        if (zanhbf) {
                            for (var zanhbm = 0; zanhbm < zanhbj - 2; zanhbm++) {
                                if (zanhbm % 2 === 1) zanhi.push(zanhbk[zanhbm], zanhbk[zanhbm + 2], zanhbk[zanhbm + 1]); else zanhi.push(zanhbk[zanhbm], zanhbk[zanhbm + 1], zanhbk[zanhbm + 2]);
                            }
                        } else {
                            for (var zanhbn = 1; zanhbn < zanhbj - 1; zanhbn++) zanhi.push(zanhbk[0], zanhbk[zanhbn], zanhbk[zanhbn + 1]);
                        }
                    }
                }
                zanhax.next = zanhbh;
                if (zanhb[zanhax.next] === 10) zanhax.next++;
            } else if (zanhay.indexOf("POINT_DATA") === 0) {
                var zanhbo = parseInt(zanhay.split(" ")[1], 10) || 0;
                var zanhbp = zanhd(zanhax.next);
                if (zanhbp.text.indexOf("NORMALS") === 0) {
                    var zanhbq = (zanhbp.text.split(/\s+/)[2] || "float").toLowerCase();
                    var zanhbr = zanhbq === "double" ? 8 : 4;
                    if (zanhbp.next + zanhbo * 3 * zanhbr > zanhb.length) throw new Error("Corrupt VTK binary data");
                    for (var zanhbs = 0; zanhbs < zanhbo; zanhbs++) {
                        var zanhbt = zanhbp.next + zanhbs * 3 * zanhbr;
                        zanhj.push(zanhbr === 8 ? zanhc.getFloat64(zanhbt, false) : zanhc.getFloat32(zanhbt, false), zanhbr === 8 ? zanhc.getFloat64(zanhbt + zanhbr, false) : zanhc.getFloat32(zanhbt + 4, false), zanhbr === 8 ? zanhc.getFloat64(zanhbt + zanhbr * 2, false) : zanhc.getFloat32(zanhbt + 8, false));
                    }
                    zanhax.next = zanhbp.next + zanhbo * 3 * zanhbr;
                    if (zanhb[zanhax.next] === 10) zanhax.next++;
                } else throw new Error("Unsupported VTK binary POINT_DATA section: " + zanhbp.text);
            }
            zanhaw = zanhax.next;
        }
    }
    var zanhbu = new Geometry;
    zanhbu.setAttribute("position", new Float32Array(zanhh), 3);
    if (zanhi.length) zanhbu.setIndex(zanhi);
    if (zanhj.length && zanhj.length === zanhh.length) zanhbu.setAttribute("normal", new Float32Array(zanhj), 3);
    if (zanhk.length !== zanhi.length && zanhk.length === zanhh.length) zanhbu.setAttribute("color", new Float32Array(zanhk), 3); else if (zanhk.length === zanhi.length && zanhk.length) {
        zanhbu = zanhbu.toNonIndexed();
        var zanhbv = zanhbu.attributes.position.array.length / 9;
        if (zanhk.length === zanhbv * 3) {
            var zanhbw = [];
            for (var zanhbx = 0; zanhbx < zanhbv; zanhbx++) {
                var zanhby = zanhk[zanhbx * 3], zanhbz = zanhk[zanhbx * 3 + 1], zanhca = zanhk[zanhbx * 3 + 2];
                zanhbw.push(zanhby, zanhbz, zanhca, zanhby, zanhbz, zanhca, zanhby, zanhbz, zanhca);
            }
            zanhbu.setAttribute("color", new Float32Array(zanhbw), 3);
        }
    }
    zanhbu.computeBoundingBox();
    zanhbu.computeBoundingSphere();
    return zanhbu;
}

export { faoxomdecodevtk };
