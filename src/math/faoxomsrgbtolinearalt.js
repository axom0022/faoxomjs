function faoxomsrgbtolinearalt(zaqla) {
    return zaqla <= .04045 ? zaqla / 12.92 : Math.pow((zaqla + .055) / 1.055, 2.4);
}

export { faoxomsrgbtolinearalt };
