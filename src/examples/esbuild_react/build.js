// build.js

const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['src/index.jsx'],
    bundle: true,
    outfile: 'dist/app.js',
    loader: { '.js': 'jsx', '.jsx': 'jsx' },
    sourcemap: true,
    define: { 'process.env.NODE_ENV': '"development"' },
    jsx: 'automatic',
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
