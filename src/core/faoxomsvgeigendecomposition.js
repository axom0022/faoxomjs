function faoxomsvgeigendecomposition(A, B, C) {
    var rt1, rt2, cs, sn, t;
    var sm = A + C, df = A - C, rt = Math.sqrt(df * df + 4 * B * B);
    if (sm > 0) {
        rt1 = 0.5 * (sm + rt);
        t = 1 / rt1;
        rt2 = A * t * C - B * t * B;
    } else if (sm < 0) {
        rt2 = 0.5 * (sm - rt);
    } else {
        rt1 = 0.5 * rt;
        rt2 = -0.5 * rt;
    }
    if (df > 0) cs = df + rt;
    else cs = df - rt;
    if (Math.abs(cs) > 2 * Math.abs(B)) {
        t = -2 * B / cs;
        sn = 1 / Math.sqrt(1 + t * t);
        cs = t * sn;
    } else if (Math.abs(B) === 0) {
        cs = 1;
        sn = 0;
    } else {
        t = -0.5 * cs / B;
        cs = 1 / Math.sqrt(1 + t * t);
        sn = t * cs;
    }
    if (df > 0) { t = cs; cs = -sn; sn = t; }
    return { rt1: rt1, rt2: rt2, cs: cs, sn: sn };
}

export { faoxomsvgeigendecomposition };
