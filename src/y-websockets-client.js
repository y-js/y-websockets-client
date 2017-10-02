import io from 'socket.io-client'

export default function extend (Y) {
  class Connector extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }
      if (options.room == null) {
        throw new Error('You must define a room name!')
      }
      options = Y.utils.copyObject(options)
      options.role = 'slave'
      options.preferUntransformed = true
      options.generateUserId = options.generateUserId || false
      super(y, options)
      this.options = options
      options.options = Y.utils.copyObject(options.options)
      options.url = options.url || 'https://yjs.dbis.rwth-aachen.de:5072'
      var socket = options.socket || io(options.url, options.options)
      this.socket = socket
      var self = this

      this._onConnect = function joinRoom () {
        socket.emit('joinRoom', options.room)
        self.userJoined('server', 'master')
        self.connections.get('server').syncStep2.promise.then(() => {
          // set user id when synced with server
          self.setUserId(Y.utils.generateUserId())
        })
      }

      socket.on('connect', this._onConnect)
      if (socket.connected) {
        this._onConnect()
      } else {
        socket.connect()
      }

      this._onYjsEvent = function (buffer) {
        let decoder = new Y.utils.BinaryDecoder(buffer)
        let roomname = decoder.readVarString()
        if (roomname === options.room) {
          self.receiveMessage('server', buffer)
        }
      }
      socket.on('yjsEvent', this._onYjsEvent)

      this._onDisconnect = function (peer) {
        Y.AbstractConnector.prototype.disconnect.call(self)
      }
      socket.on('disconnect', this._onDisconnect)
    }
    disconnect () {
      this.socket.emit('leaveRoom', this.options.room)
      if (!this.options.socket) {
        this.socket.disconnect()
      }
      super.disconnect()
    }
    destroy () {
      this.disconnect()
      this.socket.off('disconnect', this._onDisconnect)
      this.socket.off('yjsEvent', this._onYjsEvent)
      this.socket.off('connect', this._onConnect)
      if (!this.options.socket) {
        this.socket.destroy()
      }
      this.socket = null
    }
    reconnect () {
      this.socket.connect()
      super.reconnect()
    }
    send (uid, message) {
      super.send(uid, message)
      this.socket.emit('yjsEvent', message)
    }
    broadcast (message) {
      super.broadcast(message)
      this.socket.emit('yjsEvent', message)
    }
    whenRemoteResponsive () {
      return new Promise(resolve => {
        this.socket.emit('yjsResponsive', this.options.room, resolve)
      })
    }
    isDisconnected () {
      return this.socket.disconnected
    }
  }
  Connector.io = io
  Y.extend('websockets-client', Connector)
}

if (typeof Y !== 'undefined') {
  extend(Y) // eslint-disable-line
}
