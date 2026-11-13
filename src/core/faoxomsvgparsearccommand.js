import { faoxomsvgangle } from "./faoxomsvgangle.js";

function faoxomsvgparsearccommand(path, rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, start, end) {
    if (rx == 0 || ry == 0) {
        path.lineTo(end.x, end.y);
        return;
    }
    x_axis_rotation = x_axis_rotation * Math.PI / 180;
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    var dx2 = (start.x - end.x) / 2.0;
    var dy2 = (start.y - end.y) / 2.0;
    var x1p = Math.cos(x_axis_rotation) * dx2 + Math.sin(x_axis_rotation) * dy2;
    var y1p = -Math.sin(x_axis_rotation) * dx2 + Math.cos(x_axis_rotation) * dy2;
    var rxs = rx * rx, rys = ry * ry;
    var x1ps = x1p * x1p, y1ps = y1p * y1p;
    var cr = x1ps / rxs + y1ps / rys;
    if (cr > 1) {
        var s = Math.sqrt(cr);
        rx = s * rx;
        ry = s * ry;
        rxs = rx * rx;
        rys = ry * ry;
    }
    var dq = (rxs * y1ps + rys * x1ps);
    var pq = (rxs * rys - dq) / dq;
    var q = Math.sqrt(Math.max(0, pq));
    if (large_arc_flag === sweep_flag) q = -q;
    var cxp = q * rx * y1p / ry;
    var cyp = -q * ry * x1p / rx;
    var cx = Math.cos(x_axis_rotation) * cxp - Math.sin(x_axis_rotation) * cyp + (start.x + end.x) / 2;
    var cy = Math.sin(x_axis_rotation) * cxp + Math.cos(x_axis_rotation) * cyp + (start.y + end.y) / 2;
    var theta = faoxomsvgangle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    var delta = faoxomsvgangle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry) % (Math.PI * 2);
    path.currentPath.absellipse(cx, cy, rx, ry, theta, theta + delta, sweep_flag === 0, x_axis_rotation);
}

export { faoxomsvgparsearccommand };
