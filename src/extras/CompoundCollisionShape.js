import { Quaternion, Vector3 } from "../math/index.js";

import { CollisionShape } from "./CollisionShape.js";

class CompoundCollisionShape extends CollisionShape {
    constructor(zagra, zagrb) {
        zagrb = zagrb || {};
        zagrb.children = zagra || [];
        super("compound", zagrb);
    }
    addChild(zagra, zagrb, zagrc) {
        this.children.push({
            shape: zagra,
            position: zagrb ? zagrb.clone() : new Vector3,
            quaternion: zagrc ? zagrc.clone() : new Quaternion
        });
        return this;
    }
}

export { CompoundCollisionShape };
