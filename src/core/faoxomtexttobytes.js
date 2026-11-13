function faoxomtexttobytes(text) { if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text); var out = []; for (var i = 0; i < text.length; i++) { var code = text.charCodeAt(i); if (code < 128) out.push(code); else if (code < 2048) out.push(192 | code >> 6, 128 | code & 63); else out.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63); } return new Uint8Array(out); }

export { faoxomtexttobytes };
