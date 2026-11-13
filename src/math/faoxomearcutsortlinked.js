function faoxomearcutsortlinked(list) {
    var numMerges, inSize = 1;
    do {
        var p = list, e;
        list = null;
        var tail = null;
        numMerges = 0;
        while (p) {
            numMerges++;
            var q = p, pSize = 0;
            for (var i = 0; i < inSize; i++) {
                pSize++;
                q = q.nextZ;
                if (!q) break;
            }
            var qSize = inSize;
            while (pSize > 0 || (qSize > 0 && q)) {
                if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
                    e = p;
                    p = p.nextZ;
                    pSize--;
                } else {
                    e = q;
                    q = q.nextZ;
                    qSize--;
                }
                if (tail) tail.nextZ = e;
                else list = e;
                e.prevZ = tail;
                tail = e;
            }
            p = q;
        }
        tail.nextZ = null;
        inSize *= 2;
    } while (numMerges > 1);
    return list;
}

export { faoxomearcutsortlinked };
