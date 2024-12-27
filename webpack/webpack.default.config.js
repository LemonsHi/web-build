const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

console.log('NODE_ENV:', process.env.NODE_ENV);

module.exports = {
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production', // 根据环境变量设置模式
  output: {
    filename: (pathData) => {
      return pathData.chunk.name.includes('worker')
        ? 'workers/[name].bundle.js'
        : '[name].js';
    },
    publicPath: '/',
    path: path.resolve(__dirname, '../dist'),
    globalObject: 'this',
    clean: false,
    iife: true, // 确保 iife 设置为 true
    library: {
      type: 'umd', // 确保 library.type 设置为 umd
    },
  },
  target: 'web',
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        extractComments: false, // 禁止提取注释到单独的文件
      }),
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'], // 解析文件扩展名
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
    fallback: {
      fs: require.resolve('browserify-fs'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      vm: require.resolve('vm-browserify'),
      buffer: require.resolve('buffer'),
      os: require.resolve('os-browserify/browser'),
      process: require.resolve('process/browser'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
      'process.version': JSON.stringify('v14.17.0'), // 你可以根据需要设置 Node.js 版本
      'process.versions': JSON.stringify({
        node: '14.17.0', // 同上
      }),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          'babel-loader',
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true, // 仅转译，加快构建速度
              happyPackMode: true, // 开启多线程编译
            },
          },
        ],
      },
      {
        test: /\.worker\.ts$/, // 匹配 worker 文件
        use: [
          {
            loader: 'ts-loader', // 使用 ts-loader 进行编译
          },
        ],
      },
    ],
  },
  stats: {
    children: true, // 启用子编译详细信息
  },
};
