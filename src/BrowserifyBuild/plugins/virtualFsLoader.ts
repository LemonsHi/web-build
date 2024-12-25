import path from 'path-browserify';
import { Loader, OnResolveResult } from 'esbuild-wasm';

import { VirtualFileSystem } from '@/VirtualFileSystem';
import { IPlugin } from '@/types';
import { ROOT_DIR } from '@/constants';

import {
  browserMap,
  getNodeModulesPath,
  handlerDirectory,
  hasExtension,
  resolveWithExtensions,
} from '../utils';

const NAMESPACE = 'virtual-fs';

export const virtualFsLoader = (
  vfs: VirtualFileSystem,
  rootDir: string = ROOT_DIR,
  fileList: Set<string>,
  options?: { external?: string[]; alias?: Record<string, string> }
): IPlugin => {
  const { external = [], alias = {} } = options || {};

  return {
    name: 'virtual-fs-loader',
    setup(build) {
      /**
       * 处理解析路径的函数。
       *
       * @param resolvedPath - 已解析的路径字符串。
       * @returns 一个包含路径和命名空间的对象。如果 `resolvedPath` 在 `browserMap` 中存在对应的映射，
       * 则返回映射后的路径和命名空间；否则返回原始路径和命名空间。
       */
      const handleRetrun = (resolvedPath: string): OnResolveResult => {
        if (browserMap[resolvedPath]) {
          return { path: browserMap[resolvedPath], namespace: NAMESPACE };
        }

        return { path: resolvedPath, namespace: NAMESPACE };
      };

      /**
       * 处理给定路径的异步函数，根据路径类型执行不同的处理逻辑。
       *
       * @param resolvedPath - 已解析的文件或目录路径。
       * @param importPath - 导入路径，用于在警告信息中显示。
       * @returns 处理结果，如果路径是文件或目录，返回处理后的路径；如果无法解析模块，返回包含警告信息的对象。
       */
      const handle = async (resolvedPath: string, importPath: string) => {
        const isFile = await vfs.isFile(resolvedPath);
        const isDirectory = await vfs.isDirectory(resolvedPath);

        /** step1: 文件类型处理 */
        if (isFile) {
          return handleRetrun(resolvedPath);
        }

        /** step2: 文件夹类型处理 */
        if (isDirectory) {
          const directoryPath = await handlerDirectory(
            vfs,
            rootDir,
            resolvedPath
          );
          if (directoryPath) {
            return handleRetrun(directoryPath);
          }
          return { warnings: [{ text: `无法解析模块：${importPath}` }] };
        }

        /** step3: 隐藏后缀类型处理 */
        const suffixPath = await resolveWithExtensions(vfs, resolvedPath);
        if (suffixPath) {
          return handleRetrun(suffixPath);
        }

        /** step4: 警告 */
        return { warnings: [{ text: `无法解析模块：${importPath}` }] };
      };

      build.onResolve({ filter: /.*/ }, async (args) => {
        let { path: importPath, importer } = args;

        /** case: external 处理 */
        if (external?.includes(importPath)) {
          return { path: importPath, namespace: NAMESPACE, external: true };
        }

        /** case: alias 处理 */
        for (const [key, value] of Object.entries(alias)) {
          if (importPath.startsWith(key)) {
            importPath = importPath.replace(key, value);
            break;
          }
        }

        /** case: 相对引用 */
        if (
          importPath === '.' ||
          importPath.startsWith('./') ||
          importPath.startsWith('../')
        ) {
          const importerDir = await path.dirname(importer);
          let resolvedPath = await path.resolve(importerDir, importPath);

          return await handle(resolvedPath, importPath);
        }

        /** case: 绝对路径 */
        const outPath = await handle(importPath, importPath);
        if (outPath.path) return outPath;

        /** case: 获取 node_modules 路径 */
        const nodeModulesPath = await getNodeModulesPath(
          vfs,
          rootDir,
          importer
        );
        let filePath = path.resolve(nodeModulesPath, `./${importPath}`);

        browserMap[filePath] && (filePath = browserMap[filePath]);

        return await handle(filePath, importPath);
      });

      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async (args) => {
        try {
          if (/^\/vf-root\/src/.test(args.path)) {
            fileList.add(args.path);
          }

          let content = (await vfs.readFile(args.path)) as string;

          const loader = args.path.match(/\.(\w+)$/)?.[1] || 'jsx';

          return {
            contents: content,
            loader: (loader === 'mjs' ? 'js' : loader) as Loader,
          };
        } catch (e: any) {
          return { errors: [{ text: `加载失败：${e.message}` }] };
        }
      });
    },
  };
};
