import { FileLoader } from "./FileLoader.js";

var SH_C0 = 0.28209479177387814;
var SQRT_HALF = Math.SQRT2 / 2;

async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== "undefined") {
        var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        var zlib = await import("node:zlib");
        return new Uint8Array(zlib.inflateRawSync(bytes));
    }
    throw new Error("ZIP deflate entries require DecompressionStream or Node zlib");
}

function unzipFiles(bytes) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var eocd = -1;
    for (var i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65536; i--) {
        if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("Invalid SOG archive: missing ZIP end of central directory");
    var count = view.getUint16(eocd + 10, true);
    var cdOffset = view.getUint32(eocd + 16, true);
    if (count === 0xffff || cdOffset === 0xffffffff) throw new Error("ZIP64 SOG archives are not supported");
    var files = {};
    var pos = cdOffset;
    for (var e = 0; e < count; e++) {
        if (pos + 46 > bytes.length || view.getUint32(pos, true) !== 0x02014b50) throw new Error("Invalid SOG archive: corrupt central directory");
        var method = view.getUint16(pos + 10, true);
        var compSize = view.getUint32(pos + 20, true);
        var nameLen = view.getUint16(pos + 28, true);
        var extraLen = view.getUint16(pos + 30, true);
        var commentLen = view.getUint16(pos + 32, true);
        var localOffset = view.getUint32(pos + 42, true);
        var name = "";
        for (var n = 0; n < nameLen; n++) name += String.fromCharCode(bytes[pos + 46 + n]);
        if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("Invalid SOG archive: corrupt local header");
        var localNameLen = view.getUint16(localOffset + 26, true);
        var localExtraLen = view.getUint16(localOffset + 28, true);
        var dataStart = localOffset + 30 + localNameLen + localExtraLen;
        if (dataStart + compSize > bytes.length) throw new Error("Invalid SOG archive: entry data out of bounds");
        var raw = bytes.subarray(dataStart, dataStart + compSize);
        files[name] = method === 0 ? new Uint8Array(raw) : method === 8 ? inflateRaw(raw) : null;
        pos += 46 + nameLen + extraLen + commentLen;
    }
    var anyAsync = false;
    for (var key in files) if (files[key] && typeof files[key].then === "function") anyAsync = true;
    if (!anyAsync) return files;
    var names = Object.keys(files);
    return Promise.all(names.map(function(k) { return files[k]; })).then(function(values) {
        var out = {};
        for (var v = 0; v < names.length; v++) out[names[v]] = values[v];
        return out;
    });
}

async function inflateZlib(bytes) {
    if (typeof DecompressionStream !== "undefined") {
        var zstream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
        return new Uint8Array(await new Response(zstream).arrayBuffer());
    }
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        var zlib = await import("node:zlib");
        return new Uint8Array(zlib.inflateSync(bytes));
    }
    throw new Error("PNG decoding requires DecompressionStream or Node zlib");
}

