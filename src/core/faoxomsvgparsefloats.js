function faoxomsvgparsefloats(input, flags, stride) {
    if (typeof input !== "string") throw new TypeError("Invalid input: " + typeof input);
    var RE = { SEPARATOR: /[ \t\r\n,.+\-]/, WHITESPACE: /[ \t\r\n]/, DIGIT: /[\d]/, SIGN: /[-+]/, POINT: /\./, COMMA: /,/, EXP: /e/i, FLAGS: /[01]/ };
    var SEP = 0, INT = 1, FLOAT = 2, EXP = 3;
    var state = SEP, seenComma = true, number = "", exponent = "", result = [];
    function newNumber() {
        if (number !== "") {
            if (exponent === "") result.push(Number(number));
            else result.push(Number(number) * Math.pow(10, Number(exponent)));
        }
        number = "";
        exponent = "";
    }
    var current, length = input.length;
    for (var i = 0; i < length; i++) {
        current = input[i];
        if (Array.isArray(flags) && flags.indexOf(result.length % stride) !== -1 && RE.FLAGS.test(current)) {
            state = INT;
            number = current;
            newNumber();
            continue;
        }
        if (state === SEP) {
            if (RE.WHITESPACE.test(current)) continue;
            if (RE.DIGIT.test(current) || RE.SIGN.test(current)) { state = INT; number = current; continue; }
            if (RE.POINT.test(current)) { state = FLOAT; number = current; continue; }
            if (RE.COMMA.test(current) && seenComma) throw new SyntaxError("Unexpected character '" + current + "' at index " + i + ".");
            if (RE.COMMA.test(current)) seenComma = true;
        }
        if (state === INT) {
            if (RE.DIGIT.test(current)) { number += current; continue; }
            if (RE.POINT.test(current)) { number += current; state = FLOAT; continue; }
            if (RE.EXP.test(current)) { state = EXP; continue; }
            if (RE.SIGN.test(current) && number.length === 1 && RE.SIGN.test(number[0])) throw new SyntaxError("Unexpected character '" + current + "' at index " + i + ".");
        }
        if (state === FLOAT) {
            if (RE.DIGIT.test(current)) { number += current; continue; }
            if (RE.EXP.test(current)) { state = EXP; continue; }
            if (RE.POINT.test(current) && number[number.length - 1] === ".") throw new SyntaxError("Unexpected character '" + current + "' at index " + i + ".");
        }
        if (state === EXP) {
            if (RE.DIGIT.test(current)) { exponent += current; continue; }
            if (RE.SIGN.test(current)) {
                if (exponent === "") { exponent += current; continue; }
                if (exponent.length === 1 && RE.SIGN.test(exponent)) throw new SyntaxError("Unexpected character '" + current + "' at index " + i + ".");
            }
        }
        if (RE.WHITESPACE.test(current)) { newNumber(); state = SEP; seenComma = false; }
        else if (RE.COMMA.test(current)) { newNumber(); state = SEP; seenComma = true; }
        else if (RE.SIGN.test(current)) { newNumber(); state = INT; number = current; }
        else if (RE.POINT.test(current)) { newNumber(); state = FLOAT; number = current; }
        else throw new SyntaxError("Unexpected character '" + current + "' at index " + i + ".");
    }
    newNumber();
    return result;
}

export { faoxomsvgparsefloats };
