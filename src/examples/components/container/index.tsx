import React, { useState } from 'react';
import { List, Select, Typography } from 'antd';

import RunContainer from '../run-container';

import * as styles from './index.module.less';

const data = [
  { key: 'react_antd', desc: 'react+antd 的项目例子' },
  { key: 'react_antd_form', desc: 'react+antd+form 的项目例子' },
];

const Container = () => {
  const [selectExampleId, setSelectExampleId] = useState<string>();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span style={{ marginRight: 16 }}>浏览器编译</span>

        {selectExampleId ? (
          <Select
            value={selectExampleId}
            style={{ width: 300 }}
            onChange={(value) => setSelectExampleId(value)}
            options={data.map((item) => ({
              value: item.key,
              label: item.desc,
            }))}
          />
        ) : null}
      </div>
      {!selectExampleId ? (
        <List
          style={{ minWidth: 400 }}
          bordered
          dataSource={data}
          renderItem={(item, index) => (
            <List.Item onClick={() => setSelectExampleId(item.key)}>
              <Typography.Text mark>[{`例子_${index + 1}`}]</Typography.Text>
              {` ${item.desc}`}
            </List.Item>
          )}
        />
      ) : (
        <RunContainer exampleId={selectExampleId} />
      )}
    </div>
  );
};

export default Container;
