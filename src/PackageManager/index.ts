import pako from 'pako';
import tar from 'tar-stream';
import semver from 'semver';
import { Subject } from 'rxjs';
import path from 'path-browserify';

import { VirtualFileSystem } from '@/VirtualFileSystem';

import { skipPackages } from './constants';

import { Logger } from '../Logger';
import { ROOT_DIR } from '../constants';
import { ILogItem } from '../types';

/**
 * PackageManager 类用于管理虚拟文件系统中的依赖包。
 * 它提供了安装依赖包、获取包元数据、下载并解压 tarball 文件等功能。
 *
 * @remarks
 * 该类的主要功能包括：
 * - 获取指定包的元数据。
 * - 下载并解压 tarball 文件。
 * - 安装指定的依赖包及其依赖项。
 */
export class PackageManager {
  private vfs: VirtualFileSystem;
  private cachePackages: Set<string>;
  private installedPackages: Set<string>;

  constructor(vfs: VirtualFileSystem) {
    this.vfs = vfs;
    this.installedPackages = new Set();
    this.cachePackages = new Set();
  }

  /**
   * 获取指定包的元数据。
   *
   * @param packageName - 包的名称。
   * @param version - 包的版本，默认为 'latest'。
   * @returns 一个包含包元数据的 Promise 对象。
   * @throws 如果无法获取包信息，则抛出错误。
   */
  private async getPackageMetadata(
    packageName: string,
    version: string = 'latest',
    options?: Record<string, string>
  ): Promise<any> {
    try {
      /** step1: 获取依赖包元信息 */
      const encodedPackageName = encodeURIComponent(packageName);
      const url = `${
        options?.registry || 'https://registry.npmjs.org'
      }/${encodedPackageName}/${version.replace(/^[~^]/, '')}`;
      const response = await fetch(url);

      /** step2: 获取失败报错 */
      if (!response.ok) {
        throw new Error(
          `无法获取包信息：${response.status} ${response.statusText}`
        );
      }

      /** step3: 返回元信息 */
      const metadata = await response.json();
      return metadata;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary); // 浏览器内置的 Base64 编码方法
  }

