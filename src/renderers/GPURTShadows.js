import { RQCORE } from "./GPURayQuery.js";
import { Matrix4 } from "../math/index.js";

const rtshadowwgsl = `${RQCORE}
struct rtshadowparams {
    invviewproj: mat4x4<f32>,
    lightpos: vec4<f32>,
    lightdir: vec4<f32>,
    campos: vec4<f32>,
    misc: vec4<f32>,
};
@group(1) @binding(0) var<uniform> sparams: rtshadowparams;
@group(1) @binding(1) var depthtex: texture_depth_2d;
@group(1) @binding(2) var outtex: texture_storage_2d<rgba8unorm, write>;
fn shadowworld(px: i32, py: i32) -> vec3<f32> {
    var dims = textureDimensions(depthtex);
    var cx = clamp(px, 0, i32(dims.x) - 1);
    var cy = clamp(py, 0, i32(dims.y) - 1);
    var d = textureLoad(depthtex, vec2<i32>(cx, cy), 0);
    var ndcx = (f32(cx) + 0.5) / f32(dims.x) * 2.0 - 1.0;
    var ndcy = 1.0 - (f32(cy) + 0.5) / f32(dims.y) * 2.0;
    var zgl = d * 2.0 - 1.0;
    var clip = vec4<f32>(ndcx, ndcy, zgl, 1.0);
    var world = sparams.invviewproj * clip;
    return world.xyz / world.w;
}
@compute @workgroup_size(8, 8)
fn shadowmain(@builtin(global_invocation_id) gid: vec3<u32>) {
    var dims = textureDimensions(depthtex);
    if (gid.x >= dims.x || gid.y >= dims.y) {
        return;
    }
    var px = i32(gid.x);
    var py = i32(gid.y);
    var d = textureLoad(depthtex, vec2<i32>(px, py), 0);
    if (d >= 0.999999) {
        textureStore(outtex, vec2<i32>(px, py), vec4<f32>(1.0, 1.0, 1.0, 1.0));
        return;
    }
    var world = shadowworld(px, py);
    var pr = shadowworld(px + 1, py);
    var pl = shadowworld(px - 1, py);
    var pu = shadowworld(px, py - 1);
    var pd = shadowworld(px, py + 1);
    var ddx = pr - pl;
    var ddy = pd - pu;
    var nrm = normalize(cross(ddx, ddy));
    var tocam = sparams.campos.xyz - world;
    if (dot(nrm, tocam) < 0.0) {
        nrm = -nrm;
    }
    var origin = world + nrm * sparams.misc.z;
    var ldir = vec3<f32>(0.0, 0.0, 0.0);
    var maxdist = 0.0;
    if (sparams.misc.x > 0.5) {
        var delta = sparams.lightpos.xyz - world;
        var dist = length(delta);
        ldir = delta / dist;
        maxdist = dist - sparams.misc.z * 2.0;
    } else {
        ldir = -normalize(sparams.lightdir.xyz);
        maxdist = 3.0e30;
    }
    var hit = rqtrace(origin, ldir);
    var vis = 1.0;
    if (hit.tri != 4294967295u) {
        if (hit.t < maxdist) {
            vis = 0.0;
        }
    }
    textureStore(outtex, vec2<i32>(px, py), vec4<f32>(vis, 0.0, 0.0, 1.0));
}`;

class GPURTShadows {
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
        this.shadowbind = null;
        this.stats = { tracems: 0, pixels: 0 };
        this.bias = 0.02;
    }
    resize(width, height) {
        width = Math.max(1, Math.floor(width || 1));
        height = Math.max(1, Math.floor(height || 1));
        if (width === this.width && height === this.height && this.texture) return;
        this.width = width;
        this.height = height;
        if (this.texture) this.texture.destroy();
        this.texture = this.device.createTexture({ size: [width, height, 1], format: "rgba8unorm", usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING });
        this.shadowbind = null;
    }
    ensurepipeline() {
        if (this.pipeline) return;
        this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: rtshadowwgsl }), entryPoint: "shadowmain" } });
        this.paramsbuffer = this.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.bvhbind = null;
    }
    resolveLight(light) {
        var resolved = { type: 0, position: [0, 0, 0], direction: [0, -1, 0], distance: 1e30 };
        if (!light) return resolved;
        if (light.type === "PointLight") {
            var m = light.matrixWorld ? light.matrixWorld.elements : null;
            if (m) resolved.position = [m[12], m[13], m[14]];
            resolved.type = 1;
            resolved.distance = light.distance && light.distance > 0 ? light.distance : 1e30;
            return resolved;
        }
        if (light.type === "DirectionalLight") {
            var mw = light.matrixWorld ? light.matrixWorld.elements : null;
            var pos = mw ? [mw[12], mw[13], mw[14]] : [0, 0, 0];
            var target = light.target && light.target.matrixWorld ? light.target.matrixWorld.elements : null;
            var tpos = target ? [target[12], target[13], target[14]] : [0, 0, 0];
            var dx = tpos[0] - pos[0], dy = tpos[1] - pos[1], dz = tpos[2] - pos[2];
            var l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            resolved.direction = [dx / l, dy / l, dz / l];
            return resolved;
        }
        if (light.position && light.distance !== undefined && !light.direction) {
            resolved.type = 1;
            resolved.position = [light.position[0] || 0, light.position[1] || 0, light.position[2] || 0];
            resolved.distance = light.distance > 0 ? light.distance : 1e30;
            return resolved;
        }
        if (light.direction) {
            var l2 = Math.sqrt(light.direction[0] * light.direction[0] + light.direction[1] * light.direction[1] + light.direction[2] * light.direction[2]) || 1;
            resolved.direction = [light.direction[0] / l2, light.direction[1] / l2, light.direction[2] / l2];
        }
        return resolved;
    }
    render(camera, light, depthView) {
        this.ensurepipeline();
        if (!this.texture) this.resize(this.renderer.width || 320, this.renderer.height || 240);
        var resolved = this.resolveLight(light);
        var invviewproj = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
        var data = new Float32Array(32);
        data.set(invviewproj.elements, 0);
        data[16] = resolved.position[0]; data[17] = resolved.position[1]; data[18] = resolved.position[2]; data[19] = 0;
        data[20] = resolved.direction[0]; data[21] = resolved.direction[1]; data[22] = resolved.direction[2]; data[23] = 0;
        data[24] = camera.position.x; data[25] = camera.position.y; data[26] = camera.position.z; data[27] = 0;
        data[28] = resolved.type; data[29] = 0; data[30] = this.bias; data[31] = 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, data);
        var view = depthView || (this.renderer._targetDepthView || this.renderer.depthView);
        if (!this.bvhbind) {
            this.bvhbind = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
                { binding: 1, resource: { buffer: this.rayQuery.nodebuffer } },
                { binding: 2, resource: { buffer: this.rayQuery.trilistbuffer } },
                { binding: 3, resource: { buffer: this.rayQuery.tridatabuffer } }
            ] });
        }
        if (!this.shadowbind || this.shadowbindDepth !== view) {
            this.shadowbind = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(1), entries: [
                { binding: 0, resource: { buffer: this.paramsbuffer } },
                { binding: 1, resource: view },
                { binding: 2, resource: this.texture.createView() }
            ] });
            this.shadowbindDepth = view;
        }
        var t0 = performance.now();
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bvhbind);
        pass.setBindGroup(1, this.shadowbind);
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
        this.shadowbind = null;
        this.shadowbindDepth = null;
        this.stats = { tracems: 0, pixels: 0 };
    }
}

export { GPURTShadows };
