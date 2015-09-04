var gulp = require('gulp');
var webdriver = require('./index');

gulp.task('webdriver', function() {
    return gulp.src('test/wdio.*').pipe(webdriver({
        logLevel: 'command',
        updateJob: true,
        waitforTimeout: 12345,
        framework: 'mocha',
        // only for testing purposes
        cucumberOpts: {
            require: 'nothing'
        }
    }));
});