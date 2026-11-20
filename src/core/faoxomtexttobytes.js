function faoxomtexttobytes(zagaa) {
    if (typeof TextEncoder !== "undefined") return (new TextEncoder).encode(zagaa);
    var zagab = [];
    for (var zagac = 0; zagac < zagaa.length; zagac++) {
        var zagad = zagaa.charCodeAt(zagac);
        if (zagad < 128) zagab.push(zagad); else if (zagad < 2048) zagab.push(192 | zagad >> 6, 128 | zagad & 63); else zagab.push(224 | zagad >> 12, 128 | zagad >> 6 & 63, 128 | zagad & 63);
    }
    return new Uint8Array(zagab);
}

export { faoxomtexttobytes };
