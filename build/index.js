'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _launcher = require('../node_modules/webdriverio/build/lib/launcher');

var _launcher2 = _interopRequireDefault(_launcher);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (options) {
    return _through2.default.obj(function (file, encoding, callback) {
        var launcher = new _launcher2.default(file.path, options);

        launcher.run().then(function (code) {
            process.exit(code);
            callback(null);
        }, function (e) {
            process.nextTick(function () {
                throw e;
            });
        });
    });
};