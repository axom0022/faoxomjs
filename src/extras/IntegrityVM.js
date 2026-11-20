// IntegrityVM - a tiny polymorphic bytecode virtual machine. Game rules are
// compiled to a custom 32 opcode instruction set whose byte values are
// permuted per session, so a static dump of the shipped script never reveals
// a stable disassembly. Loops are bounded by a gas limit so a bad program can
// never hang the frame.

var BASE_OPS = [
    "HALT", "LOAD_CONST", "LOAD_VAR", "STORE_VAR", "ADD", "SUB", "MUL", "DIV",
    "MOD", "NEG", "CMP_LT", "CMP_EQ", "CMP_GT", "JMP", "JMP_IF_ZERO", "JMP_IF_NOT_ZERO",
    "CALL", "RETURN", "PEEK", "POKE", "RAND", "HASH", "CLAMP", "MIN", "MAX",
    "NOT", "AND", "OR", "XOR", "SHL", "SHR", "NOP"
];

function faoxomvmpermute(seed) {
    // Fisher-Yates over opcode byte values driven by a xorshift stream.
    var state = (seed >>> 0) || 0x9e3779b9;
    function next() {
        state ^= state << 13; state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5; state >>>= 0;
        return state;
    }
    var bytes = [];
    for (var i = 0; i < BASE_OPS.length; i++) bytes.push(i);
    for (var j = bytes.length - 1; j > 0; j--) {
        var k = next() % (j + 1);
        var t = bytes[j]; bytes[j] = bytes[k]; bytes[k] = t;
    }
    return bytes; // perm[i] = wire byte for BASE_OPS[i]
}

class IntegrityVM {
    constructor(options) {
        options = options || {};
        this.seed = (options.seed !== undefined ? options.seed : Math.random() * 0xffffffff) >>> 0;
        this._perm = faoxomvmpermute(this.seed);
        this._wireToName = {};
        for (var i = 0; i < BASE_OPS.length; i++) this._wireToName[this._perm[i]] = BASE_OPS[i];
        this.gasLimit = Math.max(64, options.gasLimit || 100000);
        this.vars = new Float64Array(options.varCount || 32);
        this.out = [];
        this.callDepth = 0;
        this.hooks = options.hooks || {}; // named host calls: { name: fn(args) }
    }

    // assemble takes a program in base opcode names and encodes it with this
    // session's permutation. layout: [op, a, b] triplets of 16 bit words.
    assemble(program) {
        var lines = Array.isArray(program) ? program : String(program).split("\n");
        var words = [];
        for (var i = 0; i < lines.length; i++) {
            var line = String(lines[i]).trim();
            if (!line || line.indexOf("//") === 0) continue;
            var parts = line.split(/\s+/);
            var name = parts[0].toUpperCase();
            var index = BASE_OPS.indexOf(name);
            if (index < 0) throw new Error("IntegrityVM: unknown opcode " + name);
            words.push(this._perm[index], Number(parts[1]) || 0, Number(parts[2]) || 0);
        }
        return new Uint16Array(words);
    }

