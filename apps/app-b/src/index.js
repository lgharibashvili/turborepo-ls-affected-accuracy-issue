const { getPackageBMessage } = require('pkg-b');
const _ = require('lodash');

console.log('App B:', getPackageBMessage());
console.log('App B with lodash:', _.upperCase('hello world'));
