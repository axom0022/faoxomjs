import { Material } from "./Material.js";

import { ShaderMaterial } from "./ShaderMaterial.js";

import { Color, faoxomvalue } from "../math/index.js";

var zanma = [ "f32", "vec2", "vec3", "vec4" ];

function zanmb(zanma, zanmb) {
    if (typeof zanma !== "number" || !isFinite(zanma)) throw new Error("FNMaterial: " + zanmb + " expects a finite number");
    return zanma;
}

function zanmc(zanma, zanmb) {
    if (!zanma || typeof zanma.emit !== "function") throw new Error("FNMaterial: " + zanmb + " expects a node");
    return zanma;
}

function zanmd(zanma, zanmb, zanmc) {
    return (zanma.backend === "glsl" ? "vec" + zanmb + "(" : "vec" + zanmb + "<f32>(") + zanmc + ")";
}

function zanme(zanma, zanmb, zanmc, zanme) {
    if (zanmb === zanmc) return zanme;
    if (zanmb === "f32") return zanmd(zanma, zanmc.charAt(3), zanme);
    throw new Error("FNMaterial: cannot convert " + zanmb + " to " + zanmc);
}

function zanmf(zanma, zanmb) {
    if (zanmb === "f32") return "0.0";
    return zanmd(zanma, zanmb.charAt(3), "0.0");
}

function zanmg(zanma, zanmb) {
    if (zanmb === "f32") return "1.0";
    return zanmd(zanma, zanmb.charAt(3), "1.0");
}

function zanmh(zanma) {
    var zanmb = String(zanma);
    return /^-?[0-9]+$/.test(zanmb) ? zanmb + ".0" : zanmb;
}

function zanmi(zanmb) {
    if (zanma.indexOf(zanmb) < 0) throw new Error("FNMaterial: unknown type " + zanmb);
    return zanmb;
}

function zanmj(zanma, zanmb) {
    if (zanma === zanmb) return zanma;
    if (zanma === "f32") return zanmb;
    if (zanmb === "f32") return zanma;
    throw new Error("FNMaterial: cannot combine " + zanma + " with " + zanmb);
}

class FNNode {
    constructor() {}
    emit(zanma) {
        throw new Error("FNMaterial: abstract node");
    }
}

class FNFloat extends FNNode {
    constructor(zanma) {
        super();
        this.value = zanmb(zanma, "FNFloat");
    }
    emit(zanma) {
        return {
            expr: zanmh(this.value),
            type: "f32"
        };
    }
}

class FNVec2 extends FNNode {
    constructor(zanma, zanmb) {
        super();
        this.x = zanmc(zanma, "FNVec2 x");
        this.y = zanmc(zanmb, "FNVec2 y");
    }
    emit(zanma) {
        var zanmb = this.x.emit(zanma), zanmc = this.y.emit(zanma);
        if (zanmb.type !== "f32" || zanmc.type !== "f32") throw new Error("FNVec2: components must be f32");
        return {
            expr: zanmd(zanma, 2, zanmb.expr + ", " + zanmc.expr),
            type: "vec2"
        };
    }
}

class FNVec3 extends FNNode {
    constructor(zanma, zanmb, zanmd) {
        super();
        this.x = zanmc(zanma, "FNVec3 x");
        this.y = zanmc(zanmb, "FNVec3 y");
        this.z = zanmc(zanmd, "FNVec3 z");
    }
    emit(zanma) {
        var zanmb = this.x.emit(zanma), zanmc = this.y.emit(zanma), zanme = this.z.emit(zanma);
        if (zanmb.type !== "f32" || zanmc.type !== "f32" || zanme.type !== "f32") throw new Error("FNVec3: components must be f32");
        return {
            expr: zanmd(zanma, 3, zanmb.expr + ", " + zanmc.expr + ", " + zanme.expr),
            type: "vec3"
        };
    }
}

