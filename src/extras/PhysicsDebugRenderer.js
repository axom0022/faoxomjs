import { Geometry } from "../geometries/index.js";

import { LineBasicMaterial } from "../materials/index.js";

import { Group, LineSegments } from "../objects/index.js";

import { Vector3 } from "../math/index.js";

var zaija = {
    box: 5217256,
    sphere: 5558926,
    capsule: 15251023,
    cylinder: 13209328,
    plane: 6979486,
    convex: 15232879,
    mesh: 10127080,
    heightfield: 7330024,
    compound: 15262319,
    sleeping: 5594990,
    static: 8950438,
    joint: 16765519,
    contact: 16736095,
    aabb: 3095117,
    velocity: 5882623
};

function zaijb(zaija, zaijb, zaijc, zaijd) {
    var zaije = zaijb, zaijf = zaijc, zaijg = zaijd;
    var zaijh = [ [ -zaije, -zaijf, -zaijg ], [ zaije, -zaijf, -zaijg ], [ zaije, zaijf, -zaijg ], [ -zaije, zaijf, -zaijg ], [ -zaije, -zaijf, zaijg ], [ zaije, -zaijf, zaijg ], [ zaije, zaijf, zaijg ], [ -zaije, zaijf, zaijg ] ];
    var zaiji = [ [ 0, 1 ], [ 1, 2 ], [ 2, 3 ], [ 3, 0 ], [ 4, 5 ], [ 5, 6 ], [ 6, 7 ], [ 7, 4 ], [ 0, 4 ], [ 1, 5 ], [ 2, 6 ], [ 3, 7 ] ];
    for (var zaijj = 0; zaijj < zaiji.length; zaijj++) {
        zaija.push(zaijh[zaiji[zaijj][0]][0], zaijh[zaiji[zaijj][0]][1], zaijh[zaiji[zaijj][0]][2]);
        zaija.push(zaijh[zaiji[zaijj][1]][0], zaijh[zaiji[zaijj][1]][1], zaijh[zaiji[zaijj][1]][2]);
    }
}

function zaijc(zaija, zaijb, zaijc, zaijd) {
    for (var zaije = 0; zaije < zaijc; zaije++) {
        var zaijf = zaije / zaijc * Math.PI * 2, zaijg = (zaije + 1) / zaijc * Math.PI * 2;
        var zaijh = Math.cos(zaijf) * zaijb, zaiji = Math.sin(zaijf) * zaijb;
        var zaijj = Math.cos(zaijg) * zaijb, zaijk = Math.sin(zaijg) * zaijb;
        if (zaijd === "y") zaija.push(zaijh, 0, zaiji, zaijj, 0, zaijk); else if (zaijd === "z") zaija.push(zaijh, zaiji, 0, zaijj, zaijk, 0); else zaija.push(0, zaijh, zaiji, 0, zaijj, zaijk);
    }
}

