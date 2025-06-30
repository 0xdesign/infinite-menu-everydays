import { vec2, vec3, quat } from 'gl-matrix';

export interface ArcballControlConfig {
  dampingFactor?: number;
  rotationSpeed?: number;
  zoomSpeed?: number;
  enableZoom?: boolean;
  enableRotate?: boolean;
  enableKeyboard?: boolean;
  keyboardRotationSpeed?: number;
}

export class ArcballControl {
  private canvas: HTMLCanvasElement;
  private config: Required<ArcballControlConfig>;
  
  // State
  public isPointerDown = false;
  public orientation = quat.create();
  public rotationVelocity = 0;
  public rotationAxis = vec3.fromValues(1, 0, 0);
  
  // Internal state
  private pointerPos = vec2.create();
  private previousPointerPos = vec2.create();
  private pointerRotation = quat.create();
  private rotationVelocitySmooth = 0;
  private combinedQuat = quat.create();
  
  // Event handlers stored for cleanup
  private boundHandlers: {
    pointerdown: (e: PointerEvent) => void;
    pointermove: (e: PointerEvent) => void;
    pointerup: () => void;
    pointerleave: () => void;
    wheel: (e: WheelEvent) => void;
    contextmenu: (e: Event) => void;
    keydown: (e: KeyboardEvent) => void;
    keyup: (e: KeyboardEvent) => void;
  };
  
  // Keyboard state
  private keyboardRotation = { x: 0, y: 0 };
  private keysPressed = new Set<string>();