class FNVec4 extends FNNode {
    constructor(zanma, zanmb, zanmd, zanme) {
        super();
        this.x = zanmc(zanma, "FNVec4 x");
        this.y = zanmc(zanmb, "FNVec4 y");
        this.z = zanmc(zanmd, "FNVec4 z");
        this.w = zanmc(zanme, "FNVec4 w");
    }
    emit(zanma) {
        var zanmb = this.x.emit(zanma), zanmc = this.y.emit(zanma), zanme = this.z.emit(zanma), zanmf = this.w.emit(zanma);
        if (zanmb.type !== "f32" || zanmc.type !== "f32" || zanme.type !== "f32" || zanmf.type !== "f32") throw new Error("FNVec4: components must be f32");
        return {
            expr: zanmd(zanma, 4, zanmb.expr + ", " + zanmc.expr + ", " + zanme.expr + ", " + zanmf.expr),
            type: "vec4"
        };
    }
}

class FNColor extends FNNode {
    constructor(zanma) {
        super();
        var zanmb = new Color(zanma);
        this.r = zanmb.r;
        this.g = zanmb.g;
        this.b = zanmb.b;
    }
    emit(zanma) {
        return {
            expr: zanmd(zanma, 3, zanmh(this.r) + ", " + zanmh(this.g) + ", " + zanmh(this.b)),
            type: "vec3"
        };
    }
}

class FNUV extends FNNode {
    constructor() {
        super();
    }
    emit(zanma) {
        return {
            expr: zanma.backend === "glsl" ? "vUv" : "input.uv",
            type: "vec2"
        };
    }
}

class FNSurfaceNormal extends FNNode {
    constructor() {
        super();
    }
    emit(zanma) {
        return {
            expr: "n",
            type: "vec3"
        };
    }
}

class FNViewDir extends FNNode {
    constructor() {
        super();
    }
    emit(zanma) {
        return {
            expr: "v",
            type: "vec3"
        };
    }
}

class FNVertexColor extends FNNode {
    constructor() {
        super();
    }
    emit(zanma) {
        return {
            expr: zanma.backend === "glsl" ? "vColor" : "input.color",
            type: "vec3"
        };
    }
}

class FNMaterialColor extends FNNode {
    constructor() {
        super();
    }
    emit(zanma) {
        return {
            expr: zanma.backend === "glsl" ? "uBaseColor" : "modelData.baseColor.rgb",
            type: "vec3"
        };
    }
}

class FNMaterialAlpha extends FNNode {
    constructor() {
        super();
    }
    emit(zanma) {
        return {
            expr: zanma.backend === "glsl" ? "uOpacity" : "modelData.baseColor.a",
            type: "f32"
        };
    }
}

class FNTexture extends FNNode {
    constructor(zanma) {
        super();
        this.uv = zanma ? zanmc(zanma, "FNTexture uv") : null;
    }
    emit(zanma) {
        var zanmb = this.uv ? this.uv.emit(zanma) : {
            expr: zanma.backend === "glsl" ? "vUv" : "input.uv",
            type: "vec2"
        };
        if (zanmb.type !== "vec2") throw new Error("FNTexture: uv must be vec2");
        if (zanma.backend === "glsl") return {
            expr: "texture2D(uFNTexture, " + zanmb.expr + ").rgb",
            type: "vec3"
        };
        return {
            expr: "textureSample(baseTexture, baseSampler, " + zanmb.expr + ").rgb",
            type: "vec3"
        };
    }
}

