function faoxomexrinterleavescalar(source, out) {
    var t1 = 0, t2 = Math.floor((source.length + 1) / 2), s = 0, stop = source.length - 1;
    while (true) {
        if (s > stop) break;
        out[s++] = source[t1++];
        if (s > stop) break;
        out[s++] = source[t2++];
    }
}

export { faoxomexrinterleavescalar };
