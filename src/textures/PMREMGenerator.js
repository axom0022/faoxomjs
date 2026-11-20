import { faoxomvalue } from "../math/index.js";

import { CubeTexture } from "./CubeTexture.js";

import { PREMEnv } from "./PREMEnv.js";

class PMREMGenerator {
    constructor(zavca) {
        this.renderer = zavca;
        this.pipeline = null;
        this.shaderModule = null;
    }
    async generate(zavca, zavcb) {
        zavcb = zavcb || {};
        var zavcc = this.renderer;
        if (!zavcc || !zavcc.device || !zavcc.resourceManager) throw new Error("PMREM generation requires an initialized WebGPU renderer");
        if (!(zavca instanceof CubeTexture)) throw new Error("PMREM source must be a CubeTexture");
        var zavcd = Math.max(1, Math.floor(faoxomvalue(zavcb.size, 256)));
        var zavce = Math.max(1, Math.floor(Math.log(zavcd) / Math.LN2) + 1);
        var zavcf = zavcc.resourceManager.cubeTexture(zavca);
        var zavcg = zavcc.device;
        var zavch = zavcg.createTexture({
            size: [ zavcd, zavcd, 6 ],
            dimension: "2d",
            format: "rgba16float",
            mipLevelCount: zavce,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        if (!this.shaderModule) this.shaderModule = zavcg.createShaderModule({
            code: "struct Params { face: f32, roughness: f32, sourceSize: f32, pad: f32 }; @group(0) @binding(0) var environment: texture_cube<f32>; @group(0) @binding(1) var environmentSampler: sampler; @group(0) @binding(2) var<uniform> params: Params; struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; @vertex fn vertexMain(@builtin(vertex_index) index: u32) -> VertexOutput { var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0)); var result: VertexOutput; result.position = vec4<f32>(positions[index], 0.0, 1.0); result.uv = positions[index] * 0.5 + vec2<f32>(0.5); return result; } fn direction(face: f32, uv: vec2<f32>) -> vec3<f32> { let p = uv * 2.0 - vec2<f32>(1.0); if (face < 0.5) { return normalize(vec3<f32>(1.0, -p.y, -p.x)); } if (face < 1.5) { return normalize(vec3<f32>(-1.0, -p.y, p.x)); } if (face < 2.5) { return normalize(vec3<f32>(p.x, 1.0, p.y)); } if (face < 3.5) { return normalize(vec3<f32>(p.x, -1.0, -p.y)); } if (face < 4.5) { return normalize(vec3<f32>(p.x, -p.y, 1.0)); } return normalize(vec3<f32>(-p.x, -p.y, -1.0)); } @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> { let d = direction(params.face, input.uv); let roughness = params.roughness; var result = textureSampleLevel(environment, environmentSampler, d, 0.0); result += textureSampleLevel(environment, environmentSampler, normalize(d + vec3<f32>(roughness, 0.0, 0.0)), 0.0); result += textureSampleLevel(environment, environmentSampler, normalize(d + vec3<f32>(-roughness, 0.0, 0.0)), 0.0); result += textureSampleLevel(environment, environmentSampler, normalize(d + vec3<f32>(0.0, roughness, 0.0)), 0.0); result += textureSampleLevel(environment, environmentSampler, normalize(d + vec3<f32>(0.0, -roughness, 0.0)), 0.0); result += textureSampleLevel(environment, environmentSampler, normalize(d + vec3<f32>(0.0, 0.0, roughness)), 0.0); result += textureSampleLevel(environment, environmentSampler, normalize(d + vec3<f32>(0.0, 0.0, -roughness)), 0.0); return result / 7.0; }"
        });
        if (!this.pipeline) this.pipeline = zavcg.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.shaderModule,
                entryPoint: "vertexMain"
            },
            fragment: {
                module: this.shaderModule,
                entryPoint: "fragmentMain",
                targets: [ {
                    format: "rgba16float"
                } ]
            },
            primitive: {
                topology: "triangle-list"
            }
        });
        var zavci = zavcg.createCommandEncoder();
        for (var zavcj = 0; zavcj < zavce; zavcj++) {
            var zavck = zavce === 1 ? 0 : zavcj / (zavce - 1);
            for (var zavcl = 0; zavcl < 6; zavcl++) {
                var zavcm = zavch.createView({
                    dimension: "2d",
                    baseMipLevel: zavcj,
                    mipLevelCount: 1,
                    baseArrayLayer: zavcl,
                    arrayLayerCount: 1
                });
                var zavcn = zavcg.createBuffer({
                    size: 16,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                });
                zavcg.queue.writeBuffer(zavcn, 0, new Float32Array([ zavcl, zavck, zavcd, 0 ]));
                var zavco = zavcg.createBindGroup({
                    layout: this.pipeline.getBindGroupLayout(0),
                    entries: [ {
                        binding: 0,
                        resource: zavcf.view
                    }, {
                        binding: 1,
                        resource: zavcf.sampler
                    }, {
                        binding: 2,
                        resource: {
                            buffer: zavcn
                        }
                    } ]
                });
                var zavcp = zavci.beginRenderPass({
                    colorAttachments: [ {
                        view: zavcm,
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
                zavcp.setPipeline(this.pipeline);
                zavcp.setBindGroup(0, zavco);
                zavcp.draw(3, 1, 0, 0);
                zavcp.end();
            }
        }
        zavcg.queue.submit([ zavci.finish() ]);
        var zavcq = {
            texture: zavch,
            view: zavch.createView({
                dimension: "cube",
                baseMipLevel: 0,
                mipLevelCount: zavce
            }),
            sampler: zavcc.resourceManager.sampler({
                minFilter: "linearMipmapLinear"
            })
        };
        return new PREMEnv(zavcq, zavcd, zavce);
    }
}

export { PMREMGenerator };
