import { BufferAttribute } from "./BufferAttribute.js";

class Float32BufferAttribute extends BufferAttribute { constructor(array, itemSize, normalized) { super(array instanceof Float32Array ? array : new Float32Array(array), itemSize, normalized); } }

export { Float32BufferAttribute };
