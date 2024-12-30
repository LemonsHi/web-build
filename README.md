# WebBuild

一个可以在浏览器中下载前端项目依赖并编译的工具。

## 概述

`WebBuild` 是一款基于浏览器的轻量级前端编译工具，支持虚拟文件系统操作、多线程依赖下载、代码编译和私域依赖包管理。它专为在线代码预览场景设计，帮助开发者在浏览器中快速验证生成代码的效果。

## 特性

- 🌐 虚拟文件系统: 模拟 Node.js 文件操作。
- ⚡ 多线程依赖管理: 高效下载和解析 package.json 中的依赖。
- 🛠️ 自定义虚拟文件目录映射: 支持将代码中的依赖路径映射到虚拟文件目录。
- 🚀 esbuild-wasm 编译: 快速编译代码，适用于在线场景。
- 📂 依赖缓存: 缓存已下载的依赖，加速编译过程。

## 安装

1. 克隆项目代码：

```bash
git clone git@github.com:LemonsHi/web-build.git
```

2. 安装依赖：

```bash
npm run bootstrap
```

3. 启动开发环境：

```bash
npm run start
```

## 示例

请参考 examples/demos 文件夹 获取更多使用示例。

## 贡献

`WebBuild` 还有很多地方需要提升和优化，欢迎社区贡献！请参阅 CONTRIBUTING.md 获取贡献指南。
