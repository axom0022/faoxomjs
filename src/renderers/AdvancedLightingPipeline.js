import { AdaptiveHybridReflections, ReSTIRDirectLighting } from "./AdvancedLighting.js";
import { HybridDiffuseGI, SpatiotemporalGIDenoiser } from "./AdvancedGlobalIllumination.js";
import { FoveatedQualityRegions } from "./TemporalSuperResolution.js";
import { RayQueryLightingBridge } from "./RayQueryLightingBridge.js";

const advancedLightingCompositeWGSL = `
struct Uniforms { dimensions: vec4<u32>, weights: vec4<f32>, parameters: vec4<f32> };
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var baseColor: texture_2d<f32>;
@group(0) @binding(2) var directLighting: texture_2d<f32>;
@group(0) @binding(3) var diffuseGI: texture_2d<f32>;
@group(0) @binding(4) var reflections: texture_2d<f32>;
@group(0) @binding(5) var outputTexture: texture_storage_2d<rgba16float, write>;
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
  if (invocation.x >= uniforms.dimensions.x || invocation.y >= uniforms.dimensions.y) { return; }
  let pixel = vec2<i32>(invocation.xy); let base = textureLoad(baseColor, pixel, 0); let direct = textureLoad(directLighting, pixel, 0); let indirect = textureLoad(diffuseGI, pixel, 0); let reflected = textureLoad(reflections, pixel, 0);
  var color = base.rgb * uniforms.weights.x + direct.rgb * uniforms.weights.y + indirect.rgb * uniforms.weights.z + reflected.rgb * uniforms.weights.w;
  if (uniforms.dimensions.z == 1u) { color = direct.rgb; } else if (uniforms.dimensions.z == 2u) { color = indirect.rgb; } else if (uniforms.dimensions.z == 3u) { color = reflected.rgb; } else if (uniforms.dimensions.z == 4u) { color = vec3<f32>(direct.a, indirect.a, reflected.a); }
  color *= uniforms.parameters.x; textureStore(outputTexture, pixel, vec4<f32>(max(color, vec3<f32>(0.0)), select(1.0, base.a, uniforms.parameters.y > 0.5)));
}`;

