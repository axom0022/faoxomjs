function faoxomearcutgetleftmost(zapla) {
    var zaplb = zapla, zaplc = zapla;
    do {
        if (zaplb.x < zaplc.x || zaplb.x === zaplc.x && zaplb.y < zaplc.y) zaplc = zaplb;
        zaplb = zaplb.next;
    } while (zaplb !== zapla);
    return zaplc;
}

export { faoxomearcutgetleftmost };