class FNMath extends FNNode {
    constructor(zanma, zanmb, zanmd) {
        super();
        var zanme = {
            "+": "+",
            "-": "-",
            "*": "*",
            "/": "/",
            add: "+",
            sub: "-",
            mul: "*",
            div: "/",
            min: "min",
            max: "max",
            pow: "pow",
            mod: "%"
        };
        this.op = zanme[zanma];
        if (!this.op) throw new Error("FNMath: unknown op " + zanma);
        this.a = zanmc(zanmb, "FNMath a");
        this.b = zanmc(zanmd, "FNMath b");
    }
    emit(zanma) {
        var zanmb = this.a.emit(zanma), zanmc = this.b.emit(zanma);
        var zanmd = zanmj(zanmb.type, zanmc.type);
        var zanmf = zanme(zanma, zanmb.type, zanmd, zanmb.expr), zanmg = zanme(zanma, zanmc.type, zanmd, zanmc.expr);
        if (this.op === "+" || this.op === "-" || this.op === "*" || this.op === "/") return {
            expr: "(" + zanmf + " " + this.op + " " + zanmg + ")",
            type: zanmd
        };
        if (this.op === "%") {
            if (zanma.backend === "glsl") return {
                expr: "mod(" + zanmf + ", " + zanmg + ")",
                type: zanmd
            };
            return {
                expr: "(" + zanmf + " % " + zanmg + ")",
                type: zanmd
            };
        }
        return {
            expr: this.op + "(" + zanmf + ", " + zanmg + ")",
            type: zanmd
        };
    }
}

class FNMix extends FNNode {
    constructor(zanma, zanmb, zanmd) {
        super();
        this.a = zanmc(zanma, "FNMix a");
        this.b = zanmc(zanmb, "FNMix b");
        this.t = zanmc(zanmd, "FNMix t");
    }
    emit(zanma) {
        var zanmb = this.a.emit(zanma), zanmc = this.b.emit(zanma), zanmf = this.t.emit(zanma);
        var zanmg = zanmj(zanmb.type, zanmc.type);
        if (zanmf.type !== "f32") throw new Error("FNMix: t must be f32");
        if (zanmg === "f32") return {
            expr: "mix(" + zanmb.expr + ", " + zanmc.expr + ", " + zanmf.expr + ")",
            type: "f32"
        };
        return {
            expr: "mix(" + zanme(zanma, zanmb.type, zanmg, zanmb.expr) + ", " + zanme(zanma, zanmc.type, zanmg, zanmc.expr) + ", " + zanmd(zanma, zanmg.charAt(3), zanmf.expr) + ")",
            type: zanmg
        };
    }
}

class FNClamp extends FNNode {
    constructor(zanma, zanmb, zanmd) {
        super();
        this.a = zanmc(zanma, "FNClamp a");
        this.lo = zanmc(zanmb, "FNClamp lo");
        this.hi = zanmc(zanmd, "FNClamp hi");
    }
    emit(zanma) {
        var zanmb = this.a.emit(zanma), zanmc = this.lo.emit(zanma), zanmd = this.hi.emit(zanma);
        var zanmf = zanmj(zanmj(zanmb.type, zanmc.type), zanmd.type);
        return {
            expr: "clamp(" + zanme(zanma, zanmb.type, zanmf, zanmb.expr) + ", " + zanme(zanma, zanmc.type, zanmf, zanmc.expr) + ", " + zanme(zanma, zanmd.type, zanmf, zanmd.expr) + ")",
            type: zanmf
        };
    }
}

class FNSaturate extends FNNode {
    constructor(zanma) {
        super();
        this.a = zanmc(zanma, "FNSaturate a");
    }
    emit(zanma) {
        var zanmb = this.a.emit(zanma);
        zanmi(zanmb.type);
        return {
            expr: "clamp(" + zanmb.expr + ", " + zanmf(zanma, zanmb.type) + ", " + zanmg(zanma, zanmb.type) + ")",
            type: zanmb.type
        };
    }
}