  // Callbacks
  private updateCallback?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    updateCallback?: () => void,
    config: ArcballControlConfig = {}
  ) {
    this.canvas = canvas;
    this.updateCallback = updateCallback;
    this.config = {
      dampingFactor: config.dampingFactor ?? 0.95,
      rotationSpeed: config.rotationSpeed ?? 1.0,
      zoomSpeed: config.zoomSpeed ?? 1.0,
      enableZoom: config.enableZoom ?? true,
      enableRotate: config.enableRotate ?? true,
      enableKeyboard: config.enableKeyboard ?? true,
      keyboardRotationSpeed: config.keyboardRotationSpeed ?? 0.05
    };

    // Bind event handlers
    this.boundHandlers = {
      pointerdown: this.onPointerDown.bind(this),
      pointermove: this.onPointerMove.bind(this),
      pointerup: this.onPointerUp.bind(this),
      pointerleave: this.onPointerLeave.bind(this),
      wheel: this.onWheel.bind(this),
      contextmenu: (e) => e.preventDefault(),
      keydown: this.onKeyDown.bind(this),
      keyup: this.onKeyUp.bind(this)
    };

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', this.boundHandlers.pointerdown);
    canvas.addEventListener('pointermove', this.boundHandlers.pointermove);
    canvas.addEventListener('pointerup', this.boundHandlers.pointerup);
    canvas.addEventListener('pointerleave', this.boundHandlers.pointerleave);
    canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
    
    // Keyboard events
    if (this.config.enableKeyboard) {
      // Add to document for global keyboard control
      document.addEventListener('keydown', this.boundHandlers.keydown);
      document.addEventListener('keyup', this.boundHandlers.keyup);
      
      // Make canvas focusable for accessibility
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'application');
      canvas.setAttribute('aria-label', 'Interactive 3D menu. Use arrow keys to rotate.');
    }
    
    // Prevent touch scrolling
    canvas.style.touchAction = 'none';
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.config.enableRotate) return;
    
    this.isPointerDown = true;
    vec2.set(this.pointerPos, event.clientX, event.clientY);
    vec2.copy(this.previousPointerPos, this.pointerPos);
    
    // Capture pointer for better dragging
    this.canvas.setPointerCapture(event.pointerId);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isPointerDown || !this.config.enableRotate) return;
    
    vec2.set(this.pointerPos, event.clientX, event.clientY);
  }

  private onPointerUp(): void {
    this.isPointerDown = false;
  }

  private onPointerLeave(): void {
    this.isPointerDown = false;
  }

  private onWheel(event: WheelEvent): void {
    if (!this.config.enableZoom) return;
    
    event.preventDefault();
    
    // Implement zoom if needed
    // For now, just prevent default scrolling
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.config.enableKeyboard) return;
    
    // Prevent default for arrow keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
    }
    
    this.keysPressed.add(event.key);
    
    // Update keyboard rotation based on keys pressed
    this.updateKeyboardRotation();
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (!this.config.enableKeyboard) return;
    
    this.keysPressed.delete(event.key);
    
    // Update keyboard rotation
    this.updateKeyboardRotation();
  }

  private updateKeyboardRotation(): void {
    // Reset keyboard rotation
    this.keyboardRotation.x = 0;
    this.keyboardRotation.y = 0;
    
    // Apply rotation based on pressed keys
    if (this.keysPressed.has('ArrowLeft')) {
      this.keyboardRotation.y = -this.config.keyboardRotationSpeed;
    }
    if (this.keysPressed.has('ArrowRight')) {
      this.keyboardRotation.y = this.config.keyboardRotationSpeed;
    }
    if (this.keysPressed.has('ArrowUp')) {
      this.keyboardRotation.x = -this.config.keyboardRotationSpeed;
    }
    if (this.keysPressed.has('ArrowDown')) {
      this.keyboardRotation.x = this.config.keyboardRotationSpeed;
    }
  }

  public update(deltaTime: number): void {
    const timeScale = Math.min(deltaTime / 16.67, 2); // Normalize to 60fps
    
    // Handle keyboard rotation
    if (this.config.enableKeyboard && (this.keyboardRotation.x !== 0 || this.keyboardRotation.y !== 0)) {
      const keyboardQuat = quat.create();
      
      // Combine X and Y rotations
      if (this.keyboardRotation.y !== 0) {
        const yRotation = quat.create();
        quat.setAxisAngle(yRotation, vec3.fromValues(0, 1, 0), this.keyboardRotation.y * timeScale);
        quat.multiply(keyboardQuat, keyboardQuat, yRotation);
      }
      
      if (this.keyboardRotation.x !== 0) {
        const xRotation = quat.create();
        quat.setAxisAngle(xRotation, vec3.fromValues(1, 0, 0), this.keyboardRotation.x * timeScale);
        quat.multiply(keyboardQuat, keyboardQuat, xRotation);
      }
      
      quat.multiply(this.pointerRotation, keyboardQuat, this.pointerRotation);
    }
    
    // Handle pointer rotation
    if (this.isPointerDown) {
      // Calculate rotation from pointer movement
      const delta = vec2.subtract(vec2.create(), this.pointerPos, this.previousPointerPos);
      const length = vec2.length(delta);
      
      if (length > 0.1) {
        // Project pointer positions to sphere
        const p1 = this.projectToSphere(this.previousPointerPos);
        const p2 = this.projectToSphere(this.pointerPos);
        
        // Calculate rotation quaternion
        const axis = vec3.cross(vec3.create(), p1, p2);
        vec3.normalize(axis, axis);
        
        const dot = vec3.dot(p1, p2);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * this.config.rotationSpeed;
        
        quat.setAxisAngle(this.pointerRotation, axis, angle * timeScale);
        
        // Update previous position
        vec2.lerp(this.previousPointerPos, this.previousPointerPos, this.pointerPos, 0.3 * timeScale);
      }
    } else if (this.keyboardRotation.x === 0 && this.keyboardRotation.y === 0) {
      // Apply damping when not dragging or using keyboard
      quat.slerp(
        this.pointerRotation,
        this.pointerRotation,
        quat.create(), // identity
        (1 - this.config.dampingFactor) * timeScale
      );
    }
    
    // Apply rotation to orientation
    quat.multiply(this.orientation, this.pointerRotation, this.orientation);
    quat.normalize(this.orientation, this.orientation);
    
    // Update rotation velocity for effects
    const angle = Math.acos(Math.max(-1, Math.min(1, this.pointerRotation[3]))) * 2;
    const instantVelocity = angle / (deltaTime * 0.001); // rad/s
    
    // Smooth velocity
    this.rotationVelocitySmooth += (instantVelocity - this.rotationVelocitySmooth) * 0.2 * timeScale;
    this.rotationVelocity = this.rotationVelocitySmooth;
    
    // Extract rotation axis
    const s = Math.sin(angle / 2);
    if (s > 0.0001) {
      vec3.set(
        this.rotationAxis,
        this.pointerRotation[0] / s,
        this.pointerRotation[1] / s,
        this.pointerRotation[2] / s
      );
      vec3.normalize(this.rotationAxis, this.rotationAxis);
    }
    
    // Notify update
    this.updateCallback?.();
  }

  private projectToSphere(pos: vec2): vec3 {
    const rect = this.canvas.getBoundingClientRect();
    const x = (pos[0] - rect.left) / rect.width * 2 - 1;
    const y = -((pos[1] - rect.top) / rect.height * 2 - 1);
    
    const lengthSq = x * x + y * y;
    let z: number;
    
    if (lengthSq <= 1) {
      // Inside sphere
      z = Math.sqrt(1 - lengthSq);
    } else {
      // Outside sphere - project to edge
      const length = Math.sqrt(lengthSq);
      z = 1 / (2 * length);
    }
    
    return vec3.normalize(vec3.create(), vec3.fromValues(x, y, z));
  }

  public reset(): void {
    quat.identity(this.orientation);
    quat.identity(this.pointerRotation);
    this.rotationVelocity = 0;
    this.rotationVelocitySmooth = 0;
    vec3.set(this.rotationAxis, 1, 0, 0);
  }

  public dispose(): void {
    // Remove all event listeners
    const canvas = this.canvas;
    canvas.removeEventListener('pointerdown', this.boundHandlers.pointerdown);
    canvas.removeEventListener('pointermove', this.boundHandlers.pointermove);
    canvas.removeEventListener('pointerup', this.boundHandlers.pointerup);
    canvas.removeEventListener('pointerleave', this.boundHandlers.pointerleave);
    canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
    
    // Remove keyboard listeners
    if (this.config.enableKeyboard) {
      document.removeEventListener('keydown', this.boundHandlers.keydown);
      document.removeEventListener('keyup', this.boundHandlers.keyup);
      
      // Reset accessibility attributes
      canvas.removeAttribute('tabIndex');
      canvas.removeAttribute('role');
      canvas.removeAttribute('aria-label');
    }
    
    // Reset touch action
    canvas.style.touchAction = '';
    
    // Clear keyboard state
    this.keysPressed.clear();
    this.keyboardRotation = { x: 0, y: 0 };
    
    // Clear references
    this.updateCallback = undefined;
  }
}