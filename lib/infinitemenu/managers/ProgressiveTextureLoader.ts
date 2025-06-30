import { MenuItem } from '../types';
import { TextureManager } from './TextureManager';

export interface LoadProgress {
  phase: 'placeholder' | 'thumbnail' | 'full';
  loaded: number;
  total: number;
  visibleLoaded: number;
  visibleTotal: number;
}

export interface LoaderConfig {
  placeholderSize: number;
  thumbnailSize: number;
  fullSize: number;
  batchSize: number;
  priorityBatchSize: number;
  delayBetweenBatches: number;
}

export class ProgressiveTextureLoader {
  private config: LoaderConfig;
  private cancelled = false;
  private currentLoadingPhase: LoadProgress['phase'] = 'placeholder';
  private loadedIndices = new Set<number>();
  private listeners = new Set<(progress: LoadProgress) => void>();
  private loadingPromise: Promise<void> | null = null;

  constructor(
    private textureManager: TextureManager,
    config: Partial<LoaderConfig> = {}
  ) {
    this.config = {
      placeholderSize: config.placeholderSize || 64,
      thumbnailSize: config.thumbnailSize || 256,
      fullSize: config.fullSize || 1024,
      batchSize: config.batchSize || 10,
      priorityBatchSize: config.priorityBatchSize || 5,
      delayBetweenBatches: config.delayBetweenBatches || 100
    };
  }

  /**
   * Load textures progressively
   */
  async loadTextures(
    items: MenuItem[],
    visibleIndices: number[],
    atlasSize: number = 16
  ): Promise<WebGLTexture> {
    this.cancelled = false;
    this.loadedIndices.clear();
    
    // Create immediate placeholder texture
    const placeholderTexture = await this.createPlaceholderAtlas(items, atlasSize);
    this.emitProgress('placeholder', items.length, items.length, visibleIndices.length, visibleIndices.length);
    
    // Start progressive loading in background
    this.loadingPromise = this.loadProgressively(items, visibleIndices, atlasSize);
    
    return placeholderTexture;
  }

