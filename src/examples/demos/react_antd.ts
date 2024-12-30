import { IFile } from '../../WebContainer';
import { commonAppFile } from './common';

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
        content: `${commonAppFile}`,
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

export default { file };
