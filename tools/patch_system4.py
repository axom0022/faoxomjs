import sys

path = "src/renderers/WebGPURenderer.js"
s = open(path, encoding="utf-8").read()
orig = s

def replace_once(s, old, new, label):
    n = s.count(old)
    assert n == 1, "anchor %r found %d times" % (label, n)
    return s.replace(old, new)

# ---------------------------------------------------------------- 1. shader(variant)
old_head = 'shader() { return this.device.createShaderModule({ code: "'
new_head = ('shader(variant) { variant = variant || ""; if (!this._shaderModuleCache) this._shaderModuleCache = {}; '
            'if (this._shaderModuleCache[variant]) return this._shaderModuleCache[variant]; var shadercode = "')
s = replace_once(s, old_head, new_head, "shader head")

cluster_block = (
    "{ let cpos = (clusterParams.viewmatrix * vec4<f32>(input.worldPosition, 1.0)).xyz;\\n"
    "var cd = -cpos.z;\\n"
    "var cgz = i32(floor(clusterParams.params0.z * log(cd / clusterParams.params1.z) / log(clusterParams.params1.w / clusterParams.params1.z)));\\n"
    "cgz = clamp(cgz, 0, i32(clusterParams.params0.z) - 1);\\n"
    "var cd1 = clusterParams.params1.z * pow(clusterParams.params1.w / clusterParams.params1.z, (f32(cgz) + 1.0) / clusterParams.params0.z);\\n"
    "var chy1 = cd1 * clusterParams.params1.x;\\n"
    "var chx1 = chy1 * clusterParams.params1.y;\\n"
    "var cgx = i32(floor((cpos.x + chx1) / (2.0 * chx1) * clusterParams.params0.x));\\n"
    "cgx = clamp(cgx, 0, i32(clusterParams.params0.x) - 1);\\n"
    "var cgy = i32(floor((cpos.y + chy1) / (2.0 * chy1) * clusterParams.params0.y));\\n"
    "cgy = clamp(cgy, 0, i32(clusterParams.params0.y) - 1);\\n"
    "var cslot = u32((cgz * i32(clusterParams.params0.y) + cgy) * i32(clusterParams.params0.x) + cgx) * 17u;\\n"
    "var ccount = clusterLights[cslot];\\n"
    "for (var ci = 0u; ci < ccount; ci = ci + 1u) {\\n"
    "var cli = clusterLights[cslot + 1u + ci];\\n"
    "var cposr = clusterLightData[cli * 2u];\\n"
    "var ccol = clusterLightData[cli * 2u + 1u];\\n"
    "var cdelta = cposr.xyz - input.worldPosition;\\n"
    "var cdist = length(cdelta);\\n"
    "var cl2 = normalize(cdelta);\\n"
    "var catt = 1.0;\\n"
    "if (cposr.w > 0.0) { catt = max(0.0, 1.0 - cdist / cposr.w); }\\n"
    "catt = catt * (1.0 / (1.0 + cdist * cdist * 0.015));\\n"
    "var cradiance = ccol.rgb * ccol.w * catt;\\n"
    "var cndl = max(dot(n, cl2), 0.0);\\n"
    "if (cndl > 0.0) {\\n"
    "var ch = normalize(v + cl2);\\n"
    "var cdistggx = distributionGGX(n, ch, aBase);\\n"
    "var cgeo = geometrySmith(n, v, cl2, (roughness + 1.0) * (roughness + 1.0) / 8.0);\\n"
    "var cfres = fresnelSchlick(max(dot(ch, v), 0.0), f0);\\n"
    "var cspec = (cdistggx * cgeo * cfres) / max(4.0 * ndv * cndl, 0.001);\\n"
    "var ckd = (vec3<f32>(1.0) - cfres) * (1.0 - metallic);\\n"
    "lo = lo + (ckd * base / 3.14159265359 + cspec) * cradiance * cndl;\\n"
    "}\\n"
    "} }\\n"
)

