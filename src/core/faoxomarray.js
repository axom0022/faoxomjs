function faoxomarray(value) { return value instanceof Float32Array || value instanceof Float64Array || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Uint16Array || value instanceof Uint32Array || value instanceof Int8Array || value instanceof Int16Array || value instanceof Int32Array ? value : Array.isArray(value) ? value : []; }

export { faoxomarray };
