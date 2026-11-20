function faoxombytestotext(zadra, zadrb) {
    var zadrc = "", zadrd = zadrb || 0;
    for (var zadre = zadrd; zadre < zadra.length; zadre += 8192) zadrc += String.fromCharCode.apply(null, zadra.subarray(zadre, Math.min(zadre + 8192, zadra.length)));
    return zadrc;
}

export { faoxombytestotext };
