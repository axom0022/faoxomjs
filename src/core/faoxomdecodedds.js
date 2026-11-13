function faoxomdecodedds(buffer) {
    var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 128 || bytes[0] !== 68 || bytes[1] !== 68 || bytes[2] !== 83 || bytes[3] !== 32) throw new Error("Invalid DDS magic");
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var flags = view.getUint32(8, true), height = view.getUint32(12, true), width = view.getUint32(16, true);
    var mipMapCount = (flags & 0x20000) ? Math.max(1, view.getUint32(28, true)) : 1;
    var caps2 = view.getUint32(112, true);
    var pfFlags = view.getUint32(80, true);
    var fourCC = String.fromCharCode(bytes[84], bytes[85], bytes[86], bytes[87]);
    var rgbBitCount = view.getUint32(88, true);
    var masks = { r: view.getUint32(92, true), g: view.getUint32(96, true), b: view.getUint32(100, true), a: view.getUint32(104, true) };
    var isCube = (caps2 & 0xFE00) !== 0;
    var faces = isCube ? 6 : 1;
    var format = null, blockBytes = 0;
    if (pfFlags & 4) {
        if (fourCC === "DXT1") { format = "dxt1"; blockBytes = 8; }
        else if (fourCC === "DXT3") { format = "dxt3"; blockBytes = 16; }
        else if (fourCC === "DXT5") { format = "dxt5"; blockBytes = 16; }
        else throw new Error("Unsupported DDS FourCC " + fourCC);
    } else if (pfFlags & 0x41 && (rgbBitCount === 24 || rgbBitCount === 32)) {
        format = "rgba"; blockBytes = rgbBitCount / 8;
    } else throw new Error("Unsupported DDS pixel format");
    var decodeColor565 = function(v) { return [Math.round(((v >> 11) & 31) * 255 / 31), Math.round(((v >> 5) & 63) * 255 / 63), Math.round((v & 31) * 255 / 31)]; };
    var decodeBlock = function(source, sourceOffset, lw, lh, target, colOrigin, rowOrigin) {
        var colorOffset = format === "dxt1" ? sourceOffset : sourceOffset + 8;
        var c0v = source[colorOffset] | (source[colorOffset + 1] << 8), c1v = source[colorOffset + 2] | (source[colorOffset + 3] << 8);
        var c0 = decodeColor565(c0v), c1 = decodeColor565(c1v);
        var palette = [c0, c1, [0, 0, 0], [0, 0, 0]];
        var fourColor = format !== "dxt1" || c0v > c1v;
        if (fourColor) {
            palette[2] = [(c0[0] * 2 + c1[0]) / 3, (c0[1] * 2 + c1[1]) / 3, (c0[2] * 2 + c1[2]) / 3];
            palette[3] = [(c0[0] + c1[0] * 2) / 3, (c0[1] + c1[1] * 2) / 3, (c0[2] + c1[2] * 2) / 3];
        } else {
            palette[2] = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2, (c0[2] + c1[2]) / 2];
            palette[3] = [0, 0, 0];
        }
        var bitsOffset = colorOffset + 4;
        var bits = 0;
        for (var i = 0; i < 4; i++) bits |= source[bitsOffset + i] << (8 * i);
        for (var texel = 0; texel < 16; texel++) {
            var code = (bits >> (texel * 2)) & 3;
            var color = palette[code];
            var alpha = 255;
            if (!fourColor && code === 3) alpha = 0;
            if (format === "dxt3") {
                var nibble = (source[sourceOffset + Math.floor(texel / 2)] >> ((texel % 2) * 4)) & 15;
                alpha = Math.round(nibble * 255 / 15);
            } else if (format === "dxt5") {
                var a0 = source[sourceOffset], a1 = source[sourceOffset + 1];
                var alphaBits = 0;
                for (var ab = 5; ab >= 0; ab--) alphaBits = alphaBits * 256 + source[sourceOffset + 2 + ab];
                var code3 = Math.floor(alphaBits / Math.pow(2, texel * 3)) % 8;
                if (code3 === 0) alpha = a0;
                else if (code3 === 1) alpha = a1;
                else if (a0 > a1) alpha = Math.round(((8 - code3) * a0 + (code3 - 1) * a1) / 7);
                else alpha = code3 < 6 ? Math.round(((6 - code3) * a0 + (code3 - 1) * a1) / 5) : (code3 === 6 ? 0 : 255);
            }
            var x = colOrigin + texel % 4, y = lh - 1 - (rowOrigin + Math.floor(texel / 4));
            if (x >= lw || y < 0) continue;
            var to = (y * lw + x) * 4;
            target[to] = color[0]; target[to + 1] = color[1]; target[to + 2] = color[2]; target[to + 3] = alpha;
        }
    };
    var cursor = 128;
    var levels = [];
    for (var level = 0; level < mipMapCount; level++) {
        var lw = Math.max(1, width >> level), lh = Math.max(1, height >> level);
        var slices = [];
        for (var face = 0; face < faces; face++) {
            var data;
            if (format === "rgba") {
                data = new Uint8Array(lw * lh * 4);
                for (var p = 0; p < lw * lh; p++) {
                    var po = cursor + p * blockBytes;
                    var visualRow = Math.floor(p / lw), visualCol = p % lw;
                    var glIndex = (lh - 1 - visualRow) * lw + visualCol;
                    var pixel = 0;
                    for (var pb = 0; pb < blockBytes; pb++) pixel |= bytes[po + pb] << (8 * pb);
                    var shift = 0, m = masks.r, component = 0;
                    shift = m ? Math.round(Math.log2(m & -m)) : 0; component = (pixel & m) >> shift;
                    data[glIndex * 4] = m ? Math.round(component * 255 / (m >> shift)) : 0;
                    m = masks.g; shift = m ? Math.round(Math.log2(m & -m)) : 0; component = (pixel & m) >> shift;
                    data[glIndex * 4 + 1] = m ? Math.round(component * 255 / (m >> shift)) : 0;
                    m = masks.b; shift = m ? Math.round(Math.log2(m & -m)) : 0; component = (pixel & m) >> shift;
                    data[glIndex * 4 + 2] = m ? Math.round(component * 255 / (m >> shift)) : 0;
                    m = masks.a; shift = m ? Math.round(Math.log2(m & -m)) : 0; component = (pixel & m) >> shift;
                    data[glIndex * 4 + 3] = m ? Math.round(component * 255 / (m >> shift)) : 255;
                }
                cursor += lw * lh * blockBytes;
            } else {
                var blocksX = Math.max(1, Math.ceil(lw / 4)), blocksY = Math.max(1, Math.ceil(lh / 4));
                data = new Uint8Array(lw * lh * 4);
                for (var by = 0; by < blocksY; by++) for (var bx = 0; bx < blocksX; bx++) {
                    decodeBlock(bytes, cursor + (by * blocksX + bx) * blockBytes, lw, lh, data, bx * 4, by * 4);
                }
                cursor += blocksX * blocksY * blockBytes;
            }
            slices.push(data);
        }
        levels.push({ level: level, width: lw, height: lh, slices: faces > 1 ? slices : null, data: faces === 1 ? slices[0] : null, compressed: false });
    }
    return { levels: levels, width: width, height: height, target: isCube ? "cubemap" : "2d", format: format, faces: faces, mipmaps: mipMapCount };
}

export { faoxomdecodedds };
