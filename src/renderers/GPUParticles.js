import { Matrix4 } from "../math/index.js";

const zataa = `\nstruct SimParams {\n    p0: vec4<f32>,\n    p1: vec4<f32>,\n    p2: vec4<f32>,\n    p3: vec4<f32>,\n    p4: vec4<f32>,\n    p5: vec4<f32>,\n    p6: vec4<f32>,\n    p7: vec4<f32>,\n};\nstruct AttractorParams { a: array<vec4<f32>, 8> };\nstruct ColParams {\n    vp: mat4x4<f32>,\n    invvp: mat4x4<f32>,\n    campos: vec4<f32>,\n    viewport: vec4<f32>,\n};\nstruct KeyParams { cam: vec4<f32>, fwd: vec4<f32> };\nstruct BfParams { k: u32, j: u32, n: u32, pad: u32 };\nstruct RParams {\n    viewproj: mat4x4<f32>,\n    right: vec4<f32>,\n    up: vec4<f32>,\n    misc: vec4<f32>,\n};\nstruct Particle {\n    a: vec4<f32>,\n    b: vec4<f32>,\n    c: vec4<f32>,\n    d: vec4<f32>,\n};\n@group(0) @binding(0) var<uniform> simparams: SimParams;\n@group(0) @binding(1) var<uniform> attractors: AttractorParams;\n@group(0) @binding(2) var<storage, read_write> particles: array<Particle>;\n@group(0) @binding(3) var scenedepth: texture_depth_2d;\n@group(0) @binding(4) var<uniform> colparams: ColParams;\n@group(0) @binding(5) var<storage, read_write> collisioncount: array<atomic<u32>>;\nfn uhash(a: u32, b: u32, c: u32) -> u32 {\n    var h = (a * 747796405u) ^ (b * 2891336453u) ^ (c * 374761393u);\n    h = h ^ (h >> 15u);\n    h = h * 2246822519u;\n    h = h ^ (h >> 13u);\n    return h;\n}\nfn rnd(seed: u32, idx: u32, gen: u32, c: u32) -> f32 {\n    return f32(uhash(seed, idx, gen * 16u + c)) / 4294967296.0;\n}\nfn emitterBasis(dirv: vec3<f32>) -> mat3x3<f32> {\n    var d = normalize(dirv);\n    var a = vec3<f32>(0.0, 1.0, 0.0);\n    if (abs(d.y) > 0.99) { a = vec3<f32>(1.0, 0.0, 0.0); }\n    var t = normalize(cross(a, d));\n    var b = cross(d, t);\n    return mat3x3<f32>(t, b, d);\n}\nfn spawnPosition(shape: u32, e: vec4<f32>, p3: vec4<f32>, p4: vec4<f32>, p5: vec4<f32>, seed: u32, idx: u32, gen: u32) -> vec3<f32> {\n    if (shape == 0u) { return e.xyz; }\n    if (shape == 1u) {\n        let r1 = rnd(seed, idx, gen, 0u);\n        let r2 = rnd(seed, idx, gen, 1u);\n        let r3 = rnd(seed, idx, gen, 2u);\n        let z = 1.0 - 2.0 * r1;\n        let phi = 6.283185307179586 * r2;\n        let s = sqrt(max(0.0, 1.0 - z * z));\n        return e.xyz + vec3<f32>(s * cos(phi), z, s * sin(phi)) * (p3.x * r3);\n    }\n    if (shape == 2u) {\n        let r1 = rnd(seed, idx, gen, 0u);\n        let r2 = rnd(seed, idx, gen, 1u);\n        let r3 = rnd(seed, idx, gen, 2u);\n        return e.xyz + vec3<f32>(r1 - 0.5, r2 - 0.5, r3 - 0.5) * p5.xyz;\n    }\n    let r1 = rnd(seed, idx, gen, 0u);\n    let r2 = rnd(seed, idx, gen, 1u);\n    let phi = 6.283185307179586 * r2;\n    let rad = p3.x * sqrt(r1);\n    let basis = emitterBasis(p4.xyz);\n    return e.xyz + (basis[0] * cos(phi) + basis[1] * sin(phi)) * rad;\n}\nfn spawnVelocity(p3: vec4<f32>, p4: vec4<f32>, seed: u32, idx: u32, gen: u32) -> vec3<f32> {\n    let r4 = rnd(seed, idx, gen, 3u);\n    let r5 = rnd(seed, idx, gen, 4u);\n    let basis = emitterBasis(p4.xyz);\n    let tilt = p3.w * r4;\n    let phi = 6.283185307179586 * r5;\n    let dirv = basis[2] * cos(tilt) + (basis[0] * cos(phi) + basis[1] * sin(phi)) * sin(tilt);\n    let speed = mix(p3.y, p3.z, rnd(seed, idx, gen, 5u));\n    return dirv * speed;\n}\nfn worldFromDepth(uv: vec2<f32>, d: f32) -> vec3<f32> {\n    let ndc = vec3<f32>(uv.x * 2.0 - 1.0, 1.0 - 2.0 * uv.y, d * 2.0 - 1.0);\n    var v = colparams.invvp * vec4<f32>(ndc, 1.0);\n    return v.xyz / v.w;\n}\n@compute @workgroup_size(64)\nfn simulate(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let count = u32(simparams.p1.w);\n    if (gid.x >= count) { return; }\n    var p = particles[gid.x];\n    let seed = u32(simparams.p0.y);\n    p.a.w = p.a.w + simparams.p0.x;\n    if (p.a.w >= p.c.w) {\n        let gen = u32(p.d.z) + 1u;\n        p.d.z = f32(gen);\n        let shape = u32(simparams.p2.w);\n        p.a.xyz = spawnPosition(shape, simparams.p2, simparams.p3, simparams.p4, simparams.p5, seed, gid.x, gen);\n        p.b.xyz = spawnVelocity(simparams.p3, simparams.p4, seed, gid.x, gen);\n        p.b.w = mix(simparams.p6.w, simparams.p7.x, rnd(seed, gid.x, gen, 7u));\n        p.c.w = mix(simparams.p4.w, simparams.p5.w, rnd(seed, gid.x, gen, 6u));\n        p.a.w = 0.0;\n        p.c.rgb = simparams.p6.rgb;\n    } else {\n        var acc = vec3<f32>(0.0, simparams.p0.z, 0.0);\n        let na = u32(simparams.p7.w);\n        for (var i = 0u; i < 4u; i = i + 1u) {\n            if (i >= na) { break; }\n            let ap = attractors.a[i * 2u].xyz;\n            let astr = attractors.a[i * 2u].w;\n            let ar = attractors.a[i * 2u + 1u].x;\n            let delta = ap - p.a.xyz;\n            let dist = length(delta);\n            if (dist > 0.0001 && dist < ar) {\n                acc = acc + (delta / dist) * (astr * (1.0 - dist / ar));\n            }\n        }\n        p.b.xyz = p.b.xyz + acc * simparams.p0.x;\n        p.b.xyz = p.b.xyz * max(0.0, 1.0 - simparams.p0.w * simparams.p0.x);\n        p.a.xyz = p.a.xyz + p.b.xyz * simparams.p0.x;\n        if (colparams.viewport.w > 0.5) {\n            let clip = colparams.vp * vec4<f32>(p.a.xyz, 1.0);\n            if (clip.w > 0.0) {\n                let ndc = clip.xyz / clip.w;\n                if (abs(ndc.x) <= 1.0 && abs(ndc.y) <= 1.0 && ndc.z <= 1.0) {\n                    let uv = vec2<f32>(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);\n                    let w = u32(colparams.viewport.x);\n                    let h = u32(colparams.viewport.y);\n                    var tx = i32(clamp(uv.x * colparams.viewport.x, 0.0, colparams.viewport.x - 1.0));\n                    var ty = i32(clamp(uv.y * colparams.viewport.y, 0.0, colparams.viewport.y - 1.0));\n                    let d0 = textureLoad(scenedepth, vec2<i32>(tx, ty), 0);\n                    if (d0 < 0.999999) {\n                        var txp = tx + 1; if (txp >= i32(w)) { txp = i32(w) - 1; }\n                        var typ = ty + 1; if (typ >= i32(h)) { typ = i32(h) - 1; }\n                        let uv0 = vec2<f32>((f32(tx) + 0.5) / colparams.viewport.x, (f32(ty) + 0.5) / colparams.viewport.y);\n                        let uvx = vec2<f32>((f32(txp) + 0.5) / colparams.viewport.x, (f32(ty) + 0.5) / colparams.viewport.y);\n                        let uvy = vec2<f32>((f32(tx) + 0.5) / colparams.viewport.x, (f32(typ) + 0.5) / colparams.viewport.y);\n                        let scene0 = worldFromDepth(uv0, d0);\n                        let dxp = textureLoad(scenedepth, vec2<i32>(txp, ty), 0);\n                        let dyp = textureLoad(scenedepth, vec2<i32>(tx, typ), 0);\n                        var px = worldFromDepth(uvx, dxp);\n                        var py = worldFromDepth(uvy, dyp);\n                        if (dxp >= 0.999999) { px = scene0 + vec3<f32>(0.05, 0.0, 0.0); }\n                        if (dyp >= 0.999999) { py = scene0 + vec3<f32>(0.0, 0.05, 0.0); }\n                        var n = normalize(cross(px - scene0, py - scene0));\n                        if (dot(n, colparams.campos.xyz - scene0) < 0.0) { n = -n; }\n                        let pen = dot(p.a.xyz - scene0, n);\n                        let rresp = simparams.p1.z * 1.6;\n                        let slow = dot(p.b.xyz, p.b.xyz) < 2.25;\n                        if (pen < simparams.p1.z || (pen < rresp && slow)) {\n                            if (pen < simparams.p1.z) {\n                                p.a.xyz = p.a.xyz + n * (simparams.p1.z - pen);\n                            }\n                            let vn = dot(p.b.xyz, n);\n                            if (vn < 0.0) {\n                                var vt = p.b.xyz - n * vn;\n                                p.b.xyz = vt * (1.0 - simparams.p1.y) + n * (-vn * simparams.p1.x);\n                                atomicAdd(&collisioncount[0], 1u);\n                            }\n                        }\n                    }\n                }\n            }\n        }\n    }\n    particles[gid.x] = p;\n}\n@group(0) @binding(0) var<uniform> keyparams: KeyParams;\n@group(0) @binding(1) var<storage, read_write> sortkeys: array<f32>;\n@group(0) @binding(2) var<storage, read_write> sortindices: array<u32>;\n@group(0) @binding(3) var<storage, read> simparticles: array<Particle>;\n@compute @workgroup_size(64)\nfn computeKeys(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let capacity = u32(keyparams.fwd.w);\n    let count = u32(keyparams.cam.w);\n    if (gid.x >= capacity) { return; }\n    if (gid.x >= count) {\n        sortkeys[gid.x] = -1e30;\n        sortindices[gid.x] = gid.x;\n        return;\n    }\n    let p = simparticles[gid.x];\n    let depth = dot(p.a.xyz - keyparams.cam.xyz, keyparams.fwd.xyz);\n    sortkeys[gid.x] = -depth;\n    sortindices[gid.x] = gid.x;\n}\n@group(0) @binding(0) var<uniform> bfparams: BfParams;\n@group(0) @binding(1) var<storage, read_write> bkeys: array<f32>;\n@group(0) @binding(2) var<storage, read_write> bindices: array<u32>;\n@compute @workgroup_size(64)\nfn bitonic(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let n = bfparams.n;\n    if (gid.x >= n) { return; }\n    let i = gid.x;\n    let j = bfparams.j;\n    if ((i & j) != 0u) { return; }\n    let partner = i | j;\n    let ascending = (i & bfparams.k) == 0u;\n    let ka = bkeys[i];\n    let kb = bkeys[partner];\n    var swap = false;\n    if (ascending && ka > kb) { swap = true; }\n    if ((!ascending) && ka < kb) { swap = true; }\n    if (swap) {\n        bkeys[i] = kb;\n        bkeys[partner] = ka;\n        let t = bindices[i];\n        bindices[i] = bindices[partner];\n        bindices[partner] = t;\n    }\n}\n@group(0) @binding(0) var<uniform> rparams: RParams;\n@group(1) @binding(0) var<storage, read> rparticles: array<Particle>;\n@group(1) @binding(1) var<storage, read> rindices: array<u32>;\nstruct VSOut {\n    @builtin(position) position: vec4<f32>,\n    @location(0) color: vec4<f32>,\n    @location(1) quad: vec2<f32>,\n};\n@vertex\nfn particlevs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VSOut {\n    var corners = array<vec2<f32>, 6>(\n        vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),\n        vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0)\n    );\n    let c = corners[vi];\n    let si = rindices[ii];\n    let p = rparticles[si];\n    let age = p.a.w;\n    let life = max(p.c.w, 0.0001);\n    var alpha = 1.0;\n    let fi = rparams.misc.x * life;\n    let fo = rparams.misc.y * life;\n    if (fi > 0.0001) { alpha = alpha * clamp(age / fi, 0.0, 1.0); }\n    if (fo > 0.0001) { alpha = alpha * clamp((life - age) / fo, 0.0, 1.0); }\n    let world = p.a.xyz + (rparams.right.xyz * c.x + rparams.up.xyz * c.y) * p.b.w;\n    let clip = rparams.viewproj * vec4<f32>(world, 1.0);\n    var o: VSOut;\n    o.position = vec4<f32>(clip.xy, clip.z * 0.5 + clip.w * 0.5, clip.w);\n    o.color = vec4<f32>(p.c.rgb, alpha);\n    o.quad = c;\n    return o;\n}\n@fragment\nfn particlefs(in: VSOut) -> @location(0) vec4<f32> {\n    let r = dot(in.quad, in.quad);\n    if (r > 1.0) { discard; }\n    let a = in.color.a * max(0.0, 1.0 - r);\n    if (a < 0.004) { discard; }\n    return vec4<f32>(in.color.rgb, a);\n}\n`;

