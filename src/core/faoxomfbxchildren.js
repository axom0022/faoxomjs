function faoxomfbxchildren(zaeia, zaeib) {
    var zaeic = [];
    if (!zaeia) return zaeic;
    for (var zaeid = 0; zaeid < zaeia.children.length; zaeid++) if (!zaeib || zaeia.children[zaeid].name === zaeib) zaeic.push(zaeia.children[zaeid]);
    return zaeic;
}

export { faoxomfbxchildren };
