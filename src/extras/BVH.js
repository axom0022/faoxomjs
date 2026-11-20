import { Vector2, Vector3, faoxomvalue } from "../math/index.js";

function zagia(zagia, zagib, zagic) {
    var zagid = zagic.maxLeafTris, zagie = zagic.maxDepth, zagif = zagic.spatialSplits, zagig = 16;
    var zagih = zagib ? zagib.length / 3 : zagia.length / 9;
    var zagii = [], zagij = [], zagik = [], zagil = [], zagim = [], zagin = [];
    var zagio = 0, zagip = 0, zagiq = 0, zagir = 0;
    function zagis(zagia, zagib, zagic, zagid, zagie, zagif) {
        var zagig = zagid - zagia, zagih = zagie - zagib, zagii = zagif - zagic;
        return 2 * (zagig * zagih + zagih * zagii + zagii * zagig);
    }
    function zagit(zagia, zagib, zagic, zagid, zagie, zagif) {
        zagii.push(zagia, zagib, zagic, zagid, zagie, zagif);
        zagij.push(-1);
        zagik.push(-1);
        zagil.push(-1);
        zagim.push(0);
        return zagij.length - 1;
    }
    function zagiu(zagia, zagib) {
        zagiq++;
        var zagic = zagin.length;
        for (var zagid = 0; zagid < zagib; zagid++) zagin.push(zagia[zagid]);
        return zagic;
    }
    function zagiv(zagia, zagib, zagic) {
        var zagii = zagia.length;
        var zagiq = [ Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity ];
        for (var zagiw = 0; zagiw < zagii; zagiw++) {
            var zagix = zagiw * 6;
            if (zagiq[0] > zagib[zagix]) zagiq[0] = zagib[zagix];
            if (zagiq[1] > zagib[zagix + 1]) zagiq[1] = zagib[zagix + 1];
            if (zagiq[2] > zagib[zagix + 2]) zagiq[2] = zagib[zagix + 2];
            if (zagiq[3] < zagib[zagix + 3]) zagiq[3] = zagib[zagix + 3];
            if (zagiq[4] < zagib[zagix + 4]) zagiq[4] = zagib[zagix + 4];
            if (zagiq[5] < zagib[zagix + 5]) zagiq[5] = zagib[zagix + 5];
        }
        var zagiy = zagit(zagiq[0], zagiq[1], zagiq[2], zagiq[3], zagiq[4], zagiq[5]);
        if (zagic > zagip) zagip = zagic;
        if (zagii <= zagid || zagic >= zagie) {
            zagil[zagiy] = zagiu(zagia, zagii);
            zagim[zagiy] = zagii;
            return zagiy;
        }
        var zagiz = Infinity, zagiaa = -1, zagiab = -1;
        var zagiac = zagis(zagiq[0], zagiq[1], zagiq[2], zagiq[3], zagiq[4], zagiq[5]);
        for (var zagiad = 0; zagiad < 3; zagiad++) {
            var zagiae = zagiad, zagiaf = Infinity, zagiag = -Infinity;
            for (var zagiah = 0; zagiah < zagii; zagiah++) {
                var zagiai = (zagib[zagiah * 6 + zagiae] + zagib[zagiah * 6 + zagiae + 3]) * .5;
                if (zagiai < zagiaf) zagiaf = zagiai;
                if (zagiai > zagiag) zagiag = zagiai;
            }
            var zagiaj = zagiag - zagiaf;
            if (!(zagiaj > 0)) continue;
            var zagiak = zagig / zagiaj;
            var zagial = [], zagiam = [];
            for (var zagian = 0; zagian < zagig; zagian++) {
                zagial.push(0);
                zagiam.push(Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity);
            }
            for (var zagiao = 0; zagiao < zagii; zagiao++) {
                var zagiap = (zagib[zagiao * 6 + zagiae] + zagib[zagiao * 6 + zagiae + 3]) * .5;
                var zagiaq = Math.floor((zagiap - zagiaf) * zagiak);
                if (zagiaq < 0) zagiaq = 0;
                if (zagiaq > zagig - 1) zagiaq = zagig - 1;
                zagial[zagiaq]++;
                for (var zagiar = 0; zagiar < 6; zagiar++) {
                    var zagias = zagib[zagiao * 6 + zagiar];
                    if (zagiar < 3) {
                        if (zagias < zagiam[zagiaq * 6 + zagiar]) zagiam[zagiaq * 6 + zagiar] = zagias;
                    } else {
                        if (zagias > zagiam[zagiaq * 6 + zagiar]) zagiam[zagiaq * 6 + zagiar] = zagias;
                    }
                }
            }
            var zagiat = 0, zagiau = Infinity, zagiav = Infinity, zagiaw = Infinity, zagiax = -Infinity, zagiay = -Infinity, zagiaz = -Infinity;
            for (var zagiba = 1; zagiba < zagig; zagiba++) {
                var zagibb = (zagiba - 1) * 6;
                zagiat += zagial[zagiba - 1];
                if (zagiam[zagibb] < zagiau) zagiau = zagiam[zagibb];
                if (zagiam[zagibb + 1] < zagiav) zagiav = zagiam[zagibb + 1];
                if (zagiam[zagibb + 2] < zagiaw) zagiaw = zagiam[zagibb + 2];
                if (zagiam[zagibb + 3] > zagiax) zagiax = zagiam[zagibb + 3];
                if (zagiam[zagibb + 4] > zagiay) zagiay = zagiam[zagibb + 4];
                if (zagiam[zagibb + 5] > zagiaz) zagiaz = zagiam[zagibb + 5];
                if (zagiat === 0) continue;
                var zagibc = 0, zagibd = Infinity, zagibe = Infinity, zagibf = Infinity, zagibg = -Infinity, zagibh = -Infinity, zagibi = -Infinity;
                for (var zagibj = zagiba; zagibj < zagig; zagibj++) {
                    var zagibk = zagibj * 6;
                    zagibc += zagial[zagibj];
                    if (zagiam[zagibk] < zagibd) zagibd = zagiam[zagibk];
                    if (zagiam[zagibk + 1] < zagibe) zagibe = zagiam[zagibk + 1];
                    if (zagiam[zagibk + 2] < zagibf) zagibf = zagiam[zagibk + 2];
                    if (zagiam[zagibk + 3] > zagibg) zagibg = zagiam[zagibk + 3];
                    if (zagiam[zagibk + 4] > zagibh) zagibh = zagiam[zagibk + 4];
                    if (zagiam[zagibk + 5] > zagibi) zagibi = zagiam[zagibk + 5];
                }
                if (zagibc === 0) continue;
                var zagibl = zagis(zagiau, zagiav, zagiaw, zagiax, zagiay, zagiaz) * zagiat + zagis(zagibd, zagibe, zagibf, zagibg, zagibh, zagibi) * zagibc + 1;
                if (zagibl < zagiz) {
                    zagiz = zagibl;
                    zagiaa = zagiad;
                    zagiab = zagiba;
                }
            }
        }
        var zagibm = zagiac * zagii;
        if (zagiaa < 0 || zagiz >= zagibm) {
            zagil[zagiy] = zagiu(zagia, zagii);
            zagim[zagiy] = zagii;
            return zagiy;
        }
        var zagibn = zagiaa, zagibo = Infinity, zagibp = -Infinity;
        for (var zagibq = 0; zagibq < zagii; zagibq++) {
            var zagibr = (zagib[zagibq * 6 + zagibn] + zagib[zagibq * 6 + zagibn + 3]) * .5;
            if (zagibr < zagibo) zagibo = zagibr;
            if (zagibr > zagibp) zagibp = zagibr;
        }
        var zagibs = zagibo + (zagibp - zagibo) * zagiab / zagig;
        var zagibt = [], zagibu = [], zagibv = [], zagibw = [];
        for (var zagibx = 0; zagibx < zagii; zagibx++) {
            var zagiby = (zagib[zagibx * 6 + zagibn] + zagib[zagibx * 6 + zagibn + 3]) * .5;
            if (zagiby < zagibs) {
                zagibt.push(zagia[zagibx]);
                for (var zagibz = 0; zagibz < 6; zagibz++) zagibu.push(zagib[zagibx * 6 + zagibz]);
            } else {
                zagibv.push(zagia[zagibx]);
                for (var zagica = 0; zagica < 6; zagica++) zagibw.push(zagib[zagibx * 6 + zagica]);
            }
        }
        var zagicb = [ Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity ], zagicc = [ Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity ];
        for (var zagicd = 0; zagicd < zagibu.length; zagicd += 6) {
            if (zagicb[0] > zagibu[zagicd]) zagicb[0] = zagibu[zagicd];
            if (zagicb[1] > zagibu[zagicd + 1]) zagicb[1] = zagibu[zagicd + 1];
            if (zagicb[2] > zagibu[zagicd + 2]) zagicb[2] = zagibu[zagicd + 2];
            if (zagicb[3] < zagibu[zagicd + 3]) zagicb[3] = zagibu[zagicd + 3];
            if (zagicb[4] < zagibu[zagicd + 4]) zagicb[4] = zagibu[zagicd + 4];
            if (zagicb[5] < zagibu[zagicd + 5]) zagicb[5] = zagibu[zagicd + 5];
        }
        for (var zagice = 0; zagice < zagibw.length; zagice += 6) {
            if (zagicc[0] > zagibw[zagice]) zagicc[0] = zagibw[zagice];
            if (zagicc[1] > zagibw[zagice + 1]) zagicc[1] = zagibw[zagice + 1];
            if (zagicc[2] > zagibw[zagice + 2]) zagicc[2] = zagibw[zagice + 2];
            if (zagicc[3] < zagibw[zagice + 3]) zagicc[3] = zagibw[zagice + 3];
            if (zagicc[4] < zagibw[zagice + 4]) zagicc[4] = zagibw[zagice + 4];
            if (zagicc[5] < zagibw[zagice + 5]) zagicc[5] = zagibw[zagice + 5];
        }
        var zagicf = false;
        if (zagif && zagic + 1 < zagie && zagibt.length > 0 && zagibv.length > 0) {
            var zagicg = zagicb[0] > zagicc[0] ? zagicb[0] : zagicc[0], zagich = zagicb[1] > zagicc[1] ? zagicb[1] : zagicc[1], zagici = zagicb[2] > zagicc[2] ? zagicb[2] : zagicc[2];
            var zagicj = zagicb[3] < zagicc[3] ? zagicb[3] : zagicc[3], zagick = zagicb[4] < zagicc[4] ? zagicb[4] : zagicc[4], zagicl = zagicb[5] < zagicc[5] ? zagicb[5] : zagicc[5];
            if (zagicg < zagicj && zagich < zagick && zagici < zagicl && zagis(zagicg, zagich, zagici, zagicj, zagick, zagicl) > .1 * zagiac && zagin.length + zagii * 2 <= zagih * 2 + 16) zagicf = true;
        }
        if (zagicf) {
            zagibt = [];
            zagibu = [];
            zagibv = [];
            zagibw = [];
            for (var zagicm = 0; zagicm < zagii; zagicm++) {
                var zagicn = zagia[zagicm], zagico = zagicm * 6;
                var zagicp = zagib[zagico + zagibn] < zagibs, zagicq = zagib[zagico + zagibn + 3] > zagibs;
                if (zagicp) {
                    zagibt.push(zagicn);
                    for (var zagicr = 0; zagicr < 6; zagicr++) {
                        var zagics = zagib[zagico + zagicr];
                        if (zagicr === zagibn + 3 && zagics > zagibs) zagics = zagibs;
                        zagibu.push(zagics);
                    }
                }
                if (zagicq) {
                    zagibv.push(zagicn);
                    for (var zagict = 0; zagict < 6; zagict++) {
                        var zagicu = zagib[zagico + zagict];
                        if (zagict === zagibn && zagicu < zagibs) zagicu = zagibs;
                        zagibw.push(zagicu);
                    }
                }
                if (zagicp && zagicq) zagio++;
            }
        }
        if (zagibt.length === 0 || zagibv.length === 0) {
            zagibt = [];
            zagibu = [];
            zagibv = [];
            zagibw = [];
            var zagicv = Math.floor(zagii / 2);
            for (var zagicw = 0; zagicw < zagii; zagicw++) {
                if (zagicw < zagicv) {
                    zagibt.push(zagia[zagicw]);
                    for (var zagicx = 0; zagicx < 6; zagicx++) zagibu.push(zagib[zagicw * 6 + zagicx]);
                } else {
                    zagibv.push(zagia[zagicw]);
                    for (var zagicy = 0; zagicy < 6; zagicy++) zagibw.push(zagib[zagicw * 6 + zagicy]);
                }
            }
            zagir++;
        }
        zagij[zagiy] = zagiv(zagibt, zagibu, zagic + 1);
        zagik[zagiy] = zagiv(zagibv, zagibw, zagic + 1);
        return zagiy;
    }
    var zagiw = [], zagix = [];
    for (var zagiy = 0; zagiy < zagih; zagiy++) {
        var zagiz = zagib ? zagib[zagiy * 3] : zagiy * 3, zagiaa = zagib ? zagib[zagiy * 3 + 1] : zagiy * 3 + 1, zagiab = zagib ? zagib[zagiy * 3 + 2] : zagiy * 3 + 2;
        var zagiac = zagia[zagiz * 3], zagiad = zagia[zagiz * 3 + 1], zagiae = zagia[zagiz * 3 + 2];
        var zagiaf = zagia[zagiaa * 3], zagiag = zagia[zagiaa * 3 + 1], zagiah = zagia[zagiaa * 3 + 2];
        var zagiai = zagia[zagiab * 3], zagiaj = zagia[zagiab * 3 + 1], zagiak = zagia[zagiab * 3 + 2];
        var zagial = zagiac < zagiaf ? zagiac < zagiai ? zagiac : zagiai : zagiaf < zagiai ? zagiaf : zagiai, zagiam = zagiad < zagiag ? zagiad < zagiaj ? zagiad : zagiaj : zagiag < zagiaj ? zagiag : zagiaj, zagian = zagiae < zagiah ? zagiae < zagiak ? zagiae : zagiak : zagiah < zagiak ? zagiah : zagiak;
        var zagiao = zagiac > zagiaf ? zagiac > zagiai ? zagiac : zagiai : zagiaf > zagiai ? zagiaf : zagiai, zagiap = zagiad > zagiag ? zagiad > zagiaj ? zagiad : zagiaj : zagiag > zagiaj ? zagiag : zagiaj, zagiaq = zagiae > zagiah ? zagiae > zagiak ? zagiae : zagiak : zagiah > zagiak ? zagiah : zagiak;
        zagiw.push(zagiy);
        zagix.push(zagial, zagiam, zagian, zagiao, zagiap, zagiaq);
    }
    zagiv(zagiw, zagix, 0);
    var zagiar = zagij.length;
    var zagias = new Float32Array(zagiar * 6), zagiat = new Int32Array(zagiar), zagiau = new Int32Array(zagiar), zagiav = new Int32Array(zagiar), zagiaw = new Int32Array(zagiar), zagiax = new Uint32Array(zagin.length);
    for (var zagiay = 0; zagiay < zagiar * 6; zagiay++) zagias[zagiay] = zagii[zagiay];
    for (var zagiaz = 0; zagiaz < zagiar; zagiaz++) {
        zagiat[zagiaz] = zagij[zagiaz];
        zagiau[zagiaz] = zagik[zagiaz];
        zagiav[zagiaz] = zagil[zagiaz];
        zagiaw[zagiaz] = zagim[zagiaz];
    }
    for (var zagiba = 0; zagiba < zagin.length; zagiba++) zagiax[zagiba] = zagin[zagiba];
    return {
        nodeBounds: zagias,
        nodeLeft: zagiat,
        nodeRight: zagiau,
        nodeStart: zagiav,
        nodeCount: zagiaw,
        triRefs: zagiax,
        triangles: zagih,
        spatialSplits: zagio,
        maxDepth: zagip,
        leaves: zagiq,
        nodes: zagiar,
        splitFallbacks: zagir
    };
}

