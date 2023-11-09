# gl-line-drawer
This is a simple 2D line drawer package using WebGL. Due to the restriction of WebGL, gl.LINES drawing type only supports 1px line. Thus, it needs to be created by augmenting the single point to mutiple points to generate triangles forming a line.

This package enables you to pass points coordinates and expected transform matrix to generate line. It supports drawing line with optional caps and colors. You can also set the maximum miter length to avoid unexpected mitters at the bend.

![]("img1.jpg")

# Installing
`npm install gl-line-drawer`

# Usage
You can refere the code in folder `demo` to see more details
```javascript
import { LineDrawer } from '';

const canvas = document.getElementById('yourCanvasElement');
const gl = canvas.getContext('webgl2');
const points = [
    [-0.9, 0.0],
    [-0.8, -0.3],
    [-0.6, 0.2],
    [-0.4, -0.5],
    [0.0, 0.0],
    [0.2, 0.2],
    [0.4, -0.4],
    [0.6, 0.4],
];

// First you need to generate an instance of line drawer with options
const lineDrawer = new LineDrawer({
    gl,
    points,
    color: [0.5, 0.5, 0.5],
});

// Then in the each animation frame pass the transform marix for rendering, the default value is an identity matrix
const renderer = () => {
    // Pass the transform matrix to line drawer
    lineDrawer.render();
    requestAnimationFrame(renderer);
};
        
// Start render
renderer();
```
There are following options you can set:
```typescript
{
    /**
     * The gl context
     */
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    /**
     * 2-dimensional points array 
     */
    points: number[][];
    /**
     * The resolution of devices
     * Default value: calculate based on your canvas property
     */
    resolution?: number[];
    /**
     * Line width
     * Default value: 10px
     */
    lineWidth?: number;
    /**
     * Max miter length
     * Default value: 20px
     */
    maxMiterLength?: number;
    /**
     * Line color with array of rgb
     * Default value: [0., 0., 0.]
     */
    color?: number[];
    /**
     * Cap color with array of rgb
     * Only works when you set cap style
     * Default value: [0., 0., 0.]
     */
    capColor?: number[];
    /**
     * Cap style enabling round, circle or nothing
     * Default value: undefined
     */
    capStyle?: 'round' | 'circle';
}
```

# Furture Work
+ Support setting texture for lines
+ Support multiple lines 