import { vec3, mat4, quat } from "gl-matrix";

// Core types
export interface MenuItem {
  id: number;
  image: string;
  imageHighRes?: string;
  link: string;
  title: string;
  description: string;
}

export interface Disposable {
  dispose(): void;
}

export interface DisposableResource extends Disposable {
  readonly id: string;
  readonly type: 'texture' | 'buffer' | 'shader' | 'program' | 'vao';
}

// Renderer types
export interface RendererConfig {
  canvas: HTMLCanvasElement;
  items: MenuItem[];
  onActiveItemChange?: (index: number) => void;
  onMovementChange?: (isMoving: boolean) => void;
  onError?: (error: Error) => void;
}

export interface Renderer extends Disposable {
  updateItems(items: MenuItem[]): void;
  resize(): void;
  render(time: number): void;
  readonly isSupported: boolean;
}

// Camera types
export interface Camera {
  matrix: mat4;
  near: number;
  far: number;
  fov: number;
  aspect: number;
  position: vec3;
  up: vec3;
  matrices: {
    view: mat4;
    projection: mat4;
    inverseProjection: mat4;
  };
}

// Texture types
export interface TextureEntry {
  texture: WebGLTexture;
  refCount: number;
  lastAccess: number;
  size: number;
}

export interface TextureAtlas {
  texture: WebGLTexture;
  width: number;
  height: number;
  items: AtlasItem[];
}

export interface AtlasItem {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Control types
export interface ControlState {
  isPointerDown: boolean;
  orientation: quat;
  rotationVelocity: number;
  rotationAxis: vec3;
}

// Performance types
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  textureMemory: number;
  bufferMemory: number;
}

// Event types
export type ResourceEvent = 
  | { type: 'created'; resource: DisposableResource }
  | { type: 'disposed'; resourceId: string }
  | { type: 'error'; error: Error };

export type TextureEvent =
  | { type: 'loading'; id: number }
  | { type: 'loaded'; id: number; texture: WebGLTexture }
  | { type: 'error'; id: number; error: Error };

// Worker message types
export interface WorkerMessage {
  id: string;
  type: 'CREATE_ATLAS' | 'RESIZE_IMAGE' | 'GENERATE_MIPMAP';
  data: unknown;
}

export interface WorkerResponse {
  id: string;
  type: 'SUCCESS' | 'ERROR';
  data?: unknown;
  error?: string;
  transferables?: Transferable[];
}