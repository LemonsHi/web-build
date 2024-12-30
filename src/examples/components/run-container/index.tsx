import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { List } from 'antd';

import { run } from '../../utils';

import { getFile, getHtmlTemplate } from '../../demos';

import * as styles from './index.module.less';

interface Props {
  exampleId: string;
}

const RunContainer: FC<Props> = ({ exampleId }) => {
  const [logList, setLogList] = useState<string[]>([]);

  const [preview, setPreview] = useState<string>('');

  const listRef = useRef<HTMLDivElement>(null);

  const file = useMemo(() => {
    return getFile(exampleId);
  }, [exampleId]);

  useEffect(() => {
    setLogList([]);
    run(file, (log: string) => setLogList((pre) => [...pre, log]), {
      clearRootDir: false,
    }).then(async (webcontainerInstance) => {
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

  useEffect(() => {
    if (listRef.current) {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [logList]);

  return (
    <div className={styles.runContainer}>
      <div className={`${styles.previewContainer} ${styles.item}`}>
        {preview ? (
          <iframe
            srcDoc={preview}
            style={{ border: 0, width: '100%', height: '100%' }}
          />
        ) : null}
      </div>
      <List
        id="consoleContainer"
        ref={listRef}
        className={`${styles.item}`}
        style={{ boxSizing: 'content-box' }}
        bordered
        dataSource={logList}
        renderItem={(item, index) => (
          <List.Item key={index}>
            <div>{item}</div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default RunContainer;
