var serialPort = require('../lib/serial.js');
var async = require('async');
var _ = require('lodash');
var path = require('path');
var mConfig = require('../lib/manage-config.js');

var _app = null;
var _io = null;
var _sockets = [];

exports = module.exports = {

    sockets: function () {
        return _sockets
    },

    init: function (app, io, cb) {

        _app = app;
        _io = io;

        io.on('connection', (socket) => {
            console.log('Browser has connected', socket.id, serialPort.isOpen());
            _sockets.push(socket.id);

            socket.emit("socket:msg", {
                type: "socket.connected",
                msg: {
                    serialConnected: serialPort.isOpen(),
                    socketId: socket.id,
                    isUpdating: serialPort.isReceiving()
                }
            });

            socket.on('disconnect', function () {
                var index = _sockets.findIndex(x => x == socket.id);

                if (index > -1) {
                    _sockets.splice(index, 1);
                }

            });

            socket.on("socket:msg", (message) => {
                _processMessage(message, socket.id);
            });

        });

        app.on("serial.connected", (stream) => {
            _emitStatusMessage("socket.connected", {
                serialConnected: serialPort.isOpen()
            });
        });

        app.on("socket.connect.error", (stream) => {
            _emitMessage("socket.connect.error", {
                serialConnected: serialPort.isOpen(),
                error: stream,
            });

        });

        app.on("shifter.event.data", (stream) => {
            _.each(stream, function(value) {
                _emitMessage("socket.shifter.event", {
                    serialConnected: serialPort.isOpen(),
                    code: value
                });
            });
        });

        cb(null);
    },
}

function _emitMessage(type, msg) {
    async.each(_sockets, function (sid, callback) {
        msg.socketId = sid;
        console.log('Sending _emitMessage to socket id = ', sid);
        _io.sockets.sockets[sid].emit("socket:msg", {
            type: type,
            msg: msg
        });

        callback();
    }, function (err) {

    });
}

function _emitSocketMessage(socketId, type, msg) {
    _io.sockets.sockets[socketId].emit("socket:msg", {
        type: type,
        msg: msg
    });
}

function _emitStatusMessage(type, status) {
    async.each(_sockets, function (sid, callback) {

        _io.sockets.sockets[sid].emit("socket:msg", {
            type: type,
            msg: {
                serialConnected: serialPort.isOpen(),
                socketId: sid,
                isUpdating: serialPort.isUpdateMode(),
                status: status
            }
        });

        callback();
    }, function (err) {

    });
}

function _emitSocketStatusMessage(socketId, type, status) {
    _io.sockets.sockets[socketId].emit("socket:msg", {
        type: type,
        msg: {
            serialConnected: serialPort.isOpen(),
            socketId: socketId,
            isUpdating: serialPort.isUpdateMode(),
            status: status
        }
    });
}

