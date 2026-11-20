class AnimationManager {
    constructor() {
        this.controllers = [];
        this.speed = 1;
    }
    add(zaaxa) {
        if (this.controllers.indexOf(zaaxa) === -1) this.controllers.push(zaaxa);
        return zaaxa;
    }
    remove(zaaxa) {
        var zaaxb = this.controllers.indexOf(zaaxa);
        if (zaaxb !== -1) this.controllers.splice(zaaxb, 1);
    }
    update(zaaxa) {
        for (var zaaxb = 0; zaaxb < this.controllers.length; zaaxb++) this.controllers[zaaxb].update(zaaxa * this.speed);
    }
    play(zaaxa, zaaxb, zaaxc) {
        for (var zaaxd = 0; zaaxd < this.controllers.length; zaaxd++) if (this.controllers[zaaxd].target === zaaxa) this.controllers[zaaxd].play(zaaxb, zaaxc);
    }
    stop(zaaxa) {
        for (var zaaxb = 0; zaaxb < this.controllers.length; zaaxb++) if (!zaaxa || this.controllers[zaaxb].target === zaaxa) this.controllers[zaaxb].stop();
    }
    pause(zaaxa) {
        for (var zaaxb = 0; zaaxb < this.controllers.length; zaaxb++) if (!zaaxa || this.controllers[zaaxb].target === zaaxa) this.controllers[zaaxb].pause();
    }
    resume(zaaxa) {
        for (var zaaxb = 0; zaaxb < this.controllers.length; zaaxb++) if (!zaaxa || this.controllers[zaaxb].target === zaaxa) this.controllers[zaaxb].resume();
    }
}

export { AnimationManager };
