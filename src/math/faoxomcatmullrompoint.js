function faoxomcatmullrompoint(zaoya, zaoyb, zaoyc) {
    var zaoyd = (zaoya.length - 1) * zaoyb, zaoye = Math.floor(zaoyd), zaoyf = zaoyd - zaoye;
    if (zaoyf === 0) return zaoyc.copy(zaoya[zaoye]);
    var zaoyg = zaoya[zaoye - 1] || zaoya[zaoye], zaoyh = zaoya[zaoye], zaoyi = zaoya[zaoye + 1] || zaoya[zaoya.length - 1], zaoyj = zaoya[zaoye + 2] || zaoya[zaoya.length - 1];
    var zaoyk = zaoyf * zaoyf, zaoyl = zaoyk * zaoyf;
    zaoyc.set(.5 * (2 * zaoyh.x + (-zaoyg.x + zaoyi.x) * zaoyf + (2 * zaoyg.x - 5 * zaoyh.x + 4 * zaoyi.x - zaoyj.x) * zaoyk + (-zaoyg.x + 3 * zaoyh.x - 3 * zaoyi.x + zaoyj.x) * zaoyl), .5 * (2 * zaoyh.y + (-zaoyg.y + zaoyi.y) * zaoyf + (2 * zaoyg.y - 5 * zaoyh.y + 4 * zaoyi.y - zaoyj.y) * zaoyk + (-zaoyg.y + 3 * zaoyh.y - 3 * zaoyi.y + zaoyj.y) * zaoyl));
    return zaoyc;
}

export { faoxomcatmullrompoint };
