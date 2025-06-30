export const vertexShaderSource = `#version 300 es
precision highp float;

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

void main() {
  vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.0);
  
  // Get sphere center for this instance
  vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float radius = length(centerPos);
  
  // Apply motion blur effect
  if (gl_VertexID > 0) {
    vec3 rotationAxis = uRotationAxisVelocity.xyz;
    float rotationVelocity = min(0.15, uRotationAxisVelocity.w * 15.0);
    vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
    vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
    float strength = dot(stretchDir, relativeVertexPos);
    float invAbsStrength = min(0.0, abs(strength) - 1.0);
    strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.0);
    worldPosition.xyz += stretchDir * strength;
  }
  
  // Keep on sphere surface
  worldPosition.xyz = radius * normalize(worldPosition.xyz);
  
  // Transform to clip space
  gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
  
  // Calculate alpha based on z position (fade items at back)
  float normalizedZ = normalize(worldPosition.xyz).z;
  vAlpha = smoothstep(0.5, 1.0, normalizedZ) * 0.9 + 0.1;
  
  vUvs = aModelUvs;
  vInstanceId = gl_InstanceID;
}`;

export const fragmentShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;
uniform int uRotationOffset;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

out vec4 outColor;

void main() {
  // Calculate which item to display based on instance ID and rotation offset
  int itemIndex = (vInstanceId + uRotationOffset) % uItemCount;
  
  // Calculate atlas cell coordinates
  int cellsPerRow = uAtlasSize;
  int cellX = itemIndex % cellsPerRow;
  int cellY = itemIndex / cellsPerRow;
  
  vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
  vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;
  
  // Apply aspect ratio correction
  ivec2 texSize = textureSize(uTex, 0);
  float imageAspect = float(texSize.x) / float(texSize.y);
  float containerAspect = 1.0;
  float scale = max(imageAspect / containerAspect, containerAspect / imageAspect);
  
  // Transform UVs
  vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
  st = (st - 0.5) * scale + 0.5;
  st = clamp(st, 0.0, 1.0);
  st = st * cellSize + cellOffset;
  
  // Sample texture
  vec4 color = texture(uTex, st);
  
  // Apply alpha
  outColor = vec4(color.rgb, color.a * vAlpha);
}`;

// Alternative shaders for texture transitions
export const transitionVertexShaderSource = vertexShaderSource;

export const transitionFragmentShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform sampler2D uTexNext;
uniform float uTextureBlend;
uniform int uItemCount;
uniform int uAtlasSize;
uniform int uRotationOffset;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

out vec4 outColor;

void main() {
  // Calculate which item to display
  int itemIndex = (vInstanceId + uRotationOffset) % uItemCount;
  
  // Calculate atlas cell coordinates
  int cellsPerRow = uAtlasSize;
  int cellX = itemIndex % cellsPerRow;
  int cellY = itemIndex / cellsPerRow;
  
  vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
  vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;
  
  // Transform UVs
  vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
  st = clamp(st, 0.0, 1.0);
  st = st * cellSize + cellOffset;
  
  // Sample both textures
  vec4 currentColor = texture(uTex, st);
  vec4 nextColor = texture(uTexNext, st);
  
  // Blend between textures
  vec4 color = mix(currentColor, nextColor, uTextureBlend);
  
  // Apply alpha
  outColor = vec4(color.rgb, color.a * vAlpha);
}`;