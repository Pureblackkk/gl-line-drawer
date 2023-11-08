export class GLUtils {
    static gl;

    static setGLContext(gl) {
        GLUtils.gl = gl;
    }

    static createShader(type, source) {
        const shader = GLUtils.gl.createShader(type);
        GLUtils.gl.shaderSource(shader, source);
        return shader;
    }

    static createArrayBuffer(data) {
        const buffer = GLUtils.gl.createBuffer();
        GLUtils.gl.bindBuffer(GLUtils.gl.ARRAY_BUFFER, buffer);
        GLUtils.gl.bufferData(GLUtils.gl.ARRAY_BUFFER, data, GLUtils.gl.STATIC_DRAW);
        return buffer;
    }

    static createArrayElementBuffer(data) {
        const buffer = GLUtils.gl.createBuffer();
        GLUtils.gl.bindBuffer(GLUtils.gl.ELEMENT_ARRAY_BUFFER, buffer);
        GLUtils.gl.bufferData(GLUtils.gl.ELEMENT_ARRAY_BUFFER, data, GLUtils.gl.STATIC_DRAW);
        return buffer;
    }
}