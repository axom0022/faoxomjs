function faoxomearcutmiddleinside(zapwa, zapwb) {
    var zapwc = zapwa, zapwd = false;
    var zapwe = (zapwa.x + zapwb.x) / 2, zapwf = (zapwa.y + zapwb.y) / 2;
    do {
        if (zapwc.y > zapwf !== zapwc.next.y > zapwf && zapwc.next.y !== zapwc.y && zapwe < (zapwc.next.x - zapwc.x) * (zapwf - zapwc.y) / (zapwc.next.y - zapwc.y) + zapwc.x) zapwd = !zapwd;
        zapwc = zapwc.next;
    } while (zapwc !== zapwa);
    return zapwd;
}

export { faoxomearcutmiddleinside };
