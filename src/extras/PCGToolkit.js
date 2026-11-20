import { Color } from "../math/index.js";

import { Matrix4 } from "../math/index.js";

import { faoxomclamp, faoxomvalue } from "../math/index.js";

import { Mesh } from "../objects/index.js";

import { InstancedMesh } from "../objects/index.js";

import { StandardMaterial } from "../materials/index.js";

import { faoxomgeometry } from "../geometries/index.js";

class PCGRandom {
    constructor(zaifa) {
        this.seed = zaifa === undefined ? 1 : zaifa | 0;
        this.state = this.seed;
        this.spare = null;
    }
    next() {
        this.state = this.state + 1831565813 | 0;
        var zaifa = this.state;
        zaifa = Math.imul(zaifa ^ zaifa >>> 15, zaifa | 1);
        zaifa ^= zaifa + Math.imul(zaifa ^ zaifa >>> 7, zaifa | 61);
        return ((zaifa ^ zaifa >>> 14) >>> 0) / 4294967296;
    }
    range(zaifa, zaifb) {
        return zaifa + (zaifb - zaifa) * this.next();
    }
    int(zaifa, zaifb) {
        return zaifa + Math.floor(this.next() * (zaifb - zaifa + 1));
    }
    chance(zaifa) {
        return this.next() < zaifa;
    }
    pick(zaifa) {
        return zaifa[Math.floor(this.next() * zaifa.length)];
    }
    gauss(zaifa, zaifb) {
        if (this.spare !== null) {
            var zaifc = this.spare;
            this.spare = null;
            return zaifa + zaifb * zaifc;
        }
        var zaifd = 0, zaife = 0, zaiff = 0;
        do {
            zaifd = this.next() * 2 - 1;
            zaife = this.next() * 2 - 1;
            zaiff = zaifd * zaifd + zaife * zaife;
        } while (zaiff >= 1 || zaiff === 0);
        var zaifg = Math.sqrt(-2 * Math.log(zaiff) / zaiff);
        this.spare = zaife * zaifg;
        return zaifa + zaifb * zaifd * zaifg;
    }
    shuffle(zaifa) {
        for (var zaifb = zaifa.length - 1; zaifb > 0; zaifb--) {
            var zaifc = Math.floor(this.next() * (zaifb + 1));
            var zaifd = zaifa[zaifb];
            zaifa[zaifb] = zaifa[zaifc];
            zaifa[zaifc] = zaifd;
        }
        return zaifa;
    }
}

class PCGNoise {
    constructor(zaifa) {
        this.seed = zaifa === undefined ? 1 : zaifa | 0;
    }
    hash2(zaifa, zaifb) {
        var zaifc = Math.imul(zaifa, 374761393) + Math.imul(zaifb, 668265263) + Math.imul(this.seed, 2246822519) | 0;
        zaifc = Math.imul(zaifc ^ zaifc >>> 13, 1274126177);
        zaifc ^= zaifc >>> 16;
        return (zaifc >>> 0) / 4294967296;
    }
    value2(zaifa, zaifb) {
        var zaifc = Math.floor(zaifa), zaifd = Math.floor(zaifb);
        var zaife = zaifa - zaifc, zaiff = zaifb - zaifd;
        var zaifg = zaife * zaife * zaife * (zaife * (zaife * 6 - 15) + 10);
        var zaifh = zaiff * zaiff * zaiff * (zaiff * (zaiff * 6 - 15) + 10);
        var zaifi = this.hash2(zaifc, zaifd);
        var zaifj = this.hash2(zaifc + 1, zaifd);
        var zaifk = this.hash2(zaifc, zaifd + 1);
        var zaifl = this.hash2(zaifc + 1, zaifd + 1);
        var zaifm = zaifi + (zaifj - zaifi) * zaifg;
        var zaifn = zaifk + (zaifl - zaifk) * zaifg;
        return zaifm + (zaifn - zaifm) * zaifh;
    }
    fbm2(zaifa, zaifb, zaifc) {
        zaifc = zaifc || {};
        var zaifd = zaifc.octaves === undefined ? 4 : Math.max(1, zaifc.octaves | 0);
        var zaife = zaifc.lacunarity === undefined ? 2 : zaifc.lacunarity;
        var zaiff = zaifc.gain === undefined ? .5 : zaifc.gain;
        var zaifg = !!zaifc.ridge;
        var zaifh = zaifc.warp === undefined ? 0 : zaifc.warp;
        var zaifi = zaifa, zaifj = zaifb;
        if (zaifh !== 0) {
            zaifi = zaifa + zaifh * (this.value2(zaifa + 5.2, zaifb + 1.3) - .5);
            zaifj = zaifb + zaifh * (this.value2(zaifa - 3.7, zaifb + 9.1) - .5);
        }
        var zaifk = 0, zaifl = 1, zaifm = 0, zaifn = zaifi, zaifo = zaifj;
        for (var zaifp = 0; zaifp < zaifd; zaifp++) {
            var zaifq = this.value2(zaifn, zaifo);
            if (zaifg) zaifq = 1 - Math.abs(2 * zaifq - 1);
            zaifk += zaifq * zaifl;
            zaifm += zaifl;
            zaifl *= zaiff;
            zaifn *= zaife;
            zaifo *= zaife;
        }
        return zaifk / zaifm;
    }
}

