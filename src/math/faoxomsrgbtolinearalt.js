function faoxomsrgbtolinearalt(value) { return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4); }

export { faoxomsrgbtolinearalt };
