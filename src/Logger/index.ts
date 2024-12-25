import { Subject, Subscription } from 'rxjs';

import { ILogItem, LogType } from '@/types';

export class Logger {
  /**
   * 用于流式日志输出的 RxJS Subject
   */
  logStream: Subject<ILogItem> = new Subject<ILogItem>();

  /**
   * 用于管理 RxJS 订阅
   */
  private subscriptions: Subscription[] = [];

  constructor() {}

  /**
   * 订阅日志流并将订阅添加到订阅列表中。
   *
   * @returns 返回日志流的可观察对象。
   */
  subscribeLogStream() {
    const logSubscription = this.logStream.asObservable();
    const subscription = logSubscription.subscribe();

    this.subscriptions.push(subscription);
    return logSubscription;
  }

  /**
   * 记录日志信息并推送到日志流。
   *
   * @param message - 要记录的日志信息。
   */
  static log(logStream: Subject<ILogItem>, message: string, type?: LogType) {
    const timestamp = new Date().toISOString();
    logStream.next({ timestamp, message, type: type || 'info' }); // 推送日志到流
  }

  stop() {
    /** step1: 完成 RxJS 流 */
    this.logStream.complete();

    /** step2: 取消所有订阅 */
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
  }
}
