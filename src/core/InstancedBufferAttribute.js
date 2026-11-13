import { BufferAttribute } from "./BufferAttribute.js";

class InstancedBufferAttribute extends BufferAttribute {
    constructor(array, itemSize, normalized) { super(array, itemSize, normalized); this.isInstancedBufferAttribute = true; }
    setUsage(usage) { this.usage = usage; return this; }
    setX(index, value) { this.array[index * this.itemSize] = value; this.needsUpdate = true; this.version++; return this; }
    setY(index, value) { this.array[index * this.itemSize + 1] = value; this.needsUpdate = true; this.version++; return this; }
    setZ(index, value) { this.array[index * this.itemSize + 2] = value; this.needsUpdate = true; this.version++; return this; }
    setW(index, value) { this.array[index * this.itemSize + 3] = value; this.needsUpdate = true; this.version++; return this; }
    setXY(index, x, y) { return this.setX(index, x).setY(index, y); }
    setXYZ(index, x, y, z) { return this.setX(index, x).setY(index, y).setZ(index, z); }
}

export { InstancedBufferAttribute };
