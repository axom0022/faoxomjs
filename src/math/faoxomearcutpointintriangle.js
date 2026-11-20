function faoxomearcutpointintriangle(zapya, zapyb, zapyc, zapyd, zapye, zapyf, zapyg, zapyh) {
    return (zapye - zapyg) * (zapyb - zapyh) >= (zapya - zapyg) * (zapyf - zapyh) && (zapya - zapyg) * (zapyd - zapyh) >= (zapyc - zapyg) * (zapyb - zapyh) && (zapyc - zapyg) * (zapyf - zapyh) >= (zapye - zapyg) * (zapyd - zapyh);
}

export { faoxomearcutpointintriangle };
