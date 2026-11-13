function faoxomdecompresslzf(input, start, length, outputLength) {
    var output = new Uint8Array(outputLength);
    var inputPtr = start, inputEnd = start + length, outputPtr = 0, control = 0, runLength = 0, reference = 0, copied = 0;
    while (inputPtr < inputEnd) {
        control = input[inputPtr++];
        if (control < 32) {
            runLength = control + 1;
            if (outputPtr + runLength > outputLength || inputPtr + runLength > inputEnd) throw new Error("Corrupt PCD compressed data");
            for (var literal = 0; literal < runLength; literal++) output[outputPtr++] = input[inputPtr++];
        } else {
            runLength = control >> 5;
            if (runLength === 7) runLength += input[inputPtr++];
            reference = outputPtr - ((control & 31) << 8) - input[inputPtr++] - 1;
            if (reference < 0 || outputPtr + runLength + 2 > outputLength) throw new Error("Corrupt PCD compressed data");
            for (copied = 0; copied < runLength + 2; copied++) output[outputPtr++] = output[reference++];
        }
    }
    return output;
}

export { faoxomdecompresslzf };
