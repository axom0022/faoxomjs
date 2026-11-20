class Constraint {
    constructor(zagsa, zagsb) {
        this.bodyA = zagsa;
        this.bodyB = zagsb;
        this.enabled = true;
    }
    solve(zagsa) {}
}

export { Constraint };
