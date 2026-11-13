import { Matrix4 } from "../math/index.js";

const particleswgsl = `
struct SimParams {
    p0: vec4<f32>,
    p1: vec4<f32>,
    p2: vec4<f32>,
    p3: vec4<f32>,
    p4: vec4<f32>,
    p5: vec4<f32>,
    p6: vec4<f32>,
    p7: vec4<f32>,
};
struct AttractorParams { a: array<vec4<f32>, 8> };
struct ColParams {
    vp: mat4x4<f32>,
    invvp: mat4x4<f32>,
    campos: vec4<f32>,
    viewport: vec4<f32>,
};
struct KeyParams { cam: vec4<f32>, fwd: vec4<f32> };
struct BfParams { k: u32, j: u32, n: u32, pad: u32 };
struct RParams {
    viewproj: mat4x4<f32>,
    right: vec4<f32>,
    up: vec4<f32>,
    misc: vec4<f32>,
};
struct Particle {
    a: vec4<f32>,
    b: vec4<f32>,
    c: vec4<f32>,
    d: vec4<f32>,
};
@group(0) @binding(0) var<uniform> simparams: SimParams;
@group(0) @binding(1) var<uniform> attractors: AttractorParams;
@group(0) @binding(2) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(3) var scenedepth: texture_depth_2d;
@group(0) @binding(4) var<uniform> colparams: ColParams;
@group(0) @binding(5) var<storage, read_write> collisioncount: array<atomic<u32>>;
fn uhash(a: u32, b: u32, c: u32) -> u32 {
    var h = (a * 747796405u) ^ (b * 2891336453u) ^ (c * 374761393u);
    h = h ^ (h >> 15u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return h;
}
fn rnd(seed: u32, idx: u32, gen: u32, c: u32) -> f32 {
    return f32(uhash(seed, idx, gen * 16u + c)) / 4294967296.0;
}
fn emitterBasis(dirv: vec3<f32>) -> mat3x3<f32> {
    var d = normalize(dirv);
    var a = vec3<f32>(0.0, 1.0, 0.0);
    if (abs(d.y) > 0.99) { a = vec3<f32>(1.0, 0.0, 0.0); }
    var t = normalize(cross(a, d));
    var b = cross(d, t);
    return mat3x3<f32>(t, b, d);
}
fn spawnPosition(shape: u32, e: vec4<f32>, p3: vec4<f32>, p4: vec4<f32>, p5: vec4<f32>, seed: u32, idx: u32, gen: u32) -> vec3<f32> {
    if (shape == 0u) { return e.xyz; }
    if (shape == 1u) {
        let r1 = rnd(seed, idx, gen, 0u);
        let r2 = rnd(seed, idx, gen, 1u);
        let r3 = rnd(seed, idx, gen, 2u);
        let z = 1.0 - 2.0 * r1;
        let phi = 6.283185307179586 * r2;
        let s = sqrt(max(0.0, 1.0 - z * z));
        return e.xyz + vec3<f32>(s * cos(phi), z, s * sin(phi)) * (p3.x * r3);
    }
    if (shape == 2u) {
        let r1 = rnd(seed, idx, gen, 0u);
        let r2 = rnd(seed, idx, gen, 1u);
        let r3 = rnd(seed, idx, gen, 2u);
        return e.xyz + vec3<f32>(r1 - 0.5, r2 - 0.5, r3 - 0.5) * p5.xyz;
    }
    let r1 = rnd(seed, idx, gen, 0u);
    let r2 = rnd(seed, idx, gen, 1u);
    let phi = 6.283185307179586 * r2;
    let rad = p3.x * sqrt(r1);
    let basis = emitterBasis(p4.xyz);
    return e.xyz + (basis[0] * cos(phi) + basis[1] * sin(phi)) * rad;
}
fn spawnVelocity(p3: vec4<f32>, p4: vec4<f32>, seed: u32, idx: u32, gen: u32) -> vec3<f32> {
    let r4 = rnd(seed, idx, gen, 3u);
    let r5 = rnd(seed, idx, gen, 4u);
    let basis = emitterBasis(p4.xyz);
    let tilt = p3.w * r4;
    let phi = 6.283185307179586 * r5;
    let dirv = basis[2] * cos(tilt) + (basis[0] * cos(phi) + basis[1] * sin(phi)) * sin(tilt);
    let speed = mix(p3.y, p3.z, rnd(seed, idx, gen, 5u));
    return dirv * speed;
}
fn worldFromDepth(uv: vec2<f32>, d: f32) -> vec3<f32> {
    let ndc = vec3<f32>(uv.x * 2.0 - 1.0, 1.0 - 2.0 * uv.y, d * 2.0 - 1.0);
    var v = colparams.invvp * vec4<f32>(ndc, 1.0);
    return v.xyz / v.w;
}
@compute @workgroup_size(64)
fn simulate(@builtin(global_invocation_id) gid: vec3<u32>) {
    let count = u32(simparams.p1.w);
    if (gid.x >= count) { return; }
    var p = particles[gid.x];
    let seed = u32(simparams.p0.y);
    p.a.w = p.a.w + simparams.p0.x;
    if (p.a.w >= p.c.w) {
        let gen = u32(p.d.z) + 1u;
        p.d.z = f32(gen);
        let shape = u32(simparams.p2.w);
        p.a.xyz = spawnPosition(shape, simparams.p2, simparams.p3, simparams.p4, simparams.p5, seed, gid.x, gen);
        p.b.xyz = spawnVelocity(simparams.p3, simparams.p4, seed, gid.x, gen);
        p.b.w = mix(simparams.p6.w, simparams.p7.x, rnd(seed, gid.x, gen, 7u));
        p.c.w = mix(simparams.p4.w, simparams.p5.w, rnd(seed, gid.x, gen, 6u));
        p.a.w = 0.0;
        p.c.rgb = simparams.p6.rgb;
    } else {
        var acc = vec3<f32>(0.0, simparams.p0.z, 0.0);
        let na = u32(simparams.p7.w);
        for (var i = 0u; i < 4u; i = i + 1u) {
            if (i >= na) { break; }
            let ap = attractors.a[i * 2u].xyz;
            let astr = attractors.a[i * 2u].w;
            let ar = attractors.a[i * 2u + 1u].x;
            let delta = ap - p.a.xyz;
            let dist = length(delta);
            if (dist > 0.0001 && dist < ar) {
                acc = acc + (delta / dist) * (astr * (1.0 - dist / ar));
            }
        }
        p.b.xyz = p.b.xyz + acc * simparams.p0.x;
        p.b.xyz = p.b.xyz * max(0.0, 1.0 - simparams.p0.w * simparams.p0.x);
        p.a.xyz = p.a.xyz + p.b.xyz * simparams.p0.x;
        if (colparams.viewport.w > 0.5) {
            let clip = colparams.vp * vec4<f32>(p.a.xyz, 1.0);
            if (clip.w > 0.0) {
                let ndc = clip.xyz / clip.w;
                if (abs(ndc.x) <= 1.0 && abs(ndc.y) <= 1.0 && ndc.z <= 1.0) {
                    let uv = vec2<f32>(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
                    let w = u32(colparams.viewport.x);
                    let h = u32(colparams.viewport.y);
                    var tx = i32(clamp(uv.x * colparams.viewport.x, 0.0, colparams.viewport.x - 1.0));
                    var ty = i32(clamp(uv.y * colparams.viewport.y, 0.0, colparams.viewport.y - 1.0));
                    let d0 = textureLoad(scenedepth, vec2<i32>(tx, ty), 0);
                    if (d0 < 0.999999) {
                        var txp = tx + 1; if (txp >= i32(w)) { txp = i32(w) - 1; }
                        var typ = ty + 1; if (typ >= i32(h)) { typ = i32(h) - 1; }
                        let uv0 = vec2<f32>((f32(tx) + 0.5) / colparams.viewport.x, (f32(ty) + 0.5) / colparams.viewport.y);
                        let uvx = vec2<f32>((f32(txp) + 0.5) / colparams.viewport.x, (f32(ty) + 0.5) / colparams.viewport.y);
                        let uvy = vec2<f32>((f32(tx) + 0.5) / colparams.viewport.x, (f32(typ) + 0.5) / colparams.viewport.y);
                        let scene0 = worldFromDepth(uv0, d0);
                        let dxp = textureLoad(scenedepth, vec2<i32>(txp, ty), 0);
                        let dyp = textureLoad(scenedepth, vec2<i32>(tx, typ), 0);
                        var px = worldFromDepth(uvx, dxp);
                        var py = worldFromDepth(uvy, dyp);
                        if (dxp >= 0.999999) { px = scene0 + vec3<f32>(0.05, 0.0, 0.0); }
                        if (dyp >= 0.999999) { py = scene0 + vec3<f32>(0.0, 0.05, 0.0); }
                        var n = normalize(cross(px - scene0, py - scene0));
                        if (dot(n, colparams.campos.xyz - scene0) < 0.0) { n = -n; }
                        let pen = dot(p.a.xyz - scene0, n);
                        let rresp = simparams.p1.z * 1.6;
                        let slow = dot(p.b.xyz, p.b.xyz) < 2.25;
                        if (pen < simparams.p1.z || (pen < rresp && slow)) {
                            if (pen < simparams.p1.z) {
                                p.a.xyz = p.a.xyz + n * (simparams.p1.z - pen);
                            }
                            let vn = dot(p.b.xyz, n);
                            if (vn < 0.0) {
                                var vt = p.b.xyz - n * vn;
                                p.b.xyz = vt * (1.0 - simparams.p1.y) + n * (-vn * simparams.p1.x);
                                atomicAdd(&collisioncount[0], 1u);
                            }
                        }
                    }
                }
            }
        }
    }
    particles[gid.x] = p;
}
@group(0) @binding(0) var<uniform> keyparams: KeyParams;
@group(0) @binding(1) var<storage, read_write> sortkeys: array<f32>;
@group(0) @binding(2) var<storage, read_write> sortindices: array<u32>;
@group(0) @binding(3) var<storage, read> simparticles: array<Particle>;
@compute @workgroup_size(64)
fn computeKeys(@builtin(global_invocation_id) gid: vec3<u32>) {
    let capacity = u32(keyparams.fwd.w);
    let count = u32(keyparams.cam.w);
    if (gid.x >= capacity) { return; }
    if (gid.x >= count) {
        sortkeys[gid.x] = -1e30;
        sortindices[gid.x] = gid.x;
        return;
    }
    let p = simparticles[gid.x];
    let depth = dot(p.a.xyz - keyparams.cam.xyz, keyparams.fwd.xyz);
    sortkeys[gid.x] = -depth;
    sortindices[gid.x] = gid.x;
}
@group(0) @binding(0) var<uniform> bfparams: BfParams;
@group(0) @binding(1) var<storage, read_write> bkeys: array<f32>;
@group(0) @binding(2) var<storage, read_write> bindices: array<u32>;
@compute @workgroup_size(64)
fn bitonic(@builtin(global_invocation_id) gid: vec3<u32>) {
    let n = bfparams.n;
    if (gid.x >= n) { return; }
    let i = gid.x;
    let j = bfparams.j;
    if ((i & j) != 0u) { return; }
    let partner = i | j;
    let ascending = (i & bfparams.k) == 0u;
    let ka = bkeys[i];
    let kb = bkeys[partner];
    var swap = false;
    if (ascending && ka > kb) { swap = true; }
    if ((!ascending) && ka < kb) { swap = true; }
    if (swap) {
        bkeys[i] = kb;
        bkeys[partner] = ka;
        let t = bindices[i];
        bindices[i] = bindices[partner];
        bindices[partner] = t;
    }
}
@group(0) @binding(0) var<uniform> rparams: RParams;
@group(1) @binding(0) var<storage, read> rparticles: array<Particle>;
@group(1) @binding(1) var<storage, read> rindices: array<u32>;
struct VSOut {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) quad: vec2<f32>,
};
@vertex
fn particlevs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VSOut {
    var corners = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0)
    );
    let c = corners[vi];
    let si = rindices[ii];
    let p = rparticles[si];
    let age = p.a.w;
    let life = max(p.c.w, 0.0001);
    var alpha = 1.0;
    let fi = rparams.misc.x * life;
    let fo = rparams.misc.y * life;
    if (fi > 0.0001) { alpha = alpha * clamp(age / fi, 0.0, 1.0); }
    if (fo > 0.0001) { alpha = alpha * clamp((life - age) / fo, 0.0, 1.0); }
    let world = p.a.xyz + (rparams.right.xyz * c.x + rparams.up.xyz * c.y) * p.b.w;
    let clip = rparams.viewproj * vec4<f32>(world, 1.0);
    var o: VSOut;
    o.position = vec4<f32>(clip.xy, clip.z * 0.5 + clip.w * 0.5, clip.w);
    o.color = vec4<f32>(p.c.rgb, alpha);
    o.quad = c;
    return o;
}
@fragment
fn particlefs(in: VSOut) -> @location(0) vec4<f32> {
    let r = dot(in.quad, in.quad);
    if (r > 1.0) { discard; }
    let a = in.color.a * max(0.0, 1.0 - r);
    if (a < 0.004) { discard; }
    return vec4<f32>(in.color.rgb, a);
}
`;

