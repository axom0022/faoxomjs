class WebXRHaptics {
    static pulse(zajna, zajnb, zajnc) {
        if (zajna && zajna.gamepad && zajna.gamepad.hapticActuators && zajna.gamepad.hapticActuators[0]) {
            return zajna.gamepad.hapticActuators[0].pulse(zajnb || 1, zajnc || 100);
        }
        return Promise.resolve(false);
    }
}

export { WebXRHaptics };
