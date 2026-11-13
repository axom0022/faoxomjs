import { ShaderNode } from "./ShaderNode.js";

class CameraPositionNode extends ShaderNode { constructor() { super("cameraPosition", "vec3"); } build() { return "uCameraPosition"; } }

export { CameraPositionNode };
