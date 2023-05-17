var fs = require('fs');

var _fileName;

exports = module.exports = {

    init: function(fileName) {
        _fileName = fileName
    },

    load: _load,

    save: _save

}

function _load(cb) {
    fs.readFile(_fileName, function (e, r) {
        if (e) {
            cb(e, null);
        } else {
            cb(null, JSON.parse(r.toString()));
        }
    });
}

function _save(data, cb) {
    fs.writeFile(_fileName, JSON.stringify(data), undefined, function(e,r) {
        if (e) {
            cb(e, null);
        } else {
            cb(null, r);
        }
    });
}