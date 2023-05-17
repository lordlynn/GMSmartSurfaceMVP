var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var serialPort = require('../server/lib/serial.js');
var events = require('../server/lib/events.js');
var async = require('async');
var config = require('../server/config.json');
var port = config.server.port || 3000;

app.use(express.static(__dirname + "/../prnds"));

async.waterfall([
    function(callback) {
        console.log('Setting up serial port.');
        try {
            serialPort.initializeSerialConnection(app);
          } catch (error) {
            console.error('Serial port initialization error:', error);
            // Handle the error gracefully, e.g., log the error and continue execution
          }
        callback();
    },
    function(callback) {
        console.log('Setting up events.');

        events.init(app, io, function(e, r) {
            callback();
        });
    },
    
], function (err, result) {
    var server = http.listen(port, () => {
        console.log('server is running on port', server.address().port);
    });
});

