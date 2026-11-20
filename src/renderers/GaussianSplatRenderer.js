class GaussianSplatRenderer {
    constructor(zatfa, zatfb) {
        zatfb = zatfb || {};
        if (!zatfa || !zatfa.device) throw new Error("GaussianSplatRenderer requires a WebGPU renderer");
        this.renderer = zatfa;
        this.device = zatfa.device;
        this.width = Math.max(1, Math.floor(zatfb.width === undefined ? 192 : zatfb.width));
        this.height = Math.max(1, Math.floor(zatfb.height === undefined ? 192 : zatfb.height));
        this.cutoff = 3;
        this.dilation = .3;
        this.count = 0;
        this.padded = 2;
        this.stageStaging = null;
        this.sortStageCount = 0;
        this.shDegree = 0;
        this.stats = {
            frames: 0,
            splats: 0,
            sortPasses: 0
        };
        this._disposed = false;
        this._buildTargets();
        this._buildPipelines();
        if (zatfb.splats) this.setSplats(zatfb.splats);
    }
    _buildTargets() {
        this.composite = this.device.createTexture({
            size: [ this.width, this.height, 1 ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
        });
        this.compositeView = this.composite.createView();
        this.dummyDepth = this.device.createTexture({
            size: [ 1, 1, 1 ],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.dummyDepthView = this.dummyDepth.createView();
        this.cameraBuffer = this.device.createBuffer({
            size: 192,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.sortParamsBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.stageBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.dummySh = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
    }
    splatCode() {
        return [ "struct Camera { view: mat4x4<f32>, proj: mat4x4<f32>, cameraPosition: vec4<f32>, focal: vec4<f32>, viewport: vec4<f32> };", "@group(0) @binding(0) var<uniform> camera: Camera;", "@group(0) @binding(1) var<storage, read> positions: array<f32>;", "@group(0) @binding(2) var<storage, read> scalesArr: array<f32>;", "@group(0) @binding(3) var<storage, read> rotationsArr: array<f32>;", "@group(0) @binding(4) var<storage, read> colorsArr: array<f32>;", "@group(0) @binding(5) var<storage, read> shArr: array<f32>;", "@group(0) @binding(6) var<storage, read> orderArr: array<u32>;", "@group(0) @binding(7) var sceneDepth: texture_depth_2d;", "struct VOut { @builtin(position) position: vec4<f32>, @location(0) color: vec3<f32>, @location(1) alpha: f32, @location(2) conic: vec3<f32>, @location(3) centerPx: vec2<f32>, @location(4) depth01: f32 };", "fn quatMatrix(q: vec4<f32>) -> mat3x3<f32> { let x = q.x; let y = q.y; let z = q.z; let w = q.w; return mat3x3<f32>(1.0 - 2.0 * (y * y + z * z), 2.0 * (x * y + w * z), 2.0 * (x * z - w * y), 2.0 * (x * y - w * z), 1.0 - 2.0 * (x * x + z * z), 2.0 * (y * z + w * x), 2.0 * (x * z + w * y), 2.0 * (y * z - w * x), 1.0 - 2.0 * (x * x + y * y)); }", "fn sh3(i: u32) -> vec3<f32> { return vec3<f32>(shArr[i], shArr[i + 1u], shArr[i + 2u]); }", "fn evalSh(base: u32, dim: u32, dir: vec3<f32>) -> vec3<f32> {", "  var result = vec3<f32>(0.0);", "  let x = dir.x; let y = dir.y; let z = dir.z;", "  let xx = x * x; let yy = y * y; let zz = z * z; let xy = x * y; let yz = y * z; let xz = x * z;", "  if (dim > 0u) { let c1 = 0.4886025119029199; result = result - c1 * y * sh3(base) + c1 * z * sh3(base + 3u) - c1 * x * sh3(base + 6u); }", "  if (dim > 3u) { result = result + 1.0925484305920792 * xy * sh3(base + 9u) - 1.0925484305920792 * yz * sh3(base + 12u) + 0.31539156525252005 * (2.0 * zz - xx - yy) * sh3(base + 15u) - 1.0925484305920792 * xz * sh3(base + 18u) + 0.5462742152960396 * (xx - yy) * sh3(base + 21u); }", "  if (dim > 8u) { result = result - 0.5900435899266435 * y * (3.0 * xx - yy) * sh3(base + 24u) + 2.890611442640554 * xy * z * sh3(base + 27u) - 0.4570457994644658 * y * (4.0 * zz - xx - yy) * sh3(base + 30u) + 0.3731763325901154 * z * (2.0 * zz - 3.0 * xx - 3.0 * yy) * sh3(base + 33u) - 0.4570457994644658 * x * (4.0 * zz - xx - yy) * sh3(base + 36u) + 1.445305721320277 * z * (xx - yy) * sh3(base + 39u) - 0.5900435899266435 * x * (xx - 3.0 * yy) * sh3(base + 42u); }", "  return result;", "}", "@vertex fn vsMain(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {", "  var output: VOut;", "  let cx = select(-1.0, 1.0, (vi & 1u) == 1u);", "  let cy = select(-1.0, 1.0, (vi & 2u) == 2u);", "  let idx = orderArr[ii];", "  let p = vec3<f32>(positions[idx * 3u], positions[idx * 3u + 1u], positions[idx * 3u + 2u]);", "  let sc = vec3<f32>(scalesArr[idx * 3u], scalesArr[idx * 3u + 1u], scalesArr[idx * 3u + 2u]);", "  let q = normalize(vec4<f32>(rotationsArr[idx * 4u], rotationsArr[idx * 4u + 1u], rotationsArr[idx * 4u + 2u], rotationsArr[idx * 4u + 3u]));", "  let col = vec4<f32>(colorsArr[idx * 4u], colorsArr[idx * 4u + 1u], colorsArr[idx * 4u + 2u], colorsArr[idx * 4u + 3u]);", "  let W = f32(camera.viewport.x); let H = f32(camera.viewport.y);", "  let fx = camera.focal.x; let fy = camera.focal.y; let tfx = camera.focal.z; let tfy = camera.focal.w;", "  let t4 = camera.view * vec4<f32>(p, 1.0);", "  if (t4.z > -0.0001) { output.position = vec4<f32>(2.0, 2.0, 0.5, 1.0); output.color = vec3<f32>(0.0); output.alpha = 0.0; output.conic = vec3<f32>(1.0, 0.0, 1.0); output.centerPx = vec2<f32>(0.0); output.depth01 = 1.0; return output; }", "  let clip = camera.proj * t4;", "  let cw = clip.w;", "  let ndc = clip.xyz / cw;", "  let R = quatMatrix(q);", "  let M = mat3x3<f32>(R[0] * sc.x, R[1] * sc.y, R[2] * sc.z);", "  let r0 = vec3<f32>(M[0].x, M[1].x, M[2].x);", "  let r1 = vec3<f32>(M[0].y, M[1].y, M[2].y);", "  let r2 = vec3<f32>(M[0].z, M[1].z, M[2].z);", "  let sigma = mat3x3<f32>(dot(r0, r0), dot(r1, r0), dot(r2, r0), dot(r0, r1), dot(r1, r1), dot(r2, r1), dot(r0, r2), dot(r1, r2), dot(r2, r2));", "  let limx = 1.3 * tfx; let limy = 1.3 * tfy;", "  let tx = clamp(t4.x / t4.z, -limx, limx) * t4.z;", "  let ty = clamp(t4.y / t4.z, -limy, limy) * t4.z;", "  let j00 = fx / t4.z; let j02 = -(fx * tx) / (t4.z * t4.z);", "  let j11 = fy / t4.z; let j12 = -(fy * ty) / (t4.z * t4.z);", "  let wv0 = vec3<f32>(camera.view[0].x, camera.view[1].x, camera.view[2].x);", "  let wv1 = vec3<f32>(camera.view[0].y, camera.view[1].y, camera.view[2].y);", "  let wv2 = vec3<f32>(camera.view[0].z, camera.view[1].z, camera.view[2].z);", "  let a0 = j00 * wv0 + j02 * wv2;", "  let a1 = j11 * wv1 + j12 * wv2;", "  let s0 = sigma * a0;", "  let s1 = sigma * a1;", "  let cva = dot(a0, s0) + 0.3;", "  let cvb = dot(a0, s1);", "  let cvc = dot(a1, s1) + 0.3;", "  let det = cva * cvc - cvb * cvb;", "  if (det <= 0.0) { output.position = vec4<f32>(2.0, 2.0, 0.5, 1.0); output.color = vec3<f32>(0.0); output.alpha = 0.0; output.conic = vec3<f32>(1.0, 0.0, 1.0); output.centerPx = vec2<f32>(0.0); output.depth01 = 1.0; return output; }", "  let mid = 0.5 * (cva + cvc);", "  let rad = sqrt(max(0.1, mid * mid - det));", "  let l1 = mid + rad; let l2 = mid - rad;", "  var e1 = vec2<f32>(cvb, l1 - cva);", "  e1 = select(normalize(e1), vec2<f32>(1.0, 0.0), abs(e1.x) < 0.000000001 && abs(e1.y) < 0.000000001);", "  let e2 = vec2<f32>(-e1.y, e1.x);", "  let ext1 = 3.0 * sqrt(max(l1, 0.0));", "  let ext2 = 3.0 * sqrt(max(l2, 0.0));", "  let cpx = (ndc.x * 0.5 + 0.5) * W;", "  let cpy = (0.5 - ndc.y * 0.5) * H;", "  let offPx = vec2<f32>(cx * ext1 * e1.x + cy * ext2 * e2.x, cx * ext1 * e1.y + cy * ext2 * e2.y);", "  let ndcX = ndc.x + offPx.x * 2.0 / W;", "  let ndcY = ndc.y - offPx.y * 2.0 / H;", "  let zGl = clip.z / cw;", "  output.position = vec4<f32>(ndcX * cw, ndcY * cw, zGl * 0.5 * cw + 0.5 * cw, cw);", "  output.centerPx = vec2<f32>(cpx, cpy);", "  output.conic = vec3<f32>(cvc, -cvb, cva) / det;", "  output.depth01 = zGl * 0.5 + 0.5;", "  output.alpha = col.a;", "  var rgb = col.rgb;", "  let degree = u32(max(camera.viewport.w, 0.0));", "  if (degree > 0u) {", "    let dim = degree * degree + 2u * degree;", "    let dir = normalize(p - camera.cameraPosition.xyz);", "    rgb = rgb + evalSh(idx * dim * 3u, dim, dir);", "  }", "  output.color = rgb;", "  return output;", "}", "@fragment fn fsMain(input: VOut) -> @location(0) vec4<f32> {", "  let d = input.position.xy - input.centerPx;", "  let power = -0.5 * (input.conic.x * d.x * d.x + 2.0 * input.conic.y * d.x * d.y + input.conic.z * d.y * d.y);", "  if (power > 0.0) { discard; }", "  var alpha = input.alpha * exp(power);", "  if (alpha < 0.00392156862745098) { discard; }", "  if (camera.viewport.z > 0.5) {", "    let pix = vec2<i32>(clamp(input.position.xy, vec2<f32>(0.5), vec2<f32>(camera.viewport.xy) - vec2<f32>(0.5)));", "    let sd = textureLoad(sceneDepth, pix, 0);", "    if (input.depth01 > sd) { discard; }", "  }", "  return vec4<f32>(clamp(input.color, vec3<f32>(0.0), vec3<f32>(1.0)), alpha);", "}" ].join("\n");
    }
    sortCode() {
        return [ "struct SortParams { count: u32, padded: u32, pad0: u32, pad1: u32 };", "struct Camera { view: mat4x4<f32> };", "@group(0) @binding(0) var<storage, read> positions: array<f32>;", "@group(0) @binding(1) var<storage, read_write> keys: array<f32>;", "@group(0) @binding(2) var<storage, read_write> order: array<u32>;", "@group(0) @binding(3) var<uniform> params: SortParams;", "@group(0) @binding(4) var<uniform> camera: Camera;", "@compute @workgroup_size(64)", "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {", "  let i = gid.x;", "  if (i >= params.padded) { return; }", "  if (i >= params.count) { keys[i] = 1e30; order[i] = i; return; }", "  let p = vec3<f32>(positions[i * 3u], positions[i * 3u + 1u], positions[i * 3u + 2u]);", "  let t = camera.view * vec4<f32>(p, 1.0);", "  keys[i] = t.z;", "  order[i] = i;", "}" ].join("\n");
    }
    bitonicCode() {
        return [ "struct Stage { k: u32, j: u32, padded: u32, pad0: u32 };", "@group(0) @binding(0) var<storage, read_write> keys: array<f32>;", "@group(0) @binding(1) var<storage, read_write> order: array<u32>;", "@group(0) @binding(2) var<uniform> stage: Stage;", "@compute @workgroup_size(64)", "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {", "  let i = gid.x;", "  if (i >= stage.padded) { return; }", "  let x = i ^ stage.j;", "  if (x <= i || x >= stage.padded) { return; }", "  let ascending = (i & stage.k) == 0u;", "  let a = keys[i]; let b = keys[x];", "  let bad = select((a < b), (a > b), ascending);", "  if (bad) {", "    keys[i] = b; keys[x] = a;", "    let oi = order[i]; order[i] = order[x]; order[x] = oi;", "  }", "}" ].join("\n");
    }
    blitCode() {
        return [ "@group(0) @binding(0) var srcTex: texture_2d<f32>;", "@vertex fn blitVs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4<f32> { let x = f32((vi << 1u) & 2u); let y = f32(vi & 2u); return vec4<f32>(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0); }", "@fragment fn blitFs(@builtin(position) frag: vec4<f32>) -> @location(0) vec4<f32> { let pix = vec2<i32>(frag.xy); return textureLoad(srcTex, pix, 0); }" ].join("\n");
    }
    _buildPipelines() {
        var zatfa = this.device;
        this.splatModule = zatfa.createShaderModule({
            code: this.splatCode()
        });
        this.sortModule = zatfa.createShaderModule({
            code: this.sortCode()
        });
        this.bitonicModule = zatfa.createShaderModule({
            code: this.bitonicCode()
        });
        this.blitModule = zatfa.createShaderModule({
            code: this.blitCode()
        });
        this.sortPipeline = zatfa.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.sortModule,
                entryPoint: "main"
            }
        });
        this.bitonicPipeline = zatfa.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.bitonicModule,
                entryPoint: "main"
            }
        });
        this.blitPipeline = zatfa.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.blitModule,
                entryPoint: "blitVs"
            },
            fragment: {
                module: this.blitModule,
                entryPoint: "blitFs",
                targets: [ {
                    format: "rgba8unorm"
                } ]
            },
            primitive: {
                topology: "triangle-list"
            }
        });
        this.splatPipeline = zatfa.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.splatModule,
                entryPoint: "vsMain"
            },
            fragment: {
                module: this.splatModule,
                entryPoint: "fsMain",
                targets: [ {
                    format: "rgba8unorm",
                    blend: {
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
                    }
                } ]
            },
            primitive: {
                topology: "triangle-strip"
            }
        });
    }
    _validateSplats(zatfa) {
        if (!zatfa || typeof zatfa !== "object") throw new Error("GaussianSplatRenderer requires splat data");
        var zatfb = zatfa.count;
        if (!Number.isInteger(zatfb) || zatfb <= 0) throw new Error("GaussianSplatRenderer requires a positive integer splat count");
        if (!(zatfa.positions instanceof Float32Array) || zatfa.positions.length !== zatfb * 3) throw new Error("splat positions must be a Float32Array of length count * 3");
        if (!(zatfa.scales instanceof Float32Array) || zatfa.scales.length !== zatfb * 3) throw new Error("splat scales must be a Float32Array of length count * 3");
        if (!(zatfa.rotations instanceof Float32Array) || zatfa.rotations.length !== zatfb * 4) throw new Error("splat rotations must be a Float32Array of length count * 4");
        if (!(zatfa.colors instanceof Float32Array) || zatfa.colors.length !== zatfb * 4) throw new Error("splat colors must be a Float32Array of length count * 4");
        var zatfc = 0, zatfd = null;
        if (zatfa.sh !== null && zatfa.sh !== undefined) {
            if (!zatfa.sh || typeof zatfa.sh !== "object") throw new Error("splat sh must be null or { degree, coefficients }");
            zatfc = zatfa.sh.degree;
            if (!Number.isInteger(zatfc) || zatfc < 0 || zatfc > 3) throw new Error("splat sh degree must be between 0 and 3");
            if (zatfc > 0) {
                if (!(zatfa.sh.coefficients instanceof Float32Array)) throw new Error("splat sh coefficients must be a Float32Array");
                var zatfe = zatfc * zatfc + 2 * zatfc;
                if (zatfa.sh.coefficients.length !== zatfb * zatfe * 3) throw new Error("splat sh coefficients must have length count * dim(degree) * 3");
                zatfd = zatfa.sh.coefficients;
            }
        }
        var zatff = zatfa.rotations;
        for (var zatfg = 0; zatfg < zatfb; zatfg++) {
            var zatfh = zatff[zatfg * 4], zatfi = zatff[zatfg * 4 + 1], zatfj = zatff[zatfg * 4 + 2], zatfk = zatff[zatfg * 4 + 3];
            var zatfl = Math.sqrt(zatfh * zatfh + zatfi * zatfi + zatfj * zatfj + zatfk * zatfk);
            if (!(zatfl > 1e-6) || !isFinite(zatfl)) throw new Error("splat rotation quaternions must be non-zero");
        }
        return {
            count: zatfb,
            degree: zatfc,
            coefficients: zatfd
        };
    }
    setSplats(zatfa) {
        var zatfb = this._validateSplats(zatfa);
        var zatfc = this.device;
        this.count = zatfb.count;
        this.shDegree = zatfb.degree;
        this.stats.splats = zatfb.count;
        var zatfd = 2;
        while (zatfd < this.count) zatfd *= 2;
        this.padded = zatfd;
        var zatfe = [];
        var zatff = 2;
        while (zatff <= zatfd) {
            var zatfg = zatff >> 1;
            while (zatfg > 0) {
                zatfe.push(zatff, zatfg, zatfd, 0);
                zatfg >>= 1;
            }
            zatff *= 2;
        }
        this.sortStageCount = zatfe.length / 4;
        if (this.stageStaging) this.stageStaging.destroy();
        this.stageStaging = zatfc.createBuffer({
            size: Math.max(16, zatfe.length * 4),
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        zatfc.queue.writeBuffer(this.stageStaging, 0, new Uint32Array(zatfe));
        if (this.positionsBuffer) this.positionsBuffer.destroy();
        if (this.scalesBuffer) this.scalesBuffer.destroy();
        if (this.rotationsBuffer) this.rotationsBuffer.destroy();
        if (this.colorsBuffer) this.colorsBuffer.destroy();
        if (this.shBuffer && this.shBuffer !== this.dummySh) this.shBuffer.destroy();
        if (this.keysBuffer) this.keysBuffer.destroy();
        if (this.orderBuffer) this.orderBuffer.destroy();
        this.positionsBuffer = zatfc.createBuffer({
            size: Math.max(16, zatfa.positions.byteLength),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.scalesBuffer = zatfc.createBuffer({
            size: Math.max(16, zatfa.scales.byteLength),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.rotationsBuffer = zatfc.createBuffer({
            size: Math.max(16, zatfa.rotations.byteLength),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.colorsBuffer = zatfc.createBuffer({
            size: Math.max(16, zatfa.colors.byteLength),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        if (zatfb.coefficients) {
            this.shBuffer = zatfc.createBuffer({
                size: zatfb.coefficients.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            zatfc.queue.writeBuffer(this.shBuffer, 0, zatfb.coefficients);
        } else {
            this.shBuffer = this.dummySh;
        }
        this.keysBuffer = zatfc.createBuffer({
            size: zatfd * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.orderBuffer = zatfc.createBuffer({
            size: zatfd * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        zatfc.queue.writeBuffer(this.positionsBuffer, 0, zatfa.positions);
        zatfc.queue.writeBuffer(this.scalesBuffer, 0, zatfa.scales);
        zatfc.queue.writeBuffer(this.rotationsBuffer, 0, zatfa.rotations);
        zatfc.queue.writeBuffer(this.colorsBuffer, 0, zatfa.colors);
        this.sortBindGroup = zatfc.createBindGroup({
            layout: this.sortPipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.positionsBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.keysBuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.orderBuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.sortParamsBuffer
                }
            }, {
                binding: 4,
                resource: {
                    buffer: this.cameraBuffer
                }
            } ]
        });
        this.bitonicBindGroup = zatfc.createBindGroup({
            layout: this.bitonicPipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.keysBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.orderBuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.stageBuffer
                }
            } ]
        });
        this.renderBindGroup = zatfc.createBindGroup({
            layout: this.splatPipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.cameraBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.positionsBuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.scalesBuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.rotationsBuffer
                }
            }, {
                binding: 4,
                resource: {
                    buffer: this.colorsBuffer
                }
            }, {
                binding: 5,
                resource: {
                    buffer: this.shBuffer
                }
            }, {
                binding: 6,
                resource: {
                    buffer: this.orderBuffer
                }
            }, {
                binding: 7,
                resource: this.dummyDepthView
            } ]
        });
        return this;
    }
    _cameraUniforms(zatfa, zatfb) {
        var zatfc = new Float32Array(48);
        for (var zatfd = 0; zatfd < 16; zatfd++) {
            zatfc[zatfd] = Math.fround(zatfa.matrixWorldInverse.elements[zatfd]);
            zatfc[16 + zatfd] = Math.fround(zatfa.projectionMatrix.elements[zatfd]);
        }
        var zatfe = zatfc[16], zatff = zatfc[21];
        zatfc[32] = Math.fround(zatfa.position.x);
        zatfc[33] = Math.fround(zatfa.position.y);
        zatfc[34] = Math.fround(zatfa.position.z);
        zatfc[35] = 0;
        zatfc[36] = Math.fround(.5 * this.width * zatfe);
        zatfc[37] = Math.fround(.5 * this.height * zatff);
        zatfc[38] = Math.fround(1 / zatfe);
        zatfc[39] = Math.fround(1 / zatff);
        zatfc[40] = this.width;
        zatfc[41] = this.height;
        zatfc[42] = zatfb ? 1 : 0;
        zatfc[43] = this.shDegree;
        return zatfc;
    }
    render(zatfa, zatfb, zatfc) {
        if (this._disposed) throw new Error("GaussianSplatRenderer is disposed");
        if (!zatfa || !zatfa.createView) throw new Error("render requires an input color texture");
        if (!zatfc || !zatfc.projectionMatrix || !zatfc.matrixWorldInverse) throw new Error("render requires a camera");
        if (this.count === 0) throw new Error("render requires splat data; call setSplats first");
        var zatfd = !!(zatfb && zatfb.createView);
        var zatfe = this.device;
        var zatff = this._cameraUniforms(zatfc, zatfd);
        zatfe.queue.writeBuffer(this.cameraBuffer, 0, zatff);
        zatfe.queue.writeBuffer(this.sortParamsBuffer, 0, new Uint32Array([ this.count, this.padded, 0, 0 ]));
        var zatfg = zatfe.createBindGroup({
            layout: this.blitPipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: zatfa.createView()
            } ]
        });
        var zatfh = zatfd ? this._depthBindGroup(zatfb) : this.renderBindGroup;
        var zatfi = zatfe.createCommandEncoder();
        var zatfj = zatfi.beginComputePass();
        zatfj.setPipeline(this.sortPipeline);
        zatfj.setBindGroup(0, this.sortBindGroup);
        zatfj.dispatchWorkgroups(Math.ceil(this.padded / 64));
        zatfj.end();
        var zatfk = 2, zatfl = 0;
        while (zatfk <= this.padded) {
            var zatfm = zatfk >> 1;
            while (zatfm > 0) {
                zatfi.copyBufferToBuffer(this.stageStaging, zatfl * 16, this.stageBuffer, 0, 16);
                var zatfn = zatfi.beginComputePass();
                zatfn.setPipeline(this.bitonicPipeline);
                zatfn.setBindGroup(0, this.bitonicBindGroup);
                zatfn.dispatchWorkgroups(Math.ceil(this.padded / 64));
                zatfn.end();
                zatfl++;
                zatfm >>= 1;
            }
            zatfk *= 2;
        }
        this.stats.sortPasses += zatfl;
        var zatfo = zatfi.beginRenderPass({
            colorAttachments: [ {
                view: this.compositeView,
                clearValue: {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 1
                },
                loadOp: "clear",
                storeOp: "store"
            } ]
        });
        zatfo.setPipeline(this.blitPipeline);
        zatfo.setBindGroup(0, zatfg);
        zatfo.draw(3, 1, 0, 0);
        zatfo.setPipeline(this.splatPipeline);
        zatfo.setBindGroup(0, zatfh);
        zatfo.draw(4, this.count, 0, 0);
        zatfo.end();
        zatfe.queue.submit([ zatfi.finish() ]);
        this.stats.frames++;
        return this.compositeView;
    }
    _depthBindGroup(zatfa) {
        return this.device.createBindGroup({
            layout: this.splatPipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.cameraBuffer
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.positionsBuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.scalesBuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.rotationsBuffer
                }
            }, {
                binding: 4,
                resource: {
                    buffer: this.colorsBuffer
                }
            }, {
                binding: 5,
                resource: {
                    buffer: this.shBuffer
                }
            }, {
                binding: 6,
                resource: {
                    buffer: this.orderBuffer
                }
            }, {
                binding: 7,
                resource: zatfa.createView()
            } ]
        });
    }
    readPixels() {
        var zatfa = this.device;
        var zatfb = Math.max(256, Math.ceil(this.width * 4 / 256) * 256);
        var zatfc = zatfb * this.height;
        var zatfd = zatfa.createBuffer({
            size: zatfc,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        var zatfe = zatfa.createCommandEncoder();
        zatfe.copyTextureToBuffer({
            texture: this.composite
        }, {
            buffer: zatfd,
            bytesPerRow: zatfb,
            rowsPerImage: this.height
        }, [ this.width, this.height, 1 ]);
        zatfa.queue.submit([ zatfe.finish() ]);
        var zatff = this;
        return zatfd.mapAsync(GPUMapMode.READ).then(function(zatfa) {
            var zatfc = new Uint8Array(zatfd.getMappedRange());
            var zatfe = new Uint8Array(zatff.width * zatff.height * 4);
            for (var zatfg = 0; zatfg < zatff.height; zatfg++) for (var zatfh = 0; zatfh < zatff.width * 4; zatfh++) zatfe[zatfg * zatff.width * 4 + zatfh] = zatfc[zatfg * zatfb + zatfh];
            zatfd.unmap();
            zatfd.destroy();
            return zatfe;
        });
    }
    readbackOrder() {
        var zatfa = this.device;
        var zatfb = zatfa.createBuffer({
            size: this.padded * 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        var zatfc = zatfa.createCommandEncoder();
        zatfc.copyBufferToBuffer(this.orderBuffer, 0, zatfb, 0, this.padded * 4);
        zatfa.queue.submit([ zatfc.finish() ]);
        return zatfb.mapAsync(GPUMapMode.READ).then(function(zatfa) {
            var zatfc = new Uint32Array(zatfb.getMappedRange());
            var zatfd = new Uint32Array(zatfc.slice(0, this.count));
            zatfb.unmap();
            zatfb.destroy();
            return zatfd;
        }.bind(this));
    }
    dispose() {
        if (this._disposed) return this;
        this.composite.destroy();
        this.dummyDepth.destroy();
        this.cameraBuffer.destroy();
        this.sortParamsBuffer.destroy();
        this.stageBuffer.destroy();
        this.dummySh.destroy();
        if (this.positionsBuffer) this.positionsBuffer.destroy();
        if (this.scalesBuffer) this.scalesBuffer.destroy();
        if (this.rotationsBuffer) this.rotationsBuffer.destroy();
        if (this.colorsBuffer) this.colorsBuffer.destroy();
        if (this.shBuffer && this.shBuffer !== this.dummySh) this.shBuffer.destroy();
        if (this.keysBuffer) this.keysBuffer.destroy();
        if (this.orderBuffer) this.orderBuffer.destroy();
        if (this.stageStaging) {
            this.stageStaging.destroy();
            this.stageStaging = null;
        }
        this._disposed = true;
        return this;
    }
}

export { GaussianSplatRenderer };
