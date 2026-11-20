function faoxomdecompresslzf(zadxa, zadxb, zadxc, zadxd) {
    var zadxe = new Uint8Array(zadxd);
    var zadxf = zadxb, zadxg = zadxb + zadxc, zadxh = 0, zadxi = 0, zadxj = 0, zadxk = 0, zadxl = 0;
    while (zadxf < zadxg) {
        zadxi = zadxa[zadxf++];
        if (zadxi < 32) {
            zadxj = zadxi + 1;
            if (zadxh + zadxj > zadxd || zadxf + zadxj > zadxg) throw new Error("Corrupt PCD compressed data");
            for (var zadxm = 0; zadxm < zadxj; zadxm++) zadxe[zadxh++] = zadxa[zadxf++];
        } else {
            zadxj = zadxi >> 5;
            if (zadxj === 7) zadxj += zadxa[zadxf++];
            zadxk = zadxh - ((zadxi & 31) << 8) - zadxa[zadxf++] - 1;
            if (zadxk < 0 || zadxh + zadxj + 2 > zadxd) throw new Error("Corrupt PCD compressed data");
            for (zadxl = 0; zadxl < zadxj + 2; zadxl++) zadxe[zadxh++] = zadxe[zadxk++];
        }
    }
    return zadxe;
}

export { faoxomdecompresslzf };
