function faoxomearcutremovenode(zaqaa) {
    zaqaa.next.prev = zaqaa.prev;
    zaqaa.prev.next = zaqaa.next;
    if (zaqaa.prevZ) zaqaa.prevZ.nextZ = zaqaa.nextZ;
    if (zaqaa.nextZ) zaqaa.nextZ.prevZ = zaqaa.prevZ;
}

export { faoxomearcutremovenode };
