# WebBuild

一个可以在浏览器中下载前端项目依赖并编译的工具。

## 概述

`WebBuild` 是一款基于浏览器的轻量级前端编译工具，支持虚拟文件系统操作、多线程依赖下载、代码编译和私域依赖包管理。它专为在线代码预览场景设计，帮助开发者在浏览器中快速验证生成代码的效果。

## 特性

- 🌐 虚拟文件系统：模拟 Node.js 文件操作。
- ⚡ 多线程依赖管理：高效下载和解析 `package.json` 中的依赖。
- 🛠️ 自定义虚拟文件目录映射：支持将代码中的依赖路径映射到虚拟文件目录。
- 🚀 基于 `esbuild-wasm` 的编译：适用于在线场景的快速构建体验。
- 📂 依赖缓存：缓存已下载的依赖，加速编译过程。

## 环境要求

- Node.js >= 18

## 安装

1. 克隆项目代码：

```bash
git clone git@github.com:LemonsHi/web-build.git
cd web-build
```

2. 安装依赖：

```bash
npm run bootstrap
```

3. 启动开发环境：

```bash
npm run start
```

## 快速上手

以下示例演示如何在代码中使用 `WebContainer`：

```typescript
import { WebContainer } from 'web-build';

const container = await WebContainer.boot();
await container.mount({
  'index.js': {
    fileType: 'document',
    content: 'console.log("Hello WebBuild")',
  },
});

await container.spawn('npm', ['install'], (log) => {
  console.log(log.message);
});
```

更多示例请参见 `src/examples/demos` 目录。

## 测试

执行以下命令运行单元测试：

```bash
npm test
```

## 贡献

`WebBuild` 还有很多地方需要提升和优化，欢迎社区贡献！请参阅 `CONTRIBUTING.md` 获取贡献指南。
