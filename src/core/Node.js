import { Object3D } from "./Object3D.js";

class Node extends Object3D { constructor() { super(); this.type = "Node"; } clone(recursive) { var n = new Node(); n.name = this.name; n.position.copy(this.position); n.quaternion.copy(this.quaternion); n.scale.copy(this.scale); if (recursive !== false) for (var i = 0; i < this.children.length; i++) n.add(this.children[i].clone(true)); return n; } }

export { Node };
