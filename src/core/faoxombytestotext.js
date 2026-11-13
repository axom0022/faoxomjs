function faoxombytestotext(bytes, start) { var text = "", first = start || 0; for (var i = first; i < bytes.length; i += 8192) text += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length))); return text; }

export { faoxombytestotext };