function _processMessage(message, socketId) {
    console.log(message)
    switch (message.type) {
        case "serial.connect":
            serialPort.connect(function (e, r) {
                if (e) {
                    _emitMessage("socket.connect.error", {
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        error: "Error connecting to serial port:  " + serialPort.portName()
                    });
                }
            });
            break;
        case "serial.disconnect":
            serialPort.disconnect(function (e, r) {
                if (e) {
                    _emitMessage("socket.connect.error", {
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        error: "Error disconnecting serial port:  " + serialPort.portName()
                    });
                } else {
                    _app.emit("serial.connected", false);
                }
            });
            break;

        case "serial.reconnect.save":
            _reconnectAndSave(message.msg.port, message.msg.baudRate, message.msg.autoOpen, function (e, r) {
                if (e) {
                    _emitMessage("socket.connect.error", {
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        error: e
                    });
                } else {
                    _emitSocketMessage(socketId, "socket.configuration", {
                        changed: true,
                        response: "Serial port configuration changed and saved.",
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        availablePorts: _.map(r, 'comName'),
                        current: {
                            port: serialPort.portName(),
                            baudRate: serialPort.baudRate(),
                            autoOpen: serialPort.autoOpen()
                        },
                        saved: serialPort.savedConfiguration()

                    });
                }
            });
            break;
        case "serial.reconnect":
            _reconnect(message.msg.port, message.msg.baudRate, message.msg.autoOpen, function (e,r) {
                if (e) {
                    _emitMessage("socket.connect.error", {
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        error: "Error re-connecting to serial port:  " + serialPort.portName()
                    });
                } else {
                    _emitSocketMessage(socketId, "socket.configuration", {
                        changed: true,
                        response: "Serial port configuration changed.",
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        availablePorts: _.map(r, 'comName'),
                        current: {
                            port: serialPort.portName(),
                            baudRate: serialPort.baudRate(),
                            autoOpen: serialPort.autoOpen()
                        },
                        saved: serialPort.savedConfiguration()

                    });
                }
            });
            break;
        case "serial.configuration":
            serialPort.availablePorts(function (e, r) {
                if (e) {
                    _emitSocketMessage(socketId, "socket.configuration.error", {
                        error: "Error retrieving available serial ports"
                    })
                } else {
                    _emitSocketMessage(socketId, "socket.configuration", {
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        availablePorts: _.map(r, 'comName'),
                        current: {
                            port: serialPort.portName(),
                            baudRate: serialPort.baudRate(),
                            autoOpen: serialPort.autoOpen()
                        },
                        saved: serialPort.savedConfiguration()

                    });
                }
            })
            break;
        case "event.brake":
            console.log('EVENTS : PROCESS : event.brake ', socketId);
            serialPort.eventBrake(message.msg.state, function(e,r) {
                if (e) {
                    _emitSocketMessage(socketId, "socket.shifter.event.error", {
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        error: "Error re-connecting to serial port:  " + serialPort.portName()
                    });
                }
            });
            break;
        case "event.indicator":
                console.log('EVENTS : PROCESS : event.indicator ', socketId);
                serialPort.eventIndicator(message.msg.state, function(e,r) {
                    if (e) {
                        _emitSocketMessage(socketId, "socket.shifter.event.error", {
                            serialConnected: serialPort.isOpen(),
                            socketId: socketId,
                            error: "Error re-connecting to serial port:  " + serialPort.portName()
                        });
                    }
                });
                break;
        case "shifter.connected":
            console.log('EVENTS : PROCESS : shifter.connected', socketId);
            serialPort.shifterConnected(function (e, r) {
                console.log('EVENTS : CALLBACK : serialPort.shifterConnected', socketId, message.msg);
                
                if (e || !r) {
                    _emitSocketMessage(socketId, "shifter.connected", {
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        error: e,
                        response: null
                    });
                } else {
                    _emitSocketMessage(socketId, "shifter.connected", {
                        serialConnected: serialPort.isOpen(),
                        socketId: socketId,
                        error: null,
                        response: r
                    });
                }
            });
        break;
        case "shifter.sync":
                console.log('EVENTS : PROCESS : shifter.sync', socketId);
                serialPort.shifterState( function(e,r) {
                    if (e) {
                        _emitSocketMessage(socketId, "socket.shifter.event.error", {
                            serialConnected: serialPort.isOpen(),
                            socketId: socketId,
                            error: "Error re-connecting to serial port:  " + serialPort.portName()
                        });
                    } else {
                        _.each(r, function(value) {
                            _emitSocketMessage(socketId, "socket.shifter.event", {
                                serialConnected: serialPort.isOpen(),
                                socketId: socketId,
                                code: value
                            });
                        });
                    }
                });
        break;
        default:
            break;
    }
}

function _reconnect(port, baudRate, autoOpen, cb) {
    serialPort.reconnect(port, baudRate, autoOpen, function (e, r) {
        if (e) {
            cb("Error re-connecting to serial port: " + serialPort.portName());
        } else {
            cb(null, null);
        }
    });
}

function _reconnectAndSave(port, baudRate, autoOpen, cb) {
    async.waterfall([
        function (callback) {
            _reconnect(port, baudRate, autoOpen, function (e, r) {
                callback(e);
            });
        },
        function (callback) {
            mConfig.init(path.resolve(__dirname, '../config.json'));

            mConfig.load(function (e, r) {
                callback(e,r);
            });
        },
        function (configs, callback) {
            if (configs) {
                configs.serial.port = port;
                configs.serial.baudRate = Number(baudRate);
                configs.serial.autoOpen = autoOpen;

                callback(null, configs);
            } else {
                callback('Configuration file is empty.');
            }
        },
        function (configs, callback) {
            mConfig.save(configs, function(e,r) {
                callback(e,r);
            });
        }
    ], function (e, r) {
        cb(e, r);
    });
}