class FNChannel extends FNNode {
    constructor(zanma, zanmb) {
        super();
        this.node = zanmc(zanma, "FNChannel node");
        if (typeof zanmb !== "string" || !/^[rgbaxyzw]{1,4}$/.test(zanmb)) throw new Error("FNChannel: invalid swizzle " + zanmb);
        this.swizzle = zanmb;
    }
    emit(zanma) {
        var zanmb = this.node.emit(zanma);
        if (zanmb.type === "f32") throw new Error("FNChannel: cannot swizzle f32");
        var zanmc = parseInt(zanmb.type.charAt(3), 10);
        for (var zanmd = 0; zanmd < this.swizzle.length; zanmd++) {
            var zanme = this.swizzle.charAt(zanmd);
            var zanmf = "rgba".indexOf(zanme) >= 0 ? "rgba".indexOf(zanme) : "xyzw".indexOf(zanme);
            if (zanmf >= zanmc) throw new Error("FNChannel: swizzle " + this.swizzle + " out of range for " + zanmb.type);
        }
        var zanmg = this.swizzle.length === 1 ? "f32" : "vec" + this.swizzle.length;
        return {
            expr: "(" + zanmb.expr + ")." + this.swizzle,
            type: zanmg
        };
    }
}

class FNDot extends FNNode {
    constructor(zanma, zanmb) {
        super();
        this.a = zanmc(zanma, "FNDot a");
        this.b = zanmc(zanmb, "FNDot b");
    }
    emit(zanma) {
        var zanmb = this.a.emit(zanma), zanmc = this.b.emit(zanma);
        if (zanmb.type !== zanmc.type || zanmb.type === "f32") throw new Error("FNDot: requires matching vector types");
        return {
            expr: "dot(" + zanmb.expr + ", " + zanmc.expr + ")",
            type: "f32"
        };
    }
}

class FNNormalize extends FNNode {
    constructor(zanma) {
        super();
        this.a = zanmc(zanma, "FNNormalize a");
    }
    emit(zanma) {
        var zanmb = this.a.emit(zanma);
        if (zanmb.type === "f32") throw new Error("FNNormalize: requires a vector");
        return {
            expr: "normalize(" + zanmb.expr + ")",
            type: zanmb.type
        };
    }
}

class FNFresnel extends FNNode {
    constructor(zanma) {
        super();
        this.power = zanmc(zanma, "FNFresnel power");
    }
    emit(zanma) {
        var zanmb = this.power.emit(zanma);
        if (zanmb.type !== "f32") throw new Error("FNFresnel: power must be f32");
        return {
            expr: "(pow(1.0 - clamp(dot(n, v), 0.0, 1.0), " + zanmb.expr + "))",
            type: "f32"
        };
    }
}

class FNChecker extends FNNode {
    constructor(zanma, zanmb) {
        super();
        this.uv = zanmc(zanma, "FNChecker uv");
        this.scale = zanmc(zanmb, "FNChecker scale");
    }
    emit(zanma) {
        var zanmb = this.uv.emit(zanma), zanmc = this.scale.emit(zanma);
        if (zanmb.type !== "vec2") throw new Error("FNChecker: uv must be vec2");
        if (zanmc.type !== "f32") throw new Error("FNChecker: scale must be f32");
        var zanmd = "floor((" + zanmb.expr + ").x * " + zanmc.expr + ") + floor((" + zanmb.expr + ").y * " + zanmc.expr + ")";
        if (zanma.backend === "glsl") return {
            expr: "mod(" + zanmd + ", 2.0)",
            type: "f32"
        };
        return {
            expr: "(" + zanmd + " % 2.0)",
            type: "f32"
        };
    }
}

