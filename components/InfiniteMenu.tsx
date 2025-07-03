import { useRef, useState, useEffect } from "react";
import { mat4, quat, vec2, vec3 } from "gl-matrix";

// Performance API type extensions
interface PerformanceMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}

interface ExtendedWindow extends Window {
  gc?: () => void;
}

const discVertShaderSource = `#version 300 es

uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;

#define PI 3.141593

void main() {
  vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);

  vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
  float radius = length(centerPos.xyz);

  if (gl_VertexID > 0) {
    vec3 rotationAxis = uRotationAxisVelocity.xyz;
    float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
    vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
    vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
    float strength = dot(stretchDir, relativeVertexPos);
    float invAbsStrength = min(0., abs(strength) - 1.);
    strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
    worldPosition.xyz += stretchDir * strength;
  }

  worldPosition.xyz = radius * normalize(worldPosition.xyz);

  gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

  vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
  vUvs = aModelUvs;
  vInstanceId = gl_InstanceID;
}
`;

const discFragShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform sampler2D uTexNext;
uniform float uTextureBlend;
uniform int uItemCount;
uniform int uAtlasSize;
uniform int uRotationOffset;

// High-res texture support - using multiple texture units
uniform int uHighResCount;
uniform int uHighResIndices[12]; // Support up to 12 high-res textures (16 total - 3 used = 13, but use 12 for safety)
uniform sampler2D uHighResTex0;
uniform sampler2D uHighResTex1;
uniform sampler2D uHighResTex2;
uniform sampler2D uHighResTex3;
uniform sampler2D uHighResTex4;
uniform sampler2D uHighResTex5;
uniform sampler2D uHighResTex6;
uniform sampler2D uHighResTex7;
uniform sampler2D uHighResTex8;
uniform sampler2D uHighResTex9;
uniform sampler2D uHighResTex10;
uniform sampler2D uHighResTex11;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

vec4 getHighResTexture(int index, vec2 uv) {
  if (index == 0) return texture(uHighResTex0, uv);
  else if (index == 1) return texture(uHighResTex1, uv);
  else if (index == 2) return texture(uHighResTex2, uv);
  else if (index == 3) return texture(uHighResTex3, uv);
  else if (index == 4) return texture(uHighResTex4, uv);
  else if (index == 5) return texture(uHighResTex5, uv);
  else if (index == 6) return texture(uHighResTex6, uv);
  else if (index == 7) return texture(uHighResTex7, uv);
  else if (index == 8) return texture(uHighResTex8, uv);
  else if (index == 9) return texture(uHighResTex9, uv);
  else if (index == 10) return texture(uHighResTex10, uv);
  else if (index == 11) return texture(uHighResTex11, uv);
  return vec4(0.0);
}

