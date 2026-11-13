class NavmeshManager { constructor() { this.navmeshes = []; } add(navmesh) { this.navmeshes.push(navmesh); return navmesh; } remove(navmesh) { var i = this.navmeshes.indexOf(navmesh); if (i !== -1) this.navmeshes.splice(i, 1); } findPath(start, end) { return this.navmeshes.length ? this.navmeshes[0].findPath(start, end) : []; } }

export { NavmeshManager };
