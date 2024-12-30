import { expose } from 'threads/worker';
import { Buffer } from 'buffer';

import { VirtualFileSystem } from '@/VirtualFileSystem';
import { PackageManager } from '@/PackageManager';
import { Logger } from '@/Logger';

class InstallDependenciesWorker {
  /**
   * 静态虚拟文件系统实例。
   */
  private vfs: VirtualFileSystem | null = null;

  /**
   * 包管理器实例。
   */
  private packageManager: PackageManager | null = null;

  /**
   * 日志记录器实例。
   */
  private logger: Logger | null = null;

  private padding: boolean = false;

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
   * 初始化安装依赖项的工作器。
   *
   * @returns 一个包含成功状态的对象。
   *
   * 步骤：
   * 1. 初始化虚拟文件模块。
   * 2. 等待虚拟文件初始化完成。
   * 3. 初始化包管理器。
   * 4. 初始化日志记录器。
   */
  async initInstallDependenciesWorker() {
    /** step1: 初始化虚拟文件模块 */
    this.vfs = await VirtualFileSystem.init();

    /** step2: 初始化包管理器 */
    this.packageManager = new PackageManager(this.vfs);

    /** step3: 初始化日志记录器 */
    this.logger = new Logger();

    this.padding = false;

    return { success: true };
  }

  /**
   * 安装依赖项。
   *
   * @param dependencies - 一个包含两个字符串的数组，表示要安装的依赖项及其版本。
   * @param options - 一个包含安装选项的对象。
   * @param sharedArrayBuffer - 用于共享内存的 SharedArrayBuffer 实例。
   * @returns 一个 Promise，表示安装过程的完成。
   * @throws 如果安装过程中发生错误，则捕获并忽略异常。
   */
  async installDependencies(
    rootDir: string,
    dependencies: [string, string, string],
    options: Record<string, string>
  ) {
    try {
      if (!this.packageManager) {
        return;
      }
      const logStream = this.logger?.logStream;
      await this.packageManager.installPackage(
        rootDir,
        dependencies,
        options,
        logStream
      );
      return { success: true };
    } catch (e) {}
  }

  setPadding(padding: boolean) {
    this.padding = padding;
    return this.padding;
  }

  getPadding() {
    return this.padding;
  }

  /**
   * 停止当前操作。
   *
   * 该方法执行以下步骤：
   * 1. 完成 RxJS 流。
   * 2. 停止日志记录器。
   * 3. 将虚拟文件系统 (vfs) 设置为 null。
   * 4. 将包管理器 (packageManager) 设置为 null。
   *
   * 调用此方法后，RxJS 流和 Worker 将被关闭，并在控制台输出相关信息。
   */
  stop() {
    /** step1: 完成 RxJS 流 */
    this.logger?.stop();

    /** step2: 将虚拟文件系统 (vfs) 设置为 null */
    this.vfs = null;
    this.packageManager = null;

    console.log('[@ke/webContainer] RxJS 流和 Worker 已关闭');
  }
}

global && (global.Buffer = Buffer);

/**
 * 创建 WebContainer Worker 实例
 */
const installDependenciesWorker = new InstallDependenciesWorker();

/**
 * 暴露给主线程的方法
 */
const exposedMethods = {
  /** 初始化 WebContainer Worker */
  init: () => installDependenciesWorker.initInstallDependenciesWorker(),

  /** 日志监听 */
  subscribeLogStream: () => installDependenciesWorker.subscribeLogStream(),

  /** 停止 Worker */
  stop: () => installDependenciesWorker.stop(),

  /** 安装依赖 */
  installDependencies: (
    rootDir: string,
    dependencies: [string, string, string],
    options: Record<string, string>
  ) =>
    installDependenciesWorker.installDependencies(
      rootDir,
      dependencies,
      options
    ),

  setPadding: (padding: boolean) =>
    installDependenciesWorker.setPadding(padding),

  getPadding: () => installDependenciesWorker.getPadding(),
};

expose(exposedMethods);
