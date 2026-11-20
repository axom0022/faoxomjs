class NavmeshManager {
    constructor() {
        this.navmeshes = [];
    }
    add(zaica) {
        this.navmeshes.push(zaica);
        return zaica;
    }
    remove(zaica) {
        var zaicb = this.navmeshes.indexOf(zaica);
        if (zaicb !== -1) this.navmeshes.splice(zaicb, 1);
    }
    findPath(zaica, zaicb) {
        return this.navmeshes.length ? this.navmeshes[0].findPath(zaica, zaicb) : [];
    }
}

export { NavmeshManager };
