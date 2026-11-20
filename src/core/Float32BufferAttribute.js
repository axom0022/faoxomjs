import { BufferAttribute } from "./BufferAttribute.js";

class Float32BufferAttribute extends BufferAttribute {
    constructor(zacla, zaclb, zaclc) {
        super(zacla instanceof Float32Array ? zacla : new Float32Array(zacla), zaclb, zaclc);
    }
}

export { Float32BufferAttribute };
