import { IPlugin } from '@/types';
import { VirtualFileSystem } from '@/VirtualFileSystem';

/**
 * 创建一个用于处理 `.less` 文件的插件。
 *
 * @returns {IPlugin} 返回一个插件对象，该对象包含插件的名称和设置函数。
 *
 * 插件的设置函数会在构建过程中被调用，并为 `.less` 文件添加一个加载处理器。
 * 当加载 `.less` 文件时，插件会通过 `fetch` 请求获取文件内容，并使用 `less.render` 方法将其编译为 CSS。
 * 最终返回包含编译后 CSS 内容的对象，并指定加载器为 `css`。
 */
export const lessLoader = (vfs: VirtualFileSystem): IPlugin => {
  const compileLess = (lessCode: string) => {
    const variableRegex = /@([a-zA-Z0-9_-]+)\s*:\s*(.+);/g;
    const nestedRegex = /([^{]+)\{([^{}]+)\}/g;

    let variables: Record<string, string> = {};
    let output = lessCode;

    // 提取并替换变量
    output = output.replace(variableRegex, (match, varName, value) => {
      variables[varName] = value.trim();
      return ''; // 移除变量声明
    });

    // 替换变量引用
    output = output.replace(/@([a-zA-Z0-9_-]+)/g, (match, varName) => {
      return variables[varName] || match; // 如果变量不存在，保留原样
    });

    // 展开嵌套规则
    const resolveNesting = (parentSelector: string, content: string) => {
      let result = '';
      content.replace(nestedRegex, (match, selector, rules) => {
        const fullSelector = parentSelector.trim() + ' ' + selector.trim();
        result += `${fullSelector} { ${rules.trim()} }\n`;
        return '';
      });
      return result;
    };

    let finalOutput = '';
    output.replace(nestedRegex, (match, selector, rules) => {
      finalOutput += resolveNesting(selector, rules);
      return '';
    });

    return finalOutput || output; // 返回最终解析的 CSS
  };

  return {
    name: 'less-loader',
    setup(build) {
      build.onLoad({ filter: /\.less$/ }, async (args) => {
        const lessCode = (await vfs.readFile(args.path)) as string;

        // 编译 LESS 为 CSS
        const css = lessCode && compileLess(lessCode);

        return {
          contents: css,
          loader: 'css',
        };
      });
    },
  };
};