function zagib(zagia, zagib, zagic, zagid, zagie, zagif, zagig, zagih, zagii, zagij, zagik, zagil) {
    var zagim = zagig - zagid, zagin = zagih - zagie, zagio = zagii - zagif, zagip = zagij - zagid, zagiq = zagik - zagie, zagir = zagil - zagif;
    var zagis = zagia - zagid, zagit = zagib - zagie, zagiu = zagic - zagif;
    var zagiv = zagim * zagim + zagin * zagin + zagio * zagio, zagiw = zagim * zagip + zagin * zagiq + zagio * zagir, zagix = zagip * zagip + zagiq * zagiq + zagir * zagir;
    var zagiy = zagim * zagis + zagin * zagit + zagio * zagiu, zagiz = zagip * zagis + zagiq * zagit + zagir * zagiu;
    var zagiaa = zagiv * zagix - zagiw * zagiw;
    if (Math.abs(zagiaa) < 1e-18) return false;
    var zagiab = (zagix * zagiy - zagiw * zagiz) / zagiaa, zagiac = (zagiv * zagiz - zagiw * zagiy) / zagiaa;
    return zagiab >= -1e-9 && zagiac >= -1e-9 && zagiab + zagiac <= 1 + 1e-9;
}

function zagic(zagia, zagib, zagic, zagid, zagie, zagif) {
    var zagig = zagia - zagid, zagih = zagib - zagie, zagii = zagic - zagif;
    return [ zagid, zagie, zagif, Math.sqrt(zagig * zagig + zagih * zagih + zagii * zagii) ];
}

function zagid(zagia, zagib, zagic, zagid, zagie, zagif, zagig, zagih, zagii) {
    var zagij = zagia[0] + (zagib[0] - zagia[0]) * zagic, zagik = zagia[1] + (zagib[1] - zagia[1]) * zagic, zagil = zagia[2] + (zagib[2] - zagia[2]) * zagic;
    var zagim = Math.max(zagid - zagij, 0, zagij - zagig), zagin = Math.max(zagie - zagik, 0, zagik - zagih), zagio = Math.max(zagif - zagil, 0, zagil - zagii);
    return Math.sqrt(zagim * zagim + zagin * zagin + zagio * zagio);
}

