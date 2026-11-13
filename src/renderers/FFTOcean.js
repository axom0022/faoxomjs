import { Matrix4 } from "../math/index.js";

const oceanwgsl = `
struct CameraParams {
    viewproj: mat4x4<f32>,
    campos: vec4<f32>,
};
struct OceanInfo {
    origin: vec4<f32>,
    grid: vec4<f32>,
    sun: vec4<f32>,
    col1: vec4<f32>,
    col2: vec4<f32>,
    col3: vec4<f32>,
};
struct EvolParams {
    time: f32,
    n: u32,
    pad0: u32,
    pad1: u32,
};
struct BfParams {
    n: u32,
    span: u32,
    horizontal: u32,
    inverse: u32,
};
struct PackParams {
    n: u32,
    lambda: f32,
    scale: f32,
    pad0: u32,
};
@group(0) @binding(0) var<uniform> evolparams: EvolParams;
@group(0) @binding(1) var<storage, read> spec: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> fftwork: array<vec4<f32>>;
fn cmul(ar: f32, ai: f32, br: f32, bi: f32) -> vec2<f32> {
    return vec2<f32>(ar * br - ai * bi, ar * bi + ai * br);
}
@compute @workgroup_size(64)
fn evolve(@builtin(global_invocation_id) gid: vec3<u32>) {
    let n = evolparams.n;
    if (gid.x >= n * n) { return; }
    let i = gid.x % n;
    let j = gid.x / n;
    let mirror = ((n - i) % n) + ((n - j) % n) * n;
    let own = spec[2u * gid.x];
    let mir = spec[2u * mirror];
    let kn = spec[2u * gid.x + 1u];
    let omega = own.z;
    let kx = own.w;
    let kz = kn.x;
    let klen = kn.y;
    let wt = omega * evolparams.time;
    let c = cos(wt);
    let s = sin(wt);
    let a1 = own.x;
    let b1 = own.y;
    let a2 = mir.x;
    let b2 = mir.y;
    var hre = a1 * c + b1 * s + a2 * c + b2 * s;
    var him = b1 * c - a1 * s + a2 * s - b2 * c;
    var nk = 0.0;
    if (klen > 0.00001) { nk = 1.0 / klen; }
    var dxre = him * (kx * nk);
    var dxim = -hre * (kx * nk);
    var dzre = him * (kz * nk);
    var dzim = -hre * (kz * nk);
    fftwork[2u * gid.x] = vec4<f32>(hre, him, dxre, dxim);
    fftwork[2u * gid.x + 1u] = vec4<f32>(dzre, dzim, 0.0, 0.0);
}
@group(0) @binding(0) var<uniform> bfparams: BfParams;
@group(0) @binding(1) var<storage, read> bfsrcc: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> bfdst: array<vec4<f32>>;
fn jterm(p: BfParams, idx1: u32, idx2: u32) -> u32 {
    let half = p.span / 2u;
    if (p.horizontal == 1u) { return idx1 % half; }
    return (idx1 / p.n) % half;
}
@compute @workgroup_size(64)
fn butterfly(@builtin(global_invocation_id) gid: vec3<u32>) {
    let n = bfparams.n;
    let pairs = n * n / 2u;
    if (gid.x >= pairs) { return; }
    let span = bfparams.span;
    let half = span / 2u;
    var idx1: u32;
    var idx2: u32;
    var read1: u32;
    var read2: u32;
    if (bfparams.horizontal == 1u) {
        let block = gid.x / half;
        let j = gid.x % half;
        idx1 = block * span + j;
        idx2 = idx1 + half;
        read1 = idx1;
        read2 = idx2;
        if (span == 2u) {
            var l2 = 0u;
            var v = n;
            while (v > 1u) { l2 = l2 + 1u; v = v >> 1u; }
            let r = idx1 / n;
            read1 = r * n + (reverseBits(idx1 % n) >> (32u - l2));
            read2 = r * n + (reverseBits(idx2 % n) >> (32u - l2));
        }
    } else {
        let col = gid.x / (n / 2u);
        let pc = gid.x % (n / 2u);
        let block = pc / half;
        let j = pc % half;
        let r1 = block * span + j;
        idx1 = r1 * n + col;
        idx2 = (r1 + half) * n + col;
        read1 = idx1;
        read2 = idx2;
        if (span == 2u) {
            var l2 = 0u;
            var v = n;
            while (v > 1u) { l2 = l2 + 1u; v = v >> 1u; }
            read1 = (reverseBits(idx1 / n) >> (32u - l2)) * n + col;
            read2 = (reverseBits(idx2 / n) >> (32u - l2)) * n + col;
        }
    }
    let angle = 6.283185307179586 * f32(jterm(bfparams, idx1, idx2)) / f32(span);
    var tw = vec2<f32>(cos(angle), -sin(angle));
    if (bfparams.inverse == 1u) { tw.y = sin(angle); }
    let a = bfsrcc[2u * read1];
    let a2 = bfsrcc[2u * read1 + 1u];
    let b = bfsrcc[2u * read2];
    let b2 = bfsrcc[2u * read2 + 1u];
    let m0 = cmul(b.x, b.y, tw.x, tw.y);
    let m1 = cmul(b.z, b.w, tw.x, tw.y);
    let m2 = cmul(b2.x, b2.y, tw.x, tw.y);
    let m3 = cmul(b2.z, b2.w, tw.x, tw.y);
    var o0a = vec4<f32>(a.x + m0.x, a.y + m0.y, a.z + m1.x, a.w + m1.y);
    var o0b = vec4<f32>(a.x - m0.x, a.y - m0.y, a.z - m1.x, a.w - m1.y);
    var o1a = vec4<f32>(a2.x + m2.x, a2.y + m2.y, a2.z + m3.x, a2.w + m3.y);
    var o1b = vec4<f32>(a2.x - m2.x, a2.y - m2.y, a2.z - m3.x, a2.w - m3.y);
    bfdst[2u * idx1] = o0a;
    bfdst[2u * idx1 + 1u] = o1a;
    bfdst[2u * idx2] = o0b;
    bfdst[2u * idx2 + 1u] = o1b;
}
@group(0) @binding(0) var<uniform> packparams: PackParams;
@group(0) @binding(1) var<storage, read> packsrc: array<vec4<f32>>;
@group(0) @binding(2) var packdst: texture_storage_2d<rgba32float, write>;
@compute @workgroup_size(8, 8)
fn pack(@builtin(global_invocation_id) gid: vec3<u32>) {
    let n = packparams.n;
    if (gid.x >= n || gid.y >= n) { return; }
    let t = gid.x + gid.y * n;
    let s = packparams.scale;
    let lambda = packparams.lambda;
    let v0 = packsrc[2u * t];
    let v1 = packsrc[2u * t + 1u];
    textureStore(packdst, vec2<i32>(gid.xy), vec4<f32>(lambda * v0.z * s, v0.x * s, lambda * v1.x * s, 1.0));
}
@group(0) @binding(0) var<uniform> oceancam: CameraParams;
@group(1) @binding(0) var<uniform> oceaninfo: OceanInfo;
@group(1) @binding(1) var disp: texture_2d<f32>;
struct VSOut {
    @builtin(position) position: vec4<f32>,
    @location(0) world: vec3<f32>,
    @location(1) normal: vec3<f32>,
};
fn loadCell(i: u32, j: u32) -> vec4<f32> {
    let n = u32(oceaninfo.origin.w);
    return textureLoad(disp, vec2<i32>(vec2<u32>(i % n, j % n)), 0);
}
@vertex
fn oceanvs(@builtin(vertex_index) vi: u32) -> VSOut {
    let g = u32(oceaninfo.grid.x);
    let cellmesh = oceaninfo.grid.y;
    let cellspec = oceaninfo.grid.z;
    let n = u32(oceaninfo.origin.w);
    let worldsize = oceaninfo.origin.z;
    let c = vi / 6u;
    let t = vi % 6u;
    var di = vec2<u32>(0u, 0u);
    if (t == 1u || t == 3u || t == 4u) { di.x = 1u; }
    if (t == 2u || t == 4u || t == 5u) { di.y = 1u; }
    let i = c % g + di.x;
    let j = c / g + di.y;
    let x = oceaninfo.origin.x - worldsize * 0.5 + f32(i) * cellmesh;
    let z = oceaninfo.origin.y - worldsize * 0.5 + f32(j) * cellmesh;
    let ti = u32(f32(i) * cellmesh / cellspec);
    let tj = u32(f32(j) * cellmesh / cellspec);
    let d = loadCell(ti, tj);
    var world = vec3<f32>(x + d.x, d.y, z + d.z);
    let ha = loadCell((ti + 1u) % n, tj).y;
    let hb = loadCell((ti + n - 1u) % n, tj).y;
    let hc = loadCell(ti, (tj + 1u) % n).y;
    let hd = loadCell(ti, (tj + n - 1u) % n).y;
    var normal = normalize(vec3<f32>(-(ha - hb) / (2.0 * cellspec), 1.0, -(hc - hd) / (2.0 * cellspec)));
    var out: VSOut;
    let clip = oceancam.viewproj * vec4<f32>(world, 1.0);
    out.position = vec4<f32>(clip.xy, clip.z * 0.5 + clip.w * 0.5, clip.w);
    out.world = world;
    out.normal = normal;
    return out;
}
@fragment
fn oceanfs(in: VSOut) -> @location(0) vec4<f32> {
    let n = normalize(in.normal);
    let v = normalize(oceancam.campos.xyz - in.world);
    let l = normalize(oceaninfo.sun.xyz);
    let h = normalize(v + l);
    let spec = pow(max(dot(n, h), 0.0), 140.0) * oceaninfo.col1.rgb * 4.0;
    let fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
    var col = mix(oceaninfo.col2.rgb, oceaninfo.col3.rgb, fres);
    let diffuse = max(dot(n, l), 0.0);
    col = col * (0.35 + 0.65 * diffuse) + spec;
    return vec4<f32>(col, 1.0);
}
`;

