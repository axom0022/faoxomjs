var faoxomtypes = {
    f32: Float32Array,
    f64: Float64Array,
    i8: Int8Array,
    u8: Uint8Array,
    i16: Int16Array,
    u16: Uint16Array,
    i32: Int32Array,
    u32: Uint32Array
};

class ComponentSchema {
    constructor(name, definition) {
        definition = definition || {};
        this.name = name;
        this.version = definition.version || 1;
        this.fields = Object.create(null);
        var fields = definition.fields || {};
        var names = Object.keys(fields).sort();
        for (var index = 0; index < names.length; index++) {
            var value = fields[names[index]];
            var descriptor = typeof value === "string" ? { type: value } : Object.assign({}, value);
            descriptor.type = descriptor.type || "f32";
            descriptor.length = Math.max(1, descriptor.length || 1);
            descriptor.default = descriptor.default === undefined ? 0 : descriptor.default;
            if (!faoxomtypes[descriptor.type]) throw new Error("ComponentSchema unsupported type " + descriptor.type);
            this.fields[names[index]] = descriptor;
        }
    }
}

class ArchetypeTable {
    constructor(world, names, capacity) {
        this.world = world;
        this.names = names.slice().sort();
        this.signature = this.names.join("|");
        this.capacity = Math.max(16, capacity || 64);
        this.count = 0;
        this.entities = null;
        this.columns = Object.create(null);
        this.allocate(this.capacity, null);
    }
    buffer(bytes) {
        if (this.world.shared && typeof SharedArrayBuffer !== "undefined") return new SharedArrayBuffer(bytes);
        return new ArrayBuffer(bytes);
    }
    allocate(capacity, previous) {
        var entitybuffer = this.buffer(capacity * 4);
        var entities = new Uint32Array(entitybuffer);
        if (previous) entities.set(previous.entities.subarray(0, previous.count));
        this.entities = entities;
        var columns = Object.create(null);
        for (var componentindex = 0; componentindex < this.names.length; componentindex++) {
            var name = this.names[componentindex];
            var schema = this.world.schemas.get(name);
            var component = Object.create(null);
            var fieldnames = Object.keys(schema.fields);
            for (var fieldindex = 0; fieldindex < fieldnames.length; fieldindex++) {
                var fieldname = fieldnames[fieldindex];
                var descriptor = schema.fields[fieldname];
                var Type = faoxomtypes[descriptor.type];
                var array = new Type(this.buffer(capacity * descriptor.length * Type.BYTES_PER_ELEMENT));
                if (previous) array.set(previous.columns[name][fieldname].subarray(0, previous.count * descriptor.length));
                component[fieldname] = array;
            }
            columns[name] = component;
        }
        this.columns = columns;
        this.capacity = capacity;
    }
    ensure(count) {
        if (count <= this.capacity) return;
        var previous = { entities: this.entities, columns: this.columns, count: this.count };
        this.allocate(Math.max(count, this.capacity * 2), previous);
        this.world.stats.resizes++;
    }
    add(entity, values) {
        this.ensure(this.count + 1);
        var row = this.count++;
        this.entities[row] = entity;
        for (var componentindex = 0; componentindex < this.names.length; componentindex++) {
            var name = this.names[componentindex];
            var schema = this.world.schemas.get(name);
            var source = values && values[name] || {};
            var fields = Object.keys(schema.fields);
            for (var fieldindex = 0; fieldindex < fields.length; fieldindex++) {
                var field = fields[fieldindex];
                var descriptor = schema.fields[field];
                var target = this.columns[name][field];
                var value = source[field] === undefined ? descriptor.default : source[field];
                var offset = row * descriptor.length;
                if (descriptor.length === 1) target[offset] = value; else {
                    for (var element = 0; element < descriptor.length; element++) target[offset + element] = value && value[element] !== undefined ? value[element] : descriptor.default;
                }
            }
        }
        return row;
    }
    remove(row) {
        var last = this.count - 1;
        var moved = 0;
        if (row < 0 || row > last) return moved;
        if (row !== last) {
            moved = this.entities[last];
            this.entities[row] = moved;
            for (var componentindex = 0; componentindex < this.names.length; componentindex++) {
                var name = this.names[componentindex];
                var schema = this.world.schemas.get(name);
                var fields = Object.keys(schema.fields);
                for (var fieldindex = 0; fieldindex < fields.length; fieldindex++) {
                    var field = fields[fieldindex];
                    var length = schema.fields[field].length;
                    var array = this.columns[name][field];
                    var target = row * length;
                    var source = last * length;
                    for (var element = 0; element < length; element++) array[target + element] = array[source + element];
                }
            }
        }
        this.count--;
        return moved;
    }
    read(row, name, target) {
        var schema = this.world.schemas.get(name);
        if (!schema || !this.columns[name]) return null;
        target = target || {};
        var fields = Object.keys(schema.fields);
        for (var index = 0; index < fields.length; index++) {
            var field = fields[index];
            var descriptor = schema.fields[field];
            var array = this.columns[name][field];
            var offset = row * descriptor.length;
            if (descriptor.length === 1) target[field] = array[offset]; else {
                var value = target[field] && target[field].length === descriptor.length ? target[field] : new Array(descriptor.length);
                for (var element = 0; element < descriptor.length; element++) value[element] = array[offset + element];
                target[field] = value;
            }
        }
        return target;
    }
    write(row, name, values) {
        var schema = this.world.schemas.get(name);
        if (!schema || !this.columns[name]) throw new Error("ArchetypeTable missing component " + name);
        var fields = Object.keys(values || {});
        for (var index = 0; index < fields.length; index++) {
            var field = fields[index];
            var descriptor = schema.fields[field];
            if (!descriptor) continue;
            var array = this.columns[name][field];
            var offset = row * descriptor.length;
            var value = values[field];
            if (descriptor.length === 1) array[offset] = value; else for (var element = 0; element < descriptor.length; element++) array[offset + element] = value[element];
        }
        return this;
    }
}

