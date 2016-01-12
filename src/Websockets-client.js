/* global Y */
'use strict'

var io = require('socket.io-client')

function extend (Y) {
  class Connector extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }
      if (options.room == null) {
        throw new Error('You must define a room name!')
      }
      options.role = 'slave'
      super(y, options)
      this.options = options
      if (options.url == null) {
        var protocol = '073' // version 0.7.3
        // if not defined, try to match protocol
        if (typeof window !== 'undefined' || window.location.protocol === 'http:') {
          // always runs on port "6"+protocol
          options.url = 'https://yjs.dbis.rwth-aachen.de:6' + protocol
        } else {
          // always runs on port "5"+protocol
          options.url = 'http://yjs.dbis.rwth-aachen.de:5' + protocol
        }
      }
      var socket = io(options.url)
      this.socket = socket
      var self = this
      if (socket.connected) {
        joinRoom()
      } else {
        socket.on('connect', joinRoom)
      }
      function joinRoom () {
        socket.emit('joinRoom', options.room)
        self.userJoined('server', 'master')

        socket.on('yjsEvent', function (message) {
          if (message.type != null) {
            if (message.type === 'sync done') {
              self.setUserId(socket.id)
            }
            if (message.room === options.room) {
              self.receiveMessage('server', message)
            }
          }
        })

        socket.on('disconnect', function (peer) {
          self.userLeft('server')
        })
      }
    }
    disconnect () {
      this.socket.disconnect()
      super.disconnect()
    }
    reconnect () {
      this.socket.connect()
      this.socket.emit('joinRoom', this.options.room)
      this.userJoined('server', 'master')
      super.reconnect()
    }
    send (uid, message) {
      message.room = this.options.room
      this.socket.emit('yjsEvent', message)
    }
    broadcast (message) {
      message.room = this.options.room
      this.socket.emit('yjsEvent', message)
    }
    isDisconnected () {
      return this.socket.disconnected
    }
  }
  Y.extend('websockets-client', Connector)
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}
