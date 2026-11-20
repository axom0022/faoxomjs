function faoxomfbxtext(zaeva) {
    try {
        return (new TextDecoder).decode(zaeva);
    } catch (zaevd) {
        var zaevb = "";
        for (var zaevc = 0; zaevc < zaeva.length; zaevc++) zaevb += String.fromCharCode(zaeva[zaevc]);
        return zaevb;
    }
}

export { faoxomfbxtext };
