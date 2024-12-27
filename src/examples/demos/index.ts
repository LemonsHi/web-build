import { IFile } from '@/WebContainer';

import react_antd from './react_antd';

const demos: Record<
  string,
  {
    file: IFile;
    htmlTemplate: (codeString?: string, cssString?: string) => string;
  }
> = {
  react_antd: { file: react_antd.file, htmlTemplate: react_antd.htmlTemplate },
};

export const getFile = (key: string) => {
  return demos[key].file;
};

export const getHtmlTemplate = (key: string) => {
  return demos[key].htmlTemplate;
};
