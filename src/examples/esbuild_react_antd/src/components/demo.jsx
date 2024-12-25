import React from 'react';
import { Card } from '@lianjia/antd-life';

import styles from './index.module.less';

const Demo = ({ title }) => {
  return (
    <Card title={title} style={{ width: 300 }}>
      <p className={styles.color}>中文测试</p>
      <p>中文测试</p>
      <p>中文测试</p>
    </Card>
  );
};

export default Demo;
