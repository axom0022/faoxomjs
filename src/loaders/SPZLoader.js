import { FileLoader } from "./FileLoader.js";

var NGSP_MAGIC = 0x5053474e;
var SPZ_SH_C0 = 0.28209479177387814;
var DC_RANGE = 0.15;
var SPZ_DIAG_HALF = Math.SQRT2 / 2;
var FLAG_MASK = (1 << 9) - 1;

async function spzInflate(bytes) {
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
    var sign = h & 0x8000 ? -1 : 1;
    var exponent = (h & 0x7c00) >> 10;
    var fraction = h & 0x03ff;
    if (exponent === 0) return sign * 6.103515625e-05 * (fraction / 1024);
    if (exponent === 31) return fraction ? NaN : sign * Infinity;
    return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}

function coefficientCount(degree) { return degree <= 0 ? 0 : degree === 1 ? 3 : degree === 2 ? 8 : 15; }

function quaternionFromSmallestThree(b0, b1, b2, b3) {
    var packed = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
    var anchor = packed >>> 30;
    var rest = packed & ((1 << 30) - 1);
    var out = [0, 0, 0, 0];
    var energy = 0;
    for (var slot = 3; slot >= 0; slot--) {
        if (slot === anchor) continue;
        var magnitude = rest & FLAG_MASK;
        var negative = (rest >> 9) & 1;
        rest = rest >>> 10;
        var component = SPZ_DIAG_HALF * magnitude / FLAG_MASK;
        out[slot] = negative ? -component : component;
        energy += component * component;
    }
    out[anchor] = Math.sqrt(Math.max(0, 1 - energy));
    return out;
}

function quaternionFromFirstThree(b0, b1, b2) {
    var x = b0 / 127.5 - 1, y = b1 / 127.5 - 1, z = b2 / 127.5 - 1;
    return [x, y, z, Math.sqrt(Math.max(0, 1 - (x * x + y * y + z * z)))];
}

async function decodeSpz(data) {
    var gzipped = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (gzipped.length < 16) throw new Error("SPZ file is truncated");
    var raw = await spzInflate(gzipped);
    if (raw.length < 16) throw new Error("SPZ payload is truncated");
    var header = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    if (header.getUint32(0, true) !== NGSP_MAGIC) throw new Error("Invalid SPZ file: bad magic");
    var version = header.getUint32(4, true);
    if (version === 4) throw new Error("SPZ version 4 uses Zstandard streams which are not supported; re-export as version 1-3");
    if (version < 1 || version > 3) throw new Error("Unsupported SPZ version: " + version);
    var count = header.getUint32(8, true);
    var degree = raw[12];
    var fractionalBits = raw[13];
    if (degree > 3) throw new Error("Unsupported SPZ SH degree: " + degree);
    if (count > 10000000) throw new Error("SPZ point count exceeds the 10 million limit");
    var coefficients = coefficientCount(degree);
    var halfPositions = version === 1;
    var packedRotations = version >= 3;
    var layout = [
        { name: "position", stride: halfPositions ? 6 : 9 },
        { name: "alpha", stride: 1 },
        { name: "color", stride: 3 },
        { name: "scale", stride: 3 },
        { name: "rotation", stride: packedRotations ? 4 : 3 },
        { name: "sh", stride: coefficients * 3 }
    ];
    var cursor = 16;
    var offsets = {};
    for (var l = 0; l < layout.length; l++) { offsets[layout[l].name] = cursor; cursor += count * layout[l].stride; }
    if (raw.length < cursor) throw new Error("SPZ attribute streams are truncated");
    var positions = new Float32Array(count * 3);
    var scales = new Float32Array(count * 3);
    var rotations = new Float32Array(count * 4);
    var colors = new Float32Array(count * 4);
    var sh = degree > 0 ? { degree: degree, coefficients: new Float32Array(count * coefficients * 3) } : null;
    var grid = 1 / (1 << fractionalBits);
    for (var i = 0; i < count; i++) {
        if (halfPositions) {
            positions[i * 3] = halfToFloat(header.getUint16(offsets.position + i * 6, true));
            positions[i * 3 + 1] = halfToFloat(header.getUint16(offsets.position + i * 6 + 2, true));
            positions[i * 3 + 2] = halfToFloat(header.getUint16(offsets.position + i * 6 + 4, true));
        } else {
            for (var axis = 0; axis < 3; axis++) {
                var at = offsets.position + i * 9 + axis * 3;
                var fixed = raw[at] | (raw[at + 1] << 8) | (raw[at + 2] << 16);
                if (fixed & 0x800000) fixed |= ~0xffffff;
                positions[i * 3 + axis] = fixed * grid;
            }
        }
        colors[i * 4 + 3] = raw[offsets.alpha + i] / 255;
        for (var channel = 0; channel < 3; channel++) {
            var dc = (raw[offsets.color + i * 3 + channel] / 255 - 0.5) / DC_RANGE;
            colors[i * 4 + channel] = 0.5 + SPZ_SH_C0 * dc;
            scales[i * 3 + channel] = Math.exp(raw[offsets.scale + i * 3 + channel] / 16 - 10);
        }
        var quaternion = packedRotations
            ? quaternionFromSmallestThree(raw[offsets.rotation + i * 4], raw[offsets.rotation + i * 4 + 1], raw[offsets.rotation + i * 4 + 2], raw[offsets.rotation + i * 4 + 3])
            : quaternionFromFirstThree(raw[offsets.rotation + i * 3], raw[offsets.rotation + i * 3 + 1], raw[offsets.rotation + i * 3 + 2]);
        rotations[i * 4] = quaternion[0];
        rotations[i * 4 + 1] = quaternion[1];
        rotations[i * 4 + 2] = quaternion[2];
        rotations[i * 4 + 3] = quaternion[3];
        for (var k = 0; k < coefficients * 3; k++) sh.coefficients[i * coefficients * 3 + k] = (raw[offsets.sh + i * coefficients * 3 + k] - 128) / 128;
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