function zagie(zagia, zagib, zagic, zagid) {
    var zagie = zagib[0] - zagia[0], zagif = zagib[1] - zagia[1], zagig = zagib[2] - zagia[2];
    var zagih = zagid[0] - zagic[0], zagii = zagid[1] - zagic[1], zagij = zagid[2] - zagic[2];
    var zagik = zagia[0] - zagic[0], zagil = zagia[1] - zagic[1], zagim = zagia[2] - zagic[2];
    var zagin = zagie * zagie + zagif * zagif + zagig * zagig, zagio = zagih * zagih + zagii * zagii + zagij * zagij;
    var zagip = zagih * zagik + zagii * zagil + zagij * zagim;
    var zagiq = 0, zagir = 0;
    if (zagin <= 1e-18 && zagio <= 1e-18) {} else if (zagin <= 1e-18) zagir = Math.max(0, Math.min(1, zagip / zagio)); else {
        var zagis = zagie * zagik + zagif * zagil + zagig * zagim;
        if (zagio <= 1e-18) zagiq = Math.max(0, Math.min(1, -zagis / zagin)); else {
            var zagit = zagie * zagih + zagif * zagii + zagig * zagij;
            var zagiu = zagin * zagio - zagit * zagit;
            zagiq = zagiu > 1e-18 ? Math.max(0, Math.min(1, (zagit * zagip - zagis * zagio) / zagiu)) : 0;
            zagir = (zagit * zagiq + zagip) / zagio;
            if (zagir < 0) {
                zagir = 0;
                zagiq = Math.max(0, Math.min(1, -zagis / zagin));
            } else if (zagir > 1) {
                zagir = 1;
                zagiq = Math.max(0, Math.min(1, (zagit - zagis) / zagin));
            }
        }
    }
    var zagiv = zagia[0] + zagie * zagiq, zagiw = zagia[1] + zagif * zagiq, zagix = zagia[2] + zagig * zagiq;
    var zagiy = zagic[0] + zagih * zagir, zagiz = zagic[1] + zagii * zagir, zagiaa = zagic[2] + zagij * zagir;
    var zagiab = zagiv - zagiy, zagiac = zagiw - zagiz, zagiad = zagix - zagiaa;
    return [ zagiv, zagiw, zagix, zagiy, zagiz, zagiaa, Math.sqrt(zagiab * zagiab + zagiac * zagiac + zagiad * zagiad) ];
}

function zagif(zagia, zagib, zagic) {
    var zagid = zagib[0] - zagia[0], zagie = zagib[1] - zagia[1], zagif = zagib[2] - zagia[2];
    var zagig = zagid * zagid + zagie * zagie + zagif * zagif;
    if (zagig < 1e-18) return [ zagia[0], zagia[1], zagia[2] ];
    var zagih = ((zagic[0] - zagia[0]) * zagid + (zagic[1] - zagia[1]) * zagie + (zagic[2] - zagia[2]) * zagif) / zagig;
    zagih = Math.max(0, Math.min(1, zagih));
    return [ zagia[0] + zagid * zagih, zagia[1] + zagie * zagih, zagia[2] + zagif * zagih ];
}

