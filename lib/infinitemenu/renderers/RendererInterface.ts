import { Renderer, RendererConfig, Camera } from '../types';
import { ResourceManager } from '../managers/ResourceManager';

export abstract class BaseRenderer implements Renderer {
  protected canvas: HTMLCanvasElement;
  protected resourceManager: ResourceManager;
  protected camera: Camera;
  protected isDisposed = false;
  protected animationFrameId: number | null = null;

  constructor(protected config: RendererConfig) {
    this.canvas = config.canvas;
    this.resourceManager = new ResourceManager();
    this.camera = this.createDefaultCamera();
  }

  abstract get isSupported(): boolean;
  abstract updateItems(items: typeof this.config.items): void;
  abstract resize(): void;
  abstract render(time: number): void;

  protected createDefaultCamera(): Camera {
    const camera: Camera = {
      matrix: new Float32Array(16),
      near: 0.1,
      far: 40,
      fov: Math.PI / 4,
      aspect: 1,
      position: new Float32Array([0, 0, 3]),
      up: new Float32Array([0, 1, 0]),
      matrices: {
        view: new Float32Array(16),
        projection: new Float32Array(16),
        inverseProjection: new Float32Array(16)
      }
    };

    return camera;
  }

  protected handleError(error: Error): void {
    console.error('Renderer error:', error);
    this.config.onError?.(error);
  }

  protected checkDisposed(): void {
    if (this.isDisposed) {
      throw new Error('Renderer has been disposed');
    }
  }

  dispose(): void {
    if (this.isDisposed) return;

    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Dispose all GPU resources
    this.resourceManager.disposeAll();

    this.isDisposed = true;
  }
}