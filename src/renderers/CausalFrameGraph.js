import { FrameGraph } from "./FrameGraph.js";

class CausalFrameGraph extends FrameGraph {
    constructor(renderer) {
        super(renderer);
        this.causes = new Map;
        this.conditions = new Map;
        this.fallbacks = new Map;
        this.decisions = [];
        this.context = null;
        this.causalstats = { evaluated: 0, enabled: 0, skipped: 0, recovered: 0, failures: 0 };
    }
    addCausalPass(name, options) {
        options = options || {};
        var execute = options.execute;
        var self = this;
        var wrapped = function(context) {
            var enabled = self.evaluate(name, self.context || context);
            if (!enabled) {
                self.causalstats.skipped++;
                return;
            }
            self.causalstats.enabled++;
            if (!execute) return;
            try {
                return execute(context);
            } catch (error) {
                self.causalstats.failures++;
                var fallback = self.fallbacks.get(name);
                if (!fallback) throw error;
                self.causalstats.recovered++;
                self.decisions.push({ pass: name, decision: "fallback", reason: error && error.message || String(error) });
                return fallback(context, error);
            }
        };
        super.addPass(name, Object.assign({}, options, { execute: wrapped }));
        this.causes.set(name, (options.causes || []).map(function(value) {
            return typeof value === "string" ? { reason: value } : Object.assign({}, value);
        }));
        if (typeof options.condition === "function") this.conditions.set(name, options.condition);
        if (typeof options.fallback === "function") this.fallbacks.set(name, options.fallback);
        return this;
    }
    evaluate(name, context) {
        this.causalstats.evaluated++;
        var condition = this.conditions.get(name);
        if (!condition) return true;
        var result = condition(context || {}, this);
        var enabled = typeof result === "object" ? result.enabled !== false : result !== false;
        this.decisions.push({
            pass: name,
            decision: enabled ? "execute" : "skip",
            reason: typeof result === "object" && result.reason ? result.reason : enabled ? "condition-accepted" : "condition-rejected"
        });
        return enabled;
    }
    setContext(context) {
        this.context = context || null;
        return this;
    }
    addCause(pass, cause) {
        if (!this.causes.has(pass)) this.causes.set(pass, []);
        this.causes.get(pass).push(typeof cause === "string" ? { reason: cause } : Object.assign({}, cause));
        return this;
    }
    explain(pass) {
        if (this.passIndex[pass] === undefined) return null;
        var causes = this.causes.get(pass) || [];
        var dependencies = [];
        if (this.compiled) {
            for (var index = 0; index < this.compiled.edges.length; index++) {
                var edge = this.compiled.edges[index];
                if (this.passes[edge.to].name === pass) dependencies.push({ producer: this.passes[edge.from].name, resource: edge.resource, kind: edge.kind });
            }
        }
        return {
            pass: pass,
            causes: causes.map(function(value) { return Object.assign({}, value); }),
            dependencies: dependencies,
            hasCondition: this.conditions.has(pass),
            hasFallback: this.fallbacks.has(pass),
            decisions: this.decisions.filter(function(value) { return value.pass === pass; }).slice(-32)
        };
    }
    explainResource(name) {
        var index = this.resourceIndex[name];
        if (index === undefined) return null;
        var resource = this.resources[index];
        return {
            name: name,
            kind: resource.kind,
            imported: resource.imported,
            writers: resource.writers.map(index => this.passes[index].name),
            readers: resource.readers.map(index => this.passes[index].name),
            lifetime: resource.used ? { first: resource.first, last: resource.last, slot: resource.slot } : null
        };
    }
    decisionLog(clear) {
        var result = this.decisions.slice();
        if (clear) this.decisions.length = 0;
        return result;
    }
    clear() {
        super.clear();
        this.causes.clear();
        this.conditions.clear();
        this.fallbacks.clear();
        this.decisions.length = 0;
        return this;
    }
    report() {
        if (!this.compiled) this.compile();
        return {
            order: this.compiledOrder(),
            culled: this.culledPasses(),
            barriers: this.barriers(),
            aliases: this.aliasMap(),
            lifetimes: this.lifetimes(),
            slots: this.slotCounts(),
            causes: Array.from(this.causes.keys()).sort().map(name => this.explain(name)),
            stats: Object.assign({}, this.causalstats)
        };
    }
}

export { CausalFrameGraph };
