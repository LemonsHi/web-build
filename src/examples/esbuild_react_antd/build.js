const esbuild = require('esbuild');
const { lessLoader } = require('esbuild-plugin-less');

esbuild
  .build({
    entryPoints: ['src/index.jsx'], // 入口文件
    bundle: true, // 打包为一个文件
    outfile: 'dist/app.js', // 输出文件
    loader: { '.js': 'js', '.ts': 'ts', '.tsx': 'tsx' }, // 文件加载器
    sourcemap: true, // 是否生成 Source Map
    define: { 'process.env.NODE_ENV': '"development"' }, // 环境变量
    jsx: 'automatic', // 自动 JSX 支持
    logLevel: 'info', // 日志级别
    plugins: [
      lessLoader({
        lessOptions: {
          javascriptEnabled: true, // 启用 JavaScript 支持
        },
      }),
    ],
    external: ['@lianjia/antd-life'], // 排除 node_modules 中的所有依赖
    target: ['esnext'], // 目标环境（现代浏览器/Node.js）
    format: 'iife', // 输出格式
    banner: {
      js: `
var require = (function() {
  var modules = {
    '@lianjia/antd-life': window.antdLife,
  };
  return function require(moduleName) {
    if (modules.hasOwnProperty(moduleName)) {
      return modules[moduleName];
    }
    throw new Error('Module ' + moduleName + ' not found');
  };
})();`,
    },
  })
  .catch(() => process.exit(1));
