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
    deepmerge = require('deepmerge'),
    server = null,
    isSeleniumServerRunning = false,
    tunnel = null,
    seleniumServer = null,
    isSauceTunnelRunning = false,
    isHookedUp = false;


var GulpWebdriverIO = function() {

    var that = this,
        base = process.cwd(),
        options = this.options({
            reporter: 'spec',
            ui: 'bdd',
            slow: 75,
            bail: false,
            grep: null,
            timeout: 1000000,
            updateSauceJob: false,
            output: null,
            quiet: false,
            nospawn: false,
            seleniumOptions: {},
            seleniumInstallOptions: {}
        }),
        sessionID = null,
        capabilities = deepmerge(options, this.data.options || {}),
        tunnelIdentifier = options['tunnel-identifier'] || (capabilities.desiredCapabilities ? capabilities.desiredCapabilities['tunnel-identifier'] : null) || null,
        tunnelFlags = (capabilities.desiredCapabilities ? capabilities.desiredCapabilities['tunnel-flags'] : []) || [],
        fd;

    /**
     * initialise tunnel
     */
    if (!tunnel && options.user && options.key && tunnelIdentifier) {
        gutil.log.debug('initialise test session using sauce tunnel from user ' + options.user);
        tunnel = new SauceTunnel(options.user, options.key, tunnelIdentifier, true, tunnelFlags);
        tunnel.on('verbose:debug', gutil.log.debug);

        capabilities.host = undefined;
        capabilities.port = 4445;
    }

    /**
     * initialize WebdriverIO
     */
    gutil.log.debug('run webdriverio with following capabilities: ' + JSON.stringify(capabilities));
    capabilities.logLevel = options.quiet ? 'silent' : capabilities.logLevel;
    GLOBAL.browser = webdriverio.remote(capabilities);

    /**
     * initialize Mocha
     */
    var mocha = new Mocha(options);

    /**
     * temporary remove the grunt exception handler , to make tasks continue (see also)
      - https://github.com/pghalliday/grunt-mocha-test/blob/master/tasks/mocha.js#L57
      - https://github.com/gregrperkins/grunt-mocha-hack
     */
    var uncaughtExceptionHandlers = process.listeners('uncaughtException');
    process.removeAllListeners('uncaughtException');

    /*istanbul ignore next*/
    var unmanageExceptions = function() {
        uncaughtExceptionHandlers.forEach(process.on.bind(process, 'uncaughtException'));
    };

    // Clear require cache to allow for multiple execution of same mocha commands
    Object.keys(require.cache).forEach(function(key) {
        delete require.cache[key];
    });

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

        gutil.log.debug('checking if selenium is running');

        var options = {
            host: capabilities.host || 'localhost',
            port: capabilities.port || 4444,
            path: '/wd/hub/status'
        };

        http.get(options, function() {
            gutil.log.debug('selenium is running');
            isSeleniumServerRunning = true;
            callback(null);
        }).on('error', function() {
            gutil.log.debug('selenium is not running');
            callback(null);
        });

    };

    /**
     *  install drivers if needed
     */
    function(callback) {
        if (tunnel || isSeleniumServerRunning) {
            return callback(null);
        }

        gutil.log.debug('installing driver if needed');
        selenium.install(options.seleniumInstallOptions, function(err) {
            if (err) {
                return callback(err);
            }

            gutil.log.debug('driver installed');
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

            gutil.log.debug('start sauce tunnel');

            /**
             * start sauce tunnel
             */
            tunnel.start(function(hasTunnelStarted) {
                // output here means if tunnel was created successfully
                if (hasTunnelStarted === false) {
                    callback(new Error('Sauce-Tunnel couldn\'t created successfully'));
                }

                gutil.log.debug('tunnel created successfully');
                isSauceTunnelRunning = true;
                callback(null);
            });

        } else if (!server && !isSeleniumServerRunning && !options.nospawn) {

            gutil.log.debug('start selenium standalone server');

            /**
             * starts selenium standalone server if its not running
             */

            server = selenium.start(options.seleniumOptions, function(err, child) {
                if (err) {
                    return callback(err);
                }

                gutil.log.debug('selenium successfully started');
                seleniumServer = child;
                isSeleniumServerRunning = true;
                callback(null, true);
            });

        } else {
            gutil.log.debug('standalone server or sauce tunnel is running');
            callback(null, true);
        }

    };

    /**
     * init WebdriverIO instance
     */
    var initWebdriver = function() {
        var callback = arguments[arguments.length - 1];
        gutil.log.debug('init WebdriverIO instance');

        GLOBAL.browser.init(function(err) {
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
        gutil.log.debug('run mocha tests');

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
        gutil.log.debug('end selenium session');

        // Restore grunt exception handling
        unmanageExceptions();

        // Close Remote sessions if needed
        GLOBAL.browser.end(next(callback, result === 0));
    };

    /**
     * destroy sauce tunnel if connected (once all tasks were executed) or
     * kill selenium server process if created
     */
    var killServer = function(result) {
        var callback = arguments[arguments.length - 1];

        if (isLastTask && isSauceTunnelRunning) {
            gutil.log.debug('destroy sauce tunnel if connected (once all tasks were executed)');
            return tunnel.stop(next(callback, result));
        } else if (isLastTask && seleniumServer) {
            gutil.log.debug('kill selenium server');
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

        gutil.log.debug('update job on Sauce Labs');
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
        async.waterfall([
            pingSelenium,
            startServer,
            initWebdriver,
            runMocha,
            endSeleniumSession,
            killServer,
            updateSauceJob
        ], function(err) {

            /**
             * if no error happened, we are good
             */
            if(!err) {
                return callback();
            }

            gutil.log.debug('An error happened, shutting down services');

            var logTunnelStopped = function() {
                gutil.log.debug('tunnel closed successfully');
                gutil.fail.warn(err);
                callback();
            }

            if(sessionID) {
                return GLOBAL.browser.end(function() {
                    gutil.log.debug('Selenium session closed successfully');

                    if(isSauceTunnelRunning) {
                        return tunnel.stop(logTunnelStopped);
                    }

                    gutil.fail.warn(err);
                    callback();
                });
            }

            if(isSauceTunnelRunning) {
                return tunnel.stop(logTunnelStopped);
            }

            gutil.fail.warn(err);
            callback();
        });
    };

    return through.obj(
        function( file, enc, callback) {
            this.push(file);
            mocha.addFile(file);
            callback();
        },
        runWebdriverIOTests
    );

};

module.exports = GulpWebdriverIO;
