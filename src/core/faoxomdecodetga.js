function faoxomdecodetga(buffer) {
    var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 18) throw new Error("TGA header missing");
    var idLength = bytes[0], colorMapType = bytes[1], imageType = bytes[2];
    var colorMapOrigin = bytes[3] | (bytes[4] << 8), colorMapLength = bytes[5] | (bytes[6] << 8), colorMapDepth = bytes[7];
    var width = bytes[12] | (bytes[13] << 8), height = bytes[14] | (bytes[15] << 8);
    var depth = bytes[16], descriptor = bytes[17];
    var rle = imageType === 9 || imageType === 10 || imageType === 11;
    var mapped = imageType === 1 || imageType === 9;
    var gray = imageType === 3 || imageType === 11;
    if (imageType !== 1 && imageType !== 2 && imageType !== 3 && imageType !== 9 && imageType !== 10 && imageType !== 11) throw new Error("Unsupported TGA image type " + imageType);
    if (mapped && colorMapType !== 1) throw new Error("Colormapped TGA without a color map");
    if (!mapped && colorMapType === 1) throw new Error("Unexpected TGA color map on unmapped image");
    var offset = 18 + idLength;
    var colorMap = null;
    if (colorMapType === 1) {
        var entryBytes = Math.max(1, colorMapDepth >> 3);
        colorMap = new Uint8Array(colorMapLength * 4);
        for (var cm = 0; cm < colorMapLength; cm++) {
            var cp = offset + cm * entryBytes;
            if (entryBytes === 4) { colorMap[cm * 4] = bytes[cp + 2]; colorMap[cm * 4 + 1] = bytes[cp + 1]; colorMap[cm * 4 + 2] = bytes[cp]; colorMap[cm * 4 + 3] = bytes[cp + 3]; }
            else if (entryBytes === 3) { colorMap[cm * 4] = bytes[cp + 2]; colorMap[cm * 4 + 1] = bytes[cp + 1]; colorMap[cm * 4 + 2] = bytes[cp]; colorMap[cm * 4 + 3] = 255; }
            else if (entryBytes === 2) { var cv = bytes[cp] | (bytes[cp + 1] << 8); colorMap[cm * 4] = ((cv >> 10) & 31) * 255 / 31; colorMap[cm * 4 + 1] = ((cv >> 5) & 63) * 255 / 63; colorMap[cm * 4 + 2] = (cv & 31) * 255 / 31; colorMap[cm * 4 + 3] = (cv >> 15) ? 0 : 255; }
            else { colorMap[cm * 4] = bytes[cp]; colorMap[cm * 4 + 1] = bytes[cp]; colorMap[cm * 4 + 2] = bytes[cp]; colorMap[cm * 4 + 3] = 255; }
        }
        offset += colorMapLength * entryBytes;
    }
    var bytesPerPixel = gray ? 1 : Math.max(1, depth >> 3);
    if (!gray && !mapped && depth !== 16 && depth !== 24 && depth !== 32) throw new Error("Unsupported TGA depth " + depth);
    if (mapped && bytesPerPixel !== 1 && bytesPerPixel !== 2) throw new Error("Unsupported TGA colormap index size");
    var pixelCount = width * height;
    var raw = new Uint8Array(pixelCount * bytesPerPixel);
    if (rle) {
        var write = 0;
        while (write < raw.length && offset < bytes.length) {
            var packet = bytes[offset++];
            var count = (packet & 127) + 1;
            if (write + count * bytesPerPixel > raw.length) count = Math.floor((raw.length - write) / bytesPerPixel);
            if (packet & 128) { for (var run = 0; run < count; run++) for (var rb = 0; rb < bytesPerPixel; rb++) raw[write++] = bytes[offset + rb]; offset += bytesPerPixel; }
            else { for (var lit = 0; lit < count; lit++) for (var lb = 0; lb < bytesPerPixel; lb++) raw[write++] = offset < bytes.length ? bytes[offset++] : 0; }
        }
    } else {
        var available = Math.min(raw.length, bytes.length - offset);
        for (var direct = 0; direct < available; direct++) raw[direct] = bytes[offset + direct];
    }
    var rgba = new Uint8Array(pixelCount * 4);
    for (var px = 0; px < pixelCount; px++) {
        var base = px * bytesPerPixel;
        if (mapped) {
            var index = (raw[base] | (bytesPerPixel === 2 ? raw[base + 1] << 8 : 0)) - colorMapOrigin;
            if (index >= 0 && index < colorMapLength) { rgba[px * 4] = colorMap[index * 4]; rgba[px * 4 + 1] = colorMap[index * 4 + 1]; rgba[px * 4 + 2] = colorMap[index * 4 + 2]; rgba[px * 4 + 3] = colorMap[index * 4 + 3]; }
            else { rgba[px * 4] = 0; rgba[px * 4 + 1] = 0; rgba[px * 4 + 2] = 0; rgba[px * 4 + 3] = 255; }
        } else if (gray) { rgba[px * 4] = raw[base]; rgba[px * 4 + 1] = raw[base]; rgba[px * 4 + 2] = raw[base]; rgba[px * 4 + 3] = 255; }
        else if (bytesPerPixel === 2) { var v16 = raw[base] | (raw[base + 1] << 8); rgba[px * 4] = ((v16 >> 10) & 31) * 255 / 31; rgba[px * 4 + 1] = ((v16 >> 5) & 63) * 255 / 63; rgba[px * 4 + 2] = (v16 & 31) * 255 / 31; rgba[px * 4 + 3] = (v16 >> 15) ? 0 : 255; }
        else if (bytesPerPixel === 3) { rgba[px * 4] = raw[base + 2]; rgba[px * 4 + 1] = raw[base + 1]; rgba[px * 4 + 2] = raw[base]; rgba[px * 4 + 3] = 255; }
        else { rgba[px * 4] = raw[base + 2]; rgba[px * 4 + 1] = raw[base + 1]; rgba[px * 4 + 2] = raw[base]; rgba[px * 4 + 3] = raw[base + 3]; }
    }
    var topDown = (descriptor & 32) !== 0;
    var mirrorX = (descriptor & 16) !== 0;
    if (topDown || mirrorX) {
        var flipped = new Uint8Array(pixelCount * 4);
        for (var fy = 0; fy < height; fy++) for (var fx = 0; fx < width; fx++) {
            var sy = topDown ? height - 1 - fy : fy, sx = mirrorX ? width - 1 - fx : fx;
            var from = (sy * width + sx) * 4, to = (fy * width + fx) * 4;
            flipped[to] = rgba[from]; flipped[to + 1] = rgba[from + 1]; flipped[to + 2] = rgba[from + 2]; flipped[to + 3] = rgba[from + 3];
        }
        rgba = flipped;
    }
    return { data: rgba, width: width, height: height };
}

export { faoxomdecodetga };
