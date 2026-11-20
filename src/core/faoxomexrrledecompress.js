function faoxomexrrledecompress(zaefa) {
    var zaefb = [], zaefc = 0;
    while (zaefc < zaefa.length) {
        var zaefd = zaefa[zaefc] > 127 ? zaefa[zaefc] - 256 : zaefa[zaefc];
        zaefc++;
        if (zaefd < 0) {
            var zaefe = -zaefd;
            for (var zaeff = 0; zaeff < zaefe && zaefc < zaefa.length; zaeff++) zaefb.push(zaefa[zaefc++]);
        } else {
            var zaefg = zaefc < zaefa.length ? zaefa[zaefc++] : 0;
            for (var zaefh = 0; zaefh < zaefd + 1; zaefh++) zaefb.push(zaefg);
        }
    }
    return new Uint8Array(zaefb);
}

export { faoxomexrrledecompress };
