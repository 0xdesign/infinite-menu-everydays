import '@testing-library/jest-dom'

// Mock WebGL context for testing
class MockWebGL2RenderingContext {
  createShader() { return {} }
  shaderSource() {}
  compileShader() {}
  getShaderParameter() { return true }
  createProgram() { return {} }
  attachShader() {}
  linkProgram() {}
  getProgramParameter() { return true }
  createBuffer() { return {} }
  bindBuffer() {}
  bufferData() {}
  createVertexArray() { return {} }
  bindVertexArray() {}
  enableVertexAttribArray() {}
  vertexAttribPointer() {}
  vertexAttribDivisor() {}
  createTexture() { return {} }
  bindTexture() {}
  texParameteri() {}
  texImage2D() {}
  generateMipmap() {}
  getParameter() { return 4096 } // MAX_TEXTURE_SIZE
  getAttribLocation() { return 0 }
  getUniformLocation() { return {} }
  useProgram() {}
  enable() {}
  clearColor() {}
  clear() {}
  uniformMatrix4fv() {}
  uniform1i() {}
  uniform1f() {}
  uniform3f() {}
  uniform4f() {}
  activeTexture() {}
  drawElementsInstanced() {}
  viewport() {}
  deleteProgram() {}
  deleteVertexArray() {}
  deleteBuffer() {}
  deleteTexture() {}
  deleteShader() {}
  getShaderInfoLog() { return '' }
  getProgramInfoLog() { return '' }
  bufferSubData() {}
  
  // Constants
  VERTEX_SHADER = 35633
  FRAGMENT_SHADER = 35632
  COMPILE_STATUS = 35713
  LINK_STATUS = 35714
  ARRAY_BUFFER = 34962
  ELEMENT_ARRAY_BUFFER = 34963
  STATIC_DRAW = 35044
  DYNAMIC_DRAW = 35048
  FLOAT = 5126
  TRIANGLES = 4
  UNSIGNED_SHORT = 5123
  TEXTURE_2D = 3553
  TEXTURE_WRAP_S = 10242
  TEXTURE_WRAP_T = 10243
  TEXTURE_MIN_FILTER = 10241
  TEXTURE_MAG_FILTER = 10240
  CLAMP_TO_EDGE = 33071
  LINEAR = 9729
  RGBA = 6408
  UNSIGNED_BYTE = 5121
  TEXTURE0 = 33984
  TEXTURE1 = 33985
  CULL_FACE = 2884
  DEPTH_TEST = 2929
  COLOR_BUFFER_BIT = 16384
  DEPTH_BUFFER_BIT = 256
  MAX_TEXTURE_SIZE = 3379
  
  // Properties
  canvas = {
    width: 800,
    height: 600,
    clientWidth: 800,
    clientHeight: 600,
  }
  
  drawingBufferWidth = 800
  drawingBufferHeight = 600
}

// Mock HTMLCanvasElement.getContext to return our mock WebGL2 context
HTMLCanvasElement.prototype.getContext = function(contextType: any, ...args: any[]) {
  if (contextType === 'webgl2') {
    return new MockWebGL2RenderingContext() as unknown as WebGL2RenderingContext
  }
  if (contextType === '2d') {
    return {} as unknown as CanvasRenderingContext2D
  }
  return null
} as any

// Mock window.requestAnimationFrame for tests
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(0), 16) as unknown as number
}

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id)
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}