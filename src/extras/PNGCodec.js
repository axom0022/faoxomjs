var zaiga = null;

var zaigb = [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ];

var zaigc = [ 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258 ];

var zaigd = [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0 ];

var zaige = [ 1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577 ];

var zaigf = [ 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13 ];

function zaigg() {
    if (zaiga) return zaiga;
    var zaigb = new Uint32Array(256);
    for (var zaigc = 0; zaigc < 256; zaigc++) {
        var zaigd = zaigc;
        for (var zaige = 0; zaige < 8; zaige++) zaigd = zaigd & 1 ? 3988292384 ^ zaigd >>> 1 : zaigd >>> 1;
        zaigb[zaigc] = zaigd >>> 0;
    }
    zaiga = zaigb;
    return zaigb;
}

function zaigh(zaiga, zaigb, zaigc) {
    var zaigd = zaigg();
    var zaige = 4294967295;
    var zaigf = (zaigb || 0) + (zaigc !== undefined ? zaigc : zaiga.length);
    for (var zaigh = zaigb || 0; zaigh < zaigf; zaigh++) zaige = zaigd[(zaige ^ zaiga[zaigh]) & 255] ^ zaige >>> 8;
    return (zaige ^ 4294967295) >>> 0;
}

function zaigi(zaiga) {
    var zaigb = 1, zaigc = 0;
    for (var zaigd = 0; zaigd < zaiga.length; zaigd++) {
        zaigb = (zaigb + zaiga[zaigd]) % 65521;
        zaigc = (zaigc + zaigb) % 65521;
    }
    return (zaigc << 16 | zaigb) >>> 0;
}

function zaigj(zaiga, zaigb, zaigc) {
    var zaigd = zaiga + zaigb - zaigc;
    var zaige = Math.abs(zaigd - zaiga), zaigf = Math.abs(zaigd - zaigb), zaigg = Math.abs(zaigd - zaigc);
    if (zaige <= zaigf && zaige <= zaigg) return zaiga;
    if (zaigf <= zaigg) return zaigb;
    return zaigc;
}

function zaigk(zaiga) {
    var zaigb = Math.max(1, Math.ceil(zaiga.length / 65535));
    var zaigc = new Uint8Array(2 + zaiga.length + zaigb * 5 + 4);
    var zaigd = 0;
    zaigc[zaigd++] = 120;
    zaigc[zaigd++] = 1;
    var zaige = 0;
    while (zaige < zaiga.length || zaigb === 1 && zaiga.length === 0) {
        var zaigf = zaiga.length - zaige;
        var zaigg = Math.min(65535, zaigf);
        var zaigh = zaige + zaigg >= zaiga.length ? 1 : 0;
        zaigc[zaigd++] = zaigh;
        zaigc[zaigd++] = zaigg & 255;
        zaigc[zaigd++] = zaigg >> 8 & 255;
        zaigc[zaigd++] = ~zaigg & 255;
        zaigc[zaigd++] = ~zaigg >> 8 & 255;
        if (zaigg > 0) {
            zaigc.set(zaiga.subarray(zaige, zaige + zaigg), zaigd);
            zaigd += zaigg;
            zaige += zaigg;
        }
        if (zaigh && zaiga.length === 0) break;
        if (zaiga.length === 0) break;
    }
    if (zaiga.length === 0) {
        zaigc[2] = 1;
        zaigc[3] = 0;
        zaigc[4] = 0;
        zaigc[5] = 255;
        zaigc[6] = 255;
        zaigd = 7;
    }
    var zaigj = zaigi(zaiga);
    zaigc[zaigd++] = zaigj >>> 24 & 255;
    zaigc[zaigd++] = zaigj >>> 16 & 255;
    zaigc[zaigd++] = zaigj >>> 8 & 255;
    zaigc[zaigd++] = zaigj & 255;
    return zaigc.subarray(0, zaigd);
}

function zaigl(zaiga) {
    this.bytes = zaiga;
    this.position = 0;
    this.bitBuffer = 0;
    this.bitCount = 0;
}

