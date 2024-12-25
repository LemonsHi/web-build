declare module '*.less';

declare module '*.module.less' {
  const classes: Readonly<{ [key: string]: string }>;
  export default classes;
}

declare module '@lianjia/antd-life';

declare module 'react-dom';
