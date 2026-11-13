class AnimationManager {
    constructor() { this.controllers = []; this.speed = 1; }
    add(controller) { if (this.controllers.indexOf(controller) === -1) this.controllers.push(controller); return controller; }
    remove(controller) { var i = this.controllers.indexOf(controller); if (i !== -1) this.controllers.splice(i, 1); }
    update(delta) { for (var i = 0; i < this.controllers.length; i++) this.controllers[i].update(delta * this.speed); }
    play(target, clip, reset) { for (var i = 0; i < this.controllers.length; i++) if (this.controllers[i].target === target) this.controllers[i].play(clip, reset); }
    stop(target) { for (var i = 0; i < this.controllers.length; i++) if (!target || this.controllers[i].target === target) this.controllers[i].stop(); }
    pause(target) { for (var i = 0; i < this.controllers.length; i++) if (!target || this.controllers[i].target === target) this.controllers[i].pause(); }
    resume(target) { for (var i = 0; i < this.controllers.length; i++) if (!target || this.controllers[i].target === target) this.controllers[i].resume(); }
}

export { AnimationManager };
