const zasja = `struct clparams {\n    viewmatrix: mat4x4<f32>,\n    params0: vec4<f32>,\n    params1: vec4<f32>,\n    params2: vec4<f32>,\n};\nstruct lightrec {\n    posradius: vec4<f32>,\n    colorintensity: vec4<f32>,\n};\n@group(0) @binding(0) var<uniform> params: clparams;\n@group(0) @binding(1) var<storage, read> lights: array<lightrec>;\n@group(0) @binding(2) var<storage, read_write> clusters: array<u32>;\n@compute @workgroup_size(8, 8, 4)\nfn clustmain(@builtin(global_invocation_id) gid: vec3<u32>) {\n    var gx = gid.x;\n    var gy = gid.y;\n    var gz = gid.z;\n    if (gx >= u32(params.params0.x) || gy >= u32(params.params0.y) || gz >= u32(params.params0.z)) {\n        return;\n    }\n    var zn = params.params1.z;\n    var logbase = params.params2.y;\n    var Z = f32(params.params0.z);\n    var d0 = zn * pow(logbase, f32(gz) / Z);\n    var d1 = zn * pow(logbase, (f32(gz) + 1.0) / Z);\n    var hy1 = d1 * params.params1.x;\n    var hx1 = hy1 * params.params1.y;\n    var GX = f32(params.params0.x);\n    var GY = f32(params.params0.y);\n    var xlo = -hx1 + (f32(gx) / GX) * 2.0 * hx1;\n    var xhi = -hx1 + ((f32(gx) + 1.0) / GX) * 2.0 * hx1;\n    var ylo = -hy1 + (f32(gy) / GY) * 2.0 * hy1;\n    var yhi = -hy1 + ((f32(gy) + 1.0) / GY) * 2.0 * hy1;\n    var zlo = -d1;\n    var zhi = -d0;\n    var count = 0u;\n    var slot = ((gz * u32(params.params0.y) + gy) * u32(params.params0.x) + gx) * 17u;\n    var n = u32(params.params0.w);\n    var maxc = u32(params.params2.x);\n    for (var i = 0u; i < n; i = i + 1u) {\n        if (count >= maxc) {\n            break;\n        }\n        var lp = params.viewmatrix * vec4<f32>(lights[i].posradius.xyz, 1.0);\n        var R = lights[i].posradius.w;\n        var cx = clamp(lp.x, xlo, xhi);\n        var cy = clamp(lp.y, ylo, yhi);\n        var cz = clamp(lp.z, zlo, zhi);\n        var dx = lp.x - cx;\n        var dy = lp.y - cy;\n        var dz = lp.z - cz;\n        if (dx * dx + dy * dy + dz * dz <= R * R) {\n            clusters[slot + 1u + count] = i;\n            count = count + 1u;\n        }\n    }\n    clusters[slot] = count;\n}`;