function fftGaussian(rand) {
    var u = 0, v = 0;
    for (var i = 0; i < 32; i++) {
        u = rand();
        v = rand();
        if (u > 1e-12) break;
    }
    var r = Math.sqrt(-2 * Math.log(u));
    return [r * Math.cos(6.283185307179586 * v), r * Math.sin(6.283185307179586 * v)];
}

/** FFT spectral ocean (Tessendorf) with choppy displacement and CPU buoyancy queries.
 *  Standalone renderer integration: call update(t) each frame, then render(view, depthView, camera)
 *  after the scene pass - the mesh loads the scene depth and integrates via depth testing.
 *  options.amplitude is the target RMS wave height in world units; choppiness in [0, 3].
 *  heightAt/normalAt/velocityAt give CPU-side buoyancy sampling at any world position. */
class FFTOcean {
    constructor(renderer, options) {
        options = options || {};
        if (!renderer || !renderer.device) throw new Error("FFTOcean requires a WebGPURenderer");
        this.renderer = renderer;
        this.device = renderer.device;
        this.disposed = false;
        var n = Math.floor(options.size === undefined ? 64 : options.size);
        if (n < 8 || n > 512 || (n & (n - 1)) !== 0) throw new Error("FFTOcean size must be a power of two in [8, 512]");
        this.size = n;
        this.worldSize = Math.max(1e-3, options.worldSize === undefined ? 256 : options.worldSize);
        this.windDirection = options.windDirection === undefined ? Math.PI * 0.25 : options.windDirection;
        this.windSpeed = Math.max(0.01, options.windSpeed === undefined ? 12 : options.windSpeed);
        this.amplitude = Math.max(0, options.amplitude === undefined ? 0.35 : options.amplitude);
        this.choppiness = Math.min(3, Math.max(0, options.choppiness === undefined ? 1 : options.choppiness));
        this.seed = (options.seed === undefined ? 1 : options.seed) | 0;
        this.smallWaveCutoff = Math.max(0.001, options.smallWaveCutoff === undefined ? 0.3 : options.smallWaveCutoff);
        this.meshGrid = Math.floor(options.meshGrid === undefined ? n : options.meshGrid);
        if (this.meshGrid < 2 || this.meshGrid > 1024) throw new Error("FFTOcean meshGrid must be in [2, 1024]");
        this.depthFormat = options.depthFormat || "depth24plus";
        this.origin = { x: options.origin && options.origin.x !== undefined ? options.origin.x : 0, z: options.origin && options.origin.z !== undefined ? options.origin.z : 0 };
        this.sunDirection = options.sunDirection || { x: 0.5, y: 0.8, z: 0.3 };
        this.sunColor = options.sunColor || { r: 1, g: 0.97, b: 0.9 };
        this.waterColor = options.waterColor || { r: 0.02, g: 0.09, b: 0.16 };
        this.skyColor = options.skyColor || { r: 0.55, g: 0.7, b: 0.85 };
        this.gravity = 9.81;
        this.time = 0;
        this.stats = { updates: 0, fftPasses: 0, queries: 0, textureBytes: n * n * 16 };
        this._buildSpectrum();
        this._buildGPU();
        this.update(0);
    }
    _buildSpectrum() {
        var n = this.size, total = n * n;
        var state = (this.seed ^ 0x9E3779B9) | 0;
        function rand() {
            state = (state + 0x6D2B79F5) | 0;
            var t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        var L = this.windSpeed * this.windSpeed / this.gravity;
        var wx = Math.cos(this.windDirection), wz = Math.sin(this.windDirection);
        var h0re = new Float32Array(total), h0im = new Float32Array(total);
        var kx = new Float32Array(total), kz = new Float32Array(total), omega = new Float32Array(total), klen = new Float32Array(total), phillips = new Float32Array(total);
        for (var j = 0; j < n; j++) {
            for (var i = 0; i < n; i++) {
                var idx = j * n + i;
                var fx = i <= n / 2 ? i : i - n;
                var fz = j <= n / 2 ? j : j - n;
                var kxx = 2 * Math.PI * fx / this.worldSize;
                var kzz = 2 * Math.PI * fz / this.worldSize;
                var kl = Math.sqrt(kxx * kxx + kzz * kzz);
                kx[idx] = kxx; kz[idx] = kzz; klen[idx] = kl;
                omega[idx] = Math.sqrt(this.gravity * kl);
                if (kl < 1e-9) continue;
                var knx = kxx / kl, knz = kzz / kl;
                var dot = knx * wx + knz * wz;
                var p = this.amplitude * Math.exp(-1 / (kl * L * kl * L)) / (kl * kl * kl * kl) * dot * dot * Math.exp(-kl * kl * this.smallWaveCutoff * this.smallWaveCutoff);
                phillips[idx] = p > 0 ? p : 0;
            }
        }
        for (var j2 = 0; j2 < n; j2++) {
            for (var i2 = 0; i2 < n; i2++) {
                var idx2 = j2 * n + i2;
                var midx2 = ((n - j2) % n) * n + (n - i2) % n;
                if (klen[idx2] < 1e-9 || phillips[idx2] <= 0) continue;
                var g = fftGaussian(rand);
                var mag = Math.sqrt(phillips[idx2]) * 0.7071067811865476;
                if (idx2 < midx2) {
                    h0re[idx2] = g[0] * mag;
                    h0im[idx2] = g[1] * mag;
                } else if (idx2 === midx2) {
                    h0re[idx2] = g[0] * mag;
                    h0im[idx2] = 0;
                }
            }
        }
        for (var j3 = 0; j3 < n; j3++) {
            for (var i3 = 0; i3 < n; i3++) {
                var idx3 = j3 * n + i3;
                var midx3 = ((n - j3) % n) * n + (n - i3) % n;
                if (midx3 > idx3) {
                    h0re[midx3] = h0re[idx3];
                    h0im[midx3] = -h0im[idx3];
                }
            }
        }
        var energy = 0;
        for (var e = 0; e < total; e++) energy += h0re[e] * h0re[e] + h0im[e] * h0im[e];
        if (energy > 1e-30) {
            var norm = this.amplitude / Math.sqrt(2 * energy);
            for (var e2 = 0; e2 < total; e2++) { h0re[e2] *= norm; h0im[e2] *= norm; }
        }
        var spec = new Float32Array(total * 8);
        for (var t = 0; t < total; t++) {
            spec[t * 8] = h0re[t];
            spec[t * 8 + 1] = h0im[t];
            spec[t * 8 + 2] = omega[t];
            spec[t * 8 + 3] = kx[t];
            spec[t * 8 + 4] = kz[t];
            spec[t * 8 + 5] = klen[t];
        }
        this.h0re = h0re; this.h0im = h0im; this.kx = kx; this.kz = kz; this.omega = omega; this.klen = klen;
        this.fieldOriginX = this.origin.x - this.worldSize * 0.5;
        this.fieldOriginZ = this.origin.z - this.worldSize * 0.5;
        this.specdata = spec;
    }

    _buildGPU() {
        var device = this.device;
        var n = this.size, total = n * n;
        this.module = device.createShaderModule({ code: oceanwgsl });
        this.evolpipeline = device.createComputePipeline({ layout: "auto", compute: { module: this.module, entryPoint: "evolve" } });
        var stagesTotal = 2 * Math.round(Math.log2(n));
        this.bflayout = device.createBindGroupLayout({ entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", hasDynamicOffset: true } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        ] });
        this.bfpipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [this.bflayout] }), compute: { module: this.module, entryPoint: "butterfly" } });
        this.packpipeline = device.createComputePipeline({ layout: "auto", compute: { module: this.module, entryPoint: "pack" } });
        this.renderpipeline = device.createRenderPipeline({
            layout: "auto",
            vertex: { module: this.module, entryPoint: "oceanvs" },
            fragment: { module: this.module, entryPoint: "oceanfs", targets: [{ format: this.renderer.format }] },
            primitive: { topology: "triangle-list", cullMode: "none" },
            depthStencil: { format: this.depthFormat, depthWriteEnabled: true, depthCompare: "less" }
        });
        this.specbuffer = device.createBuffer({ size: total * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(this.specbuffer, 0, this.specdata);
        this.fftA = device.createBuffer({ size: total * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.fftB = device.createBuffer({ size: total * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        this.evoluniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.bfuniform = device.createBuffer({ size: 256 * stagesTotal, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var stageParams = new Uint32Array(64 * stagesTotal);
        var si = 0;
        for (var dcur = 0; dcur < 2; dcur++) {
            for (var scur = 1; scur <= Math.round(Math.log2(n)); scur++) {
                var off = si * 64;
                stageParams[off] = n;
                stageParams[off + 1] = 1 << scur;
                stageParams[off + 2] = dcur === 0 ? 1 : 0;
                stageParams[off + 3] = 1;
                si++;
            }
        }
        device.queue.writeBuffer(this.bfuniform, 0, stageParams);
        this.packuniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.disptexture = device.createTexture({ size: [n, n, 1], format: "rgba32float", usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC });
        this.dispview = this.disptexture.createView();
        this.camerabuffer = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.infolbuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.evolbind = device.createBindGroup({ layout: this.evolpipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.evoluniform } },
            { binding: 1, resource: { buffer: this.specbuffer } },
            { binding: 2, resource: { buffer: this.fftA } }
        ] });
        this.bfbindAB = device.createBindGroup({ layout: this.bflayout, entries: [
            { binding: 0, resource: { buffer: this.bfuniform, size: 16 } },
            { binding: 1, resource: { buffer: this.fftA } },
            { binding: 2, resource: { buffer: this.fftB } }
        ] });
        this.bfbindBA = device.createBindGroup({ layout: this.bflayout, entries: [
            { binding: 0, resource: { buffer: this.bfuniform, size: 16 } },
            { binding: 1, resource: { buffer: this.fftB } },
            { binding: 2, resource: { buffer: this.fftA } }
        ] });
        this.packbind = device.createBindGroup({ layout: this.packpipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.packuniform } },
            { binding: 1, resource: { buffer: this.fftA } },
            { binding: 2, resource: this.dispview }
        ] });
        this.packbindB = device.createBindGroup({ layout: this.packpipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.packuniform } },
            { binding: 1, resource: { buffer: this.fftB } },
            { binding: 2, resource: this.dispview }
        ] });
        this.renderbind = device.createBindGroup({ layout: this.renderpipeline.getBindGroupLayout(1), entries: [
            { binding: 0, resource: { buffer: this.infolbuffer } },
            { binding: 1, resource: this.dispview }
        ] });
    }
    _writeInfo() {
        var info = new Float32Array(24);
        info[0] = this.origin.x;
        info[1] = this.origin.z;
        info[2] = this.worldSize;
        info[3] = this.size;
        info[4] = this.meshGrid;
        info[5] = this.worldSize / this.meshGrid;
        info[6] = this.worldSize / this.size;
        var sd = this.sunDirection;
        var sl = Math.sqrt(sd.x * sd.x + sd.y * sd.y + sd.z * sd.z) || 1;
        info[8] = sd.x / sl; info[9] = sd.y / sl; info[10] = sd.z / sl;
        info[12] = this.sunColor.r; info[13] = this.sunColor.g; info[14] = this.sunColor.b;
        info[16] = this.waterColor.r; info[17] = this.waterColor.g; info[18] = this.waterColor.b;
        info[20] = this.skyColor.r; info[21] = this.skyColor.g; info[22] = this.skyColor.b;
        this.device.queue.writeBuffer(this.infolbuffer, 0, info);
    }
    update(time) {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        this.time = time === undefined ? this.time : time;
        var n = this.size;
        var device = this.device;
        var eu = new ArrayBuffer(16);
        new Uint32Array(eu)[1] = n;
        var euf = new Float32Array(eu);
        euf[0] = this.time;
        device.queue.writeBuffer(this.evoluniform, 0, eu);
        var pu = new ArrayBuffer(16);
        new Uint32Array(pu)[0] = n;
        var puf = new Float32Array(pu);
        puf[1] = this.choppiness;
        puf[2] = 1;
        device.queue.writeBuffer(this.packuniform, 0, pu);
        var encoder = device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.evolpipeline);
        pass.setBindGroup(0, this.evolbind);
        pass.dispatchWorkgroups(Math.ceil(n * n / 64));
        pass.end();
        var srcIsA = true;
        var stageIdx = 0;
        var stages = Math.round(Math.log2(n));
        for (var d = 0; d < 2; d++) {
            for (var s = 1; s <= stages; s++) {
                var pass2 = encoder.beginComputePass();
                pass2.setPipeline(this.bfpipeline);
                pass2.setBindGroup(0, srcIsA ? this.bfbindAB : this.bfbindBA, [stageIdx * 256]);
                pass2.dispatchWorkgroups(Math.ceil(n * n / 2 / 64));
                pass2.end();
                srcIsA = !srcIsA;
                stageIdx++;
                this.stats.fftPasses++;
            }
        }
        var packSourceIsA = srcIsA;
        var pass3 = encoder.beginComputePass();
        pass3.setPipeline(this.packpipeline);
        pass3.setBindGroup(0, packSourceIsA ? this.packbind : this.packbindB);
        pass3.dispatchWorkgroups(Math.ceil(n / 8), Math.ceil(n / 8));
        pass3.end();
        device.queue.submit([encoder.finish()]);
        this.stats.updates++;
        this._writeInfo();
        return this;
    }
    _evalField(x, z, t) {
        var h = 0, dhdx = 0, dhdz = 0, dhdt = 0, dx = 0, dz = 0, dvx = 0, dvz = 0;
        var kx = this.kx, kz = this.kz, om = this.omega, kl = this.klen, ar = this.h0re, ai = this.h0im;
        var total = this.size * this.size;
        var fx = x - this.fieldOriginX, fz = z - this.fieldOriginZ;
        for (var i = 0; i < total; i++) {
            var k = kl[i];
            if (k < 1e-9) continue;
            var ph = kx[i] * fx + kz[i] * fz - om[i] * t;
            var c = Math.cos(ph), s = Math.sin(ph);
            var zr = ar[i] * c - ai[i] * s;
            var zi = ar[i] * s + ai[i] * c;
            h += 2 * zr;
            dhdx += -2 * kx[i] * zi;
            dhdz += -2 * kz[i] * zi;
            dhdt += 2 * om[i] * zi;
            var nkx = kx[i] / k, nkz = kz[i] / k;
            dx += 2 * nkx * (ai[i] * c + ar[i] * s);
            dz += 2 * nkz * (ai[i] * c + ar[i] * s);
            dvx += 2 * om[i] * nkx * (ai[i] * s - ar[i] * c);
            dvz += 2 * om[i] * nkz * (ai[i] * s - ar[i] * c);
        }
        return { h: h, dhdx: dhdx, dhdz: dhdz, dhdt: dhdt, dx: dx, dz: dz, dvx: dvx, dvz: dvz };
    }
    heightAt(x, z, t) {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        var time = t === undefined ? this.time : t;
        this.stats.queries++;
        var px = x, pz = z;
        var f = null;
        var iterations = this.choppiness > 0 ? 2 : 1;
        for (var it = 0; it < iterations; it++) {
            f = this._evalField(px, pz, time);
            px = x - this.choppiness * f.dx;
            pz = z - this.choppiness * f.dz;
        }
        return f.h;
    }
    normalAt(x, z, t) {
        var time = t === undefined ? this.time : t;
        this.stats.queries++;
        var f = this._evalField(x, z, time);
        var nx = -f.dhdx, ny = 1, nz = -f.dhdz;
        var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        return { x: nx / len, y: ny / len, z: nz / len };
    }
    velocityAt(x, z, t) {
        var time = t === undefined ? this.time : t;
        this.stats.queries++;
        var f = this._evalField(x, z, time);
        return { x: this.choppiness * f.dvx, y: f.dhdt, z: this.choppiness * f.dvz };
    }
    async readDisplacement() {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        var n = this.size;
        var bytesPerRow = Math.ceil(n * 16 / 256) * 256;
        var buffer = this.device.createBuffer({ size: bytesPerRow * n, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        var encoder = this.device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: this.disptexture }, { buffer: buffer, bytesPerRow: bytesPerRow, rowsPerImage: n }, [n, n, 1]);
        this.device.queue.submit([encoder.finish()]);
        await buffer.mapAsync(GPUMapMode.READ);
        var raw = new Uint8Array(buffer.getMappedRange());
        var out = new Float32Array(n * n * 4);
        for (var j = 0; j < n; j++) {
            for (var i = 0; i < n; i++) {
                var src = j * bytesPerRow + i * 16;
                var dst = (j * n + i) * 4;
                out[dst] = new DataView(raw.buffer).getFloat32(src, true);
                out[dst + 1] = new DataView(raw.buffer).getFloat32(src + 4, true);
                out[dst + 2] = new DataView(raw.buffer).getFloat32(src + 8, true);
                out[dst + 3] = new DataView(raw.buffer).getFloat32(src + 12, true);
            }
        }
        buffer.unmap();
        buffer.destroy();
        return out;
    }
    async fft2d(data) {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        var n = this.size, total = n * n;
        if (!(data instanceof Float32Array) || data.length !== total * 2) throw new Error("fft2d expects Float32Array of size^2 complex pairs");
        var packed = new Float32Array(total * 8);
        for (var i = 0; i < total; i++) {
            packed[i * 8] = data[i * 2];
            packed[i * 8 + 1] = data[i * 2 + 1];
        }
        var device = this.device;
        device.queue.writeBuffer(this.fftA, 0, packed);
        var encoder = device.createCommandEncoder();
        var srcIsA = true;
        var stageIdx = 0;
        var stages = Math.round(Math.log2(n));
        for (var d = 0; d < 2; d++) {
            for (var s = 1; s <= stages; s++) {
                var pass = encoder.beginComputePass();
                pass.setPipeline(this.bfpipeline);
                pass.setBindGroup(0, srcIsA ? this.bfbindAB : this.bfbindBA, [stageIdx * 256]);
                pass.dispatchWorkgroups(Math.ceil(n * n / 2 / 64));
                pass.end();
                srcIsA = !srcIsA;
                stageIdx++;
            }
        }
        var readFrom = srcIsA ? this.fftA : this.fftB;
        encoder.copyBufferToBuffer(readFrom, 0, this.fftread || (this.fftread = device.createBuffer({ size: total * 32, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })), 0, total * 32);
        device.queue.submit([encoder.finish()]);
        await this.fftread.mapAsync(GPUMapMode.READ);
        var raw = new Float32Array(this.fftread.getMappedRange().slice(0));
        this.fftread.unmap();
        var out = new Float32Array(total * 2);
        for (var o = 0; o < total; o++) {
            out[o * 2] = raw[o * 8];
            out[o * 2 + 1] = raw[o * 8 + 1];
        }
        return out;
    }
    render(view, depthView, camera) {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        if (!view) throw new Error("render requires a color texture or view");
        if (view.createView) view = view.createView();
        if (!depthView) throw new Error("render requires a depth texture or view");
        if (depthView.createView) depthView = depthView.createView();
        if (!camera || !camera.projectionMatrix || !camera.matrixWorldInverse) throw new Error("render requires a camera");
        var vp = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        var cam = new Float32Array(20);
        for (var i = 0; i < 16; i++) cam[i] = vp.elements[i];
        cam[16] = camera.position.x; cam[17] = camera.position.y; cam[18] = camera.position.z; cam[19] = 1;
        this.device.queue.writeBuffer(this.camerabuffer, 0, cam);
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginRenderPass({
            colorAttachments: [{ view: view, loadOp: "load", storeOp: "store" }],
            depthStencilAttachment: { view: depthView, depthLoadOp: "load", depthStoreOp: "store" }
        });
        pass.setPipeline(this.renderpipeline);
        if (!this.rendercamerabind) this.rendercamerabind = this.device.createBindGroup({ layout: this.renderpipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.camerabuffer } }] });
        pass.setBindGroup(0, this.rendercamerabind);
        pass.setBindGroup(1, this.renderbind);
        pass.draw(this.meshGrid * this.meshGrid * 6, 1, 0, 0);
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        return this;
    }
    dispose() {
        if (this.disposed) return this;
        this.disposed = true;
        this.specbuffer.destroy();
        this.fftA.destroy();
        this.fftB.destroy();
        if (this.fftread) this.fftread.destroy();
        this.evoluniform.destroy();
        this.bfuniform.destroy();
        this.packuniform.destroy();
        this.camerabuffer.destroy();
        this.infolbuffer.destroy();
        this.rendercamerabind = null;
        this.disptexture.destroy();
        this.specbuffer = null;
        this.fftA = null;
        this.fftB = null;
        this.fftread = null;
        this.disptexture = null;
        return this;
    }
}

export { FFTOcean };