function zatab(zataa, zatab, zatac) {
    var zatad = Math.imul(zataa, 747796405) ^ Math.imul(zatab, 2891336453) ^ Math.imul(zatac, 374761393) | 0;
    zatad = zatad ^ zatad >>> 15 | 0;
    zatad = Math.imul(zatad, 2246822519) | 0;
    zatad = (zatad ^ zatad >>> 13) >>> 0;
    return zatad >>> 0;
}

function zatac(zataa, zatac, zatad, zatae) {
    return zatab(zataa | 0, zatac >>> 0, (zatad * 16 + zatae | 0) >>> 0) / 4294967296;
}

function zatad(zataa) {
    var zatab = Math.sqrt(zataa[0] * zataa[0] + zataa[1] * zataa[1] + zataa[2] * zataa[2]) || 1;
    return [ zataa[0] / zatab, zataa[1] / zatab, zataa[2] / zatab ];
}

function zatae(zataa, zatab) {
    return [ zataa[1] * zatab[2] - zataa[2] * zatab[1], zataa[2] * zatab[0] - zataa[0] * zatab[2], zataa[0] * zatab[1] - zataa[1] * zatab[0] ];
}

function zataf(zataa) {
    var zatab = zatad(zataa);
    var zatac = Math.abs(zatab[1]) > .99 ? [ 1, 0, 0 ] : [ 0, 1, 0 ];
    var zataf = zatad(zatae(zatac, zatab));
    var zatag = zatae(zatab, zataf);
    return [ zataf, zatag, zatab ];
}

