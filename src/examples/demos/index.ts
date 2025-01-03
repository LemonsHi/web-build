import react_antd from './react_antd';
import react_antd_form from './react_antd_form';
import react_less from './react_less';

import { commonHtmlTemplate } from './common';
import { IDemo } from '../types';

const demos: Record<string, IDemo> = {
  react_antd: {
    file: react_antd.file,
    htmlTemplate: (react_antd as any)?.htmlTemplate,
  },
  react_antd_form: {
    file: react_antd_form.file,
    htmlTemplate: (react_antd_form as any)?.htmlTemplate,
  },
  react_less: {
    file: react_less.file,
    htmlTemplate: (react_less as any)?.htmlTemplate,
  },
};

export const getFile = (key: string) => {
  return demos[key].file;
};

export const getHtmlTemplate = (key: string) => {
  return demos[key].htmlTemplate || commonHtmlTemplate;
};
