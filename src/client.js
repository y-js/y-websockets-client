
var Y = require('../../yjs/src/y.js')
require('./Websockets-client.js')(Y)
require('../../y-memory/src/Memory.js')(Y)
require('../../y-array/src/Array.js')(Y)

var y

Y({
  db: {
    name: 'memory'
  },
  connector: {
    name: 'websockets-client',
    room: 'demo2'
  }
}).then(function (yconfig) {
  y = yconfig
  console.log('It actually worked :)')
  y.root.set('x', 5)
})
