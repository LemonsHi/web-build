import * as esbuild from 'esbuild-wasm';
import { Subject } from 'rxjs';

import { VirtualFileSystem } from '@/VirtualFileSystem';
import { ROOT_DIR } from '@/constants';
import { ILogItem } from '@/types';

import { DEFAULT_ESBUILD_WASM_URL } from './constants';
import { esbuildConfig } from './configs';

/**
 * 枚举类型 `BuildType` 表示构建工具的类型。
 *
 * @enum {string}
 * @property {string} ESBUILD - 表示使用 esbuild 作为构建工具。
 */
export enum BuildType {
  ESBUILD = 'esbuild',
}

export class BrowserifyBuild {
  /**
   * 编译工具类型。
   */
  private buildType: BuildType;

  /**
   * 虚拟文件系统实例。
   */
  private vfs: VirtualFileSystem;

  /**
   * 初始化完成的 Promise 对象。
   */
  private initializeComplete: Promise<void>;

  /**
   * less 编译器实例。
   */
  private less?: LessStatic = undefined;

  /**
   * 日志流。
   */
  private logStream?: Subject<ILogItem> = undefined;

  constructor(buildType: BuildType, vfs: VirtualFileSystem) {
    this.buildType = buildType;
    this.vfs = vfs;

    /**  初始化 esbuild */
    this.initializeComplete = esbuild.initialize({
      wasmURL: DEFAULT_ESBUILD_WASM_URL,
      worker: true,
    });
  }

  /**
   * 获取默认的构建配置。
   *
   * 根据构建类型返回相应的默认配置。
   *
   * @returns {object} 默认的构建配置对象。
   */
  private getDefaultBuildConfig(
    rootDir: string = ROOT_DIR,
    buildConfig?: esbuild.BuildOptions
  ) {
    switch (this.buildType) {
      case BuildType.ESBUILD: {
        return {
          ...esbuildConfig({
            rootDir,
            esbuildConfig: buildConfig,
            vfs: this.vfs,
            logStream: this.logStream,
            less: this.less,
          }),
        };
      }
    }
  }

  /**
   * 使用 esbuild 进行构建的方法。
   *
   * @param {Record<string, any>} [buildConfig] - 可选的构建配置对象，覆盖默认配置。
   * @returns {Promise<string | undefined>} 返回一个 Promise，解析为构建后的输出代码字符串，如果构建失败则返回一个被拒绝的 Promise。
   * @throws {Error} 如果构建过程中发生错误，将抛出错误。
   */
  private async esbuildBuild(buildConfig?: Record<string, any>) {
    try {
      const { rootDir = ROOT_DIR, ...rest } = buildConfig || {};

      /** step1: 等待初始化完成 */
      await this.initializeComplete;

      /** step2: 执行构建 */
      const result = await esbuild.build({
        ...this.getDefaultBuildConfig(rootDir, rest),
      });

      /** step3: 将构建后的代码写入虚拟文件系统 */
      await this.vfs.mkdir(`${rootDir}/dist`, { recursive: true });

      const readFileTasks: Promise<boolean>[] = [];
      for (let i = 0, { length } = result.outputFiles || []; i < length; i++) {
        const { path, text } = result.outputFiles?.[i] || {};
        console.log('构建结果：', path, text?.substring(0, 100));
        path &&
          readFileTasks.push(this.vfs.writeFile(path, text || '', 'utf-8'));
      }

      await Promise.all(readFileTasks);
      const cssContant = (await this.vfs.readFile(
        `${rootDir}/dist/app.css`
      )) as string;
      const jsContant = (await this.vfs.readFile(
        `${rootDir}/dist/app.js`
      )) as string;
      console.log(
        '构建结果 app.css - ',
        cssContant?.substring(0, 100),
        jsContant?.substring(0, 100)
      );
      return result;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 根据构建配置运行构建任务。
   *
   * @param buildConfig - 构建配置对象。
   * @returns 返回一个 Promise 对象，表示构建任务的结果。
   * @throws 当构建工具类型未知时，返回一个被拒绝的 Promise。
   */
  async runBuild(
    buildConfig?: Record<string, any>,
    logStream?: Subject<ILogItem>,
    lessLoader?: LessStatic
  ) {
    this.less = lessLoader;
    this.logStream = logStream;

    switch (this.buildType) {
      /** esbuil 编译 */
      case BuildType.ESBUILD: {
        return await this.esbuildBuild(buildConfig);
      }
      default:
        return Promise.reject(
          new Error(`未知的构建工具类型：${this.buildType}`)
        );
    }
  }
}
