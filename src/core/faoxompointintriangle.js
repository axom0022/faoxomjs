function faoxompointintriangle(p, a, b, c) { var v0 = c.clone().sub(a); var v1 = b.clone().sub(a); var v2 = p.clone().sub(a); var dot00 = v0.dot(v0); var dot01 = v0.dot(v1); var dot02 = v0.dot(v2); var dot11 = v1.dot(v1); var dot12 = v1.dot(v2); var inv = 1 / (dot00 * dot11 - dot01 * dot01 || 1); var u = (dot11 * dot02 - dot01 * dot12) * inv; var v = (dot00 * dot12 - dot01 * dot02) * inv; return u >= 0 && v >= 0 && u + v <= 1; }

export { faoxompointintriangle };
