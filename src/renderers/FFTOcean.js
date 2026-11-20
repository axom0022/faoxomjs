import { Matrix4 } from "../math/index.js";

const zasna = `\nstruct CameraParams {\n    viewproj: mat4x4<f32>,\n    campos: vec4<f32>,\n};\nstruct OceanInfo {\n    origin: vec4<f32>,\n    grid: vec4<f32>,\n    sun: vec4<f32>,\n    col1: vec4<f32>,\n    col2: vec4<f32>,\n    col3: vec4<f32>,\n};\nstruct EvolParams {\n    time: f32,\n    n: u32,\n    pad0: u32,\n    pad1: u32,\n};\nstruct BfParams {\n    n: u32,\n    span: u32,\n    horizontal: u32,\n    inverse: u32,\n};\nstruct PackParams {\n    n: u32,\n    lambda: f32,\n    scale: f32,\n    pad0: u32,\n};\n@group(0) @binding(0) var<uniform> evolparams: EvolParams;\n@group(0) @binding(1) var<storage, read> spec: array<vec4<f32>>;\n@group(0) @binding(2) var<storage, read_write> fftwork: array<vec4<f32>>;\nfn cmul(ar: f32, ai: f32, br: f32, bi: f32) -> vec2<f32> {\n    return vec2<f32>(ar * br - ai * bi, ar * bi + ai * br);\n}\n@compute @workgroup_size(64)\nfn evolve(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let n = evolparams.n;\n    if (gid.x >= n * n) { return; }\n    let i = gid.x % n;\n    let j = gid.x / n;\n    let mirror = ((n - i) % n) + ((n - j) % n) * n;\n    let own = spec[2u * gid.x];\n    let mir = spec[2u * mirror];\n    let kn = spec[2u * gid.x + 1u];\n    let omega = own.z;\n    let kx = own.w;\n    let kz = kn.x;\n    let klen = kn.y;\n    let wt = omega * evolparams.time;\n    let c = cos(wt);\n    let s = sin(wt);\n    let a1 = own.x;\n    let b1 = own.y;\n    let a2 = mir.x;\n    let b2 = mir.y;\n    var hre = a1 * c + b1 * s + a2 * c + b2 * s;\n    var him = b1 * c - a1 * s + a2 * s - b2 * c;\n    var nk = 0.0;\n    if (klen > 0.00001) { nk = 1.0 / klen; }\n    var dxre = him * (kx * nk);\n    var dxim = -hre * (kx * nk);\n    var dzre = him * (kz * nk);\n    var dzim = -hre * (kz * nk);\n    fftwork[2u * gid.x] = vec4<f32>(hre, him, dxre, dxim);\n    fftwork[2u * gid.x + 1u] = vec4<f32>(dzre, dzim, 0.0, 0.0);\n}\n@group(0) @binding(0) var<uniform> bfparams: BfParams;\n@group(0) @binding(1) var<storage, read> bfsrcc: array<vec4<f32>>;\n@group(0) @binding(2) var<storage, read_write> bfdst: array<vec4<f32>>;\nfn jterm(p: BfParams, idx1: u32, idx2: u32) -> u32 {\n    let half = p.span / 2u;\n    if (p.horizontal == 1u) { return idx1 % half; }\n    return (idx1 / p.n) % half;\n}\n@compute @workgroup_size(64)\nfn butterfly(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let n = bfparams.n;\n    let pairs = n * n / 2u;\n    if (gid.x >= pairs) { return; }\n    let span = bfparams.span;\n    let half = span / 2u;\n    var idx1: u32;\n    var idx2: u32;\n    var read1: u32;\n    var read2: u32;\n    if (bfparams.horizontal == 1u) {\n        let block = gid.x / half;\n        let j = gid.x % half;\n        idx1 = block * span + j;\n        idx2 = idx1 + half;\n        read1 = idx1;\n        read2 = idx2;\n        if (span == 2u) {\n            var l2 = 0u;\n            var v = n;\n            while (v > 1u) { l2 = l2 + 1u; v = v >> 1u; }\n            let r = idx1 / n;\n            read1 = r * n + (reverseBits(idx1 % n) >> (32u - l2));\n            read2 = r * n + (reverseBits(idx2 % n) >> (32u - l2));\n        }\n    } else {\n        let col = gid.x / (n / 2u);\n        let pc = gid.x % (n / 2u);\n        let block = pc / half;\n        let j = pc % half;\n        let r1 = block * span + j;\n        idx1 = r1 * n + col;\n        idx2 = (r1 + half) * n + col;\n        read1 = idx1;\n        read2 = idx2;\n        if (span == 2u) {\n            var l2 = 0u;\n            var v = n;\n            while (v > 1u) { l2 = l2 + 1u; v = v >> 1u; }\n            read1 = (reverseBits(idx1 / n) >> (32u - l2)) * n + col;\n            read2 = (reverseBits(idx2 / n) >> (32u - l2)) * n + col;\n        }\n    }\n    let angle = 6.283185307179586 * f32(jterm(bfparams, idx1, idx2)) / f32(span);\n    var tw = vec2<f32>(cos(angle), -sin(angle));\n    if (bfparams.inverse == 1u) { tw.y = sin(angle); }\n    let a = bfsrcc[2u * read1];\n    let a2 = bfsrcc[2u * read1 + 1u];\n    let b = bfsrcc[2u * read2];\n    let b2 = bfsrcc[2u * read2 + 1u];\n    let m0 = cmul(b.x, b.y, tw.x, tw.y);\n    let m1 = cmul(b.z, b.w, tw.x, tw.y);\n    let m2 = cmul(b2.x, b2.y, tw.x, tw.y);\n    let m3 = cmul(b2.z, b2.w, tw.x, tw.y);\n    var o0a = vec4<f32>(a.x + m0.x, a.y + m0.y, a.z + m1.x, a.w + m1.y);\n    var o0b = vec4<f32>(a.x - m0.x, a.y - m0.y, a.z - m1.x, a.w - m1.y);\n    var o1a = vec4<f32>(a2.x + m2.x, a2.y + m2.y, a2.z + m3.x, a2.w + m3.y);\n    var o1b = vec4<f32>(a2.x - m2.x, a2.y - m2.y, a2.z - m3.x, a2.w - m3.y);\n    bfdst[2u * idx1] = o0a;\n    bfdst[2u * idx1 + 1u] = o1a;\n    bfdst[2u * idx2] = o0b;\n    bfdst[2u * idx2 + 1u] = o1b;\n}\n@group(0) @binding(0) var<uniform> packparams: PackParams;\n@group(0) @binding(1) var<storage, read> packsrc: array<vec4<f32>>;\n@group(0) @binding(2) var packdst: texture_storage_2d<rgba32float, write>;\n@compute @workgroup_size(8, 8)\nfn pack(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let n = packparams.n;\n    if (gid.x >= n || gid.y >= n) { return; }\n    let t = gid.x + gid.y * n;\n    let s = packparams.scale;\n    let lambda = packparams.lambda;\n    let v0 = packsrc[2u * t];\n    let v1 = packsrc[2u * t + 1u];\n    textureStore(packdst, vec2<i32>(gid.xy), vec4<f32>(lambda * v0.z * s, v0.x * s, lambda * v1.x * s, 1.0));\n}\n@group(0) @binding(0) var<uniform> oceancam: CameraParams;\n@group(1) @binding(0) var<uniform> oceaninfo: OceanInfo;\n@group(1) @binding(1) var disp: texture_2d<f32>;\nstruct VSOut {\n    @builtin(position) position: vec4<f32>,\n    @location(0) world: vec3<f32>,\n    @location(1) normal: vec3<f32>,\n};\nfn loadCell(i: u32, j: u32) -> vec4<f32> {\n    let n = u32(oceaninfo.origin.w);\n    return textureLoad(disp, vec2<i32>(vec2<u32>(i % n, j % n)), 0);\n}\n@vertex\nfn oceanvs(@builtin(vertex_index) vi: u32) -> VSOut {\n    let g = u32(oceaninfo.grid.x);\n    let cellmesh = oceaninfo.grid.y;\n    let cellspec = oceaninfo.grid.z;\n    let n = u32(oceaninfo.origin.w);\n    let worldsize = oceaninfo.origin.z;\n    let c = vi / 6u;\n    let t = vi % 6u;\n    var di = vec2<u32>(0u, 0u);\n    if (t == 1u || t == 3u || t == 4u) { di.x = 1u; }\n    if (t == 2u || t == 4u || t == 5u) { di.y = 1u; }\n    let i = c % g + di.x;\n    let j = c / g + di.y;\n    let x = oceaninfo.origin.x - worldsize * 0.5 + f32(i) * cellmesh;\n    let z = oceaninfo.origin.y - worldsize * 0.5 + f32(j) * cellmesh;\n    let ti = u32(f32(i) * cellmesh / cellspec);\n    let tj = u32(f32(j) * cellmesh / cellspec);\n    let d = loadCell(ti, tj);\n    var world = vec3<f32>(x + d.x, d.y, z + d.z);\n    let ha = loadCell((ti + 1u) % n, tj).y;\n    let hb = loadCell((ti + n - 1u) % n, tj).y;\n    let hc = loadCell(ti, (tj + 1u) % n).y;\n    let hd = loadCell(ti, (tj + n - 1u) % n).y;\n    var normal = normalize(vec3<f32>(-(ha - hb) / (2.0 * cellspec), 1.0, -(hc - hd) / (2.0 * cellspec)));\n    var out: VSOut;\n    let clip = oceancam.viewproj * vec4<f32>(world, 1.0);\n    out.position = vec4<f32>(clip.xy, clip.z * 0.5 + clip.w * 0.5, clip.w);\n    out.world = world;\n    out.normal = normal;\n    return out;\n}\n@fragment\nfn oceanfs(in: VSOut) -> @location(0) vec4<f32> {\n    let n = normalize(in.normal);\n    let v = normalize(oceancam.campos.xyz - in.world);\n    let l = normalize(oceaninfo.sun.xyz);\n    let h = normalize(v + l);\n    let spec = pow(max(dot(n, h), 0.0), 140.0) * oceaninfo.col1.rgb * 4.0;\n    let fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);\n    var col = mix(oceaninfo.col2.rgb, oceaninfo.col3.rgb, fres);\n    let diffuse = max(dot(n, l), 0.0);\n    col = col * (0.35 + 0.65 * diffuse) + spec;\n    return vec4<f32>(col, 1.0);\n}\n`;

