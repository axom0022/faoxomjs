function faoxomexrpredictor(source) {
    for (var t = 1; t < source.length; t++) source[t] = (source[t - 1] + source[t] - 128) & 255;
}

export { faoxomexrpredictor };
