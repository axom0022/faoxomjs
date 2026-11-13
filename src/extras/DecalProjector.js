import { Object3D } from "../core/index.js";
import { Raycaster } from "../core/Raycaster.js";
import { Geometry } from "../geometries/index.js";
import { Vector3 } from "../math/index.js";
import { Mesh } from "../objects/index.js";
import { ShaderMaterial } from "../materials/index.js";

// DecalProjector - projected decals with normal conformance (roadmap item 17).
//
// Renders a decal by projecting a grid of rays along the projector's local
// -Z axis onto the target meshes, keeping only hits inside the projector's
// depth range. Surface triangles steeper than angleFade are dropped, and a
// soft fade is applied between the facing limit and the cutoff, so decals
// wrap convincingly over curved surfaces and let go at grazing angles:
//
//   const projector = new DecalProjector()
//   projector.position.set(0, 3, 0)
//   projector.lookAt(0, 0, 0)          // -Z aims at the surface
//   projector.setSize(2, 2, 4)         // width, height, max depth
//   scene.add(projector.project(groundMesh, { texture: splatTexture }))
//
// project() returns the projector itself with a decal mesh child (also
// available as .decal). Re-project any time the surface or pose changes.
class DecalProjector extends Object3D {
    constructor(options) {
        options = options || {};
        super();
        this.type = "DecalProjector";
        this.width = options.width || 1;
        this.height = options.height || 1;
        this.depth = options.depth || 4;
        this.resolution = Math.max(4, Math.floor(options.resolution || 16));
        this.angleFade = options.angleFade === undefined ? 0.35 : options.angleFade; // dot cutoff
        this.material = options.material || null;
        this.texture = options.texture || null;
        this.opacity = options.opacity === undefined ? 1 : options.opacity;
        this.decal = null;
        this.isDecalProjector = true;
    }

    setSize(width, height, depth) {
        this.width = width;
        this.height = height;
        if (depth !== undefined) this.depth = depth;
        return this;
    }

