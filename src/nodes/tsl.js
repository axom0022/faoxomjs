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
    float: function(v) { return new FloatNode(v); },
    vec2: function(x, y) { return new Vector2Node(x, y); },
    vec3: function(x, y, z) { return new Vector3Node(x, y, z); },
    vec4: function(x, y, z, w) { return new Vector4Node(x, y, z, w); },
    color: function(c) { return new ColorNode(c); },
    uv: function() { return new UVNode(); },
    normalLocal: new NormalNode("local"),
    normalWorld: new NormalNode("world"),
    positionLocal: new PositionNode("local"),
    positionWorld: new PositionNode("world"),
    cameraPosition: new CameraPositionNode(),
    time: new TimerNode(1.0),
    timerLocal: function(s) { return new TimerNode(s); },
    fresnel: function(b, p, s) { return new FresnelNode(b, p, s); },
    noise2d: function(scale) { return new NoiseNode("2d", scale); },
    sin: function(a) { return new MathNode("sin", a); },
    cos: function(a) { return new MathNode("cos", a); },
    mix: function(a, b, t) { return new MathNode("mix", a, b, t); },
    dot: function(a, b) { return new OperatorNode("dot", a, b); },
    cross: function(a, b) { return new OperatorNode("cross", a, b); },
    add: function(a, b) { return new OperatorNode("+", a, b); },
    sub: function(a, b) { return new OperatorNode("-", a, b); },
    mul: function(a, b) { return new OperatorNode("*", a, b); },
    div: function(a, b) { return new OperatorNode("/", a, b); },
    normalize: function(a) { return new MathNode("normalize", a); },
    length: function(a) { return new MathNode("length", a); },
    clamp: function(a, min, max) { return new MathNode("clamp", a, min, max); }
};

export { tsl };
