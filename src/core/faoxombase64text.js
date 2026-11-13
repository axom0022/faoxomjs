function faoxombase64text(buffer) { var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer); var parts = []; for (var i = 0; i < bytes.length; i += 8192) parts.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length)))); var binary = parts.join(""); return typeof btoa === "function" ? btoa(binary) : typeof Buffer !== "undefined" ? Buffer.from(binary, "binary").toString("base64") : ""; }

export { faoxombase64text };
