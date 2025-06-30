import { DisposableResource, MenuItem, TextureEntry, TextureEvent } from '../types';
import { ResourceManager } from './ResourceManager';

interface TextureCacheConfig {
  maxSize: number;
  maxMemory: number; // bytes
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
}

export class TextureManager {
  private gl: WebGL2RenderingContext;
  private resourceManager: ResourceManager;
  private cache = new Map<string, TextureEntry>();
  private lru = new Set<string>(); // For LRU eviction
  private loadingTextures = new Map<string, Promise<WebGLTexture>>();
  private listeners = new Set<(event: TextureEvent) => void>();
  private config: TextureCacheConfig;
  private currentMemoryUsage = 0;

  constructor(
    gl: WebGL2RenderingContext,
    resourceManager: ResourceManager,
    config: Partial<TextureCacheConfig> = {}
  ) {
    this.gl = gl;
    this.resourceManager = resourceManager;
    this.config = {
      maxSize: config.maxSize || 50,
      maxMemory: config.maxMemory || 256 * 1024 * 1024, // 256MB
      evictionPolicy: config.evictionPolicy || 'lru'
    };
  }

  /**
   * Get or load a texture
   */
  async getTexture(key: string, loader: () => Promise<WebGLTexture>): Promise<WebGLTexture> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      this.updateAccess(key);
      return cached.texture;
    }

    // Check if already loading
    const loading = this.loadingTextures.get(key);
    if (loading) {
      return loading;
    }

    // Start loading
    const loadPromise = this.loadTexture(key, loader);
    this.loadingTextures.set(key, loadPromise);

    try {
      const texture = await loadPromise;
      this.loadingTextures.delete(key);
      return texture;
    } catch (error) {
      this.loadingTextures.delete(key);
      throw error;
    }
  }

  /**
   * Load a texture
   */
  private async loadTexture(key: string, loader: () => Promise<WebGLTexture>): Promise<WebGLTexture> {
    try {
      const texture = await loader();
      const size = this.estimateTextureSize(texture);

      // Check if we need to evict before adding
      await this.ensureSpace(size);

      // Create resource wrapper
      const resource: DisposableResource = {
        id: `texture-${key}`,
        type: 'texture',
        dispose: () => {
          this.gl.deleteTexture(texture);
        }
      };

      // Register with resource manager
      this.resourceManager.register(resource);

      // Add to cache
      const entry: TextureEntry = {
        texture,
        refCount: 1,
        lastAccess: Date.now(),
        size
      };

      this.cache.set(key, entry);
      this.lru.add(key);
      this.currentMemoryUsage += size;

      this.emit({ type: 'loaded', id: 0, texture });

      return texture;
    } catch (error) {
      this.emit({ 
        type: 'error', 
        id: 0, 
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }

  /**
   * Create texture from image URL
   */
  async loadFromUrl(url: string): Promise<WebGLTexture> {
    return this.getTexture(url, async () => {
      const texture = this.gl.createTexture();
      if (!texture) {
        throw new Error('Failed to create texture');
      }

      // Set up temporary 1x1 pixel while loading
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE,
        new Uint8Array([128, 128, 128, 255])
      );

      // Load image
      const image = await this.loadImage(url);
      
      // Update texture with image
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE, image
      );

      // Generate mipmaps and set parameters
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

      return texture;
    });
  }

  /**
   * Create texture atlas from multiple items
   */
  async createAtlas(items: MenuItem[], atlasSize: number = 16): Promise<WebGLTexture> {
    const key = `atlas-${items.map(i => i.id).join('-')}-${atlasSize}`;
    
    return this.getTexture(key, async () => {
      const cellSize = 256;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      canvas.width = atlasSize * cellSize;
      canvas.height = atlasSize * cellSize;

      // Fill with placeholder colors initially
      items.forEach((item, i) => {
        if (i >= atlasSize * atlasSize) return;
        const x = (i % atlasSize) * cellSize;
        const y = Math.floor(i / atlasSize) * cellSize;
        ctx.fillStyle = `hsl(${(i * 360) / items.length}, 70%, 50%)`;
        ctx.fillRect(x, y, cellSize, cellSize);
      });

      // Create texture
      const texture = this.gl.createTexture();
      if (!texture) {
        throw new Error('Failed to create texture');
      }

      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas
      );

      // Set parameters for atlas (no mipmaps to avoid bleeding)
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

      // Load images progressively
      const loadPromises = items.slice(0, atlasSize * atlasSize).map(async (item, i) => {
        if (!item.image) return;
        
        try {
          const img = await this.loadImage(item.image);
          const x = (i % atlasSize) * cellSize;
          const y = Math.floor(i / atlasSize) * cellSize;
          
          ctx.drawImage(img, x, y, cellSize, cellSize);
          
          // Update texture region
          this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
          this.gl.texSubImage2D(
            this.gl.TEXTURE_2D, 0, x, y, cellSize, cellSize,
            this.gl.RGBA, this.gl.UNSIGNED_BYTE,
            ctx.getImageData(x, y, cellSize, cellSize)
          );
        } catch (error) {
          console.warn(`Failed to load image for item ${item.id}:`, error);
        }
      });

      // Don't wait for all images, return texture immediately
      Promise.all(loadPromises).catch(console.error);

      return texture;
    });
  }

  /**
   * Update access time for LRU
   */
  private updateAccess(key: string): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    entry.lastAccess = Date.now();
    
    if (this.config.evictionPolicy === 'lru') {
      // Move to end of LRU set
      this.lru.delete(key);
      this.lru.add(key);
    }
  }

  /**
   * Ensure space for new texture
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    // Check memory limit
    while (this.currentMemoryUsage + requiredSize > this.config.maxMemory) {
      if (!this.evictOne()) {
        throw new Error('Cannot evict enough textures to make space');
      }
    }

    // Check count limit
    while (this.cache.size >= this.config.maxSize) {
      if (!this.evictOne()) {
        throw new Error('Cannot evict textures: all have active references');
      }
    }
  }

  /**
   * Evict one texture based on policy
   */
  private evictOne(): boolean {
    let keyToEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru': {
        // Find least recently used with refCount = 0
        for (const key of this.lru) {
          const entry = this.cache.get(key);
          if (entry && entry.refCount === 0) {
            keyToEvict = key;
            break;
          }
        }
        break;
      }
      case 'fifo': {
        // First in, first out
        for (const [key, entry] of this.cache) {
          if (entry.refCount === 0) {
            keyToEvict = key;
            break;
          }
        }
        break;
      }
      case 'lfu': {
        // Least frequently used (would need to track usage count)
        // For now, fallback to LRU
        return this.evictOne();
      }
    }

    if (!keyToEvict) {
      return false;
    }

    return this.evict(keyToEvict);
  }

  /**
   * Evict a specific texture
   */
  private evict(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry || entry.refCount > 0) {
      return false;
    }

    // Dispose via resource manager
    this.resourceManager.dispose(`texture-${key}`);

    // Remove from cache
    this.cache.delete(key);
    this.lru.delete(key);
    this.currentMemoryUsage -= entry.size;

    return true;
  }

  /**
   * Estimate texture memory size
   */
  private estimateTextureSize(texture: WebGLTexture): number {
    // This is a rough estimate - actual implementation would query texture properties
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // For now, assume 4K RGBA texture
    return 4096 * 4096 * 4;
  }

  /**
   * Load image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      img.src = url;
    });
  }

  /**
   * Add ref count
   */
  addRef(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.refCount++;
    }
  }

  /**
   * Release ref count
   */
  release(key: string): void {
    const entry = this.cache.get(key);
    if (entry && entry.refCount > 0) {
      entry.refCount--;
    }
  }

  /**
   * Clear all textures
   */
  clear(): void {
    for (const key of this.cache.keys()) {
      this.evict(key);
    }
    this.cache.clear();
    this.lru.clear();
    this.currentMemoryUsage = 0;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: TextureEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: TextureEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit event
   */
  private emit(event: TextureEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in texture event listener:', error);
      }
    }
  }

  /**
   * Get debug info
   */
  getDebugInfo(): string {
    return `TextureManager:
  Cached textures: ${this.cache.size}
  Memory usage: ${(this.currentMemoryUsage / 1024 / 1024).toFixed(2)} MB
  Memory limit: ${(this.config.maxMemory / 1024 / 1024).toFixed(2)} MB
  Loading: ${this.loadingTextures.size}`;
  }
}