function faoxomdecodehdr(buffer) {
    var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    var text = "", cursor = 0;
    while (cursor < bytes.length) {
        var lineEnd = cursor;
        while (lineEnd < bytes.length && bytes[lineEnd] !== 10) lineEnd++;
        var line = String.fromCharCode.apply(null, bytes.subarray(cursor, lineEnd)).trim();
        cursor = lineEnd + 1;
        if (!line.length) { if (cursor < bytes.length) { var resEnd = cursor; while (resEnd < bytes.length && bytes[resEnd] !== 10) resEnd++; text += String.fromCharCode.apply(null, bytes.subarray(cursor, resEnd)).trim() + "\n"; cursor = resEnd + 1; } break; }
        text += line + "\n";
    }
    if (text.indexOf("#?") !== 0) throw new Error("Not a Radiance HDR file");
    var match = text.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);
    var topDownRows = false, height = 0, width = 0;
    if (match) { height = parseInt(match[1], 10); width = parseInt(match[2], 10); }
    else {
        match = text.match(/([+-])Y\s+(\d+)\s+([+-])X\s+(\d+)/);
        if (!match) throw new Error("HDR file has no resolution line");
        topDownRows = match[1] === "+";
        height = parseInt(match[2], 10); width = parseInt(match[4], 10);
    }
    var out = new Float32Array(width * height * 4);
    var applyRgbe = function(at, outIndex) {
        var e = bytes[at + 3];
        if (e === 0) { out[outIndex] = 0; out[outIndex + 1] = 0; out[outIndex + 2] = 0; }
        else { var f = Math.pow(2, e - 128) / 255; out[outIndex] = bytes[at] * f; out[outIndex + 1] = bytes[at + 1] * f; out[outIndex + 2] = bytes[at + 2] * f; }
        out[outIndex + 3] = 1;
    };
    for (var y = 0; y < height; y++) {
        var outY = topDownRows ? height - 1 - y : y;
        var rowStart = outY * width * 4;
        if (width < 8 || width > 32767 || bytes[cursor] !== 2 || bytes[cursor + 1] !== 2 || ((bytes[cursor + 2] << 8) | bytes[cursor + 3]) !== width) {
            for (var x2 = 0; x2 < width; x2++) { applyRgbe(cursor, rowStart + x2 * 4); cursor += 4; }
            continue;
        }
        cursor += 4;
        var segments = (width + 127) >> 7;
        var counts = [];
        for (var s = 0; s < segments; s++) counts.push(bytes[cursor + s] + 1);
        cursor += segments;
        var planes = [];
        for (var plane = 0; plane < 4; plane++) {
            var row = new Uint8Array(width), filled = 0;
            for (var seg = 0; seg < segments; seg++) {
                var runLength = counts[seg];
                for (var r = 0; r < runLength; r++) row[filled++] = bytes[cursor++];
            }
            planes.push(row);
        }
        for (var x = 0; x < width; x++) {
            var rgbe = [planes[0][x], planes[1][x], planes[2][x], planes[3][x]];
            var e = rgbe[3];
            if (e === 0) { out[rowStart + x * 4] = 0; out[rowStart + x * 4 + 1] = 0; out[rowStart + x * 4 + 2] = 0; }
            else { var f = Math.pow(2, e - 128) / 255; out[rowStart + x * 4] = rgbe[0] * f; out[rowStart + x * 4 + 1] = rgbe[1] * f; out[rowStart + x * 4 + 2] = rgbe[2] * f; }
            out[rowStart + x * 4 + 3] = 1;
        }
    }
    return { data: out, width: width, height: height };
}

export { faoxomdecodehdr };
