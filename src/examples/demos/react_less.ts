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
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
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
import './demo.less'

const Demo = () => (
  <div className="demo">
    <h1 className="color">Hello, World!</h1>
  </div>
);

export default Demo;
`,
          },
          'demo.less': {
            fileType: 'document',
            content: `
@color: red;
.demo {
  .color {
    color: @color;
  }
}
`,
          },
        },
      },
    },
  },
};

export default { file };
