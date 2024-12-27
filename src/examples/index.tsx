import React from 'react';
import ReactDOM from 'react-dom/client';
import Container from './components/container/index';

import './index.less';

const App = () => {
  return <Container />;
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(<App />);
