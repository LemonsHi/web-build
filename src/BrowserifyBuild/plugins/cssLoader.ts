import path from 'path-browserify';

import { IPlugin } from '@/types';
import { VirtualFileSystem } from '@/VirtualFileSystem';

/**
 * 创建一个 CSS 导入加载器插件，用于解析和替换 CSS 文件中的 @import 语句中的模块路径。
 *
 * @param vfs 虚拟文件系统实例，用于读取 CSS 文件内容。
 * @param rootDir 项目根目录，用于解析模块路径。
 * @returns 一个 IPlugin 对象，包含插件的名称和设置函数。
 */
export const cssLoader = (
  vfs: VirtualFileSystem,
  rootDir: string
): IPlugin => ({
  name: 'css-loader',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      let contents = (await vfs.readFile(args.path)) as string;
      contents = contents?.replace(
        /@import\s+['"]~([^'"]+)['"];/g,
        (match: string, p1: string) => {
          const newPath = path.resolve(`${rootDir}/node_modules`, p1);
          return `@import '${newPath}';`;
        }
      );

      return { contents, loader: 'css' };
    });
  },
});