zaigl.prototype.readBit = function() {
    if (this.bitCount === 0) {
        if (this.position >= this.bytes.length) throw new Error("PNG inflate: unexpected end of stream");
        this.bitBuffer = this.bytes[this.position++];
        this.bitCount = 8;
    }
    var zaiga = this.bitBuffer & 1;
    this.bitBuffer >>>= 1;
    this.bitCount--;
    return zaiga;
};

zaigl.prototype.readBits = function(zaiga) {
    var zaigb = 0;
    for (var zaigc = 0; zaigc < zaiga; zaigc++) zaigb |= this.readBit() << zaigc;
    return zaigb;
};

zaigl.prototype.alignByte = function() {
    this.bitCount = 0;
};

zaigl.prototype.readByte = function() {
    if (this.position >= this.bytes.length) throw new Error("PNG inflate: unexpected end of stream");
    return this.bytes[this.position++];
};

function zaigm(zaiga) {
    var zaigb = 15;
    var zaigc = new Array(zaigb + 1).fill(0);
    var zaigd;
    for (zaigd = 0; zaigd < zaiga.length; zaigd++) {
        if (zaiga[zaigd] > zaigb) throw new Error("PNG inflate: bad code length");
        zaigc[zaiga[zaigd]]++;
    }
    zaigc[0] = 0;
    var zaige = 0;
    var zaigf = new Array(zaigb + 1).fill(0);
    for (var zaigg = 1; zaigg <= zaigb; zaigg++) {
        zaige = zaige + zaigc[zaigg - 1] << 1;
        zaigf[zaigg] = zaige;
    }
    var zaigh = [];
    for (zaigd = 0; zaigd <= zaigb; zaigd++) zaigh.push({});
    for (zaigd = 0; zaigd < zaiga.length; zaigd++) {
        var zaigi = zaiga[zaigd];
        if (zaigi === 0) continue;
        if (zaigf[zaigi] >= 1 << zaigi) throw new Error("PNG inflate: over-subscribed code");
        zaigh[zaigi][zaigf[zaigi]++] = zaigd;
    }
    return {
        byLength: zaigh
    };
}

function zaign(zaiga, zaigb) {
    var zaigc = 0;
    for (var zaigd = 1; zaigd <= 15; zaigd++) {
        zaigc = zaigc << 1 | zaiga.readBit();
        var zaige = zaigb.byLength[zaigd];
        if (zaige && zaige[zaigc] !== undefined) return zaige[zaigc];
    }
    throw new Error("PNG inflate: invalid Huffman code");
}

