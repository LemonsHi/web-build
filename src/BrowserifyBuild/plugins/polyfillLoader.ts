import path from 'path-browserify';
import { Loader } from 'esbuild-wasm';
import { forEach } from 'lodash';

import { IPlugin } from '@/types';
import { VirtualFileSystem } from '@/VirtualFileSystem';

const emptyPolyfills = ['cluster', 'vm'];

const polyfills = (rootDir: string) => {
  return {
    util: path.resolve(`${rootDir}/node_modules`, './util/util.js'),
    https: require.resolve('stream-http'),
    http: require.resolve('stream-http'),
    url: require.resolve('url'),
    zlib: require.resolve('browserify-zlib'),
    path: require.resolve('path-browserify'),
    stream: path.resolve(
      `${rootDir}/node_modules`,
      './stream-browserify/index.js'
    ),
    crypto: path.resolve(
      `${rootDir}/node_modules`,
      './crypto-browserify/index.js'
    ),
    os: require.resolve('os-browserify/browser'),
    tty: require.resolve('tty-browserify'),
    events: path.resolve(`${rootDir}/node_modules`, './events/events.js'),
    fs: require.resolve('browserify-fs'),
    buffer: path.resolve(`${rootDir}/node_modules`, './buffer/index.js'),
  };
};

const NAMESPACE = 'polyfill-loader';
const EMPTY_NAMESPACE = 'empty-loader';

/**
 * 创建一个用于加载 Node.js polyfill 的插件。
 *
 * @param vfs 虚拟文件系统实例，用于读取文件内容。
 * @param rootDir 根目录路径，用于解析 polyfill 包的绝对路径。
 * @returns 返回一个符合 IPlugin 接口的插件对象，用于在构建过程中处理 Node.js polyfill 的加载。
 */
export const polyfillLoader = (
  vfs: VirtualFileSystem,
  rootDir: string
): IPlugin => ({
  name: 'polyfill-loader',
  setup(build) {
    /** 空 polyfill 处理 */
    forEach(emptyPolyfills, (pkgName) => {
      build.onResolve({ filter: new RegExp(`^${pkgName}$`) }, (args) => ({
        path: args.path,
        namespace: EMPTY_NAMESPACE,
      }));
    });

    /** polyfill 处理 */
    for (const [pkgName, pkgPath] of Object.entries(polyfills(rootDir))) {
      build.onResolve({ filter: new RegExp(`^${pkgName}$`) }, () => ({
        path: path.resolve(rootDir, pkgPath),
        namespace: NAMESPACE,
      }));
    }

    /** polyfill 加载 */
    build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async (args) => {
      try {
        const content = (await vfs.readFile(args.path)) as string;
        const loader = args.path.match(/\.(\w+)$/)?.[1] || 'jsx';

        return {
          contents: content,
          loader: loader as Loader,
        };
      } catch (e: any) {
        return { errors: [{ text: `加载失败：${e.message}` }] };
      }
    });

    /** 空 polyfill 加载 */
    build.onLoad({ filter: /.*/, namespace: EMPTY_NAMESPACE }, () => {
      return {
        contents: 'export default {};',
        loader: 'js',
      };
    });
  },
});