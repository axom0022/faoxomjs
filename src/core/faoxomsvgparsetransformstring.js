import { Matrix3 } from "../math/index.js";
import { faoxomsvgparsefloats } from "./faoxomsvgparsefloats.js";

function faoxomsvgparsetransformstring(text, transform) {
    var currentTransform = new Matrix3();
    var temp1 = new Matrix3(), temp2 = new Matrix3(), temp3 = new Matrix3();
    var transformsTexts = text.split(")");
    for (var tIndex = transformsTexts.length - 1; tIndex >= 0; tIndex--) {
        var transformText = transformsTexts[tIndex].trim();
        if (transformText === "") continue;
        var openParPos = transformText.indexOf("(");
        if (openParPos > 0 && openParPos < transformText.length) {
            var transformType = transformText.slice(0, openParPos);
            var array = faoxomsvgparsefloats(transformText.slice(openParPos + 1));
            currentTransform.identity();
            switch (transformType) {
                case "translate":
                    if (array.length >= 1) {
                        var tx = array[0], ty = array.length >= 2 ? array[1] : 0;
                        currentTransform.makeTranslation(tx, ty);
                    }
                    break;
                case "rotate":
                    if (array.length >= 1) {
                        var angle = array[0] * Math.PI / 180, cx = 0, cy = 0;
                        if (array.length >= 3) { cx = array[1]; cy = array[2]; }
                        temp1.makeTranslation(-cx, -cy);
                        temp2.makeRotation(angle);
                        temp3.multiplyMatrices(temp2, temp1);
                        temp1.makeTranslation(cx, cy);
                        currentTransform.multiplyMatrices(temp1, temp3);
                    }
                    break;
                case "scale":
                    if (array.length >= 1) {
                        var scaleX = array[0], scaleY = array.length >= 2 ? array[1] : array[0];
                        currentTransform.makeScale(scaleX, scaleY);
                    }
                    break;
                case "skewX":
                    if (array.length === 1) currentTransform.set(1, Math.tan(array[0] * Math.PI / 180), 0, 0, 1, 0, 0, 0, 1);
                    break;
                case "skewY":
                    if (array.length === 1) currentTransform.set(1, 0, 0, Math.tan(array[0] * Math.PI / 180), 1, 0, 0, 0, 1);
                    break;
                case "matrix":
                    if (array.length === 6) currentTransform.set(array[0], array[2], array[4], array[1], array[3], array[5], 0, 0, 1);
                    break;
            }
            transform.premultiply(currentTransform);
        }
    }
    return transform;
}

export { faoxomsvgparsetransformstring };
