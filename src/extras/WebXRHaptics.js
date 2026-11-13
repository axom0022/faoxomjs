class WebXRHaptics {
    static pulse(inputSource, intensity, duration) {
        if (inputSource && inputSource.gamepad && inputSource.gamepad.hapticActuators && inputSource.gamepad.hapticActuators[0]) {
            return inputSource.gamepad.hapticActuators[0].pulse(intensity || 1.0, duration || 100);
        }
        return Promise.resolve(false);
    }
}

export { WebXRHaptics };
