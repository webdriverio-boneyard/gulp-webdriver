'use strict';

var through = require('through2'),
    gutil = require('gulp-util'),
    Mocha = require('mocha'),
    SauceLabs = require('saucelabs'),
    SauceTunnel = require('sauce-tunnel'),
    selenium = require('selenium-standalone'),
    webdriverio = require('webdriverio'),
    http = require('http'),
    async = require('async'),
    path = require('path'),
    merge = require('deepmerge'),
    server = null,
    isSeleniumServerRunning = false,
    tunnel = null,
    seleniumServer = null,
    isSauceTunnelRunning = false,
    isHookedUp = false;


var GulpWebdriverIO = function(args) {

    var options = args || {},
        sessionID = null,
        seleniumOptions = options.seleniumOptions || {},
        seleniumInstallOptions = options.seleniumInstallOptions || {},
        tunnelIdentifier = options.desiredCapabilities && options.desiredCapabilities['tunnel-identifier'] ? options.desiredCapabilities['tunnel-identifier'] : null,
        tunnelFlags = options.desiredCapabilities && options.desiredCapabilities['tunnel-flags'] ? options.desiredCapabilities['tunnel-flags'] : [];

    /**
     * initialise tunnel
     */
    if (!tunnel && options.user && options.key && tunnelIdentifier) {
        gutil.log('initialise test session using sauce tunnel from user ' + options.user);
        tunnel = new SauceTunnel(options.user, options.key, tunnelIdentifier, true, tunnelFlags);
        tunnel.on('verbose:debug', gutil.log);

        options.host = undefined;
        options.port = 4445;
    }

    /**
     * initialize WebdriverIO
     */
    gutil.log('run webdriverio with following capabilities: ' + JSON.stringify(options));
    options.logLevel = options.quiet ? 'silent' : options.logLevel;
    GLOBAL.browser = webdriverio.remote(options);

    /**
     * initialize Mocha
     */
    var mocha = new Mocha(merge({
        reporter: 'spec',
        ui: 'bdd',
        slow: 75,
        bail: false,
        grep: null,
        timeout: 1000000
    }, options));

    /**
     * helper function for asyncjs
     */
    var next = function(cb, param) {
        return function() {
            var args = Array.prototype.slice.call(arguments, 1);

            if(typeof param !== 'undefined') {
                args.unshift(param);
            } else if (arguments.length === 1) {
                args.unshift(arguments[0]);
            }

            args.unshift(null);
            cb.apply(null, args);
        }
    };

    /**
     * check if selenium server is already running
     */
    var pingSelenium = function(callback) {
        if (tunnel) {
            return callback(null);
        }

        gutil.log('checking if selenium is running');

        var opts = {
            host: options.host || 'localhost',
            port: options.port || 4444,
            path: '/wd/hub/status'
        };

        return http.get(opts, function(res) {
            gutil.log('selenium is running');
            isSeleniumServerRunning = true;
            // Gulp seems to hang when HTTP requests are made, and that's how selenium is queried.
            // https://github.com/gulpjs/gulp/issues/167
            res.on('end', function () {
                return callback(null);
            });
            res.resume();
        }).on('error', function() {
            gutil.log('selenium is not running');
            isSeleniumServerRunning = false;
            return callback(null);
        });
    };

    /**
     *  install drivers if needed
     */
    var installDrivers = function(callback) {
        if (tunnel || isSeleniumServerRunning) {
            return callback(null);
        }

        gutil.log('installing driver if needed');
        selenium.install(seleniumInstallOptions, function(err) {
            if (err) {
                return callback(err);
            }

            gutil.log('driver installed');
            return callback(null);
        });
    };

    /**
     * start selenium server or sauce tunnel (if not already started)
     */
    var startServer = function(callback) {

        if (tunnel) {

            if (isSauceTunnelRunning) {
                gutil.log('sauce tunnel is already running');
                return callback(null, isSauceTunnelRunning);
            }

            gutil.log('start sauce tunnel');

            /**
             * start sauce tunnel
             */
            tunnel.start(function(hasTunnelStarted) {
                // output here means if tunnel was created successfully
                if (hasTunnelStarted === false) {
                    callback(new Error('Sauce-Tunnel couldn\'t created successfully'));
                }

                gutil.log('tunnel created successfully');
                isSauceTunnelRunning = true;
                return callback(null, isSauceTunnelRunning);
            });

        } else if (!server && !isSeleniumServerRunning && !options.nospawn) {

            gutil.log('start selenium standalone server');

            /**
             * starts selenium standalone server if its not running
             */

            server = selenium.start(seleniumOptions, function(err, child) {
                if (err) {
                    return callback(err);
                }

                gutil.log('selenium successfully started');
                seleniumServer = child;
                isSeleniumServerRunning = true;
                return callback(null, true);
            });

        } else {
            gutil.log('standalone server or sauce tunnel is running');
            return callback(null, true);
        }

    };

    var initWebdriver = function() {
        var callback = arguments[arguments.length - 1];
        gutil.log('init WebdriverIO instance');

        GLOBAL.browser.init(function(err) {
            /**
             * gracefully kill process if init fails
             */
            callback(err);
        });
    };

    var runMocha = function(callback) {
        gutil.log('run mocha tests');

        /**
         * save session ID
         */
        sessionID = GLOBAL.browser.requestHandler.sessionID;

        return mocha.run(next(callback));
    };

    var checkMochaResults = function(result, callback){
        if(result !== 0) {
            this.emit('error', new gutil.PluginError('gulp-webdriver', result + ' ' + (result === 1 ? 'test' : 'tests') + ' failed.', {
                showStack: false
            }));
        }

        return callback(null, result);
    };

    var endSeleniumSession = function(callback) {
        if(GLOBAL.browser) {
            // Close Remote sessions if needed
            return GLOBAL.browser.end(function(){
                gutil.log('ended selenium session');
                callback();
            });
        } else {
            return callback();
        }
    };

    /**
     * destroy sauce tunnel if connected (once all tasks were executed)
     */
    var killSauceTunnel = function(done) {
        if (isSauceTunnelRunning) {
            gutil.log('destroy sauce tunnel if connected (once all tasks were executed)');
            return tunnel.stop(function(){
                gutil.log('tunnel closed successfully');
                done();
            });
        }

        return done();
    };

    /**
     * kill selenium server process if created
     * @param callback
     * @returns {*}
     */
    var killSeleniumServer = function(callback) {
        if (seleniumServer) {
            gutil.log('killing selenium server');
            return seleniumServer.kill().then(function(){
                callback();
            });
        }

        return callback();
    };

    /**
     * update job on Sauce Labs
     */
    var updateSauceJob = function(result) {
        var callback = arguments[arguments.length - 1];

        gutil.log('update job on Sauce Labs');
        var sauceAccount = new SauceLabs({
            username: options.user,
            password: options.key
        });

        sauceAccount.updateJob(sessionID, {
            passed: result,
            public: true
        }, next(callback, result));
    };

    var runWebdriverIOTests = function(callback) {
        var stream = this;
        var tasks = [
            pingSelenium.bind(stream),
            installDrivers.bind(stream),
            startServer.bind(stream),
            initWebdriver.bind(stream),
            runMocha.bind(stream),
            checkMochaResults.bind(stream)
        ];

        if(options.updateSauceJob) {
            tasks.push(updateSauceJob.bind(stream));
        }

        async.waterfall(tasks, function(err) {
            //if no error happened and no test failures, we are good
            if(err) {
                stream.emit('error', new gutil.PluginError('gulp-webdriver', err));
            }

            async.waterfall([
                endSeleniumSession.bind(stream),
                killSauceTunnel.bind(stream),
                killSeleniumServer.bind(stream)
            ], callback);
        });

        return stream;
    };

    return through.obj(function(file, enc, callback) {
        this.push(file);
        mocha.addFile(file.path);
        callback();
    }, runWebdriverIOTests);

};

module.exports = GulpWebdriverIO;
