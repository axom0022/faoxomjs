import { RQCORE } from "./GPURayQuery.js";
import { Matrix4 } from "../math/index.js";

const rtreflwgsl = `${RQCORE}
struct rtreflparams {
    invviewproj: mat4x4<f32>,
    campos: vec4<f32>,
    lightdir: vec4<f32>,
    hitcolor: vec4<f32>,
    fallback: vec4<f32>,
    misc: vec4<f32>,
};
@group(1) @binding(0) var<uniform> rparams: rtreflparams;
@group(1) @binding(1) var depthtex: texture_depth_2d;
@group(1) @binding(2) var outtex: texture_storage_2d<rgba8unorm, write>;
fn reflworld(px: i32, py: i32) -> vec3<f32> {
    var dims = textureDimensions(depthtex);
    var cx = clamp(px, 0, i32(dims.x) - 1);
    var cy = clamp(py, 0, i32(dims.y) - 1);
    var d = textureLoad(depthtex, vec2<i32>(cx, cy), 0);
    var ndcx = (f32(cx) + 0.5) / f32(dims.x) * 2.0 - 1.0;
    var ndcy = 1.0 - (f32(cy) + 0.5) / f32(dims.y) * 2.0;
    var zgl = d * 2.0 - 1.0;
    var clip = vec4<f32>(ndcx, ndcy, zgl, 1.0);
    var world = rparams.invviewproj * clip;
    return world.xyz / world.w;
}
@compute @workgroup_size(8, 8)
fn reflmain(@builtin(global_invocation_id) gid: vec3<u32>) {
    var dims = textureDimensions(depthtex);
    if (gid.x >= dims.x || gid.y >= dims.y) {
        return;
    }
    var px = i32(gid.x);
    var py = i32(gid.y);
    var d = textureLoad(depthtex, vec2<i32>(px, py), 0);
    if (d >= 0.999999) {
        textureStore(outtex, vec2<i32>(px, py), vec4<f32>(rparams.fallback.rgb, 0.0));
        return;
    }
    var world = reflworld(px, py);
    var pr = reflworld(px + 1, py);
    var pl = reflworld(px - 1, py);
    var pu = reflworld(px, py - 1);
    var pd = reflworld(px, py + 1);
    var ddx = pr - pl;
    var ddy = pd - pu;
    var nrm = normalize(cross(ddx, ddy));
    var tocam = rparams.campos.xyz - world;
    if (dot(nrm, tocam) < 0.0) {
        nrm = -nrm;
    }
    var v = normalize(world - rparams.campos.xyz);
    var r = reflect(v, nrm);
    var hit = rqtrace(world + nrm * rparams.misc.y, r);
    var col = rparams.fallback.rgb;
    if (hit.tri != 4294967295u) {
        var l = normalize(rparams.lightdir.xyz);
        var lam = max(dot(vec3<f32>(hit.nx, hit.ny, hit.nz), l), 0.0);
        col = rparams.hitcolor.rgb * (rparams.misc.z + (1.0 - rparams.misc.z) * lam);
    }
    var vn = normalize(rparams.campos.xyz - world);
    var w = rparams.misc.x * (1.0 - clamp(abs(dot(nrm, vn)), 0.0, 1.0));
    textureStore(outtex, vec2<i32>(px, py), vec4<f32>(col, w));
}`;

class GPURTReflections {
    constructor(renderer, rayQuery) {
        this.renderer = renderer;
        this.rayQuery = rayQuery;
        this.device = renderer.device;
        this.width = 0;
        this.height = 0;
        this.texture = null;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.bvhbind = null;
        this.reflbind = null;
        this.reflbindDepth = null;
        this.stats = { tracems: 0, pixels: 0 };
        this.bias = 0.02;
        this.strength = 0.8;
        this.ambient = 0.25;
        this.hitColor = [0.9, 0.25, 0.2];
        this.fallbackColor = [0.35, 0.5, 0.75];
        this.lightDirection = [0.4, -0.8, 0.3];
    }
    resize(width, height) {
        width = Math.max(1, Math.floor(width || 1));
        height = Math.max(1, Math.floor(height || 1));
        if (width === this.width && height === this.height && this.texture) return;
        this.width = width;
        this.height = height;
        if (this.texture) this.texture.destroy();
        this.texture = this.device.createTexture({ size: [width, height, 1], format: "rgba8unorm", usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING });
        this.reflbind = null;
    }
    ensurepipeline() {
        if (this.pipeline) return;
        this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: rtreflwgsl }), entryPoint: "reflmain" } });
        this.paramsbuffer = this.device.createBuffer({ size: 160, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.bvhbind = null;
    }
    render(camera, depthView, options) {
        this.ensurepipeline();
        if (!this.texture) this.resize(this.renderer.width || 320, this.renderer.height || 240);
        options = options || {};
        var lightDirection = options.lightDirection || this.lightDirection;
        var hitColor = options.hitColor || this.hitColor;
        var fallbackColor = options.fallbackColor || this.fallbackColor;
        var strength = options.strength !== undefined ? options.strength : this.strength;
        var ambient = options.ambient !== undefined ? options.ambient : this.ambient;
        var bias = options.bias !== undefined ? options.bias : this.bias;
        var ll = Math.sqrt(lightDirection[0] * lightDirection[0] + lightDirection[1] * lightDirection[1] + lightDirection[2] * lightDirection[2]) || 1;
        var invviewproj = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
        var data = new Float32Array(40);
        data.set(invviewproj.elements, 0);
        data[16] = camera.position.x; data[17] = camera.position.y; data[18] = camera.position.z; data[19] = 0;
        data[20] = lightDirection[0] / ll; data[21] = lightDirection[1] / ll; data[22] = lightDirection[2] / ll; data[23] = 0;
        data[24] = hitColor[0]; data[25] = hitColor[1]; data[26] = hitColor[2]; data[27] = 0;
        data[28] = fallbackColor[0]; data[29] = fallbackColor[1]; data[30] = fallbackColor[2]; data[31] = 0;
        data[32] = strength; data[33] = bias; data[34] = ambient; data[35] = 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, data);
        var view = depthView || (this.renderer._targetDepthView || this.renderer.depthView);
        if (!this.bvhbind) {
            this.bvhbind = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
                { binding: 1, resource: { buffer: this.rayQuery.nodebuffer } },
                { binding: 2, resource: { buffer: this.rayQuery.trilistbuffer } },
                { binding: 3, resource: { buffer: this.rayQuery.tridatabuffer } }
            ] });
        }
        if (!this.reflbind || this.reflbindDepth !== view) {
            this.reflbind = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(1), entries: [
                { binding: 0, resource: { buffer: this.paramsbuffer } },
                { binding: 1, resource: view },
                { binding: 2, resource: this.texture.createView() }
            ] });
            this.reflbindDepth = view;
        }
        var t0 = performance.now();
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bvhbind);
        pass.setBindGroup(1, this.reflbind);
        pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8));
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.stats.pixels = this.width * this.height;
        this.stats.tracems = performance.now() - t0;
        return this;
    }
    dispose() {
        if (this.texture) this.texture.destroy();
        if (this.paramsbuffer) this.paramsbuffer.destroy();
        this.texture = null;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.bvhbind = null;
        this.reflbind = null;
        this.reflbindDepth = null;
        this.stats = { tracems: 0, pixels: 0 };
    }
}

export { GPURTReflections };
