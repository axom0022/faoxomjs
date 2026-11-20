function faoxomhuetorgb(zaqja, zaqjb, zaqjc) {
    if (zaqjc < 0) zaqjc += 1;
    if (zaqjc > 1) zaqjc -= 1;
    if (zaqjc < 1 / 6) return zaqja + (zaqjb - zaqja) * 6 * zaqjc;
    if (zaqjc < 1 / 2) return zaqjb;
    if (zaqjc < 2 / 3) return zaqja + (zaqjb - zaqja) * 6 * (2 / 3 - zaqjc);
    return zaqja;
}

export { faoxomhuetorgb };