class ArchetypeQuery {
    constructor(world, include, exclude) {
        this.world = world;
        this.include = include.slice().sort();
        this.exclude = (exclude || []).slice().sort();
        this.tables = [];
        this.version = -1;
    }
    refresh() {
        if (this.version === this.world.structureversion) return this;
        this.tables.length = 0;
        var tables = this.world.tables.values();
        for (var next = tables.next(); !next.done; next = tables.next()) {
            var table = next.value;
            var valid = true;
            for (var include = 0; include < this.include.length; include++) if (table.names.indexOf(this.include[include]) < 0) valid = false;
            for (var exclude = 0; exclude < this.exclude.length; exclude++) if (table.names.indexOf(this.exclude[exclude]) >= 0) valid = false;
            if (valid) this.tables.push(table);
        }
        this.version = this.world.structureversion;
        return this;
    }
    forEach(callback, context) {
        this.refresh();
        var visited = 0;
        for (var tableindex = 0; tableindex < this.tables.length; tableindex++) {
            var table = this.tables[tableindex];
            for (var row = 0; row < table.count; row++) {
                callback(table.entities[row], table.columns, row, context);
                visited++;
            }
        }
        return visited;
    }
    count() {
        this.refresh();
        var count = 0;
        for (var index = 0; index < this.tables.length; index++) count += this.tables[index].count;
        return count;
    }
    chunks(size) {
        this.refresh();
        size = Math.max(1, size || 256);
        var chunks = [];
        for (var tableindex = 0; tableindex < this.tables.length; tableindex++) {
            var table = this.tables[tableindex];
            for (var start = 0; start < table.count; start += size) chunks.push({ table: table, start: start, end: Math.min(table.count, start + size) });
        }
        return chunks;
    }
}

class ArchetypeJobScheduler {
    constructor(options) {
        options = options || {};
        this.taskPool = options.taskPool || null;
        this.concurrency = Math.max(1, options.concurrency || (typeof navigator !== "undefined" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 3));
        this.stats = { jobs: 0, chunks: 0, workerChunks: 0, localChunks: 0, failures: 0 };
    }
    async run(query, job, options) {
        options = options || {};
        var chunks = query.chunks(options.chunkSize || 256);
        this.stats.jobs++;
        this.stats.chunks += chunks.length;
        if (typeof job === "string") {
            if (!this.taskPool || typeof this.taskPool.run !== "function") throw new Error("ArchetypeJobScheduler requires a TaskPool for named jobs");
            var promises = [];
            for (var index = 0; index < chunks.length; index++) {
                var chunk = chunks[index];
                promises.push(this.taskPool.run(job, {
                    payload: options.payload || null,
                    signature: chunk.table.signature,
                    start: chunk.start,
                    end: chunk.end
                }));
                this.stats.workerChunks++;
            }
            return Promise.all(promises);
        }
        if (typeof job !== "function") throw new Error("ArchetypeJobScheduler job must be a function or task name");
        var cursor = 0;
        var results = new Array(chunks.length);
        var self = this;
        async function worker() {
            while (cursor < chunks.length) {
                var index = cursor++;
                try {
                    results[index] = await job(chunks[index], options.payload);
                    self.stats.localChunks++;
                } catch (error) {
                    self.stats.failures++;
                    throw error;
                }
            }
        }
        var workers = [];
        for (var workerindex = 0; workerindex < Math.min(this.concurrency, chunks.length); workerindex++) workers.push(worker());
        await Promise.all(workers);
        return results;
    }
}

