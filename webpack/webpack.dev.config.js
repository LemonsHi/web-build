const { merge } = require('webpack-merge');
const path = require('path');

const common = require('./webpack.default.config');

module.exports = merge(common, {
  entry: {
    index: path.resolve(__dirname, '../src/examples/index.tsx'),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]___[hash:base64:5]', // 样式类名的格式
              },
              esModule: true, // 启用 ES 模块语法
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.module\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: { localIdentName: '[name]__[local]___[hash:base64:5]' },
              sourceMap: true,
            },
          },
          'less-loader',
        ],
      },
      {
        test: /\.less$/,
        exclude: /\.module\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader'],
      },
    ],
  },
  devtool: 'source-map', // 生成 source map 以便调试
  devServer: {
    proxy: [
      {
        context: ['/ke-registry-proxy'],
        target: 'http://artifactory.intra.ke.com', // 指向 CDN
        changeOrigin: true,
        secure: false,
        pathRewrite: { '^/ke-registry-proxy': '' },
      },
    ],
    static: path.resolve(__dirname, '../public'), // 静态文件目录
    open: false, // 自动打开浏览器
    hot: true, // 启用热模块替换
    port: 8080, // 服务器端口
  },
});
