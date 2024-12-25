import path from 'path-browserify';

import { IPlugin } from '@/types';
import { VirtualFileSystem } from '@/VirtualFileSystem';

enum LoaderNamespace {
  Base64Image = 'base64-image-loader',
  HttpImage = 'http-image-loader',
  VirtualImage = 'virtual-image-loader',
}

// const IMAGE_HOST_LIST = {
//   '/img_p': /^https:\/\/p.ljcdn.com/,
//   '/img_file': /^https:\/\/file.ljcdn.com/,
//   '/img_ke': /^https:\/\/p.ke.com/,
//   '/img_ljcdn': /^https:\/\/img.ljcdn.com/,
//   '/img_zoe': /^https:\/\/zos.alipayobjects.com/,
// };

// const imageHostCheck = (url: string) => {
//   for (const [key, reg] of Object.entries(IMAGE_HOST_LIST)) {
//     if (reg.test(url)) {
//       return url.replace(reg, key);
//     }
//   }
//   return url;
// };

export const imageLoader = (vfs: VirtualFileSystem): IPlugin => ({
  name: 'image-loader',
  setup(build) {
    /** 拦截 data: URLs */
    build.onResolve({ filter: /^data:(image|application)\// }, (args) => {
      return {
        path: args.path,
        namespace: LoaderNamespace.Base64Image,
      };
    });

    /** 拦截图片路径（包括 Base64、HTTP 链接和相对路径） */
    build.onResolve({ filter: /\.(png|gif|jpg|jpeg|svg)$/ }, async (args) => {
      const { path: importPath, importer } = args;

      /** 处理 Base64 图片 */
      if (/^data:(image|application)\//.test(importPath)) {
        return { path: importPath, namespace: LoaderNamespace.Base64Image };
      }

      /** 处理 HTTP 图片链接 */
      if (/^(https?:)?\/\//.test(importPath)) {
        const imageUrl = importPath.startsWith('//')
          ? `https:${importPath}`
          : importPath;

        // HTTP 图片链接
        // const path = imageHostCheck(imageUrl);
        return {
          path: imageUrl,
          namespace: LoaderNamespace.HttpImage,
          external: true,
        };
      }

      /** 处理相对路径图片 */
      const importerDir = await path.dirname(importer);
      const resolvedPath = await path.resolve(importerDir, importPath);

      return {
        path: resolvedPath,
        namespace: LoaderNamespace.VirtualImage,
      };
    });

    /** 加载 Base64 图片 */
    build.onLoad(
      { filter: /.*/, namespace: LoaderNamespace.Base64Image },
      (args) => ({ contents: args.path, loader: 'base64' })
    );

    /** 加载虚拟文件系统中的图片 */
    build.onLoad(
      { filter: /.*/, namespace: LoaderNamespace.VirtualImage },
      async (args) => {
        let base64 = await vfs.readFile(args.path, 'base64');
        if (!base64) {
          throw new Error(
            `File not found in virtual file system: ${args.path}`
          );
        }

        const mimeType = args.path.endsWith('.png')
          ? 'image/png'
          : args.path.endsWith('.gif')
          ? 'image/gif'
          : args.path.endsWith('.jpg') || args.path.endsWith('.jpeg')
          ? 'image/jpeg'
          : args.path.endsWith('.svg')
          ? 'image/svg+xml'
          : '';

        return {
          contents: `data:${mimeType};base64,${base64}`,
          loader: 'text',
        };
      }
    );
  },
});
