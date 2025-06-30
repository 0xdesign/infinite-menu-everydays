import { mat4, vec3, quat } from 'gl-matrix';
import { BaseRenderer } from './RendererInterface';
import { MenuItem } from '../types';
import { TextureManager } from '../managers/TextureManager';
import { ProgressiveTextureLoader } from '../managers/ProgressiveTextureLoader';
import { createProgram, createShader } from '../utils/webgl';
import { getVisibleItemIndices, sortIndicesByDistance } from '../utils/frustum';
import { IcosahedronGeometry } from '../geometry/IcosahedronGeometry';
import { DiscGeometry } from '../geometry/DiscGeometry';
import { ArcballControl } from '../controls/ArcballControl';

// Shaders
import { vertexShaderSource, fragmentShaderSource } from '../shaders/sphereShaders';

export class WebGLRenderer extends BaseRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private textureManager: TextureManager | null = null;
  private progressiveLoader: ProgressiveTextureLoader | null = null;
  private control: ArcballControl | null = null;
  private currentTexture: WebGLTexture | null = null;
  
  // Geometry
  private instanceCount = 0;
  private instancePositions: vec3[] = [];
  private worldMatrix = mat4.create();
  
  // State
  private items: MenuItem[] = [];
  private activeItemIndex = 0;
  private lastTime = 0;
  
  // Uniforms
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  
  // Temporal cycling
  private useTemporalCycling = false;
  private rotationOffset = 0;
  private readonly VERTEX_COUNT = 42;

  get isSupported(): boolean {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const supported = gl !== null;
    if (gl) {
      const loseContext = gl.getExtension('WEBGL_lose_context');
      loseContext?.loseContext();
    }
    return supported;
  }

  async initialize(): Promise<void> {
    this.checkDisposed();
    
    try {
      // Get WebGL2 context
      this.gl = this.canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        premultipliedAlpha: true,
        stencil: false
      });

      if (!this.gl) {
        throw new Error('WebGL2 not supported');
      }

      // Set up context loss handling
      this.setupContextLossHandling();

      // Initialize managers
      this.textureManager = new TextureManager(this.gl, this.resourceManager);
      this.progressiveLoader = new ProgressiveTextureLoader(this.textureManager);
      
      // Add progress listener
      this.progressiveLoader.addProgressListener((progress) => {
        console.log(`Texture loading: ${progress.phase} - ${progress.loaded}/${progress.total}`);
      });

      // Create shader program
      await this.createShaderProgram();

      // Create geometry
      await this.createGeometry();

      // Initialize controls
      this.control = new ArcballControl(this.canvas, () => this.onControlUpdate());

      // Set initial state
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.cullFace(this.gl.BACK);

      // Start render loop
      this.startRenderLoop();

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private setupContextLossHandling(): void {
    if (!this.gl) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      this.handleError(new Error('WebGL context lost'));
      
      // Cancel animation frame
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    };

    const handleContextRestored = async () => {
      console.log('WebGL context restored, reinitializing...');
      
      try {
        // Reinitialize everything
        await this.createShaderProgram();
        await this.createGeometry();
        await this.updateItems(this.items);
        this.startRenderLoop();
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    this.canvas.addEventListener('webglcontextlost', handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Store handlers for cleanup
    (this.canvas as HTMLCanvasElement & { _contextLostHandler?: (e: Event) => void; _contextRestoredHandler?: () => void })._contextLostHandler = handleContextLost;
    (this.canvas as HTMLCanvasElement & { _contextLostHandler?: (e: Event) => void; _contextRestoredHandler?: () => void })._contextRestoredHandler = handleContextRestored;
  }

  private async createShaderProgram(): Promise<void> {
    if (!this.gl) return;

    // Create and compile shaders
    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to create shaders');
    }

    // Register shaders as resources
    this.resourceManager.register({
      id: 'vertex-shader',
      type: 'shader',
      dispose: () => this.gl?.deleteShader(vertexShader)
    });

    this.resourceManager.register({
      id: 'fragment-shader',
      type: 'shader',
      dispose: () => this.gl?.deleteShader(fragmentShader)
    });

    // Create program
    this.program = createProgram(this.gl, [vertexShaderSource, fragmentShaderSource]);
    if (!this.program) {
      throw new Error('Failed to create shader program');
    }

    // Register program as resource
    this.resourceManager.register({
      id: 'shader-program',
      type: 'program',
      dispose: () => this.gl?.deleteProgram(this.program!)
    });

    // Get uniform locations
    this.uniforms = {
      uWorldMatrix: this.gl.getUniformLocation(this.program, 'uWorldMatrix'),
      uViewMatrix: this.gl.getUniformLocation(this.program, 'uViewMatrix'),
      uProjectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix'),
      uCameraPosition: this.gl.getUniformLocation(this.program, 'uCameraPosition'),
      uRotationAxisVelocity: this.gl.getUniformLocation(this.program, 'uRotationAxisVelocity'),
      uTex: this.gl.getUniformLocation(this.program, 'uTex'),
      uItemCount: this.gl.getUniformLocation(this.program, 'uItemCount'),
      uAtlasSize: this.gl.getUniformLocation(this.program, 'uAtlasSize'),
      uRotationOffset: this.gl.getUniformLocation(this.program, 'uRotationOffset'),
    };
  }

  private async createGeometry(): Promise<void> {
    if (!this.gl || !this.program) return;

    // Create icosahedron geometry for sphere positions
    const ico = new IcosahedronGeometry();
    ico.subdivide(1).spherize(2);
    
    // Create disc geometry for each item
    const disc = new DiscGeometry(32, 0.8);

    // Get geometry data
    const icoData = ico.data;
    const discData = disc.data;

    // Store instance positions
    this.instancePositions = [];
    for (let i = 0; i < icoData.vertices.length; i += 3) {
      this.instancePositions.push(vec3.fromValues(
        icoData.vertices[i],
        icoData.vertices[i + 1],
        icoData.vertices[i + 2]
      ));
    }
    this.instanceCount = this.instancePositions.length;

    // Create vertex buffers
    const positionBuffer = this.createBuffer(discData.vertices, 'vertex-positions');
    const uvBuffer = this.createBuffer(discData.uvs, 'vertex-uvs');
    const indexBuffer = this.createBuffer(discData.indices, 'vertex-indices', this.gl.ELEMENT_ARRAY_BUFFER);

    // Create instance matrix buffer
    const instanceMatrices = new Float32Array(this.instanceCount * 16);
    for (let i = 0; i < this.instanceCount; i++) {
      const matrix = mat4.create();
      mat4.translate(matrix, matrix, this.instancePositions[i]);
      instanceMatrices.set(matrix, i * 16);
    }
    const instanceBuffer = this.createBuffer(instanceMatrices, 'instance-matrices');

    // Create VAO
    this.vao = this.gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create vertex array');
    }

    this.resourceManager.register({
      id: 'sphere-vao',
      type: 'vao',
      dispose: () => this.gl?.deleteVertexArray(this.vao!)
    });

    // Set up VAO
    this.gl.bindVertexArray(this.vao);

    // Position attribute
    const posLoc = this.gl.getAttribLocation(this.program, 'aModelPosition');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);

    // UV attribute
    const uvLoc = this.gl.getAttribLocation(this.program, 'aModelUvs');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvBuffer);
    this.gl.enableVertexAttribArray(uvLoc);
    this.gl.vertexAttribPointer(uvLoc, 2, this.gl.FLOAT, false, 0, 0);

    // Instance matrix attribute
    const matrixLoc = this.gl.getAttribLocation(this.program, 'aInstanceMatrix');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, instanceBuffer);
    
    // Matrix attributes take 4 locations
    for (let i = 0; i < 4; i++) {
      this.gl.enableVertexAttribArray(matrixLoc + i);
      this.gl.vertexAttribPointer(
        matrixLoc + i, 4, this.gl.FLOAT, false, 64, i * 16
      );
      this.gl.vertexAttribDivisor(matrixLoc + i, 1);
    }

    // Index buffer
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    this.gl.bindVertexArray(null);
  }

  private createBuffer(data: ArrayBufferView, id: string, target?: number): WebGLBuffer {
    if (!this.gl) throw new Error('No WebGL context');

    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error(`Failed to create buffer ${id}`);
    }

    const bufferTarget = target || this.gl.ARRAY_BUFFER;
    this.gl.bindBuffer(bufferTarget, buffer);
    this.gl.bufferData(bufferTarget, data, this.gl.STATIC_DRAW);

    this.resourceManager.register({
      id: `buffer-${id}`,
      type: 'buffer',
      dispose: () => this.gl?.deleteBuffer(buffer)
    });

    return buffer;
  }

  updateItems(items: MenuItem[]): void {
    this.checkDisposed();
    this.items = items;
    
    // Update temporal cycling mode
    this.useTemporalCycling = items.length > this.VERTEX_COUNT;
    if (!this.useTemporalCycling) {
      this.rotationOffset = 0;
    }

    // Load textures
    this.loadTextures();
  }

  private async loadTextures(): Promise<void> {
    if (!this.progressiveLoader || this.items.length === 0) return;

    try {
      // Get visible indices for priority loading
      const visibleIndices = this.getVisibleIndices();
      
      // Calculate atlas size
      const atlasSize = Math.ceil(Math.sqrt(this.items.length));
      
      // Start progressive loading
      this.currentTexture = await this.progressiveLoader.loadTextures(
        this.items,
        visibleIndices,
        atlasSize
      );
      
      // Continue loading in background
      this.progressiveLoader.waitForCompletion().then(() => {
        console.log('All textures loaded');
      }).catch(error => {
        console.error('Background texture loading error:', error);
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  resize(): void {
    this.checkDisposed();
    if (!this.gl) return;

    const canvas = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const displayWidth = Math.round(canvas.clientWidth * dpr);
    const displayHeight = Math.round(canvas.clientHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      this.gl.viewport(0, 0, displayWidth, displayHeight);
      this.updateProjectionMatrix();
    }
  }

  private updateProjectionMatrix(): void {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.aspect = aspect;

    // Calculate FOV based on sphere size
    const sphereRadius = 2;
    const distance = vec3.length(this.camera.position);
    const height = sphereRadius * 0.35;
    
    if (aspect > 1) {
      this.camera.fov = 2 * Math.atan(height / distance);
    } else {
      this.camera.fov = 2 * Math.atan(height / aspect / distance);
    }

    // Update projection matrix
    mat4.perspective(
      this.camera.matrices.projection,
      this.camera.fov,
      aspect,
      this.camera.near,
      this.camera.far
    );

    // Update inverse projection
    mat4.invert(
      this.camera.matrices.inverseProjection,
      this.camera.matrices.projection
    );
  }

  private startRenderLoop(): void {
    const animate = (time: number) => {
      this.render(time);
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  render(time: number): void {
    if (!this.gl || !this.program || !this.vao || this.isDisposed) return;

    const deltaTime = time - this.lastTime;
    this.lastTime = time;

    // Update controls
    this.control?.update(deltaTime);

    // Clear
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Use program
    this.gl.useProgram(this.program);

    // Update world matrix with rotation
    if (this.control) {
      mat4.fromQuat(this.worldMatrix, this.control.orientation);
    }

    // Update view matrix
    mat4.lookAt(
      this.camera.matrices.view,
      this.camera.position,
      vec3.fromValues(0, 0, 0),
      this.camera.up
    );

    // Set uniforms
    this.gl.uniformMatrix4fv(this.uniforms.uWorldMatrix, false, this.worldMatrix);
    this.gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, this.camera.matrices.view);
    this.gl.uniformMatrix4fv(this.uniforms.uProjectionMatrix, false, this.camera.matrices.projection);
    this.gl.uniform3fv(this.uniforms.uCameraPosition, this.camera.position);
    
    if (this.control) {
      this.gl.uniform4f(
        this.uniforms.uRotationAxisVelocity,
        this.control.rotationAxis[0],
        this.control.rotationAxis[1],
        this.control.rotationAxis[2],
        this.control.rotationVelocity
      );
    }

    this.gl.uniform1i(this.uniforms.uItemCount, this.items.length);
    this.gl.uniform1i(this.uniforms.uRotationOffset, this.rotationOffset);
    
    // Bind texture
    if (this.currentTexture) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
      this.gl.uniform1i(this.uniforms.uTex, 0);
      
      // Calculate and set atlas size
      const atlasSize = Math.ceil(Math.sqrt(this.items.length));
      this.gl.uniform1i(this.uniforms.uAtlasSize, atlasSize);
    }

    // Draw
    this.gl.bindVertexArray(this.vao);
    this.gl.drawElementsInstanced(
      this.gl.TRIANGLES,
      36, // Disc has 36 indices
      this.gl.UNSIGNED_SHORT,
      0,
      this.instanceCount
    );
    this.gl.bindVertexArray(null);
  }

  private onControlUpdate(): void {
    if (!this.control) return;

    // Update active item
    const nearestIndex = this.findNearestVertexIndex();
    let itemIndex = nearestIndex;

    if (this.useTemporalCycling) {
      // Update rotation offset based on cumulative rotation
      const rotationDelta = this.control.rotationVelocity * 0.1;
      this.rotationOffset = Math.floor(this.rotationOffset + rotationDelta) % this.items.length;
      
      itemIndex = (nearestIndex + this.rotationOffset) % this.items.length;
      if (itemIndex < 0) itemIndex += this.items.length;
    }

    if (itemIndex !== this.activeItemIndex) {
      this.activeItemIndex = itemIndex;
      this.config.onActiveItemChange?.(itemIndex);
    }

    // Update camera zoom
    const isMoving = this.control.isPointerDown || Math.abs(this.control.rotationVelocity) > 0.01;
    this.config.onMovementChange?.(isMoving);

    const targetZ = this.control.isPointerDown ? 4.5 : 3;
    const damping = 0.1;
    this.camera.position[2] += (targetZ - this.camera.position[2]) * damping;
    
    this.updateProjectionMatrix();
  }

  private findNearestVertexIndex(): number {
    if (!this.control) return 0;

    const forward = vec3.fromValues(0, 0, -1);
    const inverseOrientation = quat.conjugate(quat.create(), this.control.orientation);
    const viewDir = vec3.transformQuat(vec3.create(), forward, inverseOrientation);

    let maxDot = -1;
    let nearestIndex = 0;

    for (let i = 0; i < this.instancePositions.length; i++) {
      const dot = vec3.dot(viewDir, this.instancePositions[i]);
      if (dot > maxDot) {
        maxDot = dot;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }

  /**
   * Get indices of items currently visible in the viewport
   */
  public getVisibleIndices(): number[] {
    const visibleIndices = getVisibleItemIndices(
      this.instancePositions,
      this.worldMatrix,
      this.camera.matrices.view,
      this.camera.matrices.projection,
      this.useTemporalCycling,
      this.rotationOffset,
      this.items.length
    );

    // Sort by distance for priority loading
    return sortIndicesByDistance(
      visibleIndices,
      this.instancePositions,
      this.worldMatrix,
      this.camera.position
    );
  }

  dispose(): void {
    if (this.isDisposed) return;

    // Clean up context loss handlers
    const canvas = this.canvas as HTMLCanvasElement & { _contextLostHandler?: (e: Event) => void; _contextRestoredHandler?: () => void };
    if (canvas._contextLostHandler) {
      this.canvas.removeEventListener('webglcontextlost', canvas._contextLostHandler);
      delete canvas._contextLostHandler;
    }
    if (canvas._contextRestoredHandler) {
      this.canvas.removeEventListener('webglcontextrestored', canvas._contextRestoredHandler);
      delete canvas._contextRestoredHandler;
    }

    // Dispose control
    this.control?.dispose();

    // Clear managers
    this.textureManager?.clear();

    // Call parent dispose
    super.dispose();

    // Lose context to free GPU resources
    if (this.gl) {
      const loseContext = this.gl.getExtension('WEBGL_lose_context');
      loseContext?.loseContext();
    }

    this.gl = null;
  }
}