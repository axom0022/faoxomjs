const tslBackends = {
    glsl: "glsl",
    wgsl: "wgsl"
};

function faoxomnodefloat(value) {
    var number = Number(value);
    if (!isFinite(number)) return "0.0";
    if (Number.isInteger(number)) return number.toFixed(1);
    return number.toFixed(4);
}

function faoxomnodevec(backend, count, values) {
    var body = values.map(faoxomnodefloat).join(", ");
    return backend === "wgsl" ? "vec" + count + "<f32>(" + body + ")" : "vec" + count + "(" + body + ")";
}

function faoxomnodescope(backend) {
    if (backend === "wgsl") {
        return {
            uv: "input.uv",
            normalWorld: "normalize(input.worldNormal)",
            normalLocal: "input.worldNormal",
            positionWorld: "input.worldPosition",
            positionLocal: "input.worldPosition",
            camera: "camera.cameraPosition.xyz",
            time: "0.0",
            texture: function(uv) {
                return "textureSample(baseTexture, baseSampler, " + uv + ")";
            },
            textureType: "vec4<f32>"
        };
    }
    return {
        uv: "vUv",
        normalWorld: "normalize(vNormal)",
        normalLocal: "vNormal",
        positionWorld: "vWorldPosition",
        positionLocal: "vLocalPosition",
        camera: "uCameraPosition",
        time: "uTime",
        texture: function(uv) {
            return "texture2D(uDiffuseMap, " + uv + ")";
        },
        textureType: "vec4"
    };
}

function faoxomnodeemit(node, backend, scope) {
    if (!node) return backend === "wgsl" ? "0.0" : "0.0";
    var bind = function(child) {
        return faoxomnodeemit(child, backend, scope);
    };
    switch (node.type) {
      case "float":
        return faoxomnodefloat(node.value);

      case "vec2":
        return faoxomnodevec(backend, 2, [ node.x, node.y ]);

      case "vec3":
        return faoxomnodevec(backend, 3, [ node.x, node.y, node.z ]);

      case "vec4":
        return faoxomnodevec(backend, 4, [ node.x, node.y, node.z, node.w ]);

      case "color":
        return faoxomnodevec(backend, 3, [ node.color ? node.color.r : 0, node.color ? node.color.g : 0, node.color ? node.color.b : 0 ]);

      case "operator":
        if (node.op === "dot" || node.op === "cross") return node.op + "(" + bind(node.a) + ", " + bind(node.b) + ")";
        return "(" + bind(node.a) + " " + node.op + " " + bind(node.b) + ")";

      case "math": {
        var args = [];
        if (node.a) args.push(bind(node.a));
        if (node.b) args.push(bind(node.b));
        if (node.c) args.push(bind(node.c));
        return node.method + "(" + args.join(", ") + ")";
      }

      case "uv":
        return scope.uv;

      case "normal":
        return node.space === "local" ? scope.normalLocal : scope.normalWorld;

      case "position":
        return node.space === "local" ? scope.positionLocal : scope.positionWorld;

      case "cameraPosition":
        return scope.camera;

      case "time":
        return "(" + scope.time + " * " + faoxomnodefloat(node.speed || 1) + ")";

      case "fresnel": {
        var bias = faoxomnodefloat(node.bias || 0);
        var power = faoxomnodefloat(node.power || 1);
        var scale = faoxomnodefloat(node.scale === undefined ? 1 : node.scale);
        return "(" + bias + " + " + scale + " * pow(1.0 - max(0.0, dot(" + scope.normalWorld + ", normalize(" + scope.camera + " - " + scope.positionWorld + "))), " + power + "))";
      }

      case "noise": {
        var noiseScale = faoxomnodefloat(node.scale === undefined ? 1 : node.scale);
        var uv = scope.uv;
        if (backend === "wgsl") return "fract(sin(dot(" + uv + " * " + noiseScale + ", vec2<f32>(12.9898, 78.233))) * 43758.5453)";
        return "fract(sin(dot(" + uv + " * " + noiseScale + ", vec2(12.9898, 78.233))) * 43758.5453)";
      }

      case "texture": {
        var textureUv = node.uvNode ? bind(node.uvNode) : scope.uv;
        return scope.texture(textureUv);
      }

      default:
        if (backend === "glsl" && node.build) return node.build(backend);
        return backend === "wgsl" ? "0.0" : "0.0";
    }
}

