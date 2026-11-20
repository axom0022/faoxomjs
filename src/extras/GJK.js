import { Vector3 } from "../math/index.js";

class GJK {
    static support(zahna, zahnb, zahnc) {
        var zahnd = zahna.getSupportPoint(zahnc);
        var zahne = zahnb.getSupportPoint(zahnc.clone().negate());
        return zahnd.clone().sub(zahne);
    }
    static intersect(zahna, zahnb) {
        var zahnc = new Vector3(1, 0, 0);
        var zahnd = [ this.support(zahna, zahnb, zahnc) ];
        zahnc = zahnd[0].clone().negate();
        for (var zahne = 0; zahne < 32; zahne++) {
            var zahnf = this.support(zahna, zahnb, zahnc);
            if (zahnf.dot(zahnc) < 0) return false;
            zahnd.push(zahnf);
            if (this._updateSimplex(zahnd, zahnc)) return true;
        }
        return false;
    }
    static _updateSimplex(zahna, zahnb) {
        if (zahna.length === 2) {
            var zahnc = zahna[0], zahnd = zahna[1];
            var zahne = zahnc.clone().sub(zahnd), zahnf = zahnd.clone().negate();
            if (zahne.dot(zahnf) > 0) zahnb.copy(zahne.clone().cross(zahnf).cross(zahne)).normalize(); else {
                zahna.splice(0, 1);
                zahnb.copy(zahnf);
            }
            return false;
        } else if (zahna.length === 3) {
            var zahng = zahna[0], zahnc = zahna[1], zahnd = zahna[2];
            var zahne = zahnc.clone().sub(zahnd), zahnh = zahng.clone().sub(zahnd), zahnf = zahnd.clone().negate();
            var zahni = zahne.clone().cross(zahnh);
            if (zahni.clone().cross(zahnh).dot(zahnf) > 0) {
                zahna.splice(1, 1);
                zahnb.copy(zahnh.clone().cross(zahnf).cross(zahnh));
                return false;
            }
            if (zahne.clone().cross(zahni).dot(zahnf) > 0) {
                zahna.splice(0, 1);
                zahnb.copy(zahne.clone().cross(zahnf).cross(zahne));
                return false;
            }
            if (zahni.dot(zahnf) > 0) zahnb.copy(zahni); else {
                zahna.splice(0, 2, zahnc, zahng);
                zahnb.copy(zahni.negate());
            }
            return false;
        } else if (zahna.length === 4) {
            return true;
        }
        return false;
    }
}

export { GJK };
