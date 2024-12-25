import { Subject } from 'rxjs';

import { ILogItem, IPlugin } from '@/types';
import { Logger } from '@/Logger';

/**
 * 创建一个流日志插件。
 *
 * @returns {IPlugin} 返回一个包含 `name` 和 `setup` 方法的插件对象。
 *
 * @example
 * ```typescript
 * const plugin = streamingLogsPlugin();
 * ```
 *
 * 插件的 `setup` 方法在构建开始时会输出 "Build started..."，
 * 在构建结束时根据结果输出错误、警告或成功信息。
 */
export const streamingLogsLoader = (
  startTime: number,
  fileList: Set<string>,
  logStream?: Subject<ILogItem>
): IPlugin => {
  const log = (msg: string, type?: 'info' | 'warn' | 'error') => {
    logStream && Logger.log(logStream, msg, type || 'info');
  };

  return {
    name: 'streaming-logs-loader',
    setup(build) {
      build.onStart(() => log('Build started...'));

      build.onEnd((result) => {
        const endTime = new Date().getTime();
        log(`Build completed with ${fileList.size} files`);
        log(`Compiled Files: ${Array.from(fileList)}`);

        if (result.errors.length > 0) {
          result.errors.forEach((error) => {
            log(
              `✘ [ERROR] ${error.text}\n\n     ${error?.location?.file}:${error?.location?.line}:${error?.location?.column}
      ${error?.location?.line} | ${error?.location?.lineText}`,
              'error'
            );
          });
        } else if (result.outputFiles) {
          log(`Compiled ${result.outputFiles.length} files.`);
          result.outputFiles.forEach((file) => {
            log(`${file.path} - ${(file.text.length / 1024).toFixed(2)} KB`);
          });
        } else {
          log('No output files generated', 'warn');
        }
        log(`⚡ Done in ${endTime - startTime}ms`);
      });
    },
  };
};
