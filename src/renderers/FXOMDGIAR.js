import { RQCORE } from "./GPURayQuery.js";

const dgiarcastwgsl = `${RQCORE}
struct dguparams {
    origin: vec4<f32>,
    gridinfo: vec4<f32>,
    spacing: vec4<f32>,
    misc: vec4<f32>,
};
@group(0) @binding(0) var<uniform> params: dguparams;
@group(0) @binding(4) var<storage, read> lights: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> albedo: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> rayout: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read> dirs: array<vec4<f32>>;
@compute @workgroup_size(64)
fn dgiarcast(@builtin(global_invocation_id) gid: vec3<u32>) {
    if (gid.x >= u32(params.misc.y)) {
        return;
    }
    var r = gid.x;
    var probe = r / 64u;
    var texel = r % 64u;
    var nx = params.gridinfo.x;
    var ny = params.gridinfo.y;
    var px = params.origin.x + f32(probe % u32(nx)) * params.spacing.x;
    var py = params.origin.y + f32((probe / u32(nx)) % u32(ny)) * params.spacing.y;
    var pz = params.origin.z + f32(probe / u32(nx * ny)) * params.spacing.z;
    var o = vec3<f32>(px, py, pz);
    var d = normalize(dirs[texel].xyz);
    var hit = rqtrace(o, d);
    var lout = vec3<f32>(0.0);
    var dist = params.spacing.w;
    if (hit.tri != 4294967295u) {
        var p = o + d * hit.t;
        var n = vec3<f32>(hit.nx, hit.ny, hit.nz);
        if (dot(n, d) > 0.0) {
            n = -n;
        }
        var oid = u32(tridata[hit.tri * 12u + 9u]);
        if (params.misc.w > 0.5) {
            oid = min(oid, u32(params.misc.w) - 1u);
        }
        var rho = albedo[oid].rgb;
        var lsum = vec3<f32>(0.0);
        var lc = u32(params.misc.x);
        for (var l = 0u; l < lc; l = l + 1u) {
            var lp = lights[l * 2u];
            var lcol = lights[l * 2u + 1u];
            var delta = lp.xyz - p;
            var dl = length(delta);
            var ldir = delta / max(dl, 0.000001);
            var att = 1.0;
            if (lp.w > 0.0) {
                att = max(0.0, 1.0 - dl / lp.w);
            }
            att = att * (1.0 / (1.0 + dl * dl * 0.015));
            var ndl = max(dot(n, ldir), 0.0);
            lsum = lsum + (rho / 3.14159265359) * lcol.rgb * lcol.w * att * ndl;
        }
        lout = lsum;
        dist = hit.t;
    }
    rayout[r] = vec4<f32>(lout, dist);
}`;

const dgiarintwgsl = `struct dgiparams {
    origin: vec4<f32>,
    gridinfo: vec4<f32>,
    spacing: vec4<f32>,
    misc: vec4<f32>,
};
@group(0) @binding(0) var<uniform> params: dgiparams;
@group(0) @binding(1) var<storage, read_write> atlas: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> rayout: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> dirs: array<vec4<f32>>;
@compute @workgroup_size(64)
fn dgiarintegrate(@builtin(global_invocation_id) gid: vec3<u32>) {
    if (gid.x >= u32(params.misc.y)) {
        return;
    }
    var r = gid.x;
    var probe = r / 64u;
    var texel = r % 64u;
    var e = vec3<f32>(0.0);
    for (var j = 0u; j < 64u; j = j + 1u) {
        var s = rayout[probe * 64u + j];
        var c = max(dot(dirs[j].xyz, dirs[texel].xyz), 0.0);
        e = e + s.rgb * c * dirs[j].w;
    }
    var d = rayout[r].w;
    var base = (probe * 64u + texel) * 2u;
    var a = atlas[base];
    var m = atlas[base + 1u];
    var alpha = params.misc.z;
    atlas[base] = vec4<f32>(mix(a.rgb, e, alpha), mix(a.w, d, alpha));
    atlas[base + 1u] = vec4<f32>(mix(m.x, d, alpha), mix(m.y, d * d, alpha), 0.0, 0.0);
}`;

function fxomdgiaroctdirs() {
    var out = new Float32Array(64 * 4);
    for (var ty = 0; ty < 8; ty++) {
        for (var tx = 0; tx < 8; tx++) {
            var u = ((tx + 0.5) / 8) * 2 - 1;
            var v = ((ty + 0.5) / 8) * 2 - 1;
            var z = 1 - Math.abs(u) - Math.abs(v);
            var x, y;
            if (z >= 0) {
                x = u; y = v;
            } else {
                x = (u >= 0 ? 1 : -1) * (1 - Math.abs(v));
                y = (v >= 0 ? 1 : -1) * (1 - Math.abs(u));
            }
            var l = Math.sqrt(x * x + y * y + z * z);
            var i = (ty * 8 + tx) * 4;
            out[i] = x / l; out[i + 1] = y / l; out[i + 2] = z / l;
            out[i + 3] = 4 * Math.PI / 64;
        }
    }
    return out;
}

