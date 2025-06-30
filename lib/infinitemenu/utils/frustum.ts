import { vec3, mat4 } from 'gl-matrix';

export interface Plane {
  normal: vec3;
  distance: number;
}

export interface Frustum {
  planes: Plane[];
}

/**
 * Extract frustum planes from view-projection matrix
 */
export function extractFrustumPlanes(viewProjectionMatrix: mat4): Frustum {
  const m = viewProjectionMatrix;
  const planes: Plane[] = [];

  // Left plane
  planes.push({
    normal: vec3.fromValues(m[3] + m[0], m[7] + m[4], m[11] + m[8]),
    distance: m[15] + m[12]
  });

  // Right plane
  planes.push({
    normal: vec3.fromValues(m[3] - m[0], m[7] - m[4], m[11] - m[8]),
    distance: m[15] - m[12]
  });

  // Bottom plane
  planes.push({
    normal: vec3.fromValues(m[3] + m[1], m[7] + m[5], m[11] + m[9]),
    distance: m[15] + m[13]
  });

  // Top plane
  planes.push({
    normal: vec3.fromValues(m[3] - m[1], m[7] - m[5], m[11] - m[9]),
    distance: m[15] - m[13]
  });

  // Near plane
  planes.push({
    normal: vec3.fromValues(m[3] + m[2], m[7] + m[6], m[11] + m[10]),
    distance: m[15] + m[14]
  });

  // Far plane
  planes.push({
    normal: vec3.fromValues(m[3] - m[2], m[7] - m[6], m[11] - m[10]),
    distance: m[15] - m[14]
  });

  // Normalize planes
  for (const plane of planes) {
    const length = vec3.length(plane.normal);
    if (length > 0) {
      vec3.scale(plane.normal, plane.normal, 1 / length);
      plane.distance /= length;
    }
  }

  return { planes };
}

/**
 * Test if a point is inside the frustum
 */
export function isPointInFrustum(point: vec3, frustum: Frustum): boolean {
  for (const plane of frustum.planes) {
    const distance = vec3.dot(plane.normal, point) + plane.distance;
    if (distance < 0) {
      return false;
    }
  }
  return true;
}

/**
 * Test if a sphere is inside or intersects the frustum
 */
export function isSphereInFrustum(center: vec3, radius: number, frustum: Frustum): boolean {
  for (const plane of frustum.planes) {
    const distance = vec3.dot(plane.normal, center) + plane.distance;
    if (distance < -radius) {
      return false;
    }
  }
  return true;
}

/**
 * Get visible item indices from instance positions
 */
export function getVisibleItemIndices(
  instancePositions: vec3[],
  worldMatrix: mat4,
  viewMatrix: mat4,
  projectionMatrix: mat4,
  useTemporalCycling: boolean,
  rotationOffset: number,
  totalItems: number
): number[] {
  const visibleIndices: number[] = [];
  
  // Calculate view-projection matrix
  const viewProjectionMatrix = mat4.create();
  mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
  
  // Extract frustum planes
  const frustum = extractFrustumPlanes(viewProjectionMatrix);
  
  // Test each instance position
  for (let i = 0; i < instancePositions.length; i++) {
    // Transform instance position to world space
    const worldPos = vec3.create();
    vec3.transformMat4(worldPos, instancePositions[i], worldMatrix);
    
    // Check if in frustum with some margin for disc size
    const discRadius = 0.8; // Approximate disc radius in world space
    if (isSphereInFrustum(worldPos, discRadius, frustum)) {
      // Calculate actual item index
      let itemIndex = i;
      
      if (useTemporalCycling) {
        itemIndex = (i + rotationOffset) % totalItems;
        if (itemIndex < 0) itemIndex += totalItems;
      } else {
        itemIndex = i % totalItems;
      }
      
      if (!visibleIndices.includes(itemIndex)) {
        visibleIndices.push(itemIndex);
      }
    }
  }
  
  // If no items are visible (shouldn't happen), return first few items
  if (visibleIndices.length === 0) {
    const fallbackCount = Math.min(10, totalItems);
    for (let i = 0; i < fallbackCount; i++) {
      visibleIndices.push(i);
    }
  }
  
  return visibleIndices;
}

/**
 * Sort indices by distance from camera (for priority loading)
 */
export function sortIndicesByDistance(
  indices: number[],
  instancePositions: vec3[],
  worldMatrix: mat4,
  cameraPosition: vec3
): number[] {
  const distances = new Map<number, number>();
  
  for (const index of indices) {
    if (index < instancePositions.length) {
      const worldPos = vec3.create();
      vec3.transformMat4(worldPos, instancePositions[index], worldMatrix);
      const distance = vec3.distance(cameraPosition, worldPos);
      distances.set(index, distance);
    }
  }
  
  return indices.sort((a, b) => {
    const distA = distances.get(a) ?? Infinity;
    const distB = distances.get(b) ?? Infinity;
    return distA - distB;
  });
}