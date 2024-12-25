const esbuild = require('esbuild');
const { lessLoader } = require('esbuild-plugin-less');
const { polyfillNode } = require('esbuild-plugin-polyfill-node');

esbuild
  .build({
    entryPoints: ['src/index.jsx'], // 入口文件
    bundle: true, // 打包为一个文件
    outfile: 'dist/app.js', // 输出文件
    sourcemap: true, // 是否生成 Source Map
    define: {
      'process.env.NODE_ENV': '"development"',
      global: 'window',
    }, // 环境变量
    jsx: 'automatic', // 自动 JSX 支持
    logLevel: 'info', // 日志级别
    treeShaking: true, // 树摇
    loader: {
      '.png': 'file',
      '.jpg': 'file',
      '.jpeg': 'file',
      '.gif': 'file',
      '.svg': 'file',
      '.css': 'css', // 确保 CSS 文件也有加载器
    },
    assetNames: 'assets/[name]-[hash]', // 资源文件的命名方式
    plugins: [
      polyfillNode({
        globals: {
          process: true,
        },
      }), // Node.js 全局变量支持
      {
        name: 'css-modules-plugin',
        setup(build) {
          const path = require('path');
          const fs = require('fs');

          build.onLoad({ filter: /\.css$/ }, async (args) => {
            let contents = await fs.promises.readFile(args.path, 'utf8');
            // 替换 @import '~...' 为 @import '...'
            contents = contents.replace(
              /@import\s+['"]~([^'"]+)['"];/g,
              (match, p1) => {
                const newPath = path.resolve('node_modules', p1);
                return `@import '${newPath}';`;
              }
            );

            return {
              contents,
              loader: 'css',
            };
          });
        },
      },
      lessLoader({
        lessOptions: {
          javascriptEnabled: true, // 启用 JavaScript 支持
        },
      }),
    ],
    // 移除了 external 属性
    target: ['esnext'], // 目标环境（现代浏览器/Node.js）
    format: 'iife', // 输出格式
    platform: 'browser', // 平台
  })
  .catch(() => process.exit(1));