  /**
   * Cancel ongoing loading
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Wait for all textures to load
   */
  async waitForCompletion(): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
  }

  /**
   * Create placeholder atlas with colored rectangles
   */
  private async createPlaceholderAtlas(items: MenuItem[], atlasSize: number): Promise<WebGLTexture> {
    const key = `placeholder-${items.length}-${atlasSize}`;
    
    return this.textureManager.getTexture(key, async () => {
      const cellSize = this.config.placeholderSize;
      const canvas = document.createElement('canvas');
      canvas.width = atlasSize * cellSize;
      canvas.height = atlasSize * cellSize;
      
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) throw new Error('Failed to create canvas context');
      
      // Fill with placeholder colors
      items.forEach((item, i) => {
        if (i >= atlasSize * atlasSize) return;
        
        const x = (i % atlasSize) * cellSize;
        const y = Math.floor(i / atlasSize) * cellSize;
        
        // Create a unique color for each item
        const hue = (i * 137.5) % 360; // Golden angle for good color distribution
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(x, y, cellSize, cellSize);
        
        // Add a subtle pattern
        ctx.fillStyle = `hsla(${hue}, 70%, 30%, 0.3)`;
        ctx.fillRect(x, y, cellSize, cellSize / 4);
        ctx.fillRect(x, y + cellSize - cellSize / 4, cellSize, cellSize / 4);
      });
      
      // Create texture from canvas
      const gl = this.textureManager['gl'];
      const texture = gl.createTexture();
      if (!texture) throw new Error('Failed to create texture');
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      return texture;
    });
  }

  /**
   * Load textures progressively in phases
   */
  private async loadProgressively(
    items: MenuItem[],
    visibleIndices: number[],
    atlasSize: number
  ): Promise<void> {
    try {
      // Phase 1: Load visible thumbnails
      await this.loadThumbnails(items, visibleIndices, atlasSize, true);
      
      if (this.cancelled) return;
      
      // Phase 2: Load remaining thumbnails
      const remainingIndices = items
        .map((_, i) => i)
        .filter(i => !visibleIndices.includes(i));
      
      await this.loadThumbnails(items, remainingIndices, atlasSize, false);
      
      if (this.cancelled) return;
      
      // Phase 3: Upgrade to full resolution (optional)
      // This could be triggered by user interaction or after a delay
      // await this.loadFullResolution(items, visibleIndices, atlasSize);
      
    } catch (error) {
      console.error('Progressive loading error:', error);
    }
  }

  /**
   * Load thumbnails for specified indices
   */
  private async loadThumbnails(
    items: MenuItem[],
    indices: number[],
    atlasSize: number,
    isPriority: boolean
  ): Promise<void> {
    const batchSize = isPriority ? this.config.priorityBatchSize : this.config.batchSize;
    const cellSize = this.config.thumbnailSize;
    
    // Create shared canvas for this phase
    const canvas = document.createElement('canvas');
    canvas.width = atlasSize * cellSize;
    canvas.height = atlasSize * cellSize;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Failed to create canvas context');
    
    // Process in batches
    for (let i = 0; i < indices.length; i += batchSize) {
      if (this.cancelled) break;
      
      const batch = indices.slice(i, i + batchSize);
      const loadPromises = batch.map(async (itemIndex) => {
        const item = items[itemIndex];
        if (!item?.image || this.loadedIndices.has(itemIndex)) return;
        
        try {
          const img = await this.loadImage(item.image);
          
          if (this.cancelled) return;
          
          // Draw to canvas
          const x = (itemIndex % atlasSize) * cellSize;
          const y = Math.floor(itemIndex / atlasSize) * cellSize;
          
          // Draw with proper scaling to fit
          this.drawImageCover(ctx, img, x, y, cellSize, cellSize);
          
          this.loadedIndices.add(itemIndex);
        } catch (error) {
          console.warn(`Failed to load thumbnail ${itemIndex}:`, error);
        }
      });
      
      await Promise.all(loadPromises);
      
      // Update texture with new thumbnails
      if (!this.cancelled && batch.some(idx => this.loadedIndices.has(idx))) {
        await this.updateAtlasTexture(`thumbnails-${items.length}`, canvas);
        
        // Emit progress
        const visibleLoaded = indices.filter(idx => 
          this.loadedIndices.has(idx) && indices.includes(idx)
        ).length;
        
        this.emitProgress(
          'thumbnail',
          this.loadedIndices.size,
          items.length,
          visibleLoaded,
          indices.length
        );
      }
      
      // Small delay between batches to avoid blocking
      if (i + batchSize < indices.length && !isPriority) {
        await this.delay(this.config.delayBetweenBatches);
      }
    }
  }

  /**
   * Update atlas texture with canvas content
   */
  private async updateAtlasTexture(
    key: string,
    canvas: HTMLCanvasElement
  ): Promise<void> {
    const gl = this.textureManager['gl'];
    
    await this.textureManager.getTexture(key, async () => {
      const texture = gl.createTexture();
      if (!texture) throw new Error('Failed to create texture');
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      return texture;
    });
  }

  /**
   * Draw image with cover fit (like CSS object-fit: cover)
   */
  private drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const imgAspect = img.width / img.height;
    const boxAspect = width / height;
    
    let sourceWidth = img.width;
    let sourceHeight = img.height;
    let sourceX = 0;
    let sourceY = 0;
    
    if (imgAspect > boxAspect) {
      // Image is wider - crop sides
      sourceWidth = img.height * boxAspect;
      sourceX = (img.width - sourceWidth) / 2;
    } else {
      // Image is taller - crop top/bottom
      sourceHeight = img.width / boxAspect;
      sourceY = (img.height - sourceHeight) / 2;
    }
    
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceWidth, sourceHeight,
      x, y, width, height
    );
  }

  /**
   * Load image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 10000);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      img.src = url;
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add progress listener
   */
  addProgressListener(listener: (progress: LoadProgress) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove progress listener
   */
  removeProgressListener(listener: (progress: LoadProgress) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit progress update
   */
  private emitProgress(
    phase: LoadProgress['phase'],
    loaded: number,
    total: number,
    visibleLoaded: number,
    visibleTotal: number
  ): void {
    const progress: LoadProgress = {
      phase,
      loaded,
      total,
      visibleLoaded,
      visibleTotal
    };
    
    for (const listener of this.listeners) {
      try {
        listener(progress);
      } catch (error) {
        console.error('Error in progress listener:', error);
      }
    }
  }
}