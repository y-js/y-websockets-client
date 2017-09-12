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
      if (options.initSync !== false) { options.initSync = true }
      super(y, options)
      this._sentSync = false
      this.options = options
      options.options = Y.utils.copyObject(options.options)
      options.url = options.url || 'https://yjs.dbis.rwth-aachen.de:5072'
      var socket = options.socket || io(options.url, options.options)
      this.socket = socket
      var self = this

      this._onConnect = () => {
        if (options.initSync) {
          this._sentSync = true
          // only sync with server when connect = true
          socket.emit('joinRoom', options.room)
          self.userJoined('server', 'master')
          self.connections.get('server').syncStep2.promise.then(() => {
            // set user id when synced with server
            self.setUserId(Y.utils.generateUserId())
          })
        }
        socket.on('yjsEvent', this._onYjsEvent)
        socket.on('disconnect', this._onDisconnect)
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

      this._onDisconnect = function (peer) {
        Y.AbstractConnector.prototype.disconnect.call(self)
      }
    }

    /*
     * Call this if you set options.initSync = false. Yjs will sync with the server after calling this method.
     */
    initSync (opts) {
      if (!this.options.initSync) {
        this.options.initSync = true
        if (opts.room != null) {
          this.options.room = opts.room
        }
      }
      if (this.socket.connected) {
        this._onConnect()
      }
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
      if (this._sentSync) {
        super.send(uid, message)
        this.socket.emit('yjsEvent', message)
      }
    }
    broadcast (message) {
      if (this._sentSync) {
        super.broadcast(message)
        this.socket.emit('yjsEvent', message)
      }
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
