(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["gl-line-drawer"] = {}));
})(this, (function (exports) { 'use strict';

    class GLUtils {
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

    class PointsManager {
        static vertexShader = `
        attribute vec2 aPosition;
        attribute vec2 aPrevious;
        attribute vec2 aAfter;
        attribute vec4 aCorner;
        uniform float uLineWidth;
        uniform float uMaxMiterLength;
        uniform mat4 uTransformMatrix;
        uniform vec2 uResolution;
        uniform vec3 uColor;
        varying float vIsCap;
        varying vec2 vTest;

        vec2 adjustPoint(vec2 current, vec2 toBeAdjustPoint, vec2 referPoint) {
            if (all(equal(current, toBeAdjustPoint))) {
                toBeAdjustPoint = current + normalize(current - referPoint);
            }
            return toBeAdjustPoint;
        }

        float getMiterLength(vec2 normalLeft, vec2 miter) {
            return uLineWidth / (dot(miter, normalLeft));
        }

        bool isOuterJoint(vec2 miter, vec2 pointer) {
            return aCorner.x * dot(miter, pointer) >= 0.0;
        }


        void main() {
            vec2 adjustedPrevious = adjustPoint(aPosition, aPrevious, aAfter);
            vec2 adjustedAfter = adjustPoint(aPosition, aAfter, aPrevious);

            vec2 ab = normalize(aPosition - adjustedPrevious);
            vec2 bc = normalize(adjustedAfter - aPosition);
            vec2 tangent = normalize(ab + bc);

            vec2 miter = vec2(-tangent.y, tangent.x);
            vec2 normalLeft = vec2(-ab.y, ab.x);
            vec2 normalRight = vec2(-bc.y, bc.x);
            vec2 pointer = normalize(ab - bc);
            float miterLength = getMiterLength(normalLeft, miter);

            float moveDistance = 0.0;
            vec2 moveDirection = vec2(0.0);

            if (miterLength > uMaxMiterLength && isOuterJoint(miter, pointer)) {
                float ratio = (aCorner.y + 1.0) / 2.0;
                moveDirection = sign(dot(miter, pointer)) * (normalLeft * (1.0 - ratio) + normalRight * ratio);
                moveDistance = uLineWidth;
            } else {
                moveDirection = aCorner.x * miter + aCorner.z * ab + aCorner.w * normalLeft;
                moveDistance = miterLength;
            }

            vec4 transformedPosition = uTransformMatrix * vec4(aPosition, 0.0, 1.0);
            vec2 transformedPositionXY = (transformedPosition / transformedPosition.w).xy;

            gl_Position = vec4(transformedPositionXY + moveDirection * moveDistance / uResolution, 0.0, 1.0);
            vIsCap = (abs(aCorner.x) == 0.0 && abs(aCorner.y) == 0.0) ? 1.0 : 0.0;
        }
    `

        static fragmentShader = `
        precision mediump float;
        uniform vec3 uColor;
        uniform vec3 uCapColor;
        uniform sampler2D u_texture;
        varying vec2 vTest;
        varying float vIsCap;

        void main() {
            vec3 color = (1.0 - vIsCap) * uColor + vIsCap * uCapColor;

            vec4 newColor = texture2D(u_texture, vec2(0.5, 0.5));

            gl_FragColor = vec4(color, 1.0);
        }
    `

        constructor(props) {
            const {
                gl,
                points,
                color,
                lineWidth = 1,
                maxMiterLength = lineWidth + 10,
                program,
                resolution,
                capStyle,
                capColor,
                texture,
            } = props;

            this.gl = gl;
            this.program = program;
            this.points = points;
            this.lineWidth = lineWidth;
            this.maxMiterLength = maxMiterLength;
            this.color = color;
            this.drawSize = 0;
            this.resolution = resolution;
            this.capStyle = capStyle;
            this.capColor = capColor;
            this.texture = texture;

            this._initGLData();
        }

        drawLine(transformMatrix) {
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            this._updateTransformMatrix(transformMatrix);
            this.gl.drawArrays(this.gl.TRIANGLES, 0, this.drawSize);
        }

        _initGLData() {
            this._createVertices();
            this._createUniforms();
            this._createTexture();
        }

        /**
         * Create vertices buffer and buffer the data
         * Also create previous point and after point information
         */
        _createVertices() {
            const packedPoints = [];

            this.points?.forEach((point, index) => {
                const previousPoint = index !== 0 ? this.points[index - 1] : point;
                const afterPoint = (index !== this.points.length - 1) ? this.points[index + 1] : point;
                packedPoints.push([point, previousPoint, afterPoint]);
            });

            this._createVerticesArray(packedPoints);
        }
        
        /**
         * Create round line cap 
         */
        _createRoundLineCap(
            startAngle,
            endAngle,
            resolution,
            resolvePack,
            aCornerArray
        ) {
            const delta = (endAngle - startAngle) / resolution;
            let countSize = 0;

            for (let angle = startAngle; angle < endAngle; angle += delta) {
                // Draw sector triangle
                resolvePack();
                resolvePack();
                resolvePack();
                
                const xAxis1 = Math.cos(angle);
                const yAxis1 = Math.sin(angle);

                const xAxis2 = Math.cos(angle + delta);
                const yAxis2 = Math.sin(angle + delta);

                aCornerArray.push([0, 0, 0, 0]);
                aCornerArray.push([0, 0, xAxis1, yAxis1]);
                aCornerArray.push([0, 0, xAxis2, yAxis2]);

                countSize += 3;
            }

            return countSize;
        }

        /**
         * Create square line cap
         */
        _createSquareLineCap(direction, resolvePack, aCornerArray) {
            // Draw up sector triangle
            resolvePack();
            resolvePack();
            resolvePack();

            aCornerArray.push([0, 0, 0, 0]);
            aCornerArray.push([0, 0, 0, 1]);
            aCornerArray.push([0, 0, 1 * direction, 1]);

            // Draw middle sector triangle
            resolvePack();
            resolvePack();
            resolvePack();
            aCornerArray.push([0, 0, 0, 0]);
            aCornerArray.push([0, 0, 1 * direction, 1]);
            aCornerArray.push([0, 0, 1 * direction, -1]);

            // Draw bottom sector triangle
            resolvePack();
            resolvePack();
            resolvePack();
            aCornerArray.push([0, 0, 0, 0]);
            aCornerArray.push([0, 0, 0, -1]);
            aCornerArray.push([0, 0, 1 * direction, -1]);

            return 3 * 3;
        }

        /**
         * Create vertices attribute buffer and buffer the data
         */
        _createVerticesArray(packedPoints) {
            const verticesArray = [];
            const aCornerArray = [];
            let drawSize = 0;
            
            const resolvePack = (pack) => {
                pack?.forEach((item) => {
                    verticesArray.push(item);
                });
            };
            
            packedPoints?.forEach((pack, index) => {
                // Draw start cap
                if (index === 0) {
                    switch(this.capStyle) {
                        case 'round':
                            drawSize += this._createRoundLineCap(
                                Math.PI / 2,
                                3 * Math.PI / 2,
                                10,
                                () => resolvePack(pack),
                                aCornerArray,
                            );
                            break;
                        case 'square':
                            drawSize += this._createSquareLineCap(
                                -1,
                                () => resolvePack(pack),
                                aCornerArray,
                            );
                            break;
                    }
                }

                // Draw end cap
                if (index === this.points.length - 1) {
                    switch(this.capStyle) {
                        case 'round':
                            drawSize += this._createRoundLineCap(
                                -Math.PI / 2,
                                Math.PI / 2,
                                10,
                                () => resolvePack(pack),
                                aCornerArray,
                            );
                            break;
                        case 'square':
                            drawSize += this._createSquareLineCap(
                                1,
                                () => resolvePack(pack),
                                aCornerArray,
                            );
                            break;
                    }
                    return;
                }            
                // Triangle for left miter
                resolvePack(pack);
                resolvePack(pack);
                resolvePack(pack);
                aCornerArray.push([-1, 0, 0, 0]);
                aCornerArray.push([1, 0, 0, 0]);
                aCornerArray.push([0, -1, 0, 0]);
                

                // Triangle for right miter
                resolvePack(pack);
                resolvePack(pack);
                resolvePack(pack);
                aCornerArray.push([-1, 0, 0, 0]);
                aCornerArray.push([1, 0, 0, 0]);
                aCornerArray.push([0, 1, 0, 0]);

                // Triangle for connection
                resolvePack(pack);
                resolvePack(pack);
                resolvePack(packedPoints[index + 1]);

                aCornerArray.push([1, 1, 0, 0]);
                aCornerArray.push([-1, 1, 0, 0]);
                aCornerArray.push([-1, -1, 0, 0]);
                
                // Triangle for connection
                resolvePack(pack);
                resolvePack(packedPoints[index + 1]);
                resolvePack(packedPoints[index + 1]);

                aCornerArray.push([1, 1, 0, 0]);
                aCornerArray.push([1, -1, 0, 0]);
                aCornerArray.push([-1, -1, 0, 0]);

                drawSize += 3 * 4;
            });

            this.drawSize = drawSize;

            GLUtils.createArrayBuffer(new Float32Array(this._convertPointToBuffer(verticesArray, 2)));

            // Buffer previous, current and next points
            const aPosition = this.gl.getAttribLocation(this.program, 'aPosition');
            this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 6 * 4, 0);
            this.gl.enableVertexAttribArray(aPosition);

            const aPrevious = this.gl.getAttribLocation(this.program, 'aPrevious');
            this.gl.vertexAttribPointer(aPrevious, 2, this.gl.FLOAT, false, 6 * 4, 2 * 4);
            this.gl.enableVertexAttribArray(aPrevious);

            const aAfter = this.gl.getAttribLocation(this.program, 'aAfter');
            this.gl.vertexAttribPointer(aAfter, 2, this.gl.FLOAT, false, 6 * 4, 4 * 4);
            this.gl.enableVertexAttribArray(aAfter);

            // Buffer acorner
            GLUtils.createArrayBuffer(new Float32Array(this._convertPointToBuffer(aCornerArray, 4)));
            const aCorner = this.gl.getAttribLocation(this.program, 'aCorner');
            this.gl.vertexAttribPointer(aCorner, 4, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(aCorner);
        }

        /**
         * Create uniforms which will be used in the shader
         */
        _createUniforms() {
            // Create line width
            this.gl.uniform1f(
                this.gl.getUniformLocation(this.program, 'uLineWidth'),
                this.lineWidth,
            );

            // Create max miter length
            this.gl.uniform1f(
                this.gl.getUniformLocation(this.program, 'uMaxMiterLength'),
                this.maxMiterLength,
            );

            // Create color
            this.gl.uniform3fv(
                this.gl.getUniformLocation(this.program, 'uColor'),
                this.color,
            );
            
            // Create cap color
            this.gl.uniform3fv(
                this.gl.getUniformLocation(this.program, 'uCapColor'),
                this.capColor,
            );

            // Create pixel width and height
            this.gl.uniform2fv(
                this.gl.getUniformLocation(this.program, 'uResolution'),
                this.resolution,
            );
        }

        /**
         * Create texture for line
         */
        _createTexture() {
            if (!this.texture) return;

            // Create texture
            const texture = this.gl.createTexture();

            const initTextures = () => {
                const textureImg = new Image();
                textureImg.onload = () => handleTextureLoaded(textureImg);
                textureImg.src = this.texture;
            };

            const handleTextureLoaded = (textureImg) => {
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.texImage2D(
                    this.gl.TEXTURE_2D, 0, this.gl.RGBA, 
                    textureImg.width, textureImg.height, 0, 
                    this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureImg
                );
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);

                // Bind uniform
                this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uTexture'), 0);
            };

            initTextures();
        }

        /**
         * Create uniform transform matrix
         * here transform matrix === projection matrix * model view matrix
         */
        _updateTransformMatrix(transformMatrix) {
            this.gl.uniformMatrix4fv(
                this.gl.getUniformLocation(this.program, 'uTransformMatrix'),
                false,
                transformMatrix,
            );
        } 


        _convertPointToBuffer(points, size) {
            const convertedPoints = [];
            
            // Probably the most fast way
            for (const point of points) {
                for (let index = 0; index < size; index += 1) {
                    convertedPoints.push(point[index]);
                }
            }

            return convertedPoints;
        }
    }

    class LineDrawer {
        constructor(props) {
            const {
                gl,
                points,
                resolution,
                lineWidth = 10,
                maxMiterLength = 20,
                color = [0.0, 0.0, 0.0],
                capStyle,
                capColor,
                texture,
            } = props;

            // Set util's global context
            GLUtils.gl = gl;

            // Create program
            this.gl = gl;
            this._createProgram();

            // Set resolution
            let resolvedResolution = [
                gl.canvas.getBoundingClientRect().width * window.devicePixelRatio,
                gl.canvas.getBoundingClientRect().height * window.devicePixelRatio,
            ];
            resolvedResolution = resolution || resolvedResolution;

            // Initialize points manager
            this.pointsManager = new PointsManager({
                gl,
                color,
                points,
                lineWidth,
                maxMiterLength,
                resolvedResolution,
                capStyle,
                capColor,
                program: this.program,
                texture,
            });
        }

        render(transformMatrix) {
            const resolvedTransformMatrix = transformMatrix || [
                1., 0., 0., 0.,
                0., 1., 0., 0.,
                0., 0., 1., 0.,
                0., 0., 0., 1.,
            ];
            this.pointsManager.drawLine(resolvedTransformMatrix);
        }

        _createProgram() {
            this.program = this.gl.createProgram();

            const vertexShader = GLUtils.createShader(
                this.gl.VERTEX_SHADER,
                PointsManager.vertexShader,
            );
            this.gl.compileShader(vertexShader);

            const fragmentShader = GLUtils.createShader(
                this.gl.FRAGMENT_SHADER,
                PointsManager.fragmentShader,
            );
            this.gl.compileShader(fragmentShader);
            this.gl.attachShader(this.program, vertexShader);
            this.gl.attachShader(this.program, fragmentShader);
            this.gl.linkProgram(this.program);

            // Check if compile success
            if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS) ) {
                const info = this.gl.getProgramInfoLog(this.program);
                const vertexShaderInfo = this.gl.getShaderInfoLog(vertexShader);
                const fragmentShaderInfo = this.gl.getShaderInfoLog(fragmentShader);
                throw new Error('Could not compile WebGL program. \n\n' + vertexShaderInfo + '\n\n' + fragmentShaderInfo + '\n\n' + info);
            }
            this.gl.useProgram(this.program);  
        }
    }

    exports.LineDrawer = LineDrawer;

}));
