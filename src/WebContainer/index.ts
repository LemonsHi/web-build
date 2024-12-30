import { BuildOptions } from 'esbuild-wasm';
import { Buffer } from 'buffer';

import { BrowserifyBuild, BuildType } from '@/BrowserifyBuild';
import { MAX_WORKER_NUM, ROOT_DIR } from '@/constants';
import { PackageManager } from '@/PackageManager';
import { SpawnManager } from '@/SpawnManager';
import { VirtualFileSystem } from '@/VirtualFileSystem';
import { ILogItem } from '@/types';

export interface IFile {
  [filePath: string]: {
    fileType: 'document' | 'directory';
    content?: string;
    children?: IFile;
  };
}

export interface WebContainerConfig {
  maxWorkers?: number;
  rootDir?: string;
  clearRootDir?: boolean;
  clearDistDir?: boolean;
  clearCache?: boolean;
  externalPath?: string[];
}

/**
 * WebContainer 类用于管理虚拟文件系统、包管理器和构建工具。
 */
export class WebContainer {
  /**
   * 虚拟文件系统实例。
   */
  public fs: VirtualFileSystem;

  /**
   * 静态虚拟文件系统实例。
   */
  private static vfs: VirtualFileSystem;

  /**
   * 包管理器实例。
   */
  private packageManager: PackageManager;

  /**
   * Browserify 构建工具实例。
   */
  private browserifyBuild: BrowserifyBuild;

  /**
   * 最大 Worker 数量。
   */
  private maxWorkers: number;

  /**
   * 根目录。
   */
  private rootDir: string;

  /**
   * 构造函数，初始化 WebContainer 实例。
   *
   * @param vfs - 虚拟文件系统实例。
   */
  constructor(vfs: VirtualFileSystem, rootDir: string, maxWorkers?: number) {
    /** 初始化虚拟文件系统 */
    this.fs = vfs;

    /** 初始化根目录 */
    this.rootDir = rootDir;

    /** 初始化最大 Worker 数量 */
    const defaultMaxWorkers = navigator.hardwareConcurrency || MAX_WORKER_NUM;
    this.maxWorkers = maxWorkers || defaultMaxWorkers;

    /** 初始化包管理器 */
    this.packageManager = new PackageManager(vfs);

    /** 初始化 Browserify 构建工具 */
    this.browserifyBuild = new BrowserifyBuild(BuildType.ESBUILD, vfs);

    /** 初始化 Buffer */
    window && (window.Buffer = Buffer);

    console.log('[@ke/webContainer] 容器初始化成功！！');
  }

  /**
   * 异步启动 Web 容器的方法。
   *
   * @returns {Promise<WebContainer>} 返回一个 Promise，解析为 Web 容器实例。
   * @throws {Error} 如果初始化 Web 容器失败，则抛出错误。
   *
   * @example
   * ```typescript
   * const webContainer = await WebContainer.boot();
   * ```
   */
  static async boot(webContainerConfig?: WebContainerConfig) {
    try {
      /** step1: 初始化虚拟文件模块 */
      this.vfs = await VirtualFileSystem.init();

      /** step2: 创建根目录 */
      const rootDir = webContainerConfig?.rootDir || ROOT_DIR;

      /** step4: 清空根目录 */
      webContainerConfig?.clearRootDir &&
        (await this.vfs.exists(rootDir)) &&
        (await this.empty(rootDir, webContainerConfig?.externalPath));

      /** step5: 创建根目录 */
      await this.vfs.mkdir(rootDir, { recursive: true });

      /** step6: 清空 dist 目录 */
      webContainerConfig?.clearDistDir &&
        (await this.vfs.exists(`${rootDir}/dist`)) &&
        (await this.empty(`${rootDir}/dist`));

      /** step7: 清空缓存 */
      if (webContainerConfig?.clearCache) {
        const depCacheExists = await this.vfs.exists(`${rootDir}/.depCache`);
        const installCacheExists = await this.vfs.exists(
          `${rootDir}/.installCache`
        );

        depCacheExists && (await this.vfs.deleteFile(`${rootDir}/.depCache`));
        installCacheExists &&
          (await this.vfs.deleteFile(`${rootDir}/.installCache`));
      }

      /** step8: 返回 Web 容器实例 */
      return new WebContainer(
        this.vfs,
        rootDir,
        webContainerConfig?.maxWorkers
      );
    } catch (e: any) {
      throw new Error(`初始化 Web 容器失败: ${e?.message}`);
    }
  }

  /**
   * 清空指定目录的内容。
   *
   * @param dirPath - 要清空的目录路径。
   * @param external - 可选参数，外部资源数组。
   * @returns 如果操作失败，返回一个被拒绝的 Promise。
   */
  static async empty(dirPath: string, external?: string[]) {
    try {
      await this.vfs.empty(dirPath, external);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 清空指定目录的内容。
   *
   * @param dirPath - 要清空的目录路径。
   * @param external - 可选参数，外部资源数组。
   * @returns 如果操作失败，返回一个被拒绝的 Promise。
   */
  async clearDir(dirPath: string, external?: string[]) {
    try {
      await this.fs.empty(dirPath, external);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 挂载文件到指定路径。
   *
   * @param files - 要挂载的文件对象，包含文件类型、内容和子文件。
   * @param path - 可选的路径，默认为空字符串。
   * @returns 一个 Promise，当所有文件和目录都被写入时解决。
   */
  public async mount(files: IFile, path?: string) {
    const fileNames = Object.keys(files);
    const _path = path || this.rootDir;

    for (let i = 0, { length } = fileNames; i < length; i++) {
      const { fileType, content = '', children } = files[fileNames[i]];

      if (fileType === 'document') {
        await this.fs.writeFile(`${_path}/${fileNames[i]}`, content);
      } else if (fileType === 'directory') {
        await this.fs.mkdir(`${_path}/${fileNames[i]}`, { recursive: true });
        children && (await this.mount(children, `${_path}/${fileNames[i]}`));
      }
    }
  }

  /**
   * 异步执行指定命令。
   *
   * @param command - 要执行的命令，例如 'npm' 或 'echo'。
   * @param args - 命令的参数数组（可选）。
   * @param subscribe - 一个回调函数，用于接收命令执行过程中的日志输出（可选）。
   * @returns 一个 Promise，表示命令执行的结果。
   */
  public async spawn(
    command: string,
    args?: string[],
    subscribe?: (log: ILogItem) => void,
    config?: BuildOptions
  ) {
    switch (command) {
      case 'npm': {
        return new SpawnManager(
          'npm',
          [...(args || [])],
          this.fs,
          this.rootDir,
          this.maxWorkers
        ).startManage(config, subscribe);
      }
      case 'echo': {
        // return new Spawn('echo', [...(args || [])]).startManage(subscribe);
      }
    }
  }

  /**
   * 获取当前的包管理器实例。
   *
   * @returns 返回当前的包管理器实例。
   */
  public getPackageManager() {
    return this.packageManager;
  }

  /**
   * 获取 Browserify 构建实例。
   *
   * @returns 返回 Browserify 构建实例。
   */
  public getBrowserifyBuild() {
    return this.browserifyBuild;
  }
}
