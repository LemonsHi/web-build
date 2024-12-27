import React, { FC, useEffect, useMemo, useState } from 'react';
import { List } from 'antd';

import { run } from '@/examples/utils';

import { getFile, getHtmlTemplate } from '../../demos';

import * as styles from './index.module.less';

interface Props {
  exampleId: string;
}

const RunContainer: FC<Props> = ({ exampleId }) => {
  const [logList, setLogList] = useState<string[]>([]);

  const [preview, setPreview] = useState<string>('');

  const file = useMemo(() => {
    return getFile(exampleId);
  }, [exampleId]);

  useEffect(() => {
    run(
      file,
      (log: string) => {
        setLogList((pre) => [...pre, log]);
      },
      { clearRootDir: false }
    ).then(async (webcontainerInstance) => {
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

      const htmlTemplate = getHtmlTemplate(exampleId)(
        buildedCode,
        buildCss as string
      );

      setPreview(htmlTemplate);
    });
  }, [file]);

  return (
    <div className={styles.runContainer}>
      <div className={`${styles.previewContainer} ${styles.item}`}>
        {preview ? <iframe srcDoc={preview} style={{ border: 0 }} /> : null}
      </div>
      <List
        className={`${styles.item}`}
        // style={{ width: '100%', height: '100%' }}
        bordered
        dataSource={logList}
        renderItem={(item, index) => (
          <List.Item>
            <div>{item}</div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default RunContainer;
