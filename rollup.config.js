import dts from "rollup-plugin-dts";

export default [
    {
        input: 'src/index.js',
        output: [
            {
                file: "dist/index.umd.js",
                format: "umd",
                name: 'gl-line-drawer',
            },
            {
                file: `dist/index.cjs.js`,
                format: 'cjs',
                name: 'gl-line-drawer',
            },
            {
                file: `dist/index.esm.js`,
                format: 'es',
                name: 'gl-line-drawer',
            }
        ]
    },
    {
        input: "src/types/index.d.ts",
        output: [
            {
                file: "dist/index.d.ts",
                format: "es",
                name: 'gl-line-drawer',
            },
        ],
        plugins: [
            dts(),
        ],
    }
];