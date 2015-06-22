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

    var that = this,
        options = args || {},
        base = process.cwd(),
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

        http.get(opts, function() {
            gutil.log('selenium is running');
            isSeleniumServerRunning = true;
            callback(null);
        }).on('error', function() {
            gutil.log('selenium is not running');
            callback(null);
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
            callback(null);
        });
    };

    /**
     * start selenium server or sauce tunnel (if not already started)
     */
    var startServer = function(callback) {

        if (tunnel) {

            if (isSauceTunnelRunning) {
                return callback(null, true);
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
                callback(null);
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
                callback(null, true);
            });

        } else {
            gutil.log('standalone server or sauce tunnel is running');
            callback(null, true);
        }

    };

    /**
     * init WebdriverIO instance
     */
    var initWebdriver = function() {
        var callback = arguments[arguments.length - 1];
        gutil.log('init WebdriverIO instance');

        GLOBAL.browser.init(function(err) {
            /**
             *  Allow for adding custom commands
             */
            if("function" === typeof args.applyExtensions){
                args.applyExtensions.call(null, this);
            }
            
            /**
             * gracefully kill process if init fails
             */
            callback(err);
        });
    };

    /**
     * run mocha tests
     */
    var runMocha = function(callback) {
        gutil.log('run mocha tests');

        /**
         * save session ID
         */
        sessionID = GLOBAL.browser.requestHandler.sessionID;

        mocha.run(next(callback));
    };

    /**
     * end selenium session
     */
    var endSeleniumSession = function(result, callback) {
        gutil.log('end selenium session');

        if (!options.user && !options.key && !options.updateSauceJob) {
            if(result !== 0) { 
                this.emit('error', new gutil.PluginError('gulp-webdriver', result + ' ' + (result === 1 ? 'test' : 'tests') + ' failed.', {
                    showStack: false
                }));
            }
        }

        // Close Remote sessions if needed
        GLOBAL.browser.end(next(callback, result === 0));
    };

    /**
     * destroy sauce tunnel if connected (once all tasks were executed) or
     * kill selenium server process if created
     */
    var killServer = function(result) {
        var callback = arguments[arguments.length - 1];

        if (isSauceTunnelRunning) {
            gutil.log('destroy sauce tunnel if connected (once all tasks were executed)');
            return tunnel.stop(next(callback, result));
        } else if (seleniumServer) {
            gutil.log('kill selenium server');
            seleniumServer.kill();
        }

        callback(null, result);
    };

    /**
     * update job on Sauce Labs
     */
    var updateSauceJob = function(result) {
        var callback = arguments[arguments.length - 1];

        if (!options.user && !options.key && !options.updateSauceJob) {
            return callback(null, result);
        }

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

        async.waterfall([
            pingSelenium.bind(stream),
            installDrivers.bind(stream),
            startServer.bind(stream),
            initWebdriver.bind(stream),
            runMocha.bind(stream),
            endSeleniumSession.bind(stream),
            killServer.bind(stream),
            updateSauceJob.bind(stream)
        ], function(err) {

            /**
             * if no error happened, we are good
             */
            if(!err) {
                return callback();
            }

            gutil.log('An error happened, shutting down services');

            var logTunnelStopped = function() {
                gutil.log('tunnel closed successfully');
                stream.emit('error', new gutil.PluginError('gulp-webdriver', err));
                callback();
            }

            if(sessionID) {
                return GLOBAL.browser.end(function() {
                    gutil.log('Selenium session closed successfully');

                    if(isSauceTunnelRunning) {
                        return tunnel.stop(logTunnelStopped);
                    }

                    stream.emit('error', new gutil.PluginError('gulp-webdriver', err));
                    callback();
                });
            }

            if(isSauceTunnelRunning) {
                return tunnel.stop(logTunnelStopped);
            }

            stream.emit('error', new gutil.PluginError('gulp-webdriver', err));
            callback();
        });
    };

    return through.obj(function(file, enc, callback) {
        this.push(file);
        mocha.addFile(file.path);
        callback();
    }, runWebdriverIOTests);

};

module.exports = GulpWebdriverIO;
