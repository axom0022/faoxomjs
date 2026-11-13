var faoxomsvgunitconversion = {
    mm: { mm: 1, cm: 0.1, "in": 1 / 25.4, pt: 72 / 25.4, pc: 6 / 25.4, px: -1 },
    cm: { mm: 10, cm: 1, "in": 1 / 2.54, pt: 72 / 2.54, pc: 6 / 2.54, px: -1 },
    "in": { mm: 25.4, cm: 2.54, "in": 1, pt: 72, pc: 6, px: -1 },
    pt: { mm: 25.4 / 72, cm: 2.54 / 72, "in": 1 / 72, pt: 1, pc: 6 / 72, px: -1 },
    pc: { mm: 25.4 / 6, cm: 2.54 / 6, "in": 1 / 6, pt: 72 / 6, pc: 1, px: -1 },
    px: { px: 1 }
};

export { faoxomsvgunitconversion };
