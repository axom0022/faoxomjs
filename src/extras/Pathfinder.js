class Pathfinder {
    constructor(zaiha) {
        this.navmesh = zaiha;
    }
    findPath(zaiha, zaihb) {
        return this.navmesh ? this.navmesh.findPath(zaiha, zaihb) : [];
    }
}

export { Pathfinder };
