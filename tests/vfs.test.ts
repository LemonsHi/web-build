import { VirtualFileSystem } from '../src/VirtualFileSystem';

describe('VirtualFileSystem', () => {
  let vfs: VirtualFileSystem;

  beforeAll(async () => {
    vfs = await VirtualFileSystem.init({ fs: 'InMemory', options: {} });
  });

  /** 文件写入和读取 */
  test('should write and read a file', async () => {
    // 写入文件
    await vfs.writeFile('/hello.txt', 'Hello, virtual file system!');
    // 读取文件
    const content = await vfs.readFile('/hello.txt');
    expect(content).toBe('Hello, virtual file system!');
  });

  /** 校验是是否存在 */
  test('should check if a file exists', async () => {
    // 检查文件是否存在
    const exists = await vfs.exists('/hello.txt');
    expect(exists).toBe(true);
  });

  /** 删除文件 */
  test('should delete a file', async () => {
    // 删除文件
    await vfs.deleteFile('/hello.txt');
    // 检查文件是否存在
    const existsAfterDelete = await vfs.exists('/hello.txt');
    expect(existsAfterDelete).toBe(false);
  });

  /** 创建文件夹 */
  test('should create a directory', async () => {
    await vfs.mkdir('/testDir');
    const isDirectory = await vfs.isDirectory('/testDir');
    expect(isDirectory).toBe(true);
  });

  /** 读取文件夹中所有文件 */
  test('should read directory contents', async () => {
    await vfs.writeFile('/testDir/file1.txt', 'File 1');
    await vfs.writeFile('/testDir/file2.txt', 'File 2');
    const files = await vfs.readdir('/testDir');
    expect(files).toEqual(expect.arrayContaining(['file1.txt', 'file2.txt']));
  });

  /** 判断是否是文件 */
  test('should check if path is a file', async () => {
    await vfs.writeFile('/testFile.txt', 'File content');
    const isFile = await vfs.isFile('/testFile.txt');
    expect(isFile).toBe(true);
  });

  /** 判断是否是文件夹 */
  test('should check if path is a directory', async () => {
    await vfs.mkdir('/testDir');
    const isDirectory = await vfs.isDirectory('/testDir');
    expect(isDirectory).toBe(true);
  });

  /** 删除文件夹内所有内容 */
  test('should empty a directory', async () => {
    await vfs.writeFile('/testDir/file1.txt', 'File 1');
    await vfs.writeFile('/testDir/file2.txt', 'File 2');
    await vfs.empty('/testDir');
    const files = await vfs.readdir('/testDir');
    expect(files).toEqual([]);
  });

  /** 读取文件路径 */
  test('should resolve a path', async () => {
    await vfs.writeFile(
      '/node_modules/test-package/index.js',
      'module.exports = {}'
    );
    const resolvedPath = await vfs.reslovePath('/node_modules', 'test-package');
    expect(resolvedPath).toBe('/node_modules/test-package/index.js');
  });
});
