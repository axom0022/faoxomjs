var zahwa = [ "HALT", "LOAD_CONST", "LOAD_VAR", "STORE_VAR", "ADD", "SUB", "MUL", "DIV", "MOD", "NEG", "CMP_LT", "CMP_EQ", "CMP_GT", "JMP", "JMP_IF_ZERO", "JMP_IF_NOT_ZERO", "CALL", "RETURN", "PEEK", "POKE", "RAND", "HASH", "CLAMP", "MIN", "MAX", "NOT", "AND", "OR", "XOR", "SHL", "SHR", "NOP" ];

function zahwb(zahwb) {
    var zahwc = zahwb >>> 0 || 2654435769;
    function zahwd() {
        zahwc ^= zahwc << 13;
        zahwc >>>= 0;
        zahwc ^= zahwc >>> 17;
        zahwc ^= zahwc << 5;
        zahwc >>>= 0;
        return zahwc;
    }
    var zahwe = [];
    for (var zahwf = 0; zahwf < zahwa.length; zahwf++) zahwe.push(zahwf);
    for (var zahwg = zahwe.length - 1; zahwg > 0; zahwg--) {
        var zahwh = zahwd() % (zahwg + 1);
        var zahwi = zahwe[zahwg];
        zahwe[zahwg] = zahwe[zahwh];
        zahwe[zahwh] = zahwi;
    }
    return zahwe;
}

