const clusteredwgsl = `struct clparams {
    viewmatrix: mat4x4<f32>,
    params0: vec4<f32>,
    params1: vec4<f32>,
    params2: vec4<f32>,
};
struct lightrec {
    posradius: vec4<f32>,
    colorintensity: vec4<f32>,
};
@group(0) @binding(0) var<uniform> params: clparams;
@group(0) @binding(1) var<storage, read> lights: array<lightrec>;
@group(0) @binding(2) var<storage, read_write> clusters: array<u32>;
@compute @workgroup_size(8, 8, 4)
fn clustmain(@builtin(global_invocation_id) gid: vec3<u32>) {
    var gx = gid.x;
    var gy = gid.y;
    var gz = gid.z;
    if (gx >= u32(params.params0.x) || gy >= u32(params.params0.y) || gz >= u32(params.params0.z)) {
        return;
    }
    var zn = params.params1.z;
    var logbase = params.params2.y;
    var Z = f32(params.params0.z);
    var d0 = zn * pow(logbase, f32(gz) / Z);
    var d1 = zn * pow(logbase, (f32(gz) + 1.0) / Z);
    var hy1 = d1 * params.params1.x;
    var hx1 = hy1 * params.params1.y;
    var GX = f32(params.params0.x);
    var GY = f32(params.params0.y);
    var xlo = -hx1 + (f32(gx) / GX) * 2.0 * hx1;
    var xhi = -hx1 + ((f32(gx) + 1.0) / GX) * 2.0 * hx1;
    var ylo = -hy1 + (f32(gy) / GY) * 2.0 * hy1;
    var yhi = -hy1 + ((f32(gy) + 1.0) / GY) * 2.0 * hy1;
    var zlo = -d1;
    var zhi = -d0;
    var count = 0u;
    var slot = ((gz * u32(params.params0.y) + gy) * u32(params.params0.x) + gx) * 17u;
    var n = u32(params.params0.w);
    var maxc = u32(params.params2.x);
    for (var i = 0u; i < n; i = i + 1u) {
        if (count >= maxc) {
            break;
        }
        var lp = params.viewmatrix * vec4<f32>(lights[i].posradius.xyz, 1.0);
        var R = lights[i].posradius.w;
        var cx = clamp(lp.x, xlo, xhi);
        var cy = clamp(lp.y, ylo, yhi);
        var cz = clamp(lp.z, zlo, zhi);
        var dx = lp.x - cx;
        var dy = lp.y - cy;
        var dz = lp.z - cz;
        if (dx * dx + dy * dy + dz * dz <= R * R) {
            clusters[slot + 1u + count] = i;
            count = count + 1u;
        }
    }
    clusters[slot] = count;
}`;

