import { BeveledBoxGeometry, BoxGeometry, CylinderGeometry, SphereGeometry } from "../geometries/index.js";
import { Material, StandardMaterial } from "../materials/index.js";
import { Group, Mesh } from "../objects/index.js";

class ModelBuilder {
    constructor(options) { this.options = options || {}; this.parts = []; }
    material(options) { return options instanceof Material ? options : new StandardMaterial(options || { color: 0xffffff }); }
    box(options) { options = typeof options === "number" ? { width: options, height: arguments[1], depth: arguments[2] } : options || {}; var geometry = options.bevel ? new BeveledBoxGeometry(options.width, options.height, options.depth, options.bevel, options.bevelSegments) : new BoxGeometry(options.width, options.height, options.depth, options.segmentsX, options.segmentsY, options.segmentsZ); var mesh = new Mesh(geometry, this.material(options.material || options)); this.parts.push(mesh); return this; }
    roundedBox(options) { options = Object.assign({}, options || {}); if (options.bevel === undefined) options.bevel = 0.08; return this.box(options); }
    sphere(options) { options = options || {}; this.parts.push(new Mesh(new SphereGeometry(options.radius, options.widthSegments, options.heightSegments), this.material(options.material || options))); return this; }
    cylinder(options) { options = options || {}; this.parts.push(new Mesh(new CylinderGeometry(options.radiusTop, options.radiusBottom, options.height, options.radialSegments, options.heightSegments, options.openEnded), this.material(options.material || options))); return this; }
    mesh(mesh) { if (mesh) this.parts.push(mesh); return this; }
    bevel(options) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.attributes.position && options && options.width !== undefined && last.geometry instanceof BoxGeometry) last.geometry = new BeveledBoxGeometry(options.width || 1, options.height || 1, options.depth || 1, options.bevel, options.segments); return this; }
    subdivide(levels) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.subdivide) last.geometry = last.geometry.subdivide(levels || 1); return this; }
    mirror(axis, options) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.mirror) last.geometry = last.geometry.mirror(axis, options); return this; }
    array(count, offset, options) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.array) last.geometry = last.geometry.array(count, offset, options); return this; }
    displace(source, options) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.displace) last.geometry = last.geometry.clone().displace(source, options); return this; }
    uvPlanar(axis, options) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.generatePlanarUV) last.geometry = last.geometry.clone().generatePlanarUV(axis, options); return this; }
    weld(tolerance) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.weldVertices) last.geometry = last.geometry.weldVertices(tolerance); return this; }
    flatShaded() { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.toFlatShaded) last.geometry = last.geometry.toFlatShaded(); return this; }
    twist(angle, axis, origin) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.twist) last.geometry = last.geometry.clone().twist(angle, axis, origin); return this; }
    taper(factor, axis, origin) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.taper) last.geometry = last.geometry.clone().taper(factor, axis, origin); return this; }
    bend(angle, axis) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.bend) last.geometry = last.geometry.clone().bend(angle, axis); return this; }
    smooth(iterations, factor) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.smooth) last.geometry = last.geometry.clone().smooth(iterations, factor); return this; }
    noise(scale, strength, seed) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.noise) last.geometry = last.geometry.clone().noise(scale, strength, seed); return this; }
    modifiers(modifiers) { var last = this.parts[this.parts.length - 1]; if (last && last.geometry && last.geometry.applyModifiers) last.geometry = last.geometry.applyModifiers(modifiers); return this; }
    build() { if (this.parts.length === 1) return this.parts[0]; var group = new Group(); for (var i = 0; i < this.parts.length; i++) group.add(this.parts[i]); return group; }
}

export { ModelBuilder };
