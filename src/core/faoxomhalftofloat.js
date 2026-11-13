function faoxomhalftofloat(binary) {
    var exponent = (binary & 0x7C00) >> 10, fraction = binary & 0x03FF;
    if (exponent === 0) return (binary >> 15 ? -1 : 1) * 6.103515625e-5 * (fraction / 0x400);
    if (exponent === 0x1F) return fraction ? NaN : (binary >> 15 ? -Infinity : Infinity);
    return (binary >> 15 ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / 0x400);
}

export { faoxomhalftofloat };
