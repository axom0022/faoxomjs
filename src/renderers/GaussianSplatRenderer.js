class GaussianSplatRenderer {
    constructor(renderer, options) {
        options = options || {};
        if (!renderer || !renderer.device) throw new Error("GaussianSplatRenderer requires a WebGPU renderer");
        this.renderer = renderer;
        this.device = renderer.device;
        this.width = Math.max(1, Math.floor(options.width === undefined ? 192 : options.width));
        this.height = Math.max(1, Math.floor(options.height === undefined ? 192 : options.height));
        this.cutoff = 3.0;
        this.dilation = 0.3;
        this.count = 0;
        this.padded = 2;
        this.stageStaging = null;
        this.sortStageCount = 0;
        this.shDegree = 0;
        this.stats = { frames: 0, splats: 0, sortPasses: 0 };
        this._disposed = false;
        this._buildTargets();
        this._buildPipelines();
        if (options.splats) this.setSplats(options.splats);
    }

    _buildTargets() {
        this.composite = this.device.createTexture({ size: [this.width, this.height, 1], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING });
        this.compositeView = this.composite.createView();
        this.dummyDepth = this.device.createTexture({ size: [1, 1, 1], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
        this.dummyDepthView = this.dummyDepth.createView();
        this.cameraBuffer = this.device.createBuffer({ size: 192, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.sortParamsBuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.stageBuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.dummySh = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    }

    splatCode() {
        return [
            "struct Camera { view: mat4x4<f32>, proj: mat4x4<f32>, cameraPosition: vec4<f32>, focal: vec4<f32>, viewport: vec4<f32> };",
            "@group(0) @binding(0) var<uniform> camera: Camera;",
            "@group(0) @binding(1) var<storage, read> positions: array<f32>;",
            "@group(0) @binding(2) var<storage, read> scalesArr: array<f32>;",
            "@group(0) @binding(3) var<storage, read> rotationsArr: array<f32>;",
            "@group(0) @binding(4) var<storage, read> colorsArr: array<f32>;",
            "@group(0) @binding(5) var<storage, read> shArr: array<f32>;",
            "@group(0) @binding(6) var<storage, read> orderArr: array<u32>;",
            "@group(0) @binding(7) var sceneDepth: texture_depth_2d;",
            "struct VOut { @builtin(position) position: vec4<f32>, @location(0) color: vec3<f32>, @location(1) alpha: f32, @location(2) conic: vec3<f32>, @location(3) centerPx: vec2<f32>, @location(4) depth01: f32 };",
            "fn quatMatrix(q: vec4<f32>) -> mat3x3<f32> { let x = q.x; let y = q.y; let z = q.z; let w = q.w; return mat3x3<f32>(1.0 - 2.0 * (y * y + z * z), 2.0 * (x * y + w * z), 2.0 * (x * z - w * y), 2.0 * (x * y - w * z), 1.0 - 2.0 * (x * x + z * z), 2.0 * (y * z + w * x), 2.0 * (x * z + w * y), 2.0 * (y * z - w * x), 1.0 - 2.0 * (x * x + y * y)); }",
            "fn sh3(i: u32) -> vec3<f32> { return vec3<f32>(shArr[i], shArr[i + 1u], shArr[i + 2u]); }",
            "fn evalSh(base: u32, dim: u32, dir: vec3<f32>) -> vec3<f32> {",
            "  var result = vec3<f32>(0.0);",
            "  let x = dir.x; let y = dir.y; let z = dir.z;",
            "  let xx = x * x; let yy = y * y; let zz = z * z; let xy = x * y; let yz = y * z; let xz = x * z;",
            "  if (dim > 0u) { let c1 = 0.4886025119029199; result = result - c1 * y * sh3(base) + c1 * z * sh3(base + 3u) - c1 * x * sh3(base + 6u); }",
            "  if (dim > 3u) { result = result + 1.0925484305920792 * xy * sh3(base + 9u) - 1.0925484305920792 * yz * sh3(base + 12u) + 0.31539156525252005 * (2.0 * zz - xx - yy) * sh3(base + 15u) - 1.0925484305920792 * xz * sh3(base + 18u) + 0.5462742152960396 * (xx - yy) * sh3(base + 21u); }",
            "  if (dim > 8u) { result = result - 0.5900435899266435 * y * (3.0 * xx - yy) * sh3(base + 24u) + 2.890611442640554 * xy * z * sh3(base + 27u) - 0.4570457994644658 * y * (4.0 * zz - xx - yy) * sh3(base + 30u) + 0.3731763325901154 * z * (2.0 * zz - 3.0 * xx - 3.0 * yy) * sh3(base + 33u) - 0.4570457994644658 * x * (4.0 * zz - xx - yy) * sh3(base + 36u) + 1.445305721320277 * z * (xx - yy) * sh3(base + 39u) - 0.5900435899266435 * x * (xx - 3.0 * yy) * sh3(base + 42u); }",
            "  return result;",
            "}",
            "@vertex fn vsMain(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {",
            "  var output: VOut;",
            "  let cx = select(-1.0, 1.0, (vi & 1u) == 1u);",
            "  let cy = select(-1.0, 1.0, (vi & 2u) == 2u);",
            "  let idx = orderArr[ii];",
            "  let p = vec3<f32>(positions[idx * 3u], positions[idx * 3u + 1u], positions[idx * 3u + 2u]);",
            "  let sc = vec3<f32>(scalesArr[idx * 3u], scalesArr[idx * 3u + 1u], scalesArr[idx * 3u + 2u]);",
            "  let q = normalize(vec4<f32>(rotationsArr[idx * 4u], rotationsArr[idx * 4u + 1u], rotationsArr[idx * 4u + 2u], rotationsArr[idx * 4u + 3u]));",
            "  let col = vec4<f32>(colorsArr[idx * 4u], colorsArr[idx * 4u + 1u], colorsArr[idx * 4u + 2u], colorsArr[idx * 4u + 3u]);",
            "  let W = f32(camera.viewport.x); let H = f32(camera.viewport.y);",
            "  let fx = camera.focal.x; let fy = camera.focal.y; let tfx = camera.focal.z; let tfy = camera.focal.w;",
            "  let t4 = camera.view * vec4<f32>(p, 1.0);",
            "  if (t4.z > -0.0001) { output.position = vec4<f32>(2.0, 2.0, 0.5, 1.0); output.color = vec3<f32>(0.0); output.alpha = 0.0; output.conic = vec3<f32>(1.0, 0.0, 1.0); output.centerPx = vec2<f32>(0.0); output.depth01 = 1.0; return output; }",
            "  let clip = camera.proj * t4;",
            "  let cw = clip.w;",
            "  let ndc = clip.xyz / cw;",
            "  let R = quatMatrix(q);",
            "  let M = mat3x3<f32>(R[0] * sc.x, R[1] * sc.y, R[2] * sc.z);",
            "  let r0 = vec3<f32>(M[0].x, M[1].x, M[2].x);",
            "  let r1 = vec3<f32>(M[0].y, M[1].y, M[2].y);",
            "  let r2 = vec3<f32>(M[0].z, M[1].z, M[2].z);",
            "  let sigma = mat3x3<f32>(dot(r0, r0), dot(r1, r0), dot(r2, r0), dot(r0, r1), dot(r1, r1), dot(r2, r1), dot(r0, r2), dot(r1, r2), dot(r2, r2));",
            "  let limx = 1.3 * tfx; let limy = 1.3 * tfy;",
            "  let tx = clamp(t4.x / t4.z, -limx, limx) * t4.z;",
            "  let ty = clamp(t4.y / t4.z, -limy, limy) * t4.z;",
            "  let j00 = fx / t4.z; let j02 = -(fx * tx) / (t4.z * t4.z);",
            "  let j11 = fy / t4.z; let j12 = -(fy * ty) / (t4.z * t4.z);",
            "  let wv0 = vec3<f32>(camera.view[0].x, camera.view[1].x, camera.view[2].x);",
            "  let wv1 = vec3<f32>(camera.view[0].y, camera.view[1].y, camera.view[2].y);",
            "  let wv2 = vec3<f32>(camera.view[0].z, camera.view[1].z, camera.view[2].z);",
            "  let a0 = j00 * wv0 + j02 * wv2;",
            "  let a1 = j11 * wv1 + j12 * wv2;",
            "  let s0 = sigma * a0;",
            "  let s1 = sigma * a1;",
            "  let cva = dot(a0, s0) + 0.3;",
            "  let cvb = dot(a0, s1);",
            "  let cvc = dot(a1, s1) + 0.3;",
            "  let det = cva * cvc - cvb * cvb;",
            "  if (det <= 0.0) { output.position = vec4<f32>(2.0, 2.0, 0.5, 1.0); output.color = vec3<f32>(0.0); output.alpha = 0.0; output.conic = vec3<f32>(1.0, 0.0, 1.0); output.centerPx = vec2<f32>(0.0); output.depth01 = 1.0; return output; }",
            "  let mid = 0.5 * (cva + cvc);",
            "  let rad = sqrt(max(0.1, mid * mid - det));",
            "  let l1 = mid + rad; let l2 = mid - rad;",
            "  var e1 = vec2<f32>(cvb, l1 - cva);",
            "  e1 = select(normalize(e1), vec2<f32>(1.0, 0.0), abs(e1.x) < 0.000000001 && abs(e1.y) < 0.000000001);",
            "  let e2 = vec2<f32>(-e1.y, e1.x);",
            "  let ext1 = 3.0 * sqrt(max(l1, 0.0));",
            "  let ext2 = 3.0 * sqrt(max(l2, 0.0));",
            "  let cpx = (ndc.x * 0.5 + 0.5) * W;",
            "  let cpy = (0.5 - ndc.y * 0.5) * H;",
            "  let offPx = vec2<f32>(cx * ext1 * e1.x + cy * ext2 * e2.x, cx * ext1 * e1.y + cy * ext2 * e2.y);",
            "  let ndcX = ndc.x + offPx.x * 2.0 / W;",
            "  let ndcY = ndc.y - offPx.y * 2.0 / H;",
            "  let zGl = clip.z / cw;",
            "  output.position = vec4<f32>(ndcX * cw, ndcY * cw, zGl * 0.5 * cw + 0.5 * cw, cw);",
            "  output.centerPx = vec2<f32>(cpx, cpy);",
            "  output.conic = vec3<f32>(cvc, -cvb, cva) / det;",
            "  output.depth01 = zGl * 0.5 + 0.5;",
            "  output.alpha = col.a;",
            "  var rgb = col.rgb;",
            "  let degree = u32(max(camera.viewport.w, 0.0));",
            "  if (degree > 0u) {",
            "    let dim = degree * degree + 2u * degree;",
            "    let dir = normalize(p - camera.cameraPosition.xyz);",
            "    rgb = rgb + evalSh(idx * dim * 3u, dim, dir);",
            "  }",
            "  output.color = rgb;",
            "  return output;",
            "}",
            "@fragment fn fsMain(input: VOut) -> @location(0) vec4<f32> {",
            "  let d = input.position.xy - input.centerPx;",
            "  let power = -0.5 * (input.conic.x * d.x * d.x + 2.0 * input.conic.y * d.x * d.y + input.conic.z * d.y * d.y);",
            "  if (power > 0.0) { discard; }",
            "  var alpha = input.alpha * exp(power);",
            "  if (alpha < 0.00392156862745098) { discard; }",
            "  if (camera.viewport.z > 0.5) {",
            "    let pix = vec2<i32>(clamp(input.position.xy, vec2<f32>(0.5), vec2<f32>(camera.viewport.xy) - vec2<f32>(0.5)));",
            "    let sd = textureLoad(sceneDepth, pix, 0);",
            "    if (input.depth01 > sd) { discard; }",
            "  }",
            "  return vec4<f32>(clamp(input.color, vec3<f32>(0.0), vec3<f32>(1.0)), alpha);",
            "}"
        ].join("\n");
    }

    sortCode() {
        return [
            "struct SortParams { count: u32, padded: u32, pad0: u32, pad1: u32 };",
            "struct Camera { view: mat4x4<f32> };",
            "@group(0) @binding(0) var<storage, read> positions: array<f32>;",
            "@group(0) @binding(1) var<storage, read_write> keys: array<f32>;",
            "@group(0) @binding(2) var<storage, read_write> order: array<u32>;",
            "@group(0) @binding(3) var<uniform> params: SortParams;",
            "@group(0) @binding(4) var<uniform> camera: Camera;",
            "@compute @workgroup_size(64)",
            "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {",
            "  let i = gid.x;",
            "  if (i >= params.padded) { return; }",
            "  if (i >= params.count) { keys[i] = 1e30; order[i] = i; return; }",
            "  let p = vec3<f32>(positions[i * 3u], positions[i * 3u + 1u], positions[i * 3u + 2u]);",
            "  let t = camera.view * vec4<f32>(p, 1.0);",
            "  keys[i] = t.z;",
            "  order[i] = i;",
            "}"
        ].join("\n");
    }

    bitonicCode() {
        return [
            "struct Stage { k: u32, j: u32, padded: u32, pad0: u32 };",
            "@group(0) @binding(0) var<storage, read_write> keys: array<f32>;",
            "@group(0) @binding(1) var<storage, read_write> order: array<u32>;",
            "@group(0) @binding(2) var<uniform> stage: Stage;",
            "@compute @workgroup_size(64)",
            "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {",
            "  let i = gid.x;",
            "  if (i >= stage.padded) { return; }",
            "  let x = i ^ stage.j;",
            "  if (x <= i || x >= stage.padded) { return; }",
            "  let ascending = (i & stage.k) == 0u;",
            "  let a = keys[i]; let b = keys[x];",
            "  let bad = select((a < b), (a > b), ascending);",
            "  if (bad) {",
            "    keys[i] = b; keys[x] = a;",
            "    let oi = order[i]; order[i] = order[x]; order[x] = oi;",
            "  }",
            "}"
        ].join("\n");
    }

    blitCode() {
        return [
            "@group(0) @binding(0) var srcTex: texture_2d<f32>;",
            "@vertex fn blitVs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4<f32> { let x = f32((vi << 1u) & 2u); let y = f32(vi & 2u); return vec4<f32>(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0); }",
            "@fragment fn blitFs(@builtin(position) frag: vec4<f32>) -> @location(0) vec4<f32> { let pix = vec2<i32>(frag.xy); return textureLoad(srcTex, pix, 0); }"
        ].join("\n");
    }

    _buildPipelines() {
        var device = this.device;
        this.splatModule = device.createShaderModule({ code: this.splatCode() });
        this.sortModule = device.createShaderModule({ code: this.sortCode() });
        this.bitonicModule = device.createShaderModule({ code: this.bitonicCode() });
        this.blitModule = device.createShaderModule({ code: this.blitCode() });
        this.sortPipeline = device.createComputePipeline({ layout: "auto", compute: { module: this.sortModule, entryPoint: "main" } });
        this.bitonicPipeline = device.createComputePipeline({ layout: "auto", compute: { module: this.bitonicModule, entryPoint: "main" } });
        this.blitPipeline = device.createRenderPipeline({ layout: "auto", vertex: { module: this.blitModule, entryPoint: "blitVs" }, fragment: { module: this.blitModule, entryPoint: "blitFs", targets: [{ format: "rgba8unorm" }] }, primitive: { topology: "triangle-list" } });
        this.splatPipeline = device.createRenderPipeline({ layout: "auto", vertex: { module: this.splatModule, entryPoint: "vsMain" }, fragment: { module: this.splatModule, entryPoint: "fsMain", targets: [{ format: "rgba8unorm", blend: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" } } }] }, primitive: { topology: "triangle-strip" } });
    }

    _validateSplats(data) {
        if (!data || typeof data !== "object") throw new Error("GaussianSplatRenderer requires splat data");
        var count = data.count;
        if (!Number.isInteger(count) || count <= 0) throw new Error("GaussianSplatRenderer requires a positive integer splat count");
        if (!(data.positions instanceof Float32Array) || data.positions.length !== count * 3) throw new Error("splat positions must be a Float32Array of length count * 3");
        if (!(data.scales instanceof Float32Array) || data.scales.length !== count * 3) throw new Error("splat scales must be a Float32Array of length count * 3");
        if (!(data.rotations instanceof Float32Array) || data.rotations.length !== count * 4) throw new Error("splat rotations must be a Float32Array of length count * 4");
        if (!(data.colors instanceof Float32Array) || data.colors.length !== count * 4) throw new Error("splat colors must be a Float32Array of length count * 4");
        var degree = 0, coefficients = null;
        if (data.sh !== null && data.sh !== undefined) {
            if (!data.sh || typeof data.sh !== "object") throw new Error("splat sh must be null or { degree, coefficients }");
            degree = data.sh.degree;
            if (!Number.isInteger(degree) || degree < 0 || degree > 3) throw new Error("splat sh degree must be between 0 and 3");
            if (degree > 0) {
                if (!(data.sh.coefficients instanceof Float32Array)) throw new Error("splat sh coefficients must be a Float32Array");
                var dim = degree * degree + 2 * degree;
                if (data.sh.coefficients.length !== count * dim * 3) throw new Error("splat sh coefficients must have length count * dim(degree) * 3");
                coefficients = data.sh.coefficients;
            }
        }
        var rotations = data.rotations;
        for (var i = 0; i < count; i++) {
            var nx = rotations[i * 4], ny = rotations[i * 4 + 1], nz = rotations[i * 4 + 2], nw = rotations[i * 4 + 3];
            var norm = Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw);
            if (!(norm > 0.000001) || !isFinite(norm)) throw new Error("splat rotation quaternions must be non-zero");
        }
        return { count: count, degree: degree, coefficients: coefficients };
    }

    setSplats(data) {
        var info = this._validateSplats(data);
        var device = this.device;
        this.count = info.count;
        this.shDegree = info.degree;
        this.stats.splats = info.count;
        var p = 2;
        while (p < this.count) p *= 2;
        this.padded = p;
        var stageParams = [];
        var sk = 2;
        while (sk <= p) {
            var sj = sk >> 1;
            while (sj > 0) { stageParams.push(sk, sj, p, 0); sj >>= 1; }
            sk *= 2;
        }
        this.sortStageCount = stageParams.length / 4;
        if (this.stageStaging) this.stageStaging.destroy();
        this.stageStaging = device.createBuffer({ size: Math.max(16, stageParams.length * 4), usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(this.stageStaging, 0, new Uint32Array(stageParams));
        if (this.positionsBuffer) this.positionsBuffer.destroy();
        if (this.scalesBuffer) this.scalesBuffer.destroy();
        if (this.rotationsBuffer) this.rotationsBuffer.destroy();
        if (this.colorsBuffer) this.colorsBuffer.destroy();
        if (this.shBuffer && this.shBuffer !== this.dummySh) this.shBuffer.destroy();
        if (this.keysBuffer) this.keysBuffer.destroy();
        if (this.orderBuffer) this.orderBuffer.destroy();
        this.positionsBuffer = device.createBuffer({ size: Math.max(16, data.positions.byteLength), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.scalesBuffer = device.createBuffer({ size: Math.max(16, data.scales.byteLength), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.rotationsBuffer = device.createBuffer({ size: Math.max(16, data.rotations.byteLength), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.colorsBuffer = device.createBuffer({ size: Math.max(16, data.colors.byteLength), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        if (info.coefficients) {
            this.shBuffer = device.createBuffer({ size: info.coefficients.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(this.shBuffer, 0, info.coefficients);
        } else {
            this.shBuffer = this.dummySh;
        }
        this.keysBuffer = device.createBuffer({ size: p * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.orderBuffer = device.createBuffer({ size: p * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        device.queue.writeBuffer(this.positionsBuffer, 0, data.positions);
        device.queue.writeBuffer(this.scalesBuffer, 0, data.scales);
        device.queue.writeBuffer(this.rotationsBuffer, 0, data.rotations);
        device.queue.writeBuffer(this.colorsBuffer, 0, data.colors);
        this.sortBindGroup = device.createBindGroup({ layout: this.sortPipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.positionsBuffer } },
            { binding: 1, resource: { buffer: this.keysBuffer } },
            { binding: 2, resource: { buffer: this.orderBuffer } },
            { binding: 3, resource: { buffer: this.sortParamsBuffer } },
            { binding: 4, resource: { buffer: this.cameraBuffer } }
        ] });
        this.bitonicBindGroup = device.createBindGroup({ layout: this.bitonicPipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.keysBuffer } },
            { binding: 1, resource: { buffer: this.orderBuffer } },
            { binding: 2, resource: { buffer: this.stageBuffer } }
        ] });
        this.renderBindGroup = device.createBindGroup({ layout: this.splatPipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.cameraBuffer } },
            { binding: 1, resource: { buffer: this.positionsBuffer } },
            { binding: 2, resource: { buffer: this.scalesBuffer } },
            { binding: 3, resource: { buffer: this.rotationsBuffer } },
            { binding: 4, resource: { buffer: this.colorsBuffer } },
            { binding: 5, resource: { buffer: this.shBuffer } },
            { binding: 6, resource: { buffer: this.orderBuffer } },
            { binding: 7, resource: this.dummyDepthView }
        ] });
        return this;
    }

    _cameraUniforms(camera, hasDepth) {
        var out = new Float32Array(48);
        for (var i = 0; i < 16; i++) { out[i] = Math.fround(camera.matrixWorldInverse.elements[i]); out[16 + i] = Math.fround(camera.projectionMatrix.elements[i]); }
        var p00 = out[16], p11 = out[21];
        out[32] = Math.fround(camera.position.x); out[33] = Math.fround(camera.position.y); out[34] = Math.fround(camera.position.z); out[35] = 0;
        out[36] = Math.fround(0.5 * this.width * p00); out[37] = Math.fround(0.5 * this.height * p11);
        out[38] = Math.fround(1 / p00); out[39] = Math.fround(1 / p11);
        out[40] = this.width; out[41] = this.height; out[42] = hasDepth ? 1 : 0; out[43] = this.shDegree;
        return out;
    }

    render(inputColor, inputDepth, camera) {
        if (this._disposed) throw new Error("GaussianSplatRenderer is disposed");
        if (!inputColor || !inputColor.createView) throw new Error("render requires an input color texture");
        if (!camera || !camera.projectionMatrix || !camera.matrixWorldInverse) throw new Error("render requires a camera");
        if (this.count === 0) throw new Error("render requires splat data; call setSplats first");
        var hasDepth = !!(inputDepth && inputDepth.createView);
        var device = this.device;
        var uniforms = this._cameraUniforms(camera, hasDepth);
        device.queue.writeBuffer(this.cameraBuffer, 0, uniforms);
        device.queue.writeBuffer(this.sortParamsBuffer, 0, new Uint32Array([this.count, this.padded, 0, 0]));
        var blitBind = device.createBindGroup({ layout: this.blitPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: inputColor.createView() }] });
        var renderBind = hasDepth ? this._depthBindGroup(inputDepth) : this.renderBindGroup;
        var encoder = device.createCommandEncoder();
        var pass1 = encoder.beginComputePass();
        pass1.setPipeline(this.sortPipeline);
        pass1.setBindGroup(0, this.sortBindGroup);
        pass1.dispatchWorkgroups(Math.ceil(this.padded / 64));
        pass1.end();
        var k = 2, passes = 0;
        while (k <= this.padded) {
            var j = k >> 1;
            while (j > 0) {
                encoder.copyBufferToBuffer(this.stageStaging, passes * 16, this.stageBuffer, 0, 16);
                var passB = encoder.beginComputePass();
                passB.setPipeline(this.bitonicPipeline);
                passB.setBindGroup(0, this.bitonicBindGroup);
                passB.dispatchWorkgroups(Math.ceil(this.padded / 64));
                passB.end();
                passes++;
                j >>= 1;
            }
            k *= 2;
        }
        this.stats.sortPasses += passes;
        var pass2 = encoder.beginRenderPass({ colorAttachments: [{ view: this.compositeView, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }] });
        pass2.setPipeline(this.blitPipeline);
        pass2.setBindGroup(0, blitBind);
        pass2.draw(3, 1, 0, 0);
        pass2.setPipeline(this.splatPipeline);
        pass2.setBindGroup(0, renderBind);
        pass2.draw(4, this.count, 0, 0);
        pass2.end();
        device.queue.submit([encoder.finish()]);
        this.stats.frames++;
        return this.compositeView;
    }

    _depthBindGroup(inputDepth) {
        return this.device.createBindGroup({ layout: this.splatPipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: this.cameraBuffer } },
            { binding: 1, resource: { buffer: this.positionsBuffer } },
            { binding: 2, resource: { buffer: this.scalesBuffer } },
            { binding: 3, resource: { buffer: this.rotationsBuffer } },
            { binding: 4, resource: { buffer: this.colorsBuffer } },
            { binding: 5, resource: { buffer: this.shBuffer } },
            { binding: 6, resource: { buffer: this.orderBuffer } },
            { binding: 7, resource: inputDepth.createView() }
        ] });
    }

    readPixels() {
        var device = this.device;
        var bytesPerRow = Math.max(256, Math.ceil(this.width * 4 / 256) * 256);
        var size = bytesPerRow * this.height;
        var staging = device.createBuffer({ size: size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        var encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: this.composite }, { buffer: staging, bytesPerRow: bytesPerRow, rowsPerImage: this.height }, [this.width, this.height, 1]);
        device.queue.submit([encoder.finish()]);
        var self = this;
        return staging.mapAsync(GPUMapMode.READ).then(function(mapping) {
            var raw = new Uint8Array(staging.getMappedRange());
            var out = new Uint8Array(self.width * self.height * 4);
            for (var row = 0; row < self.height; row++) for (var col = 0; col < self.width * 4; col++) out[row * self.width * 4 + col] = raw[row * bytesPerRow + col];
            staging.unmap();
            staging.destroy();
            return out;
        });
    }

    readbackOrder() {
        var device = this.device;
        var staging = device.createBuffer({ size: this.padded * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        var encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.orderBuffer, 0, staging, 0, this.padded * 4);
        device.queue.submit([encoder.finish()]);
        return staging.mapAsync(GPUMapMode.READ).then(function(mapping) {
            var raw = new Uint32Array(staging.getMappedRange());
            var out = new Uint32Array(raw.slice(0, this.count));
            staging.unmap();
            staging.destroy();
            return out;
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
        if (this.stageStaging) { this.stageStaging.destroy(); this.stageStaging = null; }
        this._disposed = true;
        return this;
    }
}

export { GaussianSplatRenderer };
