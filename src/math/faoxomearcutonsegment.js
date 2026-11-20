function faoxomearcutonsegment(zapxa, zapxb, zapxc) {
    return zapxb.x <= Math.max(zapxa.x, zapxc.x) && zapxb.x >= Math.min(zapxa.x, zapxc.x) && zapxb.y <= Math.max(zapxa.y, zapxc.y) && zapxb.y >= Math.min(zapxa.y, zapxc.y);
}

export { faoxomearcutonsegment };
