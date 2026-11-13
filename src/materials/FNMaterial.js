import { Material } from "./Material.js";
import { Color, faoxomvalue } from "../math/index.js";

var FNTYPES = ["f32", "vec2", "vec3", "vec4"];

function fnnum(value, what) {
    if (typeof value !== "number" || !isFinite(value)) throw new Error("FNMaterial: " + what + " expects a finite number");
    return value;
}

function fnnode(value, what) {
    if (!value || typeof value.emit !== "function") throw new Error("FNMaterial: " + what + " expects a node");
    return value;
}

function fnconv(src, dst, expr) {
    if (src === dst) return expr;
    if (src === "f32") return "vec" + dst.charAt(3) + "<f32>(" + expr + ")";
    throw new Error("FNMaterial: cannot convert " + src + " to " + dst);
}

function fnzero(type) {
    return type === "f32" ? "0.0" : "vec" + type.charAt(3) + "<f32>(0.0)";
}

function fnone(type) {
    return type === "f32" ? "1.0" : "vec" + type.charAt(3) + "<f32>(1.0)";
}

function fnfmt(value) {
    var s = String(value);
    return /^-?[0-9]+$/.test(s) ? s + ".0" : s;
}

function fnchecktype(type) {
    if (FNTYPES.indexOf(type) < 0) throw new Error("FNMaterial: unknown type " + type);
    return type;
}

function fnpromote(a, b) {
    if (a === b) return a;
    if (a === "f32") return b;
    if (b === "f32") return a;
    throw new Error("FNMaterial: cannot combine " + a + " with " + b);
}

class FNNode {
    constructor() {}
    emit(ctx) { throw new Error("FNMaterial: abstract node"); }
}

class FNFloat extends FNNode {
    constructor(value) { super(); this.value = fnnum(value, "FNFloat"); }
    emit(ctx) { return { expr: fnfmt(this.value), type: "f32" }; }
}

class FNVec2 extends FNNode {
    constructor(x, y) { super(); this.x = fnnode(x, "FNVec2 x"); this.y = fnnode(y, "FNVec2 y"); }
    emit(ctx) {
        var a = this.x.emit(ctx), b = this.y.emit(ctx);
        if (a.type !== "f32" || b.type !== "f32") throw new Error("FNVec2: components must be f32");
        return { expr: "vec2<f32>(" + a.expr + ", " + b.expr + ")", type: "vec2" };
    }
}

class FNVec3 extends FNNode {
    constructor(x, y, z) { super(); this.x = fnnode(x, "FNVec3 x"); this.y = fnnode(y, "FNVec3 y"); this.z = fnnode(z, "FNVec3 z"); }
    emit(ctx) {
        var a = this.x.emit(ctx), b = this.y.emit(ctx), c = this.z.emit(ctx);
        if (a.type !== "f32" || b.type !== "f32" || c.type !== "f32") throw new Error("FNVec3: components must be f32");
        return { expr: "vec3<f32>(" + a.expr + ", " + b.expr + ", " + c.expr + ")", type: "vec3" };
    }
}

class FNVec4 extends FNNode {
    constructor(x, y, z, w) { super(); this.x = fnnode(x, "FNVec4 x"); this.y = fnnode(y, "FNVec4 y"); this.z = fnnode(z, "FNVec4 z"); this.w = fnnode(w, "FNVec4 w"); }
    emit(ctx) {
        var a = this.x.emit(ctx), b = this.y.emit(ctx), c = this.z.emit(ctx), d = this.w.emit(ctx);
        if (a.type !== "f32" || b.type !== "f32" || c.type !== "f32" || d.type !== "f32") throw new Error("FNVec4: components must be f32");
        return { expr: "vec4<f32>(" + a.expr + ", " + b.expr + ", " + c.expr + ", " + d.expr + ")", type: "vec4" };
    }
}

class FNColor extends FNNode {
    constructor(hex) { super(); var c = new Color(hex); this.r = c.r; this.g = c.g; this.b = c.b; }
    emit(ctx) { return { expr: "vec3<f32>(" + fnfmt(this.r) + ", " + fnfmt(this.g) + ", " + fnfmt(this.b) + ")", type: "vec3" }; }
}

class FNUV extends FNNode {
    constructor() { super(); }
    emit(ctx) { return { expr: "input.uv", type: "vec2" }; }
}

class FNSurfaceNormal extends FNNode {
    constructor() { super(); }
    emit(ctx) { return { expr: "n", type: "vec3" }; }
}

class FNViewDir extends FNNode {
    constructor() { super(); }
    emit(ctx) { return { expr: "v", type: "vec3" }; }
}

class FNVertexColor extends FNNode {
    constructor() { super(); }
    emit(ctx) { return { expr: "input.color", type: "vec3" }; }
}

