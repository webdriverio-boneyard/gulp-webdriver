var gulp = require('gulp');
var webdriver = require('./index');

gulp.task('test:chrome_ci', function() {
    return gulp.src('test/*.js', {
        read: false
    }).pipe(webdriver({
        updateSauceJob: true,
        logLevel: 'verbose',
        user: process.env.SAUCE_USERNAME,
        key: process.env.SAUCE_ACCESS_KEY,
        host: 'ondemand.saucelabs.com',
        port: 80,
        desiredCapabilities: {
            browserName: 'chrome',
            platform: 'Windows 8',
            version: '31',
            tags: ['chrome', 'Windows 8', '31'],
            name: 'gulp-webdriver test',
            build: process.env.TRAVIS_BUILD_NUMBER
        }
    }));
});

gulp.task('test:chrome_ciTunnel', function() {
    return gulp.src('test/*.js', {
        read: false
    }).pipe(webdriver({
        updateSauceJob: true,
        logLevel: 'verbose',
        user: process.env.SAUCE_USERNAME,
        key: process.env.SAUCE_ACCESS_KEY,
        port: 4445,
        desiredCapabilities: {
            browserName: 'chrome',
            platform: 'Windows 8',
            version: '31',
            tags: ['chrome', 'Windows 8', '31'],
            name: 'gulp-webdriver test',
            'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER || Math.random().toString(),
            build: process.env.TRAVIS_BUILD_NUMBER
        }
    }));
});

gulp.task('test:local', function() {
    return gulp.src('test/*.js', {
        read: false
    }).pipe(webdriver({
        logLevel: 'verbose',
        desiredCapabilities: {
            browserName: 'phantomjs'
        }
    }));
});
