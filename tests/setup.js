const fetch = require('node-fetch');
const { Response } = require('node-fetch');

global.fetch = fetch;
global.Response = Response;

console.log('setup.js is running');
