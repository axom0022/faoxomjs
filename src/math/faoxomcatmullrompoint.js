function faoxomcatmullrompoint(points, t, target) {
    var p = (points.length - 1) * t, intPoint = Math.floor(p), weight = p - intPoint;
    if (weight === 0) return target.copy(points[intPoint]);
    var p0 = points[intPoint - 1] || points[intPoint], p1 = points[intPoint], p2 = points[intPoint + 1] || points[points.length - 1], p3 = points[intPoint + 2] || points[points.length - 1];
    var pow = weight * weight, pow2 = pow * weight;
    target.set(0.5 * (2 * p1.x + (-p0.x + p2.x) * weight + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * pow + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * pow2), 0.5 * (2 * p1.y + (-p0.y + p2.y) * weight + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * pow + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * pow2));
    return target;
}

export { faoxomcatmullrompoint };
