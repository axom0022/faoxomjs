import { Geometry } from "../geometries/Geometry.js";

class MeshletSet {
    constructor(zaiaa, zaiab) {
        zaiab = zaiab || {};
        this.maxVertices = Math.max(3, zaiab.maxVertices || 96);
        this.maxTriangles = Math.max(1, zaiab.maxTriangles || 192);
        this.source = zaiaa;
        this.meshlets = [];
        this.geometry = null;
        this.stats = {
            meshlets: 0,
            triangles: 0,
            vertices: 0,
            maxMeshletTriangles: 0,
            avgMeshletTriangles: 0,
            avgMeshletVertices: 0,
            buildms: 0,
            coneCullable: 0
        };
        this.build();
    }
    build() {
        var zaiaa = typeof performance !== "undefined" ? performance.now() : Date.now();
        var zaiab = this.source;
        if (!zaiab || !zaiab.attributes || !zaiab.attributes.position) return;
        var zaiac = zaiab.attributes.position.array;
        var zaiad = zaiab.index;
        var zaiae = zaiad ? zaiad.array ? zaiad.array : zaiad : null;
        var zaiaf = zaiae ? zaiae.length / 3 : zaiac.length / 9;
        zaiaf = Math.floor(zaiaf);
        if (zaiaf === 0) return;
        if (!zaiae) {
            zaiae = new Uint32Array(zaiaf * 3);
            for (var zaiag = 0; zaiag < zaiaf * 3; zaiag++) zaiae[zaiag] = zaiag;
        }
        var zaiah = zaiac.length / 3;
        var zaiai = new Float32Array(zaiaf * 3);
        var zaiaj = new Float32Array(zaiaf * 3);
        for (var zaiak = 0; zaiak < zaiaf; zaiak++) {
            var zaial = zaiae[zaiak * 3], zaiam = zaiae[zaiak * 3 + 1], zaian = zaiae[zaiak * 3 + 2];
            var zaiao = zaiac[zaiam * 3] - zaiac[zaial * 3], zaiap = zaiac[zaiam * 3 + 1] - zaiac[zaial * 3 + 1], zaiaq = zaiac[zaiam * 3 + 2] - zaiac[zaial * 3 + 2];
            var zaiar = zaiac[zaian * 3] - zaiac[zaial * 3], zaias = zaiac[zaian * 3 + 1] - zaiac[zaial * 3 + 1], zaiat = zaiac[zaian * 3 + 2] - zaiac[zaial * 3 + 2];
            var zaiau = zaiap * zaiat - zaiaq * zaias, zaiav = zaiaq * zaiar - zaiao * zaiat, zaiaw = zaiao * zaias - zaiap * zaiar;
            var zaiax = Math.sqrt(zaiau * zaiau + zaiav * zaiav + zaiaw * zaiaw);
            if (zaiax > 1e-12) {
                zaiau /= zaiax;
                zaiav /= zaiax;
                zaiaw /= zaiax;
            } else {
                zaiau = 0;
                zaiav = 1;
                zaiaw = 0;
            }
            zaiai[zaiak * 3] = zaiau;
            zaiai[zaiak * 3 + 1] = zaiav;
            zaiai[zaiak * 3 + 2] = zaiaw;
            zaiaj[zaiak * 3] = (zaiac[zaial * 3] + zaiac[zaiam * 3] + zaiac[zaian * 3]) / 3;
            zaiaj[zaiak * 3 + 1] = (zaiac[zaial * 3 + 1] + zaiac[zaiam * 3 + 1] + zaiac[zaian * 3 + 1]) / 3;
            zaiaj[zaiak * 3 + 2] = (zaiac[zaial * 3 + 2] + zaiac[zaiam * 3 + 2] + zaiac[zaian * 3 + 2]) / 3;
        }
        var zaiay = new Array(zaiah);
        for (var zaiaz = 0; zaiaz < zaiah; zaiaz++) zaiay[zaiaz] = [];
        for (var zaiaaa = 0; zaiaaa < zaiaf; zaiaaa++) {
            zaiay[zaiae[zaiaaa * 3]].push(zaiaaa);
            zaiay[zaiae[zaiaaa * 3 + 1]].push(zaiaaa);
            zaiay[zaiae[zaiaaa * 3 + 2]].push(zaiaaa);
        }
        var zaiaab = new Uint8Array(zaiaf);
        var zaiaac = new Uint32Array(zaiaf * 3);
        var zaiaad = 0;
        for (var zaiaae = 0; zaiaae < zaiaf; zaiaae++) {
            if (zaiaab[zaiaae]) continue;
            var zaiaaf = [ zaiaae ];
            zaiaab[zaiaae] = 1;
            var zaiaag = {};
            var zaiaah = 0;
            var zaiaai = [ zaiae[zaiaae * 3], zaiae[zaiaae * 3 + 1], zaiae[zaiaae * 3 + 2] ];
            for (var zaiaaj = 0; zaiaaj < 3; zaiaaj++) {
                if (!zaiaag[zaiaai[zaiaaj]]) {
                    zaiaag[zaiaai[zaiaaj]] = 1;
                    zaiaah++;
                }
            }
            while (zaiaaf.length < this.maxTriangles) {
                var zaiaak = -1, zaiaal = 1e9;
                var zaiaam = 0;
                for (var zaiaan = 0; zaiaan < zaiaaf.length && zaiaam < 256; zaiaan++) {
                    var zaiaao = zaiaaf[zaiaan];
                    for (var zaiaap = 0; zaiaap < 3; zaiaap++) {
                        var zaiaaq = zaiay[zaiae[zaiaao * 3 + zaiaap]];
                        for (var zaiaar = 0; zaiaar < zaiaaq.length; zaiaar++) {
                            var zaiaas = zaiaaq[zaiaar];
                            if (zaiaab[zaiaas]) continue;
                            zaiaam++;
                            if (zaiaam > 256) break;
                            var zaiaat = [ zaiae[zaiaas * 3], zaiae[zaiaas * 3 + 1], zaiae[zaiaas * 3 + 2] ];
                            var zaiaau = 0;
                            for (var zaiaav = 0; zaiaav < 3; zaiaav++) if (!zaiaag[zaiaat[zaiaav]]) zaiaau++;
                            if (zaiaah + zaiaau <= this.maxVertices && zaiaau < zaiaal) {
                                zaiaal = zaiaau;
                                zaiaak = zaiaas;
                                if (zaiaau === 0) break;
                            }
                        }
                        if (zaiaam > 256) break;
                    }
                    if (zaiaal === 0) break;
                }
                if (zaiaak < 0) break;
                zaiaaf.push(zaiaak);
                zaiaab[zaiaak] = 1;
                var zaiaaw = [ zaiae[zaiaak * 3], zaiae[zaiaak * 3 + 1], zaiae[zaiaak * 3 + 2] ];
                for (var zaiaax = 0; zaiaax < 3; zaiaax++) {
                    if (!zaiaag[zaiaaw[zaiaax]]) {
                        zaiaag[zaiaaw[zaiaax]] = 1;
                        zaiaah++;
                    }
                }
            }
            var zaiaay = zaiaad / 3;
            for (var zaiaaz = 0; zaiaaz < zaiaaf.length; zaiaaz++) {
                zaiaac[zaiaad++] = zaiae[zaiaaf[zaiaaz] * 3];
                zaiaac[zaiaad++] = zaiae[zaiaaf[zaiaaz] * 3 + 1];
                zaiaac[zaiaad++] = zaiae[zaiaaf[zaiaaz] * 3 + 2];
            }
            var zaiaba = 1e30, zaiabb = 1e30, zaiabc = 1e30, zaiabd = -1e30, zaiabe = -1e30, zaiabf = -1e30;
            var zaiabg = 0, zaiabh = 0, zaiabi = 0, zaiabj = 0;
            for (var zaiabk in zaiaag) {
                var zaiabl = zaiabk | 0;
                var zaiabm = zaiac[zaiabl * 3], zaiabn = zaiac[zaiabl * 3 + 1], zaiabo = zaiac[zaiabl * 3 + 2];
                if (zaiabm < zaiaba) zaiaba = zaiabm;
                if (zaiabn < zaiabb) zaiabb = zaiabn;
                if (zaiabo < zaiabc) zaiabc = zaiabo;
                if (zaiabm > zaiabd) zaiabd = zaiabm;
                if (zaiabn > zaiabe) zaiabe = zaiabn;
                if (zaiabo > zaiabf) zaiabf = zaiabo;
                zaiabg += zaiabm;
                zaiabh += zaiabn;
                zaiabi += zaiabo;
                zaiabj++;
            }
            var zaiabp = zaiabg / zaiabj, zaiabq = zaiabh / zaiabj, zaiabr = zaiabi / zaiabj;
            var zaiabs = 0;
            for (var zaiabt in zaiaag) {
                var zaiabu = zaiabt | 0;
                var zaiabv = zaiac[zaiabu * 3] - zaiabp, zaiabw = zaiac[zaiabu * 3 + 1] - zaiabq, zaiabx = zaiac[zaiabu * 3 + 2] - zaiabr;
                var zaiaby = zaiabv * zaiabv + zaiabw * zaiabw + zaiabx * zaiabx;
                if (zaiaby > zaiabs) zaiabs = zaiaby;
            }
            zaiabs = Math.sqrt(zaiabs);
            var zaiabz = 0, zaiaca = 0, zaiacb = 0;
            for (var zaiacc = 0; zaiacc < zaiaaf.length; zaiacc++) {
                zaiabz += zaiai[zaiaaf[zaiacc] * 3];
                zaiaca += zaiai[zaiaaf[zaiacc] * 3 + 1];
                zaiacb += zaiai[zaiaaf[zaiacc] * 3 + 2];
            }
            var zaiacd = Math.sqrt(zaiabz * zaiabz + zaiaca * zaiaca + zaiacb * zaiacb);
            var zaiace = 0;
            var zaiacf = [ 0, 1, 0 ];
            var zaiacg = -1;
            if (zaiacd > 1e-6) {
                zaiacf = [ zaiabz / zaiacd, zaiaca / zaiacd, zaiacb / zaiacd ];
                var zaiach = 1;
                for (var zaiaci = 0; zaiaci < zaiaaf.length; zaiaci++) {
                    var zaiacj = zaiai[zaiaaf[zaiaci] * 3] * zaiacf[0] + zaiai[zaiaaf[zaiaci] * 3 + 1] * zaiacf[1] + zaiai[zaiaaf[zaiaci] * 3 + 2] * zaiacf[2];
                    if (zaiacj < zaiach) zaiach = zaiacj;
                }
                zaiacg = zaiach;
                if (zaiach > -.98) zaiace = 1;
            }
            this.meshlets.push({
                first: zaiaay,
                count: zaiaaf.length * 3,
                center: [ zaiabp, zaiabq, zaiabr ],
                radius: zaiabs,
                axis: zaiacf,
                cosThetaMax: zaiacg,
                cullable: zaiace,
                min: [ zaiaba, zaiabb, zaiabc ],
                max: [ zaiabd, zaiabe, zaiabf ],
                triangles: zaiaaf.length,
                vertices: zaiaah
            });
        }
        var zaiack = new Geometry;
        zaiack.setAttribute("position", zaiab.attributes.position);
        if (zaiab.attributes.normal) zaiack.setAttribute("normal", zaiab.attributes.normal);
        if (zaiab.attributes.uv) zaiack.setAttribute("uv", zaiab.attributes.uv);
        zaiack.setIndex(zaiaac);
        zaiack.computeBounds();
        this.geometry = zaiack;
        this.stats.meshlets = this.meshlets.length;
        this.stats.triangles = zaiaf;
        this.stats.vertices = zaiah;
        var zaiacl = 0, zaiacm = 0, zaiacn = 0;
        for (var zaiaco = 0; zaiaco < this.meshlets.length; zaiaco++) {
            if (this.meshlets[zaiaco].triangles > zaiacl) zaiacl = this.meshlets[zaiaco].triangles;
            zaiacm += this.meshlets[zaiaco].triangles;
            zaiacn += this.meshlets[zaiaco].vertices;
            if (this.meshlets[zaiaco].cullable) this.stats.coneCullable++;
        }
        this.stats.maxMeshletTriangles = zaiacl;
        this.stats.avgMeshletTriangles = zaiacm / Math.max(1, this.meshlets.length);
        this.stats.avgMeshletVertices = zaiacn / Math.max(1, this.meshlets.length);
        this.stats.buildms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - zaiaa;
        return this;
    }
    cull(zaiaa) {
        var zaiab = this.meshlets.length;
        var zaiac = new Uint8Array(zaiab);
        var zaiad = this.source.attributes.position.array;
        var zaiae = this.source.index;
        var zaiaf = zaiae ? zaiae.array ? zaiae.array : zaiae : null;
        if (!zaiaf) {
            zaiaf = new Uint32Array(this.stats.triangles * 3);
            for (var zaiag = 0; zaiag < zaiaf.length; zaiag++) zaiaf[zaiag] = zaiag;
        }
        for (var zaiah = 0; zaiah < zaiab; zaiah++) {
            var zaiai = this.meshlets[zaiah];
            zaiac[zaiah] = 1;
            if (!zaiai.cullable) continue;
            var zaiaj = zaiaa[0] - zaiai.center[0], zaiak = zaiaa[1] - zaiai.center[1], zaial = zaiaa[2] - zaiai.center[2];
            var zaiam = Math.sqrt(zaiaj * zaiaj + zaiak * zaiak + zaial * zaial) || 1;
            zaiaj /= zaiam;
            zaiak /= zaiam;
            zaial /= zaiam;
            var zaian = zaiaj * zaiai.axis[0] + zaiak * zaiai.axis[1] + zaial * zaiai.axis[2];
            var zaiao = Math.sqrt(Math.max(0, 1 - zaian * zaian));
            var zaiap = Math.sqrt(Math.max(0, 1 - zaiai.cosThetaMax * zaiai.cosThetaMax));
            var zaiaq = zaian * zaiai.cosThetaMax + zaiao * zaiap;
            if (zaian < zaiai.cosThetaMax && zaiaq < -1e-6 && zaiam * -zaiaq >= zaiai.radius) zaiac[zaiah] = 0;
        }
        return zaiac;
    }
    cullView(zaiaa, zaiab) {
        var zaiac = this.cull(zaiab);
        for (var zaiad = 0; zaiad < this.meshlets.length; zaiad++) {
            if (!zaiac[zaiad]) continue;
            var zaiae = this.meshlets[zaiad];
            for (var zaiaf = 0; zaiaf < 6; zaiaf++) {
                var zaiag = zaiaa[zaiaf * 4] * zaiae.center[0] + zaiaa[zaiaf * 4 + 1] * zaiae.center[1] + zaiaa[zaiaf * 4 + 2] * zaiae.center[2] + zaiaa[zaiaf * 4 + 3];
                if (zaiag < -zaiae.radius) {
                    zaiac[zaiad] = 0;
                    break;
                }
            }
        }
        return zaiac;
    }
    mergeIndices(zaiaa) {
        var zaiab = 0;
        for (var zaiac = 0; zaiac < this.meshlets.length; zaiac++) {
            if (!zaiaa || zaiaa[zaiac]) zaiab += this.meshlets[zaiac].count;
        }
        var zaiad = new Uint32Array(zaiab);
        var zaiae = 0;
        var zaiaf = this.geometry.index;
        for (var zaiag = 0; zaiag < this.meshlets.length; zaiag++) {
            if (!zaiaa || zaiaa[zaiag]) {
                var zaiah = this.meshlets[zaiag];
                for (var zaiai = 0; zaiai < zaiah.count; zaiai++) zaiad[zaiae++] = zaiaf[zaiah.first * 3 + zaiai];
            }
        }
        return zaiad;
    }
    meshletGeometry(zaiaa) {
        var zaiab = new Geometry;
        zaiab.setAttribute("position", this.source.attributes.position);
        if (this.source.attributes.normal) zaiab.setAttribute("normal", this.source.attributes.normal);
        if (this.source.attributes.uv) zaiab.setAttribute("uv", this.source.attributes.uv);
        zaiab.setIndex(this.mergeIndices(zaiaa));
        zaiab.computeBounds();
        return zaiab;
    }
}

export { MeshletSet };
