import { DisposableResource, ResourceEvent } from '../types';

export class ResourceManager {
  private resources = new Map<string, DisposableResource>();
  private listeners = new Set<(event: ResourceEvent) => void>();
  private disposed = false;

  /**
   * Register a resource for tracking
   */
  register(resource: DisposableResource): void {
    if (this.disposed) {
      throw new Error('ResourceManager has been disposed');
    }

    if (this.resources.has(resource.id)) {
      console.warn(`Resource ${resource.id} already registered`);
      return;
    }

    this.resources.set(resource.id, resource);
    this.emit({ type: 'created', resource });
  }

  /**
   * Dispose a specific resource
   */
  dispose(id: string): boolean {
    const resource = this.resources.get(id);
    if (!resource) {
      return false;
    }

    try {
      resource.dispose();
      this.resources.delete(id);
      this.emit({ type: 'disposed', resourceId: id });
      return true;
    } catch (error) {
      this.emit({ 
        type: 'error', 
        error: new Error(`Failed to dispose resource ${id}: ${error}`)
      });
      return false;
    }
  }

  /**
   * Dispose all resources of a specific type
   */
  disposeByType(type: DisposableResource['type']): number {
    let count = 0;
    for (const [id, resource] of this.resources) {
      if (resource.type === type) {
        if (this.dispose(id)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Dispose all resources
   */
  disposeAll(): void {
    const errors: Error[] = [];
    
    // Dispose in reverse order of creation
    const resourceIds = Array.from(this.resources.keys()).reverse();
    
    for (const id of resourceIds) {
      try {
        this.dispose(id);
      } catch (error) {
        errors.push(new Error(`Failed to dispose ${id}: ${error}`));
      }
    }

    this.resources.clear();
    this.listeners.clear();
    this.disposed = true;

    if (errors.length > 0) {
      console.error('Errors during resource disposal:', errors);
    }
  }

  /**
   * Get resource by ID
   */
  get(id: string): DisposableResource | undefined {
    return this.resources.get(id);
  }

  /**
   * Check if resource exists
   */
  has(id: string): boolean {
    return this.resources.has(id);
  }

  /**
   * Get resource count
   */
  get size(): number {
    return this.resources.size;
  }

  /**
   * Get resource count by type
   */
  countByType(type: DisposableResource['type']): number {
    let count = 0;
    for (const resource of this.resources.values()) {
      if (resource.type === type) {
        count++;
      }
    }
    return count;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: ResourceEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: ResourceEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit event
   */
  private emit(event: ResourceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in resource event listener:', error);
      }
    }
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): { textures: number; buffers: number; total: number } {
    let textureMemory = 0;
    let bufferMemory = 0;

    for (const resource of this.resources.values()) {
      // This is a rough estimate - actual implementation would need
      // to track sizes when resources are created
      switch (resource.type) {
        case 'texture':
          textureMemory += 4096 * 4096 * 4; // Assume 4K RGBA
          break;
        case 'buffer':
          bufferMemory += 1024 * 1024; // Assume 1MB average
          break;
      }
    }

    return {
      textures: textureMemory,
      buffers: bufferMemory,
      total: textureMemory + bufferMemory
    };
  }

  /**
   * Debug info
   */
  getDebugInfo(): string {
    const counts = {
      textures: this.countByType('texture'),
      buffers: this.countByType('buffer'),
      shaders: this.countByType('shader'),
      programs: this.countByType('program'),
      vaos: this.countByType('vao')
    };

    const memory = this.getMemoryUsage();

    return `ResourceManager:
  Total resources: ${this.size}
  Textures: ${counts.textures}
  Buffers: ${counts.buffers}
  Shaders: ${counts.shaders}
  Programs: ${counts.programs}
  VAOs: ${counts.vaos}
  Estimated memory: ${(memory.total / 1024 / 1024).toFixed(2)} MB`;
  }
}