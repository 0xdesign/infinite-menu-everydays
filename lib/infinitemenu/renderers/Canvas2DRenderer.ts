import { BaseRenderer } from './RendererInterface';
import { MenuItem } from '../types';
import { vec3 } from 'gl-matrix';

interface ItemPosition {
  x: number;
  y: number;
  z: number;
  scale: number;
  alpha: number;
  index: number;
}

export class Canvas2DRenderer extends BaseRenderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private items: MenuItem[] = [];
  private images = new Map<string, HTMLImageElement>();
  private loadingImages = new Set<string>();
  private itemPositions: ItemPosition[] = [];
  private rotation = 0;
  private rotationVelocity = 0;
  private activeIndex = 0;
  private lastTime = 0;
  private pointerDown = false;
  private lastPointerX = 0;
  private pointerX = 0;

  get isSupported(): boolean {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return ctx !== null;
  }

  async initialize(): Promise<void> {
    this.checkDisposed();
    
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });
    
    if (!this.ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Generate sphere positions
    this.generateSpherePositions();
    
    // Start render loop
    this.startRenderLoop();
  }

  private setupEventListeners(): void {
    const handlePointerDown = (e: PointerEvent): void => {
      this.pointerDown = true;
      this.lastPointerX = e.clientX;
      this.pointerX = e.clientX;
      this.canvas.style.cursor = 'grabbing';
    };
    
    const handlePointerMove = (e: PointerEvent): void => {
      if (this.pointerDown) {
        this.pointerX = e.clientX;
      }
    };
    
    const handlePointerUp = (): void => {
      this.pointerDown = false;
      this.canvas.style.cursor = 'grab';
    };
    
    this.canvas.addEventListener('pointerdown', handlePointerDown);
    this.canvas.addEventListener('pointermove', handlePointerMove);
    this.canvas.addEventListener('pointerup', handlePointerUp);
    this.canvas.addEventListener('pointerleave', handlePointerUp);
    
    // Store handlers for cleanup
    (this.canvas as HTMLCanvasElement & { _pointerHandlers?: { down: (e: PointerEvent) => void; move: (e: PointerEvent) => void; up: () => void } })._pointerHandlers = {
      down: handlePointerDown,
      move: handlePointerMove,
      up: handlePointerUp
    };
    
    this.canvas.style.cursor = 'grab';
    this.canvas.style.touchAction = 'none';
  }

  private generateSpherePositions(): void {
    // Generate positions on a sphere (simplified icosahedron)
    const positions: vec3[] = [];
    const t = (1.0 + Math.sqrt(5.0)) / 2.0;
    const radius = 2;
    
    // Icosahedron vertices
    const vertices = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];
    
    // Add center of each face as additional positions
    const faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    
    // Add vertices
    for (const v of vertices) {
      const pos = vec3.normalize(vec3.create(), vec3.fromValues(v[0], v[1], v[2]));
      vec3.scale(pos, pos, radius);
      positions.push(pos);
    }
    
    // Add face centers for more positions
    for (const face of faces) {
      const center = vec3.create();
      for (const idx of face) {
        const v = vertices[idx];
        vec3.add(center, center, vec3.fromValues(v[0], v[1], v[2]));
      }
      vec3.scale(center, center, 1 / 3);
      vec3.normalize(center, center);
      vec3.scale(center, center, radius);
      positions.push(center);
    }
    
    // Subdivide once for even more positions
    const midpoints: vec3[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dist = vec3.distance(positions[i], positions[j]);
        if (dist < radius * 0.8) { // Only close vertices
          const mid = vec3.create();
          vec3.add(mid, positions[i], positions[j]);
          vec3.normalize(mid, mid);
          vec3.scale(mid, mid, radius);
          midpoints.push(mid);
        }
      }
    }
    
    // Combine all positions
    const allPositions = [...positions, ...midpoints.slice(0, 30)]; // Limit to ~42 positions
    
    // Convert to item positions
    this.itemPositions = allPositions.slice(0, 42).map((pos, i) => ({
      x: pos[0],
      y: pos[1], 
      z: pos[2],
      scale: 1,
      alpha: 1,
      index: i
    }));
  }

  updateItems(items: MenuItem[]): void {
    this.checkDisposed();
    this.items = items;
    
    // Cancel any pending image loads
    this.loadingImages.clear();
    
    // Start loading images
    this.loadImages();
  }

  private async loadImages(): Promise<void> {
    for (const item of this.items) {
      if (!item.image || this.images.has(item.image) || this.loadingImages.has(item.image)) {
        continue;
      }
      
      this.loadingImages.add(item.image);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        this.images.set(item.image, img);
        this.loadingImages.delete(item.image);
      };
      
      img.onerror = () => {
        console.warn(`Failed to load image: ${item.image}`);
        this.loadingImages.delete(item.image);
      };
      
      img.src = item.image;
    }
  }

  resize(): void {
    this.checkDisposed();
    
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    if (this.canvas.width !== width * dpr || this.canvas.height !== height * dpr) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      
      if (this.ctx) {
        this.ctx.scale(dpr, dpr);
      }
    }
  }

  private startRenderLoop(): void {
    const animate = (time: number) => {
      this.render(time);
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  render(time: number): void {
    if (!this.ctx || this.isDisposed) return;
    
    Math.min(time - this.lastTime, 100);
    this.lastTime = time;
    
    // Update rotation based on pointer drag
    if (this.pointerDown) {
      const deltaX = this.pointerX - this.lastPointerX;
      this.rotationVelocity = deltaX * 0.01;
      this.lastPointerX = this.pointerX;
    } else {
      // Apply damping
      this.rotationVelocity *= 0.95;
    }
    
    this.rotation += this.rotationVelocity;
    
    // Clear canvas
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);
    
    // Calculate view parameters
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.2;
    
    // Transform and sort items by depth
    const transformedItems = this.itemPositions.map((pos, i) => {
      // Rotate around Y axis
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      const x = pos.x * cos - pos.z * sin;
      const z = pos.x * sin + pos.z * cos;
      const y = pos.y;
      
      // Simple perspective projection
      const perspective = 1 / (1 + z * 0.2);
      const screenX = centerX + x * scale * perspective;
      const screenY = centerY - y * scale * perspective;
      
      // Calculate alpha based on z position
      const alpha = Math.max(0.1, Math.min(1, (z + 2) * 0.3));
      
      return {
        x: screenX,
        y: screenY,
        z: z,
        scale: perspective,
        alpha: alpha,
        index: i % this.items.length
      };
    });
    
    // Sort by depth (back to front)
    transformedItems.sort((a, b) => a.z - b.z);
    
    // Draw items
    for (const item of transformedItems) {
      if (item.index >= this.items.length) continue;
      
      const menuItem = this.items[item.index];
      const size = 60 * item.scale;
      
      // Draw placeholder or image
      this.ctx.save();
      this.ctx.globalAlpha = item.alpha;
      
      const img = this.images.get(menuItem.image);
      if (img) {
        // Draw image
        this.ctx.beginPath();
        this.ctx.arc(item.x, item.y, size / 2, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.clip();
        
        this.ctx.drawImage(
          img,
          item.x - size / 2,
          item.y - size / 2,
          size,
          size
        );
      } else {
        // Draw placeholder
        const hue = (item.index * 360) / this.items.length;
        this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        this.ctx.beginPath();
        this.ctx.arc(item.x, item.y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      this.ctx.restore();
    }
    
    // Find nearest item to center
    let nearestIndex = 0;
    let minDistance = Infinity;
    
    for (const item of transformedItems) {
      if (item.z < 0) continue; // Only items in front
      
      const dist = Math.sqrt(
        Math.pow(item.x - centerX, 2) + 
        Math.pow(item.y - centerY, 2)
      );
      
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = item.index;
      }
    }
    
    if (nearestIndex !== this.activeIndex) {
      this.activeIndex = nearestIndex;
      this.config.onActiveItemChange?.(nearestIndex);
    }
    
    // Update movement state
    const isMoving = this.pointerDown || Math.abs(this.rotationVelocity) > 0.01;
    this.config.onMovementChange?.(isMoving);
  }

  dispose(): void {
    if (this.isDisposed) return;
    
    // Remove event listeners
    const handlers = (this.canvas as HTMLCanvasElement & { _pointerHandlers?: { down: (e: PointerEvent) => void; move: (e: PointerEvent) => void; up: () => void } })._pointerHandlers;
    if (handlers) {
      this.canvas.removeEventListener('pointerdown', handlers.down);
      this.canvas.removeEventListener('pointermove', handlers.move);
      this.canvas.removeEventListener('pointerup', handlers.up);
      this.canvas.removeEventListener('pointerleave', handlers.up);
      delete (this.canvas as HTMLCanvasElement & { _pointerHandlers?: { down: (e: PointerEvent) => void; move: (e: PointerEvent) => void; up: () => void } })._pointerHandlers;
    }
    
    // Reset canvas styles
    this.canvas.style.cursor = '';
    this.canvas.style.touchAction = '';
    
    // Clear images
    this.images.clear();
    this.loadingImages.clear();
    
    // Call parent dispose
    super.dispose();
    
    this.ctx = null;
  }
}