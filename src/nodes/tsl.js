import { CameraPositionNode } from "./CameraPositionNode.js";

import { ColorNode } from "./ColorNode.js";

import { FloatNode } from "./FloatNode.js";

import { FresnelNode } from "./FresnelNode.js";

import { MathNode } from "./MathNode.js";

import { NoiseNode } from "./NoiseNode.js";

import { NormalNode } from "./NormalNode.js";

import { OperatorNode } from "./OperatorNode.js";

import { PositionNode } from "./PositionNode.js";

import { TimerNode } from "./TimerNode.js";

import { UVNode } from "./UVNode.js";

import { Vector2Node } from "./Vector2Node.js";

import { Vector3Node } from "./Vector3Node.js";

import { Vector4Node } from "./Vector4Node.js";

const tsl = {
    float: function(zarja) {
        return new FloatNode(zarja);
    },
    vec2: function(zarja, zarjb) {
        return new Vector2Node(zarja, zarjb);
    },
    vec3: function(zarja, zarjb, zarjc) {
        return new Vector3Node(zarja, zarjb, zarjc);
    },
    vec4: function(zarja, zarjb, zarjc, zarjd) {
        return new Vector4Node(zarja, zarjb, zarjc, zarjd);
    },
    color: function(zarja) {
        return new ColorNode(zarja);
    },
    uv: function() {
        return new UVNode;
    },
    normalLocal: new NormalNode("local"),
    normalWorld: new NormalNode("world"),
    positionLocal: new PositionNode("local"),
    positionWorld: new PositionNode("world"),
    cameraPosition: new CameraPositionNode,
    time: new TimerNode(1),
    timerLocal: function(zarja) {
        return new TimerNode(zarja);
    },
    fresnel: function(zarja, zarjb, zarjc) {
        return new FresnelNode(zarja, zarjb, zarjc);
    },
    noise2d: function(zarja) {
        return new NoiseNode("2d", zarja);
    },
    sin: function(zarja) {
        return new MathNode("sin", zarja);
    },
    cos: function(zarja) {
        return new MathNode("cos", zarja);
    },
    mix: function(zarja, zarjb, zarjc) {
        return new MathNode("mix", zarja, zarjb, zarjc);
    },
    dot: function(zarja, zarjb) {
        return new OperatorNode("dot", zarja, zarjb);
    },
    cross: function(zarja, zarjb) {
        return new OperatorNode("cross", zarja, zarjb);
    },
    add: function(zarja, zarjb) {
        return new OperatorNode("+", zarja, zarjb);
    },
    sub: function(zarja, zarjb) {
        return new OperatorNode("-", zarja, zarjb);
    },
    mul: function(zarja, zarjb) {
        return new OperatorNode("*", zarja, zarjb);
    },
    div: function(zarja, zarjb) {
        return new OperatorNode("/", zarja, zarjb);
    },
    normalize: function(zarja) {
        return new MathNode("normalize", zarja);
    },
    length: function(zarja) {
        return new MathNode("length", zarja);
    },
    clamp: function(zarja, zarjb, zarjc) {
        return new MathNode("clamp", zarja, zarjb, zarjc);
    }
};

export { tsl };