class PCGTerrain {
    constructor(zaifa) {
        zaifa = zaifa || {};
        this.seed = faoxomvalue(zaifa.seed, 1);
        this.width = faoxomvalue(zaifa.width, 100);
        this.depth = faoxomvalue(zaifa.depth, 100);
        this.segmentsX = Math.max(1, faoxomvalue(zaifa.segmentsX, 64) | 0);
        this.segmentsZ = Math.max(1, faoxomvalue(zaifa.segmentsZ, 64) | 0);
        this.height = faoxomvalue(zaifa.height, 10);
        this.frequency = faoxomvalue(zaifa.frequency, 4);
        this.octaves = faoxomvalue(zaifa.octaves, 5);
        this.lacunarity = faoxomvalue(zaifa.lacunarity, 2);
        this.gain = faoxomvalue(zaifa.gain, .5);
        this.ridge = !!zaifa.ridge;
        this.warp = faoxomvalue(zaifa.warp, 0);
        this.flats = zaifa.flats || [];
        this.zones = zaifa.zones || [];
        this.noise = new PCGNoise(this.seed);
        var zaifb = this.segmentsX, zaifc = this.segmentsZ;
        var zaifd = zaifb + 1, zaife = zaifc + 1;
        this.heights = new Float32Array(zaifd * zaife);
        for (var zaiff = 0; zaiff < zaife; zaiff++) {
            for (var zaifg = 0; zaifg < zaifd; zaifg++) {
                var zaifh = (zaifg / zaifb - .5) * this.width;
                var zaifi = (zaiff / zaifc - .5) * this.depth;
                var zaifj = this.noise.fbm2(zaifg / zaifb * this.frequency, zaiff / zaifc * this.frequency, {
                    octaves: this.octaves,
                    lacunarity: this.lacunarity,
                    gain: this.gain,
                    ridge: this.ridge,
                    warp: this.warp
                });
                var zaifk = zaifj * this.height;
                for (var zaifl = 0; zaifl < this.flats.length; zaifl++) {
                    var zaifm = this.flats[zaifl];
                    if (!zaifm || !(zaifm.radius > 0)) continue;
                    var zaifn = Math.sqrt((zaifh - zaifm.x) * (zaifh - zaifm.x) + (zaifi - zaifm.z) * (zaifi - zaifm.z));
                    if (zaifn >= zaifm.radius) continue;
                    var zaifo = zaifm.radius * (1 - faoxomvalue(zaifm.falloff, .25));
                    var zaifp = faoxomclamp((zaifn - zaifo) / Math.max(zaifm.radius - zaifo, 1e-9), 0, 1);
                    zaifp = zaifp * zaifp * (3 - 2 * zaifp);
                    zaifk = zaifm.height + (zaifk - zaifm.height) * zaifp;
                }
                this.heights[zaiff * zaifd + zaifg] = zaifk;
            }
        }
        var zaifq = this.width / zaifb, zaifr = this.depth / zaifc;
        this.normals = new Float32Array(zaifd * zaife * 3);
        this.slopes = new Float32Array(zaifd * zaife);
        for (var zaifs = 0; zaifs < zaife; zaifs++) {
            for (var zaift = 0; zaift < zaifd; zaift++) {
                var zaifu = this.heights[zaifs * zaifd + Math.max(zaift - 1, 0)];
                var zaifv = this.heights[zaifs * zaifd + Math.min(zaift + 1, zaifb)];
                var zaifw = this.heights[Math.max(zaifs - 1, 0) * zaifd + zaift];
                var zaifx = this.heights[Math.min(zaifs + 1, zaifc) * zaifd + zaift];
                var zaify = zaift === 0 || zaift === zaifb ? zaifq : 2 * zaifq;
                var zaifz = zaifs === 0 || zaifs === zaifc ? zaifr : 2 * zaifr;
                var zaifaa = (zaifv - zaifu) / zaify;
                var zaifab = (zaifx - zaifw) / zaifz;
                var zaifac = Math.sqrt(zaifaa * zaifaa + zaifab * zaifab + 1);
                this.normals[(zaifs * zaifd + zaift) * 3] = -zaifaa / zaifac;
                this.normals[(zaifs * zaifd + zaift) * 3 + 1] = 1 / zaifac;
                this.normals[(zaifs * zaifd + zaift) * 3 + 2] = -zaifab / zaifac;
                this.slopes[zaifs * zaifd + zaift] = Math.acos(faoxomclamp(1 / zaifac, -1, 1));
            }
        }
        this.zoneIndices = new Int16Array(zaifd * zaife);
        this.colors = new Float32Array(zaifd * zaife * 3);
        for (var zaifad = 0; zaifad < zaife; zaifad++) {
            for (var zaifae = 0; zaifae < zaifd; zaifae++) {
                var zaifaf = zaifad * zaifd + zaifae;
                var zaifag = this.zoneIndexFor(this.heights[zaifaf], this.slopes[zaifaf]);
                this.zoneIndices[zaifaf] = zaifag;
                var zaifah = this.zoneColor(zaifag);
                this.colors[zaifaf * 3] = zaifah[0];
                this.colors[zaifaf * 3 + 1] = zaifah[1];
                this.colors[zaifaf * 3 + 2] = zaifah[2];
            }
        }
    }
    zoneIndexFor(zaifa, zaifb) {
        for (var zaifc = 0; zaifc < this.zones.length; zaifc++) {
            var zaifd = this.zones[zaifc];
            var zaife = zaifd.minHeight === undefined ? -Infinity : zaifd.minHeight;
            var zaiff = zaifd.maxHeight === undefined ? Infinity : zaifd.maxHeight;
            var zaifg = zaifd.maxSlope === undefined ? Infinity : zaifd.maxSlope;
            if (zaifa >= zaife && zaifa <= zaiff && zaifb <= zaifg) return zaifc;
        }
        return -1;
    }
    zoneColor(zaifa) {
        if (zaifa < 0 || zaifa >= this.zones.length) return [ 1, 1, 1 ];
        var zaifb = this.zones[zaifa].color;
        if (zaifb === undefined) return [ 1, 1, 1 ];
        if (typeof zaifb === "number") {
            var zaifc = new Color(zaifb);
            return [ zaifc.r, zaifc.g, zaifc.b ];
        }
        if (zaifb && zaifb.r !== undefined) return [ zaifb.r, zaifb.g === undefined ? zaifb.r : zaifb.g, zaifb.b === undefined ? zaifb.r : zaifb.b ];
        if (zaifb && zaifb.length >= 3) return [ zaifb[0], zaifb[1], zaifb[2] ];
        return [ 1, 1, 1 ];
    }
    zoneIndexByName(zaifa) {
        for (var zaifb = 0; zaifb < this.zones.length; zaifb++) if (this.zones[zaifb].name === zaifa) return zaifb;
        return -1;
    }
    gridX(zaifa) {
        return faoxomclamp(zaifa / this.width + .5, 0, 1) * this.segmentsX;
    }
    gridZ(zaifa) {
        return faoxomclamp(zaifa / this.depth + .5, 0, 1) * this.segmentsZ;
    }
    bilinear(zaifa, zaifb, zaifc) {
        var zaifd = this.segmentsX + 1;
        var zaife = Math.min(this.segmentsX, Math.floor(zaifb));
        var zaiff = Math.min(this.segmentsZ, Math.floor(zaifc));
        var zaifg = Math.min(this.segmentsX, zaife + 1);
        var zaifh = Math.min(this.segmentsZ, zaiff + 1);
        var zaifi = zaifb - zaife;
        var zaifj = zaifc - zaiff;
        var zaifk = zaifa[zaiff * zaifd + zaife];
        var zaifl = zaifa[zaiff * zaifd + zaifg];
        var zaifm = zaifa[zaifh * zaifd + zaife];
        var zaifn = zaifa[zaifh * zaifd + zaifg];
        var zaifo = zaifk + (zaifl - zaifk) * zaifi;
        var zaifp = zaifm + (zaifn - zaifm) * zaifi;
        return zaifo + (zaifp - zaifo) * zaifj;
    }
    heightAt(zaifa, zaifb) {
        return this.bilinear(this.heights, this.gridX(zaifa), this.gridZ(zaifb));
    }
    slopeAt(zaifa, zaifb) {
        return this.bilinear(this.slopes, this.gridX(zaifa), this.gridZ(zaifb));
    }
    zoneAt(zaifa, zaifb) {
        var zaifc = Math.round(this.gridX(zaifa));
        var zaifd = Math.round(this.gridZ(zaifb));
        zaifc = faoxomclamp(zaifc, 0, this.segmentsX);
        zaifd = faoxomclamp(zaifd, 0, this.segmentsZ);
        return this.zoneIndices[zaifd * (this.segmentsX + 1) + zaifc];
    }
    toMesh(zaifa) {
        var zaifb = this.segmentsX, zaifc = this.segmentsZ;
        var zaifd = zaifb + 1;
        var zaife = [], zaiff = [], zaifg = [], zaifh = [];
        for (var zaifi = 0; zaifi <= zaifc; zaifi++) {
            for (var zaifj = 0; zaifj <= zaifb; zaifj++) {
                var zaifk = zaifi * zaifd + zaifj;
                zaife.push((zaifj / zaifb - .5) * this.width, this.heights[zaifk], (zaifi / zaifc - .5) * this.depth);
                zaiff.push(this.normals[zaifk * 3], this.normals[zaifk * 3 + 1], this.normals[zaifk * 3 + 2]);
                zaifg.push(zaifj / zaifb, zaifi / zaifc);
            }
        }
        for (var zaifl = 0; zaifl < zaifc; zaifl++) {
            for (var zaifm = 0; zaifm < zaifb; zaifm++) {
                var zaifn = zaifl * zaifd + zaifm;
                var zaifo = zaifn + 1;
                var zaifp = zaifn + zaifd;
                var zaifq = zaifp + 1;
                zaifh.push(zaifn, zaifp, zaifo, zaifo, zaifp, zaifq);
            }
        }
        var zaifr = faoxomgeometry(zaife, zaiff, zaifg, zaifh);
        zaifr.setAttribute("color", this.colors, 3);
        return new Mesh(zaifr, zaifa || new StandardMaterial);
    }
}

