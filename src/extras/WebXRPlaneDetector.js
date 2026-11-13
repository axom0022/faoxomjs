class WebXRPlaneDetector {
    constructor() {
        this.planes = [];
    }
    update(frame, refSpace) {
        if (!frame || !frame.detectedPlanes) return;
        this.planes = [];
        frame.detectedPlanes.forEach(function(plane) {
            this.planes.push({
                planeSpace: plane.planeSpace,
                polygon: plane.polygon,
                orientation: plane.orientation,
                lastChangedTime: plane.lastChangedTime
            });
        }.bind(this));
    }
}

export { WebXRPlaneDetector };