variant_js = (
    'alpha); }";\n'
    '        if (variant.indexOf("mega") >= 0) {\n'
    '            shadercode = shadercode.replace("@location(13) instanceMatrix3: vec4<f32> };", "@location(13) instanceMatrix3: vec4<f32>, @location(14) materialIndex: f32 };");\n'
    '            shadercode = shadercode.replace("@location(3) color: vec3<f32> };", "@location(3) color: vec3<f32>, @location(4) materialIndex: f32 };");\n'
    '            shadercode = shadercode.replace("output.color = input.color;", "output.color = input.color;\\noutput.materialIndex = input.materialIndex;");\n'
    '            shadercode = shadercode.replace("var<storage, read> bones: array<mat4x4<f32>>;", "var<storage, read> bones: array<mat4x4<f32>>;\\n@group(3) @binding(0) var<storage, read> megamaterials: array<vec4<f32>>;");\n'
    '            shadercode = shadercode.replace("var base = modelData.baseColor.rgb * sampled.rgb;", "let mmIndex = u32(input.materialIndex + 0.5) * 4u;\\nlet mm0 = megamaterials[mmIndex];\\nlet mm1 = megamaterials[mmIndex + 1u];\\nlet mm2 = megamaterials[mmIndex + 2u];\\nvar base = mm0.rgb * sampled.rgb;");\n'
    '            shadercode = shadercode.replace("var alpha = modelData.baseColor.a * sampled.a;", "var alpha = mm0.a * sampled.a;");\n'
    '            shadercode = shadercode.replace("let metallic = clamp(modelData.params.x * metalnessSample.b, 0.0, 1.0);", "let metallic = clamp(mm1.x * metalnessSample.b, 0.0, 1.0);");\n'
    '            shadercode = shadercode.replace("let roughness = clamp(modelData.params.y * roughnessSample.g, 0.04, 1.0);", "let roughness = clamp(mm1.y * roughnessSample.g, 0.04, 1.0);");\n'
    '            shadercode = shadercode.replace("modelData.emissive.rgb * modelData.shading.y", "mm2.rgb * mm1.z");\n'
    '        }\n'
    '        if (variant.indexOf("clustered") >= 0) {\n'
    '            var cb = variant.indexOf("mega") >= 0 ? 1 : 0;\n'
    '            shadercode = shadercode.replace("var<storage, read> bones: array<mat4x4<f32>>;", "var<storage, read> bones: array<mat4x4<f32>>;\\nstruct ClusterShadeParams { viewmatrix: mat4x4<f32>, params0: vec4<f32>, params1: vec4<f32>, params2: vec4<f32> };\\n@group(3) @binding(" + cb + ") var<storage, read> clusterLights: array<u32>;\\n@group(3) @binding(" + (cb + 1) + ") var<storage, read> clusterLightData: array<vec4<f32>>;\\n@group(3) @binding(" + (cb + 2) + ") var<uniform> clusterParams: ClusterShadeParams;");\n'
    '            shadercode = shadercode.replace("let kind = light.kind.x;", "let kind = light.kind.x;\\nif (kind > 1.5 && kind < 2.5) { continue; }");\n'
    '            shadercode = shadercode.replace("var ambient = base * (1.0 - metallic) * 0.03 * aoSample.r;", "' + cluster_block + 'var ambient = base * (1.0 - metallic) * 0.03 * aoSample.r;");\n'
    '        }\n'
    '        var module = this.device.createShaderModule({ code: shadercode });\n'
    '        this._shaderModuleCache[variant] = module;\n'
    '        return module;\n'
    '    }\n'
    '    cameraBindFor(pipeline) {'
)
old_tail = 'alpha); }" }); }\n    cameraBindFor(pipeline) {'
s = replace_once(s, old_tail, variant_js, "shader tail")

