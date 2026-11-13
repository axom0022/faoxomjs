function faoxombase64bytes(value) { var normalized = value.replace(/-/g, "+").replace(/_/g, "/"); var binary = typeof atob === "function" ? atob(normalized) : typeof Buffer !== "undefined" ? Buffer.from(normalized, "base64").toString("binary") : ""; var bytes = new Uint8Array(binary.length); for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes.buffer; }

export { faoxombase64bytes };
