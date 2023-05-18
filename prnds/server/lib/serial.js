const SerialPort = require('serialport');
var _ = require('lodash');
var async = require('async');
const config = require('../../server/config.json');

var port = null;
var SENDING = false;
var RECEIVING = false;
var BUSY = false;
var app = null;

var serialTimeout = 2000; // time in ms

// Function to initialize the serial connection
function initializeSerialConnection(_app) {
    app = _app;

    return new Promise((resolve) => {
        if (port && port.isOpen) {
            resolve();
        } else {
            port = new SerialPort(config.serial.port, {
            baudRate: Number(config.serial.baudRate),
            autoOpen: config.serial.autoOpen
        });


        bindErrorListener();

        bindCloseListener();

        bindOpenListener();

        bindGlobalDataReceiving();

        // Handle error events during initialization
        port.on('error', (err) => {
            console.error('Serial port initialization error:', err);
        });

        console.log('SERIAL PORT : Serial port is open')
        resolve();
        }
    });
}

// Function to write data to the serial connection
function writeData(data) {
  return new Promise((resolve, reject) => {
    if (port && port.isOpen) {
        SENDING = true;
        port.write(data, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
        SENDING = false;
    } else {
        reject(new Error('Serial port is not open.'));
    }
  });
}

// Function to read data from the serial connection
function readData() {
  return new Promise((resolve, reject) => {
    if (port && port.isOpen) {
        READING = true;
        let receivedData = '';

        port.on('data', (data) => {
            receivedData += data.toString();
        });

        port.on('end', () => {
            resolve(receivedData);
        });

        port.on('error', (err) => {
            reject(err);
        });
        READING = false;

        console.log("ReadData : Data: ", receivedData);
    } else {
      reject(new Error('Serial port is not open.'));
    }
  });
}

// THIS IS DEFINED IN EXPORT
// // Function to close the serial connection
// function closeSerialConnection() {
//   return new Promise((resolve) => {
//     if (port && port.isOpen) {
//       port.close(() => {
//         resolve();
//       });
//     } else {
//       resolve();
//     }
//   });
// }
function handleReceivedData(data) {
    RECEIVING = true;
    BUSY = true;

    let arrReceived = [];
   
    _.forEach(data, function (b) {
        arrReceived.push(b);
    });

    // -------------- EMIT EVENT TO APP WITH THE DATA --------------
    app.emit("part.event.data", arrReceived);

    RECEIVING = false;
    BUSY = false;
}

function writeAndDrain(data, cb) {
    //todo: check if port is open
    port.write(data, function () {
        port.drain(cb);
    });
}

function resetSerialStatus() {
    removeBindings("data");
    bindGlobalDataReceiving();

    RECEIVING = false;
    SENDING = false;
}

function partConnected(cb) {
    let timer = setTimeout(function () {
        resetSerialStatus();
        console.log('SERIALPORT : TIMEOUT : Failed to receive \'Z\'');
        return cb("ERROR - Check Part Connection", null);
    }, serialTimeout);

    removeBindings("data");

    let arrReceived = [];

    bindLocalDataReceiving(function (data) {
        clearTimeout(timer);
        RECEIVING = true;

        _.forEach(data, function (b) {
            arrReceived.push(b);
        });

        resetSerialStatus();
        
        console.log("partConnected : ",arrReceived);

        if (arrReceived.length >= 1 && arrReceived[0] == "90") {
            console.log("KEEP ALIVE MESSAGE RECEIVED");
        } else {
            return cb("ERROR - Part did not respond with correct message", null);
        }
    });

    

    SENDING = true;

    writeAndDrain("Z", function () {
        SENDING = false;
    });
}


// -------------- EVENT HANDLERS FOR SERIAL CONN --------------
function bindErrorListener() {
    port.removeAllListeners("error");

    port.on('error', function (err) {
        console.log('SERIALPORT : ON : Error: ', err.message);
        app.emit("socket.connect.error", err.message);
    });
}

function bindOpenListener() {
    port.removeAllListeners("open");

    port.on('open', function () {
        console.log('SERIALPORT : ON : Open');

        // Wait 1 second for Arduino to initialize
        let timer = setTimeout(function () {
            if (port.isOpen &&
                !BUSY &&
                !SENDING &&
                !RECEIVING) {

                BUSY = true;

                partConnected(function (e, r) {
                    BUSY = false;

                    if (e || !r) {
                        port.close();
                        app.emit("socket.connect.error", e);
                    } else {
                        app.emit("serial.connected", false);
                    }
                });
            } else {
                app.emit("socket.connect.error", "ERROR - Connecting to serial port: " + _portName);
            }
        }, 1000);
    });
}

function bindCloseListener() {
    port.removeAllListeners("close");

    port.on('close', function () {
        console.log('SERIALPORT : ON : Close');
        app.emit("serial.connected", false);
    });
}

function removeBindings(event) {
    port.removeAllListeners(event);
}

function bindLocalDataReceiving(cb) {
    removeBindings("data");
    // console.log("BindLocalData : READING SERIAL")
 
    port.on("data", function (data) {
        cb(data);
    });
}

function bindGlobalDataReceiving() {
    removeBindings("data");

    port.on("data", function (data) {
        console.log('SERIALPORT : ON : Data', data);

        handleReceivedData(data);
    });
}


// checks for the current arduino state on serial line
function _checkState(cb) {
    RECEIVING = false;
    SENDING = false;

    let timer = setTimeout(function () {
        resetSerialStatus();
        console.log('SERIALPORT : TIMEOUT : Part did not return its state');
        return cb("ERROR - Sending check state to Part", null);
    }, serialTimeout);

    removeBindings();

    let arrReceived = [];
    bindLocalDataReceiving(function (data) {
        RECEIVING = true;

        _.forEach(data, function (b) {
            arrReceived.push(b);
        });

        if (arrReceived.length == 1) {
            clearTimeout(timer);
            RECEIVING = false;
            cb(null, arrReceived);

        }
    });

    SENDING = true;
    writeAndDrain('H', function () {
        SENDING = false;
    });
}



function _getPartState(cb) {
    if (port.isOpen && !BUSY && !SENDING && !RECEIVING) {
        console.log('SERIALPORT : GET PART STATE');
        BUSY = true;
        removeBindings("data");

        async.waterfall([
            function (callback) {
                _checkState(function(e,r) {
                    callback(e,r);
                });
            },
            function (received, callback) {
                //compare results
                removeBindings("data");
                bindGlobalDataReceiving();

                callback(null, received);

            }
        ], function (err, result) {
            BUSY = false;
            cb(err, result);
        });

    } else {
        //failed
        console.log('SERIALPORT : ERROR : Cannot get part state');
        cb("SERIALPORT : ERROR : Cannot get part state", null);
    }
}



module.exports = {
    initializeSerialConnection,
    writeData,
    readData,
    // closeSerialConnection,


    port: function () {
        return port;
    },

    portName: function () {
        return port.portName;
    },

    baudRate: function () {
        return port.settings.baudRate;
    },

    autoOpen: function () {
        return port.settings.autoOpen;
    },


    isOpen: function () {
        return port.isOpen;
    },

    isSending: function () {
        return SENDING;
    },

    isReceiving: function () {
        return RECEIVING;
    },

    availablePorts: function (cb) {
        SerialPort.list(function (e, r) {
            cb(e, r)
        });
    },

    savedConfiguration: function () {
        return config.serial;
    },

    isUpdateMode: function () {
        return BUSY;
    },
    
    connect: function (cb) {
        port.open(function (err) {
            if (err) {
                console.log('SERIALPORT : CONNECT : Error opening port: ', err.message)
            }
            cb(err);
        });
    },

    reconnect: function (portName, baudRate, autoOpen, cb) {
        port.close(function (e) {
            console.log('SERIALPORT : RECONNECT : Old serial port closed');

            port = new SerialPort(portName, {
                baudRate: Number(baudRate),
                autoOpen: autoOpen
            }, function (e) {
                if (e) {
                    cb(e, null);
                } else {
                    portName = portName;

                    cb();
                }
            });

            // SETUP SERIAL EVENT HANDLERS
            bindErrorListener();

            bindCloseListener();

            bindOpenListener();

            bindGlobalDataReceiving();


            if (!autoOpen) {
                portName = portName;

                port.open(function (err) {
                    if (err) {
                        console.log('SERIALPORT : RECONNECT : error opening port: ', err.message)
                    }
                    cb(err);
                });

                
                console.log('SERIALPORT : RECONNECT : New port opened ')
                
            }
        });
    },

    disconnect: function (cb) {
        port.close(function (e) {
            console.log('SERIALPORT : DISCONNECT : port closed');
            cb(e, null);
        });
    },

    getPartState: function(cb) {
        if (port.isOpen) {
            console.log('SERIALPORT : EVENT : GETTING PART STATE');

            _getPartState(function(e,r) {
                cb(e,r);
            });
        } else {
            _app.emit("socket.connect.error", "ERROR - Serial port is disconnected");
            cb("ERROR - Serial port is disconnected", null);
        }
    },


};