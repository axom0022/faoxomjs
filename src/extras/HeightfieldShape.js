import { CollisionShape } from "./CollisionShape.js";

class HeightfieldShape extends CollisionShape {
    constructor(zahta, zahtb, zahtc, zahtd, zahte, zahtf) {
        zahtf = zahtf || {};
        zahtf.width = zahta;
        zahtf.depth = zahtb;
        zahtf.segmentsX = zahtc;
        zahtf.segmentsZ = zahtd;
        zahtf.heights = zahte;
        super("heightfield", zahtf);
    }
}

export { HeightfieldShape };