class ClusteredLighting {
    constructor(renderer) {
        this.renderer = renderer;
        this.device = renderer.device;
        this.gridX = 16;
        this.gridY = 16;
        this.gridZ = 24;
        this.near = 0.5;
        this.far = 100;
        this.maxPerCluster = 16;
        this.maxLights = 256;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.lightbuffer = null;
        this.clusterbuffer = null;
        this.readbackbuffer = null;
        this.bind = null;
        this.stats = { froxels: 0, lights: 0, assigned: 0, clustms: 0 };
    }
    configure(camera, options) {
        options = options || {};
        this.gridX = options.gridX || this.gridX;
        this.gridY = options.gridY || this.gridY;
        this.gridZ = options.gridZ || this.gridZ;
        this.maxPerCluster = options.maxPerCluster || this.maxPerCluster;
        this.maxLights = options.maxLights || this.maxLights;
        var pe = camera.projectionMatrix.elements;
        var tanHalf = 1 / pe[5];
        var aspect = pe[5] / pe[0];
        this.tanHalf = tanHalf;
        this.aspect = aspect;
        this.near = options.near !== undefined ? options.near : (camera.near !== undefined ? camera.near : this.near);
        this.far = options.far !== undefined ? options.far : (camera.far !== undefined ? camera.far : this.far);
        this.viewmatrix = camera.matrixWorldInverse.clone();
        this.stride = this.maxPerCluster + 1;
        this.stats.froxels = this.gridX * this.gridY * this.gridZ;
        if (!this.pipeline) {
            this.pipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.device.createShaderModule({ code: clusteredwgsl }), entryPoint: "clustmain" } });
            this.paramsbuffer = this.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            this.lightbuffer = this.device.createBuffer({ size: this.maxLights * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
            this.clusterbuffer = this.device.createBuffer({ size: this.stats.froxels * this.stride * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
            this.readbackbuffer = this.device.createBuffer({ size: this.stats.froxels * this.stride * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
            this.bind = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
                { binding: 0, resource: { buffer: this.paramsbuffer } },
                { binding: 1, resource: { buffer: this.lightbuffer } },
                { binding: 2, resource: { buffer: this.clusterbuffer } }
            ] });
        } else if (this.clusterbuffer.size !== this.stats.froxels * this.stride * 4) {
            this.clusterbuffer.destroy();
            this.readbackbuffer.destroy();
            this.clusterbuffer = this.device.createBuffer({ size: this.stats.froxels * this.stride * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
            this.readbackbuffer = this.device.createBuffer({ size: this.stats.froxels * this.stride * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
            this.bind = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
                { binding: 0, resource: { buffer: this.paramsbuffer } },
                { binding: 1, resource: { buffer: this.lightbuffer } },
                { binding: 2, resource: { buffer: this.clusterbuffer } }
            ] });
        }
        this.camera = camera;
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
            } else if (light && light.position && light.distance !== undefined) {
                out.push({
                    position: [light.position[0] || 0, light.position[1] || 0, light.position[2] || 0],
                    distance: light.distance > 0 ? light.distance : 1e30,
                    color: light.color || [1, 1, 1],
                    intensity: light.intensity !== undefined ? light.intensity : 1
                });
            } else if (light && light.position) {
                out.push({
                    position: [light.position[0] || 0, light.position[1] || 0, light.position[2] || 0],
                    distance: light.distance || 1e30,
                    color: light.color || [1, 1, 1],
                    intensity: light.intensity !== undefined ? light.intensity : 1
                });
            }
        }
        return out;
    }
    update(lights) {
        if (!this.pipeline) return this;
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
        var ve = this.viewmatrix.elements;
        var data = new Float32Array(32);
        for (var v = 0; v < 16; v++) data[v] = ve[v];
        data[16] = this.gridX; data[17] = this.gridY; data[18] = this.gridZ; data[19] = norm.length;
        data[20] = this.tanHalf; data[21] = this.aspect; data[22] = this.near; data[23] = this.far;
        data[24] = this.maxPerCluster; data[25] = this.far / this.near; data[26] = 0; data[27] = 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, data);
        var t0 = performance.now();
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bind);
        pass.dispatchWorkgroups(Math.ceil(this.gridX / 8), Math.ceil(this.gridY / 8), Math.ceil(this.gridZ / 4));
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.stats.lights = norm.length;
        this.stats.clustms = performance.now() - t0;
        this.normalized = norm;
        return this;
    }
    readback() {
        var self = this;
        var encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.clusterbuffer, 0, this.readbackbuffer, 0, this.readbackbuffer.size);
        this.device.queue.submit([encoder.finish()]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return self.readbackbuffer.mapAsync(GPUMapMode.READ).then(function() {
                var out = new Uint32Array(self.readbackbuffer.getMappedRange()).slice();
                self.readbackbuffer.unmap();
                var assigned = 0;
                for (var f = 0; f < self.stats.froxels; f++) assigned += out[f * self.stride];
                self.stats.assigned = assigned;
                return out;
            });
        });
    }
    clusterOf(cameraPoint) {
        var d = -cameraPoint[2];
        if (d <= this.near || d > this.far) return -1;
        var gz = Math.floor(this.gridZ * Math.log(d / this.near) / Math.log(this.far / this.near));
        if (gz < 0) gz = 0;
        if (gz > this.gridZ - 1) gz = this.gridZ - 1;
        var d1 = this.near * Math.pow(this.far / this.near, (gz + 1) / this.gridZ);
        var hy1 = d1 * this.tanHalf;
        var hx1 = hy1 * this.aspect;
        var gx = Math.floor((cameraPoint[0] + hx1) / (2 * hx1) * this.gridX);
        var gy = Math.floor((cameraPoint[1] + hy1) / (2 * hy1) * this.gridY);
        if (gx < 0) gx = 0;
        if (gx > this.gridX - 1) gx = this.gridX - 1;
        if (gy < 0) gy = 0;
        if (gy > this.gridY - 1) gy = this.gridY - 1;
        return (gz * this.gridY + gy) * this.gridX + gx;
    }
    dispose() {
        if (this.lightbuffer) this.lightbuffer.destroy();
        if (this.clusterbuffer) this.clusterbuffer.destroy();
        if (this.readbackbuffer) this.readbackbuffer.destroy();
        if (this.paramsbuffer) this.paramsbuffer.destroy();
        this.lightbuffer = null;
        this.clusterbuffer = null;
        this.readbackbuffer = null;
        this.paramsbuffer = null;
        this.pipeline = null;
        this.bind = null;
    }
}

export { ClusteredLighting };