  /**
   * 下载并解压 tarball 文件。
   *
   * @param tarballUrl - tarball 文件的 URL。
   * @param packageName - 包的名称。
   * @returns 一个 Promise 对象，在操作完成时解析为 void。
   * @throws 如果下载 tarball 失败，则抛出错误。
   */
  private async downloadAndExtractTarball(
    rootDir: string,
    tarballUrl: string,
    packageName: string
  ): Promise<void> {
    try {
      /** step1: 下载 tarball */
      const response = await fetch(tarballUrl);

      /** step2: 下载失败报错 */
      if (!response.ok) {
        throw new Error(
          `无法下载 tarball：${response.status} ${response.statusText}`
        );
      }

      /** step3: 解压 tarball */
      const arrayBuffer = await response.arrayBuffer();
      const untarredFiles = await this.untarGzip(arrayBuffer);

      /** step4: 将解压后的文件写入虚拟文件系统 */
      for (const file of untarredFiles) {
        const filePath = `${
          rootDir ? `${rootDir}` : ''
        }/node_modules/${packageName}/${file.path}`;

        // 确保目录存在
        await this.vfs.mkdir(
          file.type === 'directory' ? file.type : path.dirname(filePath),
          { recursive: true }
        );

        // 写入文件
        file.type !== 'directory' &&
          (await this.vfs.writeFile(
            filePath,
            file.content,
            file?.isImage ? 'binary' : 'utf-8'
          ));
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 判断文件是否为二进制类型（例如图片）。
   *
   * @param type - tar 头信息中的类型字段。
   * @param path - 文件的相对路径。
   * @returns 如果是二进制类型则返回 true，否则返回 false。
   */
  private isBinaryType(type: string | undefined | null, path: string): boolean {
    if (!type) return false;

    // 基于 tar 头信息的类型字段判断
    const binaryTypes = ['file', 'image', 'application']; // 根据需要扩展
    if (binaryTypes.includes(type.toLowerCase())) {
      // 基于文件扩展名判断
      const binaryExtensions = [
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.bmp',
        '.webp',
        '.svg',
        '.ico',
      ];
      return binaryExtensions.some((ext) => path.toLowerCase().endsWith(ext));
    }
    return false;
  }

  /**
   * 解压 gzip 格式的 ArrayBuffer 并返回包含文件路径和内容的数组。
   * 对于图片等二进制文件，使用 Uint8Array 存储内容。
   *
   * @param arrayBuffer - 要解压的 gzip 格式的 ArrayBuffer。
   * @returns 一个 Promise，解析为包含文件路径和内容的对象数组。
   */
  private async untarGzip(arrayBuffer: ArrayBuffer): Promise<
    Array<{
      path: string;
      content: string | Buffer;
      type: string | undefined | null;
      isImage?: boolean;
    }>
  > {
    /** step1: 解压 gzip */
    const gunzippedData = pako.ungzip(new Uint8Array(arrayBuffer));

    /** step2: 初始化 tar 解压器 */
    const extract = tar.extract();
    const files: Array<{
      path: string;
      content: string | Buffer;
      type: string | undefined | null;
      isImage?: boolean;
    }> = [];

    /** step3: 开始解压 */
    return new Promise((resolve, reject) => {
      /** step3.1: 监听 entry 事件  */
      extract.on('entry', (header, stream, next) => {
        const chunks: Uint8Array[] = [];

        /** step3.1.1: 将数据块收集到 chunks 数组中 */
        stream.on('data', (chunk) => chunks.push(chunk));

        /** step3.1.2: 表示文件内容已经读取完毕，进行后续处理 */
        stream.on('end', () => {
          const totalLength = chunks.reduce(
            (sum, chunk) => sum + chunk.length,
            0
          );
          const merged = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }

          const relativePath = header.name.replace(/^package\//, '');
          let content: string | Buffer;
          let isImage = false;

          // 判断文件类型是否为图片或其他二进制类型
          if (this.isBinaryType(header.type, relativePath)) {
            // 对于二进制文件，直接使用 Uint8Array
            content = Buffer.from(merged);
            isImage = true;
          } else {
            // 对于文本文件，使用 TextDecoder 解码为字符串
            content = new TextDecoder('utf-8').decode(merged);
          }

          files.push({
            path: relativePath,
            content,
            type: header.type,
            isImage,
          });
          next();
        });

        /** step3.1.3: 监听错误事件 */
        stream.on('error', (err) => reject(err));
      });

      /** step3.2: 监听 finish 事件  */
      extract.on('finish', () => resolve(files));

      /** step3.3: 监听 error 事件  */
      extract.on('error', (err) => reject(err));

      /** step3.4: 开始解压  */
      extract.end(gunzippedData);
    });
  }

  /**
   * 解析依赖版本为具体版本号
   * @param packageName 包名
   * @param versionRange 版本范围（如：^1.0.0, ~2.1.3, >=1.2.0 <2.0.0）
   * @returns 符合范围的最新版本号
   */
  private async resolveDependencyVersion(
    packageName: string,
    versionRange: string,
    options?: Record<string, string>
  ) {
    try {
      /** step1: 获取 NPM registry 中的包信息 */
      const url = `${
        options?.registry || 'https://registry.npmjs.org'
      }/${encodeURIComponent(packageName)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`无法获取 ${packageName} 的元数据`);
      }

      /** step2: 获取所有版本号 */
      const metadata = await response.json();
      const versions = Object.keys(metadata.versions); // 获取所有版本号

      /** step3: 使用 semver 找到满足版本范围的最新版本 */
      const resolvedVersion = semver.maxSatisfying(versions, versionRange);
      if (!resolvedVersion) {
        throw new Error(`未找到符合版本范围 "${versionRange}" 的版本`);
      }

      return {
        packageName,
        resolvedVersion,
        dependencies: metadata.versions?.[resolvedVersion]?.dependencies,
        tarballUrl: metadata.versions?.[resolvedVersion]?.dist.tarball,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 安装指定的依赖包
   */
  public async installPackage(
    rootDir: string = ROOT_DIR,
    packageInfo: [string, string, string],
    options?: Record<string, string>,
    logStream?: Subject<ILogItem>
  ): Promise<void | [string, string][]> {
    const [pkgName, pkgVersion = 'latest', tarballUrl] = packageInfo;
    try {
      /** step1: 共享内存 */
      const key = `${pkgName}@${pkgVersion}`;

      /** step2: 检查依赖是否已安装 */
      if (
        // (sharedArray && SharedHashMap.has(pkgName, MAX_SIZE, sharedArray)) ||
        this.installedPackages.has(pkgName) ||
        skipPackages.some((pkg) => pkgName.includes(pkg))
      ) {
        logStream && Logger.log(logStream, `hit cache ${key}`);
        return;
      }

      /** step4: 标记为安装中 */
      this.installedPackages.add(pkgName);

      /** step5: 下载并解压依赖 */
      const _talballUrl =
        tarballUrl ||
        (await this.getPackageMetadata(pkgName, pkgVersion, options)).dist
          .tarball;

      await this.downloadAndExtractTarball(rootDir, _talballUrl, pkgName);

      logStream &&
        Logger.log(
          logStream,
          `install npm done ${key}: ${pkgName}@${pkgVersion}`
        );
    } catch (error: any) {
      logStream &&
        Logger.log(
          logStream,
          `安装失败：${pkgName}@${pkgVersion}，错误信息：${error.message}`,
          'error'
        );
      throw new Error(`安装失败：${pkgName}@${pkgVersion}，${error.message}`);
    }
  }

  /** 依赖分析 */
  async dependenciesAnylysis(
    pkgInfo: [string, string],
    options?: Record<string, string>,
    logStream?: Subject<ILogItem>
  ) {
    const [pkgName, pkgVersion = 'latest'] = pkgInfo || [];
    try {
      if (this.cachePackages.has(pkgName)) {
        return;
      }

      /** step1: 解析版本号 */
      logStream && Logger.log(logStream, `开始分析: ${pkgName}`);
      const mateData = await this.resolveDependencyVersion(
        pkgName,
        pkgVersion,
        options
      );

      /** step3: 分析子依赖 */
      const depNames = Object.keys(mateData?.dependencies || {});
      logStream && Logger.log(logStream, `分析结束: ${pkgName}`);

      return {
        currentNpmInfo: [
          mateData.packageName,
          mateData.resolvedVersion,
          mateData.tarballUrl,
        ],
        dependencies: depNames.map<[string, string]>((depName) => [
          depName,
          mateData?.dependencies?.[depName],
        ]),
      };
    } catch (e: any) {
      throw new Error(`依赖分析失败：${e.message || e?.toString?.()}`);
    }
  }
}
