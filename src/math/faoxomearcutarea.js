function faoxomearcutarea(zapca, zapcb, zapcc) {
    return (zapcb.y - zapca.y) * (zapcc.x - zapcb.x) - (zapcb.x - zapca.x) * (zapcc.y - zapcb.y);
}

export { faoxomearcutarea };