class PhysicsDebugRenderer {
    constructor(zaija, zaijb) {
        zaijb = zaijb || {};
        this.scene = zaija;
        this.showShapes = zaijb.showShapes !== false;
        this.showJoints = zaijb.showJoints !== false;
        this.showContacts = zaijb.showContacts !== false;
        this.showAABBs = !!zaijb.showAABBs;
        this.showVelocities = !!zaijb.showVelocities;
        this.showSleeping = zaijb.showSleeping !== false;
        this.contactEvents = [];
        this.group = new Group;
        this.group.name = "physics-debug";
        this.group.renderOrder = 999;
        this._lines = {};
        this._materials = {};
        var zaijc = [ "shapes", "joints", "contacts", "aabb", "velocity" ];
        for (var zaijd = 0; zaijd < zaijc.length; zaijd++) {
            var zaije = new LineBasicMaterial({
                color: 16777215
            });
            zaije.transparent = true;
            zaije.opacity = zaijc[zaijd] === "aabb" ? .5 : .9;
            zaije.depthTest = zaijc[zaijd] === "contacts" ? false : true;
            zaije.vertexColors = true;
            this._materials[zaijc[zaijd]] = zaije;
            var zaijf = new LineSegments(new Geometry, zaije);
            zaijf.frustumCulled = false;
            this._lines[zaijc[zaijd]] = zaijf;
            this.group.add(zaijf);
        }
        if (this.scene) this.scene.add(this.group);
    }
    _colorFor(zaijb, zaijc) {
        if (zaijb.isStatic) return zaija.static;
        if (this.showSleeping && zaijb.sleeping) return zaija.sleeping;
        return zaijc;
    }
    _shapeLines(zaijd, zaije) {
        var zaijf = zaijd.shape;
        if (!zaijf) return;
        var zaijg = this._colorFor(zaijd, zaija[zaijf.type] || 16777215);
        var zaijh = zaijg << 8 | 170;
        var zaiji = [ {
            body: zaijd,
            offset: null
        } ];
        while (zaiji.length) {
            var zaijj = zaiji.pop();
            var zaijk = zaijj.body;
            var zaijl = zaijk.shape;
            var zaijm = [];
            if (zaijl.type === "box" || zaijl.type === "obb") {
                var zaijn = zaijl.size || {
                    x: 1,
                    y: 1,
                    z: 1
                };
                zaijb(zaijm, zaijn.x / 2, zaijn.y / 2, zaijn.z / 2);
            } else if (zaijl.type === "sphere") {
                zaijc(zaijm, zaijl.radius || .5, 16, "y");
                zaijc(zaijm, zaijl.radius || .5, 16, "x");
                zaijc(zaijm, zaijl.radius || .5, 16, "z");
            } else if (zaijl.type === "capsule" || zaijl.type === "cylinder") {
                var zaijo = zaijl.radius || .4;
                var zaijp = (zaijl.height || 1) / 2;
                zaijc(zaijm, zaijo, 12, "y");
                var zaijq = zaijl.type === "capsule" ? zaijp - zaijo : zaijp;
                var zaijr = zaijl.type === "capsule" ? -zaijp + zaijo : -zaijp;
                zaijc(zaijm, zaijo, 12, "y");
                for (var zaijs = zaijm.length - 12 * 6; zaijs < zaijm.length; zaijs += 6) zaijm[zaijs + 1] = zaijq;
                zaijc(zaijm, zaijo, 12, "y");
                for (var zaijt = zaijm.length - 12 * 6; zaijt < zaijm.length; zaijt += 6) zaijm[zaijt + 1] = zaijr;
                zaijm.push(zaijo, zaijq, 0, zaijo, zaijr, 0, -zaijo, zaijq, 0, -zaijo, zaijr, 0, 0, zaijq, zaijo, 0, zaijr, zaijo);
            } else if (zaijl.type === "plane") {
                var zaiju = zaijl.normal || new Vector3(0, 1, 0);
                var zaijv = 4;
                var zaijw = Math.abs(zaiju.y) > .9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
                var zaijx = (new Vector3).crossVectors(zaiju, zaijw).normalize().multiplyScalar(zaijv);
                var zaijy = (new Vector3).crossVectors(zaiju, zaijx).normalize().multiplyScalar(zaijv);
                var zaijz = zaiju.clone().multiplyScalar(zaijl.constant || 0);
                zaijm.push(zaijz.x - zaijx.x - zaijy.x, zaijz.y - zaijx.y - zaijy.y, zaijz.z - zaijx.z - zaijy.z, zaijz.x + zaijx.x - zaijy.x, zaijz.y + zaijx.y - zaijy.y, zaijz.z + zaijx.z - zaijy.z, zaijz.x + zaijx.x - zaijy.x, zaijz.y + zaijx.y - zaijy.y, zaijz.z + zaijx.z - zaijy.z, zaijz.x + zaijx.x + zaijy.x, zaijz.y + zaijx.y + zaijy.y, zaijz.z + zaijx.z + zaijy.z, zaijz.x + zaijx.x + zaijy.x, zaijz.y + zaijx.y + zaijy.y, zaijz.z + zaijx.z + zaijy.z, zaijz.x - zaijx.x + zaijy.x, zaijz.y - zaijx.y + zaijy.y, zaijz.z - zaijx.z + zaijy.z, zaijz.x - zaijx.x + zaijy.x, zaijz.y - zaijx.y + zaijy.y, zaijz.z - zaijx.z + zaijy.z, zaijz.x - zaijx.x - zaijy.x, zaijz.y - zaijx.y - zaijy.y, zaijz.z - zaijx.z - zaijy.z, zaijz.x, zaijz.y, zaijz.z, zaijz.x + zaiju.x, zaijz.y + zaiju.y, zaijz.z + zaiju.z);
            } else if (zaijl.type === "convex" || zaijl.type === "mesh") {
                var zaijaa = zaijl.vertices || [];
                for (var zaijab = 1; zaijab < zaijaa.length; zaijab++) {
                    zaijm.push(zaijaa[zaijab - 1].x, zaijaa[zaijab - 1].y, zaijaa[zaijab - 1].z, zaijaa[zaijab].x, zaijaa[zaijab].y, zaijaa[zaijab].z);
                }
            } else if (zaijl.type === "heightfield") {
                var zaijac = zaijl.width || 10, zaijad = zaijl.depth || 10;
                var zaijp = 5;
                zaijm.push(-zaijp, 0, -zaijp, zaijp, 0, -zaijp, zaijp, 0, -zaijp, zaijp, 0, zaijp, zaijp, 0, zaijp, -zaijp, 0, zaijp, -zaijp, 0, zaijp, -zaijp, 0, -zaijp);
            } else if (zaijl.type === "compound" && zaijl.children) {
                for (var zaijae = 0; zaijae < zaijl.children.length; zaijae++) zaiji.push({
                    body: {
                        shape: zaijl.children[zaijae].shape || zaijl.children[zaijae],
                        isStatic: zaijk.isStatic,
                        sleeping: zaijk.sleeping
                    },
                    offset: null
                });
            }
            var zaijaf = Math.cos(zaijk.rotation || 0), zaijag = Math.sin(zaijk.rotation || 0);
            for (var zaijah = 0; zaijah < zaijm.length; zaijah += 3) {
                var zaijai = zaijm[zaijah], zaijaj = zaijm[zaijah + 1], zaijak = zaijm[zaijah + 2];
                var zaijal, zaijam, zaijan;
                if (zaijk.quaternion) {
                    var zaijao = zaijk.quaternion;
                    var zaijap = zaijao.w * zaijai + zaijao.y * zaijak - zaijao.z * zaijaj;
                    var zaijaq = zaijao.w * zaijaj + zaijao.z * zaijai - zaijao.x * zaijak;
                    var zaijar = zaijao.w * zaijak + zaijao.x * zaijaj - zaijao.y * zaijai;
                    var zaijas = -zaijao.x * zaijai - zaijao.y * zaijaj - zaijao.z * zaijak;
                    zaijal = zaijap * zaijao.w + zaijas * -zaijao.x + zaijaq * -zaijao.z - zaijar * -zaijao.y;
                    zaijam = zaijaq * zaijao.w + zaijas * -zaijao.y + zaijar * -zaijao.x - zaijap * -zaijao.z;
                    zaijan = zaijar * zaijao.w + zaijas * -zaijao.z + zaijap * -zaijao.y - zaijaq * -zaijao.x;
                } else {
                    zaijal = zaijai;
                    zaijam = zaijaj;
                    zaijan = zaijak;
                }
                zaije.push(zaijal + zaijk.position.x, zaijam + zaijk.position.y, zaijan + zaijk.position.z, zaijg);
            }
        }
    }
    update(zaijc) {
        if (!zaijc) return this;
        var zaijd = [], zaije = [], zaijf = [], zaijg = [], zaijh = [];
        if (this.showShapes || this.showAABBs || this.showVelocities) {
            for (var zaiji = 0; zaiji < zaijc.bodies.length; zaiji++) {
                var zaijj = zaijc.bodies[zaiji];
                if (this.showShapes) this._shapeLines(zaijj, zaijd);
                if (this.showAABBs && zaijj.shape && zaijj.shape.getAABB) {
                    var zaijk = zaijj.shape.getAABB(zaijj.position, null, zaijj.rotation);
                    if (zaijk) {
                        var zaijl = [];
                        zaijb(zaijl, (zaijk.max.x - zaijk.min.x) / 2, (zaijk.max.y - zaijk.min.y) / 2, (zaijk.max.z - zaijk.min.z) / 2);
                        var zaijm = (zaijk.max.x + zaijk.min.x) / 2, zaijn = (zaijk.max.y + zaijk.min.y) / 2, zaijo = (zaijk.max.z + zaijk.min.z) / 2;
                        for (var zaijp = 0; zaijp < zaijl.length; zaijp += 3) zaijg.push(zaijl[zaijp] + zaijm, zaijl[zaijp + 1] + zaijn, zaijl[zaijp + 2] + zaijo, zaija.aabb);
                    }
                }
                if (this.showVelocities && !zaijj.isStatic && zaijj.velocity && zaijj.velocity.lengthSq() > 1e-4) {
                    zaijh.push(zaijj.position.x, zaijj.position.y, zaijj.position.z, zaija.velocity);
                    zaijh.push(zaijj.position.x + zaijj.velocity.x * .15, zaijj.position.y + zaijj.velocity.y * .15, zaijj.position.z + zaijj.velocity.z * .15, zaija.velocity);
                }
            }
        }
        if (this.showJoints && zaijc.constraints) {
            for (var zaijq = 0; zaijq < zaijc.constraints.length; zaijq++) {
                var zaijr = zaijc.constraints[zaijq];
                var zaijs = zaijr.bodyA, zaijt = zaijr.bodyB;
                if (!zaijs || !zaijt) continue;
                zaije.push(zaijs.position.x, zaijs.position.y, zaijs.position.z, zaija.joint);
                zaije.push(zaijt.position.x, zaijt.position.y, zaijt.position.z, zaija.joint);
            }
        }
        if (this.showContacts && zaijc.onCollision) {
            for (var zaiju = 0; zaiju < this.contactEvents.length; zaiju++) {
                var zaijv = this.contactEvents[zaiju];
                var zaijw = zaijv.point;
                if (!zaijw) continue;
                zaijf.push(zaijw.x - .06, zaijw.y - .06, zaijw.z - .06, zaija.contact);
                zaijf.push(zaijw.x + .06, zaijw.y + .06, zaijw.z + .06, zaija.contact);
                zaijf.push(zaijw.x - .06, zaijw.y + .06, zaijw.z - .06, zaija.contact);
                zaijf.push(zaijw.x + .06, zaijw.y - .06, zaijw.z + .06, zaija.contact);
            }
            this.contactEvents.length = 0;
        }
        this._flush("shapes", zaijd);
        this._flush("joints", zaije);
        this._flush("contacts", zaijf);
        this._flush("aabb", zaijg);
        this._flush("velocity", zaijh);
        return this;
    }
    pushContact(zaija, zaijb, zaijc, zaijd, zaije) {
        if (this.contactEvents.length < 256) this.contactEvents.push({
            point: zaije ? zaije.clone ? zaije.clone() : zaije : null
        });
        return this;
    }
    _flush(zaija, zaijb) {
        var zaijc = this._lines[zaija];
        if (!zaijc) return;
        var zaijd = zaijc.geometry;
        var zaije = new Float32Array(zaijb.length / 4 * 3);
        var zaijf = new Float32Array(zaijb.length / 4 * 3);
        var zaijg = [];
        for (var zaijh = 0, zaiji = 0; zaijh < zaijb.length; zaijh += 4, zaiji += 3) {
            zaije[zaiji] = zaijb[zaijh];
            zaije[zaiji + 1] = zaijb[zaijh + 1];
            zaije[zaiji + 2] = zaijb[zaijh + 2];
            var zaijj = zaijb[zaijh + 3];
            zaijg.push((zaijj >> 16 & 255) / 255, (zaijj >> 8 & 255) / 255, (zaijj & 255) / 255);
        }
        for (var zaijk = 0; zaijk < zaijg.length; zaijk++) zaijf[zaijk] = zaijg[zaijk];
        zaijd.setAttribute("position", zaije, 3);
        zaijd.setAttribute("color", zaijf, 3);
        zaijc.visible = zaije.length > 0;
    }
    setVisible(zaija) {
        this.group.visible = !!zaija;
        return this;
    }
    dispose() {
        if (this.scene) this.scene.remove(this.group);
        return this;
    }
}

export { PhysicsDebugRenderer };