class PCGScatter {
    constructor(zaifa) {
        this.source = zaifa;
        this.transforms = [];
        if (zaifa && zaifa.bounds) {
            this.bounds = zaifa.bounds;
        } else if (zaifa && zaifa.width !== undefined && zaifa.depth !== undefined) {
            this.bounds = {
                minX: -zaifa.width * .5,
                maxX: zaifa.width * .5,
                minZ: -zaifa.depth * .5,
                maxZ: zaifa.depth * .5
            };
        } else {
            this.bounds = {
                minX: -50,
                maxX: 50,
                minZ: -50,
                maxZ: 50
            };
        }
    }
    satisfies(zaifa, zaifb, zaifc) {
        var zaifd = this.source.heightAt(zaifa, zaifb);
        var zaife = this.source.slopeAt(zaifa, zaifb);
        var zaiff = this.source.zoneAt ? this.source.zoneAt(zaifa, zaifb) : 0;
        var zaifg = zaifc.minHeight === undefined ? -Infinity : zaifc.minHeight;
        var zaifh = zaifc.maxHeight === undefined ? Infinity : zaifc.maxHeight;
        var zaifi = zaifc.minSlope === undefined ? 0 : zaifc.minSlope;
        var zaifj = zaifc.maxSlope === undefined ? Infinity : zaifc.maxSlope;
        if (zaifd < zaifg || zaifd > zaifh) return false;
        if (zaife < zaifi || zaife > zaifj) return false;
        if (zaifc.zones && zaifc.zones.length && zaifc.zones.indexOf(zaiff) < 0) return false;
        return true;
    }
    scatter(zaifa) {
        zaifa = zaifa || {};
        var zaifb = Math.max(0, faoxomvalue(zaifa.count, 16) | 0);
        var zaifc = zaifa.mode === "poisson" ? "poisson" : "jitter";
        var zaifd = new PCGRandom(faoxomvalue(zaifa.seed, 1));
        var zaife = zaifa.rotation !== false;
        var zaiff = faoxomvalue(zaifa.scaleMin, 1);
        var zaifg = zaifa.scaleMax === undefined ? zaiff : zaifa.scaleMax;
        var zaifh = faoxomvalue(zaifa.yOffset, 0);
        this.transforms = [];
        var zaifi = this;
        function zaifj(zaifa, zaifb) {
            var zaifc = zaifi.source.heightAt(zaifa, zaifb) + zaifh;
            var zaifj = zaife ? zaifd.range(0, Math.PI * 2) : 0;
            var zaifk = zaifd.range(zaiff, zaifg);
            zaifi.transforms.push({
                position: [ zaifa, zaifc, zaifb ],
                rotationY: zaifj,
                scale: zaifk
            });
        }
        if (zaifc === "jitter") {
            var zaifk = faoxomvalue(zaifa.maxAttempts, zaifb * 30);
            var zaifl = 0;
            while (this.transforms.length < zaifb && zaifl < zaifk) {
                zaifl++;
                var zaifm = zaifd.range(this.bounds.minX, this.bounds.maxX);
                var zaifn = zaifd.range(this.bounds.minZ, this.bounds.maxZ);
                if (!this.satisfies(zaifm, zaifn, zaifa)) continue;
                zaifj(zaifm, zaifn);
            }
        } else {
            var zaifo = Math.max(1e-4, faoxomvalue(zaifa.radius, 1));
            var zaifp = zaifo / 1.4142135623730951;
            var zaifq = Math.max(1, Math.ceil((this.bounds.maxX - this.bounds.minX) / zaifp));
            var zaifr = Math.max(1, Math.ceil((this.bounds.maxZ - this.bounds.minZ) / zaifp));
            var zaifs = new Int32Array(zaifq * zaifr).fill(-1);
            var zaift = [];
            var zaifu = [];
            var zaifv = faoxomvalue(zaifa.tries, 30);
            var zaifw = 0;
            while (zaift.length === 0 && zaifw < faoxomvalue(zaifa.maxAttempts, 100)) {
                zaifw++;
                var zaifx = zaifd.range(this.bounds.minX, this.bounds.maxX);
                var zaify = zaifd.range(this.bounds.minZ, this.bounds.maxZ);
                if (!this.satisfies(zaifx, zaify, zaifa)) continue;
                zaift.push([ zaifx, zaify ]);
                zaifs[Math.min(zaifr - 1, Math.floor((zaify - this.bounds.minZ) / zaifp)) * zaifq + Math.min(zaifq - 1, Math.floor((zaifx - this.bounds.minX) / zaifp))] = 0;
                zaifu.push(0);
            }
            while (zaifu.length > 0 && zaift.length < zaifb) {
                var zaifz = zaifd.int(0, zaifu.length - 1);
                var zaifaa = zaift[zaifu[zaifz]];
                var zaifab = false;
                for (var zaifac = 0; zaifac < zaifv && zaift.length < zaifb; zaifac++) {
                    var zaifad = zaifd.range(0, Math.PI * 2);
                    var zaifae = zaifd.range(zaifo, 2 * zaifo);
                    var zaifaf = zaifaa[0] + Math.cos(zaifad) * zaifae;
                    var zaifag = zaifaa[1] + Math.sin(zaifad) * zaifae;
                    if (zaifaf < this.bounds.minX || zaifaf > this.bounds.maxX || zaifag < this.bounds.minZ || zaifag > this.bounds.maxZ) continue;
                    if (!this.satisfies(zaifaf, zaifag, zaifa)) continue;
                    var zaifah = Math.min(zaifq - 1, Math.floor((zaifaf - this.bounds.minX) / zaifp));
                    var zaifai = Math.min(zaifr - 1, Math.floor((zaifag - this.bounds.minZ) / zaifp));
                    var zaifaj = true;
                    for (var zaifak = Math.max(0, zaifai - 2); zaifak <= Math.min(zaifr - 1, zaifai + 2) && zaifaj; zaifak++) {
                        for (var zaifal = Math.max(0, zaifah - 2); zaifal <= Math.min(zaifq - 1, zaifah + 2); zaifal++) {
                            var zaifam = zaifs[zaifak * zaifq + zaifal];
                            if (zaifam < 0) continue;
                            var zaifan = zaift[zaifam][0] - zaifaf;
                            var zaifao = zaift[zaifam][1] - zaifag;
                            if (zaifan * zaifan + zaifao * zaifao < zaifo * zaifo) {
                                zaifaj = false;
                                break;
                            }
                        }
                    }
                    if (!zaifaj) continue;
                    zaift.push([ zaifaf, zaifag ]);
                    zaifs[zaifai * zaifq + zaifah] = zaift.length - 1;
                    zaifu.push(zaift.length - 1);
                    zaifab = true;
                }
                if (!zaifab) {
                    zaifu[zaifz] = zaifu[zaifu.length - 1];
                    zaifu.pop();
                }
            }
            for (var zaifap = 0; zaifap < zaift.length; zaifap++) zaifj(zaift[zaifap][0], zaift[zaifap][1]);
        }
        return this.transforms;
    }
    matrices() {
        var zaifa = [];
        var zaifb = new Matrix4, zaifc = new Matrix4, zaifd = new Matrix4, zaife = new Matrix4;
        for (var zaiff = 0; zaiff < this.transforms.length; zaiff++) {
            var zaifg = this.transforms[zaiff];
            zaifb.makeTranslation(zaifg.position[0], zaifg.position[1], zaifg.position[2]);
            zaifc.makeRotationY(zaifg.rotationY);
            zaifd.makeScale(zaifg.scale, zaifg.scale, zaifg.scale);
            zaife.multiplyMatrices(zaifb, zaifc).multiply(zaifd);
            zaifa.push(zaife.clone());
            zaife.identity();
        }
        return zaifa;
    }
    toInstancedMesh(zaifa, zaifb) {
        var zaifc = new InstancedMesh(zaifa, zaifb, this.transforms.length);
        var zaifd = this.matrices();
        for (var zaife = 0; zaife < zaifd.length; zaife++) zaifc.setMatrixAt(zaife, zaifd[zaife]);
        return zaifc;
    }
}

