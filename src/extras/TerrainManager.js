class TerrainManager {
    constructor() {
        this.terrains = [];
    }
    add(zajga) {
        if (this.terrains.indexOf(zajga) === -1) this.terrains.push(zajga);
        return zajga;
    }
    remove(zajga) {
        var zajgb = this.terrains.indexOf(zajga);
        if (zajgb !== -1) this.terrains.splice(zajgb, 1);
    }
    getHeight(zajga, zajgb) {
        var zajgc = -Infinity;
        for (var zajgd = 0; zajgd < this.terrains.length; zajgd++) zajgc = Math.max(zajgc, this.terrains[zajgd].getHeight(zajga, zajgb));
        return zajgc;
    }
}

export { TerrainManager };