    run(code, entry) {
        var pc = (entry || 0) * 3;
        var gas = this.gasLimit;
        var stack = [];
        this.out.length = 0;
        this.callDepth = 0;
        while (gas-- > 0) {
            if (pc < 0 || pc + 2 >= code.length) break;
            var op = this._wireToName[code[pc]];
            var a = code[pc + 1], b = code[pc + 2];
            pc += 3;
            switch (op) {
                case "HALT": return this.out;
                case "LOAD_CONST": stack.push(a + (b / 65535)); break;
                case "LOAD_VAR": stack.push(this.vars[a] || 0); break;
                case "STORE_VAR": this.vars[a] = stack.length ? stack.pop() : 0; break;
                case "ADD": { var r = stack.pop() || 0, l = stack.pop() || 0; stack.push(l + r); break; }
                case "SUB": { var r2 = stack.pop() || 0, l2 = stack.pop() || 0; stack.push(l2 - r2); break; }
                case "MUL": { var r3 = stack.pop() || 0, l3 = stack.pop() || 0; stack.push(l3 * r3); break; }
                case "DIV": { var r4 = stack.pop() || 0, l4 = stack.pop() || 0; stack.push(r4 === 0 ? 0 : l4 / r4); break; }
                case "MOD": { var r5 = stack.pop() || 0, l5 = stack.pop() || 0; stack.push(r5 === 0 ? 0 : l5 % r5); break; }
                case "NEG": stack.push(-(stack.pop() || 0)); break;
                case "CMP_LT": { var rb = stack.pop() || 0, lb = stack.pop() || 0; stack.push(lb < rb ? 1 : 0); break; }
                case "CMP_EQ": { var rc = stack.pop() || 0, lc = stack.pop() || 0; stack.push(lc === rc ? 1 : 0); break; }
                case "CMP_GT": { var rd = stack.pop() || 0, ld = stack.pop() || 0; stack.push(ld > rd ? 1 : 0); break; }
                case "JMP": pc = a * 3; break;
                case "JMP_IF_ZERO": if (!(stack.length ? stack[stack.length - 1] : 0)) pc = a * 3; break;
                case "JMP_IF_NOT_ZERO": if (stack.length && stack[stack.length - 1]) pc = a * 3; break;
                case "CALL": {
                    if (++this.callDepth > 32) throw new Error("IntegrityVM: call depth exceeded");
                    stack.push(pc / 3);
                    pc = a * 3;
                    break;
                }
                case "RETURN": {
                    if (--this.callDepth < 0) throw new Error("IntegrityVM: return without call");
                    pc = (stack.length ? stack.pop() : 0) * 3;
                    break;
                }
                case "PEEK": stack.push(this.vars[a] || 0); break;
                case "POKE": this.vars[a] = stack.length ? stack[stack.length - 1] : 0; break;
                case "RAND": stack.push((Math.random() * (a || 1))); break;
                case "HASH": { var v = stack.length ? stack.pop() : 0; stack.push(faoxomvmhash(v, a)); break; }
                case "CLAMP": { var hi = stack.pop() || 0, lo = stack.pop() || 0, x = stack.pop() || 0; stack.push(Math.min(hi, Math.max(lo, x))); break; }
                case "MIN": { var r6 = stack.pop() || 0, l6 = stack.pop() || 0; stack.push(Math.min(l6, r6)); break; }
                case "MAX": { var r7 = stack.pop() || 0, l7 = stack.pop() || 0; stack.push(Math.max(l7, r7)); break; }
                case "NOT": stack.push(stack.pop() ? 0 : 1); break;
                case "AND": { var r8 = stack.pop() || 0, l8 = stack.pop() || 0; stack.push((l8 !== 0 && r8 !== 0) ? 1 : 0); break; }
                case "OR": { var r9 = stack.pop() || 0, l9 = stack.pop() || 0; stack.push((l9 !== 0 || r9 !== 0) ? 1 : 0); break; }
                case "XOR": { var r10 = stack.pop() || 0, l10 = stack.pop() || 0; stack.push((l10 !== 0) !== (r10 !== 0) ? 1 : 0); break; }
                case "SHL": { var rs = stack.pop() || 0, ls = stack.pop() || 0; stack.push(Math.floor(ls) << Math.floor(rs)); break; }
                case "SHR": { var rs2 = stack.pop() || 0, ls2 = stack.pop() || 0; stack.push(Math.floor(ls2) >>> Math.floor(rs2)); break; }
                case "NOP": break;
                default: throw new Error("IntegrityVM: illegal opcode at word " + pc);
            }
        }
        throw new Error("IntegrityVM: gas exhausted (possible hang guarded)");
    }

    // Encodes game rules once on a build machine; ships only wire bytes.
    static pack(program, seed) {
        var vm = new IntegrityVM({ seed: seed });
        return { seed: vm.seed, code: vm.assemble(program) };
    }
}

function faoxomvmhash(value, salt) {
    var x = (Math.floor(value) ^ (salt * 0x9e3779b9)) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
    return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

export { IntegrityVM };
