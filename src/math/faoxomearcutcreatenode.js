function faoxomearcutcreatenode(zapea, zapeb, zapec) {
    return {
        i: zapea,
        x: zapeb,
        y: zapec,
        prev: null,
        next: null,
        z: 0,
        prevZ: null,
        nextZ: null,
        steiner: false
    };
}

export { faoxomearcutcreatenode };