function emitGlsl(node, options) {
    return faoxomnodeemit(node, "glsl", (options && options.scope) || faoxomnodescope("glsl"));
}

function emitWgsl(node, options) {
    return faoxomnodeemit(node, "wgsl", (options && options.scope) || faoxomnodescope("wgsl"));
}

function emit(node, backend, options) {
    return backend === "wgsl" ? emitWgsl(node, options) : emitGlsl(node, options);
}

function faoxomnodewgsl(material) {
    var color = material.colorNode ? emitWgsl(material.colorNode) : "modelData.baseColor.rgb";
    var roughness = material.roughnessNode ? emitWgsl(material.roughnessNode) : "modelData.params.y";
    var metalness = material.metalnessNode ? emitWgsl(material.metalnessNode) : "modelData.params.x";
    var emissive = material.emissiveNode ? emitWgsl(material.emissiveNode) : "vec3<f32>(0.0)";
    var opacity = material.opacityNode ? emitWgsl(material.opacityNode) : "modelData.baseColor.a";
    var position = material.positionNode ? emitWgsl(material.positionNode) : "input.worldPosition";
    return [
        "struct Camera { viewProj: mat4x4<f32>, cameraPosition: vec4<f32>, params: vec4<f32> };",
        "struct Model { model: mat4x4<f32>, normal: mat4x4<f32>, baseColor: vec4<f32>, params: vec4<f32>, emissive: vec4<f32>, extra: vec4<f32>, skinData: vec4<f32>, morphWeights: vec4<f32>, flags: vec4<f32>, shading: vec4<f32>, extra2: vec4<f32> };",
        "@group(0) @binding(0) var<uniform> camera: Camera;",
        "@group(1) @binding(0) var<uniform> modelData: Model;",
        "@group(1) @binding(1) var baseTexture: texture_2d<f32>;",
        "@group(1) @binding(2) var baseSampler: sampler;",
        "struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) worldPosition: vec3<f32>, @location(1) worldNormal: vec3<f32>, @location(2) uv: vec2<f32>, @location(3) color: vec3<f32> };",
        "@vertex fn vertexMain(input: VertexInput) -> VertexOutput { var output: VertexOutput; let world = modelData.model * vec4<f32>(input.position, 1.0); output.position = camera.viewProj * world; output.position.z = output.position.z * 0.5 + output.position.w * 0.5; output.worldPosition = world.xyz; output.worldNormal = normalize((modelData.normal * vec4<f32>(input.normal, 0.0)).xyz); output.uv = input.uv; output.color = input.color; return output; }",
        "struct VertexInput { @location(0) position: vec3<f32>, @location(1) normal: vec3<f32>, @location(2) uv: vec2<f32>, @location(3) color: vec3<f32> };",
        "@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {",
        "    let nodeColor = " + color + ";",
        "    let nodeRoughness = clamp(" + roughness + ", 0.04, 1.0);",
        "    let nodeMetalness = clamp(" + metalness + ", 0.0, 1.0);",
        "    let nodeEmissive = " + emissive + ";",
        "    let nodeOpacity = clamp(" + opacity + ", 0.0, 1.0);",
        "    let nodePosition = " + position + ";",
        "    let n = normalize(input.worldNormal);",
        "    let v = normalize(camera.cameraPosition.xyz - nodePosition);",
        "    let l = normalize(vec3<f32>(0.5, 1.0, 0.75));",
        "    let h = normalize(v + l);",
        "    let fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);",
        "    let direct = max(dot(n, l), 0.0) * 0.8 + 0.2;",
        "    let specular = pow(max(dot(n, h), 0.0), mix(128.0, 4.0, nodeRoughness)) * fresnel * (1.0 - nodeRoughness);",
        "    let lit = nodeColor * (1.0 - nodeMetalness) * direct + nodeColor * nodeMetalness * specular + nodeEmissive;",
        "    return vec4<f32>(pow(max(lit, vec3<f32>(0.0)), vec3<f32>(1.0 / max(camera.params.z, 0.1))), nodeOpacity);",
        "}"
    ].join("\n");
}

