// PhysicsDebugRenderer - draws collision shapes, joints, contact points,
// AABBs, velocity vectors and sleeping state as line geometry on top of the
// scene. Zero dependencies: one LineSegments object per category, rebuilt
// only when the world changes.

import { Geometry } from "../geometries/index.js";
import { LineBasicMaterial } from "../materials/index.js";
import { Group, LineSegments } from "../objects/index.js";
import { Vector3 } from "../math/index.js";

var COLORS = {
    box: 0x4f9be8, sphere: 0x54d28e, capsule: 0xe8b64f, cylinder: 0xc98ef0,
    plane: 0x6a7f9e, convex: 0xe86f6f, mesh: 0x9a86e8, heightfield: 0x6fd8e8,
    compound: 0xe8e26f, sleeping: 0x555f6e, static: 0x8892a6,
    joint: 0xffd24f, contact: 0xff5f5f, aabb: 0x2f3a4d, velocity: 0x59c2ff
};

function pushBox(out, hw, hh, hd) {
    var x = hw, y = hh, z = hd;
    var corners = [
        [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
        [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]
    ];
    var edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (var i = 0; i < edges.length; i++) {
        out.push(corners[edges[i][0]][0], corners[edges[i][0]][1], corners[edges[i][0]][2]);
        out.push(corners[edges[i][1]][0], corners[edges[i][1]][1], corners[edges[i][1]][2]);
    }
}

function pushCircle(out, radius, segments, axis) {
    for (var i = 0; i < segments; i++) {
        var a0 = (i / segments) * Math.PI * 2, a1 = ((i + 1) / segments) * Math.PI * 2;
        var c0 = Math.cos(a0) * radius, s0 = Math.sin(a0) * radius;
        var c1 = Math.cos(a1) * radius, s1 = Math.sin(a1) * radius;
        if (axis === "y") out.push(c0, 0, s0, c1, 0, s1);
        else if (axis === "z") out.push(c0, s0, 0, c1, s1, 0);
        else out.push(0, c0, s0, 0, c1, s1);
    }
}

class PhysicsDebugRenderer {
    constructor(scene, options) {
        options = options || {};
        this.scene = scene;
        this.showShapes = options.showShapes !== false;
        this.showJoints = options.showJoints !== false;
        this.showContacts = options.showContacts !== false;
        this.showAABBs = !!options.showAABBs;
        this.showVelocities = !!options.showVelocities;
        this.showSleeping = options.showSleeping !== false;
        this.contactEvents = [];
        this.group = new Group();
        this.group.name = "physics-debug";
        this.group.renderOrder = 999;
        this._lines = {};
        this._materials = {};
        var categories = ["shapes", "joints", "contacts", "aabb", "velocity"];
        for (var i = 0; i < categories.length; i++) {
            var material = new LineBasicMaterial({ color: 0xffffff });
            material.transparent = true;
            material.opacity = categories[i] === "aabb" ? 0.5 : 0.9;
            material.depthTest = categories[i] === "contacts" ? false : true;
            material.vertexColors = true;
            this._materials[categories[i]] = material;
            var lines = new LineSegments(new Geometry(), material);
            lines.frustumCulled = false;
            this._lines[categories[i]] = lines;
            this.group.add(lines);
        }
        if (this.scene) this.scene.add(this.group);
    }

    _colorFor(body, base) {
        if (body.isStatic) return COLORS.static;
        if (this.showSleeping && body.sleeping) return COLORS.sleeping;
        return base;
    }

    _shapeLines(body, out) {
        var shape = body.shape;
        if (!shape) return;
        var color = this._colorFor(body, COLORS[shape.type] || 0xffffff);
        var marker = (color << 8) | 0xaa; // per-shape color marker entry
        var stack = [{ body: body, offset: null }];
        while (stack.length) {
            var entry = stack.pop();
            var target = entry.body;
            var s = target.shape;
            var positions = [];
            if (s.type === "box" || s.type === "obb") {
                var size = s.size || { x: 1, y: 1, z: 1 };
                pushBox(positions, size.x / 2, size.y / 2, size.z / 2);
            } else if (s.type === "sphere") {
                pushCircle(positions, s.radius || 0.5, 16, "y");
                pushCircle(positions, s.radius || 0.5, 16, "x");
                pushCircle(positions, s.radius || 0.5, 16, "z");
            } else if (s.type === "capsule" || s.type === "cylinder") {
                var r = s.radius || 0.4;
                var half = (s.height || 1) / 2;
                pushCircle(positions, r, 12, "y");
                var yTop = s.type === "capsule" ? half - r : half;
                var yBot = s.type === "capsule" ? -half + r : -half;
                pushCircle(positions, r, 12, "y");
                for (var v = positions.length - 12 * 6; v < positions.length; v += 6) positions[v + 1] = yTop;
                pushCircle(positions, r, 12, "y");
                for (var b = positions.length - 12 * 6; b < positions.length; b += 6) positions[b + 1] = yBot;
                positions.push(r, yTop, 0, r, yBot, 0, -r, yTop, 0, -r, yBot, 0, 0, yTop, r, 0, yBot, r);
            } else if (s.type === "plane") {
                var n = s.normal || new Vector3(0, 1, 0);
                var ext = 4;
                var u = Math.abs(n.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
                var t1 = new Vector3().crossVectors(n, u).normalize().multiplyScalar(ext);
                var t2 = new Vector3().crossVectors(n, t1).normalize().multiplyScalar(ext);
                var c = n.clone().multiplyScalar(s.constant || 0);
                positions.push(
                    c.x - t1.x - t2.x, c.y - t1.y - t2.y, c.z - t1.z - t2.z, c.x + t1.x - t2.x, c.y + t1.y - t2.y, c.z + t1.z - t2.z,
                    c.x + t1.x - t2.x, c.y + t1.y - t2.y, c.z + t1.z - t2.z, c.x + t1.x + t2.x, c.y + t1.y + t2.y, c.z + t1.z + t2.z,
                    c.x + t1.x + t2.x, c.y + t1.y + t2.y, c.z + t1.z + t2.z, c.x - t1.x + t2.x, c.y - t1.y + t2.y, c.z - t1.z + t2.z,
                    c.x - t1.x + t2.x, c.y - t1.y + t2.y, c.z - t1.z + t2.z, c.x - t1.x - t2.x, c.y - t1.y - t2.y, c.z - t1.z - t2.z,
                    c.x, c.y, c.z, c.x + n.x, c.y + n.y, c.z + n.z
                );
            } else if (s.type === "convex" || s.type === "mesh") {
                var verts = s.vertices || [];
                for (var vi = 1; vi < verts.length; vi++) {
                    positions.push(verts[vi - 1].x, verts[vi - 1].y, verts[vi - 1].z, verts[vi].x, verts[vi].y, verts[vi].z);
                }
            } else if (s.type === "heightfield") {
                var w = s.width || 10, d = s.depth || 10;
                var half = 5;
                positions.push(-half, 0, -half, half, 0, -half, half, 0, -half, half, 0, half, half, 0, half, -half, 0, half, -half, 0, half, -half, 0, -half);
            } else if (s.type === "compound" && s.children) {
                for (var ci = 0; ci < s.children.length; ci++) stack.push({ body: { shape: s.children[ci].shape || s.children[ci], isStatic: target.isStatic, sleeping: target.sleeping }, offset: null });
            }
            // transform local positions into body space then world
            var cos = Math.cos(target.rotation || 0), sin = Math.sin(target.rotation || 0);
            for (var p = 0; p < positions.length; p += 3) {
                var lx = positions[p], ly = positions[p + 1], lz = positions[p + 2];
                var wx, wy, wz;
                if (target.quaternion) {
                    var q = target.quaternion;
                    // rotate vector by quaternion
                    var ix = q.w * lx + q.y * lz - q.z * ly;
                    var iy = q.w * ly + q.z * lx - q.x * lz;
                    var iz = q.w * lz + q.x * ly - q.y * lx;
                    var iw = -q.x * lx - q.y * ly - q.z * lz;
                    wx = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
                    wy = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
                    wz = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;
                } else { wx = lx; wy = ly; wz = lz; }
                out.push(wx + target.position.x, wy + target.position.y, wz + target.position.z, color);
            }
        }
    }

    update(world) {
        if (!world) return this;
        var shapes = [], joints = [], contacts = [], aabbs = [], velocities = [];
        if (this.showShapes || this.showAABBs || this.showVelocities) {
            for (var i = 0; i < world.bodies.length; i++) {
                var body = world.bodies[i];
                if (this.showShapes) this._shapeLines(body, shapes);
                if (this.showAABBs && body.shape && body.shape.getAABB) {
                    var box = body.shape.getAABB(body.position, null, body.rotation);
                    if (box) {
                        var edges = [];
                        pushBox(edges, (box.max.x - box.min.x) / 2, (box.max.y - box.min.y) / 2, (box.max.z - box.min.z) / 2);
                        var cx = (box.max.x + box.min.x) / 2, cy = (box.max.y + box.min.y) / 2, cz = (box.max.z + box.min.z) / 2;
                        for (var e = 0; e < edges.length; e += 3) aabbs.push(edges[e] + cx, edges[e + 1] + cy, edges[e + 2] + cz, COLORS.aabb);
                    }
                }
                if (this.showVelocities && !body.isStatic && body.velocity && body.velocity.lengthSq() > 0.0001) {
                    velocities.push(body.position.x, body.position.y, body.position.z, COLORS.velocity);
                    velocities.push(body.position.x + body.velocity.x * 0.15, body.position.y + body.velocity.y * 0.15, body.position.z + body.velocity.z * 0.15, COLORS.velocity);
                }
            }
        }
        if (this.showJoints && world.constraints) {
            for (var c = 0; c < world.constraints.length; c++) {
                var constraint = world.constraints[c];
                var a = constraint.bodyA, b = constraint.bodyB;
                if (!a || !b) continue;
                joints.push(a.position.x, a.position.y, a.position.z, COLORS.joint);
                joints.push(b.position.x, b.position.y, b.position.z, COLORS.joint);
            }
        }
        if (this.showContacts && world.onCollision) {
            // apps forward collision events: debugRenderer.pushContact(a, b, normal, point)
            for (var k = 0; k < this.contactEvents.length; k++) {
                var event = this.contactEvents[k];
                var point = event.point;
                if (!point) continue;
                contacts.push(point.x - 0.06, point.y - 0.06, point.z - 0.06, COLORS.contact);
                contacts.push(point.x + 0.06, point.y + 0.06, point.z + 0.06, COLORS.contact);
                contacts.push(point.x - 0.06, point.y + 0.06, point.z - 0.06, COLORS.contact);
                contacts.push(point.x + 0.06, point.y - 0.06, point.z + 0.06, COLORS.contact);
            }
            this.contactEvents.length = 0;
        }
        this._flush("shapes", shapes);
        this._flush("joints", joints);
        this._flush("contacts", contacts);
        this._flush("aabb", aabbs);
        this._flush("velocity", velocities);
        return this;
    }

    pushContact(a, b, normal, penetration, point) {
        if (this.contactEvents.length < 256) this.contactEvents.push({ point: point ? point.clone ? point.clone() : point : null });
        return this;
    }

    _flush(category, data) {
        var lines = this._lines[category];
        if (!lines) return;
        var geometry = lines.geometry;
        var positions = new Float32Array(data.length / 4 * 3);
        var colors = new Float32Array(data.length / 4 * 3);
        var vertexColors = [];
        for (var i = 0, v = 0; i < data.length; i += 4, v += 3) {
            positions[v] = data[i];
            positions[v + 1] = data[i + 1];
            positions[v + 2] = data[i + 2];
            var color = data[i + 3];
            vertexColors.push(((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255);
        }
        for (var c = 0; c < vertexColors.length; c++) colors[c] = vertexColors[c];
        geometry.setAttribute("position", positions, 3);
        geometry.setAttribute("color", colors, 3);
        lines.visible = positions.length > 0;
    }

    setVisible(visible) { this.group.visible = !!visible; return this; }

    dispose() {
        if (this.scene) this.scene.remove(this.group);
        return this;
    }
}

export { PhysicsDebugRenderer };
