function faoxomprepareshadersource(zafqa, zafqb, zafqc) {
    var zafqd = String(zafqa || ""), zafqe = zafqd.match(/^\s*#version\s+[^\n]+\n?/);
    if (zafqe) zafqd = zafqd.slice(zafqe[0].length); else {
        var zafqf = zafqd.match(/(^|\n)\s*#version\s+[^\n]+\n?/);
        if (zafqf) {
            zafqe = zafqf[0].replace(/^\n/, "").trim() + "\n";
            zafqd = zafqd.replace(zafqf[0], "\n");
        }
    }
    if (zafqc) {
        if (zafqb === "vertex") {
            zafqd = zafqd.replace(/\battribute\b/g, "in").replace(/\bvarying\b/g, "out");
        } else {
            zafqd = zafqd.replace(/\bvarying\b/g, "in").replace(/\btexture2D\s*\(/g, "texture(").replace(/\btextureCube\s*\(/g, "texture(");
            if (zafqd.indexOf("gl_FragColor") >= 0) {
                zafqd = zafqd.replace(/\bgl_FragColor\b/g, "faoxomFragColor");
                if (!/\bout\s+vec4\s+faoxomFragColor\s*;/.test(zafqd)) zafqd = "out vec4 faoxomFragColor;\n" + zafqd;
            }
        }
    }
    var zafqg = zafqc ? "#version 300 es\n" : zafqe ? zafqe[0] : "";
    if (zafqb === "fragment" && !/\bprecision\s+(?:lowp|mediump|highp)\s+float\s*;/.test(zafqd)) zafqg += "precision highp float;\n";
    return zafqg + zafqd;
}

export { faoxomprepareshadersource };