class AdvancedLightingPipeline {
  constructor(deviceOrRenderer, options = {}) {
    this.device = deviceOrRenderer && deviceOrRenderer.device ? deviceOrRenderer.device : deviceOrRenderer;
    if (!this.device) throw new Error("AdvancedLightingPipeline requires a WebGPU device or renderer");
    this.directEnabled = options.direct !== false; this.giEnabled = options.gi !== false; this.reflectionsEnabled = options.reflections !== false; this.denoiseEnabled = options.denoise !== false;
    this.baseWeight = options.baseWeight === undefined ? 1 : options.baseWeight; this.directWeight = options.directWeight === undefined ? 1 : options.directWeight; this.giWeight = options.giWeight === undefined ? 1 : options.giWeight; this.reflectionWeight = options.reflectionWeight === undefined ? 1 : options.reflectionWeight; this.exposure = options.exposure === undefined ? 1 : options.exposure; this.preserveAlpha = options.preserveAlpha !== false; this.debugMode = 0; this.qualityController = options.qualityController || null;
    this.directLighting = options.directLighting || new ReSTIRDirectLighting(this.device, options.restir);
    this.diffuseGI = options.diffuseGI || new HybridDiffuseGI(this.device, options.giOptions);
    this.giDenoiser = options.giDenoiser || new SpatiotemporalGIDenoiser(this.device, options.denoiser);
    this.reflections = options.reflectionSystem || new AdaptiveHybridReflections(this.device, options.reflectionOptions);
    this.rayBridge = options.rayBridge || (options.rayQuery ? new RayQueryLightingBridge(this.device, options.rayQuery, options.rayBridgeOptions) : null);
    this.ownsDirect = !options.directLighting; this.ownsGI = !options.diffuseGI; this.ownsDenoiser = !options.giDenoiser; this.ownsReflections = !options.reflectionSystem; this.ownsRayBridge = !options.rayBridge && !!this.rayBridge;
    if (options.foveation instanceof FoveatedQualityRegions) { this.foveation = options.foveation; this.ownsFoveation = false; } else if (options.foveation === false) { this.foveation = null; this.ownsFoveation = false; } else { this.foveation = new FoveatedQualityRegions(this.device, options.foveation || {}); this.ownsFoveation = true; }
    this._disposed = false; this.uniformBuffer = this.device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); this.pipeline = null; this.width = 0; this.height = 0; this.frame = 0; this.fallbackBlack = this.createFallback();
    this.stats = { frames: 0, pixels: 0, passes: 0, directFrames: 0, giFrames: 0, denoiseFrames: 0, reflectionFrames: 0, rayQueryFrames: 0, foveationFrames: 0, resets: 0 };
  }
  createFallback() { const texture = this.device.createTexture({ size: [1,1], format: "rgba16float", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST }); this.device.queue.writeTexture({ texture }, new Uint16Array(4), { bytesPerRow: 8 }, [1,1]); return texture; }
  resize(width, height) { width=Math.max(1,width|0);height=Math.max(1,height|0);if(this.outputTexture&&width===this.width&&height===this.height)return this;if(this.outputTexture)this.outputTexture.destroy();this.outputTexture=this.device.createTexture({size:[width,height],format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});this.outputView=this.outputTexture.createView();this.width=width;this.height=height;return this; }
  ensurePipeline() { if(!this.pipeline)this.pipeline=this.device.createComputePipeline({layout:"auto",compute:{module:this.device.createShaderModule({code:advancedLightingCompositeWGSL}),entryPoint:"main"}}); }
  configure(options={}) { for(const key of ["directEnabled","giEnabled","reflectionsEnabled","denoiseEnabled","baseWeight","directWeight","giWeight","reflectionWeight","exposure","preserveAlpha"])if(options[key]!==undefined)this[key]=options[key];return this; }
  setDebugMode(mode=0) { const modes={combined:0,direct:1,gi:2,reflections:3,confidence:4};this.debugMode=typeof mode==="string"?(modes[mode]??0):Math.max(0,Math.min(4,mode|0));return this; }
  setGaze(x,y,delta){if(this.foveation)this.foveation.setGaze(x,y,delta);return this;}
  setQualityController(controller){if(controller&&controller.pipeline!==this)throw new Error("Quality controller belongs to a different lighting pipeline");this.qualityController=controller||null;return this;}
  samplePerformance(metrics){if(this.qualityController)this.qualityController.sample(metrics);return this;}
  encode(encoder, inputs, camera, options={}) {
    if(this._disposed)throw new Error("AdvancedLightingPipeline has been disposed");if(!inputs.colorView||!inputs.depthView||!inputs.normalView)throw new Error("AdvancedLightingPipeline requires colorView, depthView, and normalView");const width=options.width||inputs.width,height=options.height||inputs.height;this.resize(width,height);this.ensurePipeline();let passes=0,qualityView=inputs.qualityView;
    if(this.foveation&&!qualityView){this.foveation.encode(encoder,width,height);qualityView=this.foveation.view;passes++;this.stats.foveationFrames++;}
    if(this.rayBridge){this.rayBridge.encode(encoder,{depthView:inputs.depthView,normalRoughnessView:inputs.normalRoughnessView||inputs.normalView,qualityView,width,height},camera,{width,height,materials:options.materials||inputs.materials,lights:options.lights||inputs.lights});passes++;this.stats.rayQueryFrames++;}
    if(this.directEnabled){this.directLighting.encode(encoder,{depthView:inputs.depthView,normalView:inputs.normalView,velocityView:inputs.velocityView,shadowView:inputs.shadowView,rayQuery:inputs.rayQuery||(this.rayBridge?this.rayBridge.rayQuery:null),width,height},camera,{width,height,rayQuery:inputs.rayQuery||(this.rayBridge?this.rayBridge.rayQuery:null),lights:options.lights||inputs.lights});passes++;this.stats.directFrames++;}
    if(this.giEnabled){this.diffuseGI.encode(encoder,{colorView:inputs.colorView,depthView:inputs.depthView,normalView:inputs.normalView,albedoView:inputs.albedoView,rayFallbackView:inputs.giRayFallbackView||(this.rayBridge?this.rayBridge.giView:null),qualityView,width,height},camera,{width,height});passes++;this.stats.giFrames++;if(this.denoiseEnabled){this.giDenoiser.encode(encoder,{noisyView:this.diffuseGI.outputView,depthView:inputs.depthView,normalView:inputs.normalView,velocityView:inputs.velocityView,width,height},{width,height});passes++;this.stats.denoiseFrames++;}}
    if(this.reflectionsEnabled){this.reflections.encode(encoder,{colorView:inputs.colorView,depthView:inputs.depthView,normalRoughnessView:inputs.normalRoughnessView||inputs.normalView,rayFallbackView:inputs.reflectionRayFallbackView||(this.rayBridge?this.rayBridge.reflectionView:null),velocityView:inputs.velocityView,qualityView,width,height},camera,{width,height});passes++;this.stats.reflectionFrames++;}
    const directView=this.directEnabled?this.directLighting.outputView:this.fallbackBlack.createView(),giView=this.giEnabled?(this.denoiseEnabled?this.giDenoiser.outputView:this.diffuseGI.outputView):this.fallbackBlack.createView(),reflectionView=this.reflectionsEnabled?this.reflections.outputView:this.fallbackBlack.createView();const data=new ArrayBuffer(48),f=new Float32Array(data),u=new Uint32Array(data);u[0]=width;u[1]=height;u[2]=options.debugMode===undefined?this.debugMode:options.debugMode|0;f[4]=this.baseWeight;f[5]=this.directWeight;f[6]=this.giWeight;f[7]=this.reflectionWeight;f[8]=options.exposure===undefined?this.exposure:options.exposure;f[9]=this.preserveAlpha?1:0;this.device.queue.writeBuffer(this.uniformBuffer,0,data);const bind=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBuffer}},{binding:1,resource:inputs.colorView},{binding:2,resource:directView},{binding:3,resource:giView},{binding:4,resource:reflectionView},{binding:5,resource:this.outputView}]});const pass=encoder.beginComputePass({label:"advanced lighting composite"});pass.setPipeline(this.pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(Math.ceil(width/8),Math.ceil(height/8));pass.end();passes++;this.frame++;this.stats.frames++;this.stats.pixels=width*height;this.stats.passes=passes;return this;
  }
  execute(inputs,camera,options){const encoder=this.device.createCommandEncoder({label:"advanced lighting pipeline"});this.encode(encoder,inputs,camera,options);this.device.queue.submit([encoder.finish()]);return this;}
  reset(){this.directLighting.reset();this.diffuseGI.reset();this.giDenoiser.reset();this.reflections.reset();if(this.rayBridge)this.rayBridge.reset();this.frame=0;this.stats.resets++;return this;}
  report(){return{width:this.width,height:this.height,frame:this.frame,features:{direct:this.directEnabled,gi:this.giEnabled,denoise:this.giEnabled&&this.denoiseEnabled,reflections:this.reflectionsEnabled,foveation:!!this.foveation,rayQuery:!!this.rayBridge},debugMode:this.debugMode,stats:{...this.stats},direct:this.directLighting.report(),gi:this.diffuseGI.report(),denoiser:this.giDenoiser.report(),reflections:this.reflections.report(),foveation:this.foveation?this.foveation.report():null,rayQuery:this.rayBridge?this.rayBridge.report():null,quality:this.qualityController?this.qualityController.report():null};}
  dispose(){if(this._disposed)return this;this._disposed=true;this.uniformBuffer.destroy();if(this.outputTexture)this.outputTexture.destroy();this.fallbackBlack.destroy();if(this.ownsDirect)this.directLighting.dispose();if(this.ownsGI)this.diffuseGI.dispose();if(this.ownsDenoiser)this.giDenoiser.dispose();if(this.ownsReflections)this.reflections.dispose();if(this.ownsFoveation&&this.foveation)this.foveation.dispose();if(this.ownsRayBridge&&this.rayBridge)this.rayBridge.dispose();this.pipeline=this.outputTexture=this.outputView=null;return this;}
}

export { AdvancedLightingPipeline, advancedLightingCompositeWGSL };