class FNNoise extends FNNode {
    constructor(zanma, zanmb) {
        super();
        this.uv = zanmc(zanma, "FNNoise uv");
        this.scale = zanmc(zanmb, "FNNoise scale");
    }
    emit(zanma) {
        var zanmb = this.uv.emit(zanma), zanmc = this.scale.emit(zanma);
        if (zanmb.type !== "vec2") throw new Error("FNNoise: uv must be vec2");
        if (zanmc.type !== "f32") throw new Error("FNNoise: scale must be f32");
        var zanmd = zanma.counter++;
        var zanme = zanma.backend === "glsl" ? "float" : "f32";
        var zanmf = zanma.backend === "glsl" ? "uvec2(floor((" + zanmb.expr + ") * " + zanmc.expr + "))" : "vec2<u32>(floor((" + zanmb.expr + ") * " + zanmc.expr + "))";
        zanma.prelude.push((zanma.backend === "glsl" ? "uvec2 fnn" + zanmd + "_i = " : "var fnn" + zanmd + "_i = ") + zanmf + ";");
        zanma.prelude.push((zanma.backend === "glsl" ? "uint fnn" + zanmd + "_h = " : "var fnn" + zanmd + "_h = ") + "fnn" + zanmd + "_i.x * 374761393u + fnn" + zanmd + "_i.y * 668265263u;");
        zanma.prelude.push("fnn" + zanmd + "_h = fnn" + zanmd + "_h ^ (fnn" + zanmd + "_h >> 13u);");
        zanma.prelude.push("fnn" + zanmd + "_h = fnn" + zanmd + "_h * 1274126177u;");
        zanma.prelude.push("fnn" + zanmd + "_h = fnn" + zanmd + "_h ^ (fnn" + zanmd + "_h >> 16u);");
        return {
            expr: "(" + zanme + "(fnn" + zanmd + "_h) / 4294967295.0)",
            type: "f32"
        };
    }
}

