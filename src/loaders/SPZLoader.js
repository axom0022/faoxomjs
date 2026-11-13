import { FileLoader } from "./FileLoader.js";

var SH_C0 = 0.28209479177387814;
var COLOR_SCALE = 0.15;
var SQRT_HALF = Math.SQRT2 / 2;

async function gunzip(bytes) {
    if (typeof DecompressionStream !== "undefined") {
        var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        var zlib = await import("node:zlib");
        return new Uint8Array(zlib.gunzipSync(bytes));
    }
    throw new Error("SPZ requires DecompressionStream or Node zlib");
}

function halfToFloat(h) {
    var s = (h & 0x8000) >> 15, e = (h & 0x7c00) >> 10, f = h & 0x03ff;
    if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
    if (e === 31) return f ? NaN : (s ? -Infinity : Infinity);
    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

function dimForDegree(degree) {
    if (degree <= 0) return 0;
    if (degree === 1) return 3;
    if (degree === 2) return 8;
    return 15;
}

function unpackSmallestThree(r0, r1, r2, r3) {
    var comp = r0 + (r1 << 8) + (r2 << 16) + (r3 << 24);
    var mask = (1 << 9) - 1;
    var largest = comp >>> 30;
    var rot = [0, 0, 0, 0], sum = 0;
    for (var i = 3; i >= 0; i--) {
        if (i !== largest) {
            var mag = comp & mask;
            var neg = (comp >> 9) & 1;
            comp = comp >>> 10;
            var v = SQRT_HALF * mag / mask;
            rot[i] = neg ? -v : v;
            sum += rot[i] * rot[i];
        }
    }
    rot[largest] = Math.sqrt(Math.max(0, 1 - sum));
    return rot;
}

function unpackFirstThree(r0, r1, r2) {
    var x = r0 / 127.5 - 1, y = r1 / 127.5 - 1, z = r2 / 127.5 - 1;
    var w = Math.sqrt(Math.max(0, 1 - (x * x + y * y + z * z)));
    return [x, y, z, w];
}

async function decodeSpz(data) {
    var bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.length < 16) throw new Error("SPZ file is truncated");
    var raw = await gunzip(bytes);
    var view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    if (raw.length < 16) throw new Error("SPZ payload is truncated");
    var magic = view.getUint32(0, true);
    if (magic !== 0x5053474e) throw new Error("Invalid SPZ file: bad magic");
    var version = view.getUint32(4, true);
    if (version === 4) throw new Error("SPZ version 4 uses Zstandard streams which are not supported; re-export as version 1-3");
    if (version < 1 || version > 3) throw new Error("Unsupported SPZ version: " + version);
    var count = view.getUint32(8, true);
    var shDegree = raw[12], fractionalBits = raw[13];
    if (shDegree > 3) throw new Error("Unsupported SPZ SH degree: " + shDegree);
    if (count > 10000000) throw new Error("SPZ point count exceeds the 10 million limit");
    var shDim = dimForDegree(shDegree);
    var usesFloat16 = version === 1;
    var smallestThree = version >= 3;
    var positionBytes = usesFloat16 ? 6 : 9;
    var rotationBytes = smallestThree ? 4 : 3;
    var lengths = [count * positionBytes, count, count * 3, count * 3, count * rotationBytes, count * shDim * 3];
    var total = 16;
    for (var i = 0; i < lengths.length; i++) total += lengths[i];
    if (raw.length < total) throw new Error("SPZ attribute streams are truncated");
    var posAt = 16, alphaAt = posAt + lengths[0], colorAt = alphaAt + lengths[1], scaleAt = colorAt + lengths[2], rotAt = scaleAt + lengths[3], shAt = rotAt + lengths[4];
    var positions = new Float32Array(count * 3);
    var scales = new Float32Array(count * 3);
    var rotations = new Float32Array(count * 4);
    var colors = new Float32Array(count * 4);
    var sh = shDegree > 0 ? { degree: shDegree, coefficients: new Float32Array(count * shDim * 3) } : null;
    var scaleF = 1 / (1 << fractionalBits);
    for (var p = 0; p < count; p++) {
        if (usesFloat16) {
            positions[p * 3] = halfToFloat(view.getUint16(posAt + p * 6, true));
            positions[p * 3 + 1] = halfToFloat(view.getUint16(posAt + p * 6 + 2, true));
            positions[p * 3 + 2] = halfToFloat(view.getUint16(posAt + p * 6 + 4, true));
        } else {
            var at = posAt + p * 9;
            var fx = raw[at] | (raw[at + 1] << 8) | (raw[at + 2] << 16);
            var fy = raw[at + 3] | (raw[at + 4] << 8) | (raw[at + 5] << 16);
            var fz = raw[at + 6] | (raw[at + 7] << 8) | (raw[at + 8] << 16);
            if (fx & 0x800000) fx |= ~0xffffff;
            if (fy & 0x800000) fy |= ~0xffffff;
            if (fz & 0x800000) fz |= ~0xffffff;
            positions[p * 3] = fx * scaleF;
            positions[p * 3 + 1] = fy * scaleF;
            positions[p * 3 + 2] = fz * scaleF;
        }
        colors[p * 4 + 3] = raw[alphaAt + p] / 255;
        var dc0 = (raw[colorAt + p * 3] / 255 - 0.5) / COLOR_SCALE;
        var dc1 = (raw[colorAt + p * 3 + 1] / 255 - 0.5) / COLOR_SCALE;
        var dc2 = (raw[colorAt + p * 3 + 2] / 255 - 0.5) / COLOR_SCALE;
        colors[p * 4] = 0.5 + SH_C0 * dc0;
        colors[p * 4 + 1] = 0.5 + SH_C0 * dc1;
        colors[p * 4 + 2] = 0.5 + SH_C0 * dc2;
        scales[p * 3] = Math.exp(raw[scaleAt + p * 3] / 16 - 10);
        scales[p * 3 + 1] = Math.exp(raw[scaleAt + p * 3 + 1] / 16 - 10);
        scales[p * 3 + 2] = Math.exp(raw[scaleAt + p * 3 + 2] / 16 - 10);
        var rot = smallestThree ? unpackSmallestThree(raw[rotAt + p * 4], raw[rotAt + p * 4 + 1], raw[rotAt + p * 4 + 2], raw[rotAt + p * 4 + 3]) : unpackFirstThree(raw[rotAt + p * 3], raw[rotAt + p * 3 + 1], raw[rotAt + p * 3 + 2]);
        rotations[p * 4] = rot[0]; rotations[p * 4 + 1] = rot[1]; rotations[p * 4 + 2] = rot[2]; rotations[p * 4 + 3] = rot[3];
        for (var c = 0; c < shDim * 3; c++) sh.coefficients[p * shDim * 3 + c] = (raw[shAt + p * shDim * 3 + c] - 128) / 128;
    }
    return { count: count, positions: positions, scales: scales, rotations: rotations, colors: colors, sh: sh, version: version, fractionalBits: fractionalBits, flags: raw[15] };
}

class SPZLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            self.parse(buffer).then(function(data) { if (onLoad) onLoad(data); }, function(e) { if (onError) onError(e); });
        }, onProgress, onError);
        return this;
    }
    parse(data) { return decodeSpz(data); }
}

export { SPZLoader };
