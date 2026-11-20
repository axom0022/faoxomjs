function faoxomgpureadbuffer(zafba, zafbb, zafbc) {
    var zafbd = Math.max(4, zafbc + 3 & ~3);
    var zafbe = zafba.createBuffer({
        size: zafbd,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    var zafbf = zafba.createCommandEncoder();
    zafbf.copyBufferToBuffer(zafbb, 0, zafbe, 0, zafbd);
    zafba.queue.submit([ zafbf.finish() ]);
    return zafbe.mapAsync(GPUMapMode.READ).then(function() {
        var zafba = zafbe.getMappedRange().slice(0, zafbc);
        zafbe.unmap();
        zafbe.destroy();
        return zafba;
    });
}

export { faoxomgpureadbuffer };
