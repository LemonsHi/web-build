export const formatInitData = () => {
  // 初始化方法

  return {};
};

export const formSchemas = [
  {
    formType: 'input',
    formLabel: 'input输入框',
    required: true,
    dataIndex: 'inputValue1',
    description: '编辑态，基本使用',
    formConfig: {
      placeholder: '请输入',
    },
  },
  {
    formType: 'input',
    formLabel: 'input输入框',
    required: true,
    dataIndex: 'inputValue2',
    description: '禁用态，最多两行',
    formConfig: {
      placeholder: '请输入',
      disabled: true,
      maxLine: 2,
    },
  },
];