# ---------------------------------------------------------------- 2. new methods before cameraBindFor
new_methods = (
    '    megaVertexBuffers(variant, base) { if (variant && variant.indexOf("mega") >= 0) { base.push({ arrayStride: 4, attributes: [{ shaderLocation: 14, offset: 0, format: "float32" }] }); } return base; }\n'
    '    setMegaMaterials(records) {\n'
    '        records = records || [];\n'
    '        if (!this.megaMaterialBuffer) this.megaMaterialBuffer = this.device.createBuffer({ size: 65536, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });\n'
    '        var data = new Float32Array(1024 * 16);\n'
    '        var count = Math.min(records.length, 1024);\n'
    '        for (var i = 0; i < count; i++) {\n'
    '            var r = records[i] || {};\n'
    '            var c = r.color;\n'
    '            var cr = 1, cg = 1, cbv = 1, ca = 1;\n'
    '            if (c && typeof c === "object" && (c.r !== undefined || c[0] !== undefined)) { cr = c.r !== undefined ? c.r : c[0]; cg = c.g !== undefined ? c.g : c[1]; cbv = c.b !== undefined ? c.b : c[2]; ca = c.a !== undefined ? c.a : (c[3] !== undefined ? c[3] : 1); }\n'
    '            else if (typeof c === "number") { cr = ((c >> 16) & 255) / 255; cg = ((c >> 8) & 255) / 255; cbv = (c & 255) / 255; ca = 1; }\n'
    '            var o = i * 16;\n'
    '            data[o] = cr; data[o + 1] = cg; data[o + 2] = cbv; data[o + 3] = ca;\n'
    '            data[o + 4] = r.metalness !== undefined ? r.metalness : 0;\n'
    '            data[o + 5] = r.roughness !== undefined ? r.roughness : 1;\n'
    '            data[o + 6] = r.emissiveIntensity !== undefined ? r.emissiveIntensity : 1;\n'
    '            data[o + 7] = 0;\n'
    '            var e = r.emissive;\n'
    '            if (e && typeof e === "object" && (e.r !== undefined || e[0] !== undefined)) { data[o + 8] = e.r !== undefined ? e.r : e[0]; data[o + 9] = e.g !== undefined ? e.g : e[1]; data[o + 10] = e.b !== undefined ? e.b : e[2]; }\n'
    '            else if (typeof e === "number") { data[o + 8] = ((e >> 16) & 255) / 255; data[o + 9] = ((e >> 8) & 255) / 255; data[o + 10] = (e & 255) / 255; }\n'
    '            else { data[o + 8] = 0; data[o + 9] = 0; data[o + 10] = 0; }\n'
    '        }\n'
    '        if (count > 0) this.device.queue.writeBuffer(this.megaMaterialBuffer, 0, data.subarray(0, count * 16));\n'
    '        this.megaMaterialCount = count;\n'
    '        return this;\n'
    '    }\n'
    '    variantBindFor(pipeline, variant) {\n'
    '        if (!this._variantBindCache) this._variantBindCache = typeof Map !== "undefined" ? new Map() : null;\n'
    '        var byVariant = this._variantBindCache && this._variantBindCache.get(pipeline);\n'
    '        if (byVariant && byVariant[variant]) return byVariant[variant];\n'
    '        var layout = pipeline.getBindGroupLayout(3);\n'
    '        var entries = [];\n'
    '        var mega = variant.indexOf("mega") >= 0;\n'
    '        if (mega) entries.push({ binding: 0, resource: { buffer: this.megaMaterialBuffer } });\n'
    '        if (variant.indexOf("clustered") >= 0) {\n'
    '            var cl = this.clusteredLighting;\n'
    '            var cb = mega ? 1 : 0;\n'
    '            entries.push({ binding: cb, resource: { buffer: cl.clusterbuffer } });\n'
    '            entries.push({ binding: cb + 1, resource: { buffer: cl.lightbuffer } });\n'
    '            entries.push({ binding: cb + 2, resource: { buffer: cl.paramsbuffer } });\n'
    '        }\n'
    '        var bind = this.device.createBindGroup({ layout: layout, entries: entries });\n'
    '        if (!byVariant) { byVariant = {}; if (this._variantBindCache) this._variantBindCache.set(pipeline, byVariant); }\n'
    '        byVariant[variant] = bind;\n'
    '        return bind;\n'
    '    }\n'
)
s = replace_once(s, '    cameraBindFor(pipeline) { if (!this._cameraBindCache)',
                 new_methods + '    cameraBindFor(pipeline) { if (!this._cameraBindCache)', "methods insert")

# ---------------------------------------------------------------- 3. pipelineFor signature + key + module + buffers
s = replace_once(s, 'pipelineFor(material, topology, targetFormat) { topology = topology || "triangle-list"; targetFormat = targetFormat || this._targetFormat || this.format; var key = ',
                 'pipelineFor(material, topology, targetFormat, variant) { topology = topology || "triangle-list"; targetFormat = targetFormat || this._targetFormat || this.format; variant = variant || ""; var key = ', "pipelineFor sig")
s = replace_once(s, '+ "|" + targetFormat; if (this.pipelineCache[key]) return this.pipelineCache[key]; var module = this.shader();',
                 '+ "|" + targetFormat + "|" + variant; if (this.pipelineCache[key]) return this.pipelineCache[key]; var module = this.shader(variant);', "pipelineFor key")
