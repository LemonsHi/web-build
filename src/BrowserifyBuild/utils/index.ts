import { VirtualFileSystem } from '@/VirtualFileSystem';

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
