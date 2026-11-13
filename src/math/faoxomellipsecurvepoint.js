function faoxomellipsecurvepoint(cx, cy, xRadius, yRadius, startAngle, endAngle, clockwise, rotation, t, target) {
    var twoPi = Math.PI * 2, deltaAngle = endAngle - startAngle;
    var samePoints = Math.abs(deltaAngle) < Number.EPSILON;
    while (deltaAngle < 0) deltaAngle += twoPi;
    while (deltaAngle > twoPi) deltaAngle -= twoPi;
    if (deltaAngle < Number.EPSILON) deltaAngle = samePoints ? 0 : twoPi;
    if (clockwise === true && !samePoints) deltaAngle = deltaAngle === twoPi ? -twoPi : deltaAngle - twoPi;
    var angle = startAngle + t * deltaAngle;
    var x = cx + xRadius * Math.cos(angle), y = cy + yRadius * Math.sin(angle);
    if (rotation) {
        var cos = Math.cos(rotation), sin = Math.sin(rotation), tx = x - cx, ty = y - cy;
        x = tx * cos - ty * sin + cx;
        y = tx * sin + ty * cos + cy;
    }
    target.set(x, y);
    return target;
}

export { faoxomellipsecurvepoint };