class FXOMDGIAR {
    constructor(renderer, rayQuery) {
        this.renderer = renderer;
        this.rayQuery = rayQuery;
        this.device = renderer.device;
        this.origin = [0, 0, 0];
        this.spacing = [4, 4, 4];
        this.counts = [4, 4, 4];
        this.alpha = 0.25;
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
        this.stats = { probes: 0, rays: 0, lights: 0, updatems: 0, frames: 0 };
    }
    configure(options) {
        options = options || {};
        if (options.origin) this.origin = [options.origin[0] || 0, options.origin[1] || 0, options.origin[2] || 0];
        if (options.spacing) this.spacing = [options.spacing[0] || 4, options.spacing[1] || 4, options.spacing[2] || 4];
        if (options.counts) this.counts = [Math.max(1, options.counts[0] | 0), Math.max(1, options.counts[1] | 0), Math.max(1, options.counts[2] | 0)];
        if (options.alpha !== undefined) this.alpha = Math.min(1, Math.max(0, options.alpha));
        if (options.maxDist !== undefined) this.maxDist = options.maxDist;
        this.probes = this.counts[0] * this.counts[1] * this.counts[2];
        this.stats.probes = this.probes;
        this.stats.rays = this.probes * 64;
        if (!this.castpipeline) {
            this.castpipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: dgiarcastwgsl }), entryPoint: "dgiarcast" } });
            this.intpipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: dgiarintwgsl }), entryPoint: "dgiarintegrate" } });
            this.paramsbuffer = this.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            this.dirsbuffer = this.device.createBuffer({ size: 64 * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            this.device.queue.writeBuffer(this.dirsbuffer, 0, fxomdgiaroctdirs());
            this.lightbuffer = this.device.createBuffer({ size: this.maxLights * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            this.albedobuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            this.device.queue.writeBuffer(this.albedobuffer, 0, new Float32Array([1, 1, 1, 0]));
        }
        var atlasSize = this.probes * 64 * 2 * 16;
        if (this.atlasbuffer) this.atlasbuffer.destroy();
        if (this.rayoutbuffer) this.rayoutbuffer.destroy();
        if (this.readbackbuffer) this.readbackbuffer.destroy();
        this.atlasbuffer = this.device.createBuffer({ size: Math.max(16, atlasSize), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        this.rayoutbuffer = this.device.createBuffer({ size: Math.max(16, this.probes * 64 * 16), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.readbackbuffer = this.device.createBuffer({ size: Math.max(16, atlasSize), usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        this.castbind = this.device.createBindGroup({ layout: this.castpipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.paramsbuffer } },
            { binding: 1, resource: { buffer: this.rayQuery.nodebuffer } },
            { binding: 2, resource: { buffer: this.rayQuery.trilistbuffer } },
            { binding: 3, resource: { buffer: this.rayQuery.tridatabuffer } },
            { binding: 4, resource: { buffer: this.lightbuffer } },
            { binding: 5, resource: { buffer: this.albedobuffer } },
            { binding: 6, resource: { buffer: this.rayoutbuffer } },
            { binding: 7, resource: { buffer: this.dirsbuffer } }
        ] });
        this.intbind = this.device.createBindGroup({ layout: this.intpipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.paramsbuffer } },
            { binding: 1, resource: { buffer: this.atlasbuffer } },
            { binding: 2, resource: { buffer: this.rayoutbuffer } },
            { binding: 3, resource: { buffer: this.dirsbuffer } }
        ] });
        if (this.renderer && this.renderer._variantBindCache) this.renderer._variantBindCache.clear();
        this.writeparams(0);
        this.frame = 0;
        return this;
    }
    writeparams(lightCount, albedoCount) {
        var data = new Float32Array(32);
        data[0] = this.origin[0]; data[1] = this.origin[1]; data[2] = this.origin[2];
        data[4] = this.counts[0]; data[5] = this.counts[1]; data[6] = this.counts[2]; data[7] = 64;
        data[8] = this.spacing[0]; data[9] = this.spacing[1]; data[10] = this.spacing[2]; data[11] = this.maxDist;
        data[12] = lightCount || 0; data[13] = this.probes * 64; data[14] = this.alpha; data[15] = albedoCount || 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, data);
        var shade = new Float32Array(16);
        shade[0] = this.origin[0]; shade[1] = this.origin[1]; shade[2] = this.origin[2];
        shade[4] = this.counts[0]; shade[5] = this.counts[1]; shade[6] = this.counts[2];
        shade[8] = this.spacing[0]; shade[9] = this.spacing[1]; shade[10] = this.spacing[2];
        if (!this.shadebuffer) this.shadebuffer = this.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(this.shadebuffer, 0, shade);
    }
    setAlbedo(objects) {
        var list = objects && objects.length !== undefined ? objects : [objects];
        var data = new Float32Array(Math.max(1, list.length) * 4);
        for (var i = 0; i < list.length; i++) {
            var c = list[i] && list[i].material && list[i].material.color ? list[i].material.color : null;
            if (c) {
                data[i * 4] = c.r; data[i * 4 + 1] = c.g; data[i * 4 + 2] = c.b;
            } else {
                data[i * 4] = 1; data[i * 4 + 1] = 1; data[i * 4 + 2] = 1;
            }
        }
        if (this.albedobuffer) this.albedobuffer.destroy();
        this.albedobuffer = this.device.createBuffer({ size: Math.max(16, Math.max(1, list.length) * 16), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(this.albedobuffer, 0, data);
        this.albedoCount = Math.max(1, list.length);
        this.castbind = this.device.createBindGroup({ layout: this.castpipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.paramsbuffer } },
            { binding: 1, resource: { buffer: this.rayQuery.nodebuffer } },
            { binding: 2, resource: { buffer: this.rayQuery.trilistbuffer } },
            { binding: 3, resource: { buffer: this.rayQuery.tridatabuffer } },
            { binding: 4, resource: { buffer: this.lightbuffer } },
            { binding: 5, resource: { buffer: this.albedobuffer } },
            { binding: 6, resource: { buffer: this.rayoutbuffer } },
            { binding: 7, resource: { buffer: this.dirsbuffer } }
        ] });
        return this;
    }
    normalizeLights(lights) {
        var out = [];
        for (var i = 0; i < lights.length && i < this.maxLights; i++) {
            var light = lights[i];
            if (light && light.type === "PointLight") {
                var m = light.matrixWorld ? light.matrixWorld.elements : null;
                out.push({
                    position: m ? [m[12], m[13], m[14]] : [0, 0, 0],
                    distance: light.distance && light.distance > 0 ? light.distance : 1e30,
                    color: light.color ? [light.color.r, light.color.g, light.color.b] : [1, 1, 1],
                    intensity: light.intensity !== undefined ? light.intensity : 1
                });
            } else if (light && light.position) {
                out.push({
                    position: [light.position[0] || 0, light.position[1] || 0, light.position[2] || 0],
                    distance: light.distance > 0 ? light.distance : 1e30,
                    color: light.color || [1, 1, 1],
                    intensity: light.intensity !== undefined ? light.intensity : 1
                });
            }
        }
        return out;
    }
    update(lights) {
        if (!this.castpipeline || !this.rayQuery.nodebuffer) return this;
        var norm = this.normalizeLights(lights || []);
        var lightdata = new Float32Array(this.maxLights * 8);
        for (var i = 0; i < norm.length; i++) {
            lightdata[i * 8] = norm[i].position[0];
            lightdata[i * 8 + 1] = norm[i].position[1];
            lightdata[i * 8 + 2] = norm[i].position[2];
            lightdata[i * 8 + 3] = norm[i].distance;
            lightdata[i * 8 + 4] = norm[i].color[0];
            lightdata[i * 8 + 5] = norm[i].color[1];
            lightdata[i * 8 + 6] = norm[i].color[2];
            lightdata[i * 8 + 7] = norm[i].intensity;
        }
        if (norm.length > 0) this.device.queue.writeBuffer(this.lightbuffer, 0, lightdata.subarray(0, norm.length * 8));
        this.writeparams(norm.length, this.albedoCount || 1);
        var total = this.probes * 64;
        var t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.castpipeline);
        pass.setBindGroup(0, this.castbind);
        pass.dispatchWorkgroups(Math.ceil(total / 64));
        pass.setPipeline(this.intpipeline);
        pass.setBindGroup(0, this.intbind);
        pass.dispatchWorkgroups(Math.ceil(total / 64));
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.stats.updatems = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
        this.stats.lights = norm.length;
        this.stats.frames = ++this.frame;
        return this;
    }
    readback() {
        var self = this;
        var encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.atlasbuffer, 0, this.readbackbuffer, 0, this.readbackbuffer.size);
        this.device.queue.submit([encoder.finish()]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return self.readbackbuffer.mapAsync(GPUMapMode.READ).then(function() {
                var out = new Float32Array(self.readbackbuffer.getMappedRange()).slice();
                self.readbackbuffer.unmap();
                return out;
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