class BVH {
    constructor(zagib, zagic, zagid) {
        this.type = "BVH";
        this.isBVH = true;
        var zagie = BVH._prepare(zagib, zagic);
        this.maxLeafTris = zagie.maxLeafTris;
        this.maxDepth = zagie.maxDepth;
        this.spatialSplits = zagie.spatialSplits;
        this.positions = zagie.positions;
        this.indices = zagie.indices;
        this.uv = zagie.uv;
        this.triangleCount = zagie.triangleCount;
        this.lastQueryTriangleTests = 0;
        var zagif = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        if (zagid) {
            if (!zagid.nodeBounds || !zagid.nodeLeft || !zagid.nodeRight || !zagid.nodeStart || !zagid.nodeCount || !zagid.triRefs) throw new Error("BVH prebuilt payload is missing arrays");
            if (zagid.nodeLeft.length !== zagid.nodeRight.length || zagid.nodeLeft.length !== zagid.nodeBounds.length / 6) throw new Error("BVH prebuilt payload array sizes disagree");
            this.nodeBounds = zagid.nodeBounds;
            this.nodeLeft = zagid.nodeLeft;
            this.nodeRight = zagid.nodeRight;
            this.nodeStart = zagid.nodeStart;
            this.nodeCountArr = zagid.nodeCount;
            this.triRefs = zagid.triRefs;
            this.statsSpatialSplits = zagid.spatialSplits || 0;
            this.statsMaxDepth = zagid.maxDepth || 0;
            this.statsLeaves = zagid.leaves || 0;
            this.statsNodes = zagid.nodes || zagid.nodeLeft.length;
            this.statsFallbacks = zagid.splitFallbacks || 0;
        } else {
            var zagig = zagia(this.positions, this.indices, {
                maxLeafTris: zagie.maxLeafTris,
                maxDepth: zagie.maxDepth,
                spatialSplits: zagie.spatialSplits
            });
            this.nodeBounds = zagig.nodeBounds;
            this.nodeLeft = zagig.nodeLeft;
            this.nodeRight = zagig.nodeRight;
            this.nodeStart = zagig.nodeStart;
            this.nodeCountArr = zagig.nodeCount;
            this.triRefs = zagig.triRefs;
            this.statsSpatialSplits = zagig.spatialSplits;
            this.statsMaxDepth = zagig.maxDepth;
            this.statsLeaves = zagig.leaves;
            this.statsNodes = zagig.nodes;
            this.statsFallbacks = zagig.splitFallbacks;
        }
        this.buildMs = (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - zagif;
        this.bounds = {
            min: new Vector3(this.nodeBounds[0], this.nodeBounds[1], this.nodeBounds[2]),
            max: new Vector3(this.nodeBounds[3], this.nodeBounds[4], this.nodeBounds[5])
        };
        this.disposed = false;
    }
    static _prepare(zagia, zagib) {
        zagib = zagib || {};
        var zagic = faoxomvalue(zagib.maxLeafTris, 8);
        if (typeof zagic !== "number" || !isFinite(zagic) || Math.floor(zagic) !== zagic || zagic < 1) throw new Error("BVH maxLeafTris must be an integer of at least 1");
        var zagid = faoxomvalue(zagib.maxDepth, 32);
        if (typeof zagid !== "number" || !isFinite(zagid) || Math.floor(zagid) !== zagid || zagid < 1) throw new Error("BVH maxDepth must be an integer of at least 1");
        var zagie = faoxomvalue(zagib.spatialSplits, true);
        if (typeof zagie !== "boolean") throw new Error("BVH spatialSplits must be a boolean");
        if (zagib.worker !== undefined && typeof zagib.worker !== "boolean") throw new Error("BVH worker must be a boolean");
        var zagif = null, zagig = null, zagih = null;
        if (zagia && zagia.attributes && zagia.attributes.position) {
            if (!zagia.attributes.position.array || !zagia.attributes.position.array.length) throw new Error("BVH requires a non-empty position attribute");
            zagif = zagia.attributes.position.array;
            zagig = zagia.index || null;
            if (zagia.attributes.uv && zagia.attributes.uv.array) zagih = {
                array: zagia.attributes.uv.array,
                itemSize: zagia.attributes.uv.itemSize || 2
            };
        } else if (zagia && (zagia.positions || zagia.vertices)) {
            zagif = zagia.positions || zagia.vertices;
            zagig = zagia.indices || zagia.index || null;
            if (zagia.uv && zagia.uv.array) zagih = {
                array: zagia.uv.array,
                itemSize: zagia.uv.itemSize || 2
            };
        } else throw new Error("BVH requires a geometry or a {positions, indices} data object");
        if (!zagif || !zagif.length) throw new Error("BVH requires a non-empty positions array");
        if (zagif.length % 3 !== 0) throw new Error("BVH positions length must be a multiple of 3");
        for (var zagii = 0; zagii < zagif.length; zagii++) if (typeof zagif[zagii] !== "number" || !isFinite(zagif[zagii])) throw new Error("BVH positions must contain finite numbers");
        var zagij = zagig ? zagig.length / 3 : zagif.length / 9;
        if (!zagij || Math.floor(zagij) !== zagij) throw new Error("BVH requires at least one triangle");
        var zagik = null;
        if (zagig) {
            if (zagig.length % 3 !== 0) throw new Error("BVH index length must be a multiple of 3");
            for (var zagil = 0; zagil < zagig.length; zagil++) {
                var zagim = zagig[zagil];
                if (typeof zagim !== "number" || Math.floor(zagim) !== zagim || zagim < 0 || zagim * 3 + 2 >= zagif.length) throw new Error("BVH index out of range");
            }
            zagik = zagig instanceof Uint32Array ? zagig : new Uint32Array(zagig);
        }
        return {
            positions: zagif,
            indices: zagik,
            uv: zagih,
            triangleCount: zagij,
            maxLeafTris: zagic,
            maxDepth: zagid,
            spatialSplits: zagie
        };
    }
    stats() {
        return {
            nodes: this.statsNodes,
            leaves: this.statsLeaves,
            maxDepth: this.statsMaxDepth,
            refs: this.triRefs.length,
            triangles: this.triangleCount,
            spatialSplits: this.statsSpatialSplits,
            splitFallbacks: this.statsFallbacks,
            buildMs: this.buildMs
        };
    }
    triangleIndices(zagia) {
        if (typeof zagia !== "number" || Math.floor(zagia) !== zagia || zagia < 0 || zagia >= this.triangleCount) throw new Error("BVH triangle index out of range");
        return this.indices ? [ this.indices[zagia * 3], this.indices[zagia * 3 + 1], this.indices[zagia * 3 + 2] ] : [ zagia * 3, zagia * 3 + 1, zagia * 3 + 2 ];
    }
    _vertex(zagia, zagib) {
        zagib.x = this.positions[zagia * 3];
        zagib.y = this.positions[zagia * 3 + 1];
        zagib.z = this.positions[zagia * 3 + 2];
        return zagib;
    }
    _triangle(zagia, zagib, zagic, zagid) {
        var zagie = this.indices ? this.indices[zagia * 3] : zagia * 3, zagif = this.indices ? this.indices[zagia * 3 + 1] : zagia * 3 + 1, zagig = this.indices ? this.indices[zagia * 3 + 2] : zagia * 3 + 2;
        this._vertex(zagie, zagib);
        this._vertex(zagif, zagic);
        this._vertex(zagig, zagid);
        return [ zagie, zagif, zagig ];
    }
    _slab(zagia, zagib, zagic, zagid, zagie, zagif, zagig) {
        var zagih = this.nodeBounds[zagia * 6], zagii = this.nodeBounds[zagia * 6 + 1], zagij = this.nodeBounds[zagia * 6 + 2], zagik = this.nodeBounds[zagia * 6 + 3], zagil = this.nodeBounds[zagia * 6 + 4], zagim = this.nodeBounds[zagia * 6 + 5];
        var zagin = -Infinity, zagio = Infinity;
        if (zagie > 0) {
            var zagip = (zagih - zagib) / zagie, zagiq = (zagik - zagib) / zagie;
            if (zagip > zagin) zagin = zagip;
            if (zagiq < zagio) zagio = zagiq;
        } else if (zagie < 0) {
            var zagir = (zagik - zagib) / zagie, zagis = (zagih - zagib) / zagie;
            if (zagir > zagin) zagin = zagir;
            if (zagis < zagio) zagio = zagis;
        } else if (zagib < zagih || zagib > zagik) return null;
        if (zagif > 0) {
            var zagit = (zagii - zagic) / zagif, zagiu = (zagil - zagic) / zagif;
            if (zagit > zagin) zagin = zagit;
            if (zagiu < zagio) zagio = zagiu;
        } else if (zagif < 0) {
            var zagiv = (zagil - zagic) / zagif, zagiw = (zagii - zagic) / zagif;
            if (zagiv > zagin) zagin = zagiv;
            if (zagiw < zagio) zagio = zagiw;
        } else if (zagic < zagii || zagic > zagil) return null;
        if (zagig > 0) {
            var zagix = (zagij - zagid) / zagig, zagiy = (zagim - zagid) / zagig;
            if (zagix > zagin) zagin = zagix;
            if (zagiy < zagio) zagio = zagiy;
        } else if (zagig < 0) {
            var zagiz = (zagim - zagid) / zagig, zagiaa = (zagij - zagid) / zagig;
            if (zagiz > zagin) zagin = zagiz;
            if (zagiaa < zagio) zagio = zagiaa;
        } else if (zagid < zagij || zagid > zagim) return null;
        if (zagin > zagio || zagio < 0) return null;
        return zagin < 0 ? 0 : zagin;
    }
    _intersectTriangle(zagia, zagib, zagic, zagid, zagie, zagif, zagig, zagih, zagii, zagij, zagik, zagil, zagim, zagin, zagio, zagip) {
        var zagiq = zagij - zagig, zagir = zagik - zagih, zagis = zagil - zagii, zagit = zagim - zagig, zagiu = zagin - zagih, zagiv = zagio - zagii;
        var zagiw = zagie * zagiv - zagif * zagiu, zagix = zagif * zagit - zagid * zagiv, zagiy = zagid * zagiu - zagie * zagit;
        var zagiz = zagiq * zagiw + zagir * zagix + zagis * zagiy;
        var zagiaa = 1e-10;
        if (zagip ? zagiz <= zagiaa : zagiz <= zagiaa && zagiz >= -zagiaa) return null;
        var zagiab = 1 / zagiz;
        var zagiac = zagia - zagig, zagiad = zagib - zagih, zagiae = zagic - zagii;
        var zagiaf = (zagiac * zagiw + zagiad * zagix + zagiae * zagiy) * zagiab;
        if (zagiaf < 0 || zagiaf > 1) return null;
        var zagiag = zagiad * zagis - zagiae * zagir, zagiah = zagiae * zagiq - zagiac * zagis, zagiai = zagiac * zagir - zagiad * zagiq;
        var zagiaj = (zagid * zagiag + zagie * zagiah + zagif * zagiai) * zagiab;
        if (zagiaj < 0 || zagiaf + zagiaj > 1) return null;
        var zagiak = (zagit * zagiag + zagiu * zagiah + zagiv * zagiai) * zagiab;
        if (zagiak < 0 || !isFinite(zagiak)) return null;
        return [ zagiak, zagiaf, zagiaj ];
    }
    _makeHit(zagia, zagib, zagic, zagid, zagie, zagif, zagig, zagih, zagii, zagij, zagik, zagil, zagim, zagin, zagio, zagip, zagiq, zagir, zagis, zagit, zagiu, zagiv) {
        var zagiw = (zagil - zagii) * (zagip - zagij) - (zagim - zagij) * (zagio - zagii), zagix = (zagim - zagij) * (zagin - zagih) - (zagik - zagih) * (zagip - zagij), zagiy = (zagik - zagih) * (zagio - zagii) - (zagil - zagii) * (zagin - zagih);
        var zagiz = Math.sqrt(zagiw * zagiw + zagix * zagix + zagiy * zagiy) || 1;
        zagiw /= zagiz;
        zagix /= zagiz;
        zagiy /= zagiz;
        var zagiaa = {
            distance: zagia,
            point: new Vector3(zagiq + zagia * zagit, zagir + zagia * zagiu, zagis + zagia * zagiv),
            faceIndex: zagid,
            indices: [ zagie, zagif, zagig ],
            normal: new Vector3(zagiw, zagix, zagiy)
        };
        if (this.uv) {
            var zagiab = 1 - zagib - zagic, zagiac = this.uv.array, zagiad = this.uv.itemSize;
            zagiaa.uv = new Vector2(zagiac[zagie * zagiad] * zagiab + zagiac[zagif * zagiad] * zagib + zagiac[zagig * zagiad] * zagic, zagiac[zagie * zagiad + 1] * zagiab + zagiac[zagif * zagiad + 1] * zagib + zagiac[zagig * zagiad + 1] * zagic);
        } else zagiaa.uv = null;
        return zagiaa;
    }
    _normalizeDirection(zagia) {
        if (!zagia) throw new Error("BVH query requires a direction vector");
        var zagib = zagia.x !== undefined ? zagia.x : zagia[0], zagic = zagia.y !== undefined ? zagia.y : zagia[1], zagid = zagia.z !== undefined ? zagia.z : zagia[2];
        var zagie = Math.sqrt(zagib * zagib + zagic * zagic + zagid * zagid);
        if (!zagie || !isFinite(zagie)) throw new Error("BVH query direction must be a non-zero finite vector");
        return [ zagib / zagie, zagic / zagie, zagid / zagie ];
    }
    _validatePoint(zagia, zagib) {
        var zagic = zagia.x !== undefined ? zagia.x : zagia[0], zagid = zagia.y !== undefined ? zagia.y : zagia[1], zagie = zagia.z !== undefined ? zagia.z : zagia[2];
        if (typeof zagic !== "number" || !isFinite(zagic) || typeof zagid !== "number" || !isFinite(zagid) || typeof zagie !== "number" || !isFinite(zagie)) throw new Error("BVH " + zagib + " must be a finite vector");
        return [ zagic, zagid, zagie ];
    }
    raycastFirst(zagia, zagib, zagic) {
        if (this.disposed) throw new Error("BVH is disposed");
        var zagid = this._validatePoint(zagia, "origin"), zagie = this._normalizeDirection(zagib);
        var zagif = zagid[0], zagig = zagid[1], zagih = zagid[2], zagii = zagie[0], zagij = zagie[1], zagik = zagie[2];
        zagic = zagic || {};
        var zagil = faoxomvalue(zagic.near, 0), zagim = faoxomvalue(zagic.far, Infinity);
        var zagin = faoxomvalue(zagic.backfaceCulling, false);
        this.lastQueryTriangleTests = 0;
        var zagio = zagim, zagip = null;
        var zagiq = [ 0 ];
        var zagir = new Vector3, zagis = new Vector3, zagit = new Vector3;
        while (zagiq.length) {
            var zagiu = zagiq.pop();
            var zagiv = this._slab(zagiu, zagif, zagig, zagih, zagii, zagij, zagik);
            if (zagiv === null || zagiv > zagio) continue;
            var zagiw = this.nodeCountArr[zagiu];
            if (zagiw > 0) {
                var zagix = this.nodeStart[zagiu];
                for (var zagiy = 0; zagiy < zagiw; zagiy++) {
                    var zagiz = this.triRefs[zagix + zagiy];
                    this.lastQueryTriangleTests++;
                    var zagiaa = this._triangle(zagiz, zagir, zagis, zagit);
                    var zagiab = this._intersectTriangle(zagif, zagig, zagih, zagii, zagij, zagik, zagir.x, zagir.y, zagir.z, zagis.x, zagis.y, zagis.z, zagit.x, zagit.y, zagit.z, zagin);
                    if (!zagiab || zagiab[0] < zagil || zagiab[0] > zagio) continue;
                    zagio = zagiab[0];
                    zagip = this._makeHit(zagiab[0], zagiab[1], zagiab[2], zagiz, zagiaa[0], zagiaa[1], zagiaa[2], zagir.x, zagir.y, zagir.z, zagis.x, zagis.y, zagis.z, zagit.x, zagit.y, zagit.z, zagif, zagig, zagih, zagii, zagij, zagik);
                }
            } else {
                var zagiac = this.nodeLeft[zagiu], zagiad = this.nodeRight[zagiu];
                var zagiae = this._slab(zagiac, zagif, zagig, zagih, zagii, zagij, zagik), zagiaf = this._slab(zagiad, zagif, zagig, zagih, zagii, zagij, zagik);
                if (zagiae !== null && zagiaf !== null) {
                    if (zagiae <= zagiaf) {
                        zagiq.push(zagiad);
                        zagiq.push(zagiac);
                    } else {
                        zagiq.push(zagiac);
                        zagiq.push(zagiad);
                    }
                } else if (zagiae !== null) zagiq.push(zagiac); else if (zagiaf !== null) zagiq.push(zagiad);
            }
        }
        return zagip;
    }
    raycastAny(zagia, zagib, zagic) {
        if (this.disposed) throw new Error("BVH is disposed");
        var zagid = this._validatePoint(zagia, "origin"), zagie = this._normalizeDirection(zagib);
        var zagif = zagid[0], zagig = zagid[1], zagih = zagid[2], zagii = zagie[0], zagij = zagie[1], zagik = zagie[2];
        zagic = zagic || {};
        var zagil = faoxomvalue(zagic.near, 0), zagim = faoxomvalue(zagic.far, Infinity);
        var zagin = faoxomvalue(zagic.backfaceCulling, false);
        this.lastQueryTriangleTests = 0;
        var zagio = [ 0 ];
        var zagip = new Vector3, zagiq = new Vector3, zagir = new Vector3;
        while (zagio.length) {
            var zagis = zagio.pop();
            var zagit = this._slab(zagis, zagif, zagig, zagih, zagii, zagij, zagik);
            if (zagit === null || zagit > zagim) continue;
            var zagiu = this.nodeCountArr[zagis];
            if (zagiu > 0) {
                var zagiv = this.nodeStart[zagis];
                for (var zagiw = 0; zagiw < zagiu; zagiw++) {
                    var zagix = this.triRefs[zagiv + zagiw];
                    this.lastQueryTriangleTests++;
                    var zagiy = this._triangle(zagix, zagip, zagiq, zagir);
                    var zagiz = this._intersectTriangle(zagif, zagig, zagih, zagii, zagij, zagik, zagip.x, zagip.y, zagip.z, zagiq.x, zagiq.y, zagiq.z, zagir.x, zagir.y, zagir.z, zagin);
                    if (zagiz && zagiz[0] >= zagil && zagiz[0] <= zagim) return this._makeHit(zagiz[0], zagiz[1], zagiz[2], zagix, zagiy[0], zagiy[1], zagiy[2], zagip.x, zagip.y, zagip.z, zagiq.x, zagiq.y, zagiq.z, zagir.x, zagir.y, zagir.z, zagif, zagig, zagih, zagii, zagij, zagik);
                }
            } else {
                zagio.push(this.nodeRight[zagis]);
                zagio.push(this.nodeLeft[zagis]);
            }
        }
        return null;
    }
    raycastAll(zagia, zagib, zagic) {
        if (this.disposed) throw new Error("BVH is disposed");
        var zagid = this._validatePoint(zagia, "origin"), zagie = this._normalizeDirection(zagib);
        var zagif = zagid[0], zagig = zagid[1], zagih = zagid[2], zagii = zagie[0], zagij = zagie[1], zagik = zagie[2];
        zagic = zagic || {};
        var zagil = faoxomvalue(zagic.near, 0), zagim = faoxomvalue(zagic.far, Infinity);
        var zagin = faoxomvalue(zagic.backfaceCulling, false);
        this.lastQueryTriangleTests = 0;
        var zagio = [];
        var zagip = this._stamp();
        var zagiq = [ 0 ];
        var zagir = new Vector3, zagis = new Vector3, zagit = new Vector3;
        while (zagiq.length) {
            var zagiu = zagiq.pop();
            var zagiv = this._slab(zagiu, zagif, zagig, zagih, zagii, zagij, zagik);
            if (zagiv === null || zagiv > zagim) continue;
            var zagiw = this.nodeCountArr[zagiu];
            if (zagiw > 0) {
                var zagix = this.nodeStart[zagiu];
                for (var zagiy = 0; zagiy < zagiw; zagiy++) {
                    var zagiz = this.triRefs[zagix + zagiy];
                    if (zagip[zagiz] === this._stampId) continue;
                    zagip[zagiz] = this._stampId;
                    this.lastQueryTriangleTests++;
                    var zagiaa = this._triangle(zagiz, zagir, zagis, zagit);
                    var zagiab = this._intersectTriangle(zagif, zagig, zagih, zagii, zagij, zagik, zagir.x, zagir.y, zagir.z, zagis.x, zagis.y, zagis.z, zagit.x, zagit.y, zagit.z, zagin);
                    if (zagiab && zagiab[0] >= zagil && zagiab[0] <= zagim) zagio.push(this._makeHit(zagiab[0], zagiab[1], zagiab[2], zagiz, zagiaa[0], zagiaa[1], zagiaa[2], zagir.x, zagir.y, zagir.z, zagis.x, zagis.y, zagis.z, zagit.x, zagit.y, zagit.z, zagif, zagig, zagih, zagii, zagij, zagik));
                }
            } else {
                zagiq.push(this.nodeRight[zagiu]);
                zagiq.push(this.nodeLeft[zagiu]);
            }
        }
        zagio.sort(function(zagia, zagib) {
            return zagia.distance - zagib.distance;
        });
        return zagio;
    }
    _stamp() {
        if (!this._stampArray || this._stampArray.length < this.triangleCount) this._stampArray = new Uint32Array(this.triangleCount);
        this._stampId = (this._stampId || 0) + 1;
        return this._stampArray;
    }
    sphereCast(zagia, zagib, zagic, zagid) {
        if (this.disposed) throw new Error("BVH is disposed");
        if (typeof zagib !== "number" || !isFinite(zagib) || zagib < 0) throw new Error("BVH sphereCast radius must be a non-negative finite number");
        if (typeof zagid !== "number" || !isFinite(zagid) || zagid < 0) throw new Error("BVH sphereCast maxDistance must be a non-negative finite number");
        var zagie = this._validatePoint(zagia, "origin"), zagif = this._normalizeDirection(zagic);
        var zagig = zagie[0], zagih = zagie[1], zagii = zagie[2], zagij = zagif[0], zagik = zagif[1], zagil = zagif[2];
        this.lastQueryTriangleTests = 0;
        var zagim = null, zagin = zagid;
        var zagio = [ 0 ];
        var zagip = new Vector3, zagiq = new Vector3, zagir = new Vector3;
        while (zagio.length) {
            var zagis = zagio.pop();
            var zagit = this._slabInflated(zagis, zagig, zagih, zagii, zagij, zagik, zagil, zagib);
            if (zagit === null || zagit > zagin) continue;
            var zagiu = this.nodeCountArr[zagis];
            if (zagiu > 0) {
                var zagiv = this.nodeStart[zagis];
                for (var zagiw = 0; zagiw < zagiu; zagiw++) {
                    var zagix = this.triRefs[zagiv + zagiw];
                    this.lastQueryTriangleTests++;
                    var zagiy = this._sphereCastTriangle(zagig, zagih, zagii, zagij, zagik, zagil, zagin, zagib, zagix, zagip, zagiq, zagir);
                    if (zagiy && zagiy[0] < zagin) {
                        zagin = zagiy[0];
                        zagim = zagiy;
                    }
                }
            } else {
                zagio.push(this.nodeRight[zagis]);
                zagio.push(this.nodeLeft[zagis]);
            }
        }
        if (!zagim) return null;
        return {
            time: zagim[0],
            point: new Vector3(zagim[1], zagim[2], zagim[3]),
            normal: new Vector3(zagim[4], zagim[5], zagim[6])
        };
    }
    _slabInflated(zagia, zagib, zagic, zagid, zagie, zagif, zagig, zagih) {
        var zagii = this.nodeBounds[zagia * 6] - zagih, zagij = this.nodeBounds[zagia * 6 + 1] - zagih, zagik = this.nodeBounds[zagia * 6 + 2] - zagih, zagil = this.nodeBounds[zagia * 6 + 3] + zagih, zagim = this.nodeBounds[zagia * 6 + 4] + zagih, zagin = this.nodeBounds[zagia * 6 + 5] + zagih;
        var zagio = -Infinity, zagip = Infinity;
        if (zagie > 0) {
            var zagiq = (zagii - zagib) / zagie, zagir = (zagil - zagib) / zagie;
            if (zagiq > zagio) zagio = zagiq;
            if (zagir < zagip) zagip = zagir;
        } else if (zagie < 0) {
            var zagis = (zagil - zagib) / zagie, zagit = (zagii - zagib) / zagie;
            if (zagis > zagio) zagio = zagis;
            if (zagit < zagip) zagip = zagit;
        } else if (zagib < zagii - 1e-9 || zagib > zagil + 1e-9) return null;
        if (zagif > 0) {
            var zagiu = (zagij - zagic) / zagif, zagiv = (zagim - zagic) / zagif;
            if (zagiu > zagio) zagio = zagiu;
            if (zagiv < zagip) zagip = zagiv;
        } else if (zagif < 0) {
            var zagiw = (zagim - zagic) / zagif, zagix = (zagij - zagic) / zagif;
            if (zagiw > zagio) zagio = zagiw;
            if (zagix < zagip) zagip = zagix;
        } else if (zagic < zagij - 1e-9 || zagic > zagim + 1e-9) return null;
        if (zagig > 0) {
            var zagiy = (zagik - zagid) / zagig, zagiz = (zagin - zagid) / zagig;
            if (zagiy > zagio) zagio = zagiy;
            if (zagiz < zagip) zagip = zagiz;
        } else if (zagig < 0) {
            var zagiaa = (zagin - zagid) / zagig, zagiab = (zagik - zagid) / zagig;
            if (zagiaa > zagio) zagio = zagiaa;
            if (zagiab < zagip) zagip = zagiab;
        } else if (zagid < zagik - 1e-9 || zagid > zagin + 1e-9) return null;
        if (zagio > zagip || zagip < 0) return null;
        return zagio < 0 ? 0 : zagio;
    }
    _sphereCastTriangle(zagia, zagic, zagid, zagie, zagif, zagig, zagih, zagii, zagij, zagik, zagil, zagim) {
        var zagin = this._triangle(zagij, zagik, zagil, zagim);
        var zagio = zagik.x, zagip = zagik.y, zagiq = zagik.z, zagir = zagil.x, zagis = zagil.y, zagit = zagil.z, zagiu = zagim.x, zagiv = zagim.y, zagiw = zagim.z;
        var zagix = Infinity, zagiy = null;
        var zagiz = (zagis - zagip) * (zagiw - zagiq) - (zagit - zagiq) * (zagiv - zagip), zagiaa = (zagit - zagiq) * (zagiu - zagio) - (zagir - zagio) * (zagiw - zagiq), zagiab = (zagir - zagio) * (zagiv - zagip) - (zagis - zagip) * (zagiu - zagio);
        var zagiac = Math.sqrt(zagiz * zagiz + zagiaa * zagiaa + zagiab * zagiab);
        if (zagiac > 1e-12) {
            zagiz /= zagiac;
            zagiaa /= zagiac;
            zagiab /= zagiac;
            var zagiad = (zagia - zagio) * zagiz + (zagic - zagip) * zagiaa + (zagid - zagiq) * zagiab;
            var zagiae = zagia - zagiad * zagiz, zagiaf = zagic - zagiad * zagiaa, zagiag = zagid - zagiad * zagiab;
            if (Math.abs(zagiad) <= zagii + 1e-9 && zagib(zagiae, zagiaf, zagiag, zagio, zagip, zagiq, zagir, zagis, zagit, zagiu, zagiv, zagiw)) {
                var zagiah = zagiad >= 0 ? 1 : -1;
                return [ 0, zagiae, zagiaf, zagiag, zagiah * zagiz, zagiah * zagiaa, zagiah * zagiab ];
            }
            var zagiai = zagie * zagiz + zagif * zagiaa + zagig * zagiab;
            if (Math.abs(zagiai) > 1e-12) {
                var zagiaj = (zagio - zagia) * zagiz + (zagip - zagic) * zagiaa + (zagiq - zagid) * zagiab;
                for (var zagiak = -1; zagiak <= 1; zagiak += 2) {
                    var zagial = (zagiaj + zagiak * zagii) / zagiai;
                    if (zagial >= 0 && zagial <= zagih && zagial < zagix) {
                        var zagiam = zagia + zagial * zagie - zagiak * zagii * zagiz, zagian = zagic + zagial * zagif - zagiak * zagii * zagiaa, zagiao = zagid + zagial * zagig - zagiak * zagii * zagiab;
                        if (zagib(zagiam, zagian, zagiao, zagio, zagip, zagiq, zagir, zagis, zagit, zagiu, zagiv, zagiw)) {
                            zagix = zagial;
                            zagiy = [ zagiak * zagiz, zagiak * zagiaa, zagiak * zagiab ];
                        }
                    }
                }
            }
        }
        var zagiap = [ [ zagio, zagip, zagiq, zagir, zagis, zagit ], [ zagir, zagis, zagit, zagiu, zagiv, zagiw ], [ zagiu, zagiv, zagiw, zagio, zagip, zagiq ] ];
        for (var zagiaq = 0; zagiaq < 3; zagiaq++) {
            var zagiar = zagiap[zagiaq][0], zagias = zagiap[zagiaq][1], zagiat = zagiap[zagiaq][2], zagiau = zagiap[zagiaq][3] - zagiar, zagiav = zagiap[zagiaq][4] - zagias, zagiaw = zagiap[zagiaq][5] - zagiat;
            var zagiax = Math.sqrt(zagiau * zagiau + zagiav * zagiav + zagiaw * zagiaw);
            if (zagiax <= 1e-12) continue;
            zagiau /= zagiax;
            zagiav /= zagiax;
            zagiaw /= zagiax;
            var zagiay = zagia - zagiar, zagiaz = zagic - zagias, zagiba = zagid - zagiat;
            var zagibb = zagiay * zagiau + zagiaz * zagiav + zagiba * zagiaw, zagibc = zagie * zagiau + zagif * zagiav + zagig * zagiaw;
            var zagibd = [];
            var zagibe = 1 - zagibc * zagibc;
            if (zagibe > 1e-12) {
                var zagibf = 2 * (zagiay * zagie + zagiaz * zagif + zagiba * zagig - zagibb * zagibc);
                var zagibg = zagiay * zagiay + zagiaz * zagiaz + zagiba * zagiba - zagibb * zagibb - zagii * zagii;
                var zagibh = zagibf * zagibf - 4 * zagibe * zagibg;
                if (zagibh >= 0) {
                    var zagibi = Math.sqrt(zagibh);
                    zagibd.push((-zagibf - zagibi) / (2 * zagibe));
                    zagibd.push((-zagibf + zagibi) / (2 * zagibe));
                }
            } else {
                if (zagibc > 1e-12) zagibd.push((0 - zagibb) / zagibc); else if (zagibc < -1e-12) zagibd.push((zagiax - zagibb) / zagibc);
                zagibd.push(0);
            }
            for (var zagibj = 0; zagibj < zagibd.length; zagibj++) {
                var zagibk = zagibd[zagibj];
                if (zagibk < 0 || zagibk > zagih || zagibk >= zagix) continue;
                var zagibl = zagia + zagibk * zagie - zagiar, zagibm = zagic + zagibk * zagif - zagias, zagibn = zagid + zagibk * zagig - zagiat;
                var zagibo = zagibl * zagiau + zagibm * zagiav + zagibn * zagiaw;
                var zagibp = zagibl * zagibl + zagibm * zagibm + zagibn * zagibn - zagibo * zagibo;
                if (zagibo < -1e-9 || zagibo > zagiax + 1e-9 || zagibp > zagii * zagii + 1e-9) continue;
                var zagibq = zagiar + zagibo * zagiau, zagibr = zagias + zagibo * zagiav, zagibs = zagiat + zagibo * zagiaw;
                var zagibt = zagia + zagibk * zagie - zagibq, zagibu = zagic + zagibk * zagif - zagibr, zagibv = zagid + zagibk * zagig - zagibs;
                var zagibw = Math.sqrt(zagibt * zagibt + zagibu * zagibu + zagibv * zagibv);
                if (zagibw > 1e-12) {
                    zagix = zagibk;
                    zagiy = [ zagibt / zagibw, zagibu / zagibw, zagibv / zagibw ];
                } else if (zagibk === 0) {
                    zagix = 0;
                    zagiy = [ zagiau, zagiav, zagiaw ];
                }
            }
        }
        var zagibx = [ [ zagio, zagip, zagiq ], [ zagir, zagis, zagit ], [ zagiu, zagiv, zagiw ] ];
        for (var zagiby = 0; zagiby < 3; zagiby++) {
            var zagibz = zagibx[zagiby][0] - zagia, zagica = zagibx[zagiby][1] - zagic, zagicb = zagibx[zagiby][2] - zagid;
            var zagicc = zagibz * zagie + zagica * zagif + zagicb * zagig;
            var zagicd = zagibz * zagibz + zagica * zagica + zagicb * zagicb - zagii * zagii;
            if (zagicd <= 1e-9) {
                var zagice = Math.sqrt(zagibz * zagibz + zagica * zagica + zagicb * zagicb);
                if (zagice > 1e-12 && zagix > 0) {
                    zagix = 0;
                    zagiy = [ -zagibz / zagice, -zagica / zagice, -zagicb / zagice ];
                }
                continue;
            }
            var zagicf = zagicc * zagicc - zagicd;
            if (zagicf < 0) continue;
            var zagicg = zagicc - Math.sqrt(zagicf);
            if (zagicg >= 0 && zagicg <= zagih && zagicg < zagix) {
                var zagich = zagia + zagicg * zagie - zagibx[zagiby][0], zagici = zagic + zagicg * zagif - zagibx[zagiby][1], zagicj = zagid + zagicg * zagig - zagibx[zagiby][2];
                var zagick = Math.sqrt(zagich * zagich + zagici * zagici + zagicj * zagicj);
                if (zagick > 1e-12) {
                    zagix = zagicg;
                    zagiy = [ zagich / zagick, zagici / zagick, zagicj / zagick ];
                }
            }
        }
        if (zagiy === null) return null;
        return [ zagix, zagia + zagix * zagie - zagiy[0] * zagii, zagic + zagix * zagif - zagiy[1] * zagii, zagid + zagix * zagig - zagiy[2] * zagii, zagiy[0], zagiy[1], zagiy[2] ];
    }
    closestPoint(zagia) {
        if (this.disposed) throw new Error("BVH is disposed");
        var zagib = this._validatePoint(zagia, "point");
        this.lastQueryTriangleTests = 0;
        var zagic = Infinity, zagid = null, zagie = -1;
        var zagif = [ 0 ];
        var zagig = new Vector3, zagih = new Vector3, zagii = new Vector3;
        while (zagif.length) {
            var zagij = zagif.pop();
            var zagik = this.nodeBounds[zagij * 6], zagil = this.nodeBounds[zagij * 6 + 1], zagim = this.nodeBounds[zagij * 6 + 2], zagin = this.nodeBounds[zagij * 6 + 3], zagio = this.nodeBounds[zagij * 6 + 4], zagip = this.nodeBounds[zagij * 6 + 5];
            var zagiq = Math.max(zagik - zagib[0], 0, zagib[0] - zagin), zagir = Math.max(zagil - zagib[1], 0, zagib[1] - zagio), zagis = Math.max(zagim - zagib[2], 0, zagib[2] - zagip);
            if (Math.sqrt(zagiq * zagiq + zagir * zagir + zagis * zagis) >= zagic) continue;
            var zagit = this.nodeCountArr[zagij];
            if (zagit > 0) {
                var zagiu = this.nodeStart[zagij];
                for (var zagiv = 0; zagiv < zagit; zagiv++) {
                    var zagiw = this.triRefs[zagiu + zagiv];
                    this.lastQueryTriangleTests++;
                    var zagix = this._closestPointTriangle(zagib[0], zagib[1], zagib[2], zagiw, zagig, zagih, zagii);
                    if (zagix[3] < zagic) {
                        zagic = zagix[3];
                        zagid = [ zagix[0], zagix[1], zagix[2] ];
                        zagie = zagiw;
                    }
                }
            } else {
                zagif.push(this.nodeRight[zagij]);
                zagif.push(this.nodeLeft[zagij]);
            }
        }
        if (!zagid) return null;
        return {
            point: new Vector3(zagid[0], zagid[1], zagid[2]),
            distance: zagic,
            faceIndex: zagie
        };
    }
    _closestPointTriangle(zagia, zagib, zagid, zagie, zagif, zagig, zagih) {
        this._triangle(zagie, zagif, zagig, zagih);
        var zagii = zagif.x, zagij = zagif.y, zagik = zagif.z, zagil = zagig.x, zagim = zagig.y, zagin = zagig.z, zagio = zagih.x, zagip = zagih.y, zagiq = zagih.z;
        var zagir = zagil - zagii, zagis = zagim - zagij, zagit = zagin - zagik, zagiu = zagio - zagii, zagiv = zagip - zagij, zagiw = zagiq - zagik, zagix = zagia - zagii, zagiy = zagib - zagij, zagiz = zagid - zagik;
        var zagiaa = zagir * zagix + zagis * zagiy + zagit * zagiz, zagiab = zagiu * zagix + zagiv * zagiy + zagiw * zagiz;
        if (zagiaa <= 0 && zagiab <= 0) return zagic(zagia, zagib, zagid, zagii, zagij, zagik);
        var zagiac = zagia - zagil, zagiad = zagib - zagim, zagiae = zagid - zagin;
        var zagiaf = zagir * zagiac + zagis * zagiad + zagit * zagiae, zagiag = zagiu * zagiac + zagiv * zagiad + zagiw * zagiae;
        if (zagiaf >= 0 && zagiag <= zagiaf) return zagic(zagia, zagib, zagid, zagil, zagim, zagin);
        var zagiah = zagiaa * zagiag - zagiaf * zagiab;
        if (zagiah <= 0 && zagiaa >= 0 && zagiaf <= 0) {
            var zagiai = zagiaa / (zagiaa - zagiaf);
            return zagic(zagia, zagib, zagid, zagii + zagir * zagiai, zagij + zagis * zagiai, zagik + zagit * zagiai);
        }
        var zagiaj = zagia - zagio, zagiak = zagib - zagip, zagial = zagid - zagiq;
        var zagiam = zagir * zagiaj + zagis * zagiak + zagit * zagial, zagian = zagiu * zagiaj + zagiv * zagiak + zagiw * zagial;
        if (zagian >= 0 && zagiam <= zagian) return zagic(zagia, zagib, zagid, zagio, zagip, zagiq);
        var zagiao = zagiam * zagiab - zagiaa * zagian;
        if (zagiao <= 0 && zagiab >= 0 && zagian <= 0) {
            var zagiap = zagiab / (zagiab - zagian);
            return zagic(zagia, zagib, zagid, zagii + zagiu * zagiap, zagij + zagiv * zagiap, zagik + zagiw * zagiap);
        }
        var zagiaq = zagiaf * zagian - zagiam * zagiag;
        if (zagiaq <= 0 && zagiag - zagiaf >= 0 && zagiam - zagian >= 0) {
            var zagiar = (zagiag - zagiaf) / (zagiag - zagiaf + (zagiam - zagian));
            return zagic(zagia, zagib, zagid, zagil + (zagio - zagil) * zagiar, zagim + (zagip - zagim) * zagiar, zagin + (zagiq - zagin) * zagiar);
        }
        var zagias = 1 / (zagiaq + zagiao + zagiah);
        var zagiat = zagiao * zagias, zagiau = zagiah * zagias;
        return zagic(zagia, zagib, zagid, zagii + zagir * zagiat + zagiu * zagiau, zagij + zagis * zagiat + zagiv * zagiau, zagik + zagit * zagiat + zagiw * zagiau);
    }
    closestPointSegment(zagia, zagib) {
        if (this.disposed) throw new Error("BVH is disposed");
        var zagic = this._validatePoint(zagia, "segment endpoint"), zagid = this._validatePoint(zagib, "segment endpoint");
        this.lastQueryTriangleTests = 0;
        var zagie = Infinity, zagif = null, zagig = -1;
        var zagih = [ 0 ];
        var zagii = new Vector3, zagij = new Vector3, zagik = new Vector3;
        while (zagih.length) {
            var zagil = zagih.pop();
            if (this._segmentBoxDistance(zagic, zagid, zagil) >= zagie) continue;
            var zagim = this.nodeCountArr[zagil];
            if (zagim > 0) {
                var zagin = this.nodeStart[zagil];
                for (var zagio = 0; zagio < zagim; zagio++) {
                    var zagip = this.triRefs[zagin + zagio];
                    this.lastQueryTriangleTests++;
                    var zagiq = this._closestPointSegmentTriangle(zagic, zagid, zagip, zagii, zagij, zagik);
                    if (zagiq[3] < zagie) {
                        zagie = zagiq[3];
                        zagif = [ zagiq[0], zagiq[1], zagiq[2] ];
                        zagig = zagip;
                    }
                }
            } else {
                zagih.push(this.nodeRight[zagil]);
                zagih.push(this.nodeLeft[zagil]);
            }
        }
        if (!zagif) return null;
        return {
            point: new Vector3(zagif[0], zagif[1], zagif[2]),
            distance: zagie,
            faceIndex: zagig
        };
    }
    _segmentBoxDistance(zagia, zagib, zagic) {
        var zagie = this.nodeBounds[zagic * 6], zagif = this.nodeBounds[zagic * 6 + 1], zagig = this.nodeBounds[zagic * 6 + 2], zagih = this.nodeBounds[zagic * 6 + 3], zagii = this.nodeBounds[zagic * 6 + 4], zagij = this.nodeBounds[zagic * 6 + 5];
        var zagik = 0, zagil = 1;
        for (var zagim = 0; zagim < 48; zagim++) {
            var zagin = zagik + (zagil - zagik) / 3, zagio = zagil - (zagil - zagik) / 3;
            if (zagid(zagia, zagib, zagin, zagie, zagif, zagig, zagih, zagii, zagij) < zagid(zagia, zagib, zagio, zagie, zagif, zagig, zagih, zagii, zagij)) zagil = zagio; else zagik = zagin;
        }
        return zagid(zagia, zagib, (zagik + zagil) / 2, zagie, zagif, zagig, zagih, zagii, zagij);
    }
    _closestPointSegmentTriangle(zagia, zagib, zagic, zagid, zagif, zagig) {
        this._triangle(zagic, zagid, zagif, zagig);
        var zagih = [ [ zagid.x, zagid.y, zagid.z ], [ zagif.x, zagif.y, zagif.z ], [ zagig.x, zagig.y, zagig.z ] ];
        var zagii = null, zagij = Infinity;
        for (var zagik = 0; zagik < 2; zagik++) {
            var zagil = zagik === 0 ? zagia[0] : zagib[0], zagim = zagik === 0 ? zagia[1] : zagib[1], zagin = zagik === 0 ? zagia[2] : zagib[2];
            var zagio = this._closestPointTriangle(zagil, zagim, zagin, zagic, zagid, zagif, zagig);
            if (zagio[3] < zagij) {
                zagij = zagio[3];
                zagii = [ zagio[0], zagio[1], zagio[2] ];
            }
        }
        for (var zagip = 0; zagip < 3; zagip++) {
            var zagiq = zagih[zagip], zagir = zagih[(zagip + 1) % 3];
            var zagis = zagie(zagia, zagib, zagiq, zagir);
            if (zagis[6] < zagij) {
                zagij = zagis[6];
                zagii = [ zagis[3], zagis[4], zagis[5] ];
            }
        }
        return [ zagii[0], zagii[1], zagii[2], zagij ];
    }
    capsuleCast(zagia, zagib, zagic, zagid, zagie) {
        if (this.disposed) throw new Error("BVH is disposed");
        if (typeof zagic !== "number" || !isFinite(zagic) || zagic < 0) throw new Error("BVH capsuleCast radius must be a non-negative finite number");
        if (typeof zagie !== "number" || !isFinite(zagie) || zagie < 0) throw new Error("BVH capsuleCast maxDistance must be a non-negative finite number");
        var zagig = this._normalizeDirection(zagid);
        var zagih = this._validatePoint(zagia, "capsule endpoint"), zagii = this._validatePoint(zagib, "capsule endpoint");
        var zagij = zagig[0], zagik = zagig[1], zagil = zagig[2];
        this.lastQueryTriangleTests = 0;
        var zagim = 1e-7;
        var zagin = new Vector3, zagio = new Vector3, zagip = new Vector3;
        var zagiq = 0, zagir = 0, zagis = false;
        for (var zagit = 0; zagit < 64; zagit++) {
            var zagiu = [ zagih[0] + zagij * zagiq, zagih[1] + zagik * zagiq, zagih[2] + zagil * zagiq ], zagiv = [ zagii[0] + zagij * zagiq, zagii[1] + zagik * zagiq, zagii[2] + zagil * zagiq ];
            var zagiw = this._segmentMeshClosest(zagiu, zagiv, zagin, zagio, zagip);
            if (!zagiw) return null;
            if (zagiw.distance <= zagic + zagim) {
                zagis = true;
                break;
            }
            var zagix = zagiw.distance - zagic;
            if (zagix <= zagim) {
                zagis = true;
                break;
            }
            zagir = zagiq;
            zagiq += zagix;
            if (zagiq > zagie) return null;
        }
        if (!zagis) return null;
        var zagiy = zagiq;
        if (zagiq > 0) {
            var zagiz = zagir, zagiaa = zagiq;
            for (var zagiab = 0; zagiab < 48; zagiab++) {
                var zagiac = (zagiz + zagiaa) / 2;
                var zagiad = this._segmentMeshClosest([ zagih[0] + zagij * zagiac, zagih[1] + zagik * zagiac, zagih[2] + zagil * zagiac ], [ zagii[0] + zagij * zagiac, zagii[1] + zagik * zagiac, zagii[2] + zagil * zagiac ], zagin, zagio, zagip);
                if (zagiad && zagiad.distance <= zagic) {
                    zagiaa = zagiac;
                    zagiy = zagiac;
                } else zagiz = zagiac;
            }
        }
        var zagiae = [ zagih[0] + zagij * zagiy, zagih[1] + zagik * zagiy, zagih[2] + zagil * zagiy ], zagiaf = [ zagii[0] + zagij * zagiy, zagii[1] + zagik * zagiy, zagii[2] + zagil * zagiy ];
        var zagiag = this._segmentMeshClosest(zagiae, zagiaf, zagin, zagio, zagip);
        if (!zagiag) return null;
        var zagiah = zagif(zagiae, zagiaf, zagiag.point);
        var zagiai = zagiah[0] - zagiag.point[0], zagiaj = zagiah[1] - zagiag.point[1], zagiak = zagiah[2] - zagiag.point[2];
        var zagial = Math.sqrt(zagiai * zagiai + zagiaj * zagiaj + zagiak * zagiak);
        var zagiam = zagial > 1e-12 ? new Vector3(zagiai / zagial, zagiaj / zagial, zagiak / zagial) : new Vector3(0, 1, 0);
        return {
            time: zagiy,
            point: new Vector3(zagiag.point[0], zagiag.point[1], zagiag.point[2]),
            normal: zagiam
        };
    }
    _segmentMeshClosest(zagia, zagib, zagic, zagid, zagie) {
        var zagif = Infinity, zagig = null;
        var zagih = [ 0 ];
        while (zagih.length) {
            var zagii = zagih.pop();
            if (this._segmentBoxDistance(zagia, zagib, zagii) >= zagif) continue;
            var zagij = this.nodeCountArr[zagii];
            if (zagij > 0) {
                var zagik = this.nodeStart[zagii];
                for (var zagil = 0; zagil < zagij; zagil++) {
                    var zagim = this.triRefs[zagik + zagil];
                    this.lastQueryTriangleTests++;
                    var zagin = this._closestPointSegmentTriangle(zagia, zagib, zagim, zagic, zagid, zagie);
                    if (zagin[3] < zagif) {
                        zagif = zagin[3];
                        zagig = [ zagin[0], zagin[1], zagin[2] ];
                    }
                }
            } else {
                zagih.push(this.nodeRight[zagii]);
                zagih.push(this.nodeLeft[zagii]);
            }
        }
        if (!zagig) return null;
        return {
            point: zagig,
            distance: zagif
        };
    }
    dispose() {
        if (this.disposed) return this;
        this.nodeBounds = null;
        this.nodeLeft = null;
        this.nodeRight = null;
        this.nodeStart = null;
        this.nodeCountArr = null;
        this.triRefs = null;
        this.positions = null;
        this.indices = null;
        this.uv = null;
        this._stampArray = null;
        this.disposed = true;
        return this;
    }
    static buildAsync(zagib, zagic) {
        return new Promise(function(zagid, zagie) {
            var zagif = !zagic || zagic.worker !== false;
            zagif = zagif && (typeof Worker !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined" && !!URL.createObjectURL);
            if (!zagif) {
                try {
                    zagid(new BVH(zagib, zagic));
                } catch (zagia) {
                    zagie(zagia);
                }
                return;
            }
            var zagig;
            try {
                zagig = BVH._prepare(zagib, zagic);
            } catch (zagia) {
                zagie(zagia);
                return;
            }
            var zagih = zagig.positions instanceof Float32Array ? zagig.positions.slice() : new Float32Array(zagig.positions);
            var zagii = zagig.indices ? zagig.indices.slice() : null;
            var zagij = {
                maxLeafTris: zagig.maxLeafTris,
                maxDepth: zagig.maxDepth,
                spatialSplits: zagig.spatialSplits
            };
            var zagik = "self.onmessage=function(e){var r=(" + zagia.toString() + ")(e.data.p,e.data.i,e.data.o);self.postMessage(r,[r.nodeBounds.buffer,r.nodeLeft.buffer,r.nodeRight.buffer,r.nodeStart.buffer,r.nodeCount.buffer,r.triRefs.buffer]);};";
            var zagil;
            try {
                zagil = new Worker(URL.createObjectURL(new Blob([ zagik ], {
                    type: "application/javascript"
                })));
            } catch (zagia) {
                try {
                    zagid(new BVH(zagib, zagic));
                } catch (zagia) {
                    zagie(zagia);
                }
                return;
            }
            zagil.onmessage = function(zagia) {
                zagil.terminate();
                try {
                    zagid(new BVH(zagib, zagic, zagia.data));
                } catch (zagia) {
                    zagie(zagia);
                }
            };
            zagil.onerror = function() {
                zagil.terminate();
                try {
                    zagid(new BVH(zagib, Object.assign({}, zagic, {
                        worker: false
                    })));
                } catch (zagia) {
                    zagie(zagia);
                }
            };
            var zagim = [ zagih.buffer ];
            if (zagii) zagim.push(zagii.buffer);
            zagil.postMessage({
                p: zagih,
                i: zagii,
                o: zagij
            }, zagim);
        });
    }
}

export { BVH };
