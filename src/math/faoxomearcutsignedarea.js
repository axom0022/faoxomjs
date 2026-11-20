function faoxomearcutsignedarea(zaqda, zaqdb, zaqdc, zaqdd) {
    var zaqde = 0;
    for (var zaqdf = zaqdb, zaqdg = zaqdc - zaqdd; zaqdf < zaqdc; zaqdf += zaqdd) {
        zaqde += (zaqda[zaqdg] - zaqda[zaqdf]) * (zaqda[zaqdf + 1] + zaqda[zaqdg + 1]);
        zaqdg = zaqdf;
    }
    return zaqde;
}

export { faoxomearcutsignedarea };
