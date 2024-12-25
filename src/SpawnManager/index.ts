import { spawn as threadSpawn, Thread } from 'threads';
import { findIndex, findLastIndex, uniq, uniqBy } from 'lodash';

import BuildWorker from 'worker-loader!../workers/build.worker.ts';
import InstallWorker from 'worker-loader!../workers/install.worker.ts';
import NpmWorker from 'worker-loader!../workers/npm.worker.ts';

import { MAX_WORKER_NUM } from '@/constants';
import { VirtualFileSystem } from '@/VirtualFileSystem';

import { anylysisTask, installTask } from './utils';
import { ILogItem } from '@/types';

/**
 * Spawn 类用于创建和管理 Worker 线程。
 */
export class SpawnManager {
  private worker: any;

  /**
   * 安装缓存路径
   */
  private installCacheFilePath: string;

  /**
   * 依赖分析结果缓存
   */
  private depCache: string;

  constructor(
    private command: string,
    private args: string[] = [],
    private vfs: VirtualFileSystem,
    private rootDir: string,
    private maxWorkers: number
  ) {
    this.depCache = `${this.rootDir}/.depCache`;
    this.installCacheFilePath = `${this.rootDir}/.installCache`;
  }

  /**
   * 启动管理方法，根据传入的配置和订阅函数执行相应的操作。
   *
   * @param config - 可选的配置对象，包含任意键值对。
   * @param subscribe - 可选的订阅函数，用于接收日志信息。
   * @returns 如果命令包含 'install'，则启动工作器；如果命令为 'run build'，则启动构建过程。
   * @throws 如果执行过程中发生错误，则返回一个被拒绝的 Promise。
   */
  async startManage(
    config?: Record<string, any>,
    subscribe?: (log: ILogItem) => void
  ) {
    try {
      if (this.args.join(' ').includes('install')) {
        return this.startWorkers(subscribe);
      }
      if (this.args.join(' ') === 'run build') {
        return await this.startBuild(
          { ...config, rootDir: this.rootDir },
          subscribe
        );
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 启动方法，执行一系列步骤来创建和管理 Worker。
   *
   * @param subscribe - 可选的日志订阅函数，用于接收日志信息。
   *
   * @throws 如果在任何步骤中发生错误，将会抛出异常。
   *
   * 步骤：
   * 1. 创建 Worker 实例。
   * 2. 初始化 Worker。
   * 3. 订阅日志流（如果提供了 subscribe 函数）。
   * 4. 执行命令。
   * 5. 关闭 Worker。
   */
  async startBuild(
    config?: Record<string, any>,
    subscribe?: (log: ILogItem) => void
  ) {
    try {
      /** step1: 创建 Worker */
      this.worker = await threadSpawn(new BuildWorker());

      /** step2: 初始化 Worker */
      await this.worker.init();

      /** step3: 订阅日志流 */
      subscribe && this.worker.subscribeLogStream().subscribe(subscribe);

      /** step4: 执行命令 */
      await this.worker.build(config);

      /** step5: 关闭 Worker */
      await this.worker.stop();
      await this.stop();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 停止当前的 worker 线程。
   *
   * 如果存在 worker 线程，则尝试终止该线程。
   * 终止成功后，输出日志信息。
   * 如果终止过程中发生错误，则返回一个被拒绝的 Promise。
   *
   * @returns {Promise<void>} 一个表示终止操作的 Promise。
   */
  async stop() {
    if (this.worker) {
      try {
        await Thread.terminate(this.worker);
        console.log('[@ke/webContainer] build worker 已终止');
      } catch (e) {
        return Promise.reject(e);
      }
    }
  }

  /**
   * 解析命令行参数并返回一个包含参数键值对的对象。
   *
   * @returns 一个包含参数键值对的对象。如果没有匹配到参数，则返回一个空对象。
   */
  private getArgsObject() {
    const match = this.args?.[1]?.match(/--([a-zA-Z\-]+)=(.+)/);
    const options = match ? { [match[1]]: match[2] } : {};

    return options;
  }

  /**
   * 批量安装依赖
   * @param subscribe
   */
  async startWorkers(subscribe?: (log: ILogItem) => void) {
    /** step1: 开始时间节点 */
    const startTime = new Date().getTime();

    /** step2: 依赖分析 */
    const depList = await this.chunkDependencies();

    /** step2.1: 依赖分析缓存 */
    const depCacheJson = JSON.stringify(depList);
    await this.vfs.writeFile(this.depCache, depCacheJson, 'utf-8');

    /** step3: 依赖安装 */
    await this.installDependencies(depList, subscribe);

    /** step3.1: 安装缓存 */
    const installCacheJson = JSON.stringify(depList.map((item) => item[0]));
    await this.vfs.writeFile(
      this.installCacheFilePath,
      installCacheJson,
      'utf-8'
    );

    console.log(
      `[@ke/webContainer] 依赖安装完成，共耗时: ${
        new Date().getTime() - startTime
      }ms`
    );
  }

  /**
   * 按块划分依赖并处理依赖任务的异步方法。
   *
   * @param subscribe - 可选的日志订阅函数，用于接收日志信息。
   * @returns 返回一个包含依赖信息的数组。
   *
   * @remarks
   * 该方法执行以下步骤：
   * 1. 读取 package.json 文件。
   * 2. 读取 dependencies 依赖。
   * 3. 按块划分依赖。
   * 4. 初始化 worker。
   * 5. 获取空闲 Worker 并执行任务。
   * 6. 等待任务队列为空或达到最大 worker 数量。
   * 7. 停止所有 worker。
   *
   * @example
   * ```typescript
   * const dependencies = await chunkDependencies((log) => console.log(log));
   * console.log(dependencies);
   * ```
   */
  private async chunkDependencies(subscribe?: (log: ILogItem) => void) {
    /** step1: 读取 package.json 文件 */
    const packageJson = (await this.vfs.readFile(
      `${this.rootDir}/package.json`
    )) as string;

    /** step2: 读取 dependencies 依赖 */
    const dependencies = (JSON.parse(packageJson!)?.dependencies ||
      {}) as Record<string, string>;

    /** step3: 按块划分依赖 */
    const chunks = Object.keys(dependencies).map<[string, string]>(
      (depName) => [depName, dependencies[depName]]
    );

    const maxWorkers = this.maxWorkers || MAX_WORKER_NUM;
    const workerPromises: { id: string; pro: Promise<any> }[] = [];

    let taskQueue = [...chunks];
    let depList: [string, string, string][] = [];
    let runningCache: string[] = [];

    /** step4: 初始化worker */
    const workers = await this.initWorker(maxWorkers, NpmWorker, subscribe);

    let fileCache: [string, string, string][] = [];
    const exists = await this.vfs.exists(this.depCache);
    if (exists) {
      const list = (await this.vfs.readFile(this.depCache)) as string;
      fileCache = JSON.parse(list || '[]');
    }

    const run = async () => {
      while (taskQueue.length > 0) {
        const task = taskQueue.shift();

        if (
          !task ||
          findLastIndex(fileCache, (i) => i[0] === task[0]) >= 0 ||
          runningCache.includes(task[0])
        ) {
          continue;
        }

        /** step5: 获取空闲 Worker */
        const worker = await this.getIdleWorker(workers);

        const fn = async (id: string, worker: any, task: [string, string]) => {
          try {
            const response = await anylysisTask({
              worker,
              task,
              options: this.getArgsObject(),
            });

            taskQueue.push(...(response?.depList || []));
            taskQueue = uniqBy(taskQueue, (item) => item[0]);

            runningCache.push(id);
            runningCache = uniq(runningCache);

            depList.push([
              ...(response?.currentNpmInfo as [string, string, string]),
            ]);
            depList = uniqBy(depList, (item) => item[0]);

            const index = findIndex(workerPromises, (item) => item.id === id);
            workerPromises.splice(index, 1);
          } catch (e) {}
        };

        /** step6: 执行任务 */
        if (worker) {
          workerPromises.push({ id: task[0], pro: fn(task[0], worker, task) });
        }

        const taskPromises: Promise<void>[] = workerPromises.map(
          (item) => item.pro
        );
        /** step8: 等待任务队列为空 */
        if (workerPromises?.length === maxWorkers) {
          await Promise.race(taskPromises);
        }
      }

      if (workerPromises?.length) {
        await Promise.all(workerPromises.map((item) => item.pro));
      }

      if (taskQueue?.length) {
        await run();
      }
    };

    await run();

    await this.stopWorkers(workers);

    return uniqBy([...depList, ...fileCache], (i) => i[0]);
  }

  /**
   * 安装依赖项。
   *
   * @param depList - 依赖项列表，每个依赖项是一个包含三个字符串的元组。
   * @param subscribe - 可选的回调函数，用于订阅日志输出。
   * @returns 一个 Promise，表示依赖项安装过程的完成。
   *
   * @remarks
   * 该方法使用多个 Worker 并行安装依赖项。首先初始化 Worker，然后逐个分配任务给空闲的 Worker。
   * 当所有任务完成或达到最大 Worker 数量时，等待所有任务完成。
   * 最后停止所有 Worker。
   *
   * @example
   * ```typescript
   * const dependencies = [
   *   ['dep1', '1.0.0', 'latest'],
   *   ['dep2', '2.0.0', 'latest'],
   * ];
   * await installDependencies(dependencies, (log) => console.log(log));
   * ```
   */
  private async installDependencies(
    depList: [string, string, string][],
    subscribe?: (log: ILogItem) => void
  ) {
    const taskQueue = [...depList];
    const maxWorkers = this.maxWorkers || MAX_WORKER_NUM;
    const workerPromises: { id: string; pro: Promise<any> }[] = [];

    /** step1: 初始化 Worker */
    const workers = await this.initWorker(maxWorkers, InstallWorker, subscribe);

    let fileCache: string[] = [];
    const exists = await this.vfs.exists(this.installCacheFilePath);
    if (exists) {
      const list = (await this.vfs.readFile(
        this.installCacheFilePath
      )) as string;
      fileCache = JSON.parse(list || '[]');
    }

    const run = async () => {
      while (taskQueue.length > 0) {
        const task = taskQueue.shift();
        if (!task || fileCache.includes(task[0])) {
          continue;
        }

        /** step5.2: 获取空闲 Worker */
        const worker = await this.getIdleWorker(workers);

        const fn = async (
          id: string,
          worker: any,
          task: [string, string, string]
        ) => {
          try {
            await installTask({
              worker,
              task,
              rootDir: this.rootDir,
              options: this.getArgsObject(),
            });

            const index = findIndex(workerPromises, (item) => item.id === id);
            workerPromises.splice(index, 1);
          } catch (e) {}
        };

        /** step5.3: 执行任务 */
        if (worker) {
          workerPromises.push({ id: task[0], pro: fn(task[0], worker, task) });
        }

        const taskPromises: Promise<void>[] = workerPromises.map(
          (item) => item.pro
        );

        /** step5.4: 等待 Worker 完成 */
        if (workerPromises?.length === maxWorkers) {
          await Promise.race(taskPromises);
        }
      }

      if (workerPromises?.length) {
        await Promise.all(workerPromises.map((item) => item.pro));
      }

      if (taskQueue?.length) {
        await run();
      }
    };

    await run();

    await this.stopWorkers(workers);
  }

  /**
   * 获取一个空闲的 worker。
   *
   * @param workers - 一个 worker 数组，默认为空数组。
   * @returns 如果找到空闲的 worker，则返回该 worker；否则返回 null。
   */
  private async getIdleWorker(workers: any = []) {
    for (const worker of workers) {
      const padding = await worker.getPadding();
      if (!padding) {
        return worker;
      }
    }
    return null;
  }

  /**
   * 初始化工作线程。
   *
   * @param maxWorkers - 最大工作线程数。
   * @param Worker - 工作线程类。
   * @param subscribe - 可选的日志订阅函数。
   * @returns 一个包含所有初始化工作线程的数组。
   */
  private async initWorker(
    maxWorkers: number,
    Worker: any,
    subscribe?: (log: ILogItem) => void
  ) {
    const workers = [];
    for (let i = 0; i < maxWorkers; i++) {
      const worker = await threadSpawn(new Worker());

      await worker.init();
      subscribe && worker.subscribeLogStream().subscribe(subscribe);
      workers.push(worker);
    }
    return workers;
  }

  /**
   * 停止所有传入的 worker 实例。
   *
   * @param workers - 要停止的 worker 实例数组，默认为空数组。
   * @returns 一个 Promise，当所有 worker 都停止时解析。
   */
  private async stopWorkers(workers: any[] = []) {
    for (let i = 0, { length } = workers; i < length; i++) {
      await workers[i].stop();
      await Thread.terminate(workers[i]);
    }
  }
}
