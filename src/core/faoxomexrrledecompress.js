function faoxomexrrledecompress(data) {
    var out = [], p = 0;
    while (p < data.length) {
        var l = data[p] > 127 ? data[p] - 256 : data[p]; p++;
        if (l < 0) { var count = -l; for (var i = 0; i < count && p < data.length; i++) out.push(data[p++]); }
        else { var value = p < data.length ? data[p++] : 0; for (var j = 0; j < l + 1; j++) out.push(value); }
    }
    return new Uint8Array(out);
}

export { faoxomexrrledecompress };
