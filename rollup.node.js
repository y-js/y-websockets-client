var pkg = require('./package.json')

export default {
  entry: 'src/y-websockets-client.js',
  moduleName: 'yWebsocketsClient',
  format: 'cjs',
  dest: 'y-websockets-client.node.js',
  sourceMap: true,
  external: [
    'socket.io-client'
  ],
  banner: `
/**
 * ${pkg.name} - ${pkg.description}
 * @version v${pkg.version}
 * @license ${pkg.license}
 */
`
}