# buffers wrap: close anchor is globally unique; open anchor only within pipelineFor slice
s = replace_once(s, 'offset: 48, format: "float32x4" }] }] }, fragment: { module: module, entryPoint: "fragmentMain"',
                 'offset: 48, format: "float32x4" }] }]) }, fragment: { module: module, entryPoint: "fragmentMain"', "buffers close")
p = s.index('pipelineFor(material, topology, targetFormat, variant) {')
f = s.index('}] }]) }, fragment: { module: module, entryPoint: "fragmentMain"', p)
seg = s[p:f]
seg = replace_once(seg, 'buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0,',
                     'buffers: this.megaVertexBuffers(variant, [{ arrayStride: 12, attributes: [{ shaderLocation: 0,', "buffers open")
s = s[:p] + seg + s[f:]

# ---------------------------------------------------------------- 4. drawObject hooks
s = replace_once(s, 'var pipeline = self.pipelineFor(object.material, topology);',
                 'var variant = (object.megaMaterial ? "mega" : "") + (object.clusteredShading ? "clustered" : "");\n            var pipeline = self.pipelineFor(object.material, topology, undefined, variant);', "drawObject pipeline")
s = replace_once(s, 'pass.setBindGroup(2, boneBind); pass.setVertexBuffer(0, positionBuffer);',
                 'pass.setBindGroup(2, boneBind);\n'
                 '            if (variant) {\n'
                 '                if (variant.indexOf("mega") >= 0) {\n'
                 '                    var matIdxAttribute = self.attribute(object, "materialIndex", 1, [0]);\n'
                 '                    var matIdxResource = self.resourceManager.buffer(matIdxAttribute, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);\n'
                 '                    pass.setVertexBuffer(7, matIdxResource);\n'
                 '                }\n'
                 '                pass.setBindGroup(3, self.variantBindFor(pipeline, variant));\n'
                 '            }\n'
                 '            pass.setVertexBuffer(0, positionBuffer);', "drawObject binds")

assert s != orig
open(path, "w", encoding="utf-8").write(s)
print("WebGPURenderer.js patched OK,", len(s), "bytes")

# ---------------------------------------------------------------- 5. ClusteredLighting zero-light guard
path2 = "src/renderers/ClusteredLighting.js"
s2 = open(path2, encoding="utf-8").read()
old2 = 'this.device.queue.writeBuffer(this.lightbuffer, 0, lightdata.subarray(0, norm.length * 8));'
assert s2.count(old2) == 1
s2 = s2.replace(old2, 'if (norm.length > 0) this.device.queue.writeBuffer(this.lightbuffer, 0, lightdata.subarray(0, norm.length * 8));')
open(path2, "w", encoding="utf-8").write(s2)
print("ClusteredLighting.js guarded OK")

# ---------------------------------------------------------------- 6. MegaGeometry add() auto-material + uploadMaterials
path3 = "src/extras/MegaGeometry.js"
s3 = open(path3, encoding="utf-8").read()
old3 = 'materialIndex: options.materialIndex !== undefined ? options.materialIndex : this.materials.length,'
assert s3.count(old3) == 1
new3 = 'materialIndex: options.materialIndex !== undefined ? options.materialIndex : this.addMaterial(options),'
s3 = s3.replace(old3, new3)
# uploadMaterials: insert after addMaterial method end - anchor on the closing of addMaterial + next method
anchor3 = '        return this.m'
i3 = s3.index(anchor3)
# find the method that follows addMaterial: search for the next '    <name>(' at line start after addMaterial
import re
m3 = re.search(r'\n    \w+\(', s3[i3:])
insert_at = i3 + m3.start()
upload = (
    '    uploadMaterials(renderer) {\n'
    '        var records = [];\n'
    '        for (var i = 0; i < this.materials.length; i++) records.push(this.materials[i]);\n'
    '        if (!records.length) records.push({ color: 0xffffff, roughness: 1, metalness: 0 });\n'
    '        renderer.setMegaMaterials(records);\n'
    '        this.stats.materials = records.length;\n'
    '        return this;\n'
    '    }\n'
)
s3 = s3[:insert_at] + upload + s3[insert_at:]
open(path3, "w", encoding="utf-8").write(s3)
print("MegaGeometry.js patched OK")
