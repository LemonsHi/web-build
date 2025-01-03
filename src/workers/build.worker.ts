import { expose } from 'threads/worker';
// import less from 'less';

import { Logger } from '@/Logger';
import { VirtualFileSystem } from '@/VirtualFileSystem';
import { BrowserifyBuild, BuildType } from '@/BrowserifyBuild';

class BuildWorker {
  /**
   * 静态虚拟文件系统实例。
   */
  private vfs: VirtualFileSystem | null = null;

  /**
   * Browserify 构建工具实例。
   */
  private browserifyBuild: BrowserifyBuild | null = null;

  /**
   * 日志记录器实例。
   */
  private logger: Logger | null = null;

  /**
   * less 编译器实例。
   */
  private less: LessStatic | null = null;

  constructor() {}

  /**
   * 订阅日志流并将订阅添加到订阅列表中。
   *
   * @returns 返回日志流的可观察对象。
   */
  subscribeLogStream() {
    return this.logger?.subscribeLogStream();
  }

  /**
   * 初始化全局对象 `global.window` 和 `global.document`。
   *
   * 该方法确保在 `global` 对象上存在 `window` 和 `document` 属性，
   * 并为这些属性提供基本的默认实现，以避免在某些环境中因缺少这些属性而导致的错误。
   *
   * - `global.window`:
   *   - `location`: 空对象。
   *   - `document`: 包含以下属性和方法：
   *     - `head`: 包含 `appendChild` 方法的空对象。
   *     - `createElement`: 返回包含 `appendChild` 方法的空对象的函数。
   *     - `createTextNode`: 返回空对象的函数。
   *     - `getElementById`: 返回包含 `appendChild` 方法的空对象的函数。
   *     - `getElementsByTagName`: 返回空数组的函数。
   *
   * - `global.document`:
   *   - `head`: 包含 `appendChild` 方法的空对象。
   *   - `createElement`: 返回包含 `appendChild` 方法的空对象的函数。
   *   - `createTextNode`: 返回空对象的函数。
   *   - `getElementById`: 返回包含 `appendChild` 方法的空对象的函数。
   *   - `getElementsByTagName`: 返回空数组的函数。
   */
  initGlobal() {
    global.window = global.window || {
      location: {},
      document: {
        // location: {location}
        head: { appendChild: () => {} },
        createElement: () => ({ appendChild: () => {} }),
        createTextNode: () => ({}),
        getElementById: () => ({ appendChild: () => {} }),
        getElementsByTagName: () => [],
      },
    };
    global.document = global.document || {
      // location: {location}
      head: { appendChild: () => {} },
      createElement: () => ({ appendChild: () => {} }),
      createTextNode: () => ({}),
      getElementById: () => ({ appendChild: () => {} }),
      getElementsByTagName: () => [],
    };
  }

  /**
   * 初始化 Build Worker 实例。
   *
   * @returns {Promise<{ success: boolean }>} 返回一个包含 success 属性的对象，表示初始化是否成功。
   */
  async initBuildWorker() {
    /** step1: 初始化虚拟文件模块 */
    this.vfs = await VirtualFileSystem.init();

    /** step2: 初始化 Browserify 构建工具 */
    this.browserifyBuild = new BrowserifyBuild(BuildType.ESBUILD, this.vfs);

    /** step3: 初始化日志记录器 */
    this.logger = new Logger();

    /** step4: 初始化全局对象 */
    this.initGlobal();

    /** step5: 初始化 less */
    this.less = require('less');

    return { success: true };
  }

  /**
   * 处理构建命令的异步方法。
   *
   * 此方法尝试获取 `webcontainerInstance` 的 `browserifyBuild` 实例，
   * 如果存在，则运行构建过程并记录日志流。
   * 构建完成后，发送包含 "Build completed" 的消息。
   *
   * @returns {Promise<void>} 构建完成后返回一个 Promise。
   * @throws {Error} 如果构建过程中发生错误，则捕获异常。
   */
  async buildCommand(buildConfig?: Record<string, any>) {
    try {
      if (this.browserifyBuild && this.logger && this.less) {
        await this.browserifyBuild.runBuild(
          buildConfig,
          this.logger.logStream,
          this.less
        );
        return { success: true };
      } else {
        throw new Error('browserifyBuild 或 logger 未初始化');
      }
    } catch (e) {
      // 处理错误
    }
  }

  /**
   * 停止当前的 WebContainer 实例。
   *
   * 该方法执行以下操作：
   * 1. 完成 RxJS 流。
   * 2. 取消所有订阅。
   * 3. 清理 WebContainer 实例。
   *
   * 调用此方法后，WebContainer 实例将被设置为 null，并且所有相关的 RxJS 流和订阅将被关闭。
   *
   * @memberof WebContainer
   */
  stop() {
    /** step1: 完成 RxJS 流 */
    this.logger?.stop();

    /** step2: 将虚拟文件系统 (vfs) 设置为 null */
    this.vfs = null;
    this.browserifyBuild = null;

    console.log('[@ke/webContainer] RxJS 流和 Worker 已关闭');
  }
}

// 将实例方法暴露为普通对象的方法
const buildWorker = new BuildWorker();

/**
 * @constant
 * @namespace exposedMethods
 * @description 提供对 webContainerWorker 的方法暴露。
 *
 * @property {Function} init 初始化 webContainerWorker。
 * @property {Function} runCommand 运行指定命令。
 * @param {string} command 要运行的命令。
 * @param {string[]} args 命令的参数。
 *
 * @property {Function} subscribeLogStream 订阅日志流。
 *
 * @property {Function} stop 停止 webContainerWorker。
 */
const exposedMethods = {
  init: () => buildWorker.initBuildWorker(),
  build: (buildConfig?: Record<string, any>) =>
    buildWorker.buildCommand(buildConfig),
  subscribeLogStream: () => buildWorker.subscribeLogStream(), // 暴露日志流
  stop: () => buildWorker.stop(), // 暴露停止方法
};

expose(exposedMethods);
