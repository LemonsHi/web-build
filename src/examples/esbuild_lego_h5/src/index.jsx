import React from 'react';
import ReactDOM from 'react-dom';
import Demo from './components/demo';

const App = () => {
  return (
    <React.StrictMode>
      <Demo />
    </React.StrictMode>
  );
};

ReactDOM.render(App(), document.getElementById('root'));