class FNMaterialColor extends FNNode {
    constructor() { super(); }
    emit(ctx) { return { expr: "modelData.baseColor.rgb", type: "vec3" }; }
}

class FNMaterialAlpha extends FNNode {
    constructor() { super(); }
    emit(ctx) { return { expr: "modelData.baseColor.a", type: "f32" }; }
}

class FNTexture extends FNNode {
    constructor(uv) { super(); this.uv = uv ? fnnode(uv, "FNTexture uv") : null; }
    emit(ctx) {
        var uvExpr = this.uv ? this.uv.emit(ctx) : { expr: "input.uv", type: "vec2" };
        if (uvExpr.type !== "vec2") throw new Error("FNTexture: uv must be vec2");
        return { expr: "textureSample(baseTexture, baseSampler, " + uvExpr.expr + ").rgb", type: "vec3" };
    }
}

class FNMath extends FNNode {
    constructor(op, a, b) {
        super();
        var names = { "+": "+", "-": "-", "*": "*", "/": "/", add: "+", sub: "-", mul: "*", div: "/", min: "min", max: "max", pow: "pow", mod: "%" };
        this.op = names[op];
        if (!this.op) throw new Error("FNMath: unknown op " + op);
        this.a = fnnode(a, "FNMath a");
        this.b = fnnode(b, "FNMath b");
    }
    emit(ctx) {
        var a = this.a.emit(ctx), b = this.b.emit(ctx);
        var type = fnpromote(a.type, b.type);
        var ax = fnconv(a.type, type, a.expr), bx = fnconv(b.type, type, b.expr);
        if (this.op === "+" || this.op === "-" || this.op === "*" || this.op === "/") return { expr: "(" + ax + " " + this.op + " " + bx + ")", type: type };
        if (this.op === "%") return { expr: "(" + ax + " % " + bx + ")", type: type };
        return { expr: this.op + "(" + ax + ", " + bx + ")", type: type };
    }
}

class FNMix extends FNNode {
    constructor(a, b, t) { super(); this.a = fnnode(a, "FNMix a"); this.b = fnnode(b, "FNMix b"); this.t = fnnode(t, "FNMix t"); }
    emit(ctx) {
        var a = this.a.emit(ctx), b = this.b.emit(ctx), t = this.t.emit(ctx);
        var type = fnpromote(a.type, b.type);
        if (t.type !== "f32") throw new Error("FNMix: t must be f32");
        if (type === "f32") return { expr: "mix(" + a.expr + ", " + b.expr + ", " + t.expr + ")", type: "f32" };
        return { expr: "mix(" + fnconv(a.type, type, a.expr) + ", " + fnconv(b.type, type, b.expr) + ", vec" + type.charAt(3) + "<f32>(" + t.expr + "))", type: type };
    }
}

class FNClamp extends FNNode {
    constructor(a, lo, hi) { super(); this.a = fnnode(a, "FNClamp a"); this.lo = fnnode(lo, "FNClamp lo"); this.hi = fnnode(hi, "FNClamp hi"); }
    emit(ctx) {
        var a = this.a.emit(ctx), lo = this.lo.emit(ctx), hi = this.hi.emit(ctx);
        var type = fnpromote(fnpromote(a.type, lo.type), hi.type);
        return { expr: "clamp(" + fnconv(a.type, type, a.expr) + ", " + fnconv(lo.type, type, lo.expr) + ", " + fnconv(hi.type, type, hi.expr) + ")", type: type };
    }
}

class FNSaturate extends FNNode {
    constructor(a) { super(); this.a = fnnode(a, "FNSaturate a"); }
    emit(ctx) {
        var a = this.a.emit(ctx);
        fnchecktype(a.type);
        return { expr: "clamp(" + a.expr + ", " + fnzero(a.type) + ", " + fnone(a.type) + ")", type: a.type };
    }
}

class FNChannel extends FNNode {
    constructor(node, swizzle) {
        super();
        this.node = fnnode(node, "FNChannel node");
        if (typeof swizzle !== "string" || !/^[rgbaxyzw]{1,4}$/.test(swizzle)) throw new Error("FNChannel: invalid swizzle " + swizzle);
        this.swizzle = swizzle;
    }
    emit(ctx) {
        var inner = this.node.emit(ctx);
        if (inner.type === "f32") throw new Error("FNChannel: cannot swizzle f32");
        var size = parseInt(inner.type.charAt(3), 10);
        for (var i = 0; i < this.swizzle.length; i++) {
            var c = this.swizzle.charAt(i);
            var idx = "rgba".indexOf(c) >= 0 ? "rgba".indexOf(c) : "xyzw".indexOf(c);
            if (idx >= size) throw new Error("FNChannel: swizzle " + this.swizzle + " out of range for " + inner.type);
        }
        var out = this.swizzle.length === 1 ? "f32" : "vec" + this.swizzle.length;
        return { expr: "(" + inner.expr + ")." + this.swizzle, type: out };
    }
}

