import { faoxomvalue } from "../math/index.js";

class DestructionBody {
    constructor(zahaa, zahab, zahac) {
        this.world = zahaa;
        this.pieces = zahab || [];
        this.options = zahac || {};
        this.broken = false;
        this.damage = 0;
        this.breakImpulse = faoxomvalue(this.options.breakImpulse, 5);
        this.breakDamage = faoxomvalue(this.options.breakDamage, 1);
        this.body = this.options.body || null;
        this.onBreak = this.options.onBreak || null;
        this.bonds = [];
        if (this.body) {
            var zahad = this;
            var zahae = this.body.onCollision;
            this.body.onCollision = function(zahaa, zahab, zahac) {
                var zahaf = Math.max(0, zahad.body.velocity.length() * zahad.body.mass);
                zahad.applyDamage(zahaf / Math.max(zahad.breakImpulse, .001));
                if (zahae) zahae(zahaa, zahab, zahac);
            };
        }
    }
    addPiece(zahaa) {
        if (this.pieces.indexOf(zahaa) === -1) this.pieces.push(zahaa);
        return this;
    }
    addBond(zahaa, zahab, zahac) {
        this.bonds.push({
            first: zahaa,
            second: zahab,
            strength: faoxomvalue(zahac, this.breakDamage),
            broken: false
        });
        return this;
    }
    applyDamage(zahaa) {
        this.damage += Math.max(0, zahaa || 0);
        if (this.damage >= this.breakDamage) this.break();
        return this;
    }
    fracture(zahaa) {
        if (zahaa) {
            var zahab = zahaa(this.body, this.options) || [];
            for (var zahac = 0; zahac < zahab.length; zahac++) this.addPiece(zahab[zahac]);
        }
        return this.break();
    }
    break() {
        if (this.broken) return this.pieces;
        this.broken = true;
        if (this.body && this.world) this.world.removeBody(this.body);
        for (var zahaa = 0; zahaa < this.pieces.length; zahaa++) {
            var zahab = this.pieces[zahaa];
            if (this.world) this.world.addBody(zahab);
        }
        for (var zahac = 0; zahac < this.bonds.length; zahac++) this.bonds[zahac].broken = true;
        if (this.onBreak) this.onBreak(this.pieces, this);
        return this.pieces;
    }
}

export { DestructionBody };
