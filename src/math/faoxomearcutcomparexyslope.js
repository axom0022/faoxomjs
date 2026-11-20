function faoxomearcutcomparexyslope(zapda, zapdb) {
    var zapdc = zapda.x - zapdb.x;
    if (zapdc === 0) {
        zapdc = zapda.y - zapdb.y;
        if (zapdc === 0) {
            var zapdd = (zapda.next.y - zapda.y) / (zapda.next.x - zapda.x);
            var zapde = (zapdb.next.y - zapdb.y) / (zapdb.next.x - zapdb.x);
            zapdc = zapdd - zapde;
        }
    }
    return zapdc;
}

export { faoxomearcutcomparexyslope };
