import { Subject } from 'rxjs';

import { PackageManager } from '../src/PackageManager';
import { VirtualFileSystem } from '../src/VirtualFileSystem';
import { ILogItem } from '../src/types';

describe('PackageManager', () => {
  let vfs: VirtualFileSystem;
  let packageManager: PackageManager;
  let logStream: Subject<ILogItem>;

  beforeEach(async () => {
    vfs = await VirtualFileSystem.init({ fs: 'InMemory', options: {} });
    packageManager = new PackageManager(vfs);
    logStream = new Subject<ILogItem>();
  });

  afterEach(() => {
    logStream.complete();
  });

  describe('installPackage', () => {
    jest.setTimeout(10000);
    it('should install a package successfully', async () => {
      const packageInfo: [string, string, string] = [
        'lodash',
        '4.17.21',
        'http://registry.npmmirror.com/lodash/-/lodash-4.17.21.tgz',
      ];
      await packageManager.installPackage('/', packageInfo, {}, logStream);
    });
  });

  describe('dependenciesAnylysis', () => {
    jest.setTimeout(10000);
    it('should analyze dependencies successfully', async () => {
      const pkgInfo: [string, string] = ['lodash', '4.17.21'];
      const result = await packageManager.dependenciesAnylysis(
        pkgInfo,
        { registry: 'http://registry.npmmirror.com' },
        logStream
      );
      expect(result).toHaveProperty('currentNpmInfo');
      expect(result).toHaveProperty('dependencies');
    });
  });
});