function zasnb(zasna) {
    var zasnb = 0, zasnc = 0;
    for (var zasnd = 0; zasnd < 32; zasnd++) {
        zasnb = zasna();
        zasnc = zasna();
        if (zasnb > 1e-12) break;
    }
    var zasne = Math.sqrt(-2 * Math.log(zasnb));
    return [ zasne * Math.cos(6.283185307179586 * zasnc), zasne * Math.sin(6.283185307179586 * zasnc) ];
}

class FFTOcean {
    constructor(zasna, zasnb) {
        zasnb = zasnb || {};
        if (!zasna || !zasna.device) throw new Error("FFTOcean requires a WebGPURenderer");
        this.renderer = zasna;
        this.device = zasna.device;
        this.disposed = false;
        var zasnc = Math.floor(zasnb.size === undefined ? 64 : zasnb.size);
        if (zasnc < 8 || zasnc > 512 || (zasnc & zasnc - 1) !== 0) throw new Error("FFTOcean size must be a power of two in [8, 512]");
        this.size = zasnc;
        this.worldSize = Math.max(.001, zasnb.worldSize === undefined ? 256 : zasnb.worldSize);
        this.windDirection = zasnb.windDirection === undefined ? Math.PI * .25 : zasnb.windDirection;
        this.windSpeed = Math.max(.01, zasnb.windSpeed === undefined ? 12 : zasnb.windSpeed);
        this.amplitude = Math.max(0, zasnb.amplitude === undefined ? .35 : zasnb.amplitude);
        this.choppiness = Math.min(3, Math.max(0, zasnb.choppiness === undefined ? 1 : zasnb.choppiness));
        this.seed = (zasnb.seed === undefined ? 1 : zasnb.seed) | 0;
        this.smallWaveCutoff = Math.max(.001, zasnb.smallWaveCutoff === undefined ? .3 : zasnb.smallWaveCutoff);
        this.meshGrid = Math.floor(zasnb.meshGrid === undefined ? zasnc : zasnb.meshGrid);
        if (this.meshGrid < 2 || this.meshGrid > 1024) throw new Error("FFTOcean meshGrid must be in [2, 1024]");
        this.depthFormat = zasnb.depthFormat || "depth24plus";
        this.origin = {
            x: zasnb.origin && zasnb.origin.x !== undefined ? zasnb.origin.x : 0,
            z: zasnb.origin && zasnb.origin.z !== undefined ? zasnb.origin.z : 0
        };
        this.sunDirection = zasnb.sunDirection || {
            x: .5,
            y: .8,
            z: .3
        };
        this.sunColor = zasnb.sunColor || {
            r: 1,
            g: .97,
            b: .9
        };
        this.waterColor = zasnb.waterColor || {
            r: .02,
            g: .09,
            b: .16
        };
        this.skyColor = zasnb.skyColor || {
            r: .55,
            g: .7,
            b: .85
        };
        this.gravity = 9.81;
        this.time = 0;
        this.stats = {
            updates: 0,
            fftPasses: 0,
            queries: 0,
            textureBytes: zasnc * zasnc * 16
        };
        this._buildSpectrum();
        this._buildGPU();
        this.update(0);
    }
    _buildSpectrum() {
        var zasna = this.size, zasnc = zasna * zasna;
        var zasnd = this.seed ^ 2654435769 | 0;
        function zasne() {
            zasnd = zasnd + 1831565813 | 0;
            var zasna = zasnd;
            zasna = Math.imul(zasna ^ zasna >>> 15, zasna | 1);
            zasna ^= zasna + Math.imul(zasna ^ zasna >>> 7, zasna | 61);
            return ((zasna ^ zasna >>> 14) >>> 0) / 4294967296;
        }
        var zasnf = this.windSpeed * this.windSpeed / this.gravity;
        var zasng = Math.cos(this.windDirection), zasnh = Math.sin(this.windDirection);
        var zasni = new Float32Array(zasnc), zasnj = new Float32Array(zasnc);
        var zasnk = new Float32Array(zasnc), zasnl = new Float32Array(zasnc), zasnm = new Float32Array(zasnc), zasnn = new Float32Array(zasnc), zasno = new Float32Array(zasnc);
        for (var zasnp = 0; zasnp < zasna; zasnp++) {
            for (var zasnq = 0; zasnq < zasna; zasnq++) {
                var zasnr = zasnp * zasna + zasnq;
                var zasns = zasnq <= zasna / 2 ? zasnq : zasnq - zasna;
                var zasnt = zasnp <= zasna / 2 ? zasnp : zasnp - zasna;
                var zasnu = 2 * Math.PI * zasns / this.worldSize;
                var zasnv = 2 * Math.PI * zasnt / this.worldSize;
                var zasnw = Math.sqrt(zasnu * zasnu + zasnv * zasnv);
                zasnk[zasnr] = zasnu;
                zasnl[zasnr] = zasnv;
                zasnn[zasnr] = zasnw;
                zasnm[zasnr] = Math.sqrt(this.gravity * zasnw);
                if (zasnw < 1e-9) continue;
                var zasnx = zasnu / zasnw, zasny = zasnv / zasnw;
                var zasnz = zasnx * zasng + zasny * zasnh;
                var zasnaa = this.amplitude * Math.exp(-1 / (zasnw * zasnf * zasnw * zasnf)) / (zasnw * zasnw * zasnw * zasnw) * zasnz * zasnz * Math.exp(-zasnw * zasnw * this.smallWaveCutoff * this.smallWaveCutoff);
                zasno[zasnr] = zasnaa > 0 ? zasnaa : 0;
            }
        }
        for (var zasnab = 0; zasnab < zasna; zasnab++) {
            for (var zasnac = 0; zasnac < zasna; zasnac++) {
                var zasnad = zasnab * zasna + zasnac;
                var zasnae = (zasna - zasnab) % zasna * zasna + (zasna - zasnac) % zasna;
                if (zasnn[zasnad] < 1e-9 || zasno[zasnad] <= 0) continue;
                var zasnaf = zasnb(zasne);
                var zasnag = Math.sqrt(zasno[zasnad]) * .7071067811865476;
                if (zasnad < zasnae) {
                    zasni[zasnad] = zasnaf[0] * zasnag;
                    zasnj[zasnad] = zasnaf[1] * zasnag;
                } else if (zasnad === zasnae) {
                    zasni[zasnad] = zasnaf[0] * zasnag;
                    zasnj[zasnad] = 0;
                }
            }
        }
        for (var zasnah = 0; zasnah < zasna; zasnah++) {
            for (var zasnai = 0; zasnai < zasna; zasnai++) {
                var zasnaj = zasnah * zasna + zasnai;
                var zasnak = (zasna - zasnah) % zasna * zasna + (zasna - zasnai) % zasna;
                if (zasnak > zasnaj) {
                    zasni[zasnak] = zasni[zasnaj];
                    zasnj[zasnak] = -zasnj[zasnaj];
                }
            }
        }
        var zasnal = 0;
        for (var zasnam = 0; zasnam < zasnc; zasnam++) zasnal += zasni[zasnam] * zasni[zasnam] + zasnj[zasnam] * zasnj[zasnam];
        if (zasnal > 1e-30) {
            var zasnan = this.amplitude / Math.sqrt(2 * zasnal);
            for (var zasnao = 0; zasnao < zasnc; zasnao++) {
                zasni[zasnao] *= zasnan;
                zasnj[zasnao] *= zasnan;
            }
        }
        var zasnap = new Float32Array(zasnc * 8);
        for (var zasnaq = 0; zasnaq < zasnc; zasnaq++) {
            zasnap[zasnaq * 8] = zasni[zasnaq];
            zasnap[zasnaq * 8 + 1] = zasnj[zasnaq];
            zasnap[zasnaq * 8 + 2] = zasnm[zasnaq];
            zasnap[zasnaq * 8 + 3] = zasnk[zasnaq];
            zasnap[zasnaq * 8 + 4] = zasnl[zasnaq];
            zasnap[zasnaq * 8 + 5] = zasnn[zasnaq];
        }
        this.h0re = zasni;
        this.h0im = zasnj;
        this.kx = zasnk;
        this.kz = zasnl;
        this.omega = zasnm;
        this.klen = zasnn;
        this.fieldOriginX = this.origin.x - this.worldSize * .5;
        this.fieldOriginZ = this.origin.z - this.worldSize * .5;
        this.specdata = zasnap;
    }
    _buildGPU() {
        var zasnb = this.device;
        var zasnc = this.size, zasnd = zasnc * zasnc;
        this.module = zasnb.createShaderModule({
            code: zasna
        });
        this.evolpipeline = zasnb.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.module,
                entryPoint: "evolve"
            }
        });
        var zasne = 2 * Math.round(Math.log2(zasnc));
        this.bflayout = zasnb.createBindGroupLayout({
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
                    type: "read-only-storage"
                }
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            } ]
        });
        this.bfpipeline = zasnb.createComputePipeline({
            layout: zasnb.createPipelineLayout({
                bindGroupLayouts: [ this.bflayout ]
            }),
            compute: {
                module: this.module,
                entryPoint: "butterfly"
            }
        });
        this.packpipeline = zasnb.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.module,
                entryPoint: "pack"
            }
        });
        this.renderpipeline = zasnb.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.module,
                entryPoint: "oceanvs"
            },
            fragment: {
                module: this.module,
                entryPoint: "oceanfs",
                targets: [ {
                    format: this.renderer.format
                } ]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            },
            depthStencil: {
                format: this.depthFormat,
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
        this.specbuffer = zasnb.createBuffer({
            size: zasnd * 32,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        zasnb.queue.writeBuffer(this.specbuffer, 0, this.specdata);
        this.fftA = zasnb.createBuffer({
            size: zasnd * 32,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.fftB = zasnb.createBuffer({
            size: zasnd * 32,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.evoluniform = zasnb.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.bfuniform = zasnb.createBuffer({
            size: 256 * zasne,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        var zasnf = new Uint32Array(64 * zasne);
        var zasng = 0;
        for (var zasnh = 0; zasnh < 2; zasnh++) {
            for (var zasni = 1; zasni <= Math.round(Math.log2(zasnc)); zasni++) {
                var zasnj = zasng * 64;
                zasnf[zasnj] = zasnc;
                zasnf[zasnj + 1] = 1 << zasni;
                zasnf[zasnj + 2] = zasnh === 0 ? 1 : 0;
                zasnf[zasnj + 3] = 1;
                zasng++;
            }
        }
        zasnb.queue.writeBuffer(this.bfuniform, 0, zasnf);
        this.packuniform = zasnb.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.disptexture = zasnb.createTexture({
            size: [ zasnc, zasnc, 1 ],
            format: "rgba32float",
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        });
        this.dispview = this.disptexture.createView();
        this.camerabuffer = zasnb.createBuffer({
            size: 80,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.infolbuffer = zasnb.createBuffer({
            size: 96,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.evolbind = zasnb.createBindGroup({
            layout: this.evolpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.evoluniform
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.specbuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.fftA
                }
            } ]
        });
        this.bfbindAB = zasnb.createBindGroup({
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
                    buffer: this.fftA
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.fftB
                }
            } ]
        });
        this.bfbindBA = zasnb.createBindGroup({
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
                    buffer: this.fftB
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.fftA
                }
            } ]
        });
        this.packbind = zasnb.createBindGroup({
            layout: this.packpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.packuniform
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.fftA
                }
            }, {
                binding: 2,
                resource: this.dispview
            } ]
        });
        this.packbindB = zasnb.createBindGroup({
            layout: this.packpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.packuniform
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.fftB
                }
            }, {
                binding: 2,
                resource: this.dispview
            } ]
        });
        this.renderbind = zasnb.createBindGroup({
            layout: this.renderpipeline.getBindGroupLayout(1),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.infolbuffer
                }
            }, {
                binding: 1,
                resource: this.dispview
            } ]
        });
    }
    _writeInfo() {
        var zasna = new Float32Array(24);
        zasna[0] = this.origin.x;
        zasna[1] = this.origin.z;
        zasna[2] = this.worldSize;
        zasna[3] = this.size;
        zasna[4] = this.meshGrid;
        zasna[5] = this.worldSize / this.meshGrid;
        zasna[6] = this.worldSize / this.size;
        var zasnb = this.sunDirection;
        var zasnc = Math.sqrt(zasnb.x * zasnb.x + zasnb.y * zasnb.y + zasnb.z * zasnb.z) || 1;
        zasna[8] = zasnb.x / zasnc;
        zasna[9] = zasnb.y / zasnc;
        zasna[10] = zasnb.z / zasnc;
        zasna[12] = this.sunColor.r;
        zasna[13] = this.sunColor.g;
        zasna[14] = this.sunColor.b;
        zasna[16] = this.waterColor.r;
        zasna[17] = this.waterColor.g;
        zasna[18] = this.waterColor.b;
        zasna[20] = this.skyColor.r;
        zasna[21] = this.skyColor.g;
        zasna[22] = this.skyColor.b;
        this.device.queue.writeBuffer(this.infolbuffer, 0, zasna);
    }
    update(zasna) {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        this.time = zasna === undefined ? this.time : zasna;
        var zasnb = this.size;
        var zasnc = this.device;
        var zasnd = new ArrayBuffer(16);
        new Uint32Array(zasnd)[1] = zasnb;
        var zasne = new Float32Array(zasnd);
        zasne[0] = this.time;
        zasnc.queue.writeBuffer(this.evoluniform, 0, zasnd);
        var zasnf = new ArrayBuffer(16);
        new Uint32Array(zasnf)[0] = zasnb;
        var zasng = new Float32Array(zasnf);
        zasng[1] = this.choppiness;
        zasng[2] = 1;
        zasnc.queue.writeBuffer(this.packuniform, 0, zasnf);
        var zasnh = zasnc.createCommandEncoder();
        var zasni = zasnh.beginComputePass();
        zasni.setPipeline(this.evolpipeline);
        zasni.setBindGroup(0, this.evolbind);
        zasni.dispatchWorkgroups(Math.ceil(zasnb * zasnb / 64));
        zasni.end();
        var zasnj = true;
        var zasnk = 0;
        var zasnl = Math.round(Math.log2(zasnb));
        for (var zasnm = 0; zasnm < 2; zasnm++) {
            for (var zasnn = 1; zasnn <= zasnl; zasnn++) {
                var zasno = zasnh.beginComputePass();
                zasno.setPipeline(this.bfpipeline);
                zasno.setBindGroup(0, zasnj ? this.bfbindAB : this.bfbindBA, [ zasnk * 256 ]);
                zasno.dispatchWorkgroups(Math.ceil(zasnb * zasnb / 2 / 64));
                zasno.end();
                zasnj = !zasnj;
                zasnk++;
                this.stats.fftPasses++;
            }
        }
        var zasnp = zasnj;
        var zasnq = zasnh.beginComputePass();
        zasnq.setPipeline(this.packpipeline);
        zasnq.setBindGroup(0, zasnp ? this.packbind : this.packbindB);
        zasnq.dispatchWorkgroups(Math.ceil(zasnb / 8), Math.ceil(zasnb / 8));
        zasnq.end();
        zasnc.queue.submit([ zasnh.finish() ]);
        this.stats.updates++;
        this._writeInfo();
        return this;
    }
    _evalField(zasna, zasnb, zasnc) {
        var zasnd = 0, zasne = 0, zasnf = 0, zasng = 0, zasnh = 0, zasni = 0, zasnj = 0, zasnk = 0;
        var zasnl = this.kx, zasnm = this.kz, zasnn = this.omega, zasno = this.klen, zasnp = this.h0re, zasnq = this.h0im;
        var zasnr = this.size * this.size;
        var zasns = zasna - this.fieldOriginX, zasnt = zasnb - this.fieldOriginZ;
        for (var zasnu = 0; zasnu < zasnr; zasnu++) {
            var zasnv = zasno[zasnu];
            if (zasnv < 1e-9) continue;
            var zasnw = zasnl[zasnu] * zasns + zasnm[zasnu] * zasnt - zasnn[zasnu] * zasnc;
            var zasnx = Math.cos(zasnw), zasny = Math.sin(zasnw);
            var zasnz = zasnp[zasnu] * zasnx - zasnq[zasnu] * zasny;
            var zasnaa = zasnp[zasnu] * zasny + zasnq[zasnu] * zasnx;
            zasnd += 2 * zasnz;
            zasne += -2 * zasnl[zasnu] * zasnaa;
            zasnf += -2 * zasnm[zasnu] * zasnaa;
            zasng += 2 * zasnn[zasnu] * zasnaa;
            var zasnab = zasnl[zasnu] / zasnv, zasnac = zasnm[zasnu] / zasnv;
            zasnh += 2 * zasnab * (zasnq[zasnu] * zasnx + zasnp[zasnu] * zasny);
            zasni += 2 * zasnac * (zasnq[zasnu] * zasnx + zasnp[zasnu] * zasny);
            zasnj += 2 * zasnn[zasnu] * zasnab * (zasnq[zasnu] * zasny - zasnp[zasnu] * zasnx);
            zasnk += 2 * zasnn[zasnu] * zasnac * (zasnq[zasnu] * zasny - zasnp[zasnu] * zasnx);
        }
        return {
            h: zasnd,
            dhdx: zasne,
            dhdz: zasnf,
            dhdt: zasng,
            dx: zasnh,
            dz: zasni,
            dvx: zasnj,
            dvz: zasnk
        };
    }
    heightAt(zasna, zasnb, zasnc) {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        var zasnd = zasnc === undefined ? this.time : zasnc;
        this.stats.queries++;
        var zasne = zasna, zasnf = zasnb;
        var zasng = null;
        var zasnh = this.choppiness > 0 ? 2 : 1;
        for (var zasni = 0; zasni < zasnh; zasni++) {
            zasng = this._evalField(zasne, zasnf, zasnd);
            zasne = zasna - this.choppiness * zasng.dx;
            zasnf = zasnb - this.choppiness * zasng.dz;
        }
        return zasng.h;
    }
    normalAt(zasna, zasnb, zasnc) {
        var zasnd = zasnc === undefined ? this.time : zasnc;
        this.stats.queries++;
        var zasne = this._evalField(zasna, zasnb, zasnd);
        var zasnf = -zasne.dhdx, zasng = 1, zasnh = -zasne.dhdz;
        var zasni = Math.sqrt(zasnf * zasnf + zasng * zasng + zasnh * zasnh) || 1;
        return {
            x: zasnf / zasni,
            y: zasng / zasni,
            z: zasnh / zasni
        };
    }
    velocityAt(zasna, zasnb, zasnc) {
        var zasnd = zasnc === undefined ? this.time : zasnc;
        this.stats.queries++;
        var zasne = this._evalField(zasna, zasnb, zasnd);
        return {
            x: this.choppiness * zasne.dvx,
            y: zasne.dhdt,
            z: this.choppiness * zasne.dvz
        };
    }
    async readDisplacement() {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        var zasna = this.size;
        var zasnb = Math.ceil(zasna * 16 / 256) * 256;
        var zasnc = this.device.createBuffer({
            size: zasnb * zasna,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        var zasnd = this.device.createCommandEncoder();
        zasnd.copyTextureToBuffer({
            texture: this.disptexture
        }, {
            buffer: zasnc,
            bytesPerRow: zasnb,
            rowsPerImage: zasna
        }, [ zasna, zasna, 1 ]);
        this.device.queue.submit([ zasnd.finish() ]);
        await zasnc.mapAsync(GPUMapMode.READ);
        var zasne = new Uint8Array(zasnc.getMappedRange());
        var zasnf = new Float32Array(zasna * zasna * 4);
        for (var zasng = 0; zasng < zasna; zasng++) {
            for (var zasnh = 0; zasnh < zasna; zasnh++) {
                var zasni = zasng * zasnb + zasnh * 16;
                var zasnj = (zasng * zasna + zasnh) * 4;
                zasnf[zasnj] = new DataView(zasne.buffer).getFloat32(zasni, true);
                zasnf[zasnj + 1] = new DataView(zasne.buffer).getFloat32(zasni + 4, true);
                zasnf[zasnj + 2] = new DataView(zasne.buffer).getFloat32(zasni + 8, true);
                zasnf[zasnj + 3] = new DataView(zasne.buffer).getFloat32(zasni + 12, true);
            }
        }
        zasnc.unmap();
        zasnc.destroy();
        return zasnf;
    }
    async fft2d(zasna) {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        var zasnb = this.size, zasnc = zasnb * zasnb;
        if (!(zasna instanceof Float32Array) || zasna.length !== zasnc * 2) throw new Error("fft2d expects Float32Array of size^2 complex pairs");
        var zasnd = new Float32Array(zasnc * 8);
        for (var zasne = 0; zasne < zasnc; zasne++) {
            zasnd[zasne * 8] = zasna[zasne * 2];
            zasnd[zasne * 8 + 1] = zasna[zasne * 2 + 1];
        }
        var zasnf = this.device;
        zasnf.queue.writeBuffer(this.fftA, 0, zasnd);
        var zasng = zasnf.createCommandEncoder();
        var zasnh = true;
        var zasni = 0;
        var zasnj = Math.round(Math.log2(zasnb));
        for (var zasnk = 0; zasnk < 2; zasnk++) {
            for (var zasnl = 1; zasnl <= zasnj; zasnl++) {
                var zasnm = zasng.beginComputePass();
                zasnm.setPipeline(this.bfpipeline);
                zasnm.setBindGroup(0, zasnh ? this.bfbindAB : this.bfbindBA, [ zasni * 256 ]);
                zasnm.dispatchWorkgroups(Math.ceil(zasnb * zasnb / 2 / 64));
                zasnm.end();
                zasnh = !zasnh;
                zasni++;
            }
        }
        var zasnn = zasnh ? this.fftA : this.fftB;
        zasng.copyBufferToBuffer(zasnn, 0, this.fftread || (this.fftread = zasnf.createBuffer({
            size: zasnc * 32,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        })), 0, zasnc * 32);
        zasnf.queue.submit([ zasng.finish() ]);
        await this.fftread.mapAsync(GPUMapMode.READ);
        var zasno = new Float32Array(this.fftread.getMappedRange().slice(0));
        this.fftread.unmap();
        var zasnp = new Float32Array(zasnc * 2);
        for (var zasnq = 0; zasnq < zasnc; zasnq++) {
            zasnp[zasnq * 2] = zasno[zasnq * 8];
            zasnp[zasnq * 2 + 1] = zasno[zasnq * 8 + 1];
        }
        return zasnp;
    }
    render(zasna, zasnb, zasnc) {
        if (this.disposed) throw new Error("FFTOcean is disposed");
        if (!zasna) throw new Error("render requires a color texture or view");
        if (zasna.createView) zasna = zasna.createView();
        if (!zasnb) throw new Error("render requires a depth texture or view");
        if (zasnb.createView) zasnb = zasnb.createView();
        if (!zasnc || !zasnc.projectionMatrix || !zasnc.matrixWorldInverse) throw new Error("render requires a camera");
        var zasnd = (new Matrix4).multiplyMatrices(zasnc.projectionMatrix, zasnc.matrixWorldInverse);
        var zasne = new Float32Array(20);
        for (var zasnf = 0; zasnf < 16; zasnf++) zasne[zasnf] = zasnd.elements[zasnf];
        zasne[16] = zasnc.position.x;
        zasne[17] = zasnc.position.y;
        zasne[18] = zasnc.position.z;
        zasne[19] = 1;
        this.device.queue.writeBuffer(this.camerabuffer, 0, zasne);
        var zasng = this.device.createCommandEncoder();
        var zasnh = zasng.beginRenderPass({
            colorAttachments: [ {
                view: zasna,
                loadOp: "load",
                storeOp: "store"
            } ],
            depthStencilAttachment: {
                view: zasnb,
                depthLoadOp: "load",
                depthStoreOp: "store"
            }
        });
        zasnh.setPipeline(this.renderpipeline);
        if (!this.rendercamerabind) this.rendercamerabind = this.device.createBindGroup({
            layout: this.renderpipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.camerabuffer
                }
            } ]
        });
        zasnh.setBindGroup(0, this.rendercamerabind);
        zasnh.setBindGroup(1, this.renderbind);
        zasnh.draw(this.meshGrid * this.meshGrid * 6, 1, 0, 0);
        zasnh.end();
        this.device.queue.submit([ zasng.finish() ]);
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