function faoxomnodewgslType(node) {
    if (!node) return "f32";
    var type = node.getType ? node.getType() : "float";
    if (type === "float") return "f32";
    if (type === "vec2") return "vec2<f32>";
    if (type === "vec3") return "vec3<f32>";
    if (type === "vec4") return "vec4<f32>";
    return "f32";
}

function compileNodeMaterial(material, backend, options) {
    backend = backend === "wgsl" ? "wgsl" : "glsl";
    options = options || {};
    if (backend === "wgsl") {
        return {
            backend: "wgsl",
            language: "wgsl",
            code: faoxomnodewgsl(material)
        };
    }
    var color = material.colorNode ? emitGlsl(material.colorNode) : "vec3(1.0)";
    var roughness = material.roughnessNode ? emitGlsl(material.roughnessNode) : "0.5";
    var metalness = material.metalnessNode ? emitGlsl(material.metalnessNode) : "0.0";
    var emissive = material.emissiveNode ? emitGlsl(material.emissiveNode) : "vec3(0.0)";
    var opacity = material.opacityNode ? emitGlsl(material.opacityNode) : "1.0";
    var position = material.positionNode ? emitGlsl(material.positionNode) : "vWorldPosition";
    return {
        backend: "glsl",
        language: "glsl",
        vertexShader: "varying vec3 vWorldPosition; varying vec3 vLocalPosition; varying vec3 vNormal; varying vec2 vUv; void main() { vUv = uv; vLocalPosition = position; vNormal = normalize(normalMatrix * normal); vec4 worldPos = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPos.xyz; gl_Position = projectionMatrix * viewMatrix * worldPos; }",
        fragmentShader: "precision highp float; varying vec3 vWorldPosition; varying vec3 vLocalPosition; varying vec3 vNormal; varying vec2 vUv; uniform vec3 uCameraPosition; uniform float uTime; uniform sampler2D uDiffuseMap; void main() { vec3 nodeColor = " + color + "; float nodeRoughness = clamp(" + roughness + ", 0.04, 1.0); float nodeMetalness = clamp(" + metalness + ", 0.0, 1.0); vec3 nodeEmissive = " + emissive + "; float nodeOpacity = clamp(" + opacity + ", 0.0, 1.0); vec3 nodePosition = " + position + "; vec3 N = normalize(vNormal); vec3 V = normalize(uCameraPosition - nodePosition); vec3 L = normalize(vec3(0.5, 1.0, 0.75)); vec3 H = normalize(V + L); float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0); float direct = max(dot(N, L), 0.0) * 0.8 + 0.2; float specular = pow(max(dot(N, H), 0.0), mix(128.0, 4.0, nodeRoughness)) * fresnel * (1.0 - nodeRoughness); vec3 lit = nodeColor * (1.0 - nodeMetalness) * direct + nodeColor * nodeMetalness * specular + nodeEmissive; gl_FragColor = vec4(pow(max(lit, vec3(0.0)), vec3(1.0 / 2.2)), nodeOpacity); }"
    };
}

function compileNodeGraph(node, backend, options) {
    return {
        backend: backend === "wgsl" ? "wgsl" : "glsl",
        expression: emit(node, backend === "wgsl" ? "wgsl" : "glsl", options)
    };
}

export { compileNodeGraph, compileNodeMaterial, emit, emitGlsl, emitWgsl, faoxomnodewgslType, tslBackends };