function zatag(zataa, zatab, zatac) {
    return zataa + (zatab - zataa) * zatac;
}

class GPUParticles {
    constructor(zataa, zatab) {
        zatab = zatab || {};
        if (!zataa || !zataa.device) throw new Error("GPUParticles requires a WebGPURenderer");
        this.renderer = zataa;
        this.device = zataa.device;
        this.disposed = false;
        var zatac = Math.floor(zatab.maxParticles === undefined ? 4096 : zatab.maxParticles);
        if (zatac < 16 || zatac > 262144) throw new Error("GPUParticles maxParticles must be in [16, 262144]");
        this.maxParticles = zatac;
        var zatad = 1;
        while (zatad < zatac) zatad <<= 1;
        this.capacity = zatad;
        this.seed = (zatab.seed === undefined ? 1 : zatab.seed) | 0;
        this.emitter = this._normEmitter(zatab.emitter);
        this.gravity = zatab.gravity === undefined ? 0 : zatab.gravity;
        this.drag = Math.max(0, zatab.drag === undefined ? 0 : zatab.drag);
        this.restitution = Math.min(1, Math.max(0, zatab.restitution === undefined ? .3 : zatab.restitution));
        this.friction = Math.min(1, Math.max(0, zatab.friction === undefined ? .2 : zatab.friction));
        this.collisionRadius = Math.max(0, zatab.collisionRadius === undefined ? .05 : zatab.collisionRadius);
        this.attractors = (zatab.attractors || []).slice(0, 4).map(function(zataa) {
            return {
                position: zataa.position || {
                    x: 0,
                    y: 0,
                    z: 0
                },
                strength: zataa.strength || 0,
                radius: zataa.radius || 1
            };
        });
        this.blend = zatab.blend === "additive" ? "additive" : "alpha";
        this.fade = {
            in: Math.max(0, zatab.fade && zatab.fade.in !== undefined ? zatab.fade.in : .1),
            out: Math.max(0, zatab.fade && zatab.fade.out !== undefined ? zatab.fade.out : .25)
        };
        this.depthFormat = zatab.depthFormat || "depth24plus";
        this.time = 0;
        this.stats = {
            updates: 0,
            simPasses: 0,
            sortPasses: 0,
            collisions: 0,
            particles: zatac,
            capacity: zatad
        };
        this._buildGPU();
        this.seedAll();
    }
    _normEmitter(zataa) {
        zataa = zataa || {};
        var zatab = zataa.shape === "sphere" ? 1 : zataa.shape === "box" ? 2 : zataa.shape === "cone" ? 3 : 0;
        return {
            position: {
                x: zataa.position && zataa.position.x || 0,
                y: zataa.position && zataa.position.y || 0,
                z: zataa.position && zataa.position.z || 0
            },
            shape: zatab,
            radius: Math.max(0, zataa.radius === undefined ? 0 : zataa.radius),
            extents: {
                x: zataa.extents && zataa.extents.x || 1,
                y: zataa.extents && zataa.extents.y || 1,
                z: zataa.extents && zataa.extents.z || 1
            },
            direction: {
                x: zataa.direction && zataa.direction.x !== undefined ? zataa.direction.x : 0,
                y: zataa.direction && zataa.direction.y !== undefined ? zataa.direction.y : 1,
                z: zataa.direction && zataa.direction.z !== undefined ? zataa.direction.z : 0
            },
            spread: Math.max(0, zataa.spread === undefined ? 0 : zataa.spread),
            speed: [ zataa.speed && zataa.speed[0] !== undefined ? zataa.speed[0] : 1, zataa.speed && zataa.speed[1] !== undefined ? zataa.speed[1] : 1 ],
            lifetime: [ zataa.lifetime && zataa.lifetime[0] !== undefined ? zataa.lifetime[0] : 2, zataa.lifetime && zataa.lifetime[1] !== undefined ? zataa.lifetime[1] : 2 ],
            size: [ zataa.size && zataa.size[0] !== undefined ? zataa.size[0] : .2, zataa.size && zataa.size[1] !== undefined ? zataa.size[1] : .2 ],
            color: {
                r: zataa.color && zataa.color.r !== undefined ? zataa.color.r : 1,
                g: zataa.color && zataa.color.g !== undefined ? zataa.color.g : 1,
                b: zataa.color && zataa.color.b !== undefined ? zataa.color.b : 1
            }
        };
    }
    _spawnReference(zataa, zatab) {
        var zatad = this.emitter;
        var zatae = this.seed;
        var zatah = function(zatad) {
            return zatac(zatae, zataa, zatab, zatad);
        };
        var zatai = [ zatad.position.x, zatad.position.y, zatad.position.z ];
        if (zatad.shape === 1) {
            var zataj = 1 - 2 * zatah(0), zatak = 6.283185307179586 * zatah(1), zatal = zatad.radius * zatah(2);
            var zatam = Math.sqrt(Math.max(0, 1 - zataj * zataj));
            zatai = [ zatai[0] + zatam * Math.cos(zatak) * zatal, zatai[1] + zataj * zatal, zatai[2] + zatam * Math.sin(zatak) * zatal ];
        } else if (zatad.shape === 2) {
            zatai = [ zatai[0] + (zatah(0) - .5) * zatad.extents.x, zatai[1] + (zatah(1) - .5) * zatad.extents.y, zatai[2] + (zatah(2) - .5) * zatad.extents.z ];
        } else if (zatad.shape === 3) {
            var zatan = 6.283185307179586 * zatah(1), zatao = zatad.radius * Math.sqrt(zatah(0));
            var zatap = zataf([ zatad.direction.x, zatad.direction.y, zatad.direction.z ]);
            zatai = [ zatai[0] + (zatap[0][0] * Math.cos(zatan) + zatap[1][0] * Math.sin(zatan)) * zatao, zatai[1] + (zatap[0][1] * Math.cos(zatan) + zatap[1][1] * Math.sin(zatan)) * zatao, zatai[2] + (zatap[0][2] * Math.cos(zatan) + zatap[1][2] * Math.sin(zatan)) * zatao ];
        }
        var zataq = zataf([ zatad.direction.x, zatad.direction.y, zatad.direction.z ]);
        var zatar = zatad.spread * zatah(3), zatas = 6.283185307179586 * zatah(4);
        var zatat = [ 0, 0, 0 ];
        for (var zatau = 0; zatau < 3; zatau++) {
            zatat[zatau] = zataq[2][zatau] * Math.cos(zatar) + (zataq[0][zatau] * Math.cos(zatas) + zataq[1][zatau] * Math.sin(zatas)) * Math.sin(zatar);
        }
        var zatav = zatag(zatad.speed[0], zatad.speed[1], zatah(5));
        var zataw = [ zatat[0] * zatav, zatat[1] * zatav, zatat[2] * zatav ];
        var zatax = zatag(zatad.lifetime[0], zatad.lifetime[1], zatah(6));
        var zatay = zatag(zatad.size[0], zatad.size[1], zatah(7));
        return {
            pos: zatai,
            vel: zataw,
            lifetime: zatax,
            size: zatay,
            color: [ zatad.color.r, zatad.color.g, zatad.color.b ]
        };
    }
    seedAll() {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        var zataa = new Float32Array(this.capacity * 16);
        for (var zatab = 0; zatab < this.maxParticles; zatab++) {
            var zatac = this._spawnReference(zatab, 0);
            var zatad = zatab * 16;
            zataa[zatad] = zatac.pos[0];
            zataa[zatad + 1] = zatac.pos[1];
            zataa[zatad + 2] = zatac.pos[2];
            zataa[zatad + 3] = 0;
            zataa[zatad + 4] = zatac.vel[0];
            zataa[zatad + 5] = zatac.vel[1];
            zataa[zatad + 6] = zatac.vel[2];
            zataa[zatad + 7] = zatac.size;
            zataa[zatad + 8] = zatac.color[0];
            zataa[zatad + 9] = zatac.color[1];
            zataa[zatad + 10] = zatac.color[2];
            zataa[zatad + 11] = zatac.lifetime;
            zataa[zatad + 12] = 0;
            zataa[zatad + 13] = 0;
            zataa[zatad + 14] = 0;
            zataa[zatad + 15] = 0;
        }
        this.device.queue.writeBuffer(this.particlebuffer, 0, zataa);
        var zatae = new Uint32Array(this.capacity);
        for (var zataf = 0; zataf < this.capacity; zataf++) zatae[zataf] = zataf;
        this.device.queue.writeBuffer(this.indicesbuffer, 0, zatae);
        this._mirror = zataa.slice();
        this.stats.collisions = 0;
        this.device.queue.writeBuffer(this.collisioncounter, 0, new Uint32Array([ 0 ]));
        return this;
    }
    _buildGPU() {
        var zatab = this.device;
        var zatac = this.capacity;
        this.module = zatab.createShaderModule({
            code: zataa
        });
        this.simpipeline = zatab.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.module,
                entryPoint: "simulate"
            }
        });
        this.keypipeline = zatab.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.module,
                entryPoint: "computeKeys"
            }
        });
        this.bflayout = zatab.createBindGroupLayout({
            entries: [ {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform",
                    hasDynamicOffset: true
                }
            }, {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            } ]
        });
        this.bfpipeline = zatab.createComputePipeline({
            layout: zatab.createPipelineLayout({
                bindGroupLayouts: [ this.bflayout ]
            }),
            compute: {
                module: this.module,
                entryPoint: "bitonic"
            }
        });
        var zatad = this.blend === "additive" ? {
            color: {
                srcFactor: "src-alpha",
                dstFactor: "one",
                operation: "add"
            },
            alpha: {
                srcFactor: "one",
                dstFactor: "one",
                operation: "add"
            }
        } : {
            color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
            },
            alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
            }
        };
        this.renderpipeline = zatab.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.module,
                entryPoint: "particlevs"
            },
            fragment: {
                module: this.module,
                entryPoint: "particlefs",
                targets: [ {
                    format: this.renderer.format,
                    blend: zatad
                } ]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            },
            depthStencil: {
                format: this.depthFormat,
                depthWriteEnabled: false,
                depthCompare: "less"
            }
        });
        this.particlebuffer = zatab.createBuffer({
            size: zatac * 64,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.keysbuffer = zatab.createBuffer({
            size: zatac * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.indicesbuffer = zatab.createBuffer({
            size: zatac * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.collisioncounter = zatab.createBuffer({
            size: 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.simuniform = zatab.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.attractoruniform = zatab.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.coluniform = zatab.createBuffer({
            size: 160,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.keyuniform = zatab.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.runiform = zatab.createBuffer({
            size: 112,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        var zatae = 0;
        for (var zataf = 2; zataf <= zatac; zataf <<= 1) {
            for (var zatag = zataf >> 1; zatag > 0; zatag >>= 1) zatae++;
        }
        this.sortStages = zatae;
        this.bfuniform = zatab.createBuffer({
            size: 256 * zatae,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        var zatah = new Uint32Array(64 * zatae);
        var zatai = 0;
        for (var zataj = 2; zataj <= zatac; zataj <<= 1) {
            for (var zatak = zataj >> 1; zatak > 0; zatak >>= 1) {
                var zatal = zatai * 64;
                zatah[zatal] = zataj;
                zatah[zatal + 1] = zatak;
                zatah[zatal + 2] = zatac;
                zatai++;
            }
        }
        zatab.queue.writeBuffer(this.bfuniform, 0, zatah);
        this.dummydepth = zatab.createTexture({
            size: [ 1, 1, 1 ],
            format: this.depthFormat,
            usage: GPUTextureUsage.TEXTURE_BINDING
        });
        this.dummydepthview = this.dummydepth.createView();
        this.simbasedind = zatab.createBindGroup({
            layout: this.simpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.simuniform
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.attractoruniform
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.particlebuffer
                }
            }, {
                binding: 3,
                resource: this.dummydepthview
            }, {
                binding: 4,
                resource: {
                    buffer: this.coluniform
                }
            }, {
                binding: 5,
                resource: {
                    buffer: this.collisioncounter
                }
            } ]
        });
        this.keybind = zatab.createBindGroup({
            layout: this.keypipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.keyuniform
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.keysbuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.indicesbuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.particlebuffer
                }
            } ]
        });
        this.bfbind = zatab.createBindGroup({
            layout: this.bflayout,
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.bfuniform,
                    size: 16
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.keysbuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.indicesbuffer
                }
            } ]
        });
        this.renderbind = zatab.createBindGroup({
            layout: this.renderpipeline.getBindGroupLayout(1),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.particlebuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.indicesbuffer
                }
            } ]
        });
        this._lastDepthView = null;
        this._simDepthBind = null;
    }
    _serializeSim(zataa) {
        var zatab = this.emitter;
        var zatac = new Float32Array(32);
        zatac[0] = zataa;
        zatac[1] = this.seed;
        zatac[2] = this.gravity;
        zatac[3] = this.drag;
        zatac[4] = this.restitution;
        zatac[5] = this.friction;
        zatac[6] = this.collisionRadius;
        zatac[7] = this.maxParticles;
        zatac[8] = zatab.position.x;
        zatac[9] = zatab.position.y;
        zatac[10] = zatab.position.z;
        zatac[11] = zatab.shape;
        zatac[12] = zatab.radius;
        zatac[13] = zatab.speed[0];
        zatac[14] = zatab.speed[1];
        zatac[15] = zatab.spread;
        zatac[16] = zatab.direction.x;
        zatac[17] = zatab.direction.y;
        zatac[18] = zatab.direction.z;
        zatac[19] = zatab.lifetime[0];
        zatac[20] = zatab.extents.x;
        zatac[21] = zatab.extents.y;
        zatac[22] = zatab.extents.z;
        zatac[23] = zatab.lifetime[1];
        zatac[24] = zatab.color.r;
        zatac[25] = zatab.color.g;
        zatac[26] = zatab.color.b;
        zatac[27] = zatab.size[0];
        zatac[28] = zatab.size[1];
        zatac[29] = this.fade.in;
        zatac[30] = this.fade.out;
        zatac[31] = this.attractors.length;
        this.device.queue.writeBuffer(this.simuniform, 0, zatac);
        var zatad = new Float32Array(32);
        for (var zatae = 0; zatae < 4; zatae++) {
            var zataf = this.attractors[zatae];
            if (!zataf) break;
            zatad[zatae * 8] = zataf.position.x;
            zatad[zatae * 8 + 1] = zataf.position.y;
            zatad[zatae * 8 + 2] = zataf.position.z;
            zatad[zatae * 8 + 3] = zataf.strength;
            zatad[zatae * 8 + 4] = zataf.radius;
        }
        this.device.queue.writeBuffer(this.attractoruniform, 0, zatad);
    }
    setEmitter(zataa) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        this.emitter = this._normEmitter(zataa);
        return this;
    }
    setForces(zataa) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        zataa = zataa || {};
        if (zataa.gravity !== undefined) this.gravity = zataa.gravity;
        if (zataa.drag !== undefined) this.drag = Math.max(0, zataa.drag);
        if (zataa.restitution !== undefined) this.restitution = Math.min(1, Math.max(0, zataa.restitution));
        if (zataa.friction !== undefined) this.friction = Math.min(1, Math.max(0, zataa.friction));
        if (zataa.collisionRadius !== undefined) this.collisionRadius = Math.max(0, zataa.collisionRadius);
        if (zataa.attractors) this.attractors = zataa.attractors.slice(0, 4).map(function(zataa) {
            return {
                position: zataa.position || {
                    x: 0,
                    y: 0,
                    z: 0
                },
                strength: zataa.strength || 0,
                radius: zataa.radius || 1
            };
        });
        return this;
    }
    update(zataa, zatab) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        zatab = zatab || {};
        var zatac = Math.max(0, Math.min(.1, zataa === undefined ? .016 : zataa));
        this.time += zatac;
        var zatad = this.device;
        this._serializeSim(zatac);
        var zatae = !!(zatab.depthView && zatab.camera);
        var zataf = new Float32Array(40);
        if (zatae) {
            var zatag = (new Matrix4).multiplyMatrices(zatab.camera.projectionMatrix, zatab.camera.matrixWorldInverse);
            var zatah = zatag.clone().invert();
            zataf.set(zatag.elements, 0);
            zataf.set(zatah.elements, 16);
            zataf[32] = zatab.camera.position.x;
            zataf[33] = zatab.camera.position.y;
            zataf[34] = zatab.camera.position.z;
            zataf[36] = this.renderer.width || 1;
            zataf[37] = this.renderer.height || 1;
            zataf[39] = 1;
            if (this._lastDepthView !== zatab.depthView) {
                this._simDepthBind = zatad.createBindGroup({
                    layout: this.simpipeline.getBindGroupLayout(0),
                    entries: [ {
                        binding: 0,
                        resource: {
                            buffer: this.simuniform
                        }
                    }, {
                        binding: 1,
                        resource: {
                            buffer: this.attractoruniform
                        }
                    }, {
                        binding: 2,
                        resource: {
                            buffer: this.particlebuffer
                        }
                    }, {
                        binding: 3,
                        resource: zatab.depthView
                    }, {
                        binding: 4,
                        resource: {
                            buffer: this.coluniform
                        }
                    }, {
                        binding: 5,
                        resource: {
                            buffer: this.collisioncounter
                        }
                    } ]
                });
                this._lastDepthView = zatab.depthView;
            }
        }
        zatad.queue.writeBuffer(this.coluniform, 0, zataf);
        var zatai = zatad.createCommandEncoder();
        var zataj = zatai.beginComputePass();
        zataj.setPipeline(this.simpipeline);
        zataj.setBindGroup(0, zatae ? this._simDepthBind : this.simbasedind);
        zataj.dispatchWorkgroups(Math.ceil(this.maxParticles / 64));
        zataj.end();
        this.stats.simPasses++;
        if (zatab.camera) {
            var zatak = zatab.camera;
            var zatal = zatak.matrixWorld.elements;
            var zatam = new Float32Array(8);
            zatam[0] = zatak.position.x;
            zatam[1] = zatak.position.y;
            zatam[2] = zatak.position.z;
            zatam[3] = this.maxParticles;
            zatam[4] = -zatal[8];
            zatam[5] = -zatal[9];
            zatam[6] = -zatal[10];
            zatam[7] = this.capacity;
            zatad.queue.writeBuffer(this.keyuniform, 0, zatam);
            var zatan = zatai.beginComputePass();
            zatan.setPipeline(this.keypipeline);
            zatan.setBindGroup(0, this.keybind);
            zatan.dispatchWorkgroups(Math.ceil(this.capacity / 64));
            zatan.end();
            for (var zatao = 0; zatao < this.sortStages; zatao++) {
                var zatap = zatai.beginComputePass();
                zatap.setPipeline(this.bfpipeline);
                zatap.setBindGroup(0, this.bfbind, [ zatao * 256 ]);
                zatap.dispatchWorkgroups(Math.ceil(this.capacity / 64));
                zatap.end();
                this.stats.sortPasses++;
            }
        }
        zatad.queue.submit([ zatai.finish() ]);
        this.stats.updates++;
        return this;
    }
    render(zataa, zatab, zatac) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        if (!zataa) throw new Error("render requires a color texture or view");
        if (zataa.createView) zataa = zataa.createView();
        if (!zatab) throw new Error("render requires a depth texture or view");
        if (zatab.createView) zatab = zatab.createView();
        if (!zatac || !zatac.projectionMatrix || !zatac.matrixWorldInverse) throw new Error("render requires a camera");
        var zatad = (new Matrix4).multiplyMatrices(zatac.projectionMatrix, zatac.matrixWorldInverse);
        var zatae = zatac.matrixWorld.elements;
        var zataf = new Float32Array(28);
        for (var zatag = 0; zatag < 16; zatag++) zataf[zatag] = zatad.elements[zatag];
        zataf[16] = zatae[0];
        zataf[17] = zatae[1];
        zataf[18] = zatae[2];
        zataf[20] = zatae[4];
        zataf[21] = zatae[5];
        zataf[22] = zatae[6];
        zataf[24] = this.fade.in;
        zataf[25] = this.fade.out;
        this.device.queue.writeBuffer(this.runiform, 0, zataf);
        var zatah = this.device.createCommandEncoder();
        var zatai = zatah.beginRenderPass({
            colorAttachments: [ {
                view: zataa,
                loadOp: "load",
                storeOp: "store"
            } ],
            depthStencilAttachment: {
                view: zatab,
                depthLoadOp: "load",
                depthStoreOp: "store"
            }
        });
        zatai.setPipeline(this.renderpipeline);
        if (!this.rendercamerabind) this.rendercamerabind = this.device.createBindGroup({
            layout: this.renderpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.runiform
                }
            } ]
        });
        zatai.setBindGroup(0, this.rendercamerabind);
        zatai.setBindGroup(1, this.renderbind);
        zatai.draw(6, this.capacity, 0, 0);
        zatai.end();
        this.device.queue.submit([ zatah.finish() ]);
        return this;
    }
    _mapRead(zataa, zatab) {
        var zatac = this.device;
        var zatad = zatac.createBuffer({
            size: zatab,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zatae = zatac.createCommandEncoder();
        zatae.copyBufferToBuffer(zataa, 0, zatad, 0, zatab);
        zatac.queue.submit([ zatae.finish() ]);
        var zataf = this;
        return zatad.mapAsync(GPUMapMode.READ).then(function() {
            var zataa = zatad.getMappedRange().slice(0);
            zatad.unmap();
            zatad.destroy();
            return zataa;
        });
    }
    readParticles() {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        var zataa = this;
        return this._mapRead(this.particlebuffer, this.capacity * 64).then(function(zataa) {
            return new Float32Array(zataa);
        });
    }
    readSortState() {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        var zataa = this;
        return this._mapRead(this.keysbuffer, this.capacity * 4).then(function(zatab) {
            return zataa._mapRead(zataa.indicesbuffer, zataa.capacity * 4).then(function(zataa) {
                return {
                    keys: new Float32Array(zatab),
                    indices: new Uint32Array(zataa)
                };
            });
        });
    }
    readCollisionCount() {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        return this._mapRead(this.collisioncounter, 4).then(function(zataa) {
            return new Uint32Array(zataa)[0];
        });
    }
    simulateReference(zataa, zatab, zatac) {
        if (this.disposed) throw new Error("GPUParticles is disposed");
        zatac = zatac || {};
        var zatad = zatac.gravity === undefined ? this.gravity : zatac.gravity;
        var zatae = zatac.drag === undefined ? this.drag : zatac.drag;
        var zataf = zatac.attractors || this.attractors;
        var zatag = this._mirror.slice();
        var zatah = this.maxParticles;
        var zatai = {
            positions: new Float32Array(zatah * 3),
            velocities: new Float32Array(zatah * 3),
            sizes: new Float32Array(zatah),
            ages: new Float32Array(zatah),
            lifetimes: new Float32Array(zatah)
        };
        var zataj = Math.max(0, zataa);
        for (var zatak = 0; zatak < zatab; zatak++) {
            for (var zatal = 0; zatal < zatah; zatal++) {
                var zatam = zatal * 16;
                var zatan = zatag[zatam + 3] + zataj;
                var zatao = zatag[zatam + 11];
                if (zatan >= zatao) {
                    var zatap = this._spawnReference(zatal, zatag[zatam + 14] + 1 | 0);
                    zatag[zatam] = zatap.pos[0];
                    zatag[zatam + 1] = zatap.pos[1];
                    zatag[zatam + 2] = zatap.pos[2];
                    zatag[zatam + 3] = 0;
                    zatag[zatam + 4] = zatap.vel[0];
                    zatag[zatam + 5] = zatap.vel[1];
                    zatag[zatam + 6] = zatap.vel[2];
                    zatag[zatam + 7] = zatap.size;
                    zatag[zatam + 8] = zatap.color[0];
                    zatag[zatam + 9] = zatap.color[1];
                    zatag[zatam + 10] = zatap.color[2];
                    zatag[zatam + 11] = zatap.lifetime;
                    zatag[zatam + 14] = zatag[zatam + 14] + 1 | 0;
                } else {
                    zatag[zatam + 3] = zatan;
                    var zataq = zatag[zatam + 4], zatar = zatag[zatam + 5], zatas = zatag[zatam + 6];
                    zatar += zatad * zataj;
                    for (var zatat = 0; zatat < zataf.length && zatat < 4; zatat++) {
                        var zatau = zataf[zatat];
                        var zatav = zatau.position.x - zatag[zatam], zataw = zatau.position.y - zatag[zatam + 1], zatax = zatau.position.z - zatag[zatam + 2];
                        var zatay = Math.sqrt(zatav * zatav + zataw * zataw + zatax * zatax);
                        if (zatay > 1e-4 && zatay < zatau.radius) {
                            var zataz = zatau.strength * (1 - zatay / zatau.radius) * zataj / zatay;
                            zataq += zatav * zataz;
                            zatar += zataw * zataz;
                            zatas += zatax * zataz;
                        }
                    }
                    var zataaa = Math.max(0, 1 - zatae * zataj);
                    zataq *= zataaa;
                    zatar *= zataaa;
                    zatas *= zataaa;
                    zatag[zatam] += zataq * zataj;
                    zatag[zatam + 1] += zatar * zataj;
                    zatag[zatam + 2] += zatas * zataj;
                    zatag[zatam + 4] = zataq;
                    zatag[zatam + 5] = zatar;
                    zatag[zatam + 6] = zatas;
                }
            }
        }
        for (var zataab = 0; zataab < zatah; zataab++) {
            var zataac = zataab * 16, zataad = zataab * 3;
            zatai.positions[zataad] = zatag[zataac];
            zatai.positions[zataad + 1] = zatag[zataac + 1];
            zatai.positions[zataad + 2] = zatag[zataac + 2];
            zatai.velocities[zataad] = zatag[zataac + 4];
            zatai.velocities[zataad + 1] = zatag[zataac + 5];
            zatai.velocities[zataad + 2] = zatag[zataac + 6];
            zatai.sizes[zataab] = zatag[zataac + 7];
            zatai.ages[zataab] = zatag[zataac + 3];
            zatai.lifetimes[zataab] = zatag[zataac + 11];
        }
        return zatai;
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
