function faoxomarray(zadoa) {
    return zadoa instanceof Float32Array || zadoa instanceof Float64Array || zadoa instanceof Uint8Array || zadoa instanceof Uint8ClampedArray || zadoa instanceof Uint16Array || zadoa instanceof Uint32Array || zadoa instanceof Int8Array || zadoa instanceof Int16Array || zadoa instanceof Int32Array ? zadoa : Array.isArray(zadoa) ? zadoa : [];
}

export { faoxomarray };
