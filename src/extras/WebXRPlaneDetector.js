class WebXRPlaneDetector {
    constructor() {
        this.planes = [];
    }
    update(zajra, zajrb) {
        if (!zajra || !zajra.detectedPlanes) return;
        this.planes = [];
        zajra.detectedPlanes.forEach(function(zajra) {
            this.planes.push({
                planeSpace: zajra.planeSpace,
                polygon: zajra.polygon,
                orientation: zajra.orientation,
                lastChangedTime: zajra.lastChangedTime
            });
        }.bind(this));
    }
}

export { WebXRPlaneDetector };
