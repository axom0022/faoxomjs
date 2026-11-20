function faoxomearcutsortlinked(zaqea) {
    var zaqeb, zaqec = 1;
    do {
        var zaqed = zaqea, zaqee;
        zaqea = null;
        var zaqef = null;
        zaqeb = 0;
        while (zaqed) {
            zaqeb++;
            var zaqeg = zaqed, zaqeh = 0;
            for (var zaqei = 0; zaqei < zaqec; zaqei++) {
                zaqeh++;
                zaqeg = zaqeg.nextZ;
                if (!zaqeg) break;
            }
            var zaqej = zaqec;
            while (zaqeh > 0 || zaqej > 0 && zaqeg) {
                if (zaqeh !== 0 && (zaqej === 0 || !zaqeg || zaqed.z <= zaqeg.z)) {
                    zaqee = zaqed;
                    zaqed = zaqed.nextZ;
                    zaqeh--;
                } else {
                    zaqee = zaqeg;
                    zaqeg = zaqeg.nextZ;
                    zaqej--;
                }
                if (zaqef) zaqef.nextZ = zaqee; else zaqea = zaqee;
                zaqee.prevZ = zaqef;
                zaqef = zaqee;
            }
            zaqed = zaqeg;
        }
        zaqef.nextZ = null;
        zaqec *= 2;
    } while (zaqeb > 1);
    return zaqea;
}

export { faoxomearcutsortlinked };
