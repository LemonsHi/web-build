import path from 'path-browserify';
import { Loader, OnResolveResult } from 'esbuild-wasm';

import { VirtualFileSystem } from '@/VirtualFileSystem';
import { IPlugin } from '@/types';
import { ROOT_DIR } from '@/constants';

import { resolveWithExtensions } from '../utils';

const NAMESPACE = 'virtual-fs';

export const virtualFsLoader = (
  vfs: VirtualFileSystem,
  rootDir: string = ROOT_DIR,
  fileList: Set<string>,
  options?: { external?: string[]; alias?: Record<string, string> }
): IPlugin => {
  const { external = [], alias = {} } = options || {};

  const pathCache = new Map<string, string>();

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
      const handleRetrun = (
        resolvedPath: string,
        importPath: string
      ): OnResolveResult => {
        if (!importPath.startsWith('.')) {
          pathCache.set(importPath, resolvedPath);
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

        /** step1: 文件类型处理 */
        if (isFile) {
          return handleRetrun(resolvedPath, importPath);
        }

        /** step2: 隐藏后缀类型处理 */
        const suffixPath = await resolveWithExtensions(vfs, resolvedPath);
        if (suffixPath) {
          return handleRetrun(suffixPath, importPath);
        }

        /** step4: 警告 */
        return { warnings: [{ text: `无法解析模块：${importPath}` }] };
      };

      build.onResolve({ filter: /.*/ }, async (args) => {
        let { path: importPath, importer, kind } = args;

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

        if (pathCache.has(importPath)) {
          return {
            path: pathCache.get(importPath),
            namespace: NAMESPACE,
          };
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

        /** case: node_modules 引用 */
        const modulePath = await vfs.reslovePath(rootDir, importPath, {
          ...(kind === 'require-call'
            ? {
                packageFilter: (pkg, pkgdir) => {
                  if (!pkg.main) {
                    // 如果没有 main 字段，默认使用 index.js
                    pkg.main = 'index.js';
                  }
                  return pkg;
                },
              }
            : {}),
        });

        return await handle(modulePath, importPath);
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
            loader: (['mjs', 'cjs'].includes(loader) ? 'js' : loader) as Loader,
          };
        } catch (e: any) {
          return { errors: [{ text: `加载失败：${e.message}` }] };
        }
      });
    },
  };
};