class ClusteredLighting {
    constructor(zasja) {
        this.renderer = zasja;
        this.device = zasja.device;
        this.gridX = 16;
        this.gridY = 16;
        this.gridZ = 24;
        this.near = .5;
        this.far = 100;
        this.maxPerCluster = 16;
        this.maxLights = 256;
        this.pipeline = null;
        this.paramsbuffer = null;
        this.lightbuffer = null;
        this.clusterbuffer = null;
        this.readbackbuffer = null;
        this.bind = null;
        this.stats = {
            froxels: 0,
            lights: 0,
            assigned: 0,
            clustms: 0
        };
    }
    configure(zasjb, zasjc) {
        zasjc = zasjc || {};
        this.gridX = zasjc.gridX || this.gridX;
        this.gridY = zasjc.gridY || this.gridY;
        this.gridZ = zasjc.gridZ || this.gridZ;
        this.maxPerCluster = zasjc.maxPerCluster || this.maxPerCluster;
        this.maxLights = zasjc.maxLights || this.maxLights;
        var zasjd = zasjb.projectionMatrix.elements;
        var zasje = 1 / zasjd[5];
        var zasjf = zasjd[5] / zasjd[0];
        this.tanHalf = zasje;
        this.aspect = zasjf;
        this.near = zasjc.near !== undefined ? zasjc.near : zasjb.near !== undefined ? zasjb.near : this.near;
        this.far = zasjc.far !== undefined ? zasjc.far : zasjb.far !== undefined ? zasjb.far : this.far;
        this.viewmatrix = zasjb.matrixWorldInverse.clone();
        this.stride = this.maxPerCluster + 1;
        this.stats.froxels = this.gridX * this.gridY * this.gridZ;
        if (!this.pipeline) {
            this.pipeline = this.device.createComputePipeline({
                layout: "auto",
                compute: {
                    module: this.device.createShaderModule({
                        code: zasja
                    }),
                    entryPoint: "clustmain"
                }
            });
            this.paramsbuffer = this.device.createBuffer({
                size: 128,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            this.lightbuffer = this.device.createBuffer({
                size: this.maxLights * 32,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.clusterbuffer = this.device.createBuffer({
                size: this.stats.froxels * this.stride * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
            });
            this.readbackbuffer = this.device.createBuffer({
                size: this.stats.froxels * this.stride * 4,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            });
            this.bind = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: this.paramsbuffer
                    }
                }, {
                    binding: 1,
                    resource: {
                        buffer: this.lightbuffer
                    }
                }, {
                    binding: 2,
                    resource: {
                        buffer: this.clusterbuffer
                    }
                } ]
            });
        } else if (this.clusterbuffer.size !== this.stats.froxels * this.stride * 4) {
            this.clusterbuffer.destroy();
            this.readbackbuffer.destroy();
            this.clusterbuffer = this.device.createBuffer({
                size: this.stats.froxels * this.stride * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
            });
            this.readbackbuffer = this.device.createBuffer({
                size: this.stats.froxels * this.stride * 4,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            });
            this.bind = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: this.paramsbuffer
                    }
                }, {
                    binding: 1,
                    resource: {
                        buffer: this.lightbuffer
                    }
                }, {
                    binding: 2,
                    resource: {
                        buffer: this.clusterbuffer
                    }
                } ]
            });
        }
        this.camera = zasjb;
        return this;
    }
    normalizeLights(zasja) {
        var zasjb = [];
        for (var zasjc = 0; zasjc < zasja.length && zasjc < this.maxLights; zasjc++) {
            var zasjd = zasja[zasjc];
            if (zasjd && zasjd.type === "PointLight") {
                var zasje = zasjd.matrixWorld ? zasjd.matrixWorld.elements : null;
                zasjb.push({
                    position: zasje ? [ zasje[12], zasje[13], zasje[14] ] : [ 0, 0, 0 ],
                    distance: zasjd.distance && zasjd.distance > 0 ? zasjd.distance : 1e30,
                    color: zasjd.color ? [ zasjd.color.r, zasjd.color.g, zasjd.color.b ] : [ 1, 1, 1 ],
                    intensity: zasjd.intensity !== undefined ? zasjd.intensity : 1
                });
            } else if (zasjd && zasjd.position && zasjd.distance !== undefined) {
                zasjb.push({
                    position: [ zasjd.position[0] || 0, zasjd.position[1] || 0, zasjd.position[2] || 0 ],
                    distance: zasjd.distance > 0 ? zasjd.distance : 1e30,
                    color: zasjd.color || [ 1, 1, 1 ],
                    intensity: zasjd.intensity !== undefined ? zasjd.intensity : 1
                });
            } else if (zasjd && zasjd.position) {
                zasjb.push({
                    position: [ zasjd.position[0] || 0, zasjd.position[1] || 0, zasjd.position[2] || 0 ],
                    distance: zasjd.distance || 1e30,
                    color: zasjd.color || [ 1, 1, 1 ],
                    intensity: zasjd.intensity !== undefined ? zasjd.intensity : 1
                });
            }
        }
        return zasjb;
    }
    update(zasja) {
        if (!this.pipeline) return this;
        var zasjb = this.normalizeLights(zasja || []);
        var zasjc = new Float32Array(this.maxLights * 8);
        for (var zasjd = 0; zasjd < zasjb.length; zasjd++) {
            zasjc[zasjd * 8] = zasjb[zasjd].position[0];
            zasjc[zasjd * 8 + 1] = zasjb[zasjd].position[1];
            zasjc[zasjd * 8 + 2] = zasjb[zasjd].position[2];
            zasjc[zasjd * 8 + 3] = zasjb[zasjd].distance;
            zasjc[zasjd * 8 + 4] = zasjb[zasjd].color[0];
            zasjc[zasjd * 8 + 5] = zasjb[zasjd].color[1];
            zasjc[zasjd * 8 + 6] = zasjb[zasjd].color[2];
            zasjc[zasjd * 8 + 7] = zasjb[zasjd].intensity;
        }
        if (zasjb.length > 0) this.device.queue.writeBuffer(this.lightbuffer, 0, zasjc.subarray(0, zasjb.length * 8));
        var zasje = this.viewmatrix.elements;
        var zasjf = new Float32Array(32);
        for (var zasjg = 0; zasjg < 16; zasjg++) zasjf[zasjg] = zasje[zasjg];
        zasjf[16] = this.gridX;
        zasjf[17] = this.gridY;
        zasjf[18] = this.gridZ;
        zasjf[19] = zasjb.length;
        zasjf[20] = this.tanHalf;
        zasjf[21] = this.aspect;
        zasjf[22] = this.near;
        zasjf[23] = this.far;
        zasjf[24] = this.maxPerCluster;
        zasjf[25] = this.far / this.near;
        zasjf[26] = 0;
        zasjf[27] = 0;
        this.device.queue.writeBuffer(this.paramsbuffer, 0, zasjf);
        var zasjh = performance.now();
        var zasji = this.device.createCommandEncoder();
        var zasjj = zasji.beginComputePass();
        zasjj.setPipeline(this.pipeline);
        zasjj.setBindGroup(0, this.bind);
        zasjj.dispatchWorkgroups(Math.ceil(this.gridX / 8), Math.ceil(this.gridY / 8), Math.ceil(this.gridZ / 4));
        zasjj.end();
        this.device.queue.submit([ zasji.finish() ]);
        this.stats.lights = zasjb.length;
        this.stats.clustms = performance.now() - zasjh;
        this.normalized = zasjb;
        return this;
    }
    readback() {
        var zasja = this;
        var zasjb = this.device.createCommandEncoder();
        zasjb.copyBufferToBuffer(this.clusterbuffer, 0, this.readbackbuffer, 0, this.readbackbuffer.size);
        this.device.queue.submit([ zasjb.finish() ]);
        return this.device.queue.onSubmittedWorkDone().then(function() {
            return zasja.readbackbuffer.mapAsync(GPUMapMode.READ).then(function() {
                var zasjb = new Uint32Array(zasja.readbackbuffer.getMappedRange()).slice();
                zasja.readbackbuffer.unmap();
                var zasjc = 0;
                for (var zasjd = 0; zasjd < zasja.stats.froxels; zasjd++) zasjc += zasjb[zasjd * zasja.stride];
                zasja.stats.assigned = zasjc;
                return zasjb;
            });
        });
    }
    clusterOf(zasja) {
        var zasjb = -zasja[2];
        if (zasjb <= this.near || zasjb > this.far) return -1;
        var zasjc = Math.floor(this.gridZ * Math.log(zasjb / this.near) / Math.log(this.far / this.near));
        if (zasjc < 0) zasjc = 0;
        if (zasjc > this.gridZ - 1) zasjc = this.gridZ - 1;
        var zasjd = this.near * Math.pow(this.far / this.near, (zasjc + 1) / this.gridZ);
        var zasje = zasjd * this.tanHalf;
        var zasjf = zasje * this.aspect;
        var zasjg = Math.floor((zasja[0] + zasjf) / (2 * zasjf) * this.gridX);
        var zasjh = Math.floor((zasja[1] + zasje) / (2 * zasje) * this.gridY);
        if (zasjg < 0) zasjg = 0;
        if (zasjg > this.gridX - 1) zasjg = this.gridX - 1;
        if (zasjh < 0) zasjh = 0;
        if (zasjh > this.gridY - 1) zasjh = this.gridY - 1;
        return (zasjc * this.gridY + zasjh) * this.gridX + zasjg;
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
