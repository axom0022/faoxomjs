function faoxomellipsecurvepoint(zaqia, zaqib, zaqic, zaqid, zaqie, zaqif, zaqig, zaqih, zaqii, zaqij) {
    var zaqik = Math.PI * 2, zaqil = zaqif - zaqie;
    var zaqim = Math.abs(zaqil) < Number.EPSILON;
    while (zaqil < 0) zaqil += zaqik;
    while (zaqil > zaqik) zaqil -= zaqik;
    if (zaqil < Number.EPSILON) zaqil = zaqim ? 0 : zaqik;
    if (zaqig === true && !zaqim) zaqil = zaqil === zaqik ? -zaqik : zaqil - zaqik;
    var zaqin = zaqie + zaqii * zaqil;
    var zaqio = zaqia + zaqic * Math.cos(zaqin), zaqip = zaqib + zaqid * Math.sin(zaqin);
    if (zaqih) {
        var zaqiq = Math.cos(zaqih), zaqir = Math.sin(zaqih), zaqis = zaqio - zaqia, zaqit = zaqip - zaqib;
        zaqio = zaqis * zaqiq - zaqit * zaqir + zaqia;
        zaqip = zaqis * zaqir + zaqit * zaqiq + zaqib;
    }
    zaqij.set(zaqio, zaqip);
    return zaqij;
}

export { faoxomellipsecurvepoint };
