function faoxomgpureadbuffer(device, buffer, byteLength) {
    var size = Math.max(4, (byteLength + 3) & ~3);
    var staging = device.createBuffer({ size: size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    var encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(buffer, 0, staging, 0, size);
    device.queue.submit([encoder.finish()]);
    return staging.mapAsync(GPUMapMode.READ).then(function() {
        var copy = staging.getMappedRange().slice(0, byteLength);
        staging.unmap();
        staging.destroy();
        return copy;
    });
}

export { faoxomgpureadbuffer };
