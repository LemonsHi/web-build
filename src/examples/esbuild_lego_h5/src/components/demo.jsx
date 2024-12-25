import React from 'react';
import { Form, Layout, Empty } from '@ke/lego-h5';

import { formSchemas, formatInitData } from './config';

import '@ke/lego-h5/es/style/themes/home.css';

export default class Demo extends React.Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
    this.state = {
      initValue: {},
      formData: {},
      initSchemas: {
        custom: {},
        extraWidgets: {},
        submitBtn: { showBtn: true, btnText: '确认提交', fix: true },
        schemas: formSchemas,
      },
    };
  }

  componentDidMount() {
    const newData = formatInitData();
    this.setState({ initValue: newData });
  }

  handleNext = (values) => {
    console.log('values===🚀===>', values);
  };

  handleSetData = (curItem, totalData, form) => {
    console.log('curItem, totalData, form===🚀===>', curItem, totalData, form);
  };

  render() {
    const { initValue, formData, initSchemas } = this.state;
    return (
      <Layout
        pageTitle="基础表单"
        homeRole="BUTLER"
        appSource="HOME"
        hasBottombtn
      >
        <div className="wrapper">
          {initValue ? (
            <Form
              {...initSchemas}
              initialValues={initValue}
              formData={formData}
              ref={this.formRef}
              onValuesChange={(curItem, totalData, form) => {
                console.log(
                  'curItem, totalData, form===🚀===>',
                  curItem,
                  totalData,
                  form
                );
                this.handleSetData(a, b, form);
              }}
              onFieldsChange={(changedFields, allFields) => {
                console.log(
                  'changedFields, allFields===🚀===>',
                  changedFields,
                  allFields
                );
              }}
              onFinish={this.handleNext}
            />
          ) : (
            <Empty text="暂无内容~" />
          )}
        </div>
      </Layout>
    );
  }
}
