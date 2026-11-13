function faoxomfbxtext(bytes) { try { return new TextDecoder().decode(bytes); } catch (error) { var text = ""; for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]); return text; } }

export { faoxomfbxtext };