class FNMaterial extends Material {
    constructor(zanma) {
        zanma = zanma || {};
        super(zanma);
        this.type = "FNMaterial";
        this.isFNMaterial = true;
        this.mode = zanma.mode === "unlit" ? "unlit" : "standard";
        this.nodeVersion = 1;
        this.colorNode = null;
        this.alphaNode = null;
        this.metallicNode = null;
        this.roughnessNode = null;
        this.emissiveNode = null;
    }
    setColor(zanma) {
        if (typeof zanma === "number") zanma = new FNColor(zanma);
        this.colorNode = zanmc(zanma, "setColor");
        this.nodeVersion++;
        return this;
    }
    setAlpha(zanma) {
        if (typeof zanma === "number") zanma = new FNFloat(zanma);
        this.alphaNode = zanmc(zanma, "setAlpha");
        this.nodeVersion++;
        return this;
    }
    setMetallic(zanma) {
        if (typeof zanma === "number") zanma = new FNFloat(zanma);
        this.metallicNode = zanmc(zanma, "setMetallic");
        this.nodeVersion++;
        return this;
    }
    setRoughness(zanma) {
        if (typeof zanma === "number") zanma = new FNFloat(zanma);
        this.roughnessNode = zanmc(zanma, "setRoughness");
        this.nodeVersion++;
        return this;
    }
    setEmissive(zanma) {
        if (this.mode !== "standard") throw new Error("FNMaterial: emissive requires standard mode");
        if (typeof zanma === "number") zanma = new FNColor(zanma);
        this.emissiveNode = zanmc(zanma, "setEmissive");
        this.nodeVersion++;
        return this;
    }
    buildFragment(zanma) {
        var zanmb = {
            prelude: [],
            counter: 0,
            backend: "wgsl"
        };
        var zanmc = this.colorNode ? this.colorNode.emit(zanmb) : null;
        if (zanmc && zanmc.type === "f32") zanmc = {
            expr: zanmd(zanmb, 3, zanmc.expr),
            type: "vec3"
        };
        if (zanmc && zanmc.type !== "vec3") throw new Error("FNMaterial: color node must be vec3");
        var zanme = this.alphaNode ? this.alphaNode.emit(zanmb) : null;
        if (zanme && zanme.type !== "f32") throw new Error("FNMaterial: alpha node must be f32");
        var zanmf = this.metallicNode ? this.metallicNode.emit(zanmb) : null;
        if (zanmf && zanmf.type !== "f32") throw new Error("FNMaterial: metallic node must be f32");
        var zanmg = this.roughnessNode ? this.roughnessNode.emit(zanmb) : null;
        if (zanmg && zanmg.type !== "f32") throw new Error("FNMaterial: roughness node must be f32");
        var zanmh = this.emissiveNode ? this.emissiveNode.emit(zanmb) : null;
        if (zanmh && zanmh.type === "f32") zanmh = {
            expr: zanmd(zanmb, 3, zanmh.expr),
            type: "vec3"
        };
        if (zanmh && zanmh.type !== "vec3") throw new Error("FNMaterial: emissive node must be vec3");
        var zanmi = "var base = modelData.baseColor.rgb * sampled.rgb;";
        var zanmj = "var alpha = modelData.baseColor.a * sampled.a;";
        var zanmk = "if (modelData.flags.x > 0.5) { return vec4<f32>(base, alpha); }";
        var zanml = "let metallic = clamp(modelData.params.x * metalnessSample.b, 0.0, 1.0);";
        var zanmm = "let roughness = clamp(modelData.params.y * roughnessSample.g, 0.04, 1.0);";
        var zanmn = "modelData.emissive.rgb * modelData.shading.y";
        if (this.mode === "unlit") {
            var zanmo = zanma.indexOf(zanmk);
            if (zanmo < 0) throw new Error("FNMaterial: engine fragment anchor missing");
            var zanmp = zanma.slice(0, zanmo);
            var zanmq = "";
            if (zanmc || zanmb.prelude.length) {
                zanmq = zanmb.prelude.join("\n") + (zanmb.prelude.length ? "\n" : "") + "var base = (" + (zanmc ? zanmc.expr : "modelData.baseColor.rgb") + ") * sampled.rgb;";
                zanmp = zanmp.replace(zanmi, zanmq);
            }
            if (zanme) zanmp = zanmp.replace(zanmj, "var alpha = (" + zanme.expr + ") * sampled.a;");
            var zanmr = "var keepAlive = roughnessSample.g + metalnessSample.b + aoSample.r + emissiveSample.r + lights.count.x + bones[0][0].x + textureSampleCompare(shadowTexture, shadowSampler, vec2<f32>(0.5, 0.5), 0.5) + textureSampleLevel(environmentTexture, environmentSampler, vec3<f32>(0.0, 1.0, 0.0), 0.0).r;";
            return zanmp + zanmr + "\nreturn vec4<f32>(base + keepAlive * 0.0, alpha); }\n";
        }
        var zanms = zanma;
        if (zanmc || zanmb.prelude.length) {
            var zanmt = zanmb.prelude.length ? zanmb.prelude.join("\n") + "\n" : "";
            zanms = zanms.replace(zanmi, zanmt + "var base = (" + zanmc.expr + ") * sampled.rgb;");
        }
        if (zanme) zanms = zanms.replace(zanmj, "var alpha = (" + zanme.expr + ") * sampled.a;");
        if (zanmf) zanms = zanms.replace(zanml, "let metallic = clamp((" + zanmf.expr + ") * metalnessSample.b, 0.0, 1.0);");
        if (zanmg) zanms = zanms.replace(zanmm, "let roughness = clamp((" + zanmg.expr + ") * roughnessSample.g, 0.04, 1.0);");
        if (zanmh) zanms = zanms.replace(zanmn, "(" + zanmh.expr + ") * modelData.shading.y");
        return zanms;
    }
    toShaderMaterial() {
        var zanma = {
            prelude: [],
            counter: 0,
            backend: "glsl"
        };
        var zanmb = this.colorNode ? this.colorNode.emit(zanma) : null;
        if (zanmb && zanmb.type === "f32") zanmb = {
            expr: zanmd(zanma, 3, zanmb.expr),
            type: "vec3"
        };
        if (zanmb && zanmb.type !== "vec3") throw new Error("FNMaterial: color node must be vec3");
        var zanmc = this.alphaNode ? this.alphaNode.emit(zanma) : null;
        if (zanmc && zanmc.type !== "f32") throw new Error("FNMaterial: alpha node must be f32");
        var zanme = this.emissiveNode ? this.emissiveNode.emit(zanma) : null;
        if (zanme && zanme.type === "f32") zanme = {
            expr: zanmd(zanma, 3, zanme.expr),
            type: "vec3"
        };
        if (zanme && zanme.type !== "vec3") throw new Error("FNMaterial: emissive node must be vec3");
        var zanmf = zanma.prelude.length ? zanma.prelude.join("\n") + "\n    " : "";
        var zanmg = "    vec3 base = " + (zanmb ? "(" + zanmb.expr + ")" : "uBaseColor") + ";";
        var zanmh = "    float alpha = " + (zanmc ? "(" + zanmc.expr + ")" : "uOpacity") + ";";
        var zanmi = "";
        if (this.mode === "standard") {
            zanmi = [ "    vec3 lightDir = normalize(vec3(0.35, 0.9, 0.25));", "    vec3 h = normalize(v + lightDir);", "    float ndl = max(dot(n, lightDir), 0.0);", "    float gloss = mix(8.0, 220.0, clamp(1.0 - uRoughness, 0.0, 1.0));", "    float spec = pow(max(dot(n, h), 0.0), gloss) * uMetallic * 0.6;", "    color = base * (0.22 + 0.78 * ndl) + vec3(spec);" + (zanme ? " + (" + zanme.expr + ");" : ";") ].join("\n");
        } else {
            zanmi = "    color = base;";
        }
        var zanmj = [ "precision highp float;", "varying vec3 vNormal;", "varying vec3 vWorldPosition;", "varying vec2 vUv;", "varying vec3 vColor;", "uniform vec3 cameraPosition;", "uniform vec3 uBaseColor;", "uniform float uOpacity;", "uniform float uMetallic;", "uniform float uRoughness;", "uniform sampler2D uFNTexture;", "void main() {", "    vec3 n = normalize(vNormal);", "    vec3 v = normalize(cameraPosition - vWorldPosition);", zanmf + zanmg, zanmh, "    vec3 color;", zanmi, "    gl_FragColor = vec4(color, alpha);", "}" ].join("\n");
        var zanmk = [ "varying vec3 vNormal;", "varying vec3 vWorldPosition;", "varying vec2 vUv;", "varying vec3 vColor;", "attribute vec3 color;", "void main() {", "    vNormal = normalize(mat3(modelMatrix) * normal);", "    vec4 world = modelMatrix * vec4(position, 1.0);", "    vWorldPosition = world.xyz;", "    vUv = uv;", "    vColor = color;", "    gl_Position = projectionMatrix * viewMatrix * world;", "}" ].join("\n");
        var zanml = new ShaderMaterial({
            uniforms: {
                uBaseColor: {
                    value: new Color(this.color !== undefined ? this.color : 16777215)
                },
                uOpacity: {
                    value: faoxomvalue(this.opacity, 1)
                },
                uMetallic: {
                    value: faoxomvalue(this.metalness, 0)
                },
                uRoughness: {
                    value: faoxomvalue(this.roughness, .5)
                },
                uFNTexture: {
                    value: this.diffuseMap || null
                }
            },
            vertexShader: zanmk,
            fragmentShader: zanmj
        });
        zanml.vertexColors = true;
        if (this.transparent) zanml.transparent = true;
        if (this.side !== undefined) zanml.side = this.side;
        return zanml;
    }
}

export { FNMaterial, FNNode, FNFloat, FNVec2, FNVec3, FNVec4, FNColor, FNUV, FNSurfaceNormal, FNViewDir, FNVertexColor, FNMaterialColor, FNMaterialAlpha, FNTexture, FNMath, FNMix, FNClamp, FNSaturate, FNChannel, FNDot, FNNormalize, FNFresnel, FNChecker, FNNoise };
