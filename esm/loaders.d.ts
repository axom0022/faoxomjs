import { Group, Scene, Object3D } from "./core.js";
import { BufferGeometry } from "./geometry.js";

export class LoadingManager {
  onStart?: (url: string, loaded: number, total: number) => void;
  onLoad?: () => void;
  onProgress?: (url: string, loaded: number, total: number) => void;
  onError?: (url: string) => void;
  constructor(onLoad?: () => void, onProgress?: (url: string, loaded: number, total: number) => void, onError?: (url: string) => void);
  itemStart(url: string): void;
  itemEnd(url: string): void;
  itemError(url: string): void;
}

export class FileLoader {
  manager: LoadingManager;
  responseType: string;
  path: string;
  constructor(manager?: LoadingManager);
  load(url: string, onLoad: (data: string | ArrayBuffer) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: any) => void): void;
  setPath(path: string): this;
  setResponseType(responseType: string): this;
}

export class TextureLoader {
  manager: LoadingManager;
  path: string;
  constructor(manager?: LoadingManager);
  load(url: string, onLoad?: (texture: any) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: any) => void): any;
  setPath(path: string): this;
}

export interface GLTFResult {
  scene: Group | Scene;
  scenes: Array<Group | Scene>;
  animations: any[];
  cameras: any[];
  asset: any;
  userData: any;
}

export class GLTFLoader {
  manager: LoadingManager;
  constructor(manager?: LoadingManager);
  load(url: string, onLoad: (gltf: GLTFResult) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: any) => void): void;
  parse(data: ArrayBuffer | string, path: string, onLoad: (gltf: GLTFResult) => void, onError?: (err: any) => void): void;
}

export class GLTFExporter {
  parse(input: Object3D, onDone: (gltf: any) => void, onError?: (err: any) => void, options?: { binary?: boolean; trs?: boolean; onlyVisible?: boolean; truncateDrawRange?: boolean }): void;
}

export class OBJLoader {
  manager: LoadingManager;
  constructor(manager?: LoadingManager);
  load(url: string, onLoad: (group: Group) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: any) => void): void;
  parse(text: string): Group;
}

export class OBJExporter {
  parse(object: Object3D): string;
}

export class STLLoader {
  manager: LoadingManager;
  constructor(manager?: LoadingManager);
  load(url: string, onLoad: (geometry: BufferGeometry) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: any) => void): void;
  parse(data: ArrayBuffer | string): BufferGeometry;
}

export class STLExporter {
  parse(scene: Object3D, options?: { binary?: boolean }): string | DataView;
}

export class PLYLoader {
  manager: LoadingManager;
  constructor(manager?: LoadingManager);
  load(url: string, onLoad: (geometry: BufferGeometry) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: any) => void): void;
  parse(data: ArrayBuffer | string): BufferGeometry;
}

export class PLYExporter {
  parse(object: Object3D, onDone?: (res: any) => void, options?: { binary?: boolean; excludeAttributes?: string[] }): any;
}

export class SVGLoader {
  manager: LoadingManager;
  constructor(manager?: LoadingManager);
  load(url: string, onLoad: (data: { paths: any[]; xml: any }) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: any) => void): void;
  parse(text: string): { paths: any[]; xml: any };
}

export class FBXLoader {
  manager: LoadingManager;
  constructor(manager?: LoadingManager);
  load(url: string, onLoad: (group: Group) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: any) => void): void;
  parse(buffer: ArrayBuffer | string, path?: string): Group;
}

export class KTX2Loader {
  manager: LoadingManager;
  constructor(manager?: LoadingManager);
  detectSupport(renderer: any): this;
  load(url: string, onLoad: (texture: any) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: any) => void): void;
}

export class AssetLoader {
  static loadGLTF(url: string): Promise<GLTFResult>;
  static loadOBJ(url: string): Promise<Group>;
  static loadFBX(url: string): Promise<Group>;
  static loadTexture(url: string): Promise<any>;
}
