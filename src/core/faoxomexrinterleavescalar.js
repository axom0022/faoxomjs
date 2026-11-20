function faoxomexrinterleavescalar(zaeda, zaedb) {
    var zaedc = 0, zaedd = Math.floor((zaeda.length + 1) / 2), zaede = 0, zaedf = zaeda.length - 1;
    while (true) {
        if (zaede > zaedf) break;
        zaedb[zaede++] = zaeda[zaedc++];
        if (zaede > zaedf) break;
        zaedb[zaede++] = zaeda[zaedd++];
    }
}

export { faoxomexrinterleavescalar };