class IntegrityVM {
    constructor(zahwc) {
        zahwc = zahwc || {};
        this.seed = (zahwc.seed !== undefined ? zahwc.seed : Math.random() * 4294967295) >>> 0;
        this._perm = zahwb(this.seed);
        this._wireToName = {};
        for (var zahwd = 0; zahwd < zahwa.length; zahwd++) this._wireToName[this._perm[zahwd]] = zahwa[zahwd];
        this.gasLimit = Math.max(64, zahwc.gasLimit || 1e5);
        this.vars = new Float64Array(zahwc.varCount || 32);
        this.out = [];
        this.callDepth = 0;
        this.hooks = zahwc.hooks || {};
    }
    assemble(zahwb) {
        var zahwc = Array.isArray(zahwb) ? zahwb : String(zahwb).split("\n");
        var zahwd = [];
        for (var zahwe = 0; zahwe < zahwc.length; zahwe++) {
            var zahwf = String(zahwc[zahwe]).trim();
            if (!zahwf || zahwf.indexOf("//") === 0) continue;
            var zahwg = zahwf.split(/\s+/);
            var zahwh = zahwg[0].toUpperCase();
            var zahwi = zahwa.indexOf(zahwh);
            if (zahwi < 0) throw new Error("IntegrityVM: unknown opcode " + zahwh);
            zahwd.push(this._perm[zahwi], Number(zahwg[1]) || 0, Number(zahwg[2]) || 0);
        }
        return new Uint16Array(zahwd);
    }
    run(zahwa, zahwb) {
        var zahwd = (zahwb || 0) * 3;
        var zahwe = this.gasLimit;
        var zahwf = [];
        this.out.length = 0;
        this.callDepth = 0;
        while (zahwe-- > 0) {
            if (zahwd < 0 || zahwd + 2 >= zahwa.length) break;
            var zahwg = this._wireToName[zahwa[zahwd]];
            var zahwh = zahwa[zahwd + 1], zahwi = zahwa[zahwd + 2];
            zahwd += 3;
            switch (zahwg) {
              case "HALT":
                return this.out;

              case "LOAD_CONST":
                zahwf.push(zahwh + zahwi / 65535);
                break;

              case "LOAD_VAR":
                zahwf.push(this.vars[zahwh] || 0);
                break;

              case "STORE_VAR":
                this.vars[zahwh] = zahwf.length ? zahwf.pop() : 0;
                break;

              case "ADD":
                {
                    var zahwj = zahwf.pop() || 0, zahwk = zahwf.pop() || 0;
                    zahwf.push(zahwk + zahwj);
                    break;
                }

              case "SUB":
                {
                    var zahwl = zahwf.pop() || 0, zahwm = zahwf.pop() || 0;
                    zahwf.push(zahwm - zahwl);
                    break;
                }

              case "MUL":
                {
                    var zahwn = zahwf.pop() || 0, zahwo = zahwf.pop() || 0;
                    zahwf.push(zahwo * zahwn);
                    break;
                }

              case "DIV":
                {
                    var zahwp = zahwf.pop() || 0, zahwq = zahwf.pop() || 0;
                    zahwf.push(zahwp === 0 ? 0 : zahwq / zahwp);
                    break;
                }

              case "MOD":
                {
                    var zahwr = zahwf.pop() || 0, zahws = zahwf.pop() || 0;
                    zahwf.push(zahwr === 0 ? 0 : zahws % zahwr);
                    break;
                }

              case "NEG":
                zahwf.push(-(zahwf.pop() || 0));
                break;

              case "CMP_LT":
                {
                    var zahwt = zahwf.pop() || 0, zahwu = zahwf.pop() || 0;
                    zahwf.push(zahwu < zahwt ? 1 : 0);
                    break;
                }

              case "CMP_EQ":
                {
                    var zahwv = zahwf.pop() || 0, zahww = zahwf.pop() || 0;
                    zahwf.push(zahww === zahwv ? 1 : 0);
                    break;
                }

              case "CMP_GT":
                {
                    var zahwx = zahwf.pop() || 0, zahwy = zahwf.pop() || 0;
                    zahwf.push(zahwy > zahwx ? 1 : 0);
                    break;
                }

              case "JMP":
                zahwd = zahwh * 3;
                break;

              case "JMP_IF_ZERO":
                if (!(zahwf.length ? zahwf[zahwf.length - 1] : 0)) zahwd = zahwh * 3;
                break;

              case "JMP_IF_NOT_ZERO":
                if (zahwf.length && zahwf[zahwf.length - 1]) zahwd = zahwh * 3;
                break;

              case "CALL":
                {
                    if (++this.callDepth > 32) throw new Error("IntegrityVM: call depth exceeded");
                    zahwf.push(zahwd / 3);
                    zahwd = zahwh * 3;
                    break;
                }

              case "RETURN":
                {
                    if (--this.callDepth < 0) throw new Error("IntegrityVM: return without call");
                    zahwd = (zahwf.length ? zahwf.pop() : 0) * 3;
                    break;
                }

              case "PEEK":
                zahwf.push(this.vars[zahwh] || 0);
                break;

              case "POKE":
                this.vars[zahwh] = zahwf.length ? zahwf[zahwf.length - 1] : 0;
                break;

              case "RAND":
                zahwf.push(Math.random() * (zahwh || 1));
                break;

              case "HASH":
                {
                    var zahwz = zahwf.length ? zahwf.pop() : 0;
                    zahwf.push(zahwc(zahwz, zahwh));
                    break;
                }

              case "CLAMP":
                {
                    var zahwaa = zahwf.pop() || 0, zahwab = zahwf.pop() || 0, zahwac = zahwf.pop() || 0;
                    zahwf.push(Math.min(zahwaa, Math.max(zahwab, zahwac)));
                    break;
                }

              case "MIN":
                {
                    var zahwad = zahwf.pop() || 0, zahwae = zahwf.pop() || 0;
                    zahwf.push(Math.min(zahwae, zahwad));
                    break;
                }

              case "MAX":
                {
                    var zahwaf = zahwf.pop() || 0, zahwag = zahwf.pop() || 0;
                    zahwf.push(Math.max(zahwag, zahwaf));
                    break;
                }

              case "NOT":
                zahwf.push(zahwf.pop() ? 0 : 1);
                break;

              case "AND":
                {
                    var zahwah = zahwf.pop() || 0, zahwai = zahwf.pop() || 0;
                    zahwf.push(zahwai !== 0 && zahwah !== 0 ? 1 : 0);
                    break;
                }

              case "OR":
                {
                    var zahwaj = zahwf.pop() || 0, zahwak = zahwf.pop() || 0;
                    zahwf.push(zahwak !== 0 || zahwaj !== 0 ? 1 : 0);
                    break;
                }

              case "XOR":
                {
                    var zahwal = zahwf.pop() || 0, zahwam = zahwf.pop() || 0;
                    zahwf.push(zahwam !== 0 !== (zahwal !== 0) ? 1 : 0);
                    break;
                }

              case "SHL":
                {
                    var zahwan = zahwf.pop() || 0, zahwao = zahwf.pop() || 0;
                    zahwf.push(Math.floor(zahwao) << Math.floor(zahwan));
                    break;
                }

              case "SHR":
                {
                    var zahwap = zahwf.pop() || 0, zahwaq = zahwf.pop() || 0;
                    zahwf.push(Math.floor(zahwaq) >>> Math.floor(zahwap));
                    break;
                }

              case "NOP":
                break;

              default:
                throw new Error("IntegrityVM: illegal opcode at word " + zahwd);
            }
        }
        throw new Error("IntegrityVM: gas exhausted (possible hang guarded)");
    }
    static pack(zahwa, zahwb) {
        var zahwc = new IntegrityVM({
            seed: zahwb
        });
        return {
            seed: zahwc.seed,
            code: zahwc.assemble(zahwa)
        };
    }
}

function zahwc(zahwa, zahwb) {
    var zahwc = (Math.floor(zahwa) ^ zahwb * 2654435769) >>> 0;
    zahwc = Math.imul(zahwc ^ zahwc >>> 16, 569420461) >>> 0;
    zahwc = Math.imul(zahwc ^ zahwc >>> 15, 1935289751) >>> 0;
    return ((zahwc ^ zahwc >>> 15) >>> 0) / 4294967296;
}

export { IntegrityVM };
