import { faoxomworlduvgenerator } from "../core/index.js";

import { Shape, ShapeUtils, Vector2 } from "../math/index.js";

import { Geometry } from "./Geometry.js";

class ExtrudeGeometry extends Geometry {
    constructor(zakfa, zakfb) {
        super();
        this.type = "ExtrudeGeometry";
        if (zakfa === undefined) zakfa = new Shape([ new Vector2(.5, .5), new Vector2(-.5, .5), new Vector2(-.5, -.5), new Vector2(.5, -.5) ]);
        if (typeof zakfb === "number") zakfb = {
            depth: zakfb
        };
        zakfb = zakfb || {};
        this.parameters = {
            shapes: zakfa,
            options: zakfb
        };
        if (zakfb.extrudePath) console.warn("ExtrudeGeometry: extrudePath is not supported; extruding along +z.");
        var zakfc = Array.isArray(zakfa) ? zakfa : [ zakfa ];
        var zakfd = this;
        var zakfe = [];
        var zakff = [];
        function zakfg(zakfa) {
            var zakfc = [];
            var zakfg = zakfb.curveSegments !== undefined ? zakfb.curveSegments : 12;
            var zakfh = zakfb.steps !== undefined ? zakfb.steps : 1;
            var zakfi = zakfb.depth !== undefined ? zakfb.depth : 1;
            var zakfj = zakfb.bevelEnabled !== undefined ? zakfb.bevelEnabled : true;
            var zakfk = zakfb.bevelThickness !== undefined ? zakfb.bevelThickness : .2;
            var zakfl = zakfb.bevelSize !== undefined ? zakfb.bevelSize : zakfk - .1;
            var zakfm = zakfb.bevelOffset !== undefined ? zakfb.bevelOffset : 0;
            var zakfn = zakfb.bevelSegments !== undefined ? zakfb.bevelSegments : 3;
            var zakfo = zakfb.UVGenerator !== undefined ? zakfb.UVGenerator : faoxomworlduvgenerator;
            if (!zakfj) {
                zakfn = 0;
                zakfk = 0;
                zakfl = 0;
                zakfm = 0;
            }
            var zakfp = zakfa.extractPoints(zakfg);
            var zakfq = zakfp.shape;
            var zakfr = zakfp.holes;
            var zakfs = !ShapeUtils.isClockWise(zakfq);
            if (zakfs) {
                zakfq = zakfq.reverse();
                for (var zakft = 0, zakfu = zakfr.length; zakft < zakfu; zakft++) {
                    var zakfv = zakfr[zakft];
                    if (ShapeUtils.isClockWise(zakfv)) zakfr[zakft] = zakfv.reverse();
                }
            }
            function zakfw(zakfa) {
                var zakfb = 1e-10;
                var zakfc = zakfb * zakfb;
                var zakfd = zakfa[0];
                for (var zakfe = 1; zakfe <= zakfa.length; zakfe++) {
                    var zakff = zakfe % zakfa.length;
                    var zakfg = zakfa[zakff];
                    var zakfh = zakfg.x - zakfd.x;
                    var zakfi = zakfg.y - zakfd.y;
                    var zakfj = zakfh * zakfh + zakfi * zakfi;
                    var zakfk = Math.max(Math.abs(zakfg.x), Math.abs(zakfg.y), Math.abs(zakfd.x), Math.abs(zakfd.y));
                    var zakfl = zakfc * zakfk * zakfk;
                    if (zakfj <= zakfl) {
                        zakfa.splice(zakff, 1);
                        zakfe--;
                        continue;
                    }
                    zakfd = zakfg;
                }
            }
            zakfw(zakfq);
            zakfr.forEach(zakfw);
            var zakfx = zakfr.length;
            var zakfy = zakfq;
            for (var zakfz = 0; zakfz < zakfx; zakfz++) zakfq = zakfq.concat(zakfr[zakfz]);
            function zakfaa(zakfa, zakfb, zakfc) {
                if (!zakfb) console.error("ExtrudeGeometry: vec does not exist");
                return zakfa.clone().addScaledVector(zakfb, zakfc);
            }
            var zakfab = zakfq.length;
            function zakfac(zakfa, zakfb, zakfc) {
                var zakfd, zakfe, zakff;
                var zakfg = zakfa.x - zakfb.x, zakfh = zakfa.y - zakfb.y;
                var zakfi = zakfc.x - zakfa.x, zakfj = zakfc.y - zakfa.y;
                var zakfk = zakfg * zakfg + zakfh * zakfh;
                var zakfl = zakfg * zakfj - zakfh * zakfi;
                if (Math.abs(zakfl) > Number.EPSILON) {
                    var zakfm = Math.sqrt(zakfk);
                    var zakfn = Math.sqrt(zakfi * zakfi + zakfj * zakfj);
                    var zakfo = zakfb.x - zakfh / zakfm;
                    var zakfp = zakfb.y + zakfg / zakfm;
                    var zakfq = zakfc.x - zakfj / zakfn;
                    var zakfr = zakfc.y + zakfi / zakfn;
                    var zakfs = ((zakfq - zakfo) * zakfj - (zakfr - zakfp) * zakfi) / (zakfg * zakfj - zakfh * zakfi);
                    zakfd = zakfo + zakfg * zakfs - zakfa.x;
                    zakfe = zakfp + zakfh * zakfs - zakfa.y;
                    var zakft = zakfd * zakfd + zakfe * zakfe;
                    if (zakft <= 2) {
                        return new Vector2(zakfd, zakfe);
                    } else {
                        zakff = Math.sqrt(zakft / 2);
                    }
                } else {
                    var zakfu = false;
                    if (zakfg > Number.EPSILON) {
                        if (zakfi > Number.EPSILON) {
                            zakfu = true;
                        }
                    } else {
                        if (zakfg < -Number.EPSILON) {
                            if (zakfi < -Number.EPSILON) {
                                zakfu = true;
                            }
                        } else {
                            if (Math.sign(zakfh) === Math.sign(zakfj)) {
                                zakfu = true;
                            }
                        }
                    }
                    if (zakfu) {
                        zakfd = -zakfh;
                        zakfe = zakfg;
                        zakff = Math.sqrt(zakfk);
                    } else {
                        zakfd = zakfg;
                        zakfe = zakfh;
                        zakff = Math.sqrt(zakfk / 2);
                    }
                }
                return new Vector2(zakfd / zakff, zakfe / zakff);
            }
            var zakfad = [];
            for (var zakfae = 0, zakfaf = zakfy.length, zakfag = zakfaf - 1, zakfah = zakfae + 1; zakfae < zakfaf; zakfae++,
            zakfag++, zakfah++) {
                if (zakfag === zakfaf) zakfag = 0;
                if (zakfah === zakfaf) zakfah = 0;
                zakfad[zakfae] = zakfac(zakfy[zakfae], zakfy[zakfag], zakfy[zakfah]);
            }
            var zakfai = [];
            var zakfaj, zakfak = zakfad.concat();
            for (var zakfal = 0, zakfam = zakfx; zakfal < zakfam; zakfal++) {
                var zakfan = zakfr[zakfal];
                zakfaj = [];
                for (var zakfao = 0, zakfap = zakfan.length, zakfaq = zakfap - 1, zakfar = zakfao + 1; zakfao < zakfap; zakfao++,
                zakfaq++, zakfar++) {
                    if (zakfaq === zakfap) zakfaq = 0;
                    if (zakfar === zakfap) zakfar = 0;
                    zakfaj[zakfao] = zakfac(zakfan[zakfao], zakfan[zakfaq], zakfan[zakfar]);
                }
                zakfai.push(zakfaj);
                zakfak = zakfak.concat(zakfaj);
            }
            var zakfas;
            if (zakfn === 0) {
                zakfas = ShapeUtils.triangulateShape(zakfy, zakfr);
            } else {
                var zakfat = [];
                var zakfau = [];
                for (var zakfav = 0; zakfav < zakfn; zakfav++) {
                    var zakfaw = zakfav / zakfn;
                    var zakfax = zakfk * Math.cos(zakfaw * Math.PI / 2);
                    var zakfay = zakfl * Math.sin(zakfaw * Math.PI / 2) + zakfm;
                    for (var zakfaz = 0, zakfba = zakfy.length; zakfaz < zakfba; zakfaz++) {
                        var zakfbb = zakfaa(zakfy[zakfaz], zakfad[zakfaz], zakfay);
                        zakfcg(zakfbb.x, zakfbb.y, -zakfax);
                        if (zakfaw === 0) zakfat.push(zakfbb);
                    }
                    for (var zakfbc = 0, zakfbd = zakfx; zakfbc < zakfbd; zakfbc++) {
                        var zakfbe = zakfr[zakfbc];
                        zakfaj = zakfai[zakfbc];
                        var zakfbf = [];
                        for (var zakfbg = 0, zakfbh = zakfbe.length; zakfbg < zakfbh; zakfbg++) {
                            var zakfbi = zakfaa(zakfbe[zakfbg], zakfaj[zakfbg], zakfay);
                            zakfcg(zakfbi.x, zakfbi.y, -zakfax);
                            if (zakfaw === 0) zakfbf.push(zakfbi);
                        }
                        if (zakfaw === 0) zakfau.push(zakfbf);
                    }
                }
                zakfas = ShapeUtils.triangulateShape(zakfat, zakfau);
            }
            var zakfbj = zakfas.length;
            var zakfbk = zakfl + zakfm;
            var zakfbl;
            for (zakfbl = 0; zakfbl < zakfab; zakfbl++) {
                var zakfbm = zakfj ? zakfaa(zakfq[zakfbl], zakfak[zakfbl], zakfbk) : zakfq[zakfbl];
                zakfcg(zakfbm.x, zakfbm.y, 0);
            }
            var zakfbn;
            for (zakfbn = 1; zakfbn <= zakfh; zakfbn++) {
                for (var zakfbo = 0; zakfbo < zakfab; zakfbo++) {
                    var zakfbp = zakfj ? zakfaa(zakfq[zakfbo], zakfak[zakfbo], zakfbk) : zakfq[zakfbo];
                    zakfcg(zakfbp.x, zakfbp.y, zakfi / zakfh * zakfbn);
                }
            }
            var zakfbq;
            for (zakfbq = zakfn - 1; zakfbq >= 0; zakfbq--) {
                var zakfbr = zakfbq / zakfn;
                var zakfbs = zakfk * Math.cos(zakfbr * Math.PI / 2);
                var zakfbt = zakfl * Math.sin(zakfbr * Math.PI / 2) + zakfm;
                for (var zakfbu = 0, zakfbv = zakfy.length; zakfbu < zakfbv; zakfbu++) {
                    var zakfbw = zakfaa(zakfy[zakfbu], zakfad[zakfbu], zakfbt);
                    zakfcg(zakfbw.x, zakfbw.y, zakfi + zakfbs);
                }
                for (var zakfbx = 0, zakfby = zakfx; zakfbx < zakfby; zakfbx++) {
                    var zakfbz = zakfr[zakfbx];
                    zakfaj = zakfai[zakfbx];
                    for (var zakfca = 0, zakfcb = zakfbz.length; zakfca < zakfcb; zakfca++) {
                        var zakfcc = zakfaa(zakfbz[zakfca], zakfaj[zakfca], zakfbt);
                        zakfcg(zakfcc.x, zakfcc.y, zakfi + zakfbs);
                    }
                }
            }
            function zakfcd() {
                var zakfa = zakfe.length / 3;
                if (zakfj) {
                    var zakfb = 0;
                    var zakfc = zakfab * zakfb;
                    for (var zakff = 0; zakff < zakfbj; zakff++) {
                        var zakfg = zakfas[zakff];
                        zakfch(zakfg[2] + zakfc, zakfg[1] + zakfc, zakfg[0] + zakfc);
                    }
                    zakfb = zakfh + zakfn * 2;
                    zakfc = zakfab * zakfb;
                    for (var zakfi = 0; zakfi < zakfbj; zakfi++) {
                        var zakfk = zakfas[zakfi];
                        zakfch(zakfk[0] + zakfc, zakfk[1] + zakfc, zakfk[2] + zakfc);
                    }
                } else {
                    for (var zakfl = 0; zakfl < zakfbj; zakfl++) {
                        var zakfm = zakfas[zakfl];
                        zakfch(zakfm[2], zakfm[1], zakfm[0]);
                    }
                    for (var zakfo = 0; zakfo < zakfbj; zakfo++) {
                        var zakfp = zakfas[zakfo];
                        zakfch(zakfp[0] + zakfab * zakfh, zakfp[1] + zakfab * zakfh, zakfp[2] + zakfab * zakfh);
                    }
                }
                zakfd.addGroup(zakfa, zakfe.length / 3 - zakfa, 0);
            }
            function zakfce() {
                var zakfa = zakfe.length / 3;
                var zakfb = 0;
                zakfcf(zakfy, zakfb);
                zakfb += zakfy.length;
                for (var zakfc = 0, zakff = zakfr.length; zakfc < zakff; zakfc++) {
                    var zakfg = zakfr[zakfc];
                    zakfcf(zakfg, zakfb);
                    zakfb += zakfg.length;
                }
                zakfd.addGroup(zakfa, zakfe.length / 3 - zakfa, 1);
            }
            function zakfcf(zakfa, zakfb) {
                var zakfc = zakfa.length;
                while (--zakfc >= 0) {
                    var zakfd = zakfc;
                    var zakfe = zakfc - 1;
                    if (zakfe < 0) zakfe = zakfa.length - 1;
                    for (var zakff = 0, zakfg = zakfh + zakfn * 2; zakff < zakfg; zakff++) {
                        var zakfi = zakfab * zakff;
                        var zakfj = zakfab * (zakff + 1);
                        var zakfk = zakfb + zakfd + zakfi, zakfl = zakfb + zakfe + zakfi, zakfm = zakfb + zakfe + zakfj, zakfo = zakfb + zakfd + zakfj;
                        zakfci(zakfk, zakfl, zakfm, zakfo);
                    }
                }
            }
            function zakfcg(zakfa, zakfb, zakfd) {
                zakfc.push(zakfa);
                zakfc.push(zakfb);
                zakfc.push(zakfd);
            }
            function zakfch(zakfa, zakfb, zakfc) {
                zakfcj(zakfa);
                zakfcj(zakfb);
                zakfcj(zakfc);
                var zakff = zakfe.length / 3;
                var zakfg = zakfo.generateTopUV(zakfd, zakfe, zakff - 3, zakff - 2, zakff - 1);
                zakfck(zakfg[0]);
                zakfck(zakfg[1]);
                zakfck(zakfg[2]);
            }
            function zakfci(zakfa, zakfb, zakfc, zakff) {
                zakfcj(zakfa);
                zakfcj(zakfb);
                zakfcj(zakff);
                zakfcj(zakfb);
                zakfcj(zakfc);
                zakfcj(zakff);
                var zakfg = zakfe.length / 3;
                var zakfh = zakfo.generateSideWallUV(zakfd, zakfe, zakfg - 6, zakfg - 3, zakfg - 2, zakfg - 1);
                zakfck(zakfh[0]);
                zakfck(zakfh[1]);
                zakfck(zakfh[3]);
                zakfck(zakfh[1]);
                zakfck(zakfh[2]);
                zakfck(zakfh[3]);
            }
            function zakfcj(zakfa) {
                zakfe.push(zakfc[zakfa * 3 + 0]);
                zakfe.push(zakfc[zakfa * 3 + 1]);
                zakfe.push(zakfc[zakfa * 3 + 2]);
            }
            function zakfck(zakfa) {
                zakff.push(zakfa.x);
                zakff.push(zakfa.y);
            }
            zakfcd();
            zakfce();
        }
        for (var zakfh = 0; zakfh < zakfc.length; zakfh++) zakfg(zakfc[zakfh]);
        this.setAttribute("position", new Float32Array(zakfe), 3);
        this.setAttribute("uv", new Float32Array(zakff), 2);
        this.computeVertexNormals();
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { ExtrudeGeometry };
