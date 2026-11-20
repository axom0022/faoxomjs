import { RQCORE } from "./GPURayQuery.js";

const zaspa = `${RQCORE}\nstruct dguparams {\n    origin: vec4<f32>,\n    gridinfo: vec4<f32>,\n    spacing: vec4<f32>,\n    misc: vec4<f32>,\n};\n@group(0) @binding(0) var<uniform> params: dguparams;\n@group(0) @binding(4) var<storage, read> lights: array<vec4<f32>>;\n@group(0) @binding(5) var<storage, read> albedo: array<vec4<f32>>;\n@group(0) @binding(6) var<storage, read_write> rayout: array<vec4<f32>>;\n@group(0) @binding(7) var<storage, read> dirs: array<vec4<f32>>;\n@compute @workgroup_size(64)\nfn dgiarcast(@builtin(global_invocation_id) gid: vec3<u32>) {\n    if (gid.x >= u32(params.misc.y)) {\n        return;\n    }\n    var r = gid.x;\n    var probe = r / 64u;\n    var texel = r % 64u;\n    var nx = params.gridinfo.x;\n    var ny = params.gridinfo.y;\n    var px = params.origin.x + f32(probe % u32(nx)) * params.spacing.x;\n    var py = params.origin.y + f32((probe / u32(nx)) % u32(ny)) * params.spacing.y;\n    var pz = params.origin.z + f32(probe / u32(nx * ny)) * params.spacing.z;\n    var o = vec3<f32>(px, py, pz);\n    var d = normalize(dirs[texel].xyz);\n    var hit = rqtrace(o, d);\n    var lout = vec3<f32>(0.0);\n    var dist = params.spacing.w;\n    if (hit.tri != 4294967295u) {\n        var p = o + d * hit.t;\n        var n = vec3<f32>(hit.nx, hit.ny, hit.nz);\n        if (dot(n, d) > 0.0) {\n            n = -n;\n        }\n        var oid = u32(tridata[hit.tri * 12u + 9u]);\n        if (params.misc.w > 0.5) {\n            oid = min(oid, u32(params.misc.w) - 1u);\n        }\n        var rho = albedo[oid].rgb;\n        var lsum = vec3<f32>(0.0);\n        var lc = u32(params.misc.x);\n        for (var l = 0u; l < lc; l = l + 1u) {\n            var lp = lights[l * 2u];\n            var lcol = lights[l * 2u + 1u];\n            var delta = lp.xyz - p;\n            var dl = length(delta);\n            var ldir = delta / max(dl, 0.000001);\n            var att = 1.0;\n            if (lp.w > 0.0) {\n                att = max(0.0, 1.0 - dl / lp.w);\n            }\n            att = att * (1.0 / (1.0 + dl * dl * 0.015));\n            var ndl = max(dot(n, ldir), 0.0);\n            lsum = lsum + (rho / 3.14159265359) * lcol.rgb * lcol.w * att * ndl;\n        }\n        lout = lsum;\n        dist = hit.t;\n    }\n    rayout[r] = vec4<f32>(lout, dist);\n}`;

const zaspb = `struct dgiparams {\n    origin: vec4<f32>,\n    gridinfo: vec4<f32>,\n    spacing: vec4<f32>,\n    misc: vec4<f32>,\n};\n@group(0) @binding(0) var<uniform> params: dgiparams;\n@group(0) @binding(1) var<storage, read_write> atlas: array<vec4<f32>>;\n@group(0) @binding(2) var<storage, read> rayout: array<vec4<f32>>;\n@group(0) @binding(3) var<storage, read> dirs: array<vec4<f32>>;\n@compute @workgroup_size(64)\nfn dgiarintegrate(@builtin(global_invocation_id) gid: vec3<u32>) {\n    if (gid.x >= u32(params.misc.y)) {\n        return;\n    }\n    var r = gid.x;\n    var probe = r / 64u;\n    var texel = r % 64u;\n    var e = vec3<f32>(0.0);\n    for (var j = 0u; j < 64u; j = j + 1u) {\n        var s = rayout[probe * 64u + j];\n        var c = max(dot(dirs[j].xyz, dirs[texel].xyz), 0.0);\n        e = e + s.rgb * c * dirs[j].w;\n    }\n    var d = rayout[r].w;\n    var base = (probe * 64u + texel) * 2u;\n    var a = atlas[base];\n    var m = atlas[base + 1u];\n    var alpha = params.misc.z;\n    atlas[base] = vec4<f32>(mix(a.rgb, e, alpha), mix(a.w, d, alpha));\n    atlas[base + 1u] = vec4<f32>(mix(m.x, d, alpha), mix(m.y, d * d, alpha), 0.0, 0.0);\n}`;

