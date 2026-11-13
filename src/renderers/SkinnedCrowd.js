import { Matrix4, Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";
import { Object3D } from "../core/index.js";
import { Bone } from "../objects/Bone.js";

var COMPUTE_WGSL = `
struct Counts { agents: f32, bones: f32, phases: f32, clips: f32 };
struct AgentStatic { world: mat4x4<f32>, clip: f32, speed: f32, pad0: f32, pad1: f32 };
@group(0) @binding(0) var<uniform> counts: Counts;
@group(0) @binding(1) var<storage, read> statics: array<AgentStatic>;
@group(0) @binding(2) var<storage, read> dyns: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> poses: array<f32>;
@group(0) @binding(4) var<storage, read_write> outbones: array<vec4<f32>>;
@compute @workgroup_size(64)
fn agentBones(@builtin(global_invocation_id) gid: vec3<u32>) {
    let nbones = u32(counts.bones);
    let P = u32(counts.phases);
    if (nbones == 0u || P == 0u) { return; }
    let agent = gid.x / nbones;
    let bone = gid.x % nbones;
    if (agent >= u32(counts.agents)) { return; }
    let clip = u32(statics[agent].clip);
    let phase = dyns[agent].x;
    let fi = phase * f32(P);
    let i0 = u32(fi) % P;
    let i1 = (i0 + 1u) % P;
    let f = fi - floor(fi);
    let baseA = ((clip * P + i0) * nbones + bone) * 16u;
    let baseB = ((clip * P + i1) * nbones + bone) * 16u;
    let ob = (agent * nbones + bone) * 4u;
    for (var c = 0u; c < 4u; c = c + 1u) {
        let va = vec4<f32>(poses[baseA + c * 4u], poses[baseA + c * 4u + 1u], poses[baseA + c * 4u + 2u], poses[baseA + c * 4u + 3u]);
        let vb = vec4<f32>(poses[baseB + c * 4u], poses[baseB + c * 4u + 1u], poses[baseB + c * 4u + 2u], poses[baseB + c * 4u + 3u]);
        outbones[ob + c] = mix(va, vb, f);
    }
}
`;

var RENDER_WGSL = `
struct RParams { viewProj: mat4x4<f32>, lightDir: vec4<f32>, lightColor: vec4<f32>, ambient: vec4<f32>, baseColor: vec4<f32>, params: vec4<f32> };
@group(0) @binding(0) var<uniform> rparams: RParams;
@group(0) @binding(1) var<storage, read> bones: array<vec4<f32>>;
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) skinIndex: vec4<u32>,
    @location(4) skinWeight: vec4<f32>,
    @location(5) instance0: vec4<f32>,
    @location(6) instance1: vec4<f32>,
    @location(7) instance2: vec4<f32>,
    @location(8) instance3: vec4<f32>,
    @location(9) agent: f32,
    @location(10) tint: vec3<f32>
};
struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) worldNormal: vec3<f32>, @location(1) tint: vec3<f32> };
@vertex
fn vs(input: VertexInput) -> VertexOutput {
    let nbones = u32(max(rparams.params.x, 1.0));
    let agent = u32(max(input.agent, 0.0));
    var cols = array<vec4<f32>, 4>(vec4<f32>(0.0), vec4<f32>(0.0), vec4<f32>(0.0), vec4<f32>(0.0));
    var idxs = array<u32, 4>(input.skinIndex.x, input.skinIndex.y, input.skinIndex.z, input.skinIndex.w);
    var wts = array<f32, 4>(input.skinWeight.x, input.skinWeight.y, input.skinWeight.z, input.skinWeight.w);
    for (var k = 0u; k < 4u; k = k + 1u) {
        let b = (agent * nbones + idxs[k]) * 4u;
        cols[0] = cols[0] + bones[b] * wts[k];
        cols[1] = cols[1] + bones[b + 1u] * wts[k];
        cols[2] = cols[2] + bones[b + 2u] * wts[k];
        cols[3] = cols[3] + bones[b + 3u] * wts[k];
    }
    let skin = mat4x4<f32>(cols[0], cols[1], cols[2], cols[3]);
    var localPosition = (skin * vec4<f32>(input.position, 1.0)).xyz;
    var localNormal = (skin * vec4<f32>(input.normal, 0.0)).xyz;
    let instance = mat4x4<f32>(input.instance0, input.instance1, input.instance2, input.instance3);
    let world = instance * vec4<f32>(localPosition, 1.0);
    var output: VertexOutput;
    output.position = rparams.viewProj * world;
    output.position.z = output.position.z * 0.5 + output.position.w * 0.5;
    let nmat = mat3x3<f32>(instance[0].xyz, instance[1].xyz, instance[2].xyz);
    output.worldNormal = nmat * localNormal;
    output.tint = input.tint;
    return output;
}
@fragment
fn fs(input: VertexOutput) -> @location(0) vec4<f32> {
    let n = normalize(input.worldNormal);
    let ndl = max(dot(n, -normalize(rparams.lightDir.xyz)), 0.0);
    let lit = rparams.ambient.rgb + rparams.lightColor.rgb * ndl;
    return vec4<f32>(rparams.baseColor.rgb * input.tint * lit, rparams.baseColor.a);
}
`;

function nextPow2(n) { var p = 1; while (p < n) p *= 2; return p; }

class SkinnedCrowd {
    constructor(renderer, options) {
        options = options || {};
        if (!renderer || !renderer.device) throw new Error("SkinnedCrowd requires a WebGPURenderer");
        var mesh = options.mesh;
        if (!mesh || !mesh.geometry) throw new Error("SkinnedCrowd requires a mesh with geometry");
        if (!mesh.skeleton || !mesh.skeleton.bones || !mesh.skeleton.bones.length) throw new Error("SkinnedCrowd requires a mesh with a skeleton");
        var geometry = mesh.geometry;
        var positionAttr = geometry.getAttribute("position");
        var skinIndexAttr = geometry.getAttribute("skinIndex");
        var skinWeightAttr = geometry.getAttribute("skinWeight");
        if (!positionAttr) throw new Error("SkinnedCrowd requires a position attribute");
        if (!skinIndexAttr || !skinWeightAttr) throw new Error("SkinnedCrowd requires skinIndex and skinWeight attributes");
        var clips = options.clips;
        if (!clips || !clips.length) throw new Error("SkinnedCrowd requires at least one AnimationClip");
        var agents = options.agents || [];
        if (!agents.length) throw new Error("SkinnedCrowd requires at least one agent");

        this.renderer = renderer;
        this.device = renderer.device;
        this.disposed = false;
        this.stats = { updates: 0, computePasses: 0, drawCalls: 0 };

        this.mesh = mesh;
        this.geometry = geometry;
        this.skeleton = mesh.skeleton;
        this.clips = clips.slice(0, 64);
        this.clipCount = this.clips.length;
        this.boneCount = this.skeleton.bones.length;
        this.phaseCount = Math.round(faoxomclamp(faoxomvalue(options.phases, 24), 2, 128));
        this.capacity = faoxomclamp(nextPow2(agents.length), 1, 65536);
        this.agentCount = agents.length;

        this.baseColor = { r: faoxomvalue(options.color && options.color.r, 1), g: faoxomvalue(options.color && options.color.g, 1), b: faoxomvalue(options.color && options.color.b, 1), a: 1 };
        this.lightDirection = new Vector3(0.4, -1, 0.3);
        if (options.lightDirection && options.lightDirection.x !== undefined) this.lightDirection.set(options.lightDirection.x, options.lightDirection.y, options.lightDirection.z);
        this.lightColor = { r: faoxomvalue(options.lightColor && options.lightColor.r, 1), g: faoxomvalue(options.lightColor && options.lightColor.g, 1), b: faoxomvalue(options.lightColor && options.lightColor.b, 1) };
        this.ambient = { r: faoxomvalue(options.ambient && options.ambient.r, 0.25), g: faoxomvalue(options.ambient && options.ambient.g, 0.25), b: faoxomvalue(options.ambient && options.ambient.b, 0.25) };

        this._cloneRig();
        this._bakePoses();

        var vertexCount = positionAttr.array.length / positionAttr.itemSize;
        this.vertexCount = vertexCount;

        var positionArray = positionAttr.array;
        var normalAttr = geometry.getAttribute("normal");
        var normalArray = normalAttr ? normalAttr.array : null;
        var uvAttr = geometry.getAttribute("uv");
        var uvArray = uvAttr ? uvAttr.array : null;

        var positionBuffer = this._vertexBuffer(new Float32Array(positionArray));
        var normalBuffer = normalArray ? this._vertexBuffer(new Float32Array(normalArray)) : this._vertexBuffer(new Float32Array(vertexCount * 3));
        var uvBuffer = uvArray ? this._vertexBuffer(new Float32Array(uvArray)) : this._vertexBuffer(new Float32Array(vertexCount * 2));

        var skinIndexArray = new Uint32Array(vertexCount * 4);
        for (var si = 0; si < vertexCount * 4; si++) skinIndexArray[si] = skinIndexAttr.array[si] | 0;
        var skinWeightArray = new Float32Array(vertexCount * 4);
        for (var sw = 0; sw < vertexCount * 4; sw++) skinWeightArray[sw] = +skinWeightAttr.array[sw] || 0;

        this.skinIndexBuffer = this._vertexBuffer(skinIndexArray);
        this.skinWeightBuffer = this._vertexBuffer(skinWeightArray);
        this.positionBuffer = positionBuffer;
        this.normalBuffer = normalBuffer;
        this.uvBuffer = uvBuffer;

        this.indexFormat = null;
        this.indexBuffer = null;
        this.indexCount = 0;
        if (geometry.index && geometry.index.length) {
            var maxIndex = 0;
            for (var mi = 0; mi < geometry.index.length; mi++) if (geometry.index[mi] > maxIndex) maxIndex = geometry.index[mi];
            var indexArray = maxIndex > 65535 ? new Uint32Array(geometry.index) : new Uint16Array(geometry.index);
            this.indexFormat = maxIndex > 65535 ? "uint32" : "uint16";
            this.indexCount = indexArray.length;
            this.indexBuffer = this.device.createBuffer({ size: Math.ceil(indexArray.byteLength / 4) * 4, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
            this.device.queue.writeBuffer(this.indexBuffer, 0, indexArray);
        } else this.indexCount = vertexCount;

        this.poseBuffer = this.device.createBuffer({ size: this.poseData.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(this.poseBuffer, 0, this.poseData);

        this.staticBuffer = this.device.createBuffer({ size: this.capacity * 80, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.dynBuffer = this.device.createBuffer({ size: this.capacity * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this.bonesBuffer = this.device.createBuffer({ size: this.capacity * this.boneCount * 16 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
        this.readBuffer = this.device.createBuffer({ size: this.boneCount * 16 * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });

        this.instanceMatrixBuffer = this.device.createBuffer({ size: this.capacity * 64, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        this.instanceDataBuffer = this.device.createBuffer({ size: this.capacity * 16, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });

        this.countsUniform = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.renderUniform = this.device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

        this.computeModule = this.device.createShaderModule({ code: COMPUTE_WGSL });
        this.computePipeline = this.device.createComputePipeline({ layout: "auto", compute: { module: this.computeModule, entryPoint: "agentBones" } });
        this.computeBind = this.device.createBindGroup({
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.countsUniform } },
                { binding: 1, resource: { buffer: this.staticBuffer } },
                { binding: 2, resource: { buffer: this.dynBuffer } },
                { binding: 3, resource: { buffer: this.poseBuffer } },
                { binding: 4, resource: { buffer: this.bonesBuffer } }
            ]
        });

        this.renderModule = this.device.createShaderModule({ code: RENDER_WGSL });
        this.renderPipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.renderModule, entryPoint: "vs",
                buffers: [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                    { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
                    { arrayStride: 16, attributes: [{ shaderLocation: 3, offset: 0, format: "uint32x4" }] },
                    { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] },
                    { arrayStride: 64, stepMode: "instance", attributes: [
                        { shaderLocation: 5, offset: 0, format: "float32x4" },
                        { shaderLocation: 6, offset: 16, format: "float32x4" },
                        { shaderLocation: 7, offset: 32, format: "float32x4" },
                        { shaderLocation: 8, offset: 48, format: "float32x4" }
                    ] },
                    { arrayStride: 16, stepMode: "instance", attributes: [
                        { shaderLocation: 9, offset: 0, format: "float32" },
                        { shaderLocation: 10, offset: 4, format: "float32x3" }
                    ] }
                ]
            },
            fragment: { module: this.renderModule, entryPoint: "fs", targets: [{ format: renderer.format || "bgra8unorm" }] },
            primitive: { topology: "triangle-list", cullMode: "none" },
            depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" }
        });
        this.renderBind = this.device.createBindGroup({
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.renderUniform } },
                { binding: 1, resource: { buffer: this.bonesBuffer } }
            ]
        });

        this.agents = [];
        this._writeAgents(agents);
    }

    _vertexBuffer(array) {
        var buffer = this.device.createBuffer({ size: Math.ceil(array.byteLength / 4) * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(buffer, 0, array);
        return buffer;
    }

    _cloneRig() {
        var bones = this.skeleton.bones;
        var inSkeleton = {};
        for (var i = 0; i < bones.length; i++) inSkeleton[bones[i].uuid || bones[i].name + "#" + i] = true;
        this._cloneBones = [];
        this._cloneByName = {};
        this._cloneRoot = new Object3D();
        var rest = [];
        for (var b = 0; b < bones.length; b++) {
            var original = bones[b];
            var clone = new Bone();
            clone.name = original.name;
            clone.position.copy(original.position);
            clone.quaternion.copy(original.quaternion);
            clone.scale.copy(original.scale);
            rest.push({ position: original.position.clone(), quaternion: original.quaternion.clone(), scale: original.scale.clone() });
            this._cloneBones.push(clone);
            this._cloneByName[original.name] = clone;
        }
        for (var c = 0; c < bones.length; c++) {
            var parent = bones[c].parent;
            var parentIsBone = false;
            for (var p = 0; p < bones.length; p++) if (bones[p] === parent) { parentIsBone = true; break; }
            if (parentIsBone && this._cloneBones[c] !== this._cloneByName[parent.name]) this._cloneByName[parent.name].add(this._cloneBones[c]);
            else this._cloneRoot.add(this._cloneBones[c]);
        }
        this._rest = rest;
        this._cloneRoot.updateMatrixWorld(true);
        this._restInverses = [];
        for (var r = 0; r < this._cloneBones.length; r++) this._restInverses.push(this._cloneBones[r].matrixWorld.clone().invert());
    }

    _applyClipToClone(clip, time) {
        var cloneByName = this._cloneByName;
        for (var r = 0; r < this._cloneBones.length; r++) {
            var bone = this._cloneBones[r];
            bone.position.copy(this._rest[r].position);
            bone.quaternion.copy(this._rest[r].quaternion);
            bone.scale.copy(this._rest[r].scale);
        }
        for (var t = 0; t < clip.tracks.length; t++) {
            var track = clip.tracks[t];
            var dot = track.name.lastIndexOf(".");
            if (dot <= 0) continue;
            var boneName = track.name.slice(0, dot);
            var property = track.name.slice(dot + 1);
            if (property === "translation") property = "position";
            if (property === "rotation") property = "quaternion";
            var target = cloneByName[boneName];
            if (!target) continue;
            var value = track.sample(time);
            if (property === "position" && value && value.x !== undefined) target.position.copy(value);
            else if (property === "quaternion" && value && value.w !== undefined) target.quaternion.copy(value).normalize();
            else if (property === "scale" && value && value.x !== undefined) target.scale.copy(value);
        }
        this._cloneRoot.updateMatrixWorld(true);
    }

    _bakePoses() {
        var clips = this.clips, P = this.phaseCount, nbones = this.boneCount;
        this.poseData = new Float32Array(this.clipCount * P * nbones * 16);
        for (var c = 0; c < this.clipCount; c++) {
            var clip = clips[c];
            var duration = clip.duration || 0;
            for (var p = 0; p < P; p++) {
                var time = duration > 0 ? duration * p / P : 0;
                this._applyClipToClone(clip, time);
                for (var b = 0; b < nbones; b++) {
                    var skin = new Matrix4().multiplyMatrices(this._cloneBones[b].matrixWorld, this._restInverses[b]);
                    skin.toArray(this.poseData, (c * P + p) * nbones * 16 + b * 16);
                }
            }
        }
        this._applyClipToClone(clips[0], 0);
    }

    rebuildPoses() {
        this._requireAlive();
        this._bakePoses();
        this.device.queue.writeBuffer(this.poseBuffer, 0, this.poseData);
        return this;
    }

    _agentDefaults(index) {
        return {
            index: index,
            position: new Vector3(0, 0, 0),
            quaternion: new Quaternion(),
            scale: 1,
            clip: 0,
            speed: 1,
            phase: (index * 0.6180339887498949) % 1,
            tint: { r: 1, g: 1, b: 1 }
        };
    }

    _writeAgents(list) {
        this.agents = [];
        var statics = new Float32Array(this.capacity * 20);
        var dyns = new Float32Array(this.capacity * 4);
        var matrices = new Float32Array(this.capacity * 16);
        var instanceData = new Float32Array(this.capacity * 4);
        for (var i = 0; i < list.length; i++) {
            var source = list[i] || {};
            var agent = this._agentDefaults(i);
            if (source.position && source.position.x !== undefined) agent.position.set(source.position.x, source.position.y || 0, source.position.z || 0);
            if (source.rotationY !== undefined) agent.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), source.rotationY);
            if (source.quaternion && source.quaternion.w !== undefined) agent.quaternion.copy(source.quaternion);
            if (source.scale !== undefined) agent.scale = Math.max(0.0001, +source.scale || 0.0001);
            agent.clip = faoxomclamp(Math.round(faoxomvalue(source.clip, 0)), 0, this.clipCount - 1);
            agent.speed = faoxomvalue(source.speed, 1);
            agent.phase = faoxomclamp(faoxomvalue(source.offset, agent.phase), 0, 0.999999);
            if (source.phase !== undefined) agent.phase = faoxomclamp(+source.phase % 1, 0, 0.999999);
            if (source.tint && source.tint.r !== undefined) agent.tint = { r: source.tint.r, g: source.tint.g === undefined ? 1 : source.tint.g, b: source.tint.b === undefined ? 1 : source.tint.b };
            this.agents.push(agent);

            var world = new Matrix4().compose(agent.position, agent.quaternion, new Vector3(agent.scale, agent.scale, agent.scale));
            world.toArray(matrices, i * 16);
            statics[i * 20 + 16] = agent.clip;
            statics[i * 20 + 17] = agent.speed;
            dyns[i * 4] = agent.phase;
            instanceData[i * 4] = i;
            instanceData[i * 4 + 1] = agent.tint.r;
            instanceData[i * 4 + 2] = agent.tint.g;
            instanceData[i * 4 + 3] = agent.tint.b;
        }
        this.agentCount = list.length;
        this.device.queue.writeBuffer(this.instanceMatrixBuffer, 0, matrices);
        this.device.queue.writeBuffer(this.instanceDataBuffer, 0, instanceData);
        this.device.queue.writeBuffer(this.staticBuffer, 0, statics);
        this.device.queue.writeBuffer(this.dynBuffer, 0, dyns);
        this._writeCounts();
        return this;
    }

    setAgents(list) {
        this._requireAlive();
        if (!list || !list.length) throw new Error("setAgents requires a non-empty list");
        if (list.length > this.capacity) throw new Error("setAgents exceeds capacity " + this.capacity);
        return this._writeAgents(list);
    }

    setAgent(index, props) {
        this._requireAlive();
        if (index < 0 || index >= this.agentCount) throw new Error("agent index out of range");
        var merged = {};
        var current = this.agents[index];
        merged.position = { x: current.position.x, y: current.position.y, z: current.position.z };
        if (current.quaternion) merged.quaternion = { x: current.quaternion.x, y: current.quaternion.y, z: current.quaternion.z, w: current.quaternion.w };
        if (current.rotationYCached !== undefined) merged.rotationY = current.rotationYCached;
        merged.scale = current.scale;
        merged.clip = current.clip;
        merged.speed = current.speed;
        merged.offset = current.phase;
        merged.tint = { r: current.tint.r, g: current.tint.g, b: current.tint.b };
        for (var key in props) merged[key] = props[key];
        this._writeAgents(this.agents.map(function (agent, i) {
            if (i !== index) return agent;
            var source = merged;
            var copy = {
                position: source.position, quaternion: source.quaternion, rotationY: source.rotationY,
                scale: source.scale, clip: source.clip, speed: source.speed, offset: source.offset, tint: source.tint
            };
            return copy;
        }));
        return this;
    }

    getAgent(index) {
        if (index < 0 || index >= this.agentCount) return null;
        var agent = this.agents[index];
        return { position: { x: agent.position.x, y: agent.position.y, z: agent.position.z }, clip: agent.clip, speed: agent.speed, phase: agent.phase, scale: agent.scale, tint: { r: agent.tint.r, g: agent.tint.g, b: agent.tint.b } };
    }

    _writeCounts() {
        var counts = new Float32Array(4);
        counts[0] = this.agentCount;
        counts[1] = this.boneCount;
        counts[2] = this.phaseCount;
        counts[3] = this.clipCount;
        this.device.queue.writeBuffer(this.countsUniform, 0, counts);
    }

    update(dt) {
        this._requireAlive();
        if (dt === undefined) dt = 0;
        var dyns = new Float32Array(this.capacity * 4);
        for (var i = 0; i < this.agentCount; i++) {
            var agent = this.agents[i];
            var duration = this.clips[agent.clip] && this.clips[agent.clip].duration || 0;
            if (duration > 0 && dt !== 0) {
                agent.phase += dt * agent.speed / duration;
                agent.phase = agent.phase - Math.floor(agent.phase);
                if (agent.phase < 0) agent.phase += 1;
            }
            dyns[i * 4] = agent.phase;
        }
        this.device.queue.writeBuffer(this.dynBuffer, 0, dyns);
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginComputePass();
        pass.setPipeline(this.computePipeline);
        pass.setBindGroup(0, this.computeBind);
        pass.dispatchWorkgroups(Math.ceil(this.agentCount * this.boneCount / 64));
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.stats.updates++;
        this.stats.computePasses++;
        return this;
    }

    render(view, depthView, camera) {
        this._requireAlive();
        if (!view) throw new Error("render requires a color texture or view");
        if (view.createView) view = view.createView();
        if (!depthView) throw new Error("render requires a depth texture or view");
        if (depthView.createView) depthView = depthView.createView();
        if (!camera || !camera.projectionMatrix || !camera.matrixWorldInverse) throw new Error("render requires a camera");
        var vp = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        var rdata = new Float32Array(36);
        rdata.set(vp.elements, 0);
        rdata[16] = this.lightDirection.x; rdata[17] = this.lightDirection.y; rdata[18] = this.lightDirection.z; rdata[19] = 0;
        rdata[20] = this.lightColor.r; rdata[21] = this.lightColor.g; rdata[22] = this.lightColor.b; rdata[23] = 1;
        rdata[24] = this.ambient.r; rdata[25] = this.ambient.g; rdata[26] = this.ambient.b; rdata[27] = 1;
        rdata[28] = this.baseColor.r; rdata[29] = this.baseColor.g; rdata[30] = this.baseColor.b; rdata[31] = this.baseColor.a;
        rdata[32] = this.boneCount;
        this.device.queue.writeBuffer(this.renderUniform, 0, rdata);
        var encoder = this.device.createCommandEncoder();
        var pass = encoder.beginRenderPass({
            colorAttachments: [{ view: view, loadOp: "load", storeOp: "store" }],
            depthStencilAttachment: { view: depthView, depthLoadOp: "load", depthStoreOp: "store" }
        });
        pass.setPipeline(this.renderPipeline);
        pass.setBindGroup(0, this.renderBind);
        pass.setVertexBuffer(0, this.positionBuffer);
        pass.setVertexBuffer(1, this.normalBuffer);
        pass.setVertexBuffer(2, this.uvBuffer);
        pass.setVertexBuffer(3, this.skinIndexBuffer);
        pass.setVertexBuffer(4, this.skinWeightBuffer);
        pass.setVertexBuffer(5, this.instanceMatrixBuffer);
        pass.setVertexBuffer(6, this.instanceDataBuffer);
        if (this.indexBuffer) {
            pass.setIndexBuffer(this.indexBuffer, this.indexFormat);
            pass.drawIndexed(this.indexCount, this.agentCount);
        } else pass.draw(this.indexCount, this.agentCount);
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.stats.drawCalls++;
        return this;
    }

    samplePose(clipIndex, phase) {
        clipIndex = Math.round(clipIndex) || 0;
        phase = faoxomclamp(phase, 0, 0.999999);
        var P = this.phaseCount, nbones = this.boneCount;
        var i0 = Math.floor(phase * P) % P;
        var i1 = (i0 + 1) % P;
        var f = phase * P - Math.floor(phase * P);
        var out = new Float32Array(nbones * 16);
        var baseA = (clipIndex * P + i0) * nbones * 16;
        var baseB = (clipIndex * P + i1) * nbones * 16;
        for (var e = 0; e < nbones * 16; e++) out[e] = this.poseData[baseA + e] * (1 - f) + this.poseData[baseB + e] * f;
        return out;
    }

    samplePoseExact(clipIndex, phaseIndex) {
        var nbones = this.boneCount;
        var base = (clipIndex * this.phaseCount + (phaseIndex % this.phaseCount)) * nbones * 16;
        return this.poseData.slice(base, base + nbones * 16);
    }

    readAgentBones(agentIndex) {
        this._requireAlive();
        if (agentIndex < 0 || agentIndex >= this.agentCount) throw new Error("agent index out of range");
        var encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.bonesBuffer, agentIndex * this.boneCount * 16 * 4, this.readBuffer, 0, this.boneCount * 16 * 4);
        this.device.queue.submit([encoder.finish()]);
        var self = this;
        return this.readBuffer.mapAsync(GPUMapMode.READ).then(function () {
            var copy = new Float32Array(self.readBuffer.getMappedRange().slice(0));
            self.readBuffer.unmap();
            return copy;
        });
    }

    setLight(direction, color, ambient) {
        if (direction && direction.x !== undefined) this.lightDirection.set(direction.x, direction.y, direction.z);
        if (color && color.r !== undefined) this.lightColor = { r: color.r, g: color.g, b: color.b };
        if (ambient && ambient.r !== undefined) this.ambient = { r: ambient.r, g: ambient.g, b: ambient.b };
        return this;
    }

    setColor(color) {
        if (color && color.r !== undefined) this.baseColor = { r: color.r, g: color.g === undefined ? 1 : color.g, b: color.b === undefined ? 1 : color.b, a: 1 };
        return this;
    }

    _requireAlive() {
        if (this.disposed) throw new Error("SkinnedCrowd is disposed");
    }

    dispose() {
        if (this.disposed) return this;
        this.disposed = true;
        var buffers = [this.poseBuffer, this.staticBuffer, this.dynBuffer, this.bonesBuffer, this.readBuffer, this.instanceMatrixBuffer, this.instanceDataBuffer, this.countsUniform, this.renderUniform, this.positionBuffer, this.normalBuffer, this.uvBuffer, this.skinIndexBuffer, this.skinWeightBuffer, this.indexBuffer];
        for (var i = 0; i < buffers.length; i++) if (buffers[i]) buffers[i].destroy();
        this.agents = [];
        return this;
    }
}

export { SkinnedCrowd };
