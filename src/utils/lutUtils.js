// Parse .cube file content
export const parseCubeLUT = (cubeText) => {
    const lines = cubeText.split('\n');
    let size = 33; // Default size
    let data = [];
    let min = [0, 0, 0];
    let max = [1, 1, 1];
    let title = '';

    // Remove comments
    const cleanLines = lines.map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    let dataStartIndex = 0;

    // Parse Header
    for (let i = 0; i < cleanLines.length; i++) {
        const line = cleanLines[i];
        if (line.startsWith('TITLE')) {
            title = line.split('"')[1] || line.split(' ')[1];
        } else if (line.startsWith('LUT_3D_SIZE')) {
            size = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('DOMAIN_MIN')) {
            min = line.split(' ').slice(1).map(parseFloat);
        } else if (line.startsWith('DOMAIN_MAX')) {
            max = line.split(' ').slice(1).map(parseFloat);
        } else if (/^-?\d+(\.\d+)?/.test(line)) {
            dataStartIndex = i;
            break;
        }
    }

    // Parse Data
    for (let i = dataStartIndex; i < cleanLines.length; i++) {
        const parts = cleanLines[i].split(/\s+/).map(parseFloat);
        if (parts.length >= 3) {
            data.push(parts[0], parts[1], parts[2]);
        }
    }

    // Sanity check
    const expected = size * size * size * 3;
    if (data.length !== expected) {
        console.warn(`LUT data length mismatch. Expected ${expected}, got ${data.length}. Filling or truncating.`);
    }

    return { size, data: new Float32Array(data), title, min, max };
};

// Create 3D Texture from parsed data
export const createLUTTexture = (gl, lutData) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, texture);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    if (gl instanceof WebGL2RenderingContext) {
        gl.texImage3D(
            gl.TEXTURE_3D,
            0,
            gl.RGB16F, // Use float texture for precision
            lutData.size,
            lutData.size,
            lutData.size,
            0,
            gl.RGB,
            gl.FLOAT,
            lutData.data
        );
    } else {
        console.error("WebGL2 is required for 3D LUTs");
        return null;
    }

    return texture;
};

// Create basic shader program
export const createFilterProgram = (gl) => {
    const vsSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
    }`;

    const fsSource = `#version 300 es
    precision highp float;
    precision highp sampler3D;

    in vec2 v_texCoord;
    out vec4 outColor;

    uniform sampler2D u_image;
    uniform sampler3D u_lut;
    uniform float u_intensity;
    uniform bool u_useLUT;

    void main() {
        vec4 color = texture(u_image, v_texCoord);
        
        if (u_useLUT) {
            vec3 lutColor = texture(u_lut, color.rgb).rgb;
            outColor = vec4(mix(color.rgb, lutColor, u_intensity), color.a);
        } else {
            outColor = color;
        }
    }`;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(vs));

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(fs));

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    return program;
};

// Helper: Setup a fullscreen quad
export const createQuadValues = (gl) => {
    // 2 triangles covering the screen
    // x, y, u, v
    const positions = new Float32Array([
        -1, -1, 0, 1, // Bottom-Left (Note: V is flipped for video textures typically)
        1, -1, 1, 1, // Bottom-Right
        -1, 1, 0, 0, // Top-Left
        -1, 1, 0, 0, // Top-Left
        1, -1, 1, 1, // Bottom-Right
        1, 1, 1, 0, // Top-Right
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // a_position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0); // 4 floats * 4 bytes = 16 stride

    // a_texCoord
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8); // Offset 8 bytes

    return { vao, count: 6 };
};
