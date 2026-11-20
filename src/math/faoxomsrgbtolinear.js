function faoxomsrgbtolinear(zaqka) {
    return zaqka < .04045 ? zaqka * .0773993808 : Math.pow(zaqka * .9478672986 + .0521327014, 2.4);
}

export { faoxomsrgbtolinear };