class ArchetypeWorld {
    constructor(options) {
        options = options || {};
        this.shared = options.shared === true;
        this.initialCapacity = options.initialCapacity || 64;
        this.schemas = new Map;
        this.tables = new Map;
        this.locations = [];
        this.generations = [];
        this.free = [];
        this.nextentity = 1;
        this.structureversion = 0;
        this.queries = new Map;
        this.stats = { created: 0, destroyed: 0, moved: 0, resizes: 0, entities: 0, archetypes: 0 };
        this.gettable([]);
    }
    defineComponent(name, definition) {
        if (this.schemas.has(name)) throw new Error("ArchetypeWorld duplicate component " + name);
        var schema = definition instanceof ComponentSchema ? definition : new ComponentSchema(name, definition);
        this.schemas.set(name, schema);
        return schema;
    }
    gettable(names) {
        names = names.slice().sort();
        var signature = names.join("|");
        var table = this.tables.get(signature);
        if (!table) {
            for (var index = 0; index < names.length; index++) if (!this.schemas.has(names[index])) throw new Error("ArchetypeWorld unknown component " + names[index]);
            table = new ArchetypeTable(this, names, this.initialCapacity);
            this.tables.set(signature, table);
            this.structureversion++;
            this.stats.archetypes = this.tables.size;
        }
        return table;
    }
    allocateentity() {
        var id = this.free.length ? this.free.pop() : this.nextentity++;
        this.generations[id] = (this.generations[id] || 0) + 1;
        return id;
    }
    create(components) {
        components = components || {};
        var names = Object.keys(components).sort();
        var table = this.gettable(names);
        var entity = this.allocateentity();
        var row = table.add(entity, components);
        this.locations[entity] = { table: table, row: row, generation: this.generations[entity] };
        this.stats.created++;
        this.stats.entities++;
        return entity;
    }
    valid(entity) {
        return !!this.locations[entity];
    }
    destroy(entity) {
        var location = this.locations[entity];
        if (!location) return false;
        var moved = location.table.remove(location.row);
        if (moved) this.locations[moved].row = location.row;
        this.locations[entity] = null;
        this.free.push(entity);
        this.stats.destroyed++;
        this.stats.entities--;
        return true;
    }
    has(entity, component) {
        var location = this.locations[entity];
        return !!(location && location.table.columns[component]);
    }
    get(entity, component, target) {
        var location = this.locations[entity];
        return location ? location.table.read(location.row, component, target) : null;
    }
    set(entity, component, values) {
        var location = this.locations[entity];
        if (!location) throw new Error("ArchetypeWorld invalid entity " + entity);
        location.table.write(location.row, component, values);
        return this;
    }
    add(entity, component, values) {
        var location = this.locations[entity];
        if (!location) throw new Error("ArchetypeWorld invalid entity " + entity);
        if (location.table.names.indexOf(component) >= 0) return this.set(entity, component, values || {});
        var names = location.table.names.concat(component).sort();
        return this.move(entity, names, component, values || {}, null);
    }
    remove(entity, component) {
        var location = this.locations[entity];
        if (!location || location.table.names.indexOf(component) < 0) return this;
        var names = location.table.names.filter(function(name) { return name !== component; });
        return this.move(entity, names, null, null, component);
    }
    move(entity, names, added, values, removed) {
        var location = this.locations[entity];
        var source = location.table;
        var data = Object.create(null);
        for (var index = 0; index < source.names.length; index++) {
            var name = source.names[index];
            if (name !== removed) data[name] = source.read(location.row, name, {});
        }
        if (added) data[added] = values;
        var target = this.gettable(names);
        var row = target.add(entity, data);
        var moved = source.remove(location.row);
        if (moved) this.locations[moved].row = location.row;
        location.table = target;
        location.row = row;
        this.stats.moved++;
        return this;
    }
    query(include, exclude) {
        include = Array.isArray(include) ? include : [ include ];
        exclude = exclude || [];
        var key = include.slice().sort().join("|") + "!" + exclude.slice().sort().join("|");
        var query = this.queries.get(key);
        if (!query) {
            query = new ArchetypeQuery(this, include, exclude);
            this.queries.set(key, query);
        }
        return query;
    }
    clear() {
        this.tables.clear();
        this.locations.length = 0;
        this.free.length = 0;
        this.nextentity = 1;
        this.queries.clear();
        this.stats.entities = 0;
        this.stats.archetypes = 0;
        this.gettable([]);
        return this;
    }
    report() {
        var memory = 0;
        this.tables.forEach(function(table) {
            memory += table.entities.byteLength;
            for (var component in table.columns) for (var field in table.columns[component]) memory += table.columns[component][field].byteLength;
        });
        return {
            shared: this.shared,
            schemas: Array.from(this.schemas.keys()).sort(),
            entities: this.stats.entities,
            archetypes: this.tables.size,
            allocatedBytes: memory,
            stats: Object.assign({}, this.stats)
        };
    }
}

export { ArchetypeJobScheduler, ArchetypeQuery, ArchetypeTable, ArchetypeWorld, ComponentSchema };
