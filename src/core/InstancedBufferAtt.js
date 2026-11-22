import { BufferAttribute } from "./BufferAttribute.js";

class InstancedBufferAtt extends BufferAttribute {
    constructor(zacra, zacrb, zacrc) {
        super(zacra, zacrb, zacrc);
        this.isInstancedBufferAtt = true;
    }
    setUsage(zacra) {
        this.usage = zacra;
        return this;
    }
    setX(zacra, zacrb) {
        this.array[zacra * this.itemSize] = zacrb;
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    setY(zacra, zacrb) {
        this.array[zacra * this.itemSize + 1] = zacrb;
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    setZ(zacra, zacrb) {
        this.array[zacra * this.itemSize + 2] = zacrb;
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    setW(zacra, zacrb) {
        this.array[zacra * this.itemSize + 3] = zacrb;
        this.needsUpdate = true;
        this.version++;
        return this;
    }
    setXY(zacra, zacrb, zacrc) {
        return this.setX(zacra, zacrb).setY(zacra, zacrc);
    }
    setXYZ(zacra, zacrb, zacrc, zacrd) {
        return this.setX(zacra, zacrb).setY(zacra, zacrc).setZ(zacra, zacrd);
    }
}

export { InstancedBufferAtt };