function zaigo(zaiga, zaigg) {
    zaigg = zaigg || {};
    if (zaiga.length < 6) throw new Error("PNG inflate: stream too short");
    var zaigh = zaiga[0], zaigj = zaiga[1];
    if ((zaigh & 15) !== 8) throw new Error("PNG inflate: unsupported compression method");
    if ((zaigh << 8 | zaigj) % 31 !== 0) throw new Error("PNG inflate: bad header check");
    if (zaigj & 32) throw new Error("PNG inflate: preset dictionary not supported");
    var zaigk = zaiga.subarray(2);
    var zaigo = new zaigl(zaigk);
    var zaigp = new Uint8Array(zaigg.expectedSize || 65536);
    var zaigq = 0;
    function zaigr(zaiga) {
        if (zaigq + zaiga <= zaigp.length) return;
        var zaigb = Math.max(zaigq + zaiga, zaigp.length * 2);
        var zaigc = new Uint8Array(zaigb);
        zaigc.set(zaigp.subarray(0, zaigq));
        zaigp = zaigc;
    }
    var zaigs = false;
    while (!zaigs) {
        zaigs = zaigo.readBit() === 1;
        var zaigt = zaigo.readBits(2);
        if (zaigt === 0) {
            zaigo.alignByte();
            var zaigu = zaigo.readByte() | zaigo.readByte() << 8;
            var zaigv = zaigo.readByte() | zaigo.readByte() << 8;
            if ((zaigu ^ 65535) !== zaigv) throw new Error("PNG inflate: stored block length check failed");
            zaigr(zaigu);
            for (var zaigw = 0; zaigw < zaigu; zaigw++) zaigp[zaigq++] = zaigo.readByte();
        } else if (zaigt === 1 || zaigt === 2) {
            var zaigx, zaigy;
            if (zaigt === 1) {
                var zaigz = new Array(288);
                for (var zaigaa = 0; zaigaa < 288; zaigaa++) zaigz[zaigaa] = zaigaa <= 143 ? 8 : zaigaa <= 255 ? 9 : zaigaa <= 279 ? 7 : 8;
                zaigx = zaigm(zaigz);
                zaigy = zaigm(new Array(30).fill(5));
            } else {
                var zaigab = zaigo.readBits(5) + 257;
                var zaigac = zaigo.readBits(5) + 1;
                var zaigad = zaigo.readBits(4) + 4;
                var zaigae = new Array(19).fill(0);
                for (var zaigaf = 0; zaigaf < zaigad; zaigaf++) zaigae[zaigb[zaigaf]] = zaigo.readBits(3);
                var zaigag = zaigm(zaigae);
                var zaigah = [];
                var zaigai = zaigab + zaigac;
                while (zaigah.length < zaigai) {
                    var zaigaj = zaign(zaigo, zaigag);
                    if (zaigaj < 16) zaigah.push(zaigaj); else if (zaigaj === 16) {
                        if (!zaigah.length) throw new Error("PNG inflate: repeat with no previous length");
                        var zaigak = zaigo.readBits(2) + 3;
                        var zaigal = zaigah[zaigah.length - 1];
                        for (var zaigam = 0; zaigam < zaigak; zaigam++) zaigah.push(zaigal);
                    } else if (zaigaj === 17) {
                        var zaigan = zaigo.readBits(3) + 3;
                        for (var zaigao = 0; zaigao < zaigan; zaigao++) zaigah.push(0);
                    } else {
                        var zaigap = zaigo.readBits(7) + 11;
                        for (var zaigaq = 0; zaigaq < zaigap; zaigaq++) zaigah.push(0);
                    }
                }
                if (zaigah.length > zaigai) throw new Error("PNG inflate: code length overflow");
                zaigx = zaigm(zaigah.slice(0, zaigab));
                zaigy = zaigm(zaigah.slice(zaigab, zaigai));
            }
            for (;;) {
                var zaigar = zaign(zaigo, zaigx);
                if (zaigar < 256) {
                    zaigr(1);
                    zaigp[zaigq++] = zaigar;
                } else if (zaigar === 256) {
                    break;
                } else {
                    if (zaigar > 285) throw new Error("PNG inflate: invalid length symbol");
                    var zaigas = zaigar - 257;
                    var zaigat = zaigc[zaigas] + zaigo.readBits(zaigd[zaigas]);
                    var zaigau = zaign(zaigo, zaigy);
                    if (zaigau > 29) throw new Error("PNG inflate: invalid distance symbol");
                    var zaigav = zaige[zaigau] + zaigo.readBits(zaigf[zaigau]);
                    if (zaigav > zaigq) throw new Error("PNG inflate: distance beyond output");
                    zaigr(zaigat);
                    for (var zaigaw = 0; zaigaw < zaigat; zaigaw++) {
                        zaigp[zaigq] = zaigp[zaigq - zaigav];
                        zaigq++;
                    }
                }
            }
        } else {
            throw new Error("PNG inflate: reserved block type");
        }
    }
    var zaigax = zaigp.subarray(0, zaigq);
    if (zaigg.verifyAdler !== false) {
        var zaigay = zaigk.length - 4;
        var zaigaz = (zaigk[zaigay] << 24 | zaigk[zaigay + 1] << 16 | zaigk[zaigay + 2] << 8 | zaigk[zaigay + 3]) >>> 0;
        var zaigba = zaigi(zaigax);
        if (zaigaz !== zaigba) throw new Error("PNG inflate: adler32 mismatch (corrupt stream)");
    }
    return zaigax;
}

function zaigp(zaiga, zaigb, zaigc) {
    zaiga[zaigb] = zaigc >>> 24 & 255;
    zaiga[zaigb + 1] = zaigc >>> 16 & 255;
    zaiga[zaigb + 2] = zaigc >>> 8 & 255;
    zaiga[zaigb + 3] = zaigc & 255;
    return zaigb + 4;
}

