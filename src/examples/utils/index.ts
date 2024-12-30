import { IFile, WebContainer, WebContainerConfig } from '../../WebContainer';
import { ILogItem } from '../../types';

let webcontainerInstance: WebContainer;

export const run = async (
  file: IFile,
  addLog: (log: string) => void,
  config?: WebContainerConfig
) => {
  try {
    /** step1: 启动 WebContaniner 容器 */
    addLog('开始初始化 @ke/webContainer 容器...');
    webcontainerInstance =
      webcontainerInstance ||
      (await WebContainer.boot({
        clearRootDir: false,
        ...config,
      }));
    addLog('初始化 @ke/webContainer 容器完成！！');

    /** step2: 挂载文件 */
    addLog('开始挂载文件...');
    await webcontainerInstance.mount(file);
    addLog('文件挂载完成！！');

    /** step3: 安装依赖并构建 */
    addLog('开始安装项目依赖...');
    await webcontainerInstance.spawn('npm', ['install'], (log: ILogItem) => {
      console.log(log);
      addLog(`[${log.timestamp}] ${log.type} - ${log.message}`);
    });
    addLog('项目依赖安装完成！！');

    /** step4: 执行构建 */
    addLog('开始 build 项目...');
    await webcontainerInstance.spawn(
      'npm',
      ['run', 'build'],
      (log: ILogItem) => {
        console.log('build 日志：', log);
        addLog(`[${log.timestamp}] ${log.type} - ${log.message}`);
      }
    );
    addLog('项目 build 完成！！');

    return webcontainerInstance;
  } catch (e) {
    return Promise.reject(e);
  }
};