function paethPredictor(a, b, c) {
    var p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

async function decodePng(bytes) {
    if (bytes.length < 8 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) return null;
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var pos = 8, width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = 0, idat = [];
    while (pos + 8 <= bytes.length) {
        var len = view.getUint32(pos);
        var type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
        var data = bytes.subarray(pos + 8, pos + 8 + len);
        if (type === "IHDR") {
            width = view.getUint32(pos + 8);
            height = view.getUint32(pos + 12);
            bitDepth = data[8];
            colorType = data[9];
            interlace = data[12];
        } else if (type === "IDAT") {
            idat.push(data);
        } else if (type === "IEND") {
            break;
        }
        pos += 12 + len;
    }
    if (bitDepth !== 8 || interlace !== 0) return null;
    var channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : 0;
    if (!channels || !width || !height) return null;
    var total = 0;
    for (var i = 0; i < idat.length; i++) total += idat[i].length;
    var zlibBytes = new Uint8Array(total), at = 0;
    for (var j = 0; j < idat.length; j++) { zlibBytes.set(idat[j], at); at += idat[j].length; }
    var raw = await inflateZlib(zlibBytes);
    var stride = width * channels;
    if (raw.length < height * (stride + 1)) throw new Error("Corrupt PNG stream in SOG image");
    var out = new Uint8Array(width * height * 4);
    var prev = new Uint8Array(stride), line = new Uint8Array(stride);
    for (var y = 0; y < height; y++) {
        var filter = raw[y * (stride + 1)];
        var src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (var x = 0; x < stride; x++) {
            var left = x >= channels ? line[x - channels] : 0, up = prev[x], ul = x >= channels ? prev[x - channels] : 0;
            var v = src[x];
            if (filter === 1) v = v + left;
            else if (filter === 2) v = v + up;
            else if (filter === 3) v = v + ((left + up) >> 1);
            else if (filter === 4) v = v + paethPredictor(left, up, ul);
            line[x] = v & 255;
        }
        for (var px = 0; px < width; px++) {
            var di = (y * width + px) * 4, si = px * channels;
            if (channels === 4) { out[di] = line[si]; out[di + 1] = line[si + 1]; out[di + 2] = line[si + 2]; out[di + 3] = line[si + 3]; }
            else if (channels === 3) { out[di] = line[si]; out[di + 1] = line[si + 1]; out[di + 2] = line[si + 2]; out[di + 3] = 255; }
            else if (channels === 2) { out[di] = line[si]; out[di + 1] = line[si]; out[di + 2] = line[si]; out[di + 3] = line[si + 1]; }
            else { out[di] = line[si]; out[di + 1] = line[si]; out[di + 2] = line[si]; out[di + 3] = 255; }
        }
        var tmp = prev; prev = line; line = tmp;
    }
    return { data: out, width: width, height: height };
}

async function decodeImage(bytes) {
    var png = await decodePng(bytes);
    if (png) return png;
    if (typeof createImageBitmap !== "undefined" && typeof OffscreenCanvas !== "undefined") {
        var bitmap = await createImageBitmap(new Blob([bytes]));
        var w = bitmap.width, h = bitmap.height;
        var canvas = new OffscreenCanvas(w, h);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        var data = ctx.getImageData(0, 0, w, h).data;
        bitmap.close();
        return { data: data, width: w, height: h };
    }
    throw new Error("SOG image decoding requires createImageBitmap and OffscreenCanvas");
}

function dimForBands(bands) {
    if (bands === 1) return 3;
    if (bands === 2) return 8;
    if (bands === 3) return 15;
    throw new Error("SOG shN bands must be between 1 and 3");
}

async function decodeSogFiles(files) {
    var metaBytes = files["meta.json"];
    if (!metaBytes) throw new Error("SOG archive is missing meta.json");
    var metaText = "";
    for (var i = 0; i < metaBytes.length; i++) metaText += String.fromCharCode(metaBytes[i]);
    var meta = JSON.parse(metaText);
    if (meta.version !== 2) throw new Error("Unsupported SOG version: " + meta.version + " (expected 2)");
    var count = meta.count;
    if (!Number.isInteger(count) || count <= 0) throw new Error("SOG meta count must be a positive integer");
    if (!meta.means || !meta.means.files || meta.means.files.length !== 2) throw new Error("SOG meta requires means.files with two entries");
    if (!meta.scales || !meta.scales.codebook || meta.scales.codebook.length !== 256) throw new Error("SOG meta requires a 256-entry scales codebook");
    if (!meta.quats || !meta.quats.files || meta.quats.files.length !== 1) throw new Error("SOG meta requires quats.files");
    if (!meta.sh0 || !meta.sh0.codebook || meta.sh0.codebook.length !== 256) throw new Error("SOG meta requires a 256-entry sh0 codebook");
    var meansL = await decodeImage(files[meta.means.files[0]]);
    var meansU = await decodeImage(files[meta.means.files[1]]);
    var quats = await decodeImage(files[meta.quats.files[0]]);
    var scalesImg = await decodeImage(files[meta.scales.files[0]]);
    var sh0Img = await decodeImage(files[meta.sh0.files[0]]);
    if (meansL.width !== meansU.width || meansL.height !== meansU.height) throw new Error("SOG means images must share dimensions");
    if (meansL.width !== quats.width || meansL.height !== quats.height || meansL.width !== scalesImg.width || meansL.height !== scalesImg.height || meansL.width !== sh0Img.width || meansL.height !== sh0Img.height) throw new Error("SOG property images must share dimensions");
    if (meansL.width * meansL.height < count) throw new Error("SOG images are too small for the declared count");
    var sh = null, shDim = 0, centroids = null, labels = null;
    if (meta.shN) {
        var bands = meta.shN.bands;
        if (!Number.isInteger(bands) || bands < 1 || bands > 3) throw new Error("SOG shN bands must be between 1 and 3");
        if (!meta.shN.codebook || meta.shN.codebook.length !== 256) throw new Error("SOG shN requires a 256-entry codebook");
        if (!meta.shN.files || meta.shN.files.length !== 2) throw new Error("SOG shN requires centroids and labels files");
        if (!Number.isInteger(meta.shN.count) || meta.shN.count <= 0) throw new Error("SOG shN count must be a positive integer");
        shDim = dimForBands(bands);
        centroids = await decodeImage(files[meta.shN.files[0]]);
        labels = await decodeImage(files[meta.shN.files[1]]);
        if (centroids.width !== 64 * shDim) throw new Error("SOG shN centroids width must be 64 * coefficients");
        if (centroids.height < Math.ceil(meta.shN.count / 64)) throw new Error("SOG shN centroids image is too small");
        sh = { degree: bands, coefficients: new Float32Array(count * shDim * 3) };
    }
    var width = meansL.width;
    var positions = new Float32Array(count * 3);
    var scales = new Float32Array(count * 3);
    var rotations = new Float32Array(count * 4);
    var colors = new Float32Array(count * 4);
    var mins = meta.means.mins, maxs = meta.means.maxs;
    var unlog = function(n) { return Math.sign(n) * (Math.exp(Math.abs(n)) - 1); };
    var toComp = function(c) { return (c / 255 - 0.5) * 2 / Math.SQRT2; };
    for (var p = 0; p < count; p++) {
        var pi = p * 4, i3 = p * 3, ci = p * 4;
        var qx = (meansU.data[pi] << 8) | meansL.data[pi];
        var qy = (meansU.data[pi + 1] << 8) | meansL.data[pi + 1];
        var qz = (meansU.data[pi + 2] << 8) | meansL.data[pi + 2];
        positions[i3] = unlog(mins[0] + (maxs[0] - mins[0]) * qx / 65535);
        positions[i3 + 1] = unlog(mins[1] + (maxs[1] - mins[1]) * qy / 65535);
        positions[i3 + 2] = unlog(mins[2] + (maxs[2] - mins[2]) * qz / 65535);
        scales[i3] = Math.exp(meta.scales.codebook[scalesImg.data[pi]]);
        scales[i3 + 1] = Math.exp(meta.scales.codebook[scalesImg.data[pi + 1]]);
        scales[i3 + 2] = Math.exp(meta.scales.codebook[scalesImg.data[pi + 2]]);
        var a = toComp(quats.data[pi]), b = toComp(quats.data[pi + 1]), c = toComp(quats.data[pi + 2]);
        var mode = quats.data[pi + 3] - 252;
        if (mode < 0 || mode > 3) throw new Error("SOG quaternion alpha channel must be in 252..255");
        var d = Math.sqrt(Math.max(0, 1 - (a * a + b * b + c * c)));
        var wq = mode === 0 ? d : a, xq = mode === 1 ? d : (mode === 0 ? a : b), yq = mode === 2 ? d : (mode === 3 ? c : b), zq = mode === 3 ? d : c;
        rotations[ci] = xq; rotations[ci + 1] = yq; rotations[ci + 2] = zq; rotations[ci + 3] = wq;
        colors[ci] = 0.5 + SH_C0 * meta.sh0.codebook[sh0Img.data[pi]];
        colors[ci + 1] = 0.5 + SH_C0 * meta.sh0.codebook[sh0Img.data[pi + 1]];
        colors[ci + 2] = 0.5 + SH_C0 * meta.sh0.codebook[sh0Img.data[pi + 2]];
        colors[ci + 3] = sh0Img.data[pi + 3] / 255;
        if (sh) {
            var label = labels.data[pi] + (labels.data[pi + 1] << 8);
            if (label >= meta.shN.count) throw new Error("SOG shN label out of range");
            var row = Math.floor(label / 64), colBase = (label % 64) * shDim;
            for (var cf = 0; cf < shDim; cf++) {
                var cp = (row * centroids.width + colBase + cf) * 4;
                sh.coefficients[p * shDim * 3 + cf * 3] = meta.shN.codebook[centroids.data[cp]];
                sh.coefficients[p * shDim * 3 + cf * 3 + 1] = meta.shN.codebook[centroids.data[cp + 1]];
                sh.coefficients[p * shDim * 3 + cf * 3 + 2] = meta.shN.codebook[centroids.data[cp + 2]];
            }
        }
    }
    return { count: count, positions: positions, scales: scales, rotations: rotations, colors: colors, sh: sh, version: meta.version };
}

class SOGLoader {
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
    async parse(data) {
        var bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        var files = await unzipFiles(bytes);
        return decodeSogFiles(files);
    }
    async parseFiles(files) { return decodeSogFiles(files); }
}

export { SOGLoader };
