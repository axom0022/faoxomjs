import { Object3D } from "./Object3D.js";

class Node extends Object3D {
    constructor() {
        super();
        this.type = "Node";
    }
    clone(zacza) {
        var zaczb = new Node;
        zaczb.name = this.name;
        zaczb.position.copy(this.position);
        zaczb.quaternion.copy(this.quaternion);
        zaczb.scale.copy(this.scale);
        if (zacza !== false) for (var zaczc = 0; zaczc < this.children.length; zaczc++) zaczb.add(this.children[zaczc].clone(true));
        return zaczb;
    }
}

export { Node };
