import { BuildOptions } from 'esbuild-wasm';
import { Subject } from 'rxjs';

import { VirtualFileSystem } from '@/VirtualFileSystem';
import { ROOT_DIR } from '@/constants';
import { ILogItem } from '@/types';

import {
  cssLoader,
  imageLoader,
  lessLoader,
  streamingLogsLoader,
  virtualFsLoader,
} from '../plugins';

export const esbuildConfig = (
  vfs: VirtualFileSystem,
  rootDir: string = ROOT_DIR,
  esbuildConfig?: BuildOptions,
  logStream?: Subject<ILogItem>
): BuildOptions => {
  const startTime = new Date().getTime();
  const fileList = new Set<string>();
  const {
    alias,
    external,
    plugins = [],
    define = {},
    ...rest
  } = esbuildConfig || {};

  return {
    ...rest,
    entryPoints: [`${rootDir}/src/index.jsx`],
    bundle: true,
    outfile: `${rootDir}/dist/app.js`,
    write: false,
    sourcemap: false,
    define: {
      'process.env.NODE_ENV': '"production"',
      global: 'window',
      process: JSON.stringify(require('process/browser')),
      ...define,
    },
    jsx: 'automatic',
    logLevel: 'warning',
    treeShaking: true,
    plugins: [
      imageLoader.imageLoader(vfs),
      lessLoader.lessLoader(vfs),
      cssLoader.cssLoader(vfs, rootDir),
      virtualFsLoader.virtualFsLoader(vfs, rootDir, fileList, {
        external,
        alias,
      }),
      streamingLogsLoader.streamingLogsLoader(startTime, fileList, logStream),
      ...plugins,
    ],
    format: 'iife',
    platform: 'browser',
  };
};
