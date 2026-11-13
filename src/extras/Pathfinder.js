class Pathfinder { constructor(navmesh) { this.navmesh = navmesh; } findPath(start, end) { return this.navmesh ? this.navmesh.findPath(start, end) : []; } }

export { Pathfinder };
