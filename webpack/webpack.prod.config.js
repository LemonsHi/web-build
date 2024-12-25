const { merge } = require('webpack-merge');
const path = require('path');

const common = require('./webpack.default.config');

module.exports = merge(common, {
  entry: {
    index: path.resolve(__dirname, '../src/index.ts'), // 项目入口文件
  },
  output: {
    library: 'WebContainer',
    libraryTarget: 'umd', // 以 UMD 格式导出，兼容多种模块系统
  },
  optimization: {
    minimize: false,
  },
  experiments: {
    outputModule: true,
  },
  devtool: false,
});
