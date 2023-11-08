import { GLUtils } from './utils.js'; 
import { PointsManager } from './pointsManager.js'

export class LineDrawer {
    constructor(props) {
        const {
            gl,
            points,
            resolution,
            lineWidth = 10,
            maxMiterLength = 20,
            color = [0.0, 0.0, 0.0],
            capStyle,
            capColor = [0.0, 0.0, 0.0],
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
            resolution: resolvedResolution,
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