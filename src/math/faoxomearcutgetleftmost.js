function faoxomearcutgetleftmost(start) {
    var p = start, leftmost = start;
    do {
        if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
        p = p.next;
    } while (p !== start);
    return leftmost;
}

export { faoxomearcutgetleftmost };
