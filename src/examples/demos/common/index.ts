export const commonHtmlTemplate = (codeString?: string, cssString?: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" />
    <title>web-build</title>
    <style>${cssString}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      ${codeString}
    </script>
  </body>
</html>
`;

export const commonAppFile = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import Demo from './components/demo';

const App = () => {
  return <Demo />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`;
