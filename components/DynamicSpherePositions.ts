import { vec3 } from "gl-matrix";

export class DynamicSpherePositions {
  private readonly BASE_RADIUS = 2.0;
  private readonly ITEM_SCALE = 0.25;
  private readonly GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians
  
  /**
   * Calculate optimal sphere radius based on item count to prevent overlap
   */
  calculateOptimalRadius(itemCount: number): number {
    // For small counts, use original radius
    if (itemCount <= 42) return this.BASE_RADIUS;
    
    // Calculate minimum angular distance needed between items
    // Item diameter in world space
    const itemDiameter = this.ITEM_SCALE * 2;
    
    // Approximate surface area needed per item (with padding)
    // Reduced padding factor to keep sphere more compact
    const areaPerItem = itemDiameter * itemDiameter * 1.8; // 1.8x for tighter but clear spacing
    
    // Total surface area needed
    const totalAreaNeeded = areaPerItem * itemCount;
    
    // Sphere surface area = 4πr²
    // Solve for r: r = sqrt(totalAreaNeeded / 4π)
    const radius = Math.sqrt(totalAreaNeeded / (4 * Math.PI));
    
    return Math.max(this.BASE_RADIUS, radius);
  }
  
  /**
   * Generate exactly N positions well-distributed on a sphere
   */
  generatePositions(itemCount: number, radius: number): vec3[] {
    if (itemCount === 0) return [];
    if (itemCount === 1) {
      // Single item at front of sphere
      return [vec3.fromValues(0, 0, radius)];
    }
    
    // For different item counts, use different strategies
    if (itemCount <= 12) {
      return this.getIcosahedronPositions(itemCount, radius);
    } else if (itemCount <= 42) {
      return this.getSubdividedIcosahedronPositions(itemCount, radius);
    } else {
      return this.getFibonacciSpherePositions(itemCount, radius);
    }
  }
  
  /**
   * Get positions based on icosahedron vertices (up to 12 items)
   */
  private getIcosahedronPositions(count: number, radius: number): vec3[] {
    const t = (1 + Math.sqrt(5)) / 2; // Golden ratio
    const vertices: vec3[] = [
      // 12 vertices of icosahedron
      vec3.fromValues(-1, t, 0),
      vec3.fromValues(1, t, 0),
      vec3.fromValues(-1, -t, 0),
      vec3.fromValues(1, -t, 0),
      vec3.fromValues(0, -1, t),
      vec3.fromValues(0, 1, t),
      vec3.fromValues(0, -1, -t),
      vec3.fromValues(0, 1, -t),
      vec3.fromValues(t, 0, -1),
      vec3.fromValues(t, 0, 1),
      vec3.fromValues(-t, 0, -1),
      vec3.fromValues(-t, 0, 1),
    ];
    
    // Normalize and scale vertices
    const positions: vec3[] = [];
    for (let i = 0; i < Math.min(count, vertices.length); i++) {
      const pos = vec3.create();
      vec3.normalize(pos, vertices[i]);
      vec3.scale(pos, pos, radius);
      positions.push(pos);
    }
    
    return positions;
  }
  
  /**
   * Get positions for subdivided icosahedron pattern (13-42 items)
   */
  private getSubdividedIcosahedronPositions(count: number, radius: number): vec3[] {
    // Use a uniform distribution that mimics subdivided icosahedron
    const positions: vec3[] = [];
    
    // Generate points using a spiral method that gives icosahedron-like distribution
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = 2 * Math.PI * i / 1.618033988749895; // Golden ratio
      
      const x = Math.sin(inclination) * Math.cos(azimuth) * radius;
      const y = Math.cos(inclination) * radius;
      const z = Math.sin(inclination) * Math.sin(azimuth) * radius;
      
      positions.push(vec3.fromValues(x, y, z));
    }
    
    return positions;
  }
  
  /**
   * Generate positions using Fibonacci sphere algorithm for optimal distribution
   */
  private getFibonacciSpherePositions(count: number, radius: number): vec3[] {
    const positions: vec3[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate evenly distributed points on sphere using Fibonacci spiral
      const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // radius of circle at y
      const theta = this.GOLDEN_ANGLE * i; // golden angle increment
      
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      
      // Scale by sphere radius
      positions.push(vec3.fromValues(x * radius, y * radius, z * radius));
    }
    
    return positions;
  }
  
  /**
   * Check if current positions need update based on new item count
   */
  needsUpdate(currentCount: number, newCount: number): boolean {
    return currentCount !== newCount;
  }
}