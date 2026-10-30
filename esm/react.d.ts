import { Scene, Camera, WebGLRenderer, Object3D } from "./core.js";

export interface FaoxomRoot {
  render(element: any): void;
  unmount(): void;
}

export namespace FaoxomReact {
  function createElement(type: any, props?: any, ...children: any[]): any;
  function useFrame(callback: (state: { clock: any; camera: Camera; scene: Scene }, delta: number) => void): void;
  function useThree(): { scene: Scene; camera: Camera; renderer: WebGLRenderer; size: { width: number; height: number } };
}

export function createFaoxomRoot(container: HTMLCanvasElement | HTMLElement): FaoxomRoot;
