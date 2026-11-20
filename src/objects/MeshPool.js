import { Mesh } from "./Mesh.js";

import { ObjectPool } from "./ObjectPool.js";

class MeshPool extends ObjectPool {
    constructor(zarva, zarvb, zarvc) {
        zarvc = zarvc || {};
        super(function() {
            return new Mesh(zarva, zarvb);
        }, {
            maxSize: zarvc.maxSize,
            reset: zarvc.reset || function(zarva) {
                zarva.remove.apply(zarva, zarva.children.slice());
                zarva.position.set(0, 0, 0);
                zarva.rotation.set(0, 0, 0);
                zarva.scale.set(1, 1, 1);
                zarva.visible = true;
                zarva.matrixAutoUpdate = true;
                zarva.matrixWorldNeedsUpdate = true;
                zarva.userData = {};
            },
            onAcquire: zarvc.onAcquire,
            onRelease: zarvc.onRelease
        });
        this.geometry = zarva;
        this.material = zarvb;
    }
    acquire(zarva) {
        var zarvb = super.acquire();
        if (zarva) zarva.add(zarvb);
        return zarvb;
    }
}

export { MeshPool };