class FNDot extends FNNode {
    constructor(a, b) { super(); this.a = fnnode(a, "FNDot a"); this.b = fnnode(b, "FNDot b"); }
    emit(ctx) {
        var a = this.a.emit(ctx), b = this.b.emit(ctx);
        if (a.type !== b.type || a.type === "f32") throw new Error("FNDot: requires matching vector types");
        return { expr: "dot(" + a.expr + ", " + b.expr + ")", type: "f32" };
    }
}

class FNNormalize extends FNNode {
    constructor(a) { super(); this.a = fnnode(a, "FNNormalize a"); }
    emit(ctx) {
        var a = this.a.emit(ctx);
        if (a.type === "f32") throw new Error("FNNormalize: requires a vector");
        return { expr: "normalize(" + a.expr + ")", type: a.type };
    }
}

class FNFresnel extends FNNode {
    constructor(power) { super(); this.power = fnnode(power, "FNFresnel power"); }
    emit(ctx) {
        var p = this.power.emit(ctx);
        if (p.type !== "f32") throw new Error("FNFresnel: power must be f32");
        return { expr: "(pow(1.0 - clamp(dot(n, v), 0.0, 1.0), " + p.expr + "))", type: "f32" };
    }
}

class FNChecker extends FNNode {
    constructor(uv, scale) { super(); this.uv = fnnode(uv, "FNChecker uv"); this.scale = fnnode(scale, "FNChecker scale"); }
    emit(ctx) {
        var uv = this.uv.emit(ctx), s = this.scale.emit(ctx);
        if (uv.type !== "vec2") throw new Error("FNChecker: uv must be vec2");
        if (s.type !== "f32") throw new Error("FNChecker: scale must be f32");
        return { expr: "((floor((" + uv.expr + ").x * " + s.expr + ") + floor((" + uv.expr + ").y * " + s.expr + ")) % 2.0)", type: "f32" };
    }
}

class FNNoise extends FNNode {
    constructor(uv, scale) { super(); this.uv = fnnode(uv, "FNNoise uv"); this.scale = fnnode(scale, "FNNoise scale"); }
    emit(ctx) {
        var uv = this.uv.emit(ctx), s = this.scale.emit(ctx);
        if (uv.type !== "vec2") throw new Error("FNNoise: uv must be vec2");
        if (s.type !== "f32") throw new Error("FNNoise: scale must be f32");
        var id = ctx.counter++;
        ctx.prelude.push("var fnn" + id + "_i = vec2<u32>(floor((" + uv.expr + ") * " + s.expr + "));");
        ctx.prelude.push("var fnn" + id + "_h = fnn" + id + "_i.x * 374761393u + fnn" + id + "_i.y * 668265263u;");
        ctx.prelude.push("fnn" + id + "_h = fnn" + id + "_h ^ (fnn" + id + "_h >> 13u);");
        ctx.prelude.push("fnn" + id + "_h = fnn" + id + "_h * 1274126177u;");
        ctx.prelude.push("fnn" + id + "_h = fnn" + id + "_h ^ (fnn" + id + "_h >> 16u);");
        return { expr: "(f32(fnn" + id + "_h) / 4294967295.0)", type: "f32" };
    }
}

