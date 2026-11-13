// PNGCodec - dependency-free PNG encode/decode + golden-image comparison
// (roadmap item 38). The encoder writes valid zlib streams using stored
// (uncompressed) deflate blocks so output is deterministic and needs no
// compression library; pass options.deflate for real compression. The decoder
// is a complete inflate implementation (stored + fixed + dynamic Huffman) and
// reconstructs all five PNG row filters. compare() produces the metrics the
// CI golden-image gate uses.

var CRC_TABLE = null;
var CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
var LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
var LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
var DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
var DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

function crcTable() {
    if (CRC_TABLE) return CRC_TABLE;
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
    }
    CRC_TABLE = table;
    return table;
}

function crc32(bytes, start, length) {
    var table = crcTable();
    var c = 0xFFFFFFFF;
    var end = (start || 0) + (length !== undefined ? length : bytes.length);
    for (var i = start || 0; i < end; i++) c = table[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function adler32(bytes) {
    var a = 1, b = 0;
    for (var i = 0; i < bytes.length; i++) {
        a = (a + bytes[i]) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}

function pngPaethPredictor(a, b, c) {
    var p = a + b - c;
    var pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

// zlib stream of stored (uncompressed) deflate blocks - deterministic, no
// compression library needed. BFINAL set on the last block.
function deflateStored(data) {
    var blockCount = Math.max(1, Math.ceil(data.length / 65535));
    var out = new Uint8Array(2 + data.length + blockCount * 5 + 4);
    var offset = 0;
    out[offset++] = 0x78; // CMF: deflate, 32K window
    out[offset++] = 0x01; // FLG: check bits valid, no dict
    var position = 0;
    while (position < data.length || blockCount === 1 && data.length === 0) {
        var remaining = data.length - position;
        var chunk = Math.min(65535, remaining);
        var isFinal = position + chunk >= data.length ? 1 : 0;
        out[offset++] = isFinal; // BFINAL + BTYPE=00, rest of byte padded
        out[offset++] = chunk & 0xFF;
        out[offset++] = (chunk >> 8) & 0xFF;
        out[offset++] = (~chunk) & 0xFF;
        out[offset++] = ((~chunk) >> 8) & 0xFF;
        if (chunk > 0) { out.set(data.subarray(position, position + chunk), offset); offset += chunk; position += chunk; }
        if (isFinal && data.length === 0) break;
        if (data.length === 0) break;
    }
    if (data.length === 0) { // single empty final block
        out[2] = 1; out[3] = 0; out[4] = 0; out[5] = 0xFF; out[6] = 0xFF; offset = 7;
    }
    var adler = adler32(data);
    out[offset++] = (adler >>> 24) & 0xFF;
    out[offset++] = (adler >>> 16) & 0xFF;
    out[offset++] = (adler >>> 8) & 0xFF;
    out[offset++] = adler & 0xFF;
    return out.subarray(0, offset);
}

function BitReader(bytes) {
    this.bytes = bytes;
    this.position = 0;
    this.bitBuffer = 0;
    this.bitCount = 0;
}
BitReader.prototype.readBit = function() {
    if (this.bitCount === 0) {
        if (this.position >= this.bytes.length) throw new Error("PNG inflate: unexpected end of stream");
        this.bitBuffer = this.bytes[this.position++];
        this.bitCount = 8;
    }
    var bit = this.bitBuffer & 1;
    this.bitBuffer >>>= 1;
    this.bitCount--;
    return bit;
};
BitReader.prototype.readBits = function(count) {
    var value = 0;
    for (var i = 0; i < count; i++) value |= this.readBit() << i;
    return value;
};
BitReader.prototype.alignByte = function() { this.bitCount = 0; };
BitReader.prototype.readByte = function() {
    if (this.position >= this.bytes.length) throw new Error("PNG inflate: unexpected end of stream");
    return this.bytes[this.position++];
};

function buildHuffman(lengths) {
    var maxLength = 15;
    var blCount = new Array(maxLength + 1).fill(0);
    var i;
    for (i = 0; i < lengths.length; i++) {
        if (lengths[i] > maxLength) throw new Error("PNG inflate: bad code length");
        blCount[lengths[i]]++;
    }
    blCount[0] = 0;
    var code = 0;
    var nextCode = new Array(maxLength + 1).fill(0);
    for (var bits = 1; bits <= maxLength; bits++) {
        code = (code + blCount[bits - 1]) << 1;
        nextCode[bits] = code;
    }
    var byLength = [];
    for (i = 0; i <= maxLength; i++) byLength.push({});
    for (i = 0; i < lengths.length; i++) {
        var length = lengths[i];
        if (length === 0) continue;
        if (nextCode[length] >= (1 << length)) throw new Error("PNG inflate: over-subscribed code");
        byLength[length][nextCode[length]++] = i;
    }
    return { byLength: byLength };
}

function decodeHuffman(reader, table) {
    var code = 0;
    for (var length = 1; length <= 15; length++) {
        code = (code << 1) | reader.readBit();
        var bucket = table.byLength[length];
        if (bucket && bucket[code] !== undefined) return bucket[code];
    }
    throw new Error("PNG inflate: invalid Huffman code");
}

function inflate(zlibBytes, options) {
    options = options || {};
    if (zlibBytes.length < 6) throw new Error("PNG inflate: stream too short");
    var cmf = zlibBytes[0], flg = zlibBytes[1];
    if ((cmf & 0x0F) !== 8) throw new Error("PNG inflate: unsupported compression method");
    if (((cmf << 8) | flg) % 31 !== 0) throw new Error("PNG inflate: bad header check");
    if (flg & 0x20) throw new Error("PNG inflate: preset dictionary not supported");
    var payload = zlibBytes.subarray(2);
    var reader = new BitReader(payload);
    var out = new Uint8Array(options.expectedSize || 65536);
    var outLength = 0;
    function ensure(extra) {
        if (outLength + extra <= out.length) return;
        var nextSize = Math.max(outLength + extra, out.length * 2);
        var next = new Uint8Array(nextSize);
        next.set(out.subarray(0, outLength));
        out = next;
    }
    var final = false;
    while (!final) {
        final = reader.readBit() === 1;
        var type = reader.readBits(2);
        if (type === 0) {
            reader.alignByte();
            var len = reader.readByte() | (reader.readByte() << 8);
            var nlen = reader.readByte() | (reader.readByte() << 8);
            if ((len ^ 0xFFFF) !== nlen) throw new Error("PNG inflate: stored block length check failed");
            ensure(len);
            for (var i = 0; i < len; i++) out[outLength++] = reader.readByte();
        } else if (type === 1 || type === 2) {
            var litTable, distTable;
            if (type === 1) {
                var fixedLengths = new Array(288);
                for (var symbol = 0; symbol < 288; symbol++) fixedLengths[symbol] = symbol <= 143 ? 8 : symbol <= 255 ? 9 : symbol <= 279 ? 7 : 8;
                litTable = buildHuffman(fixedLengths);
                distTable = buildHuffman(new Array(30).fill(5));
            } else {
                var hlit = reader.readBits(5) + 257;
                var hdist = reader.readBits(5) + 1;
                var hclen = reader.readBits(4) + 4;
                var clLengths = new Array(19).fill(0);
                for (var clIndex = 0; clIndex < hclen; clIndex++) clLengths[CL_ORDER[clIndex]] = reader.readBits(3);
                var clTable = buildHuffman(clLengths);
                var codeLengths = [];
                var total = hlit + hdist;
                while (codeLengths.length < total) {
                    var decoded = decodeHuffman(reader, clTable);
                    if (decoded < 16) codeLengths.push(decoded);
                    else if (decoded === 16) {
                        if (!codeLengths.length) throw new Error("PNG inflate: repeat with no previous length");
                        var repeatPrev = reader.readBits(2) + 3;
                        var previous = codeLengths[codeLengths.length - 1];
                        for (var rp = 0; rp < repeatPrev; rp++) codeLengths.push(previous);
                    } else if (decoded === 17) {
                        var repeatZero = reader.readBits(3) + 3;
                        for (var rz = 0; rz < repeatZero; rz++) codeLengths.push(0);
                    } else {
                        var repeatLong = reader.readBits(7) + 11;
                        for (var rl = 0; rl < repeatLong; rl++) codeLengths.push(0);
                    }
                }
                if (codeLengths.length > total) throw new Error("PNG inflate: code length overflow");
                litTable = buildHuffman(codeLengths.slice(0, hlit));
                distTable = buildHuffman(codeLengths.slice(hlit, total));
            }
            for (;;) {
                var lit = decodeHuffman(reader, litTable);
                if (lit < 256) {
                    ensure(1);
                    out[outLength++] = lit;
                } else if (lit === 256) {
                    break;
                } else {
                    if (lit > 285) throw new Error("PNG inflate: invalid length symbol");
                    var lengthIndex = lit - 257;
                    var matchLength = LENGTH_BASE[lengthIndex] + reader.readBits(LENGTH_EXTRA[lengthIndex]);
                    var distSymbol = decodeHuffman(reader, distTable);
                    if (distSymbol > 29) throw new Error("PNG inflate: invalid distance symbol");
                    var distance = DIST_BASE[distSymbol] + reader.readBits(DIST_EXTRA[distSymbol]);
                    if (distance > outLength) throw new Error("PNG inflate: distance beyond output");
                    ensure(matchLength);
                    for (var m = 0; m < matchLength; m++) {
                        out[outLength] = out[outLength - distance];
                        outLength++;
                    }
                }
            }
        } else {
            throw new Error("PNG inflate: reserved block type");
        }
    }
    var produced = out.subarray(0, outLength);
    if (options.verifyAdler !== false) {
        var trailerStart = payload.length - 4;
        var expected = ((payload[trailerStart] << 24) | (payload[trailerStart + 1] << 16) | (payload[trailerStart + 2] << 8) | payload[trailerStart + 3]) >>> 0;
        var actual = adler32(produced);
        if (expected !== actual) throw new Error("PNG inflate: adler32 mismatch (corrupt stream)");
    }
    return produced;
}

function writeUint32BE(target, offset, value) {
    target[offset] = (value >>> 24) & 0xFF;
    target[offset + 1] = (value >>> 16) & 0xFF;
    target[offset + 2] = (value >>> 8) & 0xFF;
    target[offset + 3] = value & 0xFF;
    return offset + 4;
}

function pngChunk(type, data) {
    var out = new Uint8Array(12 + data.length);
    writeUint32BE(out, 0, data.length);
    for (var i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    writeUint32BE(out, 8 + data.length, crc32(out, 4, 4 + data.length));
    return out;
}

class PNGCodec {
    // rgba: Uint8Array (or array-like) of width*height*4 bytes.
    // options.filter: row filter applied to every scanline (0-4, default 0) -
    // exists to exercise the decoder; options.deflate(bytes) replaces the
    // stored-block compressor (e.g. node:zlib deflateSync).
    static encode(width, height, rgba, options) {
        options = options || {};
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error("PNGCodec.encode: invalid dimensions");
        var expected = width * height * 4;
        if (!rgba || rgba.length < expected) throw new Error("PNGCodec.encode: pixel buffer too small (" + (rgba ? rgba.length : 0) + " < " + expected + ")");
        var filterType = options.filter !== undefined ? options.filter : 0;
        if (filterType < 0 || filterType > 4) throw new Error("PNGCodec.encode: filter must be 0-4");
        var bpp = 4;
        var stride = width * bpp;
        var raw = new Uint8Array(rgba.buffer || rgba);
        var rawOffset = rgba.byteOffset || 0;
        var filtered = new Uint8Array((stride + 1) * height);
        for (var y = 0; y < height; y++) {
            var rowStart = rawOffset + y * stride;
            filtered[y * (stride + 1)] = filterType;
            for (var x = 0; x < stride; x++) {
                var value = raw[rowStart + x];
                var left = x >= bpp ? raw[rowStart + x - bpp] : 0;
                var up = y > 0 ? raw[rowStart - stride + x] : 0;
                var upLeft = y > 0 && x >= bpp ? raw[rowStart - stride + x - bpp] : 0;
                var predictor = filterType === 1 ? left : filterType === 2 ? up : filterType === 3 ? Math.floor((left + up) / 2) : filterType === 4 ? pngPaethPredictor(left, up, upLeft) : 0;
                filtered[y * (stride + 1) + 1 + x] = (value - predictor) & 0xFF;
            }
        }
        var deflated = options.deflate ? options.deflate(filtered) : deflateStored(filtered);
        var ihdr = new Uint8Array(13);
        writeUint32BE(ihdr, 0, width);
        writeUint32BE(ihdr, 4, height);
        ihdr[8] = 8;   // bit depth
        ihdr[9] = 6;   // color type RGBA
        ihdr[10] = 0;  // compression
        ihdr[11] = 0;  // filter
        ihdr[12] = 0;  // interlace
        var signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
        var parts = [signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflated), pngChunk("IEND", new Uint8Array(0))];
        var total = 0;
        for (var p = 0; p < parts.length; p++) total += parts[p].length;
        var out = new Uint8Array(total);
        var offset = 0;
        for (var q = 0; q < parts.length; q++) { out.set(parts[q], offset); offset += parts[q].length; }
        return out;
    }

    // Returns { width, height, rgba } for 8-bit non-interlaced grayscale,
    // RGB or RGBA PNGs.
    static decode(bytes) {
        if (!bytes || bytes.length < 8) throw new Error("PNGCodec.decode: too short");
        var signature = [137, 80, 78, 71, 13, 10, 26, 10];
        for (var s = 0; s < 8; s++) if (bytes[s] !== signature[s]) throw new Error("PNGCodec.decode: bad signature");
        var offset = 8;
        var width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = 0;
        var idat = [];
        while (offset + 8 <= bytes.length) {
            var length = ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
            var type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
            var data = bytes.subarray(offset + 8, offset + 8 + length);
            if (offset + 12 + length > bytes.length) throw new Error("PNGCodec.decode: truncated chunk " + type);
            var crcExpected = ((bytes[offset + 8 + length] << 24) | (bytes[offset + 9 + length] << 16) | (bytes[offset + 10 + length] << 8) | bytes[offset + 11 + length]) >>> 0;
            if (crc32(bytes, offset + 4, 4 + length) !== crcExpected) throw new Error("PNGCodec.decode: chunk CRC mismatch in " + type);
            if (type === "IHDR") {
                width = ((data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]) >>> 0;
                height = ((data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7]) >>> 0;
                bitDepth = data[8];
                colorType = data[9];
                interlace = data[12];
            } else if (type === "IDAT") {
                idat.push(data);
            } else if (type === "IEND") {
                break;
            }
            offset += 12 + length;
        }
        if (colorType < 0) throw new Error("PNGCodec.decode: missing IHDR");
        if (!idat.length) throw new Error("PNGCodec.decode: missing IDAT");
        if (bitDepth !== 8) throw new Error("PNGCodec.decode: unsupported bit depth " + bitDepth + " (only 8)");
        if (colorType !== 0 && colorType !== 2 && colorType !== 6) throw new Error("PNGCodec.decode: unsupported color type " + colorType);
        if (interlace !== 0) throw new Error("PNGCodec.decode: interlaced PNG not supported");
        var channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
        var stride = width * channels;
        var expectedSize = (stride + 1) * height;
        var compressedLength = 0;
        for (var i = 0; i < idat.length; i++) compressedLength += idat[i].length;
        var compressed = new Uint8Array(compressedLength);
        var fill = 0;
        for (var j = 0; j < idat.length; j++) { compressed.set(idat[j], fill); fill += idat[j].length; }
        var decompressed = inflate(compressed, { expectedSize: expectedSize });
        if (decompressed.length < expectedSize) throw new Error("PNGCodec.decode: not enough image data (" + decompressed.length + " < " + expectedSize + ")");
        var rgba = new Uint8Array(width * height * 4);
        var bpp = channels;
        for (var y = 0; y < height; y++) {
            var rowStart = y * (stride + 1);
            var filter = decompressed[rowStart];
            var row = rowStart + 1;
            for (var x = 0; x < stride; x++) {
                var value = decompressed[row + x];
                var left = x >= bpp ? decompressed[row + x - bpp] : 0;
                var up = y > 0 ? decompressed[row - (stride + 1) + x] : 0;
                var upLeft = y > 0 && x >= bpp ? decompressed[row - (stride + 1) + x - bpp] : 0;
                var reconstructor = filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? pngPaethPredictor(left, up, upLeft) : 0;
                var reconstructed = (value + reconstructor) & 0xFF;
                decompressed[row + x] = reconstructed;
                var pixel = Math.floor(x / channels), channel = x % channels;
                var target = (y * width + pixel) * 4;
                if (channels === 4) rgba[target + channel] = reconstructed;
                else if (channels === 3) {
                    if (channel < 3) rgba[target + channel] = reconstructed;
                    if (channel === 2) rgba[target + 3] = 255;
                } else {
                    if (channel === 0) { rgba[target] = rgba[target + 1] = rgba[target + 2] = reconstructed; rgba[target + 3] = 255; }
                }
            }
        }
        return { width: width, height: height, rgba: rgba };
    }

    // Golden-image comparison. a and b are { width, height, rgba } (decode()
    // results or raw buffers). Tolerances: perChannel (max abs channel delta),
    // maxMean (mean abs per-channel diff), maxDiffRatio (fraction of pixels
    // allowed to exceed perChannel).
    static compare(a, b, options) {
        options = options || {};
        var perChannel = options.perChannel !== undefined ? options.perChannel : 2;
        var maxMean = options.maxMean !== undefined ? options.maxMean : 1.0;
        var maxDiffRatio = options.maxDiffRatio !== undefined ? options.maxDiffRatio : 0.002;
        if (!a || !b || !a.rgba || !b.rgba) return { passed: false, error: "missing image data" };
        if (a.width !== b.width || a.height !== b.height) return { passed: false, error: "size mismatch " + a.width + "x" + a.height + " vs " + b.width + "x" + b.height };
        var count = a.width * a.height;
        if (a.rgba.length < count * 4 || b.rgba.length < count * 4) return { passed: false, error: "pixel buffer too small" };
        var totalDiff = 0, maxAbsDiff = 0, diffPixels = 0;
        for (var i = 0; i < count; i++) {
            var pixelDiff = false;
            for (var c = 0; c < 4; c++) {
                var delta = Math.abs(a.rgba[i * 4 + c] - b.rgba[i * 4 + c]);
                if (delta > maxAbsDiff) maxAbsDiff = delta;
                totalDiff += delta;
                if (delta > perChannel) pixelDiff = true;
            }
            if (pixelDiff) diffPixels++;
        }
        var meanAbsDiff = totalDiff / (count * 4);
        var diffRatio = count ? diffPixels / count : 0;
        var mse = 0;
        for (var m = 0; m < count * 4; m++) { var d = a.rgba[m] - b.rgba[m]; mse += d * d; }
        mse /= (count * 4);
        var psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
        var passed = maxAbsDiff <= perChannel || (meanAbsDiff <= maxMean && diffRatio <= maxDiffRatio);
        return { passed: passed, width: a.width, height: b.height, meanAbsDiff: meanAbsDiff, maxAbsDiff: maxAbsDiff, diffPixels: diffPixels, diffRatio: diffRatio, psnr: psnr, thresholds: { perChannel: perChannel, maxMean: maxMean, maxDiffRatio: maxDiffRatio } };
    }

    // Deterministic 32-bit FNV-1a fingerprint of a pixel buffer (hex string).
    static hashPixels(rgba) {
        if (!rgba) return "0";
        var hash = 0x811c9dc5;
        for (var i = 0; i < rgba.length; i++) {
            hash ^= rgba[i];
            hash = (hash * 0x01000193) >>> 0;
        }
        return ("00000000" + hash.toString(16)).slice(-8);
    }

    static inflate(zlibBytes, options) { return inflate(zlibBytes, options); }
    static deflateStored(data) { return deflateStored(data); }
    static crc32(bytes) { return crc32(bytes, 0, bytes.length); }
    static adler32(bytes) { return adler32(bytes); }
}

export { PNGCodec };
