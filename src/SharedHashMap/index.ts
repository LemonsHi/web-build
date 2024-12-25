/**
 * SharedHashMap 缓存区域
 */
export class SharedHashMap {
  /** 共享缓冲区 */
  private sharedBuffer: SharedArrayBuffer;
  /** 共享哈希表 */
  private sharedArray: Uint32Array;
  /** 哈希表大小 */
  private size: number;

  constructor(size: number) {
    /** 初始化共享哈希表 */
    this.size = size;

    /** 创建共享内存 */
    this.sharedBuffer = new SharedArrayBuffer(size * size * 4);

    /** 创建视图 */
    this.sharedArray = new Uint32Array(this.sharedBuffer);

    /** 初始化共享内存 */
    this.sharedArray.fill(0);
  }

  /**
   * 哈希函数，将字符串转换为一个唯一的哈希值
   * @param str - 输入字符串
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // 简单的哈希算法
    }
    return hash;
  }

  /**
   * 第二哈希函数，用于计算冲突时的偏移量
   * @param hash - 初始哈希值
   */
  private static secondHash(hash: number, size: number): number {
    const prime = size - 1; // 选择小于 size 的质数
    return prime - (hash % prime);
  }

  /**
   * 将哈希值映射到二维数组的初始坐标
   * @param hash - 哈希值
   */
  private static mapHashTo2DCoordinates(
    hash: number,
    size: number
  ): {
    row: number;
    col: number;
  } {
    /** 行坐标 */
    const row = hash % size;
    /** 列坐标 */
    const col = Math.floor(hash / size) % size;

    return { row, col };
  }

  /**
   * 双重哈希探测处理冲突
   * @param row - 行坐标
   * @param col - 列坐标
   * @param attempt - 当前尝试次数
   */
  private static doubleHashing(
    row: number,
    col: number,
    attempt: number,
    size: number
  ): { row: number; col: number } {
    /** 计算偏移量 */
    const offset = this.secondHash(row * size + col, size);

    /** 计算新的坐标 */
    col = (col + attempt * offset) % size;

    /** 如果列坐标为 0，则更新行坐标 */
    if (col === 0) {
      row = (row + attempt) % size;
    }

    return { row, col };
  }

  /**
   * 添加键到哈希映射中
   * @param key - 键
   */
  static add(key: string, size: number, sharedArray: Uint32Array): void {
    /** 计算哈希值 */
    const hash = this.hashString(key);

    /** 计算初始坐标 */
    let { row, col } = this.mapHashTo2DCoordinates(hash, size);

    /** 尝试次数 */
    let attempt = 0;

    /** 开始探测 */
    while (
      Atomics.compareExchange(sharedArray, row * size + col, 0, hash) !== 0
    ) {
      /** 更新坐标 */
      attempt++;

      /** 计算新的坐标 */
      ({ row, col } = this.doubleHashing(row, col, attempt, size));

      /** 检查尝试次数 */
      if (attempt >= size) {
        throw new Error('HashMap is full, cannot add more keys.');
      }
    }
  }

  /**
   * 检查键是否存在
   * @param key - 键
   */
  public static has(
    key: string,
    size: number,
    sharedArray: Uint32Array
  ): boolean {
    /** 计算哈希值 */
    const hash = this.hashString(key);

    /** 计算初始坐标 */
    let { row, col } = this.mapHashTo2DCoordinates(hash, size);

    /** 尝试次数 */
    let attempt = 0;

    /** 开始探测 */
    while (true) {
      /** 从共享内存中读取值 */
      const value = Atomics.load(sharedArray, row * size + col);

      /** 未找到，返回 false */
      if (value === 0) {
        return false;
      }

      /** 找到，返回 true */
      if (value === hash) {
        return true;
      }

      /** 更新坐标 */
      attempt++;

      /** 计算新的坐标 */
      ({ row, col } = this.doubleHashing(row, col, attempt, size));

      /** 检查尝试次数 */
      if (attempt >= size) {
        return false; // 超出范围，未找到
      }
    }
  }

  /**
   * 获取共享内存的引用，用于传递给 Worker
   */
  getBuffer(): SharedArrayBuffer {
    return this.sharedBuffer;
  }
}
