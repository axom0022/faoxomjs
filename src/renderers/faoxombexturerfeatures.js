const backends = {
    webgl: {
        name: "webgl",
        shaderLanguage: "glsl",
        versions: [ "webgl2", "webgl1" ],
        compute: false,
        storageBuffers: false,
        indirectDraw: false,
        rayQuery: false,
        gpuTimestamps: false,
        instancing: true,
        vertexTextureFetch: true,
        floatingPointTargets: true,
        depthTextures: true,
        dualSourceBlending: true,
        textureArrays: true,
        cubeTextures: true,
        anisotropy: true,
        maxLights: 8,
        maxTextureUnits: 16,
        parallaxOcclusion: true,
        nodeMaterials: true,
        shaderDefines: true
    },
    webgpu: {
        name: "webgpu",
        shaderLanguage: "wgsl",
        versions: [ "webgpu" ],
        compute: true,
        storageBuffers: true,
        indirectDraw: true,
        rayQuery: true,
        gpuTimestamps: true,
        instancing: true,
        vertexTextureFetch: true,
        floatingPointTargets: true,
        depthTextures: true,
        dualSourceBlending: false,
        textureArrays: true,
        cubeTextures: true,
        anisotropy: true,
        maxLights: 8,
        maxTextureUnits: 32,
        parallaxOcclusion: true,
        nodeMaterials: true,
        shaderDefines: false
    }
};

function backendFeatures(backend) {
    var key = String(backend || "").toLowerCase();
    if (key === "gpu" || key === "webgpu") return backends.webgpu;
    if (key === "gl" || key === "webgl" || key === "webgl2") return backends.webgl;
    return null;
}

function supportsFeature(backend, feature) {
    var table = backendFeatures(backend);
    if (!table || !feature) return false;
    return table[feature] === true;
}

function featureParity() {
    var result = {};
    var names = Object.keys(backends.webgl);
    for (var index = 0; index < names.length; index++) {
        var name = names[index];
        result[name] = {
            webgl: backends.webgl[name],
            webgpu: backends.webgpu[name],
            parity: backends.webgl[name] === backends.webgpu[name]
        };
    }
    return result;
}

function featureGaps() {
    var parity = featureParity();
    var gaps = [];
    var names = Object.keys(parity);
    for (var index = 0; index < names.length; index++) {
        var entry = parity[names[index]];
        if (typeof entry.webgl !== "boolean") continue;
        if (!entry.parity) gaps.push(names[index]);
    }
    return gaps;
}

function describeBackend(backend) {
    var table = backendFeatures(backend);
    if (!table) return null;
    return {
        name: table.name,
        shaderLanguage: table.shaderLanguage,
        compute: table.compute,
        indirectDraw: table.indirectDraw,
        rayQuery: table.rayQuery,
        gpuTimestamps: table.gpuTimestamps,
        maxLights: table.maxLights,
        parallaxOcclusion: table.parallaxOcclusion
    };
}

export { backendFeatures, backends, describeBackend, featureGaps, featureParity, supportsFeature };