class PCGDungeon {
    constructor(zaifa) {
        zaifa = zaifa || {};
        this.seed = faoxomvalue(zaifa.seed, 1);
        this.cols = Math.max(8, faoxomvalue(zaifa.cols, 48) | 0);
        this.rows = Math.max(8, faoxomvalue(zaifa.rows, 48) | 0);
        this.attempts = Math.max(1, faoxomvalue(zaifa.attempts, 12) | 0);
        this.roomMin = Math.max(2, faoxomvalue(zaifa.roomMin, 4) | 0);
        this.roomMax = Math.max(this.roomMin, faoxomvalue(zaifa.roomMax, 9) | 0);
        this.rooms = [];
        this.corridors = [];
        this.doors = [];
        this.tiles = new Uint8Array(this.cols * this.rows);
        this.generate();
    }
    tileAt(zaifa, zaifb) {
        if (zaifa < 0 || zaifb < 0 || zaifa >= this.cols || zaifb >= this.rows) return 0;
        return this.tiles[zaifb * this.cols + zaifa];
    }
    carveRect(zaifa, zaifb, zaifc, zaifd) {
        for (var zaife = zaifb; zaife < zaifb + zaifd; zaife++) {
            for (var zaiff = zaifa; zaiff < zaifa + zaifc; zaiff++) {
                if (zaiff >= 0 && zaife >= 0 && zaiff < this.cols && zaife < this.rows) this.tiles[zaife * this.cols + zaiff] = 1;
            }
        }
    }
    carveLine(zaifa, zaifb, zaifc, zaifd) {
        var zaife = zaifa;
        var zaiff = zaifb;
        var zaifg = zaifc >= zaifa ? 1 : -1;
        var zaifh = zaifd >= zaifb ? 1 : -1;
        while (zaife !== zaifc) {
            zaife += zaifg;
            if (zaife >= 0 && zaiff >= 0 && zaife < this.cols && zaiff < this.rows) this.tiles[zaiff * this.cols + zaife] = 1;
        }
        while (zaiff !== zaifd) {
            zaiff += zaifh;
            if (zaife >= 0 && zaiff >= 0 && zaife < this.cols && zaiff < this.rows) this.tiles[zaiff * this.cols + zaife] = 1;
        }
    }
    generate() {
        var zaifa = new PCGRandom(this.seed);
        var zaifb = Math.min(this.roomMax, Math.min(this.cols, this.rows) - 3);
        if (zaifb < this.roomMin) zaifb = this.roomMin;
        for (var zaifc = 0; zaifc < this.attempts; zaifc++) {
            var zaifd = zaifa.int(this.roomMin, zaifb);
            var zaife = zaifa.int(this.roomMin, zaifb);
            var zaiff = zaifa.int(1, Math.max(1, this.cols - zaifd - 2));
            var zaifg = zaifa.int(1, Math.max(1, this.rows - zaife - 2));
            var zaifh = false;
            for (var zaifi = 0; zaifi < this.rooms.length; zaifi++) {
                var zaifj = this.rooms[zaifi];
                if (zaiff < zaifj.x + zaifj.w + 1 && zaiff + zaifd + 1 > zaifj.x && zaifg < zaifj.z + zaifj.h + 1 && zaifg + zaife + 1 > zaifj.z) {
                    zaifh = true;
                    break;
                }
            }
            if (zaifh) continue;
            this.rooms.push({
                x: zaiff,
                z: zaifg,
                w: zaifd,
                h: zaife,
                cx: zaiff + Math.floor(zaifd / 2),
                cz: zaifg + Math.floor(zaife / 2)
            });
            this.carveRect(zaiff, zaifg, zaifd, zaife);
        }
        for (var zaifk = 1; zaifk < this.rooms.length; zaifk++) {
            var zaifl = this.rooms[zaifk - 1];
            var zaifm = this.rooms[zaifk];
            var zaifn = zaifa.chance(.5);
            if (zaifn) {
                this.carveLine(zaifl.cx, zaifl.cz, zaifm.cx, zaifl.cz);
                this.carveLine(zaifm.cx, zaifl.cz, zaifm.cx, zaifm.cz);
            } else {
                this.carveLine(zaifl.cx, zaifl.cz, zaifl.cx, zaifm.cz);
                this.carveLine(zaifl.cx, zaifm.cz, zaifm.cx, zaifm.cz);
            }
            this.corridors.push({
                x1: zaifl.cx,
                z1: zaifl.cz,
                x2: zaifm.cx,
                z2: zaifm.cz,
                order: zaifn ? "hz" : "vh"
            });
        }
        for (var zaifo = 0; zaifo < this.rooms.length; zaifo++) {
            var zaifp = this.rooms[zaifo];
            for (var zaifq = zaifp.z - 1; zaifq <= zaifp.z + zaifp.h; zaifq++) {
                for (var zaifr = zaifp.x - 1; zaifr <= zaifp.x + zaifp.w; zaifr++) {
                    var zaifs = zaifr === zaifp.x - 1 || zaifr === zaifp.x + zaifp.w || zaifq === zaifp.z - 1 || zaifq === zaifp.z + zaifp.h;
                    if (!zaifs) continue;
                    if (this.tileAt(zaifr, zaifq) !== 1) continue;
                    var zaift = false;
                    if (zaifr >= zaifp.x && zaifr < zaifp.x + zaifp.w && zaifq === zaifp.z - 1 && this.tileAt(zaifr, zaifp.z) === 1) zaift = true;
                    if (zaifr >= zaifp.x && zaifr < zaifp.x + zaifp.w && zaifq === zaifp.z + zaifp.h && this.tileAt(zaifr, zaifp.z + zaifp.h - 1) === 1) zaift = true;
                    if (zaifq >= zaifp.z && zaifq < zaifp.z + zaifp.h && zaifr === zaifp.x - 1 && this.tileAt(zaifp.x, zaifq) === 1) zaift = true;
                    if (zaifq >= zaifp.z && zaifq < zaifp.z + zaifp.h && zaifr === zaifp.x + zaifp.w && this.tileAt(zaifp.x + zaifp.w - 1, zaifq) === 1) zaift = true;
                    if (zaift) this.doors.push({
                        x: zaifr,
                        z: zaifq,
                        room: zaifo
                    });
                }
            }
        }
        return this;
    }
    connected() {
        if (this.rooms.length === 0) return true;
        var zaifa = this.rooms[0];
        var zaifb = new Uint8Array(this.cols * this.rows);
        var zaifc = [ zaifa.cz * this.cols + zaifa.cx ];
        zaifb[zaifc[0]] = 1;
        var zaifd = 0;
        while (zaifd < zaifc.length) {
            var zaife = zaifc[zaifd++];
            var zaiff = zaife % this.cols;
            var zaifg = (zaife - zaiff) / this.cols;
            var zaifh = [ zaife - 1, zaife + 1, zaife - this.cols, zaife + this.cols ];
            if (zaiff === 0) zaifh[0] = -1;
            if (zaiff === this.cols - 1) zaifh[1] = -1;
            if (zaifg === 0) zaifh[2] = -1;
            if (zaifg === this.rows - 1) zaifh[3] = -1;
            for (var zaifi = 0; zaifi < 4; zaifi++) {
                var zaifj = zaifh[zaifi];
                if (zaifj < 0 || zaifb[zaifj] || this.tiles[zaifj] !== 1) continue;
                zaifb[zaifj] = 1;
                zaifc.push(zaifj);
            }
        }
        for (var zaifk = 0; zaifk < this.rooms.length; zaifk++) {
            if (!zaifb[this.rooms[zaifk].cz * this.cols + this.rooms[zaifk].cx]) return false;
        }
        return true;
    }
    toMeshes(zaifa) {
        zaifa = zaifa || {};
        var zaifb = faoxomvalue(zaifa.tile, 1);
        var zaifc = faoxomvalue(zaifa.wallHeight, 2.5);
        var zaifd = faoxomvalue(zaifa.originX, 0);
        var zaife = faoxomvalue(zaifa.originZ, 0);
        function zaiff(zaifa) {
            return zaifd + (zaifa - .5) * zaifb;
        }
        function zaifg(zaifa) {
            return zaife + (zaifa - .5) * zaifb;
        }
        var zaifh = [], zaifi = [], zaifj = [], zaifk = [];
        var zaifl = [], zaifm = [], zaifn = [], zaifo = [];
        var zaifp = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ];
        for (var zaifq = 0; zaifq < this.rows; zaifq++) {
            for (var zaifr = 0; zaifr < this.cols; zaifr++) {
                if (this.tiles[zaifq * this.cols + zaifr] === 1) {
                    var zaifs = zaifh.length / 3;
                    zaifh.push(zaiff(zaifr) - zaifb * .5, 0, zaifg(zaifq) - zaifb * .5);
                    zaifh.push(zaiff(zaifr) + zaifb * .5, 0, zaifg(zaifq) - zaifb * .5);
                    zaifh.push(zaiff(zaifr) - zaifb * .5, 0, zaifg(zaifq) + zaifb * .5);
                    zaifh.push(zaiff(zaifr) + zaifb * .5, 0, zaifg(zaifq) + zaifb * .5);
                    zaifi.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
                    zaifj.push(0, 0, 1, 0, 1, 0, 0, 1, 1, 1);
                    zaifk.push(zaifs, zaifs + 2, zaifs + 1, zaifs + 1, zaifs + 2, zaifs + 3);
                } else {
                    for (var zaift = 0; zaift < 4; zaift++) {
                        var zaifu = zaifr + zaifp[zaift][0];
                        var zaifv = zaifq + zaifp[zaift][1];
                        if (this.tileAt(zaifu, zaifv) !== 1) continue;
                        var zaifw = zaifl.length / 3;
                        var zaifx = zaiff(zaifr) - zaifb * .5;
                        var zaify = zaiff(zaifr) + zaifb * .5;
                        var zaifz = zaifg(zaifq) - zaifb * .5;
                        var zaifaa = zaifg(zaifq) + zaifb * .5;
                        var zaifab = null;
                        if (zaifp[zaift][0] === 1) zaifab = [ [ zaify, 0, zaifz ], [ zaify, 0, zaifaa ], [ zaify, zaifc, zaifz ], [ zaify, zaifc, zaifaa ], [ 1, 0, 0 ] ]; else if (zaifp[zaift][0] === -1) zaifab = [ [ zaifx, 0, zaifaa ], [ zaifx, 0, zaifz ], [ zaifx, zaifc, zaifaa ], [ zaifx, zaifc, zaifz ], [ -1, 0, 0 ] ]; else if (zaifp[zaift][1] === 1) zaifab = [ [ zaify, 0, zaifaa ], [ zaifx, 0, zaifaa ], [ zaify, zaifc, zaifaa ], [ zaifx, zaifc, zaifaa ], [ 0, 0, 1 ] ]; else zaifab = [ [ zaifx, 0, zaifz ], [ zaify, 0, zaifz ], [ zaifx, zaifc, zaifz ], [ zaify, zaifc, zaifz ], [ 0, 0, -1 ] ];
                        for (var zaifac = 0; zaifac < 4; zaifac++) {
                            zaifl.push(zaifab[zaifac][0], zaifab[zaifac][1], zaifab[zaifac][2]);
                            zaifm.push(zaifab[4][0], zaifab[4][1], zaifab[4][2]);
                        }
                        zaifn.push(0, 0, 1, 0, 1, 1, 1, 1);
                        zaifo.push(zaifw, zaifw + 2, zaifw + 1, zaifw + 1, zaifw + 2, zaifw + 3);
                    }
                }
            }
        }
        var zaifad = new Mesh(faoxomgeometry(zaifh, zaifi, zaifj, zaifk), zaifa.floorMaterial || new StandardMaterial);
        var zaifae = new Mesh(faoxomgeometry(zaifl, zaifm, zaifn, zaifo), zaifa.wallMaterial || new StandardMaterial);
        return {
            floor: zaifad,
            walls: zaifae,
            floorTriangles: zaifk.length / 3,
            wallTriangles: zaifo.length / 3
        };
    }
}

