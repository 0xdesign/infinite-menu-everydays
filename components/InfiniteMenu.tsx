import { useRef, useState, useEffect } from "react";
import { mat4, quat, vec2, vec3 } from "gl-matrix";
import { DynamicSpherePositions } from "./DynamicSpherePositions";

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
uniform sampler2D uTex1; // Second atlas
uniform sampler2D uTex2; // Third atlas
uniform sampler2D uHighTex;
uniform int uItemCount;
uniform int uAtlasSize;
uniform float uHighId;
uniform sampler2D uAtlasPositionMap; // Texture containing position mappings
uniform int uMaxItems; // Number of items in mapping

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

void main() {
  int itemIndex = vInstanceId % uItemCount;
  // With dynamic atlases, array index maps directly to position
  int atlasPosition = itemIndex;
  int atlasIndex = atlasPosition / 256; // Which atlas (0, 1, 2)
  int atlasItemIndex = atlasPosition % 256; // Position within that atlas
  
  int cellsPerRow = uAtlasSize;
  int cellX = atlasItemIndex % cellsPerRow;
  int cellY = atlasItemIndex / cellsPerRow;
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

  // Select the correct atlas based on atlasIndex
  vec4 atlasColor;
  if (atlasIndex == 0) {
    atlasColor = texture(uTex, st);
  } else if (atlasIndex == 1) {
    atlasColor = texture(uTex1, st);
  } else if (atlasIndex == 2) {
    atlasColor = texture(uTex2, st);
  } else {
    // Fallback to first atlas
    atlasColor = texture(uTex, st);
  }
  
  // High-res texture overlay
  float itemIndexFloat = float(itemIndex);
  float useHighRes = step(0.5, 1.0 - abs(itemIndexFloat - uHighId)) * step(0.0, uHighId);
  
  vec2 hiResSt = vec2(vUvs.x, 1.0 - vUvs.y);
  vec4 hiResColor = texture(uHighTex, hiResSt);
  
  outColor = mix(atlasColor, hiResColor, useHighRes);
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
  // Start with DPR=1 for faster first paint; caller can bump later when idle
  const dpr = (window as any).__INFINITE_MENU_DPR_OVERRIDE__ ?? Math.min(2, window.devicePixelRatio || 1);
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
  private dynamicPositions: DynamicSpherePositions;
  private worldMatrix = mat4.create();
  private tex: WebGLTexture | null = null;
  private atlases: WebGLTexture[] = [];
  private atlasMapping: AtlasMapping[] = [];
  private atlasPositionMapTexture: WebGLTexture | null = null; // Texture containing position mappings
  private usingFallbackTexture: boolean = false;
  private control!: ArcballControl;
  private animationFrameId: number | null = null;
  
  // High-res texture management
  private hiResTexture: WebGLTexture | null = null;
  private hiResIndex: number = -1;
  private hiResLoading: boolean = false;

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
    uTex1: WebGLUniformLocation | null;
    uTex2: WebGLUniformLocation | null;
    uFrames: WebGLUniformLocation | null;
    uItemCount: WebGLUniformLocation | null;
    uAtlasSize: WebGLUniformLocation | null;
    uHighTex: WebGLUniformLocation | null;
    uHighId: WebGLUniformLocation | null;
    uAtlasPositionMap: WebGLUniformLocation | null;
    uMaxItems: WebGLUniformLocation | null;
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

  private TARGET_FRAME_DURATION = 1000 / 60;
  private SPHERE_RADIUS = 2;
  
  // Constants for maintaining consistent item visual size
  private readonly ITEM_SCALE = 0.25; // Fixed scale for all items
  private readonly ITEM_DIAMETER = 0.5; // 2 * ITEM_SCALE
  
  // Original setup reference (42 items, radius 2.0, camera at 3.0)
  // Calculate the visual angle: how big the item appears in the original setup
  // tan(angle/2) = (item_radius) / (camera_distance_from_item)
  // tan(angle/2) = 0.25 / 1.0 = 0.25
  // angle = 2 * atan(0.25) ≈ 28.07 degrees
  private readonly ORIGINAL_VISUAL_ANGLE = 2 * Math.atan(0.25); // ~0.49 radians

  public camera: Camera = {
    matrix: mat4.create(),
    near: 0.1,
    far: 40,
    fov: Math.PI / 4,
    aspect: 1,
    position: vec3.fromValues(0, 0, 3), // Will be updated based on sphere radius
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
    onInit?: InitCallback,
    private initialFocusId?: number
  ) {
    this.dynamicPositions = new DynamicSpherePositions();
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

    this.animate(this._deltaTime);
    this.render();

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
    
    // Test basic shader compilation
    const testVert = `#version 300 es
    in vec3 position;
    void main() {
      gl_Position = vec4(position, 1.0);
    }`;
    const testFrag = `#version 300 es
    precision highp float;
    out vec4 color;
    void main() {
      color = vec4(1.0, 0.0, 0.0, 1.0);
    }`;
    
    const testVertShader = gl.createShader(gl.VERTEX_SHADER);
    if (testVertShader) {
      gl.shaderSource(testVertShader, testVert);
      gl.compileShader(testVertShader);
      const success = gl.getShaderParameter(testVertShader, gl.COMPILE_STATUS);
      if (!success) {
        console.error("Test vertex shader failed:", gl.getShaderInfoLog(testVertShader));
      } else {
        console.log("Test vertex shader compiled successfully");
      }
      gl.deleteShader(testVertShader);
    }
    
    const testFragShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (testFragShader) {
      gl.shaderSource(testFragShader, testFrag);
      gl.compileShader(testFragShader);
      const success = gl.getShaderParameter(testFragShader, gl.COMPILE_STATUS);
      if (!success) {
        console.error("Test fragment shader failed:", gl.getShaderInfoLog(testFragShader));
      } else {
        console.log("Test fragment shader compiled successfully");
      }
      gl.deleteShader(testFragShader);
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
      uTex1: gl.getUniformLocation(this.discProgram!, "uTex1"),
      uTex2: gl.getUniformLocation(this.discProgram!, "uTex2"),
      uFrames: gl.getUniformLocation(this.discProgram!, "uFrames"),
      uItemCount: gl.getUniformLocation(this.discProgram!, "uItemCount"),
      uAtlasSize: gl.getUniformLocation(this.discProgram!, "uAtlasSize"),
      uHighTex: gl.getUniformLocation(this.discProgram!, "uHighTex"),
      uHighId: gl.getUniformLocation(this.discProgram!, "uHighId"),
      uAtlasPositionMap: gl.getUniformLocation(this.discProgram!, "uAtlasPositionMap"),
      uMaxItems: gl.getUniformLocation(this.discProgram!, "uMaxItems"),
    };

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

    // Use dynamic positions based on item count
    const itemCount = this.items.length || 1;
    this.SPHERE_RADIUS = this.dynamicPositions.calculateOptimalRadius(itemCount);
    this.instancePositions = this.dynamicPositions.generatePositions(itemCount, this.SPHERE_RADIUS);
    this.DISC_INSTANCE_COUNT = this.instancePositions.length;
    
    // Keep legacy geometry for compatibility
    this.icoGeo = new IcosahedronGeometry();
    this.icoGeo.subdivide(1).spherize(this.SPHERE_RADIUS);
    this.initDiscInstances(this.DISC_INSTANCE_COUNT);
    
    // Initialize textures after we have WebGL context
    // Use setTimeout to ensure WebGL context is fully ready
    setTimeout(() => {
      if (this.gl) {
        this.initDynamicAtlases();
      } else {
        console.error('WebGL context not available after timeout');
        this.initTextureFallback();
      }
    }, 0);
    
    this.control = new ArcballControl(this.canvas, (deltaTime) =>
      this.onControlUpdate(deltaTime)
    );

    // Set initial focus if specified
    if (this.initialFocusId !== undefined) {
      this.setInitialFocus(this.initialFocusId);
    }

    // Set initial camera position at constant distance from sphere surface
    // Original: sphere radius 2.0, camera at 3.0 (1.0 unit from surface)
    vec3.set(this.camera.position, 0, 0, this.SPHERE_RADIUS + 1.0);
    
    this.updateCameraMatrix();
    this.updateProjectionMatrix();

    this.resize();
    if (onInit) {
      onInit(this);
    }
  }

  private async initTexture(): Promise<void> {
    if (!this.gl) {
      console.warn('initTexture called but no WebGL context available');
      return;
    }
    const gl = this.gl;
    console.log('Starting texture initialization...');

    console.log('Loading pre-built texture atlases...');
    console.log('Items count:', this.items.length);
    
    // Debug: Show the ID mismatch problem
    console.log('First 5 items in array:', this.items.slice(0, 5).map((item, idx) => ({
      arrayIndex: idx,
      databaseId: item.id,
      title: item.title
    })));
    
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
      console.log('Loading atlas.json...');
      const mappingResponse = await fetch('/atlas.json');
      console.log('Atlas.json response:', mappingResponse.status, mappingResponse.statusText);
      if (!mappingResponse.ok) {
        throw new Error(`Failed to load atlas mapping: ${mappingResponse.status} ${mappingResponse.statusText}`);
      }
      this.atlasMapping = await mappingResponse.json();
      console.log('Atlas mapping loaded, entries:', this.atlasMapping.length);
      
      // Debug: Log first few atlas mappings to understand the structure
      console.log('First 5 atlas mappings:', this.atlasMapping.slice(0, 5));
      console.log('Atlas mapping uses database IDs, not array indices!');
      
      // Determine how many atlases we need
      const atlasCount = Math.ceil(this.items.length / 256);
      console.log('Atlas count needed:', atlasCount);
      
      // Load all atlas textures
      const atlasPromises: Promise<void>[] = [];
      for (let i = 0; i < atlasCount; i++) {
        console.log(`Queuing atlas ${i} for loading...`);
        atlasPromises.push(this.loadAtlas(i));
      }
      
      console.log('Loading all atlases...');
      await Promise.all(atlasPromises);
      console.log('All atlases loaded successfully');
      
      // Use the first atlas as the primary texture for now
      if (this.atlases.length > 0) {
        this.tex = this.atlases[0];
        this.usingFallbackTexture = false;
        console.log('Set this.tex to first atlas texture, cleared fallback flag');
      }
      
      // Set atlas size to 16x16 (256 tiles per atlas)
      this.atlasSize = 16;
      
      // Build the ID-to-position mapping
      this.buildAtlasPositionMap();
      
      console.log(`Loaded ${this.atlases.length} texture atlases`);
    } catch (error) {
      console.error('Failed to load pre-built atlases:', error);
      this.initTextureFallback();
    }
  }
  
  private loadAtlas(index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.gl) {
        reject(new Error('No WebGL context'));
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
        
        this.atlases[index] = texture;
        resolve();
      };
      img.onerror = (e) => {
        console.error(`Failed to load atlas ${index} from ${atlasUrl}:`, e);
        reject(new Error(`Failed to load atlas ${index} from ${atlasUrl}`));
      };
      img.src = atlasUrl;
      console.log(`Starting load of atlas ${index} from ${atlasUrl}`);
    });
  }
  
  private initTextureFallback(): void {
    if (!this.gl) return;
    const gl = this.gl;
    
    console.log('Initializing fallback texture...');
    this.usingFallbackTexture = true;
    
    // Simple fallback - create colored squares
    const itemCount = Math.max(1, this.items.length);
    // For compatibility with pre-built atlases, use 16x16 grid
    // This means we can only show first 256 items in fallback
    this.atlasSize = 16;
    const maxItems = Math.min(itemCount, 256);
    const cellSize = 256;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = this.atlasSize * cellSize;
    canvas.height = this.atlasSize * cellSize;
    
    // Only render up to maxItems in the fallback
    for (let i = 0; i < maxItems; i++) {
      const x = (i % this.atlasSize) * cellSize;
      const y = Math.floor(i / this.atlasSize) * cellSize;
      ctx.fillStyle = `hsl(${(i * 360) / maxItems}, 70%, 50%)`;
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    // Create texture first!
    this.tex = createAndSetupTexture(
      gl,
      gl.LINEAR,
      gl.LINEAR,
      gl.CLAMP_TO_EDGE,
      gl.CLAMP_TO_EDGE
    );

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
    console.log(`Fallback texture atlas created: ${this.atlasSize}x${this.atlasSize} grid, showing ${maxItems} of ${itemCount} items`);
  }
  
  // Build per-filter dynamic atlases in array order so atlasPosition == itemIndex
  private async initDynamicAtlases(): Promise<void> {
    if (!this.gl) return;
    const gl = this.gl;

    // Cleanup any previous atlases/primary texture
    if (this.tex) {
      gl.deleteTexture(this.tex);
      this.tex = null;
    }
    if (this.atlases.length) {
      this.atlases.forEach(t => t && gl.deleteTexture(t));
      this.atlases = [];
    }

    const items = this.items;
    // Use smaller tiles for the first pass; can rebuild at higher res later
    const cellSize = (window as any).__INFINITE_MENU_ATLAS_CELL__ ?? 128;
    const tilesPerRow = 16; // 16x16 grid => 256 items per atlas
    this.atlasSize = tilesPerRow;

    const chunkSize = tilesPerRow * tilesPerRow; // 256
    const chunks: MenuItem[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    // Limit to 3 atlases bound by the shader
    const maxAtlases = 3;
    const buildCount = Math.min(chunks.length, maxAtlases);

    const atlasPromises: Promise<WebGLTexture>[] = [];
    for (let a = 0; a < buildCount; a++) {
      const chunk = chunks[a];
      atlasPromises.push(new Promise<WebGLTexture>(async (resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = tilesPerRow * cellSize;
        canvas.height = tilesPerRow * cellSize;
        const ctx = canvas.getContext('2d')!;

        // Optional background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw thumbnails into the grid in array order
        await Promise.all(chunk.map((item, idx) => new Promise<void>((res) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const x = (idx % tilesPerRow) * cellSize;
              const y = Math.floor(idx / tilesPerRow) * cellSize;

              // cover-like draw to preserve aspect ratio
              const iw = img.naturalWidth, ih = img.naturalHeight;
              const r = Math.max(cellSize / iw, cellSize / ih);
              const dw = Math.round(iw * r);
              const dh = Math.round(ih * r);
              const dx = x + Math.floor((cellSize - dw) / 2);
              const dy = y + Math.floor((cellSize - dh) / 2);
              ctx.drawImage(img, dx, dy, dw, dh);
            } catch {}
            res();
          };
          img.onerror = () => res(); // draw nothing on error
          img.src = item.image; // use thumbnail-sized URL
        })));

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
        resolve(texture);
      }));
    }

    const builtAtlases = await Promise.all(atlasPromises);
    this.atlases = builtAtlases;
    // For compatibility, set tex to first atlas
    this.tex = this.atlases[0] || null;
    this.usingFallbackTexture = false;

    // Cap draw count to available atlas capacity to avoid invalid sampling
    const capacity = this.atlases.length * (tilesPerRow * tilesPerRow);
    if (capacity > 0) {
      this.DISC_INSTANCE_COUNT = Math.min(this.DISC_INSTANCE_COUNT, capacity);
    }
  }

  // Upgrade rendering quality when the browser is idle or after interaction
  public upgradeQualityIfNeeded(): void {
    if (!(window as any).__INFINITE_MENU_QUALITY_BUMPED__) {
      (window as any).__INFINITE_MENU_QUALITY_BUMPED__ = true;
      // Increase DPR for crisper rendering
      (window as any).__INFINITE_MENU_DPR_OVERRIDE__ = Math.min(2, window.devicePixelRatio || 1);
      this.resize();
      // Rebuild atlases at 256px cells
      (window as any).__INFINITE_MENU_ATLAS_CELL__ = 256;
      this.initDynamicAtlases();
    }
  }
  
  private buildAtlasPositionMap(): void {
    if (!this.gl) return;
    const gl = this.gl;
    
    console.log('Building atlas position map texture...');
    
    // Create a texture to store the mapping
    const maxItems = Math.min(this.items.length, 1024);
    const mappingData = new Float32Array(maxItems * 4); // RGBA for each item
    
    // For each item in our array, find its position in the atlas
    this.items.forEach((item, index) => {
      if (index >= maxItems) return;
      
      // Find this item's entry in the atlas mapping
      const atlasEntry = this.atlasMapping.find(entry => entry.id === item.id?.toString());
      
      if (atlasEntry) {
        // Calculate absolute position across all atlases
        const positionInAtlas = (atlasEntry.y / 256) * 16 + (atlasEntry.x / 256);
        const absolutePosition = atlasEntry.atlas * 256 + positionInAtlas;
        
        // Store in texture as normalized value (0-1)
        mappingData[index * 4] = absolutePosition / 1024.0; // R channel
        mappingData[index * 4 + 1] = 0; // G channel (unused)
        mappingData[index * 4 + 2] = 0; // B channel (unused)
        mappingData[index * 4 + 3] = 1; // A channel
        
        if (index < 5) {
          console.log(`Item ${index} (ID ${item.id}): maps to atlas position ${absolutePosition} (atlas ${atlasEntry.atlas}, pos ${positionInAtlas})`);
        }
      } else {
        // Item not in atlas - will use modulo fallback in shader
        // Store invalid position
        mappingData[index * 4] = -1;
        mappingData[index * 4 + 1] = 0;
        mappingData[index * 4 + 2] = 0;
        mappingData[index * 4 + 3] = 1;
      }
    });
    
    // Clean up old texture if exists
    if (this.atlasPositionMapTexture) {
      gl.deleteTexture(this.atlasPositionMapTexture);
    }
    
    // Create texture
    this.atlasPositionMapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.atlasPositionMapTexture);
    
    // Check if floating point textures are supported
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (ext) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F, // Use floating point texture
        maxItems,
        1, // 1D texture (width x 1)
        0,
        gl.RGBA,
        gl.FLOAT,
        mappingData
      );
    } else {
      // Fallback: Convert to 8-bit texture
      const byteData = new Uint8Array(maxItems * 4);
      for (let i = 0; i < maxItems; i++) {
        const position = mappingData[i * 4] * 1024.0;
        if (position >= 0) {
          byteData[i * 4] = Math.floor(position / 256); // High byte
          byteData[i * 4 + 1] = position % 256; // Low byte
        } else {
          byteData[i * 4] = 255; // Invalid marker
          byteData[i * 4 + 1] = 255;
        }
        byteData[i * 4 + 2] = 0;
        byteData[i * 4 + 3] = 255;
      }
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        maxItems,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        byteData
      );
    }
    
    // Set texture parameters - no filtering needed for data texture
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    console.log(`Atlas position map texture created for ${maxItems} items`);
  }
  
  private async loadHighResTexture(index: number): Promise<void> {
    if (!this.gl || this.hiResIndex === index || this.hiResLoading) return;
    
    const item = this.items[index];
    if (!item?.imageHighRes) return;
    
    this.hiResLoading = true;
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
      
      // Clean up old texture if exists
      if (this.hiResTexture) {
        gl.deleteTexture(this.hiResTexture);
      }
      
      // Create and setup new texture
      this.hiResTexture = createAndSetupTexture(
        gl,
        gl.LINEAR,
        gl.LINEAR,
        gl.CLAMP_TO_EDGE,
        gl.CLAMP_TO_EDGE
      );
      
      gl.bindTexture(gl.TEXTURE_2D, this.hiResTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        img
      );
      
      this.hiResIndex = index;
      console.log(`Loaded high-res texture for item ${index}`);
    } catch (error) {
      console.error('Failed to load high-res texture:', error);
    } finally {
      this.hiResLoading = false;
    }
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
    
    // Skip rendering if we're using fallback but atlases are available
    if (this.usingFallbackTexture && this.atlases.length > 0) {
      console.log('Skipping render - switching from fallback to atlas textures');
      this.tex = this.atlases[0];
      this.usingFallbackTexture = false;
    }

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

    gl.uniform1i(this.discLocations.uItemCount, this.DISC_INSTANCE_COUNT);
    gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);

    gl.uniform1f(this.discLocations.uFrames, this._frames);
    gl.uniform1f(this.discLocations.uScaleFactor, this.scaleFactor);
    
    // Set the atlas position mapping texture
    if (this.atlasPositionMapTexture && this.discLocations.uAtlasPositionMap) {
      gl.uniform1i(this.discLocations.uAtlasPositionMap, 4);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.atlasPositionMapTexture);
      gl.uniform1i(this.discLocations.uMaxItems, Math.min(this.items.length, 1024));
    }

    // Bind all available atlases
    const atlas0 = (this.atlases.length > 0 && !this.usingFallbackTexture) 
      ? this.atlases[0] 
      : this.tex;
    
    gl.uniform1i(this.discLocations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlas0);
    
    // Bind second atlas if available
    if (this.atlases.length > 1) {
      gl.uniform1i(this.discLocations.uTex1, 2);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.atlases[1]);
    } else {
      // Bind fallback
      gl.uniform1i(this.discLocations.uTex1, 2);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, atlas0);
    }
    
    // Bind third atlas if available
    if (this.atlases.length > 2) {
      gl.uniform1i(this.discLocations.uTex2, 3);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.atlases[2]);
    } else {
      // Bind fallback
      gl.uniform1i(this.discLocations.uTex2, 3);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, atlas0);
    }
    
    // Bind high-res texture if available
    gl.uniform1i(this.discLocations.uHighTex, 1);
    gl.activeTexture(gl.TEXTURE1);
    if (this.hiResTexture && this.hiResIndex >= 0) {
      gl.bindTexture(gl.TEXTURE_2D, this.hiResTexture);
      gl.uniform1f(this.discLocations.uHighId, this.hiResIndex);
    } else {
      // Bind dummy texture to avoid shader errors
      gl.bindTexture(gl.TEXTURE_2D, atlas0);
      gl.uniform1f(this.discLocations.uHighId, -1);
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
    // Use fixed height from original sphere to maintain consistent FOV
    const height = 2.0 * 0.35; // Always use original sphere's height
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
    let cameraTargetZ: number;

    const isMoving =
      this.control.isPointerDown ||
      Math.abs(this.smoothRotationVelocity) > 0.01;

    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
    }

    if (!this.control.isPointerDown) {
      const nearestVertexIndex = this.findNearestVertexIndex();
      // Use modulo to match shader behavior
      const itemIndex = nearestVertexIndex % this.items.length;
      
      // Debug: Log what's happening during snap
      const item = this.items[itemIndex];
      
      // Find what the atlas.json says about this item
      this.atlasMapping?.find(entry => entry.id === item?.id?.toString());
      
      // Simple diagnostic - only log key info
      console.log(`🎯 Snap: vertex[${nearestVertexIndex}] → item[${itemIndex}] "${item?.title || 'unknown'}" (${this.items.length} items, ${this.DISC_INSTANCE_COUNT} vertices)`);
      
      this.onActiveItemChange(itemIndex);
      // Load high-res texture for the active item
      this.loadHighResTexture(itemIndex);
      
      const snapDirection = vec3.normalize(
        vec3.create(),
        this.getVertexWorldPosition(nearestVertexIndex)
      );
      this.control.snapTargetDirection = snapDirection;
      
      // When snapped: maintain constant distance from sphere surface
      // Original: sphere radius 2.0, camera at 3.0 (1.0 unit from surface)
      cameraTargetZ = this.SPHERE_RADIUS + 1.0;
    } else {
      // When dragging: use proportional distance based on sphere radius
      // Original: radius 2.0, camera starts at 6.0 (3x) and goes up to ~86 (43x)
      const minMultiplier = 3.0;  // Start at 3x radius for good sphere visibility
      const maxMultiplier = 43.0; // Maximum zoom out at 43x radius
      const velocityRange = maxMultiplier - minMultiplier;
      const velocityMultiplier = this.control.rotationVelocity * velocityRange;
      cameraTargetZ = this.SPHERE_RADIUS * (minMultiplier + velocityMultiplier);
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

  private setInitialFocus(focusId: number): void {
    // Find the item with matching ID
    const itemIndex = this.items.findIndex(item => item.id === focusId);
    if (itemIndex === -1) {
      console.log(`Initial focus item ${focusId} not found`);
      return;
    }
    
    // Get the vertex position for this item
    const vertexIndex = itemIndex % this.instancePositions.length;
    const targetPos = this.instancePositions[vertexIndex];
    
    // Normalize the target position
    const targetNormalized = vec3.normalize(vec3.create(), targetPos);
    
    // The front direction we want to align to (positive Z)
    const frontDirection = vec3.fromValues(0, 0, 1);
    
    // Calculate rotation axis (cross product)
    const axis = vec3.cross(vec3.create(), targetNormalized, frontDirection);
    const axisLength = vec3.length(axis);
    
    // Calculate angle between vectors
    const dotProduct = vec3.dot(targetNormalized, frontDirection);
    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
    
    // Only rotate if there's a meaningful angle
    if (axisLength > 0.001 && angle > 0.001) {
      vec3.normalize(axis, axis);
      // Rotate in the opposite direction to bring target to front
      quat.setAxisAngle(this.control.orientation, axis, -angle);
      console.log(`Set initial focus to item ${itemIndex} (ID: ${focusId}) with rotation ${angle} radians`);
    } else {
      console.log(`Item ${itemIndex} (ID: ${focusId}) is already at front`);
    }
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
    if (this.hiResTexture) {
      gl.deleteTexture(this.hiResTexture);
    }
    if (this.atlasPositionMapTexture) {
      gl.deleteTexture(this.atlasPositionMapTexture);
    }
    
    this.gl = null;
  }

  public updateItems(newItems: MenuItem[]): void {
    this.items = newItems;
    // Reset hi-res state to avoid overlay mismatch after filtering
    this.hiResIndex = -1;
    if (this.hiResTexture && this.gl) {
      this.gl.deleteTexture(this.hiResTexture);
      this.hiResTexture = null;
    }
    
    // Always update vertex count to match item count
    const newCount = newItems.length || 1;
    const oldCount = this.DISC_INSTANCE_COUNT;
    
    // Calculate new sphere radius based on item count
    const newRadius = this.dynamicPositions.calculateOptimalRadius(newCount);
    this.SPHERE_RADIUS = newRadius;
    
    // Generate new positions for the exact number of items
    this.instancePositions = this.dynamicPositions.generatePositions(newCount, newRadius);
    this.DISC_INSTANCE_COUNT = newCount;
    
    // Log only when count changes
    if (oldCount !== newCount) {
      console.log(`🔄 Geometry updated: ${oldCount} → ${newCount} instances`);
    }
    
    // Update camera position at constant distance from sphere surface
    vec3.set(this.camera.position, 0, 0, newRadius + 1.0);
    this.updateCameraMatrix();
    
    // Reinitialize instance buffer
    this.initDiscInstances(this.DISC_INSTANCE_COUNT);
    
    // Dispose old textures
    if (this.gl) {
      for (const atlas of this.atlases) {
        this.gl.deleteTexture(atlas);
      }
      this.atlases = [];
      
      if (this.tex) {
        this.gl.deleteTexture(this.tex);
        this.tex = null;
      }
    }
    
    // Reinitialize with new items using dynamic atlases that match current order
    this.initDynamicAtlases();
    
    // Rebuild mapping if we already have atlas data
    // Mapping not needed for dynamic atlases

    // Optionally eager-load hi-res for current front-most item to avoid initial pop-in
    const nearest = this.findNearestVertexIndex();
    const itemIndex = nearest % this.items.length;
    this.loadHighResTexture(itemIndex);
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
  initialFocusId?: number;
}

const InfiniteMenu = ({ items = [], initialFocusId }: InfiniteMenuProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuInstanceRef = useRef<InfiniteGridMenu | null>(null);
  const [activeItem, setActiveItem] = useState(items.length > 0 ? items[0] : null);
  const [isMoving, setIsMoving] = useState<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) {
      if (menuInstanceRef.current) {
        menuInstanceRef.current.dispose();
        menuInstanceRef.current = null;
      }
      return;
    };

    const handleActiveItem = (index: number) => {
      const itemIndex = index % items.length;
      setActiveItem(items[itemIndex]);
    };
    
    // Dispose previous instance if it exists
    if (menuInstanceRef.current) {
      menuInstanceRef.current.dispose();
    }

    // Create new instance
    const menuInstance = new InfiniteGridMenu(
      canvas,
      items.length ? items : defaultItems,
      handleActiveItem,
      setIsMoving,
      (sk) => sk.run(),
      initialFocusId
    );
    
    menuInstanceRef.current = menuInstance;

    const handleResize = () => {
      menuInstance.resize();
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Schedule a quality bump when the browser is idle or after first interaction
    const scheduleBump = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => menuInstance.upgradeQualityIfNeeded(), { timeout: 1500 });
      } else {
        setTimeout(() => menuInstance.upgradeQualityIfNeeded(), 1500);
      }
    };
    scheduleBump();

    const onFirstPointer = () => {
      menuInstance.upgradeQualityIfNeeded();
      window.removeEventListener('pointerdown', onFirstPointer);
    };
    window.addEventListener('pointerdown', onFirstPointer, { once: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener('pointerdown', onFirstPointer);
      // Dispose WebGL resources on cleanup
      menuInstance.dispose();
      menuInstanceRef.current = null;
    };
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