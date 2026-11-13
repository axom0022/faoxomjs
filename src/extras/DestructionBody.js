import { faoxomvalue } from "../math/index.js";

class DestructionBody {
    constructor(world, pieces, options) { this.world = world; this.pieces = pieces || []; this.options = options || {}; this.broken = false; this.damage = 0; this.breakImpulse = faoxomvalue(this.options.breakImpulse, 5); this.breakDamage = faoxomvalue(this.options.breakDamage, 1); this.body = this.options.body || null; this.onBreak = this.options.onBreak || null; this.bonds = []; if (this.body) { var self = this; var previous = this.body.onCollision; this.body.onCollision = function(other, normal, penetration) { var impulse = Math.max(0, self.body.velocity.length() * self.body.mass); self.applyDamage(impulse / Math.max(self.breakImpulse, 0.001)); if (previous) previous(other, normal, penetration); }; } }
    addPiece(piece) { if (this.pieces.indexOf(piece) === -1) this.pieces.push(piece); return this; }
    addBond(first, second, strength) { this.bonds.push({ first: first, second: second, strength: faoxomvalue(strength, this.breakDamage), broken: false }); return this; }
    applyDamage(amount) { this.damage += Math.max(0, amount || 0); if (this.damage >= this.breakDamage) this.break(); return this; }
    fracture(factory) { if (factory) { var created = factory(this.body, this.options) || []; for (var i = 0; i < created.length; i++) this.addPiece(created[i]); } return this.break(); }
    break() { if (this.broken) return this.pieces; this.broken = true; if (this.body && this.world) this.world.removeBody(this.body); for (var i = 0; i < this.pieces.length; i++) { var piece = this.pieces[i]; if (this.world) this.world.addBody(piece); } for (var j = 0; j < this.bonds.length; j++) this.bonds[j].broken = true; if (this.onBreak) this.onBreak(this.pieces, this); return this.pieces; }
}

export { DestructionBody };
