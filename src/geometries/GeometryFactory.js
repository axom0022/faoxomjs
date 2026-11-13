import { BoxGeometry } from "./BoxGeometry.js";
import { PlaneGeometry } from "./PlaneGeometry.js";
import { SphereGeometry } from "./SphereGeometry.js";

class GeometryFactory {
    constructor(options) { options = options || {}; this.cache = {}; this.cloneByDefault = !!options.clone; this.hits = 0; this.misses = 0; }
    key(type, values) { return type + ":" + values.map(function(value) { return value === undefined ? "d" : String(value); }).join(","); }
    getBox(width, height, depth, sx, sy, sz, options) { options = options || {}; var key = this.key("box", [width, height, depth, sx, sy, sz]), geometry = this.cache[key]; if (geometry) { this.hits++; return options.clone || this.cloneByDefault ? geometry.clone() : geometry; } this.misses++; geometry = new BoxGeometry(width, height, depth, sx, sy, sz); this.cache[key] = geometry; return options.clone || this.cloneByDefault ? geometry.clone() : geometry; }
    box(width, height, depth, sx, sy, sz, options) { return this.getBox(width, height, depth, sx, sy, sz, options); }
    getPlane(width, height, sx, sy, options) { options = options || {}; var key = this.key("plane", [width, height, sx, sy]), geometry = this.cache[key]; if (geometry) { this.hits++; return options.clone || this.cloneByDefault ? geometry.clone() : geometry; } this.misses++; geometry = new PlaneGeometry(width, height, sx, sy); this.cache[key] = geometry; return options.clone || this.cloneByDefault ? geometry.clone() : geometry; }
    plane(width, height, sx, sy, options) { return this.getPlane(width, height, sx, sy, options); }
    getSphere(radius, widthSegments, heightSegments, options) { options = options || {}; var key = this.key("sphere", [radius, widthSegments, heightSegments]), geometry = this.cache[key]; if (geometry) { this.hits++; return options.clone || this.cloneByDefault ? geometry.clone() : geometry; } this.misses++; geometry = new SphereGeometry(radius, widthSegments, heightSegments); this.cache[key] = geometry; return options.clone || this.cloneByDefault ? geometry.clone() : geometry; }
    sphere(radius, widthSegments, heightSegments, options) { return this.getSphere(radius, widthSegments, heightSegments, options); }
    create(type, values, options) { values = values || []; if (type === "box") return this.getBox(values[0], values[1], values[2], values[3], values[4], values[5], options); if (type === "plane") return this.getPlane(values[0], values[1], values[2], values[3], options); if (type === "sphere") return this.getSphere(values[0], values[1], values[2], options); throw new Error("Unsupported cached geometry type " + type); }
    clear() { for (var key in this.cache) if (this.cache[key] && this.cache[key].dispose) this.cache[key].dispose(); this.cache = {}; this.hits = 0; this.misses = 0; return this; }
    stats() { return { entries: Object.keys(this.cache).length, hits: this.hits, misses: this.misses }; }
}

export { GeometryFactory };