    _defaultMaterial() {
        var self = this;
        return new ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: "double",
            uniforms: {
                map: { value: this.texture },
                uOpacity: { value: this.opacity }
            },
            vertexShader:
                "varying vec2 vUvDecal; varying float vFade;" +
                "void main(){ vUvDecal = uv; vFade = color.r; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }",
            fragmentShader:
                "precision highp float; uniform sampler2D map; uniform float uOpacity; varying vec2 vUvDecal; varying float vFade;" +
                "void main(){ vec4 texel = texture2D(map, vUvDecal); gl_FragColor = vec4(texel.rgb, texel.a * vFade * uOpacity); if (gl_FragColor.a < 0.02) discard; }"
        });
    }

    _faceNormal(object, faceIndex, target) {
        var geometry = object.geometry;
        var position = geometry.attributes.position;
        if (!position) return null;
        var index = geometry.index;
        var itemSize = position.itemSize || 3;
        var i0 = index ? index[faceIndex * 3] : faceIndex * 3;
        var i1 = index ? index[faceIndex * 3 + 1] : faceIndex * 3 + 1;
        var i2 = index ? index[faceIndex * 3 + 2] : faceIndex * 3 + 2;
        var a = new Vector3(position.array[i0 * itemSize], position.array[i0 * itemSize + 1], position.array[i0 * itemSize + 2]);
        var b = new Vector3(position.array[i1 * itemSize], position.array[i1 * itemSize + 1], position.array[i1 * itemSize + 2]);
        var c = new Vector3(position.array[i2 * itemSize], position.array[i2 * itemSize + 1], position.array[i2 * itemSize + 2]);
        var normal = target || new Vector3();
        normal.subVectors(c, b).cross(new Vector3().subVectors(a, b)).normalize();
        // to world (rotation/scale-tolerant enough for fade purposes)
        var elements = object.matrixWorld ? object.matrixWorld.elements : null;
        if (elements) {
            normal.set(
                elements[0] * normal.x + elements[4] * normal.y + elements[8] * normal.z,
                elements[1] * normal.x + elements[5] * normal.y + elements[9] * normal.z,
                elements[2] * normal.x + elements[6] * normal.y + elements[10] * normal.z
            ).normalize();
        }
        return normal;
    }

    project(targets, options) {
        options = options || {};
        var targetList = Array.isArray(targets) ? targets : [targets];
        this.updateMatrixWorld(true);
        for (var targetIndex = 0; targetIndex < targetList.length; targetIndex++) {
            if (targetList[targetIndex] && targetList[targetIndex].updateMatrixWorld) targetList[targetIndex].updateMatrixWorld(true);
        }
        // projection axis: projector local -Z in world space
        var elements = this.matrixWorld.elements;
        var axis = new Vector3(-elements[8], -elements[9], -elements[10]).normalize();
        var right = new Vector3(elements[0], elements[1], elements[2]).normalize();
        var up = new Vector3(elements[4], elements[5], elements[6]).normalize();
        var origin = new Vector3().setFromMatrixPosition(this.matrixWorld);

        var resolution = options.resolution || this.resolution;
        var raycaster = new Raycaster(new Vector3(), new Vector3(0, 0, -1), 0, this.depth);
        var hits = new Array(resolution * resolution);
        var uvs = new Array(resolution * resolution);
        var fades = new Float32Array(resolution * resolution);

        var gridCenter = (resolution - 1) / 2;
        for (var gy = 0; gy < resolution; gy++) {
            for (var gx = 0; gx < resolution; gx++) {
                var index = gy * resolution + gx;
                var offsetX = (gx - gridCenter) / gridCenter * this.width * 0.5;
                var offsetY = (gy - gridCenter) / gridCenter * this.height * 0.5;
                var rayOrigin = origin.clone()
                    .addScaledVector(right, offsetX)
                    .addScaledVector(up, offsetY);
                raycaster.ray.origin.copy(rayOrigin);
                raycaster.ray.direction.copy(axis);
                var results = raycaster.intersectObjects(targetList, false);
                var hit = null;
                for (var r = 0; r < results.length; r++) {
                    if (results[r].distance <= this.depth) { hit = results[r]; break; }
                }
                if (hit && hit.faceIndex !== undefined && hit.object) {
                    var surfaceNormal = this._faceNormal(hit.object, hit.faceIndex);
                    var facing = surfaceNormal ? surfaceNormal.dot(axis) : 1;
                    if (facing < 0) facing = -facing;
                    // normal conformance: full weight facing the projector,
                    // soft fade down to the cutoff, hard drop beyond it
                    var fade = (facing - this.angleFade) / (1 - this.angleFade);
                    if (fade <= 0) { hits[index] = null; continue; }
                    fades[index] = Math.min(1, fade);
                } else if (hit) {
                    fades[index] = 1;
                } else {
                    hits[index] = null;
                    continue;
                }
                // lift off the surface slightly to avoid z-fighting
                var lifted = hit.point.clone().addScaledVector(hit.object ? this._faceNormal(hit.object, hit.faceIndex) || axis : axis, 0.003);
                // store in the projector's local frame (the decal is its child)
                hits[index] = this.worldToLocal(lifted);
                uvs[index] = [gx / (resolution - 1), gy / (resolution - 1)];
            }
        }

        // build triangles between valid neighbouring grid cells
        var positions = [], uvArray = [], colorArray = [], indices = [];
        var vertexIndex = 0;
        var vertexAt = {};
        for (var y = 0; y < resolution; y++) {
            for (var x = 0; x < resolution; x++) {
                var i = y * resolution + x;
                if (hits[i]) {
                    vertexAt[i] = vertexIndex++;
                    positions.push(hits[i].x, hits[i].y, hits[i].z);
                    uvArray.push(uvs[i][0], uvs[i][1]);
                    // fade rides the engine-bound vertex colour attribute
                    colorArray.push(fades[i], fades[i], fades[i]);
                }
            }
        }
        for (var yy = 0; yy < resolution - 1; yy++) {
            for (var xx = 0; xx < resolution - 1; xx++) {
                var a = yy * resolution + xx;
                var b = yy * resolution + xx + 1;
                var c = (yy + 1) * resolution + xx + 1;
                var d = (yy + 1) * resolution + xx;
                if (hits[a] && hits[b] && hits[c] && hits[d]) {
                    indices.push(vertexAt[a], vertexAt[b], vertexAt[c], vertexAt[a], vertexAt[c], vertexAt[d]);
                }
            }
        }

        if (this.decal) { this.remove(this.decal); this.decal = null; }
        if (!indices.length) return this;

        var geometry = new Geometry();
        geometry.setAttribute("position", new Float32Array(positions), 3);
        geometry.setAttribute("uv", new Float32Array(uvArray), 2);
        geometry.setAttribute("color", new Float32Array(colorArray), 3);
        geometry.setIndex(new Uint16Array(indices));
        geometry.computeBounds();
        var material = this.material || this._defaultMaterial();
        this.decal = new Mesh(geometry, material);
        this.decal.renderOrder = 20;
        this.add(this.decal);
        return this;
    }
}

export { DecalProjector };
