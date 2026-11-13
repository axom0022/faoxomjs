function faoxomsvgangle(ux, uy, vx, vy) {
    var dot = ux * vx + uy * vy;
    var len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    var ang = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if ((ux * vy - uy * vx) < 0) ang = -ang;
    return ang;
}

export { faoxomsvgangle };
