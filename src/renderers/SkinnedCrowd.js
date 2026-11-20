import { Matrix4, Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

import { Object3D } from "../core/index.js";

import { Bone } from "../objects/Bone.js";

var zatza = `\nstruct Counts { agents: f32, bones: f32, phases: f32, clips: f32 };\nstruct AgentStatic { world: mat4x4<f32>, clip: f32, speed: f32, pad0: f32, pad1: f32 };\n@group(0) @binding(0) var<uniform> counts: Counts;\n@group(0) @binding(1) var<storage, read> statics: array<AgentStatic>;\n@group(0) @binding(2) var<storage, read> dyns: array<vec4<f32>>;\n@group(0) @binding(3) var<storage, read> poses: array<f32>;\n@group(0) @binding(4) var<storage, read_write> outbones: array<vec4<f32>>;\n@compute @workgroup_size(64)\nfn agentBones(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let nbones = u32(counts.bones);\n    let P = u32(counts.phases);\n    if (nbones == 0u || P == 0u) { return; }\n    let agent = gid.x / nbones;\n    let bone = gid.x % nbones;\n    if (agent >= u32(counts.agents)) { return; }\n    let clip = u32(statics[agent].clip);\n    let phase = dyns[agent].x;\n    let fi = phase * f32(P);\n    let i0 = u32(fi) % P;\n    let i1 = (i0 + 1u) % P;\n    let f = fi - floor(fi);\n    let baseA = ((clip * P + i0) * nbones + bone) * 16u;\n    let baseB = ((clip * P + i1) * nbones + bone) * 16u;\n    let ob = (agent * nbones + bone) * 4u;\n    for (var c = 0u; c < 4u; c = c + 1u) {\n        let va = vec4<f32>(poses[baseA + c * 4u], poses[baseA + c * 4u + 1u], poses[baseA + c * 4u + 2u], poses[baseA + c * 4u + 3u]);\n        let vb = vec4<f32>(poses[baseB + c * 4u], poses[baseB + c * 4u + 1u], poses[baseB + c * 4u + 2u], poses[baseB + c * 4u + 3u]);\n        outbones[ob + c] = mix(va, vb, f);\n    }\n}\n`;

var zatzb = `\nstruct RParams { viewProj: mat4x4<f32>, lightDir: vec4<f32>, lightColor: vec4<f32>, ambient: vec4<f32>, baseColor: vec4<f32>, params: vec4<f32> };\n@group(0) @binding(0) var<uniform> rparams: RParams;\n@group(0) @binding(1) var<storage, read> bones: array<vec4<f32>>;\nstruct VertexInput {\n    @location(0) position: vec3<f32>,\n    @location(1) normal: vec3<f32>,\n    @location(2) uv: vec2<f32>,\n    @location(3) skinIndex: vec4<u32>,\n    @location(4) skinWeight: vec4<f32>,\n    @location(5) instance0: vec4<f32>,\n    @location(6) instance1: vec4<f32>,\n    @location(7) instance2: vec4<f32>,\n    @location(8) instance3: vec4<f32>,\n    @location(9) agent: f32,\n    @location(10) tint: vec3<f32>\n};\nstruct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) worldNormal: vec3<f32>, @location(1) tint: vec3<f32> };\n@vertex\nfn vs(input: VertexInput) -> VertexOutput {\n    let nbones = u32(max(rparams.params.x, 1.0));\n    let agent = u32(max(input.agent, 0.0));\n    var cols = array<vec4<f32>, 4>(vec4<f32>(0.0), vec4<f32>(0.0), vec4<f32>(0.0), vec4<f32>(0.0));\n    var idxs = array<u32, 4>(input.skinIndex.x, input.skinIndex.y, input.skinIndex.z, input.skinIndex.w);\n    var wts = array<f32, 4>(input.skinWeight.x, input.skinWeight.y, input.skinWeight.z, input.skinWeight.w);\n    for (var k = 0u; k < 4u; k = k + 1u) {\n        let b = (agent * nbones + idxs[k]) * 4u;\n        cols[0] = cols[0] + bones[b] * wts[k];\n        cols[1] = cols[1] + bones[b + 1u] * wts[k];\n        cols[2] = cols[2] + bones[b + 2u] * wts[k];\n        cols[3] = cols[3] + bones[b + 3u] * wts[k];\n    }\n    let skin = mat4x4<f32>(cols[0], cols[1], cols[2], cols[3]);\n    var localPosition = (skin * vec4<f32>(input.position, 1.0)).xyz;\n    var localNormal = (skin * vec4<f32>(input.normal, 0.0)).xyz;\n    let instance = mat4x4<f32>(input.instance0, input.instance1, input.instance2, input.instance3);\n    let world = instance * vec4<f32>(localPosition, 1.0);\n    var output: VertexOutput;\n    output.position = rparams.viewProj * world;\n    output.position.z = output.position.z * 0.5 + output.position.w * 0.5;\n    let nmat = mat3x3<f32>(instance[0].xyz, instance[1].xyz, instance[2].xyz);\n    output.worldNormal = nmat * localNormal;\n    output.tint = input.tint;\n    return output;\n}\n@fragment\nfn fs(input: VertexOutput) -> @location(0) vec4<f32> {\n    let n = normalize(input.worldNormal);\n    let ndl = max(dot(n, -normalize(rparams.lightDir.xyz)), 0.0);\n    let lit = rparams.ambient.rgb + rparams.lightColor.rgb * ndl;\n    return vec4<f32>(rparams.baseColor.rgb * input.tint * lit, rparams.baseColor.a);\n}\n`;

function zatzc(zatza) {
    var zatzb = 1;
    while (zatzb < zatza) zatzb *= 2;
    return zatzb;
}

class SkinnedCrowd {
    constructor(zatzd, zatze) {
        zatze = zatze || {};
        if (!zatzd || !zatzd.device) throw new Error("SkinnedCrowd requires a WebGPURenderer");
        var zatzf = zatze.mesh;
        if (!zatzf || !zatzf.geometry) throw new Error("SkinnedCrowd requires a mesh with geometry");
        if (!zatzf.skeleton || !zatzf.skeleton.bones || !zatzf.skeleton.bones.length) throw new Error("SkinnedCrowd requires a mesh with a skeleton");
        var zatzg = zatzf.geometry;
        var zatzh = zatzg.getAttribute("position");
        var zatzi = zatzg.getAttribute("skinIndex");
        var zatzj = zatzg.getAttribute("skinWeight");
        if (!zatzh) throw new Error("SkinnedCrowd requires a position attribute");
        if (!zatzi || !zatzj) throw new Error("SkinnedCrowd requires skinIndex and skinWeight attributes");
        var zatzk = zatze.clips;
        if (!zatzk || !zatzk.length) throw new Error("SkinnedCrowd requires at least one AnimationClip");
        var zatzl = zatze.agents || [];
        if (!zatzl.length) throw new Error("SkinnedCrowd requires at least one agent");
        this.renderer = zatzd;
        this.device = zatzd.device;
        this.disposed = false;
        this.stats = {
            updates: 0,
            computePasses: 0,
            drawCalls: 0
        };
        this.mesh = zatzf;
        this.geometry = zatzg;
        this.skeleton = zatzf.skeleton;
        this.clips = zatzk.slice(0, 64);
        this.clipCount = this.clips.length;
        this.boneCount = this.skeleton.bones.length;
        this.phaseCount = Math.round(faoxomclamp(faoxomvalue(zatze.phases, 24), 2, 128));
        this.capacity = faoxomclamp(zatzc(zatzl.length), 1, 65536);
        this.agentCount = zatzl.length;
        this.baseColor = {
            r: faoxomvalue(zatze.color && zatze.color.r, 1),
            g: faoxomvalue(zatze.color && zatze.color.g, 1),
            b: faoxomvalue(zatze.color && zatze.color.b, 1),
            a: 1
        };
        this.lightDirection = new Vector3(.4, -1, .3);
        if (zatze.lightDirection && zatze.lightDirection.x !== undefined) this.lightDirection.set(zatze.lightDirection.x, zatze.lightDirection.y, zatze.lightDirection.z);
        this.lightColor = {
            r: faoxomvalue(zatze.lightColor && zatze.lightColor.r, 1),
            g: faoxomvalue(zatze.lightColor && zatze.lightColor.g, 1),
            b: faoxomvalue(zatze.lightColor && zatze.lightColor.b, 1)
        };
        this.ambient = {
            r: faoxomvalue(zatze.ambient && zatze.ambient.r, .25),
            g: faoxomvalue(zatze.ambient && zatze.ambient.g, .25),
            b: faoxomvalue(zatze.ambient && zatze.ambient.b, .25)
        };
        this._cloneRig();
        this._bakePoses();
        var zatzm = zatzh.array.length / zatzh.itemSize;
        this.vertexCount = zatzm;
        var zatzn = zatzh.array;
        var zatzo = zatzg.getAttribute("normal");
        var zatzp = zatzo ? zatzo.array : null;
        var zatzq = zatzg.getAttribute("uv");
        var zatzr = zatzq ? zatzq.array : null;
        var zatzs = this._vertexBuffer(new Float32Array(zatzn));
        var zatzt = zatzp ? this._vertexBuffer(new Float32Array(zatzp)) : this._vertexBuffer(new Float32Array(zatzm * 3));
        var zatzu = zatzr ? this._vertexBuffer(new Float32Array(zatzr)) : this._vertexBuffer(new Float32Array(zatzm * 2));
        var zatzv = new Uint32Array(zatzm * 4);
        for (var zatzw = 0; zatzw < zatzm * 4; zatzw++) zatzv[zatzw] = zatzi.array[zatzw] | 0;
        var zatzx = new Float32Array(zatzm * 4);
        for (var zatzy = 0; zatzy < zatzm * 4; zatzy++) zatzx[zatzy] = +zatzj.array[zatzy] || 0;
        this.skinIndexBuffer = this._vertexBuffer(zatzv);
        this.skinWeightBuffer = this._vertexBuffer(zatzx);
        this.positionBuffer = zatzs;
        this.normalBuffer = zatzt;
        this.uvBuffer = zatzu;
        this.indexFormat = null;
        this.indexBuffer = null;
        this.indexCount = 0;
        if (zatzg.index && zatzg.index.length) {
            var zatzz = 0;
            for (var zatzaa = 0; zatzaa < zatzg.index.length; zatzaa++) if (zatzg.index[zatzaa] > zatzz) zatzz = zatzg.index[zatzaa];
            var zatzab = zatzz > 65535 ? new Uint32Array(zatzg.index) : new Uint16Array(zatzg.index);
            this.indexFormat = zatzz > 65535 ? "uint32" : "uint16";
            this.indexCount = zatzab.length;
            this.indexBuffer = this.device.createBuffer({
                size: Math.ceil(zatzab.byteLength / 4) * 4,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.indexBuffer, 0, zatzab);
        } else this.indexCount = zatzm;
        this.poseBuffer = this.device.createBuffer({
            size: this.poseData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.poseBuffer, 0, this.poseData);
        this.staticBuffer = this.device.createBuffer({
            size: this.capacity * 80,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.dynBuffer = this.device.createBuffer({
            size: this.capacity * 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.bonesBuffer = this.device.createBuffer({
            size: this.capacity * this.boneCount * 16 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        this.readBuffer = this.device.createBuffer({
            size: this.boneCount * 16 * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        this.instanceMatrixBuffer = this.device.createBuffer({
            size: this.capacity * 64,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.instanceDataBuffer = this.device.createBuffer({
            size: this.capacity * 16,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.countsUniform = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.renderUniform = this.device.createBuffer({
            size: 144,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.computeModule = this.device.createShaderModule({
            code: zatza
        });
        this.computePipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.computeModule,
                entryPoint: "agentBones"
            }
        });
        this.computeBind = this.device.createBindGroup({
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.countsUniform
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.staticBuffer
                }
            }, {
                binding: 2,
                resource: {
                    buffer: this.dynBuffer
                }
            }, {
                binding: 3,
                resource: {
                    buffer: this.poseBuffer
                }
            }, {
                binding: 4,
                resource: {
                    buffer: this.bonesBuffer
                }
            } ]
        });
        this.renderModule = this.device.createShaderModule({
            code: zatzb
        });
        this.renderPipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.renderModule,
                entryPoint: "vs",
                buffers: [ {
                    arrayStride: 12,
                    attributes: [ {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    } ]
                }, {
                    arrayStride: 12,
                    attributes: [ {
                        shaderLocation: 1,
                        offset: 0,
                        format: "float32x3"
                    } ]
                }, {
                    arrayStride: 8,
                    attributes: [ {
                        shaderLocation: 2,
                        offset: 0,
                        format: "float32x2"
                    } ]
                }, {
                    arrayStride: 16,
                    attributes: [ {
                        shaderLocation: 3,
                        offset: 0,
                        format: "uint32x4"
                    } ]
                }, {
                    arrayStride: 16,
                    attributes: [ {
                        shaderLocation: 4,
                        offset: 0,
                        format: "float32x4"
                    } ]
                }, {
                    arrayStride: 64,
                    stepMode: "instance",
                    attributes: [ {
                        shaderLocation: 5,
                        offset: 0,
                        format: "float32x4"
                    }, {
                        shaderLocation: 6,
                        offset: 16,
                        format: "float32x4"
                    }, {
                        shaderLocation: 7,
                        offset: 32,
                        format: "float32x4"
                    }, {
                        shaderLocation: 8,
                        offset: 48,
                        format: "float32x4"
                    } ]
                }, {
                    arrayStride: 16,
                    stepMode: "instance",
                    attributes: [ {
                        shaderLocation: 9,
                        offset: 0,
                        format: "float32"
                    }, {
                        shaderLocation: 10,
                        offset: 4,
                        format: "float32x3"
                    } ]
                } ]
            },
            fragment: {
                module: this.renderModule,
                entryPoint: "fs",
                targets: [ {
                    format: zatzd.format || "bgra8unorm"
                } ]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
        this.renderBind = this.device.createBindGroup({
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: [ {
                binding: 0,
                resource: {
                    buffer: this.renderUniform
                }
            }, {
                binding: 1,
                resource: {
                    buffer: this.bonesBuffer
                }
            } ]
        });
        this.agents = [];
        this._writeAgents(zatzl);
    }
    _vertexBuffer(zatza) {
        var zatzb = this.device.createBuffer({
            size: Math.ceil(zatza.byteLength / 4) * 4,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(zatzb, 0, zatza);
        return zatzb;
    }
    _cloneRig() {
        var zatza = this.skeleton.bones;
        var zatzb = {};
        for (var zatzc = 0; zatzc < zatza.length; zatzc++) zatzb[zatza[zatzc].uuid || zatza[zatzc].name + "#" + zatzc] = true;
        this._cloneBones = [];
        this._cloneByName = {};
        this._cloneRoot = new Object3D;
        var zatzd = [];
        for (var zatze = 0; zatze < zatza.length; zatze++) {
            var zatzf = zatza[zatze];
            var zatzg = new Bone;
            zatzg.name = zatzf.name;
            zatzg.position.copy(zatzf.position);
            zatzg.quaternion.copy(zatzf.quaternion);
            zatzg.scale.copy(zatzf.scale);
            zatzd.push({
                position: zatzf.position.clone(),
                quaternion: zatzf.quaternion.clone(),
                scale: zatzf.scale.clone()
            });
            this._cloneBones.push(zatzg);
            this._cloneByName[zatzf.name] = zatzg;
        }
        for (var zatzh = 0; zatzh < zatza.length; zatzh++) {
            var zatzi = zatza[zatzh].parent;
            var zatzj = false;
            for (var zatzk = 0; zatzk < zatza.length; zatzk++) if (zatza[zatzk] === zatzi) {
                zatzj = true;
                break;
            }
            if (zatzj && this._cloneBones[zatzh] !== this._cloneByName[zatzi.name]) this._cloneByName[zatzi.name].add(this._cloneBones[zatzh]); else this._cloneRoot.add(this._cloneBones[zatzh]);
        }
        this._rest = zatzd;
        this._cloneRoot.updateMatrixWorld(true);
        this._restInverses = [];
        for (var zatzl = 0; zatzl < this._cloneBones.length; zatzl++) this._restInverses.push(this._cloneBones[zatzl].matrixWorld.clone().invert());
    }
    _applyClipToClone(zatza, zatzb) {
        var zatzc = this._cloneByName;
        for (var zatzd = 0; zatzd < this._cloneBones.length; zatzd++) {
            var zatze = this._cloneBones[zatzd];
            zatze.position.copy(this._rest[zatzd].position);
            zatze.quaternion.copy(this._rest[zatzd].quaternion);
            zatze.scale.copy(this._rest[zatzd].scale);
        }
        for (var zatzf = 0; zatzf < zatza.tracks.length; zatzf++) {
            var zatzg = zatza.tracks[zatzf];
            var zatzh = zatzg.name.lastIndexOf(".");
            if (zatzh <= 0) continue;
            var zatzi = zatzg.name.slice(0, zatzh);
            var zatzj = zatzg.name.slice(zatzh + 1);
            if (zatzj === "translation") zatzj = "position";
            if (zatzj === "rotation") zatzj = "quaternion";
            var zatzk = zatzc[zatzi];
            if (!zatzk) continue;
            var zatzl = zatzg.sample(zatzb);
            if (zatzj === "position" && zatzl && zatzl.x !== undefined) zatzk.position.copy(zatzl); else if (zatzj === "quaternion" && zatzl && zatzl.w !== undefined) zatzk.quaternion.copy(zatzl).normalize(); else if (zatzj === "scale" && zatzl && zatzl.x !== undefined) zatzk.scale.copy(zatzl);
        }
        this._cloneRoot.updateMatrixWorld(true);
    }
    _bakePoses() {
        var zatza = this.clips, zatzb = this.phaseCount, zatzc = this.boneCount;
        this.poseData = new Float32Array(this.clipCount * zatzb * zatzc * 16);
        for (var zatzd = 0; zatzd < this.clipCount; zatzd++) {
            var zatze = zatza[zatzd];
            var zatzf = zatze.duration || 0;
            for (var zatzg = 0; zatzg < zatzb; zatzg++) {
                var zatzh = zatzf > 0 ? zatzf * zatzg / zatzb : 0;
                this._applyClipToClone(zatze, zatzh);
                for (var zatzi = 0; zatzi < zatzc; zatzi++) {
                    var zatzj = (new Matrix4).multiplyMatrices(this._cloneBones[zatzi].matrixWorld, this._restInverses[zatzi]);
                    zatzj.toArray(this.poseData, (zatzd * zatzb + zatzg) * zatzc * 16 + zatzi * 16);
                }
            }
        }
        this._applyClipToClone(zatza[0], 0);
    }
    rebuildPoses() {
        this._requireAlive();
        this._bakePoses();
        this.device.queue.writeBuffer(this.poseBuffer, 0, this.poseData);
        return this;
    }
    _agentDefaults(zatza) {
        return {
            index: zatza,
            position: new Vector3(0, 0, 0),
            quaternion: new Quaternion,
            scale: 1,
            clip: 0,
            speed: 1,
            phase: zatza * .6180339887498949 % 1,
            tint: {
                r: 1,
                g: 1,
                b: 1
            }
        };
    }
    _writeAgents(zatza) {
        this.agents = [];
        var zatzb = new Float32Array(this.capacity * 20);
        var zatzc = new Float32Array(this.capacity * 4);
        var zatzd = new Float32Array(this.capacity * 16);
        var zatze = new Float32Array(this.capacity * 4);
        for (var zatzf = 0; zatzf < zatza.length; zatzf++) {
            var zatzg = zatza[zatzf] || {};
            var zatzh = this._agentDefaults(zatzf);
            if (zatzg.position && zatzg.position.x !== undefined) zatzh.position.set(zatzg.position.x, zatzg.position.y || 0, zatzg.position.z || 0);
            if (zatzg.rotationY !== undefined) zatzh.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), zatzg.rotationY);
            if (zatzg.quaternion && zatzg.quaternion.w !== undefined) zatzh.quaternion.copy(zatzg.quaternion);
            if (zatzg.scale !== undefined) zatzh.scale = Math.max(1e-4, +zatzg.scale || 1e-4);
            zatzh.clip = faoxomclamp(Math.round(faoxomvalue(zatzg.clip, 0)), 0, this.clipCount - 1);
            zatzh.speed = faoxomvalue(zatzg.speed, 1);
            zatzh.phase = faoxomclamp(faoxomvalue(zatzg.offset, zatzh.phase), 0, .999999);
            if (zatzg.phase !== undefined) zatzh.phase = faoxomclamp(+zatzg.phase % 1, 0, .999999);
            if (zatzg.tint && zatzg.tint.r !== undefined) zatzh.tint = {
                r: zatzg.tint.r,
                g: zatzg.tint.g === undefined ? 1 : zatzg.tint.g,
                b: zatzg.tint.b === undefined ? 1 : zatzg.tint.b
            };
            this.agents.push(zatzh);
            var zatzi = (new Matrix4).compose(zatzh.position, zatzh.quaternion, new Vector3(zatzh.scale, zatzh.scale, zatzh.scale));
            zatzi.toArray(zatzd, zatzf * 16);
            zatzb[zatzf * 20 + 16] = zatzh.clip;
            zatzb[zatzf * 20 + 17] = zatzh.speed;
            zatzc[zatzf * 4] = zatzh.phase;
            zatze[zatzf * 4] = zatzf;
            zatze[zatzf * 4 + 1] = zatzh.tint.r;
            zatze[zatzf * 4 + 2] = zatzh.tint.g;
            zatze[zatzf * 4 + 3] = zatzh.tint.b;
        }
        this.agentCount = zatza.length;
        this.device.queue.writeBuffer(this.instanceMatrixBuffer, 0, zatzd);
        this.device.queue.writeBuffer(this.instanceDataBuffer, 0, zatze);
        this.device.queue.writeBuffer(this.staticBuffer, 0, zatzb);
        this.device.queue.writeBuffer(this.dynBuffer, 0, zatzc);
        this._writeCounts();
        return this;
    }
    setAgents(zatza) {
        this._requireAlive();
        if (!zatza || !zatza.length) throw new Error("setAgents requires a non-empty list");
        if (zatza.length > this.capacity) throw new Error("setAgents exceeds capacity " + this.capacity);
        return this._writeAgents(zatza);
    }
    setAgent(zatza, zatzb) {
        this._requireAlive();
        if (zatza < 0 || zatza >= this.agentCount) throw new Error("agent index out of range");
        var zatzc = {};
        var zatzd = this.agents[zatza];
        zatzc.position = {
            x: zatzd.position.x,
            y: zatzd.position.y,
            z: zatzd.position.z
        };
        if (zatzd.quaternion) zatzc.quaternion = {
            x: zatzd.quaternion.x,
            y: zatzd.quaternion.y,
            z: zatzd.quaternion.z,
            w: zatzd.quaternion.w
        };
        if (zatzd.rotationYCached !== undefined) zatzc.rotationY = zatzd.rotationYCached;
        zatzc.scale = zatzd.scale;
        zatzc.clip = zatzd.clip;
        zatzc.speed = zatzd.speed;
        zatzc.offset = zatzd.phase;
        zatzc.tint = {
            r: zatzd.tint.r,
            g: zatzd.tint.g,
            b: zatzd.tint.b
        };
        for (var zatze in zatzb) zatzc[zatze] = zatzb[zatze];
        this._writeAgents(this.agents.map(function(zatzb, zatzd) {
            if (zatzd !== zatza) return zatzb;
            var zatze = zatzc;
            var zatzf = {
                position: zatze.position,
                quaternion: zatze.quaternion,
                rotationY: zatze.rotationY,
                scale: zatze.scale,
                clip: zatze.clip,
                speed: zatze.speed,
                offset: zatze.offset,
                tint: zatze.tint
            };
            return zatzf;
        }));
        return this;
    }
    getAgent(zatza) {
        if (zatza < 0 || zatza >= this.agentCount) return null;
        var zatzb = this.agents[zatza];
        return {
            position: {
                x: zatzb.position.x,
                y: zatzb.position.y,
                z: zatzb.position.z
            },
            clip: zatzb.clip,
            speed: zatzb.speed,
            phase: zatzb.phase,
            scale: zatzb.scale,
            tint: {
                r: zatzb.tint.r,
                g: zatzb.tint.g,
                b: zatzb.tint.b
            }
        };
    }
    _writeCounts() {
        var zatza = new Float32Array(4);
        zatza[0] = this.agentCount;
        zatza[1] = this.boneCount;
        zatza[2] = this.phaseCount;
        zatza[3] = this.clipCount;
        this.device.queue.writeBuffer(this.countsUniform, 0, zatza);
    }
    update(zatza) {
        this._requireAlive();
        if (zatza === undefined) zatza = 0;
        var zatzb = new Float32Array(this.capacity * 4);
        for (var zatzc = 0; zatzc < this.agentCount; zatzc++) {
            var zatzd = this.agents[zatzc];
            var zatze = this.clips[zatzd.clip] && this.clips[zatzd.clip].duration || 0;
            if (zatze > 0 && zatza !== 0) {
                zatzd.phase += zatza * zatzd.speed / zatze;
                zatzd.phase = zatzd.phase - Math.floor(zatzd.phase);
                if (zatzd.phase < 0) zatzd.phase += 1;
            }
            zatzb[zatzc * 4] = zatzd.phase;
        }
        this.device.queue.writeBuffer(this.dynBuffer, 0, zatzb);
        var zatzf = this.device.createCommandEncoder();
        var zatzg = zatzf.beginComputePass();
        zatzg.setPipeline(this.computePipeline);
        zatzg.setBindGroup(0, this.computeBind);
        zatzg.dispatchWorkgroups(Math.ceil(this.agentCount * this.boneCount / 64));
        zatzg.end();
        this.device.queue.submit([ zatzf.finish() ]);
        this.stats.updates++;
        this.stats.computePasses++;
        return this;
    }
    render(zatza, zatzb, zatzc) {
        this._requireAlive();
        if (!zatza) throw new Error("render requires a color texture or view");
        if (zatza.createView) zatza = zatza.createView();
        if (!zatzb) throw new Error("render requires a depth texture or view");
        if (zatzb.createView) zatzb = zatzb.createView();
        if (!zatzc || !zatzc.projectionMatrix || !zatzc.matrixWorldInverse) throw new Error("render requires a camera");
        var zatzd = (new Matrix4).multiplyMatrices(zatzc.projectionMatrix, zatzc.matrixWorldInverse);
        var zatze = new Float32Array(36);
        zatze.set(zatzd.elements, 0);
        zatze[16] = this.lightDirection.x;
        zatze[17] = this.lightDirection.y;
        zatze[18] = this.lightDirection.z;
        zatze[19] = 0;
        zatze[20] = this.lightColor.r;
        zatze[21] = this.lightColor.g;
        zatze[22] = this.lightColor.b;
        zatze[23] = 1;
        zatze[24] = this.ambient.r;
        zatze[25] = this.ambient.g;
        zatze[26] = this.ambient.b;
        zatze[27] = 1;
        zatze[28] = this.baseColor.r;
        zatze[29] = this.baseColor.g;
        zatze[30] = this.baseColor.b;
        zatze[31] = this.baseColor.a;
        zatze[32] = this.boneCount;
        this.device.queue.writeBuffer(this.renderUniform, 0, zatze);
        var zatzf = this.device.createCommandEncoder();
        var zatzg = zatzf.beginRenderPass({
            colorAttachments: [ {
                view: zatza,
                loadOp: "load",
                storeOp: "store"
            } ],
            depthStencilAttachment: {
                view: zatzb,
                depthLoadOp: "load",
                depthStoreOp: "store"
            }
        });
        zatzg.setPipeline(this.renderPipeline);
        zatzg.setBindGroup(0, this.renderBind);
        zatzg.setVertexBuffer(0, this.positionBuffer);
        zatzg.setVertexBuffer(1, this.normalBuffer);
        zatzg.setVertexBuffer(2, this.uvBuffer);
        zatzg.setVertexBuffer(3, this.skinIndexBuffer);
        zatzg.setVertexBuffer(4, this.skinWeightBuffer);
        zatzg.setVertexBuffer(5, this.instanceMatrixBuffer);
        zatzg.setVertexBuffer(6, this.instanceDataBuffer);
        if (this.indexBuffer) {
            zatzg.setIndexBuffer(this.indexBuffer, this.indexFormat);
            zatzg.drawIndexed(this.indexCount, this.agentCount);
        } else zatzg.draw(this.indexCount, this.agentCount);
        zatzg.end();
        this.device.queue.submit([ zatzf.finish() ]);
        this.stats.drawCalls++;
        return this;
    }
    samplePose(zatza, zatzb) {
        zatza = Math.round(zatza) || 0;
        zatzb = faoxomclamp(zatzb, 0, .999999);
        var zatzc = this.phaseCount, zatzd = this.boneCount;
        var zatze = Math.floor(zatzb * zatzc) % zatzc;
        var zatzf = (zatze + 1) % zatzc;
        var zatzg = zatzb * zatzc - Math.floor(zatzb * zatzc);
        var zatzh = new Float32Array(zatzd * 16);
        var zatzi = (zatza * zatzc + zatze) * zatzd * 16;
        var zatzj = (zatza * zatzc + zatzf) * zatzd * 16;
        for (var zatzk = 0; zatzk < zatzd * 16; zatzk++) zatzh[zatzk] = this.poseData[zatzi + zatzk] * (1 - zatzg) + this.poseData[zatzj + zatzk] * zatzg;
        return zatzh;
    }
    samplePoseExact(zatza, zatzb) {
        var zatzc = this.boneCount;
        var zatzd = (zatza * this.phaseCount + zatzb % this.phaseCount) * zatzc * 16;
        return this.poseData.slice(zatzd, zatzd + zatzc * 16);
    }
    readAgentBones(zatza) {
        this._requireAlive();
        if (zatza < 0 || zatza >= this.agentCount) throw new Error("agent index out of range");
        var zatzb = this.device.createCommandEncoder();
        zatzb.copyBufferToBuffer(this.bonesBuffer, zatza * this.boneCount * 16 * 4, this.readBuffer, 0, this.boneCount * 16 * 4);
        this.device.queue.submit([ zatzb.finish() ]);
        var zatzc = this;
        return this.readBuffer.mapAsync(GPUMapMode.READ).then(function() {
            var zatza = new Float32Array(zatzc.readBuffer.getMappedRange().slice(0));
            zatzc.readBuffer.unmap();
            return zatza;
        });
    }
    setLight(zatza, zatzb, zatzc) {
        if (zatza && zatza.x !== undefined) this.lightDirection.set(zatza.x, zatza.y, zatza.z);
        if (zatzb && zatzb.r !== undefined) this.lightColor = {
            r: zatzb.r,
            g: zatzb.g,
            b: zatzb.b
        };
        if (zatzc && zatzc.r !== undefined) this.ambient = {
            r: zatzc.r,
            g: zatzc.g,
            b: zatzc.b
        };
        return this;
    }
    setColor(zatza) {
        if (zatza && zatza.r !== undefined) this.baseColor = {
            r: zatza.r,
            g: zatza.g === undefined ? 1 : zatza.g,
            b: zatza.b === undefined ? 1 : zatza.b,
            a: 1
        };
        return this;
    }
    _requireAlive() {
        if (this.disposed) throw new Error("SkinnedCrowd is disposed");
    }
    dispose() {
        if (this.disposed) return this;
        this.disposed = true;
        var zatza = [ this.poseBuffer, this.staticBuffer, this.dynBuffer, this.bonesBuffer, this.readBuffer, this.instanceMatrixBuffer, this.instanceDataBuffer, this.countsUniform, this.renderUniform, this.positionBuffer, this.normalBuffer, this.uvBuffer, this.skinIndexBuffer, this.skinWeightBuffer, this.indexBuffer ];
        for (var zatzb = 0; zatzb < zatza.length; zatzb++) if (zatza[zatzb]) zatza[zatzb].destroy();
        this.agents = [];
        return this;
    }
}

export { SkinnedCrowd };