void main() {
  int itemIndex = (vInstanceId - uRotationOffset + uItemCount) % uItemCount;
  int cellsPerRow = uAtlasSize;
  int cellX = itemIndex % cellsPerRow;
  int cellY = itemIndex / cellsPerRow;
  vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
  vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

  ivec2 texSize = textureSize(uTex, 0);
  float imageAspect = float(texSize.x) / float(texSize.y);
  float containerAspect = 1.0;

  float scale = max(imageAspect / containerAspect, 
                   containerAspect / imageAspect);

  vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
  st = (st - 0.5) * scale + 0.5;

  st = clamp(st, 0.0, 1.0);
  st = st * cellSize + cellOffset;

  vec4 currentColor = texture(uTex, st);
  vec4 nextColor = texture(uTexNext, st);
  vec4 atlasColor = mix(currentColor, nextColor, uTextureBlend);
  
  // Check if this item has a high-res texture
  vec4 finalColor = atlasColor;
  for (int i = 0; i < uHighResCount; i++) {
    if (uHighResIndices[i] == itemIndex) {
      vec2 hiResSt = vec2(vUvs.x, 1.0 - vUvs.y);
      finalColor = getHighResTexture(i, hiResSt);
      break;
    }
  }
  
  outColor = finalColor;
  outColor.a *= vAlpha;
}
`;

class Face {
  public a: number;
  public b: number;
  public c: number;

  constructor(a: number, b: number, c: number) {
    this.a = a;
    this.b = b;
    this.c = c;
  }
}

class Vertex {
  public position: vec3;
  public normal: vec3;
  public uv: vec2;

  constructor(x: number, y: number, z: number) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }
}

class Geometry {
  public vertices: Vertex[];
  public faces: Face[];

  constructor() {
    this.vertices = [];
    this.faces = [];
  }

  public addVertex(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.vertices.push(new Vertex(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  public addFace(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.faces.push(new Face(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  public get lastVertex(): Vertex {
    return this.vertices[this.vertices.length - 1];
  }

  public subdivide(divisions = 1): this {
    const midPointCache: Record<string, number> = {};
    let f = this.faces;

    for (let div = 0; div < divisions; ++div) {
      const newFaces = new Array<Face>(f.length * 4);

      f.forEach((face, ndx) => {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache);
        const mBC = this.getMidPoint(face.b, face.c, midPointCache);
        const mCA = this.getMidPoint(face.c, face.a, midPointCache);

        const i = ndx * 4;
        newFaces[i + 0] = new Face(face.a, mAB, mCA);
        newFaces[i + 1] = new Face(face.b, mBC, mAB);
        newFaces[i + 2] = new Face(face.c, mCA, mBC);
        newFaces[i + 3] = new Face(mAB, mBC, mCA);
      });

      f = newFaces;
    }

    this.faces = f;
    return this;
  }

  public spherize(radius = 1): this {
    this.vertices.forEach((vertex) => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  public get data(): {
    vertices: Float32Array;
    indices: Uint16Array;
    normals: Float32Array;
    uvs: Float32Array;
  } {
    return {
      vertices: this.vertexData,
      indices: this.indexData,
      normals: this.normalData,
      uvs: this.uvData,
    };
  }

  public get vertexData(): Float32Array {
    return new Float32Array(
      this.vertices.flatMap((v) => Array.from(v.position))
    );
  }

  public get normalData(): Float32Array {
    return new Float32Array(this.vertices.flatMap((v) => Array.from(v.normal)));
  }

  public get uvData(): Float32Array {
    return new Float32Array(this.vertices.flatMap((v) => Array.from(v.uv)));
  }

  public get indexData(): Uint16Array {
    return new Uint16Array(this.faces.flatMap((f) => [f.a, f.b, f.c]));
  }

  public getMidPoint(
    ndxA: number,
    ndxB: number,
    cache: Record<string, number>
  ): number {
    const cacheKey = ndxA < ndxB ? `k_${ndxB}_${ndxA}` : `k_${ndxA}_${ndxB}`;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
      return cache[cacheKey];
    }
    const a = this.vertices[ndxA].position;
    const b = this.vertices[ndxB].position;
    const ndx = this.vertices.length;
    cache[cacheKey] = ndx;
    this.addVertex(
      (a[0] + b[0]) * 0.5,
      (a[1] + b[1]) * 0.5,
      (a[2] + b[2]) * 0.5
    );
    return ndx;
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(
      -1,
      t,
      0,
      1,
      t,
      0,
      -1,
      -t,
      0,
      1,
      -t,
      0,
      0,
      -1,
      t,
      0,
      1,
      t,
      0,
      -1,
      -t,
      0,
      1,
      -t,
      t,
      0,
      -1,
      t,
      0,
      1,
      -t,
      0,
      -1,
      -t,
      0,
      1
    ).addFace(
      0,
      11,
      5,
      0,
      5,
      1,
      0,
      1,
      7,
      0,
      7,
      10,
      0,
      10,
      11,
      1,
      5,
      9,
      5,
      11,
      4,
      11,
      10,
      2,
      10,
      7,
      6,
      7,
      1,
      8,
      3,
      9,
      4,
      3,
      4,
      2,
      3,
      2,
      6,
      3,
      6,
      8,
      3,
      8,
      9,
      4,
      9,
      5,
      2,
      4,
      11,
      6,
      2,
      10,
      8,
      6,
      7,
      9,
      8,
      1
    );
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 4, radius = 1) {
    super();
    const safeSteps = Math.max(4, steps);
    const alpha = (2 * Math.PI) / safeSteps;

    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;

    for (let i = 0; i < safeSteps; ++i) {
      const x = Math.cos(alpha * i);
      const y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * 0.5 + 0.5;
      this.lastVertex.uv[1] = y * 0.5 + 0.5;

      if (i > 0) {
        this.addFace(0, i, i + 1);
      }
    }
    this.addFace(0, safeSteps, 1);
  }
}

class RoundedSquareGeometry extends Geometry {
  constructor(size = 1, cornerRadius = 0.2, cornerSteps = 8) {
    super();
    
    // Center vertex
    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;
    
    const halfSize = size * 0.5;
    const radius = Math.min(cornerRadius, halfSize);
    const innerSize = halfSize - radius;
    
    let vertexIndex = 1;
    
    // Generate vertices for rounded corners and edges
    const corners = [
      { x: innerSize, y: innerSize, startAngle: 0 },        // Top-right
      { x: -innerSize, y: innerSize, startAngle: Math.PI / 2 },   // Top-left
      { x: -innerSize, y: -innerSize, startAngle: Math.PI },      // Bottom-left
      { x: innerSize, y: -innerSize, startAngle: Math.PI * 1.5 }  // Bottom-right
    ];
    
    for (let c = 0; c < corners.length; c++) {
      const corner = corners[c];
      const angleStep = (Math.PI / 2) / cornerSteps;
      
      // Generate vertices for this corner
      for (let i = 0; i <= cornerSteps; i++) {
        const angle = corner.startAngle + angleStep * i;
        const x = corner.x + Math.cos(angle) * radius;
        const y = corner.y + Math.sin(angle) * radius;
        
        this.addVertex(x, y, 0);
        const uv = this.lastVertex.uv;
        uv[0] = (x / size) + 0.5;
        uv[1] = (y / size) + 0.5;
        
        // Create triangles connecting to center
        if (c > 0 || i > 0) {
          const prevIndex = vertexIndex - 1;
          const currIndex = vertexIndex;
          
          // Skip the connection between last vertex of one corner and first of next
          if (i > 0 || (c > 0 && i === 0)) {
            this.addFace(0, prevIndex, currIndex);
          }
        }
        
        vertexIndex++;
      }
    }
    
    // Connect last vertex to first vertex
    this.addFace(0, vertexIndex - 1, 1);
  }
}

function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (success) {
    return shader;
  }

  const error = gl.getShaderInfoLog(shader);
  console.error('Shader compilation failed:', error);
  console.error('Shader type:', type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT');
  console.error('Shader source:', source);
  gl.deleteShader(shader);
  return null;
}

function createProgram(
  gl: WebGL2RenderingContext,
  shaderSources: [string, string],
  transformFeedbackVaryings?: string[] | null,
  attribLocations?: Record<string, number>
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((type, ndx) => {
    const shader = createShader(gl, type, shaderSources[ndx]);
    if (shader) {
      gl.attachShader(program, shader);
    }
  });

  if (transformFeedbackVaryings) {
    gl.transformFeedbackVaryings(
      program,
      transformFeedbackVaryings,
      gl.SEPARATE_ATTRIBS
    );
  }

  if (attribLocations) {
    for (const attrib in attribLocations) {
      if (Object.prototype.hasOwnProperty.call(attribLocations, attrib)) {
        gl.bindAttribLocation(program, attribLocations[attrib], attrib);
      }
    }
  }

  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (success) {
    return program;
  }

  const error = gl.getProgramInfoLog(program);
  console.error('Program linking failed:', error);
  gl.deleteProgram(program);
  return null;
}

function makeVertexArray(
  gl: WebGL2RenderingContext,
  bufLocNumElmPairs: Array<[WebGLBuffer, number, number]>,
  indices?: Uint16Array
): WebGLVertexArrayObject | null {
  const va = gl.createVertexArray();
  if (!va) return null;

  gl.bindVertexArray(va);

  for (const [buffer, loc, numElem] of bufLocNumElmPairs) {
    if (loc === -1) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, numElem, gl.FLOAT, false, 0, 0);
  }

  if (indices) {
    const indexBuffer = gl.createBuffer();
    if (indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    }
  }

  gl.bindVertexArray(null);
  return va;
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const displayWidth = Math.round(canvas.clientWidth * dpr);
  const displayHeight = Math.round(canvas.clientHeight * dpr);
  const needResize =
    canvas.width !== displayWidth || canvas.height !== displayHeight;
  if (needResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  return needResize;
}

function makeBuffer(
  gl: WebGL2RenderingContext,
  sizeOrData: number | ArrayBufferView,
  usage: number
): WebGLBuffer {
  const buf = gl.createBuffer();
  if (!buf) {
    throw new Error("Failed to create WebGL buffer.");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);

  if (typeof sizeOrData === "number") {
    gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, usage);
  } else {
    gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, usage);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buf;
}

function createAndSetupTexture(
  gl: WebGL2RenderingContext,
  minFilter: number,
  magFilter: number,
  wrapS: number,
  wrapT: number
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to create WebGL texture.");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  return texture;
}

type UpdateCallback = (deltaTime: number) => void;

class ArcballControl {
  private canvas: HTMLCanvasElement;
  private updateCallback: UpdateCallback;

  public isPointerDown = false;
  public orientation = quat.create();
  public pointerRotation = quat.create();
  public rotationVelocity = 0;
  public rotationAxis = vec3.fromValues(1, 0, 0);

  public snapDirection = vec3.fromValues(0, 0, -1);
  public snapTargetDirection: vec3 | null = null;

  private pointerPos = vec2.create();
  private previousPointerPos = vec2.create();
  private _rotationVelocity = 0;
  private _combinedQuat = quat.create();

  private readonly EPSILON = 0.1;
  private readonly IDENTITY_QUAT = quat.create();

  constructor(canvas: HTMLCanvasElement, updateCallback?: UpdateCallback) {
    this.canvas = canvas;
    this.updateCallback = updateCallback || (() => undefined);

    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      vec2.set(this.pointerPos, e.clientX, e.clientY);
      vec2.copy(this.previousPointerPos, this.pointerPos);
      this.isPointerDown = true;
    });
    canvas.addEventListener("pointerup", () => {
      this.isPointerDown = false;
    });
    canvas.addEventListener("pointerleave", () => {
      this.isPointerDown = false;
    });
    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      if (this.isPointerDown) {
        vec2.set(this.pointerPos, e.clientX, e.clientY);
      }
    });
    canvas.style.touchAction = "none";
  }

  public update(deltaTime: number, targetFrameDuration = 16): void {
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let angleFactor = timeScale;
    const snapRotation = quat.create();

    if (this.isPointerDown) {
      const INTENSITY = 0.3 * timeScale;
      const ANGLE_AMPLIFICATION = 5 / timeScale;
      const midPointerPos = vec2.sub(
        vec2.create(),
        this.pointerPos,
        this.previousPointerPos
      );
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);

      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);

        const p = this.project(midPointerPos);
        const q = this.project(this.previousPointerPos);
        const a = vec3.normalize(vec3.create(), p);
        const b = vec3.normalize(vec3.create(), q);

        vec2.copy(this.previousPointerPos, midPointerPos);

        angleFactor *= ANGLE_AMPLIFICATION;

        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(
          this.pointerRotation,
          this.pointerRotation,
          this.IDENTITY_QUAT,
          INTENSITY
        );
      }
    } else {
      const INTENSITY = 0.1 * timeScale;
      quat.slerp(
        this.pointerRotation,
        this.pointerRotation,
        this.IDENTITY_QUAT,
        INTENSITY
      );

      if (this.snapTargetDirection) {
        const SNAPPING_INTENSITY = 0.2;
        const a = this.snapTargetDirection;
        const b = this.snapDirection;
        const sqrDist = vec3.squaredDistance(a, b);
        const distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(a, b, snapRotation, angleFactor);
      }
    }

    const combinedQuat = quat.multiply(
      quat.create(),
      snapRotation,
      this.pointerRotation
    );
    this.orientation = quat.multiply(
      quat.create(),
      combinedQuat,
      this.orientation
    );
    quat.normalize(this.orientation, this.orientation);

    const RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(
      this._combinedQuat,
      this._combinedQuat,
      combinedQuat,
      RA_INTENSITY
    );
    quat.normalize(this._combinedQuat, this._combinedQuat);

    const rad = Math.acos(this._combinedQuat[3]) * 2.0;
    const s = Math.sin(rad / 2.0);
    let rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }

    const RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;

    this.updateCallback(deltaTime);
  }

  private quatFromVectors(
    a: vec3,
    b: vec3,
    out: quat,
    angleFactor = 1
  ): { q: quat; axis: vec3; angle: number } {
    const axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    const angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
    return { q: out, axis, angle };
  }

  private project(pos: vec2): vec3 {
    const r = 2;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const s = Math.max(w, h) - 1;

    const x = (2 * pos[0] - w - 1) / s;
    const y = (2 * pos[1] - h - 1) / s;
    let z = 0;
    const xySq = x * x + y * y;
    const rSq = r * r;

    if (xySq <= rSq / 2.0) {
      z = Math.sqrt(rSq - xySq);
    } else {
      z = rSq / Math.sqrt(xySq);
    }
    return vec3.fromValues(-x, y, z);
  }
}

interface MenuItem {
  id?: number;
  image: string;
  imageHighRes?: string;
  link: string;
  title: string;
  description: string;
}

type ActiveItemCallback = (index: number) => void;
type MovementChangeCallback = (isMoving: boolean) => void;
type InitCallback = (instance: InfiniteGridMenu) => void;

interface Camera {
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
    inversProjection: mat4;
  };
}

interface AtlasMapping {
  id: string;
  atlas: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Simple texture cache for reusing atlases
class TextureCache {
  private cache = new Map<string, WebGLTexture>();
  private maxSize = 10;
  
  constructor(private gl: WebGL2RenderingContext) {}
  
  get(key: string): WebGLTexture | null {
    const texture = this.cache.get(key);
    if (texture) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, texture);
    }
    return texture || null;
  }
  
  set(key: string, texture: WebGLTexture): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Simple FIFO eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        const oldTexture = this.cache.get(firstKey);
        if (oldTexture) {
          this.gl.deleteTexture(oldTexture);
        }
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, texture);
  }
  
  clear(): void {
    for (const texture of this.cache.values()) {
      this.gl.deleteTexture(texture);
    }
    this.cache.clear();
  }
  
  generateKey(items: MenuItem[], offset: number = 0): string {
    // Simple key based on item IDs and offset
    const ids = items.slice(0, 10).map(item => item.id || '').join('-');
    return `${offset}-${items.length}-${ids}`;
  }
}

// High-resolution texture cache for individual items
class HighResTextureCache {
  private cache = new Map<number, WebGLTexture>();
  private loadingSet = new Set<number>();
  private lastAccessTime = new Map<number, number>();
  private maxSize = 20; // Store up to 20 high-res textures (only display 12 at once)
  
  constructor(private gl: WebGL2RenderingContext) {}
  
  has(itemIndex: number): boolean {
    return this.cache.has(itemIndex);
  }
  
  isLoading(itemIndex: number): boolean {
    return this.loadingSet.has(itemIndex);
  }
  
  get(itemIndex: number): WebGLTexture | null {
    const texture = this.cache.get(itemIndex);
    if (texture) {
      // Update access time
      this.lastAccessTime.set(itemIndex, performance.now());
    }
    return texture || null;
  }
  
  set(itemIndex: number, texture: WebGLTexture): void {
    // Remove from loading set
    this.loadingSet.delete(itemIndex);
    
    // If cache is full, evict least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(itemIndex)) {
      this.evictLRU();
    }
    
    this.cache.set(itemIndex, texture);
    this.lastAccessTime.set(itemIndex, performance.now());
  }
  
  setLoading(itemIndex: number): void {
    this.loadingSet.add(itemIndex);
  }
  
  private evictLRU(): void {
    let oldestTime = Infinity;
    let oldestKey = -1;
    
    for (const [key, time] of this.lastAccessTime.entries()) {
      if (time < oldestTime && this.cache.has(key)) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey !== -1) {
      const texture = this.cache.get(oldestKey);
      if (texture) {
        this.gl.deleteTexture(texture);
      }
      this.cache.delete(oldestKey);
      this.lastAccessTime.delete(oldestKey);
    }
  }
  
  clear(): void {
    for (const texture of this.cache.values()) {
      this.gl.deleteTexture(texture);
    }
    this.cache.clear();
    this.lastAccessTime.clear();
    this.loadingSet.clear();
  }
  
  getLoadedIndices(): number[] {
    return Array.from(this.cache.keys());
  }
}

class InfiniteGridMenu {
  private gl: WebGL2RenderingContext | null = null;
  private discProgram: WebGLProgram | null = null;
  private discVAO: WebGLVertexArrayObject | null = null;
  private discBuffers!: {
    vertices: Float32Array;
    indices: Uint16Array;
    normals: Float32Array;
    uvs: Float32Array;
  };
  private icoGeo!: IcosahedronGeometry;
  private discGeo!: DiscGeometry;
  private worldMatrix = mat4.create();
  private tex: WebGLTexture | null = null;
  private atlases: WebGLTexture[] = [];
  private atlasMapping: AtlasMapping[] = [];
  private control!: ArcballControl;
  private animationFrameId: number | null = null;
  
  // Texture transition state
  private texNext: WebGLTexture | null = null;
  private atlasesNext: WebGLTexture[] = [];
  private textureBlendValue: number = 0;
  private textureTransitioning: boolean = false;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 500; // ms
  
  // Thumbnail loading state
  private thumbnailsLoaded: boolean = false;
  private loadingHighRes: boolean = false;
  
  // High-res texture management
  private highResCache: HighResTextureCache | null = null;
  private highResTextureArray: WebGLTexture | null = null;
  private highResIndicesBuffer: WebGLBuffer | null = null;
  private highResLoadQueue: number[] = [];

  private discLocations!: {
    aModelPosition: number;
    aModelUvs: number;
    aInstanceMatrix: number;
    uWorldMatrix: WebGLUniformLocation | null;
    uViewMatrix: WebGLUniformLocation | null;
    uProjectionMatrix: WebGLUniformLocation | null;
    uCameraPosition: WebGLUniformLocation | null;
    uScaleFactor: WebGLUniformLocation | null;
    uRotationAxisVelocity: WebGLUniformLocation | null;
    uTex: WebGLUniformLocation | null;
    uTexNext: WebGLUniformLocation | null;
    uTextureBlend: WebGLUniformLocation | null;
    uFrames: WebGLUniformLocation | null;
    uItemCount: WebGLUniformLocation | null;
    uAtlasSize: WebGLUniformLocation | null;
    uRotationOffset: WebGLUniformLocation | null;
    uHighResCount: WebGLUniformLocation | null;
    uHighResIndices: WebGLUniformLocation | null;
    uHighResTextures: (WebGLUniformLocation | null)[];
  };

  private viewportSize = vec2.create();
  private drawBufferSize = vec2.create();

  private discInstances!: {
    matricesArray: Float32Array;
    matrices: Float32Array[];
    buffer: WebGLBuffer | null;
  };

  private instancePositions: vec3[] = [];
  private DISC_INSTANCE_COUNT = 0;
  private atlasSize = 1;

  private _time = 0;
  private _deltaTime = 0;
  private _deltaFrames = 0;
  private _frames = 0;

  private movementActive = false;
  private activeItemIndex = 0;

  private TARGET_FRAME_DURATION = 1000 / 60;
  private SPHERE_RADIUS = 2;
  
  // Temporal cycling state
  private useTemporalCycling: boolean = false;
  private rotationOffset: number = 0;
  private cumulativeRotation: number = 0;
  private VERTEX_COUNT: number = 42;
  
  // Texture cache
  private textureCache: TextureCache | null = null;

  public camera: Camera = {
    matrix: mat4.create(),
    near: 0.1,
    far: 40,
    fov: Math.PI / 4,
    aspect: 1,
    position: vec3.fromValues(0, 0, 3),
    up: vec3.fromValues(0, 1, 0),
    matrices: {
      view: mat4.create(),
      projection: mat4.create(),
      inversProjection: mat4.create(),
    },
  };

  public smoothRotationVelocity = 0;
  public scaleFactor = 1.0;

  constructor(
    private canvas: HTMLCanvasElement,
    private items: MenuItem[],
    private onActiveItemChange: ActiveItemCallback,
    private onMovementChange: MovementChangeCallback,
    onInit?: InitCallback
  ) {
    this.init(onInit);
  }

  public resize(): void {
    const needsResize = resizeCanvasToDisplaySize(this.canvas);
    if (!this.gl) return;
    if (needsResize) {
      this.gl.viewport(
        0,
        0,
        this.gl.drawingBufferWidth,
        this.gl.drawingBufferHeight
      );
    }
    this.updateProjectionMatrix();
  }

  
  public run(time = 0): void {
    this._deltaTime = Math.min(32, time - this._time);
    this._time = time;
    this._deltaFrames = this._deltaTime / this.TARGET_FRAME_DURATION;
    this._frames += this._deltaFrames;
    
    // Update texture transition
    if (this.textureTransitioning) {
      const elapsed = time - this.transitionStartTime;
      const progress = Math.min(1, elapsed / this.transitionDuration);
      this.textureBlendValue = this.easeInOutCubic(progress);
      
      if (progress >= 1) {
        this.completeTextureTransition();
      }
    }
    
    // High-res loading is now handled in onControlUpdate when rotation stops

    this.resize();
    this.animate(this._deltaTime);
    this.render();
    this.onControlUpdate(this._deltaTime);

    this.animationFrameId = requestAnimationFrame((t) => this.run(t));
  }

  private init(onInit?: InitCallback): void {
    const gl = this.canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
    });
    if (!gl) {
      throw new Error("No WebGL 2 context!");
    }
    this.gl = gl;
    
    // Initialize texture caches
    this.textureCache = new TextureCache(gl);
    this.highResCache = new HighResTextureCache(gl);
    
    // Check texture unit limits
    const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    console.log(`WebGL2 MAX_TEXTURE_IMAGE_UNITS: ${maxTextureUnits}`);
    
    if (maxTextureUnits < 16) {
      console.warn(`Limited texture units available: ${maxTextureUnits}. High-res texture support may be limited.`);
    }

    vec2.set(
      this.viewportSize,
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
    vec2.clone(this.drawBufferSize);

    this.discProgram = createProgram(
      gl,
      [discVertShaderSource, discFragShaderSource],
      null,
      {
        aModelPosition: 0,
        aModelNormal: 1,
        aModelUvs: 2,
        aInstanceMatrix: 3,
      }
    );
    
    if (!this.discProgram) {
      throw new Error("Failed to create shader program - check console for shader compilation errors");
    }

    this.discLocations = {
      aModelPosition: gl.getAttribLocation(this.discProgram!, "aModelPosition"),
      aModelUvs: gl.getAttribLocation(this.discProgram!, "aModelUvs"),
      aInstanceMatrix: gl.getAttribLocation(
        this.discProgram!,
        "aInstanceMatrix"
      ),
      uWorldMatrix: gl.getUniformLocation(this.discProgram!, "uWorldMatrix"),
      uViewMatrix: gl.getUniformLocation(this.discProgram!, "uViewMatrix"),
      uProjectionMatrix: gl.getUniformLocation(
        this.discProgram!,
        "uProjectionMatrix"
      ),
      uCameraPosition: gl.getUniformLocation(
        this.discProgram!,
        "uCameraPosition"
      ),
      uScaleFactor: gl.getUniformLocation(this.discProgram!, "uScaleFactor"),
      uRotationAxisVelocity: gl.getUniformLocation(
        this.discProgram!,
        "uRotationAxisVelocity"
      ),
      uTex: gl.getUniformLocation(this.discProgram!, "uTex"),
      uTexNext: gl.getUniformLocation(this.discProgram!, "uTexNext"),
      uTextureBlend: gl.getUniformLocation(this.discProgram!, "uTextureBlend"),
      uFrames: gl.getUniformLocation(this.discProgram!, "uFrames"),
      uItemCount: gl.getUniformLocation(this.discProgram!, "uItemCount"),
      uAtlasSize: gl.getUniformLocation(this.discProgram!, "uAtlasSize"),
      uRotationOffset: gl.getUniformLocation(this.discProgram!, "uRotationOffset"),
      uHighResCount: gl.getUniformLocation(this.discProgram!, "uHighResCount"),
      uHighResIndices: gl.getUniformLocation(this.discProgram!, "uHighResIndices"),
      uHighResTextures: [],
    };
    
    // Get all high-res texture uniform locations
    for (let i = 0; i < 12; i++) {
      this.discLocations.uHighResTextures.push(
        gl.getUniformLocation(this.discProgram!, `uHighResTex${i}`)
      );
    }

    this.discGeo = new RoundedSquareGeometry(1, 0.15, 8);
    this.discBuffers = this.discGeo.data;
    this.discVAO = makeVertexArray(
      gl,
      [
        [
          makeBuffer(gl, this.discBuffers.vertices, gl.STATIC_DRAW),
          this.discLocations.aModelPosition,
          3,
        ],
        [
          makeBuffer(gl, this.discBuffers.uvs, gl.STATIC_DRAW),
          this.discLocations.aModelUvs,
          2,
        ],
      ],
      this.discBuffers.indices
    );

    this.icoGeo = new IcosahedronGeometry();
    this.icoGeo.subdivide(1).spherize(this.SPHERE_RADIUS);
    this.instancePositions = this.icoGeo.vertices.map((v) => v.position);
    this.DISC_INSTANCE_COUNT = this.icoGeo.vertices.length;
    this.VERTEX_COUNT = this.DISC_INSTANCE_COUNT; // Update to actual vertex count
    this.initDiscInstances(this.DISC_INSTANCE_COUNT);
    this.initTexture();
    this.control = new ArcballControl(this.canvas, (deltaTime) =>
      this.onControlUpdate(deltaTime)
    );

    this.updateCameraMatrix();
    this.updateProjectionMatrix();

    this.resize();

    if (onInit) {
      onInit(this);
    }
  }

  private async initTexture(): Promise<void> {
    if (!this.gl) return;
    const gl = this.gl;

    console.log('Loading pre-built texture atlases...');
    
    // Check MAX_TEXTURE_SIZE
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    console.log('GPU MAX_TEXTURE_SIZE:', maxTextureSize);
    
    if (maxTextureSize < 4096) {
      console.warn('GPU does not support 4096x4096 textures, falling back to dynamic generation');
      this.initTextureFallback();
      return;
    }
    
    try {
      // First load the atlas mapping
      const mappingResponse = await fetch('/atlas.json');
      if (!mappingResponse.ok) {
        throw new Error('Failed to load atlas mapping');
      }
      this.atlasMapping = await mappingResponse.json();
      
      // Determine how many atlases we need
      const atlasCount = Math.ceil(this.items.length / 256);
      
      // Load all atlas textures
      const atlasPromises: Promise<void>[] = [];
      for (let i = 0; i < atlasCount; i++) {
        atlasPromises.push(this.loadAtlas(i).catch(err => {
          console.warn(`Failed to load atlas ${i}:`, err);
          // Continue with other atlases
        }));
      }
      
      await Promise.all(atlasPromises);
      
      // Use the first atlas as the primary texture for now
      if (this.atlases.length > 0) {
        this.tex = this.atlases[0];
      }
      
      // Set atlas size to 16x16 (256 tiles per atlas)
      this.atlasSize = 16;
      
      console.log(`Loaded ${this.atlases.length} texture atlases`);
    } catch (error) {
      console.error('Failed to load pre-built atlases:', error);
      this.initTextureFallback();
    }
  }
  
  private loadAtlas(index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.gl) {
        console.warn(`GL context not ready for atlas ${index}, skipping`);
        resolve(); // Return successfully instead of rejecting
        return;
      }
      
      const gl = this.gl;
      const atlasUrl = `/atlas-${index}.jpg`;
      const texture = createAndSetupTexture(
        gl,
        gl.LINEAR,
        gl.LINEAR,
        gl.CLAMP_TO_EDGE,
        gl.CLAMP_TO_EDGE
      );
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        console.log(`Atlas ${index} loaded`);
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        
        // Ensure atlases array is initialized
        if (!this.atlases) {
          this.atlases = [];
        }
        this.atlases[index] = texture;
        resolve();
      };
      img.onerror = () => {
        reject(new Error(`Failed to load atlas ${index}`));
      };
      img.src = atlasUrl;
    });
  }
  
  private initTextureFallback(): void {
    if (!this.gl) return;
    const gl = this.gl;
    
    // Simple fallback - create colored squares
    const itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    const cellSize = 256;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = this.atlasSize * cellSize;
    canvas.height = this.atlasSize * cellSize;
    
    this.items.forEach((_, i) => {
      const x = (i % this.atlasSize) * cellSize;
      const y = Math.floor(i / this.atlasSize) * cellSize;
      ctx.fillStyle = `hsl(${(i * 360) / this.items.length}, 70%, 50%)`;
      ctx.fillRect(x, y, cellSize, cellSize);
    });

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      canvas
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    console.log('Fallback texture atlas created');
  }
  
  private async loadHighResTexture(index: number): Promise<void> {
    if (!this.gl || !this.highResCache) return;
    
    const item = this.items[index];
    if (!item?.imageHighRes) return;
    
    // Check if already loaded or loading
    if (this.highResCache.has(index) || this.highResCache.isLoading(index)) {
      return;
    }
    
    this.highResCache.setLoading(index);
    const gl = this.gl;
    
    try {
      // Load the high-res image
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load high-res image'));
        img.src = item.imageHighRes!;
      });
      
      // Create and setup new texture
      const texture = createAndSetupTexture(
        gl,
        gl.LINEAR,
        gl.LINEAR,
        gl.CLAMP_TO_EDGE,
        gl.CLAMP_TO_EDGE
      );
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        img
      );
      
      // Add to cache
      this.highResCache.set(index, texture);
      console.log(`Loaded high-res texture for item ${index}`);
    } catch (error) {
      console.error(`Failed to load high-res texture for item ${index}:`, error);
    }
  }
  
  private async loadHighResForActiveItem(): Promise<void> {
    if (!this.highResCache || this.activeItemIndex < 0 || this.activeItemIndex >= this.items.length) return;
    
    // Load high-res for the active item
    await this.loadHighResTexture(this.activeItemIndex);
    
    // Preload adjacent items for smooth transitions
    const prevIndex = (this.activeItemIndex - 1 + this.items.length) % this.items.length;
    const nextIndex = (this.activeItemIndex + 1) % this.items.length;
    
    // Load adjacent items in background (don't await)
    this.loadHighResTexture(prevIndex);
    this.loadHighResTexture(nextIndex);
  }
  
  private async loadHighResTexturesForVisibleItems(): Promise<void> {
    if (!this.highResCache) return;
    
    // Get visible item indices
    const visibleIndices = this.getVisibleItemIndices();
    
    // Sort by distance from active item for priority
    const sortedIndices = visibleIndices.sort((a, b) => {
      const distA = Math.abs(a - this.activeItemIndex);
      const distB = Math.abs(b - this.activeItemIndex);
      return distA - distB;
    });
    
    // Load high-res textures for visible items
    const loadPromises: Promise<void>[] = [];
    const maxConcurrent = 4; // Limit concurrent loads
    
    for (let i = 0; i < Math.min(sortedIndices.length, maxConcurrent); i++) {
      const itemIndex = sortedIndices[i];
      if (itemIndex < this.items.length) {
        loadPromises.push(this.loadHighResTexture(itemIndex));
      }
    }
    
    // Load remaining items in background
    if (sortedIndices.length > maxConcurrent) {
      setTimeout(() => {
        for (let i = maxConcurrent; i < sortedIndices.length; i++) {
          const itemIndex = sortedIndices[i];
          if (itemIndex < this.items.length) {
            this.loadHighResTexture(itemIndex);
          }
        }
      }, 100);
    }
    
    await Promise.all(loadPromises);
  }

  private initDiscInstances(count: number): void {
    if (!this.gl || !this.discVAO) return;
    const gl = this.gl;

    const matricesArray = new Float32Array(count * 16);
    const matrices: Float32Array[] = [];
    for (let i = 0; i < count; ++i) {
      const instanceMatrixArray = new Float32Array(
        matricesArray.buffer,
        i * 16 * 4,
        16
      );
      mat4.identity(instanceMatrixArray as unknown as mat4);
      matrices.push(instanceMatrixArray);
    }

    this.discInstances = {
      matricesArray,
      matrices,
      buffer: gl.createBuffer(),
    };

    gl.bindVertexArray(this.discVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.discInstances.matricesArray.byteLength,
      gl.DYNAMIC_DRAW
    );

    const mat4AttribSlotCount = 4;
    const bytesPerMatrix = 16 * 4;
    for (let j = 0; j < mat4AttribSlotCount; ++j) {
      const loc = this.discLocations.aInstanceMatrix + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(
        loc,
        4,
        gl.FLOAT,
        false,
        bytesPerMatrix,
        j * 4 * 4
      );
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  private animate(deltaTime: number): void {
    if (!this.gl) return;
    this.control.update(deltaTime, this.TARGET_FRAME_DURATION);
    
    // Track rotation for temporal cycling
    if (this.useTemporalCycling && this.control.rotationVelocity !== 0) {
      // Track cumulative rotation
      const rotationDelta = this.control.rotationVelocity * deltaTime * 0.01;
      this.cumulativeRotation += rotationDelta;
      
      // Update offset based on rotation (smooth continuous motion)
      const itemsPerFullRotation = this.VERTEX_COUNT;
      const rotationsCompleted = this.cumulativeRotation / (Math.PI * 2);
      const newOffset = Math.floor(rotationsCompleted * itemsPerFullRotation) % this.items.length;
      
      // Ensure offset is always positive
      this.rotationOffset = newOffset >= 0 ? newOffset : this.items.length + newOffset;
    }

    const positions = this.instancePositions.map((p) =>
      vec3.transformQuat(vec3.create(), p, this.control.orientation)
    );
    const scale = 0.25;
    const SCALE_INTENSITY = 0.6;

    positions.forEach((p, ndx) => {
      const s =
        (Math.abs(p[2]) / this.SPHERE_RADIUS) * SCALE_INTENSITY +
        (1 - SCALE_INTENSITY);
      const finalScale = s * scale;
      const matrix = mat4.create();

      mat4.multiply(
        matrix,
        matrix,
        mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p))
      );
      mat4.multiply(
        matrix,
        matrix,
        mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0])
      );
      mat4.multiply(
        matrix,
        matrix,
        mat4.fromScaling(mat4.create(), [finalScale, finalScale, finalScale])
      );
      mat4.multiply(
        matrix,
        matrix,
        mat4.fromTranslation(mat4.create(), [0, 0, -this.SPHERE_RADIUS])
      );

      mat4.copy(this.discInstances.matrices[ndx], matrix);
    });

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.discInstances.buffer);
    this.gl.bufferSubData(
      this.gl.ARRAY_BUFFER,
      0,
      this.discInstances.matricesArray
    );
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

    this.smoothRotationVelocity = this.control.rotationVelocity;
  }

  private render(): void {
    if (!this.gl || !this.discProgram) return;
    const gl = this.gl;

    gl.useProgram(this.discProgram);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(
      this.discLocations.uWorldMatrix,
      false,
      this.worldMatrix
    );
    gl.uniformMatrix4fv(
      this.discLocations.uViewMatrix,
      false,
      this.camera.matrices.view
    );
    gl.uniformMatrix4fv(
      this.discLocations.uProjectionMatrix,
      false,
      this.camera.matrices.projection
    );
    gl.uniform3f(
      this.discLocations.uCameraPosition,
      this.camera.position[0],
      this.camera.position[1],
      this.camera.position[2]
    );
    gl.uniform4f(
      this.discLocations.uRotationAxisVelocity,
      this.control.rotationAxis[0],
      this.control.rotationAxis[1],
      this.control.rotationAxis[2],
      this.smoothRotationVelocity * 1.1
    );

    gl.uniform1i(this.discLocations.uItemCount, this.items.length);
    gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);
    gl.uniform1i(this.discLocations.uRotationOffset, this.rotationOffset);

    gl.uniform1f(this.discLocations.uFrames, this._frames);
    gl.uniform1f(this.discLocations.uScaleFactor, this.scaleFactor);

    gl.uniform1i(this.discLocations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    
    // Bind next texture for transition
    gl.uniform1i(this.discLocations.uTexNext, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texNext || this.tex);
    
    // Set blend factor
    gl.uniform1f(this.discLocations.uTextureBlend, this.textureBlendValue);
    
    // Bind high-res textures if available
    if (this.highResCache) {
      const loadedIndices = this.highResCache.getLoadedIndices();
      const maxTextures = Math.min(loadedIndices.length, 12); // Max 12 high-res texture units
      
      // Pass the count of high-res textures
      gl.uniform1i(this.discLocations.uHighResCount, maxTextures);
      
      // Pass the indices array
      if (maxTextures > 0) {
        const indicesArray = new Int32Array(12);
        for (let i = 0; i < maxTextures; i++) {
          indicesArray[i] = loadedIndices[i];
        }
        gl.uniform1iv(this.discLocations.uHighResIndices, indicesArray);
        
        // Bind each high-res texture to its texture unit
        for (let i = 0; i < maxTextures; i++) {
          const texture = this.highResCache.get(loadedIndices[i]);
          if (texture) {
            gl.activeTexture(gl.TEXTURE3 + i); // Start from TEXTURE3
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(this.discLocations.uHighResTextures[i], 3 + i);
          }
        }
      }
    } else {
      // No high-res textures
      gl.uniform1i(this.discLocations.uHighResCount, 0);
    }

    gl.bindVertexArray(this.discVAO);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      this.discBuffers.indices.length,
      gl.UNSIGNED_SHORT,
      0,
      this.DISC_INSTANCE_COUNT
    );
    gl.bindVertexArray(null);
  }

  private updateCameraMatrix(): void {
    mat4.targetTo(
      this.camera.matrix,
      this.camera.position,
      [0, 0, 0],
      this.camera.up
    );
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  }

  private updateProjectionMatrix(): void {
    if (!this.gl) return;
    const canvasEl = this.gl.canvas as HTMLCanvasElement;
    this.camera.aspect = canvasEl.clientWidth / canvasEl.clientHeight;
    const height = this.SPHERE_RADIUS * 0.35;
    const distance = this.camera.position[2];
    if (this.camera.aspect > 1) {
      this.camera.fov = 2 * Math.atan(height / distance);
    } else {
      this.camera.fov = 2 * Math.atan(height / this.camera.aspect / distance);
    }
    mat4.perspective(
      this.camera.matrices.projection,
      this.camera.fov,
      this.camera.aspect,
      this.camera.near,
      this.camera.far
    );
    mat4.invert(
      this.camera.matrices.inversProjection,
      this.camera.matrices.projection
    );
  }

  private onControlUpdate(deltaTime: number): void {
    const timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    let damping = 5 / timeScale;
    let cameraTargetZ = 2.5;

    const isMoving =
      this.control.isPointerDown ||
      Math.abs(this.smoothRotationVelocity) > 0.01;

    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
      
      // When we stop moving, load high-res for the active item
      if (!isMoving) {
        this.loadHighResForActiveItem();
      }
    }

    if (!this.control.isPointerDown) {
      const nearestVertexIndex = this.findNearestVertexIndex();
      let itemIndex: number;
      
      if (this.useTemporalCycling) {
        // Apply rotation offset for large datasets
        itemIndex = (nearestVertexIndex - this.rotationOffset + this.items.length) % this.items.length;
        // Ensure positive index
        if (itemIndex < 0) itemIndex += this.items.length;
      } else {
        // Static mapping for small datasets
        itemIndex = nearestVertexIndex % Math.max(1, this.items.length);
      }
      
      const prevActiveIndex = this.activeItemIndex;
      this.activeItemIndex = itemIndex;
      this.onActiveItemChange(itemIndex);
      
      // If active item changed, load high-res for new item
      if (prevActiveIndex !== itemIndex) {
        this.loadHighResForActiveItem();
      }
      
      const snapDirection = vec3.normalize(
        vec3.create(),
        this.getVertexWorldPosition(nearestVertexIndex)
      );
      this.control.snapTargetDirection = snapDirection;
    } else {
      // Fixed comfortable distance during drag
      cameraTargetZ = 4.5;
      damping = 7 / timeScale;
    }

    this.camera.position[2] +=
      (cameraTargetZ - this.camera.position[2]) / damping;
    this.updateCameraMatrix();
  }

  private findNearestVertexIndex(): number {
    const n = this.control.snapDirection;
    const inversOrientation = quat.conjugate(
      quat.create(),
      this.control.orientation
    );
    const nt = vec3.transformQuat(vec3.create(), n, inversOrientation);

    let maxD = -1;
    let nearestVertexIndex = 0;
    for (let i = 0; i < this.instancePositions.length; ++i) {
      const d = vec3.dot(nt, this.instancePositions[i]);
      if (d > maxD) {
        maxD = d;
        nearestVertexIndex = i;
      }
    }
    return nearestVertexIndex;
  }

  private getVertexWorldPosition(index: number): vec3 {
    const nearestVertexPos = this.instancePositions[index];
    return vec3.transformQuat(
      vec3.create(),
      nearestVertexPos,
      this.control.orientation
    );
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    const gl = this.gl;
    if (!gl) return;

    if (this.discProgram) {
      gl.deleteProgram(this.discProgram);
    }
    if (this.discVAO) {
      gl.deleteVertexArray(this.discVAO);
    }
    if (this.discInstances && this.discInstances.buffer) {
      gl.deleteBuffer(this.discInstances.buffer);
    }
    if (this.tex) {
      gl.deleteTexture(this.tex);
    }
    this.atlases.forEach(atlas => {
      if(atlas) gl.deleteTexture(atlas)
    });
    
    // Clear texture caches
    if (this.textureCache) {
      this.textureCache.clear();
      this.textureCache = null;
    }
    
    if (this.highResCache) {
      this.highResCache.clear();
      this.highResCache = null;
    }
    
    this.gl = null;
  }

  public updateItems(newItems: MenuItem[]): void {
    if (!this.gl || this.textureTransitioning) return;
    
    this.items = newItems;
    
    // Clear high-res cache when items change
    if (this.highResCache) {
      this.highResCache.clear();
    }
    
    // Determine cycling mode based on item count
    const wasUsingTemporalCycling = this.useTemporalCycling;
    this.useTemporalCycling = newItems.length > this.VERTEX_COUNT;
    
    // Reset rotation state when switching modes or when items change significantly
    if (wasUsingTemporalCycling !== this.useTemporalCycling) {
      this.rotationOffset = 0;
      this.cumulativeRotation = 0;
    }
    
    // Reset thumbnail loading state for new items
    this.thumbnailsLoaded = false;
    this.loadingHighRes = false;
    
    // Start texture transition
    this.textureTransitioning = true;
    this.transitionStartTime = performance.now();
    this.textureBlendValue = 0;
    
    // Keep current textures as-is during transition
    // Load new textures in the background
    this.loadNewTextures().then(() => {
      // New textures are ready, transition will happen automatically
      // High-res loading will happen when rotation stops (in onControlUpdate)
    }).catch((error) => {
      console.error('Failed to load new textures:', error);
      this.textureTransitioning = false;
    });
  }
  
  private async loadNewTextures(): Promise<void> {
    if (!this.gl || !this.textureCache) return;
    const gl = this.gl;
    
    try {
      // Generate cache key for current items
      const cacheKey = this.textureCache.generateKey(this.items, this.rotationOffset);
      
      // Check cache first
      const cachedTexture = this.textureCache.get(cacheKey);
      if (cachedTexture) {
        console.log('Using cached texture for:', cacheKey);
        this.atlasesNext = [cachedTexture];
        this.texNext = cachedTexture;
        this.atlasSize = Math.ceil(Math.sqrt(this.items.length));
        this.thumbnailsLoaded = true;
        return;
      }
      
      // Step 1: Load thumbnails for instant display
      if (!this.thumbnailsLoaded) {
        const thumbnailTexture = await this.createThumbnailAtlas();
        if (thumbnailTexture) {
          this.atlasesNext = [thumbnailTexture];
          this.texNext = thumbnailTexture;
          this.thumbnailsLoaded = true;
          
          // Complete the transition quickly to show thumbnails
          setTimeout(() => {
            if (this.textureTransitioning) {
              this.textureBlendValue = 1;
              this.completeTextureTransition();
            }
          }, 100);
        }
      }
      
      // Step 2: Load high-res textures in background
      if (!this.loadingHighRes) {
        this.loadingHighRes = true;
        
        // Continue loading high-res in background
        setTimeout(async () => {
          try {
            // Create new atlases array
            const newAtlases: WebGLTexture[] = [];
            
            // Try to load pre-built atlases first
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            if (maxTextureSize >= 4096) {
              try {
                const mappingResponse = await fetch('/atlas.json');
                if (mappingResponse.ok) {
                  this.atlasMapping = await mappingResponse.json();
                  const atlasCount = Math.ceil(this.items.length / 256);
                  
                  for (let i = 0; i < atlasCount; i++) {
                    const texture = await this.loadAtlasTexture(i);
                    newAtlases.push(texture);
                  }
                  
                  // Start a new transition to high-res
                  if (this.gl && newAtlases.length > 0) {
                    this.textureTransitioning = true;
                    this.transitionStartTime = performance.now();
                    this.textureBlendValue = 0;
                    this.atlasesNext = newAtlases;
                    this.texNext = newAtlases[0];
                    this.atlasSize = 16;
                    
                    // Cache the primary texture
                    if (this.textureCache) {
                      this.textureCache.set(cacheKey, newAtlases[0]);
                    }
                  }
                  
                  this.loadingHighRes = false;
                  return;
                }
              } catch {
                console.warn('Failed to load pre-built atlases, using fallback');
              }
            }
            
            // Fallback to generated texture
            this.createFallbackTexture();
            
            // Cache the fallback texture
            if (this.texNext && this.textureCache) {
              this.textureCache.set(cacheKey, this.texNext);
            }
            this.loadingHighRes = false;
          } catch (error) {
            console.error('Error loading high-res textures:', error);
            this.loadingHighRes = false;
          }
        }, 500); // Small delay to let thumbnails display first
      }
    } catch (error) {
      throw error;
    }
  }
  
  private loadAtlasTexture(index: number): Promise<WebGLTexture> {
    return new Promise((resolve, reject) => {
      if (!this.gl) {
        reject(new Error('No WebGL context for atlas texture'));
        return;
      }
      
      const gl = this.gl;
      const atlasUrl = `/atlas-${index}.jpg`;
      const texture = createAndSetupTexture(
        gl,
        gl.LINEAR,
        gl.LINEAR,
        gl.CLAMP_TO_EDGE,
        gl.CLAMP_TO_EDGE
      );
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        resolve(texture);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load atlas ${index}`));
      };
      img.src = atlasUrl;
    });
  }
  
  private async createThumbnailAtlas(): Promise<WebGLTexture | null> {
    if (!this.gl) return null;
    const gl = this.gl;
    
    const itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    const cellSize = 64; // Smaller size for thumbnails
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = this.atlasSize * cellSize;
    canvas.height = this.atlasSize * cellSize;
    
    // Fill with placeholder color first
    this.items.forEach((_, i) => {
      const x = (i % this.atlasSize) * cellSize;
      const y = Math.floor(i / this.atlasSize) * cellSize;
      ctx.fillStyle = `hsl(${(i * 360) / this.items.length}, 70%, 50%)`;
      ctx.fillRect(x, y, cellSize, cellSize);
    });
    
    // Create texture immediately with placeholders
    const texture = createAndSetupTexture(
      gl,
      gl.LINEAR,
      gl.LINEAR,
      gl.CLAMP_TO_EDGE,
      gl.CLAMP_TO_EDGE
    );
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      canvas
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    
    // Prioritize loading visible items first
    const visibleIndices = this.getVisibleItemIndices();
    const prioritizedIndices = [
      ...visibleIndices,
      ...Array.from({ length: this.items.length }, (_, i) => i).filter(i => !visibleIndices.includes(i))
    ];
    
    // Load actual thumbnails asynchronously with priority
    const loadPromises = prioritizedIndices.map(async (i) => {
      const item = this.items[i];
      if (item?.image) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              const x = (i % this.atlasSize) * cellSize;
              const y = Math.floor(i / this.atlasSize) * cellSize;
              ctx.drawImage(img, x, y, cellSize, cellSize);
              resolve();
            };
            img.onerror = () => reject(new Error(`Failed to load thumbnail ${i}`));
            // Use lower resolution image if available
            img.src = item.image;
          });
        } catch (error) {
          console.warn(`Failed to load thumbnail for item ${i}:`, error);
        }
      }
    });
    
    // Load visible items first, then others in batches
    const visiblePromises = loadPromises.slice(0, visibleIndices.length);
    const otherPromises = loadPromises.slice(visibleIndices.length);
    
    // Load visible items immediately
    if (visiblePromises.length > 0) {
      await Promise.all(visiblePromises);
      // Update texture with visible thumbnails
      if (this.gl) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          canvas
        );
      }
    }
    
    // Load remaining thumbnails in batches
    const batchSize = 10;
    for (let i = 0; i < otherPromises.length; i += batchSize) {
      await Promise.all(otherPromises.slice(i, i + batchSize));
      
      // Update texture with new thumbnails
      if (this.gl) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          canvas
        );
      }
    }
    
    return texture;
  }
  
  private createFallbackTexture(): void {
    if (!this.gl) return;
    const gl = this.gl;
    
    const itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    const cellSize = 256;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = this.atlasSize * cellSize;
    canvas.height = this.atlasSize * cellSize;
    
    this.items.forEach((_, i) => {
      const x = (i % this.atlasSize) * cellSize;
      const y = Math.floor(i / this.atlasSize) * cellSize;
      ctx.fillStyle = `hsl(${(i * 360) / this.items.length}, 70%, 50%)`;
      ctx.fillRect(x, y, cellSize, cellSize);
    });
    
    const texture = createAndSetupTexture(
      gl,
      gl.LINEAR,
      gl.LINEAR,
      gl.CLAMP_TO_EDGE,
      gl.CLAMP_TO_EDGE
    );
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      canvas
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    
    this.atlasesNext = [texture];
    this.texNext = texture;
  }
  
  private completeTextureTransition(): void {
    if (!this.gl) return;
    
    // Clean up old textures
    for (const atlas of this.atlases) {
      this.gl.deleteTexture(atlas);
    }
    
    // Swap textures
    this.atlases = this.atlasesNext;
    this.tex = this.texNext;
    this.atlasesNext = [];
    this.texNext = null;
    
    // Reset transition state
    this.textureTransitioning = false;
    this.textureBlendValue = 0;
    
    // Check memory usage and clean up if needed
    this.checkMemoryUsage();
  }
  
  private checkMemoryUsage(): void {
    // Only check if performance.memory is available (Chrome)
    const extPerf = performance as ExtendedPerformance;
    if (extPerf.memory) {
      const memory = extPerf.memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      // If using more than 70% of heap, trigger cleanup
      if (usedMB / limitMB > 0.7) {
        console.warn(`High memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
        this.performMemoryCleanup();
      }
    }
  }
  
  private performMemoryCleanup(): void {
    // Clear texture cache beyond essential textures
    if (this.textureCache) {
      // Keep only the most recent 5 textures
      const cacheSize = this.textureCache['cache'].size;
      if (cacheSize > 5) {
        console.log('Clearing texture cache for memory optimization');
        // Clear and rebuild with just current texture
        const currentKey = this.textureCache.generateKey(this.items, this.rotationOffset);
        const currentTexture = this.tex;
        this.textureCache.clear();
        if (currentTexture) {
          this.textureCache.set(currentKey, currentTexture);
        }
      }
    }
    
    // Force garbage collection if available (non-standard)
    const extWindow = window as ExtendedWindow;
    if (extWindow.gc) {
      extWindow.gc();
    }
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private getVisibleItemIndices(): number[] {
    // Get vertices that are visible based on camera view
    const visibleIndices: number[] = [];
    const viewMatrix = this.camera.matrices.view;
    const projMatrix = this.camera.matrices.projection;
    const mvpMatrix = mat4.create();
    
    // Iterate through all vertex positions
    for (let i = 0; i < this.instancePositions.length; i++) {
      const pos = this.instancePositions[i];
      const worldPos = vec3.create();
      
      // Transform vertex position to world space
      vec3.transformMat4(worldPos, pos, this.worldMatrix);
      
      // Transform to view space
      const viewPos = vec3.create();
      vec3.transformMat4(viewPos, worldPos, viewMatrix);
      
      // Simple frustum culling - check if in front of camera
      if (viewPos[2] < 0) { // In front of camera (negative Z in view space)
        // Check if within field of view
        mat4.multiply(mvpMatrix, projMatrix, viewMatrix);
        const clipPos = vec3.create();
        vec3.transformMat4(clipPos, worldPos, mvpMatrix);
        
        // Normalize to NDC
        const w = clipPos[2];
        if (w > 0) {
          const ndcX = clipPos[0] / w;
          const ndcY = clipPos[1] / w;
          
          // Check if within viewport (-1 to 1 range with some margin)
          const margin = 0.2;
          if (Math.abs(ndcX) <= 1 + margin && Math.abs(ndcY) <= 1 + margin) {
            // Map vertex index to item index considering rotation offset
            const itemIndex = this.useTemporalCycling 
              ? (i - this.rotationOffset + this.items.length) % this.items.length
              : i % this.items.length;
            
            if (!visibleIndices.includes(itemIndex)) {
              visibleIndices.push(itemIndex);
            }
          }
        }
      }
    }
    
    // If no items are visible (shouldn't happen), return first few items
    if (visibleIndices.length === 0) {
      return Array.from({ length: Math.min(10, this.items.length) }, (_, i) => i);
    }
    
    return visibleIndices;
  }
}

const defaultItems: MenuItem[] = [
  {
    image: "https://picsum.photos/900/900?grayscale",
    link: "https://google.com/",
    title: "",
    description: "",
  },
];

interface InfiniteMenuProps {
  items?: MenuItem[];
  onActiveIndexChange?: (index: number) => void;
}

const InfiniteMenu = ({ items = [], onActiveIndexChange }: InfiniteMenuProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuInstanceRef = useRef<InfiniteGridMenu | null>(null);
  const itemsRef = useRef(items);
  const [activeItem, setActiveItem] = useState(items.length > 0 ? items[0] : null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  
  // Keep itemsRef current
  itemsRef.current = items;

  // Initialize menu instance only once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleActiveItem = (index: number) => {
      const currentItems = itemsRef.current;
      if (currentItems.length > 0) {
        const itemIndex = index % currentItems.length;
        setActiveItem(currentItems[itemIndex]);
        onActiveIndexChange?.(itemIndex);
      }
    };

    // Create instance only if it doesn't exist
    if (!menuInstanceRef.current) {
      const menuInstance = new InfiniteGridMenu(
        canvas,
        itemsRef.current.length ? itemsRef.current : defaultItems,
        handleActiveItem,
        setIsMoving,
        (sk) => sk.run()
      );
      
      menuInstanceRef.current = menuInstance;

      const handleResize = () => {
        menuInstance.resize();
      };

      window.addEventListener("resize", handleResize);
      handleResize();

      return () => {
        window.removeEventListener("resize", handleResize);
        // Dispose WebGL resources on cleanup
        menuInstance.dispose();
        menuInstanceRef.current = null;
      };
    }
  }, [onActiveIndexChange]); // Add onActiveIndexChange to dependencies

  // Update items when they change
  useEffect(() => {
    if (menuInstanceRef.current && items.length > 0) {
      menuInstanceRef.current.updateItems(items);
      // Update active item to first item of new set
      setActiveItem(items[0]);
    }
  }, [items]);

  const handleButtonClick = () => {
    if (!activeItem?.link) return;
    if (activeItem.link.startsWith("http")) {
      window.open(activeItem.link, "_blank");
    } else {
      console.log("Internal route:", activeItem.link);
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        id="infinite-grid-menu-canvas"
        ref={canvasRef}
        className="cursor-grab w-full h-full overflow-hidden relative outline-none active:cursor-grabbing"
      />

      {activeItem && (
        <>
          <h2
            className={`
              select-none
              absolute
              font-black
              text-4xl
              md:text-5xl
              lg:text-6xl
              left-8
              top-8
              transition-all
              ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
              ${
                isMoving
                  ? "opacity-0 pointer-events-none duration-[100ms]"
                  : "opacity-100 pointer-events-auto duration-[500ms]"
              }
            `}
          >
            {activeItem.title}
          </h2>

          <p
            className={`
              select-none
              absolute
              max-w-md
              text-lg
              md:text-xl
              text-gray-300
              left-8
              top-24
              md:top-28
              lg:top-32
              transition-all
              ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
              ${
                isMoving
                  ? "opacity-0 pointer-events-none duration-[100ms]"
                  : "opacity-100 pointer-events-auto duration-[500ms]"
              }
            `}
          >
            {activeItem.description}
          </p>

          <div
            onClick={handleButtonClick}
            className={`
              absolute
              left-1/2
              z-10
              w-[60px]
              h-[60px]
              grid
              place-items-center
              bg-[#00ffff]
              border-[5px]
              border-black
              rounded-full
              cursor-pointer
              transition-all
              ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
              ${
                isMoving
                  ? "bottom-[-80px] opacity-0 pointer-events-none duration-[100ms] scale-0 -translate-x-1/2"
                  : "bottom-[3.8em] opacity-100 pointer-events-auto duration-[500ms] scale-100 -translate-x-1/2"
              }
            `}
          >
            <p className="select-none relative text-[#060010] top-[2px] text-[26px]">
              &#x2197;
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default InfiniteMenu;