class FNMaterial extends Material {
    constructor(options) {
        options = options || {};
        super(options);
        this.type = "FNMaterial";
        this.isFNMaterial = true;
        this.mode = options.mode === "unlit" ? "unlit" : "standard";
        this.nodeVersion = 1;
        this.colorNode = null;
        this.alphaNode = null;
        this.metallicNode = null;
        this.roughnessNode = null;
        this.emissiveNode = null;
    }
    setColor(node) {
        if (typeof node === "number") node = new FNColor(node);
        this.colorNode = fnnode(node, "setColor");
        this.nodeVersion++;
        return this;
    }
    setAlpha(node) {
        if (typeof node === "number") node = new FNFloat(node);
        this.alphaNode = fnnode(node, "setAlpha");
        this.nodeVersion++;
        return this;
    }
    setMetallic(node) {
        if (typeof node === "number") node = new FNFloat(node);
        this.metallicNode = fnnode(node, "setMetallic");
        this.nodeVersion++;
        return this;
    }
    setRoughness(node) {
        if (typeof node === "number") node = new FNFloat(node);
        this.roughnessNode = fnnode(node, "setRoughness");
        this.nodeVersion++;
        return this;
    }
    setEmissive(node) {
        if (this.mode !== "standard") throw new Error("FNMaterial: emissive requires standard mode");
        if (typeof node === "number") node = new FNColor(node);
        this.emissiveNode = fnnode(node, "setEmissive");
        this.nodeVersion++;
        return this;
    }
    buildFragment(engineFrag) {
        var ctx = { prelude: [], counter: 0 };
        var colorExpr = this.colorNode ? this.colorNode.emit(ctx) : null;
        if (colorExpr && colorExpr.type === "f32") colorExpr = { expr: "vec3<f32>(" + colorExpr.expr + ")", type: "vec3" };
        if (colorExpr && colorExpr.type !== "vec3") throw new Error("FNMaterial: color node must be vec3");
        var alphaExpr = this.alphaNode ? this.alphaNode.emit(ctx) : null;
        if (alphaExpr && alphaExpr.type !== "f32") throw new Error("FNMaterial: alpha node must be f32");
        var metallicExpr = this.metallicNode ? this.metallicNode.emit(ctx) : null;
        if (metallicExpr && metallicExpr.type !== "f32") throw new Error("FNMaterial: metallic node must be f32");
        var roughnessExpr = this.roughnessNode ? this.roughnessNode.emit(ctx) : null;
        if (roughnessExpr && roughnessExpr.type !== "f32") throw new Error("FNMaterial: roughness node must be f32");
        var emissiveExpr = this.emissiveNode ? this.emissiveNode.emit(ctx) : null;
        if (emissiveExpr && emissiveExpr.type === "f32") emissiveExpr = { expr: "vec3<f32>(" + emissiveExpr.expr + ")", type: "vec3" };
        if (emissiveExpr && emissiveExpr.type !== "vec3") throw new Error("FNMaterial: emissive node must be vec3");
        var baseAnchor = "var base = modelData.baseColor.rgb * sampled.rgb;";
        var alphaAnchor = "var alpha = modelData.baseColor.a * sampled.a;";
        var unlitAnchor = "if (modelData.flags.x > 0.5) { return vec4<f32>(base, alpha); }";
        var metallicAnchor = "let metallic = clamp(modelData.params.x * metalnessSample.b, 0.0, 1.0);";
        var roughnessAnchor = "let roughness = clamp(modelData.params.y * roughnessSample.g, 0.04, 1.0);";
        var emissiveAnchor = "modelData.emissive.rgb * modelData.shading.y";
        if (this.mode === "unlit") {
            var cut = engineFrag.indexOf(unlitAnchor);
            if (cut < 0) throw new Error("FNMaterial: engine fragment anchor missing");
            var head = engineFrag.slice(0, cut);
            var replacement = "";
            if (colorExpr || ctx.prelude.length) {
                replacement = ctx.prelude.join("\n") + (ctx.prelude.length ? "\n" : "") + "var base = (" + (colorExpr ? colorExpr.expr : "modelData.baseColor.rgb") + ") * sampled.rgb;";
                head = head.replace(baseAnchor, replacement);
            }
            if (alphaExpr) head = head.replace(alphaAnchor, "var alpha = (" + alphaExpr.expr + ") * sampled.a;");
            var keepAlive = "var keepAlive = roughnessSample.g + metalnessSample.b + aoSample.r + emissiveSample.r + lights.count.x + bones[0][0].x + textureSampleCompare(shadowTexture, shadowSampler, vec2<f32>(0.5, 0.5), 0.5) + textureSampleLevel(environmentTexture, environmentSampler, vec3<f32>(0.0, 1.0, 0.0), 0.0).r;";
            return head + keepAlive + "\nreturn vec4<f32>(base + keepAlive * 0.0, alpha); }\n";
        }
        var frag = engineFrag;
        if (colorExpr || ctx.prelude.length) {
            var pre = ctx.prelude.length ? ctx.prelude.join("\n") + "\n" : "";
            frag = frag.replace(baseAnchor, pre + "var base = (" + colorExpr.expr + ") * sampled.rgb;");
        }
        if (alphaExpr) frag = frag.replace(alphaAnchor, "var alpha = (" + alphaExpr.expr + ") * sampled.a;");
        if (metallicExpr) frag = frag.replace(metallicAnchor, "let metallic = clamp((" + metallicExpr.expr + ") * metalnessSample.b, 0.0, 1.0);");
        if (roughnessExpr) frag = frag.replace(roughnessAnchor, "let roughness = clamp((" + roughnessExpr.expr + ") * roughnessSample.g, 0.04, 1.0);");
        if (emissiveExpr) frag = frag.replace(emissiveAnchor, "(" + emissiveExpr.expr + ") * modelData.shading.y");
        return frag;
    }
}

export { FNMaterial, FNNode, FNFloat, FNVec2, FNVec3, FNVec4, FNColor, FNUV, FNSurfaceNormal, FNViewDir, FNVertexColor, FNMaterialColor, FNMaterialAlpha, FNTexture, FNMath, FNMix, FNClamp, FNSaturate, FNChannel, FNDot, FNNormalize, FNFresnel, FNChecker, FNNoise };