function zaspc() {
    var zaspa = new Float32Array(64 * 4);
    for (var zaspb = 0; zaspb < 8; zaspb++) {
        for (var zaspc = 0; zaspc < 8; zaspc++) {
            var zaspd = (zaspc + .5) / 8 * 2 - 1;
            var zaspe = (zaspb + .5) / 8 * 2 - 1;
            var zaspf = 1 - Math.abs(zaspd) - Math.abs(zaspe);
            var zaspg, zasph;
            if (zaspf >= 0) {
                zaspg = zaspd;
                zasph = zaspe;
            } else {
                zaspg = (zaspd >= 0 ? 1 : -1) * (1 - Math.abs(zaspe));
                zasph = (zaspe >= 0 ? 1 : -1) * (1 - Math.abs(zaspd));
            }
            var zaspi = Math.sqrt(zaspg * zaspg + zasph * zasph + zaspf * zaspf);
            var zaspj = (zaspb * 8 + zaspc) * 4;
            zaspa[zaspj] = zaspg / zaspi;
            zaspa[zaspj + 1] = zasph / zaspi;
            zaspa[zaspj + 2] = zaspf / zaspi;
            zaspa[zaspj + 3] = 4 * Math.PI / 64;
        }
    }
    return zaspa;
}

class FXOMDGIAR {
    constructor(zaspa, zaspb) {
        this.renderer = zaspa;
        this.rayQuery = zaspb;
        this.device = zaspa.device;
        this.origin = [ 0, 0, 0 ];
        this.spacing = [ 4, 4, 4 ];
        this.counts = [ 4, 4, 4 ];
        this.alpha = .25;
        this.maxDist = 100;
        this.maxLights = 64;
        this.castpipeline = null;
        this.intpipeline = null;
        this.paramsbuffer = null;
        this.shadebuffer = null;
        this.dirsbuffer = null;
        this.lightbuffer = null;
        this.albedobuffer = null;
        this.rayoutbuffer = null;
        this.atlasbuffer = null;
        this.readbackbuffer = null;
        this.castbind = null;
        this.intbind = null;
        this.probes = 0;
        this.frame = 0;
        this.stats = {
            probes: 0,
            rays: 0,
            lights: 0,
            updatems: 0,
            frames: 0
        };
    }
    configure(zaspd) {
        zaspd = zaspd || {};
        if (zaspd.origin) this.origin = [ zaspd.origin[0] || 0, zaspd.origin[1] || 0, zaspd.origin[2] || 0 ];
        if (zaspd.spacing) this.spacing = [ zaspd.spacing[0] || 4, zaspd.spacing[1] || 4, zaspd.spacing[2] || 4 ];
        if (zaspd.counts) this.counts = [ Math.max(1, zaspd.counts[0] | 0), Math.max(1, zaspd.counts[1] | 0), Math.max(1, zaspd.counts[2] | 0) ];
        if (zaspd.alpha !== undefined) this.alpha = Math.min(1, Math.max(0, zaspd.alpha));
        if (zaspd.maxDist !== undefined) this.maxDist = zaspd.maxDist;
        this.probes = this.counts[0] * this.counts[1] * this.counts[2];
        this.stats.probes = this.probes;
        this.stats.rays = this.probes * 64;
        if (!this.castpipeline) {
            this.castpipeline = this.device.createComputePipeline({
                layout: "auto",
                compute: {
                    module: this.device.createShaderModule({
                        code: zaspa
                    }),
                    entryPoint: "dgiarcast"
                }
            });
            this.intpipeline = this.device.createComputePipeline({
                layout: "auto",
                compute: {
                    module: this.device.createShaderModule({
                        code: zaspb
                    }),
                    entryPoint: "dgiarintegrate"
                }
            });
            this.paramsbuffer = this.device.createBuffer({
                size: 128,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            this.dirsbuffer = this.device.createBuffer({
                size: 64 * 16,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.dirsbuffer, 0, zaspc());
            this.lightbuffer = this.device.createBuffer({
                size: this.maxLights * 32,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.albedobuffer = this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.albedobuffer, 0, new Float32Array([ 1, 1, 1, 0 ]));
        }
        var zaspe = this.probes * 64 * 2 * 16;
        if (this.atlasbuffer) this.atlasbuffer.destroy();
        if (this.rayoutbuffer) this.rayoutbuffer.destroy();
        if (this.readbackbuffer) this.readbackbuffer.destroy();
        this.atlasbuffer = this.device.createBuffer({
            size: Math.max(16, zaspe),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.rayoutbuffer = this.device.createBuffer({
            size: Math.max(16, this.probes * 64 * 16),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.readbackbuffer = this.device.createBuffer({
            size: Math.max(16, zaspe),
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        this.castbind = this.device.createBindGroup({
            layout: this.castpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.paramsbuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.rayQuery.nodebuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.rayQuery.trilistbuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.rayQuery.tridatabuffer
                }
            }, {
                binding: 4,
                resource: {
                    buffer: this.lightbuffer
                }
            }, {
                binding: 5,
                resource: {
                    buffer: this.albedobuffer
                }
            }, {
                binding: 6,
                resource: {
                    buffer: this.rayoutbuffer
                }
            }, {
                binding: 7,
                resource: {
                    buffer: this.dirsbuffer
                }
            } ]
        });
        this.intbind = this.device.createBindGroup({
            layout: this.intpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.paramsbuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.atlasbuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.rayoutbuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.dirsbuffer
                }
            } ]
        });
        if (this.renderer && this.renderer._variantBindCache) this.renderer._variantBindCache.clear();
        this.writeparams(0);
        this.frame = 0;
        return this;
    }
    writeparams(zaspa, zaspb) {
        var zaspc = new Float32Array(32);
        zaspc[0] = this.origin[0];
        zaspc[1] = this.origin[1];
        zaspc[2] = this.origin[2];
        zaspc[4] = this.counts[0];
        zaspc[5] = this.counts[1];
        zaspc[6] = this.counts[2];
        zaspc[7] = 64;
        zaspc[8] = this.spacing[0];
        zaspc[9] = this.spacing[1];
        zaspc[10] = this.spacing[2];
        zaspc[11] = this.maxDist;
        zaspc[12] = zaspa || 0;
        zaspc[13] = this.probes * 64;
        zaspc[14] = this.alpha;
        zaspc[15] = zaspb || 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, zaspc);
        var zaspd = new Float32Array(16);
        zaspd[0] = this.origin[0];
        zaspd[1] = this.origin[1];
        zaspd[2] = this.origin[2];
        zaspd[4] = this.counts[0];
        zaspd[5] = this.counts[1];
        zaspd[6] = this.counts[2];
        zaspd[8] = this.spacing[0];
        zaspd[9] = this.spacing[1];
        zaspd[10] = this.spacing[2];
        if (!this.shadebuffer) this.shadebuffer = this.device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.shadebuffer, 0, zaspd);
    }
    setAlbedo(zaspa) {
        var zaspb = zaspa && zaspa.length !== undefined ? zaspa : [ zaspa ];
        var zaspc = new Float32Array(Math.max(1, zaspb.length) * 4);
        for (var zaspd = 0; zaspd < zaspb.length; zaspd++) {
            var zaspe = zaspb[zaspd] && zaspb[zaspd].material && zaspb[zaspd].material.color ? zaspb[zaspd].material.color : null;
            if (zaspe) {
                zaspc[zaspd * 4] = zaspe.r;
                zaspc[zaspd * 4 + 1] = zaspe.g;
                zaspc[zaspd * 4 + 2] = zaspe.b;
            } else {
                zaspc[zaspd * 4] = 1;
                zaspc[zaspd * 4 + 1] = 1;
                zaspc[zaspd * 4 + 2] = 1;
            }
        }
        if (this.albedobuffer) this.albedobuffer.destroy();
        this.albedobuffer = this.device.createBuffer({
            size: Math.max(16, Math.max(1, zaspb.length) * 16),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.albedobuffer, 0, zaspc);
        this.albedoCount = Math.max(1, zaspb.length);
        this.castbind = this.device.createBindGroup({
            layout: this.castpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.paramsbuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.rayQuery.nodebuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.rayQuery.trilistbuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.rayQuery.tridatabuffer
                }
            }, {
                binding: 4,
                resource: {
                    buffer: this.lightbuffer
                }
            }, {
                binding: 5,
                resource: {
                    buffer: this.albedobuffer
                }
            }, {
                binding: 6,
                resource: {
                    buffer: this.rayoutbuffer
                }
            }, {
                binding: 7,
                resource: {
                    buffer: this.dirsbuffer
                }
            } ]
        });
        return this;
    }
    normalizeLights(zaspa) {
        var zaspb = [];
        for (var zaspc = 0; zaspc < zaspa.length && zaspc < this.maxLights; zaspc++) {
            var zaspd = zaspa[zaspc];
            if (zaspd && zaspd.type === "PointLight") {
                var zaspe = zaspd.matrixWorld ? zaspd.matrixWorld.elements : null;
                zaspb.push({
                    position: zaspe ? [ zaspe[12], zaspe[13], zaspe[14] ] : [ 0, 0, 0 ],
                    distance: zaspd.distance && zaspd.distance > 0 ? zaspd.distance : 1e30,
                    color: zaspd.color ? [ zaspd.color.r, zaspd.color.g, zaspd.color.b ] : [ 1, 1, 1 ],
                    intensity: zaspd.intensity !== undefined ? zaspd.intensity : 1
                });
            } else if (zaspd && zaspd.position) {
                zaspb.push({
                    position: [ zaspd.position[0] || 0, zaspd.position[1] || 0, zaspd.position[2] || 0 ],
                    distance: zaspd.distance > 0 ? zaspd.distance : 1e30,
                    color: zaspd.color || [ 1, 1, 1 ],
                    intensity: zaspd.intensity !== undefined ? zaspd.intensity : 1
                });
            }
        }
        return zaspb;
    }
    update(zaspa) {
        if (!this.castpipeline || !this.rayQuery.nodebuffer) return this;
        var zaspb = this.normalizeLights(zaspa || []);
        var zaspc = new Float32Array(this.maxLights * 8);
        for (var zaspd = 0; zaspd < zaspb.length; zaspd++) {
            zaspc[zaspd * 8] = zaspb[zaspd].position[0];
            zaspc[zaspd * 8 + 1] = zaspb[zaspd].position[1];
            zaspc[zaspd * 8 + 2] = zaspb[zaspd].position[2];
            zaspc[zaspd * 8 + 3] = zaspb[zaspd].distance;
            zaspc[zaspd * 8 + 4] = zaspb[zaspd].color[0];
            zaspc[zaspd * 8 + 5] = zaspb[zaspd].color[1];
            zaspc[zaspd * 8 + 6] = zaspb[zaspd].color[2];
            zaspc[zaspd * 8 + 7] = zaspb[zaspd].intensity;
        }
        if (zaspb.length > 0) this.device.queue.writeBuffer(this.lightbuffer, 0, zaspc.subarray(0, zaspb.length * 8));
        this.writeparams(zaspb.length, this.albedoCount || 1);
        var zaspe = this.probes * 64;
        var zaspf = typeof performance !== "undefined" ? performance.now() : Date.now();
        var zaspg = this.device.createCommandEncoder();
        var zasph = zaspg.beginComputePass();
        zasph.setPipeline(this.castpipeline);
        zasph.setBindGroup(0, this.castbind);
        zasph.dispatchWorkgroups(Math.ceil(zaspe / 64));
        zasph.setPipeline(this.intpipeline);
        zasph.setBindGroup(0, this.intbind);
        zasph.dispatchWorkgroups(Math.ceil(zaspe / 64));
        zasph.end();
        this.device.queue.submit([ zaspg.finish() ]);
        this.stats.updatems = (typeof performance !== "undefined" ? performance.now() : Date.now()) - zaspf;
        this.stats.lights = zaspb.length;
        this.stats.frames = ++this.frame;
        return this;
    }
    readback() {
        var zaspa = this;
        var zaspb = this.device.createCommandEncoder();
        zaspb.copyBufferToBuffer(this.atlasbuffer, 0, this.readbackbuffer, 0, this.readbackbuffer.size);
        this.device.queue.submit([ zaspb.finish() ]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return zaspa.readbackbuffer.mapAsync(GPUMapMode.READ).then(function() {
                var zaspb = new Float32Array(zaspa.readbackbuffer.getMappedRange()).slice();
                zaspa.readbackbuffer.unmap();
                return zaspb;
            });
        });
    }
    dispose() {
        if (this.atlasbuffer) this.atlasbuffer.destroy();
        if (this.rayoutbuffer) this.rayoutbuffer.destroy();
        if (this.readbackbuffer) this.readbackbuffer.destroy();
        if (this.paramsbuffer) this.paramsbuffer.destroy();
        if (this.shadebuffer) this.shadebuffer.destroy();
        if (this.dirsbuffer) this.dirsbuffer.destroy();
        if (this.lightbuffer) this.lightbuffer.destroy();
        if (this.albedobuffer) this.albedobuffer.destroy();
        this.atlasbuffer = null;
        this.rayoutbuffer = null;
        this.readbackbuffer = null;
        this.paramsbuffer = null;
        this.shadebuffer = null;
        this.dirsbuffer = null;
        this.lightbuffer = null;
        this.albedobuffer = null;
        this.castpipeline = null;
        this.intpipeline = null;
        this.castbind = null;
        this.intbind = null;
    }
}

export { FXOMDGIAR };
