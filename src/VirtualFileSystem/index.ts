import { BFSRequire, configure, FileSystemConfiguration } from 'browserfs';
import browserResolve from 'browser-resolve';
import { ApiError } from 'browserfs/dist/node/core/api_error';
import { FSModule } from 'browserfs/dist/node/core/FS';
import Stats from 'browserfs/dist/node/core/node_fs_stats';
import path from 'path-browserify';
import resolve from 'browser-resolve';

/**
 * 虚拟文件系统类，用于在内存中模拟文件系统操作。
 * 提供文件的读写、删除和存在性检查等功能。
 */
export class VirtualFileSystem {
  private fs: FSModule;
  static fsPromise: FSModule;

  /**
   * 构造函数，初始化虚拟文件系统。
   *
   * - 如果 `fsPromise` 未定义，则创建一个新的 Promise 来配置文件系统。
   * - 配置完成后，将文件系统实例赋值给 `this.fs`。
   *
   * @constructor
   * @throws {ApiError} 如果配置过程中发生错误，则会拒绝 Promise 并抛出错误。
   */
  constructor(fs: FSModule) {
    this.fs = fs;
  }

  static async init(config?: FileSystemConfiguration) {
    try {
      this.fsPromise = await new Promise((resolve, reject) => {
        configure(
          { fs: config?.fs || 'IndexedDB', options: config?.options || {} },
          (err?: ApiError | null) => {
            if (err) {
              reject(err);
            } else {
              resolve(BFSRequire('fs'));
            }
          }
        );
      });
      return new VirtualFileSystem(this.fsPromise);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 检查文件系统是否已初始化。
   *
   * @returns 返回一个 Promise 对象，如果文件系统已初始化则 resolve FSModule，否则 reject 一个错误。
   */
  private async checkFs(): Promise<FSModule> {
    if (this?.fs) {
      return this.fs;
    }

    return Promise.reject(new Error('内存文件系统未初始化'));
  }

  /**
   * 异步写入文件内容到指定路径。
   *
   * @param filePath - 文件路径。
   * @param content - 要写入的内容。
   * @returns 一个表示操作完成的 Promise 对象。
   *
   * @throws 如果写入文件时发生错误，则返回一个被拒绝的 Promise。
   */

  async writeFile(filePath: string, content: any, encoding?: string | null) {
    const fs = await this.checkFs();

    const dirPath = await path.dirname(filePath);
    await this.mkdir(dirPath, { recursive: true });

    return await new Promise<boolean>((resolve, reject) => {
      fs.writeFile(
        filePath,
        content,
        encoding || 'utf8',
        async (err?: ApiError | null) => {
          if (err) {
            if (err.message.includes('EEXIST: File exists.')) {
              return resolve(true);
            }
            return reject(err);
          }
          return resolve(true);
        }
      );
    });
  }

  /**
   * 异步读取文件内容。
   *
   * @param filePath - 要读取的文件路径。
   * @returns 返回一个 Promise 对象，解析为文件内容的字符串或 undefined。
   * 如果读取过程中发生错误，Promise 将被拒绝并返回错误信息。
   *
   * @throws 如果在获取 fs 对象或读取文件时发生错误，将抛出相应的错误。
   */
  async readFile(
    filePath: string,
    encoding?: string | null
  ): Promise<string | Buffer | undefined> {
    try {
      /** step1: 获取 fs 对象 */
      const fs = await this.checkFs();

      /** step2: 读取文件 */
      return new Promise((resolve, reject) => {
        fs.readFile(
          filePath,
          encoding || 'utf8',
          async (err?: ApiError | null, data?: string) => {
            if (err) {
              // const dirPath = path.dirname(filePath);
              // const files = await this.readdir(dirPath);

              return reject(err);
            }
            return resolve(data);
          }
        );
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 删除指定路径的文件。
   *
   * @param filePath - 要删除的文件路径。
   * @returns 一个表示删除操作的 Promise 对象。
   * @throws 如果删除文件时发生错误，则返回错误信息。
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      /** step1: 获取 fs 对象 */
      const fs = await this.checkFs();

      /** step2: 删除文件 */
      return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err?: ApiError | null) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 检查指定路径的文件是否存在。
   *
   * @param filePath - 要检查的文件路径。
   * @returns 一个 Promise，解析为布尔值，表示文件是否存在。
   * @throws 如果在获取 fs 对象或检查文件时发生错误，则返回一个被拒绝的 Promise。
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      /** step1: 获取 fs 对象 */
      const fs = await this.checkFs();

      /** step2: 检查文件是否存在 */
      return new Promise((resolve, reject) => {
        fs.exists(filePath, (exists) => {
          if (exists) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 创建目录的方法。
   *
   * @param dirPath - 要创建的目录路径。
   * @param options - 可选参数，支持 recursive（是否递归创建）属性。
   * @returns 一个表示操作完成的 Promise 对象。
   * @throws 如果创建目录时发生错误，则返回一个被拒绝的 Promise。
   */
  async mkdir(
    dirPath: string,
    options: { recursive?: boolean } = {}
  ): Promise<void> {
    try {
      // step1: 获取 fs 对象
      const fs = await this.checkFs();
      const _dirPath = dirPath;

      // step2: 判断是否需要递归创建
      if (options.recursive) {
        const parts = _dirPath.split('/').filter(Boolean);
        for (let i = 1; i <= parts.length; i++) {
          const subPath = parts.slice(0, i).join('/');
          const exists = await this.exists(subPath);
          !exists && (await this.mkdir(subPath)); // 递归创建每一级目录
        }
        return;
      }

      // step3: 调用 mkdir 方法
      return new Promise((resolve, reject) => {
        fs.mkdir(_dirPath, 0o777, (err?: ApiError | null) => {
          if (err) {
            // return reject(err);
            return resolve();
          }
          resolve();
        });
      });
    } catch (e) {
      console.error(`创建目录失败: ${dirPath}`, e);
      return Promise.reject(e);
    }
  }

  /**
   * 异步读取指定路径下的目录内容。
   *
   * @param path - 要读取的目录路径。
   * @returns 返回一个包含目录内容的 Promise 数组。
   * @throws 如果读取目录时发生错误，则返回一个拒绝的 Promise。
   */
  async readdir(path: string): Promise<string[]> {
    const fs = await this.checkFs(); // 确保文件系统已初始化
    return new Promise((resolve, reject) => {
      fs.readdir(path, (err, files) => {
        if (err) {
          return reject(err);
        }
        resolve(files || []);
      });
    });
  }

  async stats(path: string) {
    const fs = await this.checkFs();

    const stats = await new Promise<Stats | undefined>((resolve, reject) =>
      fs.stat(path, (err, stats) => (err ? reject(err) : resolve(stats)))
    );

    return stats;
  }

  async isFile(path: string) {
    const fs = await this.checkFs();

    const stats = await new Promise<Stats | null | undefined>(
      (resolve, reject) =>
        fs.stat(path, (err, stats) => (err ? resolve(null) : resolve(stats)))
    );

    return stats?.isFile();
  }

  async isDirectory(path: string) {
    const fs = await this.checkFs();

    const stats = await new Promise<Stats | null | undefined>(
      (resolve, reject) =>
        fs.stat(path, (err, stats) => (err ? resolve(null) : resolve(stats)))
    );

    return stats?.isDirectory();
  }

  /**
   * 删除目录及其内容
   *
   * @param dirPath - 要删除的目录路径
   * @throws {Error} 如果目录删除失败
   */
  async empty(dirPath: string, external?: string[]) {
    const fs = await this.checkFs();

    // 内部递归删除函数
    const deleteRecursively = async (path: string): Promise<void> => {
      if (external?.includes(path)) return;
      const stats = await new Promise<Stats | undefined>((resolve, reject) =>
        fs.stat(path, (err, stats) => (err ? reject(err) : resolve(stats)))
      );

      if (stats?.isDirectory()) {
        const files = await new Promise<string[] | undefined>(
          (resolve, reject) =>
            fs.readdir(path, (err, files) =>
              err ? reject(err) : resolve(files)
            )
        );

        if (!files) return;

        // 递归删除子文件和子目录
        for (const file of files) {
          await deleteRecursively(`${path}/${file}`);
        }

        const delFiles = await new Promise<string[] | undefined>(
          (resolve, reject) =>
            fs.readdir(path, (err, files) =>
              err ? reject(err) : resolve(files)
            )
        );

        if (delFiles && delFiles.length) return;

        // 删除空目录
        await new Promise<void>((resolve, reject) =>
          fs.rmdir(path, (err) => (err ? reject(err) : resolve()))
        );
      } else {
        if (external?.includes(path)) return;
        // 删除文件
        await new Promise<void>((resolve, reject) =>
          fs.unlink(path, (err) => (err ? reject(err) : resolve()))
        );
      }
    };

    // 开始删除
    try {
      await deleteRecursively(dirPath);
    } catch (err: any) {
      return Promise.reject(err);
    }
  }

  /**
   * 异步解析路径方法。
   *
   * @param rootDir - 根目录路径。
   * @param pkgName - 包名称。
   * @returns 返回一个解析后的路径字符串的 Promise。
   * @throws 如果在解析过程中发生错误，则返回一个被拒绝的 Promise。
   */
  async reslovePath(rootDir: string, pkgName: string, config?: resolve.Opts) {
    try {
      const fs = await this.checkFs();
      return await new Promise<string>((resolve, reject) => {
        browserResolve(
          pkgName,
          {
            basedir: rootDir,
            packageFilter: (pkg, pkgdir) => {
              if (pkg.module) {
                // 优先使用 module 字段
                pkg.main = pkg.module;
              } else if (!pkg.main) {
                // 如果没有 main 字段，默认使用 index.js
                pkg.main = 'index.js';
              }
              return pkg;
            },
            ...config,
            isFile: (file, cb) => {
              fs.stat(file, (err, stats) => {
                if (err) {
                  return cb(null, false);
                }
                cb(null, !!stats?.isFile());
              });
            },
            isDirectory: (directory, cb) => {
              fs.stat(directory, (err, stats) => {
                if (err) {
                  return cb(null, false);
                }
                cb(null, !!stats?.isDirectory());
              });
            },
            realpath: (file, cb) => {
              // BrowserFS 不支持符号链接，直接返回原路径
              cb(null, file);
            },
            readFile: (file, cb) => {
              fs.readFile(file, 'utf8', (err, data) => {
                if (err) {
                  return cb(err);
                }
                cb(null, data);
              });
            },
          },
          (error, resolvedPath) => {
            if (error) {
              reject(error);
            } else {
              resolve(resolvedPath || '');
            }
          }
        );
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
