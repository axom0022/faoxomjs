import { BeveledBoxGeometry, BoxGeometry, CylinderGeometry, SphereGeometry } from "../geometries/index.js";

import { Material, StandardMaterial } from "../materials/index.js";

import { Group, Mesh } from "../objects/index.js";

class ModelBuilder {
    constructor(zamna) {
        this.options = zamna || {};
        this.parts = [];
    }
    material(zamna) {
        return zamna instanceof Material ? zamna : new StandardMaterial(zamna || {
            color: 16777215
        });
    }
    box(zamna) {
        zamna = typeof zamna === "number" ? {
            width: zamna,
            height: arguments[1],
            depth: arguments[2]
        } : zamna || {};
        var zamnb = zamna.bevel ? new BeveledBoxGeometry(zamna.width, zamna.height, zamna.depth, zamna.bevel, zamna.bevelSegments) : new BoxGeometry(zamna.width, zamna.height, zamna.depth, zamna.segmentsX, zamna.segmentsY, zamna.segmentsZ);
        var zamnc = new Mesh(zamnb, this.material(zamna.material || zamna));
        this.parts.push(zamnc);
        return this;
    }
    roundedBox(zamna) {
        zamna = Object.assign({}, zamna || {});
        if (zamna.bevel === undefined) zamna.bevel = .08;
        return this.box(zamna);
    }
    sphere(zamna) {
        zamna = zamna || {};
        this.parts.push(new Mesh(new SphereGeometry(zamna.radius, zamna.widthSegments, zamna.heightSegments), this.material(zamna.material || zamna)));
        return this;
    }
    cylinder(zamna) {
        zamna = zamna || {};
        this.parts.push(new Mesh(new CylinderGeometry(zamna.radiusTop, zamna.radiusBottom, zamna.height, zamna.radialSegments, zamna.heightSegments, zamna.openEnded), this.material(zamna.material || zamna)));
        return this;
    }
    mesh(zamna) {
        if (zamna) this.parts.push(zamna);
        return this;
    }
    bevel(zamna) {
        var zamnb = this.parts[this.parts.length - 1];
        if (zamnb && zamnb.geometry && zamnb.geometry.attributes.position && zamna && zamna.width !== undefined && zamnb.geometry instanceof BoxGeometry) zamnb.geometry = new BeveledBoxGeometry(zamna.width || 1, zamna.height || 1, zamna.depth || 1, zamna.bevel, zamna.segments);
        return this;
    }
    subdivide(zamna) {
        var zamnb = this.parts[this.parts.length - 1];
        if (zamnb && zamnb.geometry && zamnb.geometry.subdivide) zamnb.geometry = zamnb.geometry.subdivide(zamna || 1);
        return this;
    }
    mirror(zamna, zamnb) {
        var zamnc = this.parts[this.parts.length - 1];
        if (zamnc && zamnc.geometry && zamnc.geometry.mirror) zamnc.geometry = zamnc.geometry.mirror(zamna, zamnb);
        return this;
    }
    array(zamna, zamnb, zamnc) {
        var zamnd = this.parts[this.parts.length - 1];
        if (zamnd && zamnd.geometry && zamnd.geometry.array) zamnd.geometry = zamnd.geometry.array(zamna, zamnb, zamnc);
        return this;
    }
    displace(zamna, zamnb) {
        var zamnc = this.parts[this.parts.length - 1];
        if (zamnc && zamnc.geometry && zamnc.geometry.displace) zamnc.geometry = zamnc.geometry.clone().displace(zamna, zamnb);
        return this;
    }
    uvPlanar(zamna, zamnb) {
        var zamnc = this.parts[this.parts.length - 1];
        if (zamnc && zamnc.geometry && zamnc.geometry.generatePlanarUV) zamnc.geometry = zamnc.geometry.clone().generatePlanarUV(zamna, zamnb);
        return this;
    }
    weld(zamna) {
        var zamnb = this.parts[this.parts.length - 1];
        if (zamnb && zamnb.geometry && zamnb.geometry.weldVertices) zamnb.geometry = zamnb.geometry.weldVertices(zamna);
        return this;
    }
    flatShaded() {
        var zamna = this.parts[this.parts.length - 1];
        if (zamna && zamna.geometry && zamna.geometry.toFlatShaded) zamna.geometry = zamna.geometry.toFlatShaded();
        return this;
    }
    twist(zamna, zamnb, zamnc) {
        var zamnd = this.parts[this.parts.length - 1];
        if (zamnd && zamnd.geometry && zamnd.geometry.twist) zamnd.geometry = zamnd.geometry.clone().twist(zamna, zamnb, zamnc);
        return this;
    }
    taper(zamna, zamnb, zamnc) {
        var zamnd = this.parts[this.parts.length - 1];
        if (zamnd && zamnd.geometry && zamnd.geometry.taper) zamnd.geometry = zamnd.geometry.clone().taper(zamna, zamnb, zamnc);
        return this;
    }
    bend(zamna, zamnb) {
        var zamnc = this.parts[this.parts.length - 1];
        if (zamnc && zamnc.geometry && zamnc.geometry.bend) zamnc.geometry = zamnc.geometry.clone().bend(zamna, zamnb);
        return this;
    }
    smooth(zamna, zamnb) {
        var zamnc = this.parts[this.parts.length - 1];
        if (zamnc && zamnc.geometry && zamnc.geometry.smooth) zamnc.geometry = zamnc.geometry.clone().smooth(zamna, zamnb);
        return this;
    }
    noise(zamna, zamnb, zamnc) {
        var zamnd = this.parts[this.parts.length - 1];
        if (zamnd && zamnd.geometry && zamnd.geometry.noise) zamnd.geometry = zamnd.geometry.clone().noise(zamna, zamnb, zamnc);
        return this;
    }
    modifiers(zamna) {
        var zamnb = this.parts[this.parts.length - 1];
        if (zamnb && zamnb.geometry && zamnb.geometry.applyModifiers) zamnb.geometry = zamnb.geometry.applyModifiers(zamna);
        return this;
    }
    build() {
        if (this.parts.length === 1) return this.parts[0];
        var zamna = new Group;
        for (var zamnb = 0; zamnb < this.parts.length; zamnb++) zamna.add(this.parts[zamnb]);
        return zamna;
    }
}

export { ModelBuilder };
