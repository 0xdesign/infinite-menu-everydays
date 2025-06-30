import { Geometry } from './Geometry';

export class DiscGeometry extends Geometry {
  constructor(segments = 32, radius = 1) {
    super();
    
    const safeSegments = Math.max(3, segments);
    const angleStep = (2 * Math.PI) / safeSegments;

    // Center vertex
    this.addVertex(0, 0, 0);
    const center = this.lastVertex;
    center.uv[0] = 0.5;
    center.uv[1] = 0.5;
    center.normal[2] = 1; // Normal pointing forward

    // Create vertices around the edge
    for (let i = 0; i < safeSegments; i++) {
      const angle = angleStep * i;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      this.addVertex(x, y, 0);
      const vertex = this.lastVertex;
      
      // UV coordinates
      vertex.uv[0] = (x / radius) * 0.5 + 0.5;
      vertex.uv[1] = (y / radius) * 0.5 + 0.5;
      
      // Normal
      vertex.normal[2] = 1;
    }

    // Create triangular faces
    for (let i = 0; i < safeSegments; i++) {
      const next = (i + 1) % safeSegments;
      this.addFace(0, i + 1, next + 1);
    }
  }
}