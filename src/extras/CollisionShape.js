import { faoxomshapeextents, faoxomshapevertices, faoxomworldpoint } from "../core/index.js";

import { Box3, Matrix4, Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

class CollisionShape {
    constructor(zagqa, zagqb) {
        if (zagqa && typeof zagqa === "object") {
            zagqb = zagqa;
            zagqa = zagqb.type;
        }
        zagqb = zagqb || {};
        this.type = zagqa || "box";
        this.radius = faoxomvalue(zagqb.radius, .5);
        this.height = faoxomvalue(zagqb.height, 1);
        this.size = zagqb.size ? zagqb.size.clone() : this.type === "capsule" ? new Vector3(this.radius * 2, this.height + this.radius * 2, this.radius * 2) : new Vector3(faoxomvalue(zagqb.width, 1), faoxomvalue(zagqb.height, 1), faoxomvalue(zagqb.depth, 1));
        this.vertices = [];
        var zagqc = zagqb.vertices || zagqb.points || [];
        for (var zagqd = 0; zagqd < zagqc.length; zagqd++) this.vertices.push(zagqc[zagqd] instanceof Vector3 ? zagqc[zagqd].clone() : new Vector3(zagqc[zagqd][0], zagqc[zagqd][1], zagqc[zagqd][2]));
        this.indices = zagqb.indices || null;
        this.children = [];
        var zagqe = zagqb.children || [];
        for (var zagqf = 0; zagqf < zagqe.length; zagqf++) this.children.push(zagqe[zagqf] instanceof CollisionShape ? {
            shape: zagqe[zagqf],
            position: new Vector3,
            quaternion: new Quaternion
        } : zagqe[zagqf]);
        this.width = faoxomvalue(zagqb.width, 10);
        this.depth = faoxomvalue(zagqb.depth, 10);
        this.segmentsX = Math.max(1, Math.floor(faoxomvalue(zagqb.segmentsX, 1)));
        this.segmentsZ = Math.max(1, Math.floor(faoxomvalue(zagqb.segmentsZ, 1)));
        this.heights = zagqb.heights ? new Float32Array(zagqb.heights) : null;
        this.minimumHeight = this.heights && this.heights.length ? Math.min.apply(null, this.heights) : 0;
        this.maximumHeight = this.heights && this.heights.length ? Math.max.apply(null, this.heights) : 0;
        this.boundingBox = null;
        this.inertia = new Vector3;
        this.computeInertia(faoxomvalue(zagqb.mass, 1));
    }
    computeInertia(zagqa) {
        if (this.type === "sphere") {
            var zagqb = .4 * zagqa * this.radius * this.radius;
            this.inertia.set(zagqb, zagqb, zagqb);
        } else if (this.type === "cylinder") {
            this.inertia.set(zagqa * (3 * this.radius * this.radius + this.height * this.height) / 12, zagqa * this.radius * this.radius * .5, zagqa * (3 * this.radius * this.radius + this.height * this.height) / 12);
        } else {
            var zagqc = faoxomshapeextents(this);
            this.inertia.set(zagqa * (zagqc.y * zagqc.y + zagqc.z * zagqc.z) / 3, zagqa * (zagqc.x * zagqc.x + zagqc.z * zagqc.z) / 3, zagqa * (zagqc.x * zagqc.x + zagqc.y * zagqc.y) / 3);
        }
        return this;
    }
    getHeight(zagqa, zagqb) {
        if (this.type !== "heightfield" || !this.heights) return -Infinity;
        var zagqc = faoxomclamp(zagqa / this.width + .5, 0, 1) * this.segmentsX;
        var zagqd = faoxomclamp(zagqb / this.depth + .5, 0, 1) * this.segmentsZ;
        var zagqe = Math.floor(zagqc), zagqf = Math.floor(zagqd), zagqg = Math.min(this.segmentsX, zagqe + 1), zagqh = Math.min(this.segmentsZ, zagqf + 1);
        var zagqi = zagqc - zagqe, zagqj = zagqd - zagqf;
        var zagqk = function(zagqa, zagqb) {
            return zagqb * (this.segmentsX + 1) + zagqa;
        }.bind(this);
        var zagql = this.heights[zagqk(zagqe, zagqf)] || 0, zagqm = this.heights[zagqk(zagqg, zagqf)] || 0, zagqn = this.heights[zagqk(zagqe, zagqh)] || 0, zagqo = this.heights[zagqk(zagqg, zagqh)] || 0;
        return (zagql * (1 - zagqi) + zagqm * zagqi) * (1 - zagqj) + (zagqn * (1 - zagqi) + zagqo * zagqi) * zagqj;
    }
    getAABB(zagqa, zagqb, zagqc) {
        var zagqd = zagqb || new Box3;
        var zagqe = zagqc || new Quaternion;
        if (this.type === "compound") {
            zagqd.makeEmpty();
            for (var zagqf = 0; zagqf < this.children.length; zagqf++) {
                var zagqg = this.children[zagqf];
                var zagqh = faoxomworldpoint(zagqa, zagqe, zagqg.position || new Vector3);
                var zagqi = zagqe.clone().multiply(zagqg.quaternion || new Quaternion);
                zagqd.union(zagqg.shape.getAABB(zagqh, new Box3, zagqi));
            }
            return zagqd;
        }
        if (this.type === "heightfield") {
            var zagqj = new Vector3(-this.width * .5, this.minimumHeight, -this.depth * .5);
            var zagqk = new Vector3(this.width * .5, this.maximumHeight, this.depth * .5);
            var zagql = [ new Vector3(zagqj.x, zagqj.y, zagqj.z), new Vector3(zagqk.x, zagqj.y, zagqj.z), new Vector3(zagqj.x, zagqk.y, zagqj.z), new Vector3(zagqk.x, zagqk.y, zagqj.z), new Vector3(zagqj.x, zagqj.y, zagqk.z), new Vector3(zagqk.x, zagqj.y, zagqk.z), new Vector3(zagqj.x, zagqk.y, zagqk.z), new Vector3(zagqk.x, zagqk.y, zagqk.z) ];
            zagqd.makeEmpty();
            for (var zagqm = 0; zagqm < zagql.length; zagqm++) zagqd.expandByPoint(faoxomworldpoint(zagqa, zagqe, zagql[zagqm]));
            return zagqd;
        }
        var zagqn = this.vertices.length ? this.vertices : faoxomshapevertices(this);
        if (this.type === "mesh" || this.type === "convex") {
            zagqd.makeEmpty();
            for (var zagqo = 0; zagqo < zagqn.length; zagqo++) zagqd.expandByPoint(faoxomworldpoint(zagqa, zagqe, zagqn[zagqo]));
            return zagqd;
        }
        var zagqp = faoxomshapeextents(this);
        var zagqq = (new Matrix4).makeRotationFromQuaternion(zagqe).elements;
        var zagqr = Math.abs(zagqq[0]) * zagqp.x + Math.abs(zagqq[4]) * zagqp.y + Math.abs(zagqq[8]) * zagqp.z;
        var zagqs = Math.abs(zagqq[1]) * zagqp.x + Math.abs(zagqq[5]) * zagqp.y + Math.abs(zagqq[9]) * zagqp.z;
        var zagqt = Math.abs(zagqq[2]) * zagqp.x + Math.abs(zagqq[6]) * zagqp.y + Math.abs(zagqq[10]) * zagqp.z;
        return zagqd.set(new Vector3(zagqa.x - zagqr, zagqa.y - zagqs, zagqa.z - zagqt), new Vector3(zagqa.x + zagqr, zagqa.y + zagqs, zagqa.z + zagqt));
    }
}

export { CollisionShape };