function zaigq(zaiga, zaigb) {
    var zaigc = new Uint8Array(12 + zaigb.length);
    zaigp(zaigc, 0, zaigb.length);
    for (var zaigd = 0; zaigd < 4; zaigd++) zaigc[4 + zaigd] = zaiga.charCodeAt(zaigd);
    zaigc.set(zaigb, 8);
    zaigp(zaigc, 8 + zaigb.length, zaigh(zaigc, 4, 4 + zaigb.length));
    return zaigc;
}

class PNGCodec {
    static encode(zaiga, zaigb, zaigc, zaigd) {
        zaigd = zaigd || {};
        if (!Number.isFinite(zaiga) || !Number.isFinite(zaigb) || zaiga <= 0 || zaigb <= 0) throw new Error("PNGCodec.encode: invalid dimensions");
        var zaige = zaiga * zaigb * 4;
        if (!zaigc || zaigc.length < zaige) throw new Error("PNGCodec.encode: pixel buffer too small (" + (zaigc ? zaigc.length : 0) + " < " + zaige + ")");
        var zaigf = zaigd.filter !== undefined ? zaigd.filter : 0;
        if (zaigf < 0 || zaigf > 4) throw new Error("PNGCodec.encode: filter must be 0-4");
        var zaigg = 4;
        var zaigh = zaiga * zaigg;
        var zaigi = new Uint8Array(zaigc.buffer || zaigc);
        var zaigl = zaigc.byteOffset || 0;
        var zaigm = new Uint8Array((zaigh + 1) * zaigb);
        for (var zaign = 0; zaign < zaigb; zaign++) {
            var zaigo = zaigl + zaign * zaigh;
            zaigm[zaign * (zaigh + 1)] = zaigf;
            for (var zaigr = 0; zaigr < zaigh; zaigr++) {
                var zaigs = zaigi[zaigo + zaigr];
                var zaigt = zaigr >= zaigg ? zaigi[zaigo + zaigr - zaigg] : 0;
                var zaigu = zaign > 0 ? zaigi[zaigo - zaigh + zaigr] : 0;
                var zaigv = zaign > 0 && zaigr >= zaigg ? zaigi[zaigo - zaigh + zaigr - zaigg] : 0;
                var zaigw = zaigf === 1 ? zaigt : zaigf === 2 ? zaigu : zaigf === 3 ? Math.floor((zaigt + zaigu) / 2) : zaigf === 4 ? zaigj(zaigt, zaigu, zaigv) : 0;
                zaigm[zaign * (zaigh + 1) + 1 + zaigr] = zaigs - zaigw & 255;
            }
        }
        var zaigx = zaigd.deflate ? zaigd.deflate(zaigm) : zaigk(zaigm);
        var zaigy = new Uint8Array(13);
        zaigp(zaigy, 0, zaiga);
        zaigp(zaigy, 4, zaigb);
        zaigy[8] = 8;
        zaigy[9] = 6;
        zaigy[10] = 0;
        zaigy[11] = 0;
        zaigy[12] = 0;
        var zaigz = new Uint8Array([ 137, 80, 78, 71, 13, 10, 26, 10 ]);
        var zaigaa = [ zaigz, zaigq("IHDR", zaigy), zaigq("IDAT", zaigx), zaigq("IEND", new Uint8Array(0)) ];
        var zaigab = 0;
        for (var zaigac = 0; zaigac < zaigaa.length; zaigac++) zaigab += zaigaa[zaigac].length;
        var zaigad = new Uint8Array(zaigab);
        var zaigae = 0;
        for (var zaigaf = 0; zaigaf < zaigaa.length; zaigaf++) {
            zaigad.set(zaigaa[zaigaf], zaigae);
            zaigae += zaigaa[zaigaf].length;
        }
        return zaigad;
    }
    static decode(zaiga) {
        if (!zaiga || zaiga.length < 8) throw new Error("PNGCodec.decode: too short");
        var zaigb = [ 137, 80, 78, 71, 13, 10, 26, 10 ];
        for (var zaigc = 0; zaigc < 8; zaigc++) if (zaiga[zaigc] !== zaigb[zaigc]) throw new Error("PNGCodec.decode: bad signature");
        var zaigd = 8;
        var zaige = 0, zaigf = 0, zaigg = 0, zaigi = -1, zaigk = 0;
        var zaigl = [];
        while (zaigd + 8 <= zaiga.length) {
            var zaigm = (zaiga[zaigd] << 24 | zaiga[zaigd + 1] << 16 | zaiga[zaigd + 2] << 8 | zaiga[zaigd + 3]) >>> 0;
            var zaign = String.fromCharCode(zaiga[zaigd + 4], zaiga[zaigd + 5], zaiga[zaigd + 6], zaiga[zaigd + 7]);
            var zaigp = zaiga.subarray(zaigd + 8, zaigd + 8 + zaigm);
            if (zaigd + 12 + zaigm > zaiga.length) throw new Error("PNGCodec.decode: truncated chunk " + zaign);
            var zaigq = (zaiga[zaigd + 8 + zaigm] << 24 | zaiga[zaigd + 9 + zaigm] << 16 | zaiga[zaigd + 10 + zaigm] << 8 | zaiga[zaigd + 11 + zaigm]) >>> 0;
            if (zaigh(zaiga, zaigd + 4, 4 + zaigm) !== zaigq) throw new Error("PNGCodec.decode: chunk CRC mismatch in " + zaign);
            if (zaign === "IHDR") {
                zaige = (zaigp[0] << 24 | zaigp[1] << 16 | zaigp[2] << 8 | zaigp[3]) >>> 0;
                zaigf = (zaigp[4] << 24 | zaigp[5] << 16 | zaigp[6] << 8 | zaigp[7]) >>> 0;
                zaigg = zaigp[8];
                zaigi = zaigp[9];
                zaigk = zaigp[12];
            } else if (zaign === "IDAT") {
                zaigl.push(zaigp);
            } else if (zaign === "IEND") {
                break;
            }
            zaigd += 12 + zaigm;
        }
        if (zaigi < 0) throw new Error("PNGCodec.decode: missing IHDR");
        if (!zaigl.length) throw new Error("PNGCodec.decode: missing IDAT");
        if (zaigg !== 8) throw new Error("PNGCodec.decode: unsupported bit depth " + zaigg + " (only 8)");
        if (zaigi !== 0 && zaigi !== 2 && zaigi !== 6) throw new Error("PNGCodec.decode: unsupported color type " + zaigi);
        if (zaigk !== 0) throw new Error("PNGCodec.decode: interlaced PNG not supported");
        var zaigr = zaigi === 6 ? 4 : zaigi === 2 ? 3 : 1;
        var zaigs = zaige * zaigr;
        var zaigt = (zaigs + 1) * zaigf;
        var zaigu = 0;
        for (var zaigv = 0; zaigv < zaigl.length; zaigv++) zaigu += zaigl[zaigv].length;
        var zaigw = new Uint8Array(zaigu);
        var zaigx = 0;
        for (var zaigy = 0; zaigy < zaigl.length; zaigy++) {
            zaigw.set(zaigl[zaigy], zaigx);
            zaigx += zaigl[zaigy].length;
        }
        var zaigz = zaigo(zaigw, {
            expectedSize: zaigt
        });
        if (zaigz.length < zaigt) throw new Error("PNGCodec.decode: not enough image data (" + zaigz.length + " < " + zaigt + ")");
        var zaigaa = new Uint8Array(zaige * zaigf * 4);
        var zaigab = zaigr;
        for (var zaigac = 0; zaigac < zaigf; zaigac++) {
            var zaigad = zaigac * (zaigs + 1);
            var zaigae = zaigz[zaigad];
            var zaigaf = zaigad + 1;
            for (var zaigag = 0; zaigag < zaigs; zaigag++) {
                var zaigah = zaigz[zaigaf + zaigag];
                var zaigai = zaigag >= zaigab ? zaigz[zaigaf + zaigag - zaigab] : 0;
                var zaigaj = zaigac > 0 ? zaigz[zaigaf - (zaigs + 1) + zaigag] : 0;
                var zaigak = zaigac > 0 && zaigag >= zaigab ? zaigz[zaigaf - (zaigs + 1) + zaigag - zaigab] : 0;
                var zaigal = zaigae === 1 ? zaigai : zaigae === 2 ? zaigaj : zaigae === 3 ? Math.floor((zaigai + zaigaj) / 2) : zaigae === 4 ? zaigj(zaigai, zaigaj, zaigak) : 0;
                var zaigam = zaigah + zaigal & 255;
                zaigz[zaigaf + zaigag] = zaigam;
                var zaigan = Math.floor(zaigag / zaigr), zaigao = zaigag % zaigr;
                var zaigap = (zaigac * zaige + zaigan) * 4;
                if (zaigr === 4) zaigaa[zaigap + zaigao] = zaigam; else if (zaigr === 3) {
                    if (zaigao < 3) zaigaa[zaigap + zaigao] = zaigam;
                    if (zaigao === 2) zaigaa[zaigap + 3] = 255;
                } else {
                    if (zaigao === 0) {
                        zaigaa[zaigap] = zaigaa[zaigap + 1] = zaigaa[zaigap + 2] = zaigam;
                        zaigaa[zaigap + 3] = 255;
                    }
                }
            }
        }
        return {
            width: zaige,
            height: zaigf,
            rgba: zaigaa
        };
    }
    static compare(zaiga, zaigb, zaigc) {
        zaigc = zaigc || {};
        var zaigd = zaigc.perChannel !== undefined ? zaigc.perChannel : 2;
        var zaige = zaigc.maxMean !== undefined ? zaigc.maxMean : 1;
        var zaigf = zaigc.maxDiffRatio !== undefined ? zaigc.maxDiffRatio : .002;
        if (!zaiga || !zaigb || !zaiga.rgba || !zaigb.rgba) return {
            passed: false,
            error: "missing image data"
        };
        if (zaiga.width !== zaigb.width || zaiga.height !== zaigb.height) return {
            passed: false,
            error: "size mismatch " + zaiga.width + "x" + zaiga.height + " vs " + zaigb.width + "x" + zaigb.height
        };
        var zaigg = zaiga.width * zaiga.height;
        if (zaiga.rgba.length < zaigg * 4 || zaigb.rgba.length < zaigg * 4) return {
            passed: false,
            error: "pixel buffer too small"
        };
        var zaigh = 0, zaigi = 0, zaigj = 0;
        for (var zaigk = 0; zaigk < zaigg; zaigk++) {
            var zaigl = false;
            for (var zaigm = 0; zaigm < 4; zaigm++) {
                var zaign = Math.abs(zaiga.rgba[zaigk * 4 + zaigm] - zaigb.rgba[zaigk * 4 + zaigm]);
                if (zaign > zaigi) zaigi = zaign;
                zaigh += zaign;
                if (zaign > zaigd) zaigl = true;
            }
            if (zaigl) zaigj++;
        }
        var zaigo = zaigh / (zaigg * 4);
        var zaigp = zaigg ? zaigj / zaigg : 0;
        var zaigq = 0;
        for (var zaigr = 0; zaigr < zaigg * 4; zaigr++) {
            var zaigs = zaiga.rgba[zaigr] - zaigb.rgba[zaigr];
            zaigq += zaigs * zaigs;
        }
        zaigq /= zaigg * 4;
        var zaigt = zaigq === 0 ? Infinity : 10 * Math.log10(255 * 255 / zaigq);
        var zaigu = zaigi <= zaigd || zaigo <= zaige && zaigp <= zaigf;
        return {
            passed: zaigu,
            width: zaiga.width,
            height: zaigb.height,
            meanAbsDiff: zaigo,
            maxAbsDiff: zaigi,
            diffPixels: zaigj,
            diffRatio: zaigp,
            psnr: zaigt,
            thresholds: {
                perChannel: zaigd,
                maxMean: zaige,
                maxDiffRatio: zaigf
            }
        };
    }
    static hashPixels(zaiga) {
        if (!zaiga) return "0";
        var zaigb = 2166136261;
        for (var zaigc = 0; zaigc < zaiga.length; zaigc++) {
            zaigb ^= zaiga[zaigc];
            zaigb = zaigb * 16777619 >>> 0;
        }
        return ("00000000" + zaigb.toString(16)).slice(-8);
    }
    static inflate(zaiga, zaigb) {
        return zaigo(zaiga, zaigb);
    }
    static deflateStored(zaiga) {
        return zaigk(zaiga);
    }
    static crc32(zaiga) {
        return zaigh(zaiga, 0, zaiga.length);
    }
    static adler32(zaiga) {
        return zaigi(zaiga);
    }
}

export { PNGCodec };
