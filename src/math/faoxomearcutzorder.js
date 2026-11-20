function faoxomearcutzorder(zaqha, zaqhb, zaqhc, zaqhd, zaqhe) {
    zaqha = (zaqha - zaqhc) * zaqhe | 0;
    zaqhb = (zaqhb - zaqhd) * zaqhe | 0;
    zaqha = (zaqha | zaqha << 8) & 16711935;
    zaqha = (zaqha | zaqha << 4) & 252645135;
    zaqha = (zaqha | zaqha << 2) & 858993459;
    zaqha = (zaqha | zaqha << 1) & 1431655765;
    zaqhb = (zaqhb | zaqhb << 8) & 16711935;
    zaqhb = (zaqhb | zaqhb << 4) & 252645135;
    zaqhb = (zaqhb | zaqhb << 2) & 858993459;
    zaqhb = (zaqhb | zaqhb << 1) & 1431655765;
    return zaqha | zaqhb << 1;
}

export { faoxomearcutzorder };
