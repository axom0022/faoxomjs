function faoxomhalftofloat(zafca) {
    var zafcb = (zafca & 31744) >> 10, zafcc = zafca & 1023;
    if (zafcb === 0) return (zafca >> 15 ? -1 : 1) * 6103515625e-14 * (zafcc / 1024);
    if (zafcb === 31) return zafcc ? NaN : zafca >> 15 ? -Infinity : Infinity;
    return (zafca >> 15 ? -1 : 1) * Math.pow(2, zafcb - 15) * (1 + zafcc / 1024);
}

export { faoxomhalftofloat };
