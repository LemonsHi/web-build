import { IFile } from '@/WebContainer';

const file: IFile = {
  'package.json': {
    fileType: 'document',
    content: `
{
  "name": "react_antd",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {},
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@ant-design/icons": "^5.5.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "antd": "^5.21.1"
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
import ReactDOM from 'react-dom/client';
import Demo from './components/demo';

const App = () => {
  return <Demo />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`,
      },
      components: {
        fileType: 'directory',
        children: {
          'demo.jsx': {
            fileType: 'document',
            content: `
import React from 'react';
import { Button, Flex } from 'antd';

const Demo = () => (
  <Flex gap="small" wrap>
    <Button type="primary">Primary Button</Button>
    <Button>Default Button</Button>
    <Button type="dashed">Dashed Button</Button>
    <Button type="text">Text Button</Button>
    <Button type="link">Link Button</Button>
  </Flex>
);

export default Demo;
`,
          },
        },
      },
    },
  },
};

const htmlTemplate = (codeString?: string, cssString?: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" />
    <title>web-build</title>
    <style>${cssString}</style>
    <style>html,body{max-width: 375px;}</style>
    <style>::-webkit-scrollbar{display: none;}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      ${codeString}
    </script>
  </body>
</html>
`;

export default { file, htmlTemplate };
