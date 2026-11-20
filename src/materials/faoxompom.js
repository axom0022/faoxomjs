const parallaxOcclusionDefaults = {
    scale: .05,
    minLayers: 8,
    maxLayers: 32,
    fade: 1
};

const parallaxOcclusionGLSL = `
vec2 faoxomParallaxUv(sampler2D heightMap, vec2 baseUv, vec3 viewTangent, float scale, float minLayers, float maxLayers, float fade) {
    float facing = clamp(viewTangent.z, 0.0, 1.0);
    float layerCount = floor(clamp(mix(max(minLayers, 1.0), max(maxLayers, 1.0), facing), 1.0, 32.0));
    if (scale <= 0.0) return baseUv;
    float layerDepth = 1.0 / layerCount;
    vec2 deltaUv = viewTangent.xy * scale * fade / layerCount;
    vec2 currentUv = baseUv;
    float currentLayer = 0.0;
    float currentHeight = 1.0 - texture2D(heightMap, currentUv).r;
    for (int step = 0; step < 32; step++) {
        if (float(step) >= layerCount || currentLayer >= currentHeight) break;
        currentUv -= deltaUv;
        currentHeight = 1.0 - texture2D(heightMap, currentUv).r;
        currentLayer += layerDepth;
    }
    vec2 previousUv = currentUv + deltaUv;
    float after = currentHeight - currentLayer;
    float before = 1.0 - texture2D(heightMap, previousUv).r - currentLayer + layerDepth;
    float weight = clamp(after / max(after - before, 0.0001), 0.0, 1.0);
    return mix(currentUv, previousUv, weight);
}
`;

const parallaxOcclusionWGSL = `var pomUv = input.uv;
if (modelData.extra2.y > 0.5) {
    let pomDp1 = dpdx(input.worldPosition);
    let pomDp2 = dpdy(input.worldPosition);
    let pomDu1 = dpdx(input.uv);
    let pomDu2 = dpdy(input.uv);
    let pomDet = pomDu1.x * pomDu2.y - pomDu2.x * pomDu1.y;
    if (abs(pomDet) > 0.0000001) {
        let pomDpdu = (pomDp1 * pomDu2.y - pomDp2 * pomDu1.y) / pomDet;
        let pomDpdv = (pomDp2 * pomDu1.x - pomDp1 * pomDu2.x) / pomDet;
        let pomT0 = normalize(pomDpdu);
        let pomB0 = normalize(pomDpdv);
        let pomN = normalize(cross(pomT0, pomB0));
        let pomT = normalize(pomT0 - pomN * dot(pomT0, pomN));
        let pomB = cross(pomN, pomT);
        let pomV = normalize(camera.cameraPosition.xyz - input.worldPosition);
        let pomView = vec3<f32>(dot(pomV, pomT), dot(pomV, pomB), dot(pomV, pomN));
        let pomFacing = clamp(pomView.z, 0.0, 1.0);
        let pomLayers = floor(clamp(mix(8.0, max(modelData.extra2.w, 1.0), pomFacing), 1.0, 32.0));
        let pomLayerDepth = 1.0 / pomLayers;
        let pomDelta = pomView.xy * modelData.extra2.z / pomLayers;
        var pomCurUv = input.uv;
        var pomCurDepth = 0.0;
        var pomCurValue = 1.0 - textureSample(parallaxTexture, parallaxSampler, pomCurUv).r;
        for (var pomStep = 0; pomStep < 32; pomStep = pomStep + 1) {
            if (f32(pomStep) >= pomLayers || pomCurDepth >= pomCurValue) { break; }
            pomCurUv = pomCurUv - pomDelta;
            pomCurValue = 1.0 - textureSample(parallaxTexture, parallaxSampler, pomCurUv).r;
            pomCurDepth = pomCurDepth + pomLayerDepth;
        }
        let pomPrevUv = pomCurUv + pomDelta;
        let pomAfter = pomCurValue - pomCurDepth;
        let pomBefore = 1.0 - textureSample(parallaxTexture, parallaxSampler, pomPrevUv).r - pomCurDepth + pomLayerDepth;
        let pomWeight = clamp(pomAfter / max(pomAfter - pomBefore, 0.0001), 0.0, 1.0);
        pomUv = mix(pomCurUv, pomPrevUv, pomWeight);
    }
}
`;

function applyParallaxOcclusion(material, options) {
    if (!material) return material;
    options = options || {};
    if (options.map !== undefined) material.parallaxMap = options.map;
    if (options.scale !== undefined) material.parallaxScale = options.scale;
    else if (material.parallaxScale === undefined) material.parallaxScale = parallaxOcclusionDefaults.scale;
    if (options.minLayers !== undefined) material.parallaxMinLayers = options.minLayers;
    else if (material.parallaxMinLayers === undefined) material.parallaxMinLayers = parallaxOcclusionDefaults.minLayers;
    if (options.maxLayers !== undefined) material.parallaxMaxLayers = options.maxLayers;
    else if (material.parallaxMaxLayers === undefined) material.parallaxMaxLayers = parallaxOcclusionDefaults.maxLayers;
    if (options.fade !== undefined) material.parallaxFade = options.fade;
    material.needsUpdate = true;
    return material;
}

function parallaxOcclusionEnabled(material) {
    return !!(material && material.parallaxMap && material.parallaxScale > 0);
}

export { applyParallaxOcclusion, parallaxOcclusionDefaults, parallaxOcclusionEnabled, parallaxOcclusionGLSL, parallaxOcclusionWGSL };