function uhash(a, b, c) {
    var h = (Math.imul(a, 747796405) ^ Math.imul(b, 2891336453) ^ Math.imul(c, 374761393)) | 0;
    h = (h ^ (h >>> 15)) | 0;
    h = Math.imul(h, 2246822519) | 0;
    h = (h ^ (h >>> 13)) >>> 0;
    return h >>> 0;
}
function prand(seed, idx, gen, c) {
    return uhash(seed | 0, idx >>> 0, ((gen * 16 + c) | 0) >>> 0) / 4294967296;
}
function normalize3(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
}
function cross3(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function emitterBasisJS(dir) {
    var d = normalize3(dir);
    var a = Math.abs(d[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0];
    var t = normalize3(cross3(a, d));
    var b = cross3(d, t);
    return [t, b, d];
}
function mixf(a, b, t) { return a + (b - a) * t; }

/** GPU particle system: compute simulation (gravity, drag, up to 4 attractors, respawn on
 *  death from a seeded emitter), screen-space depth collision against the scene depth buffer,
 *  and a GPU bitonic sort by view depth for correct alpha ordering. Standalone integration in
 *  the GaussianSplat/FFTOcean style: update(dt, {camera, depthView}) each frame, then
 *  render(view, depthView, camera) after the scene pass - particles depth-test against the
 *  scene and blend over it. options: maxParticles (rounded up to a power of two; the padded
 *  slots never render), seed, emitter {position, shape "point"|"sphere"|"box"|"cone", radius,
 *  extents, direction, spread, speed [min,max], lifetime [min,max], size [min,max], color},
 *  gravity (y-acceleration), drag, restitution, friction, collisionRadius, attractors
 *  [{position, strength, radius}], blend "alpha"|"additive", fade {in, out} (lifetime
 *  fractions), depthFormat. */
class GPUParticles {
    constructor(renderer, options) {
        options = options || {};
        if (!renderer || !renderer.device) throw new Error("GPUParticles requires a WebGPURenderer");
        this.renderer = renderer;
        this.device = renderer.device;
        this.disposed = false;
        var max = Math.floor(options.maxParticles === undefined ? 4096 : options.maxParticles);
        if (max < 16 || max > 262144) throw new Error("GPUParticles maxParticles must be in [16, 262144]");
        this.maxParticles = max;
        var cap = 1;
        while (cap < max) cap <<= 1;
        this.capacity = cap;
        this.seed = (options.seed === undefined ? 1 : options.seed) | 0;
        this.emitter = this._normEmitter(options.emitter);
        this.gravity = options.gravity === undefined ? 0 : options.gravity;
        this.drag = Math.max(0, options.drag === undefined ? 0 : options.drag);
        this.restitution = Math.min(1, Math.max(0, options.restitution === undefined ? 0.3 : options.restitution));
        this.friction = Math.min(1, Math.max(0, options.friction === undefined ? 0.2 : options.friction));
        this.collisionRadius = Math.max(0, options.collisionRadius === undefined ? 0.05 : options.collisionRadius);
        this.attractors = (options.attractors || []).slice(0, 4).map(function (a) {
            return { position: a.position || { x: 0, y: 0, z: 0 }, strength: a.strength || 0, radius: a.radius || 1 };
        });
        this.blend = options.blend === "additive" ? "additive" : "alpha";
        this.fade = { in: Math.max(0, options.fade && options.fade.in !== undefined ? options.fade.in : 0.1), out: Math.max(0, options.fade && options.fade.out !== undefined ? options.fade.out : 0.25) };
        this.depthFormat = options.depthFormat || "depth24plus";
        this.time = 0;
        this.stats = { updates: 0, simPasses: 0, sortPasses: 0, collisions: 0, particles: max, capacity: cap };
        this._buildGPU();
        this.seedAll();
    }
    _normEmitter(e) {
        e = e || {};
        var shape = e.shape === "sphere" ? 1 : e.shape === "box" ? 2 : e.shape === "cone" ? 3 : 0;
        return {
            position: { x: e.position && e.position.x || 0, y: e.position && e.position.y || 0, z: e.position && e.position.z || 0 },
            shape: shape,
            radius: Math.max(0, e.radius === undefined ? 0 : e.radius),
            extents: { x: e.extents && e.extents.x || 1, y: e.extents && e.extents.y || 1, z: e.extents && e.extents.z || 1 },
            direction: { x: e.direction && e.direction.x !== undefined ? e.direction.x : 0, y: e.direction && e.direction.y !== undefined ? e.direction.y : 1, z: e.direction && e.direction.z !== undefined ? e.direction.z : 0 },
            spread: Math.max(0, e.spread === undefined ? 0 : e.spread),
            speed: [e.speed && e.speed[0] !== undefined ? e.speed[0] : 1, e.speed && e.speed[1] !== undefined ? e.speed[1] : 1],
            lifetime: [e.lifetime && e.lifetime[0] !== undefined ? e.lifetime[0] : 2, e.lifetime && e.lifetime[1] !== undefined ? e.lifetime[1] : 2],
            size: [e.size && e.size[0] !== undefined ? e.size[0] : 0.2, e.size && e.size[1] !== undefined ? e.size[1] : 0.2],
            color: { r: e.color && e.color.r !== undefined ? e.color.r : 1, g: e.color && e.color.g !== undefined ? e.color.g : 1, b: e.color && e.color.b !== undefined ? e.color.b : 1 }
        };
    }
    _spawnReference(idx, gen) {
        var e = this.emitter;
        var seed = this.seed;
        var r = function (c) { return prand(seed, idx, gen, c); };
        var pos = [e.position.x, e.position.y, e.position.z];
        if (e.shape === 1) {
            var z = 1 - 2 * r(0), phi = 6.283185307179586 * r(1), rad = e.radius * r(2);
            var s = Math.sqrt(Math.max(0, 1 - z * z));
            pos = [pos[0] + s * Math.cos(phi) * rad, pos[1] + z * rad, pos[2] + s * Math.sin(phi) * rad];
        } else if (e.shape === 2) {
            pos = [pos[0] + (r(0) - 0.5) * e.extents.x, pos[1] + (r(1) - 0.5) * e.extents.y, pos[2] + (r(2) - 0.5) * e.extents.z];
        } else if (e.shape === 3) {
            var phi2 = 6.283185307179586 * r(1), rad2 = e.radius * Math.sqrt(r(0));
            var basis = emitterBasisJS([e.direction.x, e.direction.y, e.direction.z]);
            pos = [pos[0] + (basis[0][0] * Math.cos(phi2) + basis[1][0] * Math.sin(phi2)) * rad2,
                   pos[1] + (basis[0][1] * Math.cos(phi2) + basis[1][1] * Math.sin(phi2)) * rad2,
                   pos[2] + (basis[0][2] * Math.cos(phi2) + basis[1][2] * Math.sin(phi2)) * rad2];
        }
        var basis2 = emitterBasisJS([e.direction.x, e.direction.y, e.direction.z]);
        var tilt = e.spread * r(3), phi3 = 6.283185307179586 * r(4);
        var dir = [0, 0, 0];
        for (var ax = 0; ax < 3; ax++) {
            dir[ax] = basis2[2][ax] * Math.cos(tilt) + (basis2[0][ax] * Math.cos(phi3) + basis2[1][ax] * Math.sin(phi3)) * Math.sin(tilt);
        }
        var speed = mixf(e.speed[0], e.speed[1], r(5));
        var vel = [dir[0] * speed, dir[1] * speed, dir[2] * speed];
        var lifetime = mixf(e.lifetime[0], e.lifetime[1], r(6));
        var size = mixf(e.size[0], e.size[1], r(7));
        return { pos: pos, vel: vel, lifetime: lifetime, size: size, color: [e.color.r, e.color.g, e.color.b] };
    }
    seedAll() {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        var data = new Float32Array(this.capacity * 16);
        for (var i = 0; i < this.maxParticles; i++) {
            var sp = this._spawnReference(i, 0);
            var o = i * 16;
            data[o] = sp.pos[0]; data[o + 1] = sp.pos[1]; data[o + 2] = sp.pos[2]; data[o + 3] = 0;
            data[o + 4] = sp.vel[0]; data[o + 5] = sp.vel[1]; data[o + 6] = sp.vel[2]; data[o + 7] = sp.size;
            data[o + 8] = sp.color[0]; data[o + 9] = sp.color[1]; data[o + 10] = sp.color[2]; data[o + 11] = sp.lifetime;
            data[o + 12] = 0; data[o + 13] = 0; data[o + 14] = 0; data[o + 15] = 0;
        }
        this.device.queue.writeBuffer(this.particlebuffer, 0, data);
        var idx = new Uint32Array(this.capacity);
        for (var i2 = 0; i2 < this.capacity; i2++) idx[i2] = i2;
        this.device.queue.writeBuffer(this.indicesbuffer, 0, idx);
        this._mirror = data.slice();
        this.stats.collisions = 0;
        this.device.queue.writeBuffer(this.collisioncounter, 0, new Uint32Array([0]));
        return this;
    }
    _buildGPU() {
        var device = this.device;
        var cap = this.capacity;
        this.module = device.createShaderModule({ code: particleswgsl });
        this.simpipeline = device.createComputePipeline({ layout: "auto", compute: { module: this.module, entryPoint: "simulate" } });
        this.keypipeline = device.createComputePipeline({ layout: "auto", compute: { module: this.module, entryPoint: "computeKeys" } });
        this.bflayout = device.createBindGroupLayout({ entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", hasDynamicOffset: true } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ] });
        this.bfpipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [this.bflayout] }), compute: { module: this.module, entryPoint: "bitonic" } });
        var blend = this.blend === "additive"
            ? { color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" }, alpha: { srcFactor: "one", dstFactor: "one", operation: "add" } }
            : { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" } };
        this.renderpipeline = device.createRenderPipeline({
            layout: "auto",
            vertex: { module: this.module, entryPoint: "particlevs" },
            fragment: { module: this.module, entryPoint: "particlefs", targets: [{ format: this.renderer.format, blend: blend }] },
            primitive: { topology: "triangle-list", cullMode: "none" },
            depthStencil: { format: this.depthFormat, depthWriteEnabled: false, depthCompare: "less" }
        });
        this.particlebuffer = device.createBuffer({ size: cap * 64, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.keysbuffer = device.createBuffer({ size: cap * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        this.indicesbuffer = device.createBuffer({ size: cap * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        this.collisioncounter = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        this.simuniform = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.attractoruniform = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.coluniform = device.createBuffer({ size: 160, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.keyuniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.runiform = device.createBuffer({ size: 112, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var stages = 0;
        for (var k = 2; k <= cap; k <<= 1) { for (var j = k >> 1; j > 0; j >>= 1) stages++; }
        this.sortStages = stages;
        this.bfuniform = device.createBuffer({ size: 256 * stages, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var stageParams = new Uint32Array(64 * stages);
        var si = 0;
        for (var k2 = 2; k2 <= cap; k2 <<= 1) {
            for (var j2 = k2 >> 1; j2 > 0; j2 >>= 1) {
                var off = si * 64;
                stageParams[off] = k2;
                stageParams[off + 1] = j2;
                stageParams[off + 2] = cap;
                si++;
            }
        }
        device.queue.writeBuffer(this.bfuniform, 0, stageParams);
        this.dummydepth = device.createTexture({ size: [1, 1, 1], format: this.depthFormat, usage: GPUTextureUsage.TEXTURE_BINDING });
        this.dummydepthview = this.dummydepth.createView();
        this.simbasedind = device.createBindGroup({ layout: this.simpipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.simuniform } },
            { binding: 1, resource: { buffer: this.attractoruniform } },
            { binding: 2, resource: { buffer: this.particlebuffer } },
            { binding: 3, resource: this.dummydepthview },
            { binding: 4, resource: { buffer: this.coluniform } },
            { binding: 5, resource: { buffer: this.collisioncounter } }
        ] });
        this.keybind = device.createBindGroup({ layout: this.keypipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.keyuniform } },
            { binding: 1, resource: { buffer: this.keysbuffer } },
            { binding: 2, resource: { buffer: this.indicesbuffer } },
            { binding: 3, resource: { buffer: this.particlebuffer } }
        ] });
        this.bfbind = device.createBindGroup({ layout: this.bflayout, entries: [
            { binding: 0, resource: { buffer: this.bfuniform, size: 16 } },
            { binding: 1, resource: { buffer: this.keysbuffer } },
            { binding: 2, resource: { buffer: this.indicesbuffer } }
        ] });
        this.renderbind = device.createBindGroup({ layout: this.renderpipeline.getBindGroupLayout(1), entries: [
            { binding: 0, resource: { buffer: this.particlebuffer } },
            { binding: 1, resource: { buffer: this.indicesbuffer } }
        ] });
        this._lastDepthView = null;
        this._simDepthBind = null;
    }
    _serializeSim(dt) {
        var e = this.emitter;
        var p = new Float32Array(32);
        p[0] = dt; p[1] = this.seed; p[2] = this.gravity; p[3] = this.drag;
        p[4] = this.restitution; p[5] = this.friction; p[6] = this.collisionRadius; p[7] = this.maxParticles;
        p[8] = e.position.x; p[9] = e.position.y; p[10] = e.position.z; p[11] = e.shape;
        p[12] = e.radius; p[13] = e.speed[0]; p[14] = e.speed[1]; p[15] = e.spread;
        p[16] = e.direction.x; p[17] = e.direction.y; p[18] = e.direction.z; p[19] = e.lifetime[0];
        p[20] = e.extents.x; p[21] = e.extents.y; p[22] = e.extents.z; p[23] = e.lifetime[1];
        p[24] = e.color.r; p[25] = e.color.g; p[26] = e.color.b; p[27] = e.size[0];
        p[28] = e.size[1]; p[29] = this.fade.in; p[30] = this.fade.out; p[31] = this.attractors.length;
        this.device.queue.writeBuffer(this.simuniform, 0, p);
        var a = new Float32Array(32);
        for (var i = 0; i < 4; i++) {
            var at = this.attractors[i];
            if (!at) break;
            a[i * 8] = at.position.x; a[i * 8 + 1] = at.position.y; a[i * 8 + 2] = at.position.z; a[i * 8 + 3] = at.strength;
            a[i * 8 + 4] = at.radius;
        }
        this.device.queue.writeBuffer(this.attractoruniform, 0, a);
    }
    setEmitter(emitter) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        this.emitter = this._normEmitter(emitter);
        return this;
    }
    setForces(forces) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        forces = forces || {};
        if (forces.gravity !== undefined) this.gravity = forces.gravity;
        if (forces.drag !== undefined) this.drag = Math.max(0, forces.drag);
        if (forces.restitution !== undefined) this.restitution = Math.min(1, Math.max(0, forces.restitution));
        if (forces.friction !== undefined) this.friction = Math.min(1, Math.max(0, forces.friction));
        if (forces.collisionRadius !== undefined) this.collisionRadius = Math.max(0, forces.collisionRadius);
        if (forces.attractors) this.attractors = forces.attractors.slice(0, 4).map(function (a) {
            return { position: a.position || { x: 0, y: 0, z: 0 }, strength: a.strength || 0, radius: a.radius || 1 };
        });
        return this;
    }
    update(deltaTime, options) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        options = options || {};
        var dt = Math.max(0, Math.min(0.1, deltaTime === undefined ? 0.016 : deltaTime));
        this.time += dt;
        var device = this.device;
        this._serializeSim(dt);
        var useCollision = !!(options.depthView && options.camera);
        var coldata = new Float32Array(40);
        if (useCollision) {
            var vp = new Matrix4().multiplyMatrices(options.camera.projectionMatrix, options.camera.matrixWorldInverse);
            var invvp = vp.clone().invert();
            coldata.set(vp.elements, 0);
            coldata.set(invvp.elements, 16);
            coldata[32] = options.camera.position.x; coldata[33] = options.camera.position.y; coldata[34] = options.camera.position.z;
            coldata[36] = this.renderer.width || 1;
            coldata[37] = this.renderer.height || 1;
            coldata[39] = 1;
            if (this._lastDepthView !== options.depthView) {
                this._simDepthBind = device.createBindGroup({ layout: this.simpipeline.getBindGroupLayout(0), entries: [
                    { binding: 0, resource: { buffer: this.simuniform } },
                    { binding: 1, resource: { buffer: this.attractoruniform } },
                    { binding: 2, resource: { buffer: this.particlebuffer } },
                    { binding: 3, resource: options.depthView },
                    { binding: 4, resource: { buffer: this.coluniform } },
                    { binding: 5, resource: { buffer: this.collisioncounter } }
                ] });
                this._lastDepthView = options.depthView;
            }
        }
        device.queue.writeBuffer(this.coluniform, 0, coldata);
        var encoder = device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.simpipeline);
        pass.setBindGroup(0, useCollision ? this._simDepthBind : this.simbasedind);
        pass.dispatchWorkgroups(Math.ceil(this.maxParticles / 64));
        pass.end();
        this.stats.simPasses++;
        if (options.camera) {
            var cam = options.camera;
            var mw = cam.matrixWorld.elements;
            var kdata = new Float32Array(8);
            kdata[0] = cam.position.x; kdata[1] = cam.position.y; kdata[2] = cam.position.z; kdata[3] = this.maxParticles;
            kdata[4] = -mw[8]; kdata[5] = -mw[9]; kdata[6] = -mw[10]; kdata[7] = this.capacity;
            device.queue.writeBuffer(this.keyuniform, 0, kdata);
            var pass2 = encoder.beginComputePass();
            pass2.setPipeline(this.keypipeline);
            pass2.setBindGroup(0, this.keybind);
            pass2.dispatchWorkgroups(Math.ceil(this.capacity / 64));
            pass2.end();
            for (var s = 0; s < this.sortStages; s++) {
                var pass3 = encoder.beginComputePass();
                pass3.setPipeline(this.bfpipeline);
                pass3.setBindGroup(0, this.bfbind, [s * 256]);
                pass3.dispatchWorkgroups(Math.ceil(this.capacity / 64));
                pass3.end();
                this.stats.sortPasses++;
            }
        }
        device.queue.submit([encoder.finish()]);
        this.stats.updates++;
        return this;
    }
    render(view, depthView, camera) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        if (!view) throw new Error("render requires a color texture or view");
        if (view.createView) view = view.createView();
        if (!depthView) throw new Error("render requires a depth texture or view");
        if (depthView.createView) depthView = depthView.createView();
        if (!camera || !camera.projectionMatrix || !camera.matrixWorldInverse) throw new Error("render requires a camera");
        var vp = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        var mw = camera.matrixWorld.elements;
        var rdata = new Float32Array(28);
        for (var i = 0; i < 16; i++) rdata[i] = vp.elements[i];
        rdata[16] = mw[0]; rdata[17] = mw[1]; rdata[18] = mw[2];
        rdata[20] = mw[4]; rdata[21] = mw[5]; rdata[22] = mw[6];
        rdata[24] = this.fade.in; rdata[25] = this.fade.out;
        this.device.queue.writeBuffer(this.runiform, 0, rdata);
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginRenderPass({
            colorAttachments: [{ view: view, loadOp: "load", storeOp: "store" }],
            depthStencilAttachment: { view: depthView, depthLoadOp: "load", depthStoreOp: "store" }
        });
        pass.setPipeline(this.renderpipeline);
        if (!this.rendercamerabind) this.rendercamerabind = this.device.createBindGroup({ layout: this.renderpipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.runiform } }] });
        pass.setBindGroup(0, this.rendercamerabind);
        pass.setBindGroup(1, this.renderbind);
        pass.draw(6, this.capacity, 0, 0);
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        return this;
    }
    _mapRead(buffer, bytes) {
        var device = this.device;
        var rb = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var enc = device.createCommandEncoder();
        enc.copyBufferToBuffer(buffer, 0, rb, 0, bytes);
        device.queue.submit([enc.finish()]);
        var self = this;
        return rb.mapAsync(GPUMapMode.READ).then(function () {
            var out = rb.getMappedRange().slice(0);
            rb.unmap();
            rb.destroy();
            return out;
        });
    }
    readParticles() {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        var self = this;
        return this._mapRead(this.particlebuffer, this.capacity * 64).then(function (buf) {
            return new Float32Array(buf);
        });
    }
    readSortState() {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        var self = this;
        return this._mapRead(this.keysbuffer, this.capacity * 4).then(function (keybuf) {
            return self._mapRead(self.indicesbuffer, self.capacity * 4).then(function (idxbuf) {
                return { keys: new Float32Array(keybuf), indices: new Uint32Array(idxbuf) };
            });
        });
    }
    readCollisionCount() {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        return this._mapRead(this.collisioncounter, 4).then(function (buf) {
            return new Uint32Array(buf)[0];
        });
    }
    simulateReference(deltaTime, steps, forces) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        forces = forces || {};
        var gravity = forces.gravity === undefined ? this.gravity : forces.gravity;
        var drag = forces.drag === undefined ? this.drag : forces.drag;
        var attractors = forces.attractors || this.attractors;
        var state = this._mirror.slice();
        var count = this.maxParticles;
        var out = { positions: new Float32Array(count * 3), velocities: new Float32Array(count * 3), sizes: new Float32Array(count), ages: new Float32Array(count), lifetimes: new Float32Array(count) };
        var dt = Math.max(0, deltaTime);
        for (var s = 0; s < steps; s++) {
            for (var i = 0; i < count; i++) {
                var o = i * 16;
                var age = state[o + 3] + dt;
                var life = state[o + 11];
                if (age >= life) {
                    var sp = this._spawnReference(i, (state[o + 14] + 1) | 0);
                    state[o] = sp.pos[0]; state[o + 1] = sp.pos[1]; state[o + 2] = sp.pos[2]; state[o + 3] = 0;
                    state[o + 4] = sp.vel[0]; state[o + 5] = sp.vel[1]; state[o + 6] = sp.vel[2]; state[o + 7] = sp.size;
                    state[o + 8] = sp.color[0]; state[o + 9] = sp.color[1]; state[o + 10] = sp.color[2]; state[o + 11] = sp.lifetime;
                    state[o + 14] = (state[o + 14] + 1) | 0;
                } else {
                    state[o + 3] = age;
                    var vx = state[o + 4], vy = state[o + 5], vz = state[o + 6];
                    vy += gravity * dt;
                    for (var a = 0; a < attractors.length && a < 4; a++) {
                        var at = attractors[a];
                        var dx = at.position.x - state[o], dy = at.position.y - state[o + 1], dz = at.position.z - state[o + 2];
                        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist > 1e-4 && dist < at.radius) {
                            var f = at.strength * (1 - dist / at.radius) * dt / dist;
                            vx += dx * f; vy += dy * f; vz += dz * f;
                        }
                    }
                    var dr = Math.max(0, 1 - drag * dt);
                    vx *= dr; vy *= dr; vz *= dr;
                    state[o] += vx * dt; state[o + 1] += vy * dt; state[o + 2] += vz * dt;
                    state[o + 4] = vx; state[o + 5] = vy; state[o + 6] = vz;
                }
            }
        }
        for (var i2 = 0; i2 < count; i2++) {
            var o2 = i2 * 16, p3 = i2 * 3;
            out.positions[p3] = state[o2]; out.positions[p3 + 1] = state[o2 + 1]; out.positions[p3 + 2] = state[o2 + 2];
            out.velocities[p3] = state[o2 + 4]; out.velocities[p3 + 1] = state[o2 + 5]; out.velocities[p3 + 2] = state[o2 + 6];
            out.sizes[i2] = state[o2 + 7];
            out.ages[i2] = state[o2 + 3];
            out.lifetimes[i2] = state[o2 + 11];
        }
        return out;
    }
    dispose() {
        if (this.disposed) return this;
        this.disposed = true;
        this.particlebuffer.destroy();
        this.keysbuffer.destroy();
        this.indicesbuffer.destroy();
        this.collisioncounter.destroy();
        this.simuniform.destroy();
        this.attractoruniform.destroy();
        this.coluniform.destroy();
        this.keyuniform.destroy();
        this.runiform.destroy();
        this.bfuniform.destroy();
        this.dummydepth.destroy();
        this.particlebuffer = null;
        this.keysbuffer = null;
        this.indicesbuffer = null;
        this.collisioncounter = null;
        this.simuniform = null;
        this.attractoruniform = null;
        this.coluniform = null;
        this.keyuniform = null;
        this.runiform = null;
        this.bfuniform = null;
        this.dummydepth = null;
        this._mirror = null;
        this._simDepthBind = null;
        this._lastDepthView = null;
        return this;
    }
}

export { GPUParticles };
