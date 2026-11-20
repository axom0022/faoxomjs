import { BasicMaterial } from "../materials/index.js";

import { DecalGeometry, Mesh } from "../objects/index.js";

class Decal extends Mesh {
    constructor(zagya, zagyb, zagyc, zagyd) {
        super(new DecalGeometry(zagya, zagyb, zagyc), zagyd || new BasicMaterial({
            transparent: true,
            side: "double"
        }));
        this.type = "Decal";
    }
}

export { Decal };
