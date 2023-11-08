interface LineDrawerProps {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    resolution?: number[];
    lineWidth?: number;
    maxMiterLength?: number;
    color?: number[];
    capColor?: number[];
    capStyle?: 'round' | 'circle';
}

export class LineDrawer {
    constructor(props: LineDrawerProps);
    render(transformMatrix?: number[]): void;
}

