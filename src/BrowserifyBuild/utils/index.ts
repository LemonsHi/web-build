import { VirtualFileSystem } from '@/VirtualFileSystem';
import path from 'path-browserify';

export let browserMap: Record<string, any> = {};

const extensions = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '/index.js',
  '/index.jsx',
  '/index.ts',
  '/index.tsx',
  '/index.css',
];

/* 判断是否有文件扩展名 */
export const hasExtension = (path: string) => /\.\w+$/.test(path);

// 用于解析路径时的辅助函数
export const resolveWithExtensions = async (
  vfs: VirtualFileSystem,
  basePath: string
) => {
  for (const ext of extensions) {
    const potentialPath = `${basePath}${ext}`;
    if (await vfs.exists(potentialPath)) {
      return potentialPath;
    }
  }
  return null;
};

/* 获取 node_modules 路径 */
export const getNodeModulesPath = async (
  vfs: VirtualFileSystem,
  rootDir: string,
  importer: string
): Promise<string> => {
  const dirPath =
    path.dirname(importer) === '.' ? rootDir : path.dirname(importer);
  const fileList = await vfs.readdir(dirPath);

  if (!fileList.includes('node_modules')) {
    return await getNodeModulesPath(vfs, rootDir, dirPath);
  }

  return `${dirPath}/node_modules`;
};

export const handlerDirectory = async (
  vfs: VirtualFileSystem,
  rootDir: string,
  dirPath: string
): Promise<string | undefined> => {
  const pkgPath = path.resolve(dirPath, `./package.json`);
  const pkgExists = await vfs.exists(pkgPath);

  if (pkgExists) {
    const pkgContentStr = (await vfs.readFile(pkgPath)) as string;
    const pkgContentJson = JSON.parse(pkgContentStr || '{}');

    const browser = (pkgContentJson.browser || {}) as Record<string, string>;

    try {
      if (typeof browser !== 'string') {
        for (const [key, value] of Object.entries(browser)) {
          const _key = key.startsWith('.')
            ? path.resolve(dirPath, key)
            : path.resolve(
                await getNodeModulesPath(vfs, rootDir, dirPath),
                `./${key}`
              );
          const _value = value.startsWith('.')
            ? path.resolve(dirPath, value as string)
            : path.resolve(
                await getNodeModulesPath(vfs, rootDir, dirPath),
                `./${value}`
              );

          browserMap[_key] = _value;
        }
      }
    } catch (e) {}

    let mainFile =
      typeof browser === 'string'
        ? browser
        : pkgContentJson.module || pkgContentJson.main || 'index.js';
    mainFile = mainFile.startsWith('.') ? mainFile : `./${mainFile}`;

    let resolvePath = path.resolve(dirPath, mainFile);

    const exists = await vfs.exists(resolvePath);
    if (!exists && resolvePath.endsWith('.js')) {
      resolvePath = path.resolve(dirPath, './es/index.js');
    }

    const isFile = await vfs.isFile(resolvePath);
    const isDirectory = await vfs.isDirectory(resolvePath);

    if (isFile) {
      return resolvePath;
    }

    if (isDirectory) {
      return await handlerDirectory(vfs, rootDir, resolvePath);
    }

    const suffixPath = await resolveWithExtensions(vfs, resolvePath);
    if (suffixPath) {
      return suffixPath;
    }
    return;
  }

  const suffixPath = await resolveWithExtensions(vfs, dirPath);
  if (suffixPath) {
    return suffixPath;
  }
  return;
};
