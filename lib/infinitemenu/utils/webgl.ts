export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('Failed to create shader');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    const error = gl.getShaderInfoLog(shader);
    console.error('Shader compilation failed:', error);
    console.error('Shader type:', type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT');
    console.error('Shader source:', source);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  shaderSources: [string, string],
  transformFeedbackVaryings?: string[] | null,
  attribLocations?: Record<string, number>
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) {
    console.error('Failed to create program');
    return null;
  }

  // Create and attach shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, shaderSources[0]);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shaderSources[1]);

  if (!vertexShader || !fragmentShader) {
    gl.deleteProgram(program);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // Set transform feedback varyings if provided
  if (transformFeedbackVaryings) {
    gl.transformFeedbackVaryings(
      program,
      transformFeedbackVaryings,
      gl.SEPARATE_ATTRIBS
    );
  }

  // Bind attribute locations if provided
  if (attribLocations) {
    for (const [name, location] of Object.entries(attribLocations)) {
      gl.bindAttribLocation(program, location, name);
    }
  }

  // Link program
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    const error = gl.getProgramInfoLog(program);
    console.error('Program linking failed:', error);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  // Clean up shaders (they're still attached to the program)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

export function checkWebGLError(gl: WebGL2RenderingContext, operation: string): void {
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    let errorString = 'Unknown error';
    switch (error) {
      case gl.INVALID_ENUM:
        errorString = 'INVALID_ENUM';
        break;
      case gl.INVALID_VALUE:
        errorString = 'INVALID_VALUE';
        break;
      case gl.INVALID_OPERATION:
        errorString = 'INVALID_OPERATION';
        break;
      case gl.INVALID_FRAMEBUFFER_OPERATION:
        errorString = 'INVALID_FRAMEBUFFER_OPERATION';
        break;
      case gl.OUT_OF_MEMORY:
        errorString = 'OUT_OF_MEMORY';
        break;
      case gl.CONTEXT_LOST_WEBGL:
        errorString = 'CONTEXT_LOST_WEBGL';
        break;
    }
    console.error(`WebGL error during ${operation}: ${errorString} (${error})`);
  }
}

export function getMaxTextureSize(gl: WebGL2RenderingContext): number {
  return gl.getParameter(gl.MAX_TEXTURE_SIZE);
}

export function getMaxTextureUnits(gl: WebGL2RenderingContext): number {
  return gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
}

export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const supported = gl !== null;
    
    if (gl) {
      // Properly clean up
      const loseContext = gl.getExtension('WEBGL_lose_context');
      loseContext?.loseContext();
    }
    
    return supported;
  } catch {
    return false;
  }
}

export function getWebGLInfo(gl: WebGL2RenderingContext): {
  vendor: string;
  renderer: string;
  version: string;
  shadingLanguageVersion: string;
  maxTextureSize: number;
  maxVertexAttributes: number;
  maxTextureUnits: number;
  maxViewportDims: Int32Array;
} {
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  
  return {
    vendor: debugInfo 
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) 
      : gl.getParameter(gl.VENDOR),
    renderer: debugInfo 
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) 
      : gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
  };
}