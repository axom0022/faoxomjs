class TerrainManager { constructor() { this.terrains = []; } add(terrain) { if (this.terrains.indexOf(terrain) === -1) this.terrains.push(terrain); return terrain; } remove(terrain) { var i = this.terrains.indexOf(terrain); if (i !== -1) this.terrains.splice(i, 1); } getHeight(x, z) { var h = -Infinity; for (var i = 0; i < this.terrains.length; i++) h = Math.max(h, this.terrains[i].getHeight(x, z)); return h; } }

export { TerrainManager };
