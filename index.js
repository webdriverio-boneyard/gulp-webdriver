'use strict';

var path = require('path'),
    fs = require('fs'),
    through = require('through2'),
    dargs = require('dargs'),
    gutil = require('gulp-util'),
    spawn = require('child_process').spawn,
    deepmerge = require('deepmerge');

module.exports = function(options) {
    return through.obj(function(file, enc, done) {

        var stream = this,
            configFile = file.path,
            isWin = /^win/.test(process.platform),
            wdioBin = require.resolve(path.join('webdriverio', 'bin', isWin ? 'wdio.cmd' : 'wdio'));

        var opts = deepmerge({
            wdioBin: wdioBin
        }, options || {});

        /**
         * check webdriverio dependency
         */
        if (!fs.existsSync(opts.wdioBin)) {
            return this.emit('error', new gutil.PluginError('gulp-webdriver', 'Haven\'t found the WebdriverIO test runner', {
                showStack: false
            }));
        }

        var args = process.execArgv.concat([configFile]).concat(dargs(opts, {
            excludes: ['wdioBin'],
            keepCamelCase: true
        }));

        gutil.log('spawn wdio with these attributes:\n', args.join('\n'));
        var wdio = spawn(opts.wdioBin, args, {
            stdio: 'inherit'
        });

        wdio.on('exit', function(code) {
            gutil.log('wdio testrunner finished with exit code', code);

            if (code !== 0) {
                stream.emit('error', new gutil.PluginError('gulp-webdriver', 'wdio exited with code ' + code, {
                    showStack: false
                }));
            }

            done();
            done = null;
        });

        return stream;
    });
};
