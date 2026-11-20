async function faoxomfbxinflate(zaela) {
    if (typeof DecompressionStream !== "undefined") {
        var zaelb = new Blob([ zaela ]).stream().pipeThrough(new DecompressionStream("deflate"));
        return new Uint8Array(await new Response(zaelb).arrayBuffer());
    }
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        var zaelc = await (import("node:zlib"));
        return new Uint8Array(zaelc.inflateSync(zaela));
    }
    throw new Error("FBX compressed arrays require DecompressionStream or Node zlib");
}

export { faoxomfbxinflate };
