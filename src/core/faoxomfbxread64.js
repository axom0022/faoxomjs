function faoxomfbxread64(zaeta, zaetb) {
    return typeof zaeta.getBigUint64 === "function" ? Number(zaeta.getBigUint64(zaetb, true)) : zaeta.getUint32(zaetb, true) + zaeta.getUint32(zaetb + 4, true) * 4294967296;
}

export { faoxomfbxread64 };
