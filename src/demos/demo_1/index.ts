import { IFile, WebContainer } from '../../WebContainer';
import { ILogItem } from '../../types';

const demo_1: IFile = {
  'package.json': {
    fileType: 'document',
    content: `
{
  "name": "esbuild_react",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "build": "node build.js",
    "start": "node build.js --watch & npx serve ."
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@ke/lego-util": "^1.1.64",
    "react": "16.14.0",
    "react-dom": "16.14.0"
  },
  "devDependencies": {}
}
`,
  },
  src: {
    fileType: 'directory',
    children: {
      'index.jsx': {
        fileType: 'document',
        content: `
import React from 'react';
import ReactDOM from 'react-dom';
import Demo from './components/demo';

const App = () => {
  return (
    <React.StrictMode>
      <Demo />
    </React.StrictMode>
  );
};

ReactDOM.render(App(), document.getElementById('root'));
`,
      },
      components: {
        fileType: 'directory',
        children: {
          'demo.jsx': {
            fileType: 'document',
            content: `

import React from 'react';
import { Empty } from '@ke/lego-h5';

import '@ke/lego-h5/es/style/themes/home.css'

export default () => (
  <Empty
    className="fullscreen"
    text="没找到相关数据，你可以刷新试试"
    btnText="立即刷新"
    onClick={() => alert('你刷新了！')}
  />
);

`,
          },
          'styles.less': {
            fileType: 'document',
            content: `
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f8f8f8;

  .lego-button {
    margin-top: 20px;
  }
}
`,
          },
        },
      },
    },
  },
};

const htmlTemplate_1 = (codeString?: string, cssString?: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lego H5 with esbuild</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>
    <script src="https://unpkg.com/react@16.14.0/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@16.14.0/umd/react-dom.development.js"></script>
    <link rel="stylesheet" href="/lego-h5-home.css" />
    <style>${cssString}</style>
    <style>html,body{max-width: 375px;}</style>
    <style>::-webkit-scrollbar{display: none;}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const script = document.createElement('script');
        script.src = '/lego-h5.js';
        script.type = 'text/javascript';

        script.onload = function() {
          console.log('Lodash 脚本已加载', window);
          try {
            window.legoH5 = window['lego-h5']
            console.log('初始化 legoH5', window);
            ${codeString}
          } catch (error) {
            var contentDiv = document.getElementById('root');
            contentDiv.textContent = error.toString();
            console.error('Error in sandbox script:', error);
          }
        };
        
        
        // 添加错误处理
        script.onerror = function(error) { 
          var contentDiv = document.getElementById('root');
          contentDiv.textContent = '@ke/lego-h5 加载失败';
          console.error('Error in sandbox script:', '@ke/lego-h5 加载失败');
        };
        
        // 将 <script> 元素添加到 <head> 中
        document.head.appendChild(script);
      });
    </script>
  </body>
</html>
`;

const createIframe = (srcDoc: string) => {
  // 创建 iframe 元素
  const iframe = document.querySelector('#preview-ifream') as HTMLIFrameElement;

  // 设置 iframe 的属性
  iframe.srcdoc = srcDoc;
};

const addLog = (log: string) => {
  const pElement = document.createElement('p');

  pElement.innerHTML = log;

  const logElement = document.querySelector('#log-container') as HTMLDivElement;

  logElement.appendChild(pElement);
};

const example = async (file: IFile) => {
  try {
    addLog('开始初始化 @ke/webContainer 容器...');

    /** step1: 启动 WebContaniner 容器 */
    const webcontainerInstance = await WebContainer.boot({
      clearRootDir: false,
    });

    addLog('初始化 @ke/webContainer 容器完成！！');

    /** step2: 挂载文件 */
    addLog('开始挂载文件...');
    await webcontainerInstance.mount(file);
    addLog('文件挂载完成！！');

    /** step3: 安装依赖并构建 */
    addLog('开始安装项目依赖...');
    await webcontainerInstance.spawn(
      'npm',
      [
        'install',
        '--registery=/ke-registry-proxy/artifactory/api/npm/npm-virtual',
      ],
      (log: ILogItem) => {
        console.log(log);
        addLog(`[${log.timestamp}] ${log.type} - ${log.message}`);
      }
    );

    addLog('项目依赖安装完成！！');

    /** step4: 执行构建 */
    addLog('开始 build 项目...');
    await webcontainerInstance.spawn(
      'npm',
      ['run', 'build'],
      (log: ILogItem) => {
        console.log('build 日志：', log);
        addLog(`[${log.timestamp}] ${log.type} - ${log.message}`);
      },
      {
        external: [
          '@lianjia/antd-life',
          'react',
          'react-dom',
          '@ke/lego-h5',
          '@ke/lego-h5/es/style/themes/home.css',
        ],
        banner: {
          js: `
var require = (function() {
  var modules = {
    'react': window.React,
    'react-dom': window.ReactDOM,
    '@ke/lego-h5': window.legoH5,
    '@lianjia/antd-life': window.antdLife,
    '@ke/lego-h5/es/style/themes/home.css': null,
  };
  return function require(moduleName) {
    if (modules.hasOwnProperty(moduleName)) {
      return modules[moduleName];
    }
    throw new Error('Module ' + moduleName + ' not found');
  };
})();`,
        },
      }
    );
    addLog('项目 build 完成！！');

    /** step5: 读取构建后的文件 */
    const buildedCode =
      ((await webcontainerInstance.fs?.readFile(
        '/vf-root/dist/app.js'
      )) as string) || '';

    const exists = await webcontainerInstance.fs?.exists(
      '/vf-root/dist/app.css'
    );
    const buildCss =
      exists &&
      ((await webcontainerInstance.fs?.readFile(
        '/vf-root/dist/app.css'
      )) as string);

    const htmlTemplate = htmlTemplate_1(buildedCode, buildCss as string);

    createIframe(htmlTemplate);
  } catch (e) {
    console.error('构建失败：', e);
  }
};

example(demo_1);
