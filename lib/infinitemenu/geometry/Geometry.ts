import { vec2, vec3 } from 'gl-matrix';

export class Face {
  constructor(
    public a: number,
    public b: number,
    public c: number
  ) {}
}

export class Vertex {
  public position: vec3;
  public normal: vec3;
  public uv: vec2;

  constructor(x: number, y: number, z: number) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }
}

export abstract class Geometry {
  public vertices: Vertex[] = [];
  public faces: Face[] = [];

  addVertex(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.vertices.push(new Vertex(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  addFace(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.faces.push(new Face(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  get lastVertex(): Vertex {
    return this.vertices[this.vertices.length - 1];
  }

  computeNormals(): this {
    // Reset normals
    for (const vertex of this.vertices) {
      vec3.set(vertex.normal, 0, 0, 0);
    }

    // Calculate face normals and add to vertices
    for (const face of this.faces) {
      const v0 = this.vertices[face.a].position;
      const v1 = this.vertices[face.b].position;
      const v2 = this.vertices[face.c].position;

      const edge1 = vec3.subtract(vec3.create(), v1, v0);
      const edge2 = vec3.subtract(vec3.create(), v2, v0);
      const faceNormal = vec3.cross(vec3.create(), edge1, edge2);
      vec3.normalize(faceNormal, faceNormal);

      // Add face normal to each vertex
      vec3.add(this.vertices[face.a].normal, this.vertices[face.a].normal, faceNormal);
      vec3.add(this.vertices[face.b].normal, this.vertices[face.b].normal, faceNormal);
      vec3.add(this.vertices[face.c].normal, this.vertices[face.c].normal, faceNormal);
    }

    // Normalize vertex normals
    for (const vertex of this.vertices) {
      vec3.normalize(vertex.normal, vertex.normal);
    }

    return this;
  }

  subdivide(divisions = 1): this {
    const midPointCache: Record<string, number> = {};
    let faces = this.faces;

    for (let div = 0; div < divisions; div++) {
      const newFaces: Face[] = [];

      for (const face of faces) {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache);
        const mBC = this.getMidPoint(face.b, face.c, midPointCache);
        const mCA = this.getMidPoint(face.c, face.a, midPointCache);

        newFaces.push(
          new Face(face.a, mAB, mCA),
          new Face(face.b, mBC, mAB),
          new Face(face.c, mCA, mBC),
          new Face(mAB, mBC, mCA)
        );
      }

      faces = newFaces;
    }

    this.faces = faces;
    return this;
  }

  spherize(radius = 1): this {
    for (const vertex of this.vertices) {
      vec3.normalize(vertex.position, vertex.position);
      vec3.scale(vertex.position, vertex.position, radius);
      vec3.copy(vertex.normal, vertex.position);
      vec3.normalize(vertex.normal, vertex.normal);
    }
    return this;
  }

  private getMidPoint(
    ndxA: number,
    ndxB: number,
    cache: Record<string, number>
  ): number {
    const cacheKey = ndxA < ndxB ? `${ndxA}_${ndxB}` : `${ndxB}_${ndxA}`;
    
    if (cacheKey in cache) {
      return cache[cacheKey];
    }

    const a = this.vertices[ndxA].position;
    const b = this.vertices[ndxB].position;
    const mid = vec3.create();
    vec3.add(mid, a, b);
    vec3.scale(mid, mid, 0.5);

    const ndx = this.vertices.length;
    this.vertices.push(new Vertex(mid[0], mid[1], mid[2]));
    
    cache[cacheKey] = ndx;
    return ndx;
  }

  get data(): {
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

  get vertexData(): Float32Array {
    const data = new Float32Array(this.vertices.length * 3);
    for (let i = 0; i < this.vertices.length; i++) {
      data.set(this.vertices[i].position, i * 3);
    }
    return data;
  }

  get normalData(): Float32Array {
    const data = new Float32Array(this.vertices.length * 3);
    for (let i = 0; i < this.vertices.length; i++) {
      data.set(this.vertices[i].normal, i * 3);
    }
    return data;
  }

  get uvData(): Float32Array {
    const data = new Float32Array(this.vertices.length * 2);
    for (let i = 0; i < this.vertices.length; i++) {
      data.set(this.vertices[i].uv, i * 2);
    }
    return data;
  }

  get indexData(): Uint16Array {
    const data = new Uint16Array(this.faces.length * 3);
    for (let i = 0; i < this.faces.length; i++) {
      data[i * 3] = this.faces[i].a;
      data[i * 3 + 1] = this.faces[i].b;
      data[i * 3 + 2] = this.faces[i].c;
    }
    return data;
  }
}