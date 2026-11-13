async function faoxomfbxinflate(bytes) { if (typeof DecompressionStream !== "undefined") { var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate")); return new Uint8Array(await new Response(stream).arrayBuffer()); } if (typeof process !== "undefined" && process.versions && process.versions.node) { var zlib = await import("node:zlib"); return new Uint8Array(zlib.inflateSync(bytes)); } throw new Error("FBX compressed arrays require DecompressionStream or Node zlib"); }

export { faoxomfbxinflate };
