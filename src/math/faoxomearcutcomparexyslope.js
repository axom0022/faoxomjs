function faoxomearcutcomparexyslope(a, b) {
    var result = a.x - b.x;
    if (result === 0) {
        result = a.y - b.y;
        if (result === 0) {
            var aSlope = (a.next.y - a.y) / (a.next.x - a.x);
            var bSlope = (b.next.y - b.y) / (b.next.x - b.x);
            result = aSlope - bSlope;
        }
    }
    return result;
}

export { faoxomearcutcomparexyslope };
