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

interface Props {
  vfs: VirtualFileSystem;
  rootDir: string;
  esbuildConfig?: BuildOptions;
  logStream?: Subject<ILogItem>;
  less?: LessStatic;
}

export const esbuildConfig = (config: Props): BuildOptions => {
  const {
    vfs,
    rootDir = ROOT_DIR,
    esbuildConfig,
    logStream,
    less,
  } = config || {};

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
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"production"',
      ...define,
    },
    jsx: 'automatic',
    logLevel: 'warning',
    treeShaking: true,
    plugins: [
      imageLoader.imageLoader(vfs),
      lessLoader.lessLoader(vfs, less),
      cssLoader.cssLoader(vfs, rootDir),
      virtualFsLoader.virtualFsLoader(vfs, rootDir, fileList, {
        external,
        alias,
      }),
      streamingLogsLoader.streamingLogsLoader(startTime, fileList, logStream),
      ...plugins,
    ],
    target: ['esnext'],
    format: 'esm',
  };
};
