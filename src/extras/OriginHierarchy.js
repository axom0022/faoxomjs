class OriginNode {
    constructor(name, parent, origin) {
        this.name = name;
        this.parent = parent || null;
        this.origin = new Float64Array(3);
        this.version = 0;
        if (origin) this.set(origin);
    }
    set(origin) {
        this.origin[0] = origin.x === undefined ? origin[0] || 0 : origin.x;
        this.origin[1] = origin.y === undefined ? origin[1] || 0 : origin.y;
        this.origin[2] = origin.z === undefined ? origin[2] || 0 : origin.z;
        this.version++;
        return this;
    }
}

class OriginHierarchy {
    constructor(options) {
        options = options || {};
        this.nodes = new Map;
        this.nodes.set("global", new OriginNode("global", null, options.global || [ 0, 0, 0 ]));
        this.listeners = new Set;
        this.stats = { nodes: 1, rebases: 0, conversions: 0 };
    }
    define(name, parent, origin) {
        if (!name || this.nodes.has(name)) throw new Error("OriginHierarchy duplicate node " + name);
        parent = parent || "global";
        var parentnode = this.nodes.get(parent);
        if (!parentnode) throw new Error("OriginHierarchy unknown parent " + parent);
        var node = new OriginNode(name, parentnode, origin || [ 0, 0, 0 ]);
        this.nodes.set(name, node);
        this.stats.nodes = this.nodes.size;
        return node;
    }
    remove(name) {
        if (name === "global") return false;
        var node = this.nodes.get(name);
        if (!node) return false;
        var iterator = this.nodes.values();
        for (var next = iterator.next(); !next.done; next = iterator.next()) if (next.value.parent === node) throw new Error("OriginHierarchy cannot remove parent with children " + name);
        this.nodes.delete(name);
        this.stats.nodes = this.nodes.size;
        return true;
    }
    node(name) {
        var node = typeof name === "string" ? this.nodes.get(name) : name;
        if (!node) throw new Error("OriginHierarchy unknown node " + name);
        return node;
    }
    globalOrigin(name, target) {
        var node = this.node(name);
        target = target || new Float64Array(3);
        target[0] = 0;
        target[1] = 0;
        target[2] = 0;
        while (node) {
            target[0] += node.origin[0];
            target[1] += node.origin[1];
            target[2] += node.origin[2];
            node = node.parent;
        }
        return target;
    }
    toGlobal(name, position, target) {
        var origin = this.globalOrigin(name, new Float64Array(3));
        target = target || new Float64Array(3);
        target[0] = origin[0] + (position.x === undefined ? position[0] : position.x);
        target[1] = origin[1] + (position.y === undefined ? position[1] : position.y);
        target[2] = origin[2] + (position.z === undefined ? position[2] : position.z);
        this.stats.conversions++;
        return target;
    }
    fromGlobal(name, position, target) {
        var origin = this.globalOrigin(name, new Float64Array(3));
        target = target || new Float64Array(3);
        target[0] = (position.x === undefined ? position[0] : position.x) - origin[0];
        target[1] = (position.y === undefined ? position[1] : position.y) - origin[1];
        target[2] = (position.z === undefined ? position[2] : position.z) - origin[2];
        this.stats.conversions++;
        return target;
    }
    convert(from, to, position, target) {
        return this.fromGlobal(to, this.toGlobal(from, position, new Float64Array(3)), target);
    }
    rebase(name, origin, objects) {
        var node = this.node(name);
        var old = new Float64Array(node.origin);
        node.set(origin);
        var shift = new Float64Array([ old[0] - node.origin[0], old[1] - node.origin[1], old[2] - node.origin[2] ]);
        objects = objects || [];
        for (var index = 0; index < objects.length; index++) {
            var object = objects[index];
            if (!object || !object.position) continue;
            object.position.x += shift[0];
            object.position.y += shift[1];
            object.position.z += shift[2];
            if (object.updateMatrix) object.updateMatrix();
        }
        this.stats.rebases++;
        this.listeners.forEach(function(listener) { listener({ node: node, oldOrigin: old, newOrigin: new Float64Array(node.origin), shift: shift }); });
        return shift;
    }
    onRebase(listener) {
        this.listeners.add(listener);
        return this;
    }
    offRebase(listener) {
        this.listeners.delete(listener);
        return this;
    }
    serialize() {
        var result = [];
        this.nodes.forEach(function(node) {
            result.push({ name: node.name, parent: node.parent ? node.parent.name : null, origin: Array.from(node.origin), version: node.version });
        });
        result.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
        return result;
    }
    restore(records) {
        this.nodes.clear();
        var pending = records.slice();
        while (pending.length) {
            var progressed = false;
            for (var index = pending.length - 1; index >= 0; index--) {
                var record = pending[index];
                if (record.parent && !this.nodes.has(record.parent)) continue;
                this.nodes.set(record.name, new OriginNode(record.name, record.parent ? this.nodes.get(record.parent) : null, record.origin));
                pending.splice(index, 1);
                progressed = true;
            }
            if (!progressed) throw new Error("OriginHierarchy invalid serialized hierarchy");
        }
        if (!this.nodes.has("global")) this.nodes.set("global", new OriginNode("global", null, [ 0, 0, 0 ]));
        this.stats.nodes = this.nodes.size;
        return this;
    }
    report() {
        return { hierarchy: this.serialize(), stats: Object.assign({}, this.stats) };
    }
}

export { OriginHierarchy, OriginNode };