class PCGGrammar {
    constructor() {}
    expand(zaifa, zaifb, zaifc) {
        var zaifd = String(zaifa === undefined ? "" : zaifa);
        zaifb = zaifb || {};
        var zaife = Math.max(0, faoxomvalue(zaifc, 0) | 0);
        for (var zaiff = 0; zaiff < zaife; zaiff++) {
            var zaifg = "";
            for (var zaifh = 0; zaifh < zaifd.length; zaifh++) {
                var zaifi = zaifd.charAt(zaifh);
                var zaifj = zaifb[zaifi];
                zaifg += zaifj === undefined ? zaifi : zaifj;
            }
            zaifd = zaifg;
        }
        return zaifd;
    }
    turtle(zaifa, zaifb) {
        zaifb = zaifb || {};
        var zaifc = faoxomvalue(zaifb.step, 1);
        var zaifd = faoxomvalue(zaifb.angle, Math.PI / 2);
        var zaife = faoxomvalue(zaifb.x, 0);
        var zaiff = faoxomvalue(zaifb.z, 0);
        var zaifg = faoxomvalue(zaifb.dir, 0);
        var zaifh = [];
        var zaifi = [];
        var zaifj = [];
        var zaifk = String(zaifa === undefined ? "" : zaifa);
        for (var zaifl = 0; zaifl < zaifk.length; zaifl++) {
            var zaifm = zaifk.charAt(zaifl);
            if (zaifm === "F") {
                var zaifn = zaife + Math.cos(zaifg) * zaifc;
                var zaifo = zaiff + Math.sin(zaifg) * zaifc;
                zaifi.push({
                    from: [ zaife, zaiff ],
                    to: [ zaifn, zaifo ]
                });
                zaifj.push({
                    position: [ (zaife + zaifn) * .5, 0, (zaiff + zaifo) * .5 ],
                    rotationY: -zaifg,
                    scale: 1
                });
                zaife = zaifn;
                zaiff = zaifo;
            } else if (zaifm === "+") {
                zaifg += zaifd;
            } else if (zaifm === "-") {
                zaifg -= zaifd;
            } else if (zaifm === "[") {
                zaifh.push({
                    x: zaife,
                    z: zaiff,
                    dir: zaifg
                });
            } else if (zaifm === "]") {
                var zaifp = zaifh.pop();
                if (zaifp) {
                    zaife = zaifp.x;
                    zaiff = zaifp.z;
                    zaifg = zaifp.dir;
                }
            }
        }
        return {
            segments: zaifi,
            transforms: zaifj,
            end: {
                x: zaife,
                z: zaiff,
                dir: zaifg
            }
        };
    }
}

export { PCGRandom, PCGNoise, PCGTerrain, PCGScatter, PCGDungeon, PCGGrammar };
